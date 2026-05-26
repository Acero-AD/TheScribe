require "test_helper"

class PushSubscriptionTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "push@example.com")
    @attrs = {
      endpoint: "https://push.example/abc",
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
end
