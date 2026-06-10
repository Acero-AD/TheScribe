require "test_helper"

class PushSubscriptionTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "push@example.com")
    @attrs = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      p256dh_key: "key-p256",
      auth_key: "key-auth"
    }
  end

  test "requires endpoint, p256dh_key, auth_key" do
    sub = PushSubscription.new(user: @user)
    refute sub.valid?
    assert sub.errors[:endpoint].any?
    assert sub.errors[:p256dh_key].any?
    assert sub.errors[:auth_key].any?
  end

  test "requires a user" do
    sub = PushSubscription.new(@attrs)
    refute sub.valid?
    assert sub.errors[:user].any?
  end

  test "enforces uniqueness on (user_id, endpoint)" do
    PushSubscription.create!(@attrs.merge(user: @user))
    duplicate = PushSubscription.new(@attrs.merge(user: @user))
    refute duplicate.valid?
    assert duplicate.errors[:endpoint].any?
  end

  test "different users can register the same endpoint" do
    other = User.create!(email: "push-other@example.com")
    PushSubscription.create!(@attrs.merge(user: @user))
    sibling = PushSubscription.new(@attrs.merge(user: other))
    assert sibling.valid?
  end

  test "accepts endpoints on allowlisted provider hosts" do
    %w[
      https://fcm.googleapis.com/fcm/send/abc
      https://updates.push.services.mozilla.com/wpush/v2/abc
      https://db5p.notify.windows.com/w/?token=abc
      https://web.push.apple.com/abc
    ].each do |endpoint|
      sub = PushSubscription.new(@attrs.merge(user: @user, endpoint: endpoint))
      assert sub.valid?, "expected #{endpoint} to be accepted: #{sub.errors[:endpoint].inspect}"
    end
  end

  test "rejects a non-https endpoint" do
    sub = PushSubscription.new(@attrs.merge(user: @user, endpoint: "http://fcm.googleapis.com/fcm/send/abc"))
    refute sub.valid?
    assert sub.errors[:endpoint].any?
  end

  test "rejects an endpoint whose host is not an allowlisted provider" do
    sub = PushSubscription.new(@attrs.merge(user: @user, endpoint: "https://evil.example.com/push"))
    refute sub.valid?
    assert sub.errors[:endpoint].any?
  end

  test "rejects an endpoint pointing at an internal address" do
    [
      "http://169.254.169.254/latest/meta-data",
      "https://169.254.169.254/latest/meta-data",
      "http://localhost/push",
      "https://10.0.0.5/push"
    ].each do |endpoint|
      sub = PushSubscription.new(@attrs.merge(user: @user, endpoint: endpoint))
      refute sub.valid?, "expected #{endpoint} to be rejected"
      assert sub.errors[:endpoint].any?
    end
  end

  test "rejects a malformed endpoint URL" do
    sub = PushSubscription.new(@attrs.merge(user: @user, endpoint: "https://exa mple.com/ bad"))
    refute sub.valid?
    assert sub.errors[:endpoint].any?
  end
end
