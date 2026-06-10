require "test_helper"

class PushSubscriptionsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "push-user@example.com")
    @other = User.create!(email: "push-other@example.com")
    @attrs = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      p256dh_key: "key-p256",
      auth_key: "key-auth"
    }
  end

  def sign_in_as(user)
    _link, raw_token = MagicLink.issue!(user: user)
    post consume_magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  # ---- POST /push_subscriptions ----------------------------------------

  test "POST creates a new subscription and responds 201" do
    sign_in_as(@user)
    assert_difference "PushSubscription.count", +1 do
      post "/push_subscriptions", params: @attrs, as: :json
    end
    assert_response :created
    assert json["id"].is_a?(Integer)
    persisted = PushSubscription.last
    assert_equal @user, persisted.user
    assert_equal @attrs[:endpoint], persisted.endpoint
  end

  test "POST with an existing endpoint updates the keys and responds 200" do
    sign_in_as(@user)
    existing = PushSubscription.create!(@attrs.merge(user: @user))
    assert_no_difference "PushSubscription.count" do
      post "/push_subscriptions",
           params: @attrs.merge(p256dh_key: "new-p256", auth_key: "new-auth"),
           as: :json
    end
    assert_response :ok
    existing.reload
    assert_equal "new-p256", existing.p256dh_key
    assert_equal "new-auth", existing.auth_key
  end

  test "POST without required fields responds 422 and persists nothing" do
    sign_in_as(@user)
    assert_no_difference "PushSubscription.count" do
      post "/push_subscriptions", params: { endpoint: @attrs[:endpoint] }, as: :json
    end
    assert_response :unprocessable_content
    assert_equal "invalid_subscription", json["error"]["code"]
  end

  test "POST with an untrusted endpoint responds 422 and persists nothing" do
    sign_in_as(@user)
    assert_no_difference "PushSubscription.count" do
      post "/push_subscriptions",
           params: @attrs.merge(endpoint: "http://169.254.169.254/latest/meta-data"),
           as: :json
    end
    assert_response :unprocessable_content
    assert_equal "invalid_subscription", json["error"]["code"]
  end

  test "POST when unauthenticated responds 401" do
    post "/push_subscriptions", params: @attrs, as: :json
    assert_response :unauthorized
  end

  # ---- DELETE /push_subscriptions/current ------------------------------

  test "DELETE removes the subscription scoped to current_user" do
    sign_in_as(@user)
    PushSubscription.create!(@attrs.merge(user: @user))
    assert_difference "PushSubscription.count", -1 do
      delete "/push_subscriptions/current", params: { endpoint: @attrs[:endpoint] }
    end
    assert_response :ok
  end

  test "DELETE with an unknown endpoint is idempotent (200)" do
    sign_in_as(@user)
    assert_no_difference "PushSubscription.count" do
      delete "/push_subscriptions/current", params: { endpoint: "https://fcm.googleapis.com/fcm/send/unknown" }
    end
    assert_response :ok
  end

  test "DELETE cannot remove another user's subscription" do
    sign_in_as(@user)
    other_sub = PushSubscription.create!(@attrs.merge(user: @other))
    assert_no_difference "PushSubscription.count" do
      delete "/push_subscriptions/current", params: { endpoint: other_sub.endpoint }
    end
    assert_response :ok
    assert PushSubscription.exists?(other_sub.id)
  end

  test "DELETE when unauthenticated responds 401" do
    delete "/push_subscriptions/current", params: { endpoint: @attrs[:endpoint] }
    assert_response :unauthorized
  end
end
