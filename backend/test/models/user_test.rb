require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "trims and downcases email on save" do
    user = User.create!(email: "  Foo@Example.COM  ")
    assert_equal "foo@example.com", user.reload.email
  end

  test "rejects malformed email" do
    user = User.new(email: "not-an-email")
    refute user.valid?
    assert user.errors[:email].any?
  end

  test "rejects duplicate emails (case-insensitive)" do
    User.create!(email: "dup@example.com")
    duplicate = User.new(email: "DUP@example.com")
    refute duplicate.valid?
    assert duplicate.errors[:email].any?
  end

  test "requires an email" do
    user = User.new
    refute user.valid?
    assert user.errors[:email].any?
  end

  test "defaults settings sensibly on creation" do
    user = User.create!(email: "defaults@example.com")
    assert_equal 1, user.week_starts_on
    assert_equal "weekly", user.publishing_cadence
    assert_nil user.timezone
  end

  test "rejects week_starts_on outside {0, 1}" do
    user = User.new(email: "weekday@example.com", week_starts_on: 5)
    refute user.valid?
    assert user.errors[:week_starts_on].any?
  end

  test "accepts week_starts_on 0 and 1" do
    [ 0, 1 ].each do |day|
      user = User.new(email: "wk#{day}@example.com", week_starts_on: day)
      assert user.valid?, user.errors.full_messages.to_sentence
    end
  end

  test "rejects publishing_cadence outside the allowed set" do
    user = User.new(email: "cadence@example.com", publishing_cadence: "monthly")
    refute user.valid?
    assert user.errors[:publishing_cadence].any?
  end

  test "accepts weekly and biweekly publishing_cadence" do
    %w[weekly biweekly].each do |cadence|
      user = User.new(email: "#{cadence}@example.com", publishing_cadence: cadence)
      assert user.valid?, user.errors.full_messages.to_sentence
    end
  end

  test "accepts a nil timezone" do
    user = User.new(email: "nil_tz@example.com", timezone: nil)
    assert user.valid?, user.errors.full_messages.to_sentence
  end

  test "rejects an unknown timezone" do
    user = User.new(email: "bad_tz@example.com", timezone: "Mars/Olympus_Mons")
    refute user.valid?
    assert user.errors[:timezone].any?
  end

  test "accepts a valid IANA timezone" do
    user = User.new(email: "tz@example.com", timezone: "America/New_York")
    assert user.valid?, user.errors.full_messages.to_sentence
  end

  test "settings_attributes returns the settings fields" do
    user = User.create!(email: "attrs@example.com", timezone: "Europe/Madrid")
    assert_equal(
      { week_starts_on: 1, publishing_cadence: "weekly", timezone: "Europe/Madrid" },
      user.settings_attributes
    )
  end
end
