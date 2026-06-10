require "test_helper"

class MagicLinksConsumeTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "consume@example.com")
  end

  test "POST consume signs the user in, consumes the link, and sets a session cookie" do
    link, raw_token = MagicLink.issue!(user: @user)

    post consume_magic_link_path(token: raw_token)

    assert_response :ok
    assert_equal({ "ok" => true }, JSON.parse(response.body))
    assert_not_nil link.reload.consumed_at

    set_cookie = response.headers["Set-Cookie"]
    assert set_cookie.present?, "expected a Set-Cookie header on the consume response"
    assert_match(/_scribe_session=/, Array(set_cookie).join("\n"))

    get current_user_path
    assert_response :ok
    assert_equal @user.id, JSON.parse(response.body)["id"]
  end

  test "second POST consume on the same link fails with consumed and no session" do
    _link, raw_token = MagicLink.issue!(user: @user)
    post consume_magic_link_path(token: raw_token)
    reset!

    post consume_magic_link_path(token: raw_token)
    assert_response :unprocessable_content
    assert_equal "consumed", JSON.parse(response.body)["error"]["code"]

    get current_user_path
    assert_response :unauthorized
  end

  test "POST consume on an expired link fails with expired and no session" do
    link, raw_token = MagicLink.issue!(user: @user)
    link.update_column(:expires_at, 1.minute.ago)

    post consume_magic_link_path(token: raw_token)
    assert_response :unprocessable_content
    assert_equal "expired", JSON.parse(response.body)["error"]["code"]

    get current_user_path
    assert_response :unauthorized
  end

  test "POST consume on an unknown token fails with invalid" do
    post consume_magic_link_path(token: "totally-bogus-token")
    assert_response :unprocessable_content
    assert_equal "invalid", JSON.parse(response.body)["error"]["code"]
  end
end
