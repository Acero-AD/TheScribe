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

    # The session must land on the wire as a Set-Cookie header — not just in
    # the in-process session jar — or real browsers won't receive it.
    set_cookie = response.headers["Set-Cookie"]
    assert set_cookie.present?, "expected a Set-Cookie header on the verify response"
    cookie_header = Array(set_cookie).join("\n")
    assert_match(/_scribe_session=/, cookie_header)
    if cookie_header =~ /max-age=(\d+)/i
      assert_equal 89.days.to_i, Regexp.last_match(1).to_i
    elsif cookie_header =~ /expires=([^;]+)/i
      expires_at = Time.httpdate(Regexp.last_match(1).strip)
      assert_in_delta 89.days.from_now, expires_at, 5.seconds
    else
      flunk "expected a persistent session cookie with max-age or expires"
    end

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
