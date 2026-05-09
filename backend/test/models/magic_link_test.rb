require "test_helper"

class MagicLinkTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "alice@example.com")
  end

  test "issue! returns a record and a raw token, persists only the digest" do
    record, raw_token = MagicLink.issue!(user: @user)
    assert raw_token.is_a?(String) && raw_token.length > 16
    assert_equal MagicLink.send(:digest_for, raw_token), record.token_digest
    refute_equal raw_token, record.token_digest
  end

  test "issue! invalidates prior outstanding links" do
    old_record, _old_token = MagicLink.issue!(user: @user)
    new_record, _new_token = MagicLink.issue!(user: @user)

    assert_not_nil old_record.reload.consumed_at, "prior link should be marked consumed"
    assert_nil new_record.reload.consumed_at, "newly issued link should be unconsumed"
    assert_equal [ new_record ], @user.magic_links.outstanding.to_a
  end

  test "valid_for_use? returns false when expired" do
    record, _ = MagicLink.issue!(user: @user)
    record.update_column(:expires_at, 1.minute.ago)
    refute record.valid_for_use?
  end

  test "valid_for_use? returns false when consumed" do
    record, _ = MagicLink.issue!(user: @user)
    record.consume!
    refute record.valid_for_use?
  end

  test "valid_for_use? is true for an unconsumed, unexpired link" do
    record, _ = MagicLink.issue!(user: @user)
    assert record.valid_for_use?
  end

  test "find_by_raw_token returns the matching record" do
    record, raw_token = MagicLink.issue!(user: @user)
    assert_equal record, MagicLink.find_by_raw_token(raw_token)
  end

  test "find_by_raw_token returns nil for an unknown token" do
    assert_nil MagicLink.find_by_raw_token("unknown-token")
    assert_nil MagicLink.find_by_raw_token(nil)
    assert_nil MagicLink.find_by_raw_token("")
  end

  test "raw token never appears in any column" do
    _record, raw_token = MagicLink.issue!(user: @user)
    row = MagicLink.connection.select_all("SELECT * FROM magic_links").first
    refute row.values.any? { |v| v.to_s.include?(raw_token) }
  end
end
