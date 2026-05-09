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
end
