require "test_helper"

class HistoryTest < ActionDispatch::IntegrationTest
  setup do
    # Wed 2026-05-20 12:00 UTC; Monday-anchored UTC user → today 2026-05-20.
    travel_to Time.utc(2026, 5, 20, 12, 0, 0)
    @user = User.create!(email: "history@example.com")
    @other = User.create!(email: "other-history@example.com")
    @current_month = "2026-05"
  end

  teardown { travel_back }

  def sign_in_as(user)
    _link, raw_token = MagicLink.issue!(user: user)
    get magic_link_path(token: raw_token)
  end

  def json
    JSON.parse(response.body)
  end

  # ---- auth -------------------------------------------------------------

  test "GET /history returns 401 when unauthenticated" do
    get "/history", params: { month: @current_month }
    assert_response :unauthorized
  end

  # ---- happy path -------------------------------------------------------

  test "GET /history for the current month returns 200 with bundled body and streaks" do
    sign_in_as(@user)
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 18), wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 19), wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 20), wrote: true, wrote_at: Time.current, note: "shipped")
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 5, 18), published: true)

    get "/history", params: { month: @current_month }
    assert_response :ok

    assert_equal "2026-05", json["month"]
    assert_kind_of Array, json["daily_logs"]
    assert_equal 3, json["daily_logs"].length
    assert_equal "2026-05-18", json["daily_logs"].first["date"]
    assert_equal "shipped", json["daily_logs"].last["note"]

    assert_kind_of Array, json["week_logs"]
    assert_equal 1, json["week_logs"].length
    assert_equal "2026-05-18", json["week_logs"].first["week_start_date"]

    assert_equal 3, json["writing_streak_current"]
    assert_equal 3, json["writing_streak_best"]
    assert_equal 1, json["publishing_streak_current"]
  end

  test "GET /history for a past month filters daily_logs and week_logs to that month" do
    sign_in_as(@user)
    # Past month: April 2026.
    DailyLog.create!(user: @user, date: Date.new(2026, 4, 10), wrote: true, wrote_at: Time.current)
    DailyLog.create!(user: @user, date: Date.new(2026, 4, 25), wrote: true, wrote_at: Time.current, note: "april")
    # Current month: May 2026 — should NOT appear in April response.
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 1), wrote: true, wrote_at: Time.current)
    # Week overlapping March/April boundary (week_start 2026-03-30, overlaps April 1-5).
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 3, 30), published: true)
    # Week entirely in April.
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 4, 20), published: true)
    # Week entirely in May (not in April overlap range).
    WeekLog.create!(user: @user, week_start_date: Date.new(2026, 5, 4), published: true)

    get "/history", params: { month: "2026-04" }
    assert_response :ok

    dates = json["daily_logs"].map { |r| r["date"] }
    assert_equal [ "2026-04-10", "2026-04-25" ], dates

    week_starts = json["week_logs"].map { |r| r["week_start_date"] }
    assert_includes week_starts, "2026-03-30"
    assert_includes week_starts, "2026-04-20"
    refute_includes week_starts, "2026-05-04"
  end

  # ---- validation -------------------------------------------------------

  test "GET /history rejects future months with 422" do
    sign_in_as(@user)
    get "/history", params: { month: "2026-06" }
    assert_response :unprocessable_content
    assert_equal "month_not_readable", json["error"]["code"]
  end

  test "GET /history rejects malformed month with 422" do
    sign_in_as(@user)
    get "/history", params: { month: "2026-13" }
    assert_response :unprocessable_content
    assert_equal "invalid_month", json["error"]["code"]

    get "/history", params: { month: "foo" }
    assert_response :unprocessable_content
    assert_equal "invalid_month", json["error"]["code"]

    get "/history"
    assert_response :unprocessable_content
    assert_equal "invalid_month", json["error"]["code"]
  end

  # ---- isolation --------------------------------------------------------

  test "GET /history scopes to current_user" do
    sign_in_as(@user)
    DailyLog.create!(user: @other, date: Date.new(2026, 5, 10), wrote: true, wrote_at: Time.current, note: "other's")
    WeekLog.create!(user: @other, week_start_date: Date.new(2026, 5, 4), published: true)

    get "/history", params: { month: @current_month }
    assert_response :ok
    assert_empty json["daily_logs"]
    assert_empty json["week_logs"]
  end

  # ---- empty month ------------------------------------------------------

  test "GET /history for an empty month returns empty arrays with streaks present" do
    sign_in_as(@user)
    get "/history", params: { month: "2025-01" }
    assert_response :ok
    assert_empty json["daily_logs"]
    assert_empty json["week_logs"]
    assert_equal 0, json["writing_streak_current"]
    assert_equal 0, json["writing_streak_best"]
    assert_equal 0, json["publishing_streak_current"]
  end
end
