require "test_helper"

class WeekLogTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "weeklog@example.com")
    @monday = Date.new(2026, 5, 18) # Monday
  end

  test "requires a week_start_date" do
    log = WeekLog.new(user: @user, published: false)
    refute log.valid?
    assert log.errors[:week_start_date].any?
  end

  test "requires a user" do
    log = WeekLog.new(week_start_date: @monday, published: false)
    refute log.valid?
    assert log.errors[:user].any?
  end

  test "requires published to be a boolean" do
    log = WeekLog.new(user: @user, week_start_date: @monday, published: nil)
    refute log.valid?
    assert log.errors[:published].any?
  end

  test "defaults published to false in the database" do
    log = WeekLog.create!(user: @user, week_start_date: @monday)
    log.reload
    assert_equal false, log.published
  end

  test "enforces uniqueness on (user_id, week_start_date)" do
    WeekLog.create!(user: @user, week_start_date: @monday, published: false)
    duplicate = WeekLog.new(user: @user, week_start_date: @monday, published: true)
    refute duplicate.valid?
    assert duplicate.errors[:user_id].any?
  end

  test "different users can share the same week_start_date" do
    other = User.create!(email: "other-weeklog@example.com")
    WeekLog.create!(user: @user, week_start_date: @monday, published: true)
    sibling = WeekLog.new(user: other, week_start_date: @monday, published: true)
    assert sibling.valid?
  end

  test "WeekLog.for returns the existing row when present" do
    existing = WeekLog.create!(user: @user, week_start_date: @monday, published: true)
    found = WeekLog.for(user: @user, week_start_date: @monday)
    assert_equal existing.id, found.id
    assert_equal true, found.published
  end

  test "WeekLog.for returns a fresh unpersisted instance with defaults when absent" do
    fresh = WeekLog.for(user: @user, week_start_date: @monday)
    refute fresh.persisted?
    assert_equal @monday, fresh.week_start_date
    assert_equal false, fresh.published
  end
end
