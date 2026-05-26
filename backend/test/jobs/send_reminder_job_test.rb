require "test_helper"

class SendReminderJobTest < ActiveJob::TestCase
  setup do
    travel_to Time.utc(2026, 5, 20, 12, 0, 0)
    @user = User.create!(
      email: "send-reminder@example.com",
      reminder_time: "20:00",
      timezone: "UTC"
    )
    @today = Date.new(2026, 5, 20)
    @subscription = PushSubscription.create!(
      user: @user,
      endpoint: "https://push.example/one",
      p256dh_key: "p256",
      auth_key: "auth"
    )
  end

  teardown { travel_back }

  FakeResponse = Struct.new(:code, :body) do
    def inspect
      "#<FakeResponse code=#{code}>"
    end
  end

  def expired_error
    WebPush::ExpiredSubscription.new(FakeResponse.new("410", ""), "push.example")
  end

  def invalid_error
    WebPush::InvalidSubscription.new(FakeResponse.new("404", ""), "push.example")
  end

  # Replaces WebPush.payload_send with a lambda that captures each call and
  # optionally raises an error provided by `behavior`. Restores the original
  # implementation on exit.
  def with_web_push_stub(behavior: ->(_opts) { :ok })
    original = WebPush.method(:payload_send)
    calls = []
    WebPush.singleton_class.define_method(:payload_send) do |**opts|
      calls << opts
      result = behavior.call(opts)
      raise result if result.is_a?(Exception)
      result
    end
    yield calls
  ensure
    WebPush.singleton_class.define_method(:payload_send) { |**opts| original.call(**opts) }
  end

  test "pre-flight skips when the user already wrote today" do
    DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current)
    with_web_push_stub do |calls|
      SendReminderJob.perform_now(@user.id)
      assert_empty calls
    end
    refute ReminderLog.exists?(user_id: @user.id, date: @today)
  end

  test "creates a ReminderLog row and delivers to every subscription on the happy path" do
    second = PushSubscription.create!(
      user: @user, endpoint: "https://push.example/two", p256dh_key: "p", auth_key: "a"
    )

    with_web_push_stub do |calls|
      assert_difference "ReminderLog.count", +1 do
        SendReminderJob.perform_now(@user.id)
      end
      assert_equal 2, calls.length
      endpoints = calls.map { |c| c[:endpoint] }.sort
      assert_equal [ @subscription.endpoint, second.endpoint ].sort, endpoints
      assert_equal "Did you write today?", JSON.parse(calls.first[:message])["title"]
    end
  end

  test "idempotency: a second invocation the same day inserts no row and sends nothing" do
    ReminderLog.create!(user: @user, date: @today, sent_at: Time.current)
    with_web_push_stub do |calls|
      assert_no_difference "ReminderLog.count" do
        SendReminderJob.perform_now(@user.id)
      end
      assert_empty calls
    end
  end

  test "410 Gone deletes the subscription" do
    bad_endpoint = @subscription.endpoint
    behavior = ->(opts) do
      opts[:endpoint] == bad_endpoint ? expired_error : :ok
    end

    with_web_push_stub(behavior: behavior) do |_calls|
      assert_difference "PushSubscription.count", -1 do
        SendReminderJob.perform_now(@user.id)
      end
    end
    refute PushSubscription.exists?(@subscription.id)
  end

  test "404 Not Found deletes the subscription" do
    behavior = ->(_opts) { invalid_error }

    with_web_push_stub(behavior: behavior) do |_calls|
      assert_difference "PushSubscription.count", -1 do
        SendReminderJob.perform_now(@user.id)
      end
    end
  end

  test "other delivery errors are logged and swallowed (do not raise)" do
    behavior = ->(_opts) { RuntimeError.new("boom") }

    with_web_push_stub(behavior: behavior) do |_calls|
      assert_nothing_raised do
        SendReminderJob.perform_now(@user.id)
      end
    end
    # ReminderLog was still written; design accepts a lost delivery over a dupe.
    assert ReminderLog.exists?(user_id: @user.id, date: @today)
  end

  test "missing user is a no-op" do
    with_web_push_stub do |calls|
      assert_nothing_raised do
        SendReminderJob.perform_now(999_999)
      end
      assert_empty calls
    end
  end
end
