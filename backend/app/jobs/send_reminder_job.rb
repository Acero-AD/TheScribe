# Delivers the daily reminder to every device the user has subscribed.
#
# Idempotency contract: a successful pre-flight inserts a `ReminderLog`
# row keyed on (user_id, date). The unique index makes a second invocation
# the same day a no-op — preferred to risking duplicate notifications,
# per `openspec/changes/add-daily-reminder/design.md` decision #5.
#
# Per-subscription outcomes:
#   - 2xx                                          → leave the row alone
#   - 410 Gone / 404 Not Found (permanently bad)  → delete the subscription
#   - any other error                              → log and swallow; the
#     ReminderLog already gates the day, so re-running this job would skip
#     before re-attempting delivery.
class SendReminderJob < ApplicationJob
  queue_as :reminders

  NOTIFICATION_TITLE = "Did you write today?"
  NOTIFICATION_BODY = "A nudge from The Scribe."

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user

    today = Time::ForUser.today(user)
    return if DailyLog.exists?(user_id: user.id, date: today, wrote: true)

    begin
      ReminderLog.create!(user_id: user.id, date: today, sent_at: Time.current)
    rescue ActiveRecord::RecordNotUnique
      return
    rescue ActiveRecord::RecordInvalid => e
      return if e.record.errors.of_kind?(:date, :taken)
      raise
    end

    deliver_to_subscriptions(user)
  end

  private

  def deliver_to_subscriptions(user)
    payload = { title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }.to_json
    user.push_subscriptions.find_each do |subscription|
      deliver_one(subscription, payload)
    end
  end

  def deliver_one(subscription, payload)
    WebPush.payload_send(
      message: payload,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh_key,
      auth: subscription.auth_key,
      vapid: vapid_options,
      ttl: 60
    )
  rescue WebPush::ExpiredSubscription, WebPush::InvalidSubscription
    subscription.destroy
  rescue => e
    Rails.logger.warn(
      "[SendReminderJob] delivery failed for subscription=#{subscription.id} user=#{subscription.user_id}: #{e.class}: #{e.message}"
    )
  end

  def vapid_options
    v = Rails.application.config.x.vapid
    { subject: v.subject, public_key: v.public_key, private_key: v.private_key }
  end
end
