require "test_helper"

class PushConfigTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "config@example.com")
    @prior_public_key = Rails.application.config.x.vapid.public_key
    Rails.application.config.x.vapid.public_key = "test-public-key"
  end

  teardown do
    Rails.application.config.x.vapid.public_key = @prior_public_key
  end

  def sign_in_as(user)
    _link, raw_token = MagicLink.issue!(user: user)
    get magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  test "GET returns the VAPID public key for authenticated users" do
    sign_in_as(@user)
    get "/push_config"
    assert_response :ok
    assert_equal "test-public-key", json["vapid_public_key"]
  end

  test "GET responds 401 when unauthenticated" do
    get "/push_config"
    assert_response :unauthorized
  end
end
