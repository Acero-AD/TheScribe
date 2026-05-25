# Loads VAPID keys for the `daily-reminder` capability into a single accessor:
# `Rails.application.config.x.vapid.{public_key,private_key,subject}`.
#
# Source priority (first non-blank wins):
#   1. Rails credentials at `vapid: { public_key:, private_key:, subject: }`.
#   2. ENV: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
#
# Production MUST use credentials; tests stub the gem so the test env's keys
# are irrelevant; development can use either path. See `backend/README.md`
# for the generate/rotate recipe.

Rails.application.config.x.vapid = ActiveSupport::OrderedOptions.new.tap do |c|
  creds = (Rails.application.credentials.vapid || {}).to_h.with_indifferent_access
  c.public_key  = creds[:public_key].presence  || ENV["VAPID_PUBLIC_KEY"].presence
  c.private_key = creds[:private_key].presence || ENV["VAPID_PRIVATE_KEY"].presence
  c.subject     = creds[:subject].presence     || ENV["VAPID_SUBJECT"].presence || "mailto:reminders@scoreboard.local"
end
