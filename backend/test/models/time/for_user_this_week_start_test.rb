require "test_helper"

class Time::ForUserThisWeekStartTest < ActiveSupport::TestCase
  setup do
    @user_with_tz = Object.new
    @user_with_tz.define_singleton_method(:timezone) { "Europe/Madrid" }
    @user_with_tz.define_singleton_method(:week_starts_on) { 1 } # Monday

    @user_sunday = Object.new
    @user_sunday.define_singleton_method(:timezone) { "UTC" }
    @user_sunday.define_singleton_method(:week_starts_on) { 0 } # Sunday
  end

  test "Monday-anchored user mid-week returns the Monday of that local week" do
    now = Time.utc(2026, 5, 20, 12, 0, 0) # a Wednesday
    assert_equal Date.new(2026, 5, 18), Time::ForUser.this_week_start(@user_with_tz, now: now)
  end

  test "Sunday-anchored user on a Saturday returns the prior Sunday" do
    now = Time.utc(2026, 5, 23, 12, 0, 0) # a Saturday in UTC
    assert_equal Date.new(2026, 5, 17), Time::ForUser.this_week_start(@user_sunday, now: now)
  end

  test "Sunday-anchored user on a Sunday returns that same Sunday" do
    now = Time.utc(2026, 5, 17, 12, 0, 0) # a Sunday in UTC
    assert_equal Date.new(2026, 5, 17), Time::ForUser.this_week_start(@user_sunday, now: now)
  end

  test "null-timezone Monday-anchored user uses UTC" do
    user = User.create!(email: "wknull@example.com") # week_starts_on defaults to 1
    # 2026-05-21 00:30 UTC is a Thursday in UTC; Monday is 2026-05-18.
    now = Time.utc(2026, 5, 21, 0, 30, 0)
    assert_equal Date.new(2026, 5, 18), Time::ForUser.this_week_start(user, now: now)
  end

  test "around midnight in a non-UTC tz uses the local date for the week-start" do
    # 23:30 NY local on Sunday 2026-05-17 is 03:30 UTC on Monday 2026-05-18.
    # The Monday-anchored NY user's "now" is still Sunday 2026-05-17 NY-local,
    # so this_week_start should be the prior Monday 2026-05-11.
    ny_monday_user = Object.new
    ny_monday_user.define_singleton_method(:timezone) { "America/New_York" }
    ny_monday_user.define_singleton_method(:week_starts_on) { 1 }
    now = Time.utc(2026, 5, 18, 3, 30, 0)
    assert_equal Date.new(2026, 5, 11), Time::ForUser.this_week_start(ny_monday_user, now: now)
  end
end
