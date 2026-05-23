require "test_helper"

class DailyLogsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "today@example.com")
    @other = User.create!(email: "other@example.com")
    @today = Date.current
    @yesterday = @today - 1
    @tomorrow = @today + 1
  end

  def sign_in_as(user)
    _link, raw_token = MagicLink.issue!(user: user)
    get magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  # ---- auth -------------------------------------------------------------

  test "every endpoint returns 401 when unauthenticated" do
    get "/daily_logs/#{@today.iso8601}"
    assert_response :unauthorized

    put "/daily_logs/#{@today.iso8601}", params: { wrote: true }, as: :json
    assert_response :unauthorized

    get "/daily_logs"
    assert_response :unauthorized
  end

  # ---- show -------------------------------------------------------------

  test "GET show returns defaults when no row exists" do
    sign_in_as(@user)
    get "/daily_logs/#{@today.iso8601}"
    assert_response :ok
    assert_equal @today.iso8601, json["date"]
    assert_equal false, json["wrote"]
    assert_nil json["wrote_at"]
    assert_nil json["note"]
  end

  test "GET show returns the persisted row when present" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current, note: "shipped")

    get "/daily_logs/#{@today.iso8601}"
    assert_response :ok
    assert_equal true, json["wrote"]
    assert_equal "shipped", json["note"]
    refute_nil json["wrote_at"]
  end

  test "GET show rejects future dates" do
    sign_in_as(@user)
    get "/daily_logs/#{@tomorrow.iso8601}"
    assert_response :unprocessable_content
  end

  # ---- update -----------------------------------------------------------

  test "PUT update creates a row on first toggle and sets wrote_at" do
    sign_in_as(@user)
    assert_difference "DailyLog.count", +1 do
      put "/daily_logs/#{@today.iso8601}", params: { wrote: true }, as: :json
    end
    assert_response :ok
    assert_equal true, json["wrote"]
    refute_nil json["wrote_at"]
    assert_nil json["note"]
  end

  test "PUT update with note-only creates a row" do
    sign_in_as(@user)
    assert_difference "DailyLog.count", +1 do
      put "/daily_logs/#{@today.iso8601}", params: { note: "first thought" }, as: :json
    end
    assert_response :ok
    assert_equal false, json["wrote"]
    assert_nil json["wrote_at"]
    assert_equal "first thought", json["note"]
  end

  test "PUT update toggling wrote off clears wrote_at" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current)
    put "/daily_logs/#{@today.iso8601}", params: { wrote: false }, as: :json
    assert_response :ok
    assert_equal false, json["wrote"]
    assert_nil json["wrote_at"]
  end

  test "PUT update re-asserting the same wrote value is idempotent" do
    sign_in_as(@user)
    log = DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: 1.hour.ago)
    original_wrote_at = log.wrote_at
    put "/daily_logs/#{@today.iso8601}", params: { wrote: true }, as: :json
    assert_response :ok
    log.reload
    assert_equal true, log.wrote
    assert_in_delta original_wrote_at.to_f, log.wrote_at.to_f, 0.001
  end

  test "PUT update with note preserves wrote" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current)
    put "/daily_logs/#{@today.iso8601}", params: { note: "edited" }, as: :json
    assert_response :ok
    assert_equal true, json["wrote"]
    assert_equal "edited", json["note"]
  end

  test "PUT update with empty body returns current row unchanged" do
    sign_in_as(@user)
    log = DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current, note: "hi")
    put "/daily_logs/#{@today.iso8601}", params: {}, as: :json
    assert_response :ok
    assert_equal "hi", json["note"]
    assert_equal log.note, "hi"
  end

  test "PUT update normalizes blank-string note to null" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: @today, wrote: false, note: "had something")
    put "/daily_logs/#{@today.iso8601}", params: { note: "" }, as: :json
    assert_response :ok
    assert_nil json["note"]
  end

  test "PUT update rejects past dates with date_not_editable" do
    sign_in_as(@user)
    put "/daily_logs/#{@yesterday.iso8601}", params: { wrote: true }, as: :json
    assert_response :unprocessable_content
    assert_equal "date_not_editable", json["error"]["code"]
    assert_equal 0, DailyLog.count
  end

  test "PUT update rejects future dates with date_not_editable" do
    sign_in_as(@user)
    put "/daily_logs/#{@tomorrow.iso8601}", params: { wrote: true }, as: :json
    assert_response :unprocessable_content
    assert_equal "date_not_editable", json["error"]["code"]
  end

  # ---- index ------------------------------------------------------------

  test "GET index defaults to last 90 days through today" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: @today, wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: @today - 30, wrote: true, wrote_at: 30.days.ago)
    DailyLog.create!(user: @user, date: @today - 120, wrote: true, wrote_at: 120.days.ago)

    get "/daily_logs"
    assert_response :ok
    returned_dates = json.map { |row| row["date"] }
    assert_includes returned_dates, @today.iso8601
    assert_includes returned_dates, (@today - 30).iso8601
    refute_includes returned_dates, (@today - 120).iso8601
  end

  test "GET index with explicit range filters correctly" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: Date.new(2026, 1, 5), wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: Date.new(2026, 2, 5), wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: Date.new(2026, 3, 5), wrote: true, wrote_at: Time.current)

    get "/daily_logs", params: { from: "2026-01-01", to: "2026-01-31" }
    assert_response :ok
    dates = json.map { |r| r["date"] }
    assert_equal [ "2026-01-05" ], dates
  end

  test "GET index rejects ranges over 366 days" do
    sign_in_as(@user)
    get "/daily_logs", params: { from: "2025-01-01", to: "2026-12-31" }
    assert_response :unprocessable_content
    assert_equal "range_too_large", json["error"]["code"]
  end

  test "GET index rejects inverted ranges" do
    sign_in_as(@user)
    get "/daily_logs", params: { from: "2026-05-10", to: "2026-05-01" }
    assert_response :unprocessable_content
    assert_equal "invalid_range", json["error"]["code"]
  end

  # ---- cross-user isolation ---------------------------------------------

  test "user A cannot see user B's rows" do
    sign_in_as(@user)
    DailyLog.create!(user: @other, date: @today, wrote: true, wrote_at: Time.current, note: "B's note")

    get "/daily_logs/#{@today.iso8601}"
    assert_response :ok
    assert_equal false, json["wrote"]
    assert_nil json["note"]

    get "/daily_logs"
    assert_response :ok
    assert_empty json
  end

  test "PUT update cannot affect another user's row" do
    sign_in_as(@user)
    DailyLog.create!(user: @other, date: @today, wrote: false)
    put "/daily_logs/#{@today.iso8601}", params: { wrote: true }, as: :json
    assert_response :ok
    assert_equal false, @other.daily_logs.find_by(date: @today).wrote
  end
end
