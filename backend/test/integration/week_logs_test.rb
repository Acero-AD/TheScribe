require "test_helper"

class WeekLogsTest < ActionDispatch::IntegrationTest
  setup do
    # Pin "now" to a fixed instant so this_week_start is deterministic.
    # 2026-05-20 12:00 UTC is a Wednesday; Monday of that week is 2026-05-18.
    travel_to Time.utc(2026, 5, 20, 12, 0, 0)

    @user = User.create!(email: "weeks@example.com") # week_starts_on defaults to 1 (Monday)
    @other = User.create!(email: "other-weeks@example.com")
    @this_week = Date.new(2026, 5, 18)
    @last_week = Date.new(2026, 5, 11)
    @next_week = Date.new(2026, 5, 25)
  end

  teardown do
    travel_back
  end

  def sign_in_as(user)
    _link, raw_token = MagicLink.issue!(user: user)
    post consume_magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  # ---- auth -------------------------------------------------------------

  test "every endpoint returns 401 when unauthenticated" do
    get "/week_logs/#{@this_week.iso8601}"
    assert_response :unauthorized

    put "/week_logs/#{@this_week.iso8601}", params: { published: true }, as: :json
    assert_response :unauthorized

    get "/week_logs"
    assert_response :unauthorized
  end

  # ---- show -------------------------------------------------------------

  test "GET show returns defaults when no row exists" do
    sign_in_as(@user)
    get "/week_logs/#{@this_week.iso8601}"
    assert_response :ok
    assert_equal @this_week.iso8601, json["week_start_date"]
    assert_equal false, json["published"]
    assert_equal 0, json["publishing_streak"]
  end

  test "GET show returns the persisted row when present" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)

    get "/week_logs/#{@this_week.iso8601}"
    assert_response :ok
    assert_equal true, json["published"]
  end

  test "GET show works for past weeks" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @last_week, published: true)

    get "/week_logs/#{@last_week.iso8601}"
    assert_response :ok
    assert_equal true, json["published"]
  end

  test "GET show returns defaults for past weeks with no row" do
    sign_in_as(@user)
    get "/week_logs/#{@last_week.iso8601}"
    assert_response :ok
    assert_equal false, json["published"]
  end

  test "GET show rejects future week-start dates" do
    sign_in_as(@user)
    get "/week_logs/#{@next_week.iso8601}"
    assert_response :unprocessable_content
  end

  # ---- update -----------------------------------------------------------

  test "PUT update creates a row on first toggle to true" do
    sign_in_as(@user)
    assert_difference "WeekLog.count", +1 do
      put "/week_logs/#{@this_week.iso8601}", params: { published: true }, as: :json
    end
    assert_response :ok
    assert_equal true, json["published"]
    assert_equal @this_week.iso8601, json["week_start_date"]
  end

  test "PUT update toggling published off updates the row" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    put "/week_logs/#{@this_week.iso8601}", params: { published: false }, as: :json
    assert_response :ok
    assert_equal false, json["published"]
  end

  # ---- publishing_streak field ------------------------------------------

  test "GET show includes publishing_streak for a weekly user" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    WeekLog.create!(user: @user, week_start_date: @last_week, published: true)
    get "/week_logs/#{@this_week.iso8601}"
    assert_response :ok
    assert_equal 2, json["publishing_streak"]
  end

  test "PUT toggling on returns the post-mutation publishing_streak (weekly)" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @last_week, published: true)
    WeekLog.create!(user: @user, week_start_date: @last_week - 7, published: true)
    put "/week_logs/#{@this_week.iso8601}", params: { published: true }, as: :json
    assert_response :ok
    assert_equal 3, json["publishing_streak"]
  end

  test "GET show includes publishing_streak for a biweekly user" do
    biweekly = User.create!(email: "biweekly-int@example.com", publishing_cadence: "biweekly")
    sign_in_as(biweekly)
    # Publish last week (bucket 0) and three weeks back (bucket 1).
    WeekLog.create!(user: biweekly, week_start_date: @last_week, published: true)
    WeekLog.create!(user: biweekly, week_start_date: @last_week - 14, published: true)
    get "/week_logs/#{@this_week.iso8601}"
    assert_response :ok
    assert_equal 2, json["publishing_streak"]
  end

  test "GET index does not include publishing_streak" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    get "/week_logs"
    assert_response :ok
    assert_kind_of Array, json
    json.each { |row| refute row.key?("publishing_streak"), "row should not include publishing_streak" }
  end

  test "PUT update re-asserting the same published value is idempotent" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    assert_no_difference "WeekLog.count" do
      put "/week_logs/#{@this_week.iso8601}", params: { published: true }, as: :json
    end
    assert_response :ok
    assert_equal true, json["published"]
  end

  test "PUT update with empty body returns current row unchanged" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    put "/week_logs/#{@this_week.iso8601}", params: {}, as: :json
    assert_response :ok
    assert_equal true, json["published"]
  end

  test "PUT update rejects past week-start dates with week_not_editable" do
    sign_in_as(@user)
    put "/week_logs/#{@last_week.iso8601}", params: { published: true }, as: :json
    assert_response :unprocessable_content
    assert_equal "week_not_editable", json["error"]["code"]
    assert_equal 0, WeekLog.count
  end

  test "PUT update rejects future week-start dates with week_not_editable" do
    sign_in_as(@user)
    put "/week_logs/#{@next_week.iso8601}", params: { published: true }, as: :json
    assert_response :unprocessable_content
    assert_equal "week_not_editable", json["error"]["code"]
  end

  test "PUT update rejects a date that is not the user's current week-start" do
    sign_in_as(@user)
    a_wednesday = Date.new(2026, 5, 20)
    put "/week_logs/#{a_wednesday.iso8601}", params: { published: true }, as: :json
    assert_response :unprocessable_content
    assert_equal "week_not_editable", json["error"]["code"]
  end

  # ---- index ------------------------------------------------------------

  test "GET index defaults to the last 12 weeks through this week" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: @this_week, published: true)
    WeekLog.create!(user: @user, week_start_date: @this_week - 8.weeks, published: true)
    WeekLog.create!(user: @user, week_start_date: @this_week - 20.weeks, published: true)

    get "/week_logs"
    assert_response :ok
    returned = json.map { |r| r["week_start_date"] }
    assert_includes returned, @this_week.iso8601
    assert_includes returned, (@this_week - 8.weeks).iso8601
    refute_includes returned, (@this_week - 20.weeks).iso8601
  end

  test "GET index with explicit range filters correctly" do
    sign_in_as(@user)
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 1, 5), published: true)
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 2, 2), published: true)
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 3, 2), published: true)

    get "/week_logs", params: { from: "2026-01-01", to: "2026-02-15" }
    assert_response :ok
    dates = json.map { |r| r["week_start_date"] }
    assert_equal [ "2026-01-05", "2026-02-02" ], dates
  end

  test "GET index rejects ranges over 728 days" do
    sign_in_as(@user)
    get "/week_logs", params: { from: "2024-01-01", to: "2026-12-31" }
    assert_response :unprocessable_content
    assert_equal "range_too_large", json["error"]["code"]
  end

  test "GET index rejects inverted ranges" do
    sign_in_as(@user)
    get "/week_logs", params: { from: "2026-05-18", to: "2026-05-11" }
    assert_response :unprocessable_content
    assert_equal "invalid_range", json["error"]["code"]
  end

  # ---- cross-user isolation ---------------------------------------------

  test "user A cannot see user B's rows" do
    sign_in_as(@user)
    WeekLog.create!(user: @other, week_start_date: @this_week, published: true)

    get "/week_logs/#{@this_week.iso8601}"
    assert_response :ok
    assert_equal false, json["published"]

    get "/week_logs"
    assert_response :ok
    assert_empty json
  end

  test "PUT update cannot affect another user's row" do
    sign_in_as(@user)
    WeekLog.create!(user: @other, week_start_date: @this_week, published: false)
    put "/week_logs/#{@this_week.iso8601}", params: { published: true }, as: :json
    assert_response :ok
    assert_equal false, @other.week_logs.find_by(week_start_date: @this_week).published
  end
end
