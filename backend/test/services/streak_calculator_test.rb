require "test_helper"

class StreakCalculatorTest < ActiveSupport::TestCase
  setup do
    # Wed 2026-05-20 12:00 UTC; for a Monday-anchored UTC user that means
    # today = 2026-05-20, this_week_start = 2026-05-18.
    travel_to Time.utc(2026, 5, 20, 12, 0, 0)
    @user = User.create!(email: "streak@example.com") # defaults: Monday-anchored, weekly
    @today = Date.new(2026, 5, 20)
    @this_week = Date.new(2026, 5, 18)
  end

  teardown { travel_back }

  # ---- writing_streak ---------------------------------------------------

  test "writing_streak: three consecutive days including today" do
    [ 0, 1, 2 ].each { |n| daily(@today - n, true) }
    assert_equal 3, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: today not yet checked, recent days written" do
    daily(@today - 1, true)
    daily(@today - 2, true)
    assert_equal 2, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: today checked but yesterday missed" do
    daily(@today, true)
    assert_equal 1, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: today and yesterday both unmarked is 0" do
    assert_equal 0, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: today wrote=false explicitly, yesterday wrote=true continues" do
    daily(@today, false)
    daily(@today - 1, true)
    daily(@today - 2, true)
    assert_equal 2, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: run broken by a missed day" do
    daily(@today, true)
    daily(@today - 1, true)
    # gap at @today - 2
    daily(@today - 3, true)
    assert_equal 2, StreakCalculator.writing_streak(@user)
  end

  test "writing_streak: brand-new user with no logs is 0" do
    assert_equal 0, StreakCalculator.writing_streak(@user)
  end

  # ---- publishing_streak (weekly) ---------------------------------------

  test "publishing_streak weekly: two consecutive weeks including this week" do
    week(@this_week, true)
    week(@this_week - 7, true)
    assert_equal 2, StreakCalculator.publishing_streak(@user)
  end

  test "publishing_streak weekly: this week not yet, prior weeks published" do
    week(@this_week - 7, true)
    week(@this_week - 14, true)
    assert_equal 2, StreakCalculator.publishing_streak(@user)
  end

  test "publishing_streak weekly: this and last week both unmarked is 0" do
    week(@this_week - 14, true) # would-be streak two-back is ignored
    assert_equal 0, StreakCalculator.publishing_streak(@user)
  end

  test "publishing_streak weekly: gap breaks the streak" do
    week(@this_week, true)
    # gap at this_week - 7
    week(@this_week - 14, true)
    assert_equal 1, StreakCalculator.publishing_streak(@user)
  end

  test "publishing_streak weekly: tolerant lookup matches a row anchored elsewhere in the same 7-day window" do
    # Simulate a row created under a previous Sunday-anchor: a row at
    # this_week - 6 (Tuesday after Monday anchor week start) instead of Monday.
    # The Monday anchor (this_week) sees the in-window row.
    WeekLog.create!(user: @user, week_start_date: @this_week + 1, published: true)
    assert_equal 1, StreakCalculator.publishing_streak(@user)
  end

  # ---- publishing_streak (biweekly) -------------------------------------

  test "publishing_streak biweekly: most recent two buckets each have a publish" do
    biweekly_user = User.create!(email: "biweekly@example.com", publishing_cadence: "biweekly")
    week_for(biweekly_user, @this_week - 7, true)  # bucket 0 — last week
    week_for(biweekly_user, @this_week - 21, true) # bucket 1 — three weeks back
    assert_equal 2, StreakCalculator.publishing_streak(biweekly_user)
  end

  test "publishing_streak biweekly: current bucket unmarked, prior bucket published is 1" do
    biweekly_user = User.create!(email: "biweekly2@example.com", publishing_cadence: "biweekly")
    week_for(biweekly_user, @this_week - 14, true) # bucket 1 only
    assert_equal 1, StreakCalculator.publishing_streak(biweekly_user)
  end

  test "publishing_streak biweekly: both current and prior buckets unmarked is 0" do
    biweekly_user = User.create!(email: "biweekly3@example.com", publishing_cadence: "biweekly")
    # Publish four weeks back — that's bucket 2, not bucket 0 or 1.
    week_for(biweekly_user, @this_week - 28, true)
    assert_equal 0, StreakCalculator.publishing_streak(biweekly_user)
  end

  test "publishing_streak biweekly: every week publishing still counts once per bucket" do
    biweekly_user = User.create!(email: "biweekly4@example.com", publishing_cadence: "biweekly")
    # Publish every week for the last six weeks → 3 buckets each satisfied.
    6.times { |i| week_for(biweekly_user, @this_week - (i * 7), true) }
    assert_equal 3, StreakCalculator.publishing_streak(biweekly_user)
  end

  # ---- best_writing_streak ----------------------------------------------

  test "best_writing_streak: brand-new user is 0" do
    assert_equal 0, StreakCalculator.best_writing_streak(@user)
  end

  test "best_writing_streak: a single wrote=true day is 1" do
    daily(@today, true)
    assert_equal 1, StreakCalculator.best_writing_streak(@user)
  end

  test "best_writing_streak: runs of 3, 7, 2 with current run of 4 returns 7" do
    # Run of 3 (oldest), then gap, then 7, gap, 2, gap, current 4.
    base = @today - 60
    3.times { |i| daily(base + i, true) }
    7.times { |i| daily(base + 10 + i, true) }
    2.times { |i| daily(base + 25 + i, true) }
    4.times { |i| daily(@today - 3 + i, true) }
    assert_equal 7, StreakCalculator.best_writing_streak(@user)
  end

  test "best_writing_streak: still-active run of 9 beats prior best of 5" do
    base = @today - 40
    5.times { |i| daily(base + i, true) }
    9.times { |i| daily(@today - 8 + i, true) }
    assert_equal 9, StreakCalculator.best_writing_streak(@user)
  end

  test "best_writing_streak: a wrote=false row breaks the run" do
    daily(@today - 4, true)
    daily(@today - 3, true)
    daily(@today - 2, false)
    daily(@today - 1, true)
    daily(@today, true)
    assert_equal 2, StreakCalculator.best_writing_streak(@user)
  end

  test "best_writing_streak: a missing date breaks the run" do
    daily(@today - 5, true)
    daily(@today - 4, true)
    # gap at @today - 3
    daily(@today - 2, true)
    daily(@today - 1, true)
    daily(@today, true)
    assert_equal 3, StreakCalculator.best_writing_streak(@user)
  end

  # ---- timezone / per-user "today" --------------------------------------

  test "writing_streak computes against the user's local 'today' not system time" do
    # Tokyo user: 2026-05-20 12:00 UTC = 2026-05-20 21:00 Tokyo, so today is the 20th there.
    # But pick a UTC instant where Tokyo has already rolled to the next day:
    # 2026-05-20 23:30 UTC = 2026-05-21 08:30 Tokyo.
    tokyo_user = User.create!(email: "tokyo@example.com", timezone: "Asia/Tokyo")
    travel_to Time.utc(2026, 5, 20, 23, 30, 0)
    DailyLog.create!(user: tokyo_user, date: Date.new(2026, 5, 20), wrote: true)
    DailyLog.create!(user: tokyo_user, date: Date.new(2026, 5, 19), wrote: true)
    # "today" for Tokyo is 2026-05-21 (no row, no row yesterday=2026-05-20 — wait, there IS a row for 5-20).
    # Yesterday for Tokyo = 2026-05-20 (wrote=true), day before = 2026-05-19 (wrote=true).
    # So with today unmarked + yesterday-tolerance: walk from 2026-05-20 backwards: 2 days.
    assert_equal 2, StreakCalculator.writing_streak(tokyo_user)
  end

  private

  def daily(date, wrote)
    DailyLog.create!(user: @user, date: date, wrote: wrote, wrote_at: wrote ? Time.current : nil)
  end

  def week(anchor, published)
    WeekLog.create!(user: @user, week_start_date: anchor, published: published)
  end

  def week_for(user, anchor, published)
    WeekLog.create!(user: user, week_start_date: anchor, published: published)
  end
end
