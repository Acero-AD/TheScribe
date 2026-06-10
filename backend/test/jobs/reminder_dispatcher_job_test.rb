require "test_helper"

class ReminderDispatcherJobTest < ActiveJob::TestCase
  include ActiveJob::TestHelper

  # Wed 2026-05-20 20:00 UTC. For a UTC user with reminder_time "20:00",
  # the dispatcher running at this instant should enqueue them.
  setup { travel_to Time.utc(2026, 5, 20, 20, 0, 0) }
  teardown { travel_back }

  def make_user(email:, reminder_time: "20:00", timezone: "UTC", subscribe: true)
    user = User.create!(email: email, reminder_time: reminder_time, timezone: timezone)
    if subscribe
      PushSubscription.create!(
        user: user, endpoint: "https://fcm.googleapis.com/fcm/send/#{user.id}",
        p256dh_key: "p", auth_key: "a"
      )
    end
    user
  end

  test "enqueues SendReminderJob for a due user" do
    user = make_user(email: "due@example.com")
    assert_enqueued_with(job: SendReminderJob, args: [ user.id ]) do
      ReminderDispatcherJob.perform_now
    end
  end

  test "suppresses users who already wrote today" do
    user = make_user(email: "wrote@example.com")
    DailyLog.create!(user: user, date: Date.new(2026, 5, 20), wrote: true, wrote_at: Time.current)
    assert_no_enqueued_jobs(only: SendReminderJob) do
      ReminderDispatcherJob.perform_now
    end
  end

  test "suppresses users who already received a reminder today" do
    user = make_user(email: "sent@example.com")
    ReminderLog.create!(user: user, date: Date.new(2026, 5, 20), sent_at: Time.current)
    assert_no_enqueued_jobs(only: SendReminderJob) do
      ReminderDispatcherJob.perform_now
    end
  end

  test "suppresses users with no push subscription" do
    make_user(email: "nosub@example.com", subscribe: false)
    assert_no_enqueued_jobs(only: SendReminderJob) do
      ReminderDispatcherJob.perform_now
    end
  end

  test "suppresses users whose local minute does not match" do
    # User in Tokyo: 2026-05-20 20:00 UTC = 2026-05-21 05:00 Tokyo. Their
    # reminder_time of "20:00" is not the current local HH:MM.
    make_user(email: "tokyo@example.com", timezone: "Asia/Tokyo")
    assert_no_enqueued_jobs(only: SendReminderJob) do
      ReminderDispatcherJob.perform_now
    end
  end

  test "suppresses users with null reminder_time or timezone" do
    User.create!(email: "no-tz@example.com", reminder_time: "20:00") # tz defaults to nil
    User.create!(email: "no-rt@example.com", timezone: "UTC")        # reminder_time nil
    assert_no_enqueued_jobs(only: SendReminderJob) do
      ReminderDispatcherJob.perform_now
    end
  end

  # ---- end-to-end fixture across timezones -----------------------------

  test "fans out across a fixture of 5 users in different timezones, picking the right subset" do
    # Now = 2026-05-20 20:00 UTC.
    # Map of (email → tz → local HH:MM at that instant):
    #   utc-due       UTC                  → 20:00
    #   ny-due        America/New_York     → 16:00
    #   ldn-late      Europe/London        → 21:00
    #   tokyo-night   Asia/Tokyo (next day)→ 05:00
    #   utc-wrote     UTC                  → 20:00 (suppressed)
    due_utc   = make_user(email: "utc-due@example.com",     reminder_time: "20:00", timezone: "UTC")
    due_ny    = make_user(email: "ny-due@example.com",      reminder_time: "16:00", timezone: "America/New_York")
    late_ldn  = make_user(email: "ldn-late@example.com",    reminder_time: "10:00", timezone: "Europe/London")
    tokyo     = make_user(email: "tokyo-night@example.com", reminder_time: "20:00", timezone: "Asia/Tokyo")
    wrote_utc = make_user(email: "utc-wrote@example.com",   reminder_time: "20:00", timezone: "UTC")
    DailyLog.create!(user: wrote_utc, date: Date.new(2026, 5, 20), wrote: true, wrote_at: Time.current)

    ReminderDispatcherJob.perform_now

    enqueued_ids = enqueued_jobs.select { |j| j[:job] == SendReminderJob }.flat_map { |j| j[:args] }
    assert_includes enqueued_ids, due_utc.id
    assert_includes enqueued_ids, due_ny.id
    refute_includes enqueued_ids, late_ldn.id
    refute_includes enqueued_ids, tokyo.id
    refute_includes enqueued_ids, wrote_utc.id
  end
end
