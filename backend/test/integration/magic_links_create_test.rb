require "test_helper"

class MagicLinksCreateTest < ActionDispatch::IntegrationTest
  setup do
    ActionMailer::Base.deliveries.clear
  end

  test "new email creates a user, issues a link, and sends mail with generic 200" do
    assert_difference "User.count", +1 do
      assert_difference "MagicLink.count", +1 do
        assert_enqueued_emails 1 do
          post magic_links_path, params: { email: "new@example.com" }
        end
      end
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal MagicLinksController::GENERIC_MESSAGE, body["message"]
  end

  test "existing email issues a new link and invalidates prior outstanding ones" do
    user = User.create!(email: "existing@example.com")
    MagicLink.issue!(user: user)

    assert_no_difference "User.count" do
      assert_difference "MagicLink.count", +1 do
        post magic_links_path, params: { email: "existing@example.com" }
      end
    end

    assert_response :ok
    assert_equal 1, user.magic_links.outstanding.count
  end

  test "normalizes email casing on lookup" do
    user = User.create!(email: "case@example.com")
    post magic_links_path, params: { email: "CASE@Example.com" }
    assert_response :ok
    assert_equal user, User.find_by(email: "case@example.com")
    assert_equal 1, User.count
  end

  test "malformed email returns 422 and does not create a user or send mail" do
    assert_no_difference "User.count" do
      assert_no_difference "MagicLink.count" do
        assert_no_enqueued_emails do
          post magic_links_path, params: { email: "not-an-email" }
        end
      end
    end

    assert_response :unprocessable_content
    body = JSON.parse(response.body)
    assert body["errors"].present?
  end

  test "rate-limited requests return generic 200 without sending mail or creating a link" do
    user = User.create!(email: "limit@example.com")
    MagicLinksController::RATE_LIMIT.times { MagicLink.issue!(user: user) }

    assert_no_difference "MagicLink.count" do
      assert_no_enqueued_emails do
        post magic_links_path, params: { email: "limit@example.com" }
      end
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal MagicLinksController::GENERIC_MESSAGE, body["message"]
  end

  test "responses for new and existing emails are indistinguishable" do
    User.create!(email: "exists@example.com")

    post magic_links_path, params: { email: "exists@example.com" }
    existing_response = response.body

    post magic_links_path, params: { email: "fresh@example.com" }
    new_response = response.body

    assert_equal existing_response, new_response
  end
end
