require "test_helper"

class DailyLogTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "log@example.com")
  end

  test "requires a date" do
    log = DailyLog.new(user: @user, wrote: false)
    refute log.valid?
    assert log.errors[:date].any?
  end

  test "requires a user" do
    log = DailyLog.new(date: Date.current, wrote: false)
    refute log.valid?
    assert log.errors[:user].any?
  end

  test "requires wrote to be a boolean" do
    log = DailyLog.new(user: @user, date: Date.current, wrote: nil)
    refute log.valid?
    assert log.errors[:wrote].any?
  end

  test "allows a nil note" do
    log = DailyLog.create!(user: @user, date: Date.current, wrote: false, note: nil)
    assert_nil log.note
  end

  test "enforces uniqueness on (user_id, date)" do
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 8), wrote: false)
    duplicate = DailyLog.new(user: @user, date: Date.new(2026, 5, 8), wrote: false)
    refute duplicate.valid?
    assert duplicate.errors[:user_id].any?
  end

  test "different users can share the same date" do
    other = User.create!(email: "other@example.com")
    DailyLog.create!(user: @user, date: Date.new(2026, 5, 8), wrote: false)
    sibling = DailyLog.new(user: other, date: Date.new(2026, 5, 8), wrote: false)
    assert sibling.valid?
  end
end
