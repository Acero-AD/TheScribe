require "test_helper"

class MagicLinksShowTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "click@example.com")
    @frontend = Rails.application.config.frontend_url
  end

  test "valid link consumes itself, signs the user in, and redirects to the app" do
    link, raw_token = MagicLink.issue!(user: @user)

    get magic_link_path(token: raw_token)

    assert_response :redirect
    assert_redirected_to "#{@frontend}/"
    assert_not_nil link.reload.consumed_at

    # Subsequent /me should be authenticated.
    get current_user_path
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal @user.id, body["id"]
    assert_equal @user.email, body["email"]
  end

  test "expired link redirects to sign-in with expired error and no session" do
    link, raw_token = MagicLink.issue!(user: @user)
    link.update_column(:expires_at, 1.minute.ago)

    get magic_link_path(token: raw_token)
    assert_response :redirect
    assert_match %r{/sign-in\?error=expired\z}, response.location

    get current_user_path
    assert_response :unauthorized
  end

  test "consumed link redirects to sign-in with consumed error and no session" do
    link, raw_token = MagicLink.issue!(user: @user)
    link.consume!

    get magic_link_path(token: raw_token)
    assert_response :redirect
    assert_match %r{/sign-in\?error=consumed\z}, response.location

    get current_user_path
    assert_response :unauthorized
  end

  test "unknown token redirects to sign-in with invalid error and no session" do
    get magic_link_path(token: "totally-bogus-token")
    assert_response :redirect
    assert_match %r{/sign-in\?error=invalid\z}, response.location

    get current_user_path
    assert_response :unauthorized
  end
end
