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

  test "DailyLog.for returns the existing row when present" do
    existing = DailyLog.create!(user: @user, date: Date.new(2026, 5, 8), wrote: true, note: "hi")
    found = DailyLog.for(user: @user, date: Date.new(2026, 5, 8))
    assert_equal existing.id, found.id
  end

  test "DailyLog.for returns a fresh unpersisted instance with defaults when absent" do
    fresh = DailyLog.for(user: @user, date: Date.new(2026, 5, 9))
    refute fresh.persisted?
    assert_equal Date.new(2026, 5, 9), fresh.date
    assert_equal false, fresh.wrote
    assert_nil fresh.wrote_at
    assert_nil fresh.note
  end

  test "mark_wrote!(true) flips wrote and sets wrote_at" do
    log = DailyLog.create!(user: @user, date: Date.current, wrote: false)
    freeze_time = Time.utc(2026, 5, 8, 12, 0, 0)
    travel_to(freeze_time) do
      log.mark_wrote!(true)
    end
    log.reload
    assert_equal true, log.wrote
    assert_equal freeze_time, log.wrote_at
  end

  test "mark_wrote!(false) clears wrote_at" do
    log = DailyLog.create!(user: @user, date: Date.current, wrote: true, wrote_at: Time.current)
    log.mark_wrote!(false)
    log.reload
    assert_equal false, log.wrote
    assert_nil log.wrote_at
  end
end
