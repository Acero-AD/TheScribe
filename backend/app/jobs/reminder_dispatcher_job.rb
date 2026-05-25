# Recurring (every minute) scanner that enqueues `SendReminderJob` for every
# user whose local clock is hitting their `reminder_time` right now and who
# isn't already filtered out.
#
# Candidate set query plan (single statement):
#   SELECT users.* FROM users
#   WHERE users.reminder_time IS NOT NULL
#     AND users.timezone IS NOT NULL
#     AND users.id IN (SELECT user_id FROM push_subscriptions)
#
# This intentionally returns a small set — only users who configured a
# reminder AND opted in to push on at least one device. The per-user
# timezone-dependent checks (today's `ReminderLog` / `DailyLog`, and the
# `HH:MM` minute match) are done in Ruby because "today" is per-user.
# The `SendReminderJob` re-checks the suppression conditions before
# sending, so a race here is harmless.
class ReminderDispatcherJob < ApplicationJob
  queue_as :dispatcher

  def perform
    candidate_users.find_each do |user|
      next unless minute_matches?(user)

      today = Time::ForUser.today(user)
      next if ReminderLog.exists?(user_id: user.id, date: today)
      next if DailyLog.exists?(user_id: user.id, date: today, wrote: true)

      SendReminderJob.perform_later(user.id)
    end
  end

  private

  def candidate_users
    User.where.not(reminder_time: nil)
        .where.not(timezone: nil)
        .where(id: PushSubscription.select(:user_id))
  end

  def minute_matches?(user)
    Time.current.in_time_zone(user.timezone).strftime("%H:%M") == user.reminder_time
  end
end
