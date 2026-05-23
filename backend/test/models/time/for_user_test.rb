require "test_helper"

class Time::ForUserTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "tz@example.com")
  end

  test "returns today in the user's timezone" do
    user_with_tz = Object.new
    user_with_tz.define_singleton_method(:timezone) { "America/New_York" }
    now = Time.utc(2026, 5, 8, 16, 30, 0)
    assert_equal Date.new(2026, 5, 8), Time::ForUser.today(user_with_tz, now: now)
  end

  test "23:30 NY local stays in today's NY date even after UTC midnight" do
    user_with_tz = Object.new
    user_with_tz.define_singleton_method(:timezone) { "America/New_York" }
    now = Time.utc(2026, 5, 9, 3, 30, 0)
    assert_equal Date.new(2026, 5, 8), Time::ForUser.today(user_with_tz, now: now)
  end

  test "tokyo crosses to tomorrow before UTC does" do
    user_with_tz = Object.new
    user_with_tz.define_singleton_method(:timezone) { "Asia/Tokyo" }
    now = Time.utc(2026, 5, 8, 16, 0, 0)
    assert_equal Date.new(2026, 5, 9), Time::ForUser.today(user_with_tz, now: now)
  end

  test "null timezone falls back to UTC" do
    now = Time.utc(2026, 5, 8, 23, 30, 0)
    assert_equal Date.new(2026, 5, 8), Time::ForUser.today(@user, now: now)
  end

  test "blank timezone string falls back to UTC" do
    user_blank = Object.new
    user_blank.define_singleton_method(:timezone) { "" }
    now = Time.utc(2026, 5, 9, 0, 30, 0)
    assert_equal Date.new(2026, 5, 9), Time::ForUser.today(user_blank, now: now)
  end

  test "unknown timezone string falls back to UTC" do
    user_bad = Object.new
    user_bad.define_singleton_method(:timezone) { "Not/A_Zone" }
    now = Time.utc(2026, 5, 9, 0, 30, 0)
    assert_equal Date.new(2026, 5, 9), Time::ForUser.today(user_bad, now: now)
  end
end
