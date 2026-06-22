require "test_helper"

class SessionsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "session@example.com")
  end

  def sign_in_user
    _link, raw_token = MagicLink.issue!(user: @user)
    post consume_magic_link_path(token: raw_token)
  end

  test "GET /me returns current user when signed in" do
    sign_in_user
    get current_user_path
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal @user.id, body["id"]
    assert_equal @user.email, body["email"]
    assert_equal(
      { "week_starts_on" => 1, "publishing_cadence" => "weekly", "timezone" => nil },
      body["settings"]
    )
  end

  test "GET /me reflects the user's persisted settings" do
    @user.update!(week_starts_on: 0, publishing_cadence: "biweekly", timezone: "Europe/Madrid")
    sign_in_user
    get current_user_path
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal(
      { "week_starts_on" => 0, "publishing_cadence" => "biweekly", "timezone" => "Europe/Madrid" },
      body["settings"]
    )
  end

  test "GET /me returns 401 when not signed in" do
    get current_user_path
    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "unauthenticated", body["error"]
  end

  test "DELETE /sessions/current clears the session for a signed-in user" do
    sign_in_user
    get current_user_path
    assert_response :ok

    delete current_session_path
    assert_response :ok

    get current_user_path
    assert_response :unauthorized
  end

  test "DELETE /sessions/current is idempotent when no session exists" do
    delete current_session_path
    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal true, body["ok"]
  end
end
