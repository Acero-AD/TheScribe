require "test_helper"

class ReminderLogTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "reminder@example.com")
    @today = Date.new(2026, 5, 20)
  end

  test "requires a date" do
    log = ReminderLog.new(user: @user, sent_at: Time.current)
    refute log.valid?
    assert log.errors[:date].any?
  end

  test "requires sent_at" do
    log = ReminderLog.new(user: @user, date: @today)
    refute log.valid?
    assert log.errors[:sent_at].any?
  end

  test "requires a user" do
    log = ReminderLog.new(date: @today, sent_at: Time.current)
    refute log.valid?
    assert log.errors[:user].any?
  end

  test "enforces uniqueness on (user_id, date)" do
    ReminderLog.create!(user: @user, date: @today, sent_at: Time.current)
    duplicate = ReminderLog.new(user: @user, date: @today, sent_at: Time.current)
    refute duplicate.valid?
    assert duplicate.errors[:date].any?
  end

  test "raises ActiveRecord::RecordNotUnique on a race-condition duplicate insert" do
    ReminderLog.create!(user: @user, date: @today, sent_at: Time.current)
    assert_raises ActiveRecord::RecordNotUnique do
      # Bypass the AR-level validation to confirm the DB constraint is in place.
      ReminderLog.connection.execute(
        "INSERT INTO reminder_logs (user_id, date, sent_at, created_at, updated_at) " \
        "VALUES (#{@user.id}, '#{@today.iso8601}', NOW(), NOW(), NOW())"
      )
    end
  end

  test "different users can share the same date" do
    other = User.create!(email: "reminder-other@example.com")
    ReminderLog.create!(user: @user, date: @today, sent_at: Time.current)
    sibling = ReminderLog.new(user: other, date: @today, sent_at: Time.current)
    assert sibling.valid?
  end
end
