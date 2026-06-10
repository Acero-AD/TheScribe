require "test_helper"

class MeSettingsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "settings@example.com")
  end

  def sign_in_user
    _link, raw_token = MagicLink.issue!(user: @user)
    post consume_magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  test "PATCH /me/settings updates a single field and leaves others unchanged" do
    sign_in_user
    patch current_user_settings_path, params: { publishing_cadence: "biweekly" }, as: :json
    assert_response :ok
    assert_equal(
      { "reminder_time" => nil, "week_starts_on" => 1, "publishing_cadence" => "biweekly", "timezone" => nil },
      json
    )
    @user.reload
    assert_equal "biweekly", @user.publishing_cadence
    assert_equal 1, @user.week_starts_on
  end

  test "PATCH /me/settings updates multiple fields atomically" do
    sign_in_user
    patch current_user_settings_path,
          params: { reminder_time: "08:30", week_starts_on: 0, publishing_cadence: "weekly", timezone: "Europe/Madrid" },
          as: :json
    assert_response :ok
    @user.reload
    assert_equal "08:30", @user.reminder_time
    assert_equal 0, @user.week_starts_on
    assert_equal "weekly", @user.publishing_cadence
    assert_equal "Europe/Madrid", @user.timezone
  end

  test "PATCH /me/settings with an empty body returns current settings unchanged" do
    @user.update!(publishing_cadence: "biweekly", timezone: "UTC")
    sign_in_user
    patch current_user_settings_path, params: {}, as: :json
    assert_response :ok
    assert_equal "biweekly", json["publishing_cadence"]
    assert_equal "UTC", json["timezone"]
  end

  test "PATCH /me/settings allows clearing reminder_time with null" do
    @user.update!(reminder_time: "20:00")
    sign_in_user
    patch current_user_settings_path, params: { reminder_time: nil }, as: :json
    assert_response :ok
    assert_nil json["reminder_time"]
    @user.reload
    assert_nil @user.reminder_time
  end

  test "PATCH /me/settings rejects week_starts_on outside {0,1}" do
    sign_in_user
    patch current_user_settings_path, params: { week_starts_on: 5 }, as: :json
    assert_response :unprocessable_content
    @user.reload
    assert_equal 1, @user.week_starts_on
  end

  test "PATCH /me/settings rejects unknown publishing_cadence" do
    sign_in_user
    patch current_user_settings_path, params: { publishing_cadence: "monthly" }, as: :json
    assert_response :unprocessable_content
    @user.reload
    assert_equal "weekly", @user.publishing_cadence
  end

  test "PATCH /me/settings rejects malformed reminder_time" do
    sign_in_user
    patch current_user_settings_path, params: { reminder_time: "8:30 PM" }, as: :json
    assert_response :unprocessable_content
    patch current_user_settings_path, params: { reminder_time: "25:00" }, as: :json
    assert_response :unprocessable_content
  end

  test "PATCH /me/settings rejects unknown IANA timezone" do
    sign_in_user
    patch current_user_settings_path, params: { timezone: "Mars/Olympus_Mons" }, as: :json
    assert_response :unprocessable_content
    @user.reload
    assert_nil @user.timezone
  end

  test "PATCH /me/settings is transactional — one invalid field rejects the whole request" do
    sign_in_user
    patch current_user_settings_path,
          params: { week_starts_on: 0, publishing_cadence: "monthly" },
          as: :json
    assert_response :unprocessable_content
    @user.reload
    assert_equal 1, @user.week_starts_on
    assert_equal "weekly", @user.publishing_cadence
  end

  test "PATCH /me/settings silently ignores unknown keys" do
    sign_in_user
    patch current_user_settings_path,
          params: { publishing_cadence: "biweekly", banana: "yes" },
          as: :json
    assert_response :ok
    assert_equal "biweekly", json["publishing_cadence"]
    refute json.key?("banana")
  end

  test "PATCH /me/settings requires authentication" do
    patch current_user_settings_path, params: { publishing_cadence: "biweekly" }, as: :json
    assert_response :unauthorized
  end
end
