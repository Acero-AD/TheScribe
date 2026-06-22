## Why

The daily-reminder capability (Web Push notifications at a per-user local time) brings no value at the current single-user stage, yet it carries the heaviest operational cost in the app: a Solid Queue recurring job that scans the database every minute, forcing the worker to poll continuously. That constant polling is what burned through Neon's compute allowance (see `docs/neon-postmortem.md`) and keeps the self-hosted database from ever idling. Removing the feature deletes the only recurring background workload and a large, currently-unused surface (push subscriptions, VAPID keys, a service worker, two DB tables).

## What Changes

- **BREAKING (feature removal):** the entire `daily-reminder` capability is removed — no more push notifications, reminder dispatch, or "Daily reminder" toggle.
- Remove the recurring `ReminderDispatcherJob` from `config/recurring.yml` (eliminating the every-minute DB scan). The only remaining recurring entry is `clear_solid_queue_finished_jobs`.
- Remove backend jobs (`ReminderDispatcherJob`, `SendReminderJob`), controllers (`push_subscriptions`, `push_config`), the `ReminderLog` model, the VAPID and push-provider initializers, and the `web-push` gem.
- Remove the `reminder_time` field from user settings (the `User` validation/regex, the permitted param, and the `GET /me` settings payload). **`timezone` is retained** — it is used by daily check-in, streaks, history, and weekly publishing.
- Remove frontend push code (`lib/push.ts`, `api/pushSubscriptions.ts`, `api/pushConfig.ts`), the `/sw.js` service worker, the service-worker registration call, and the "Reminders" group / reminder-time row on the Settings screen.
- Drop the `push_subscriptions` and `reminder_logs` tables and the `users.reminder_time` column via a migration.
- Supersede the in-flight `fix-push-vapid-null-guard` change (it patches a bug inside the feature being deleted); it is archived as obsolete rather than implemented.
- Solid Queue is retained — the worker still serves `deliver_later` for magic-link auth emails — but it no longer has any always-on recurring workload.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `daily-reminder`: **removed in full** — every requirement (push-subscription persistence/registration/removal, VAPID key endpoint, `ReminderLog` idempotency, the recurring dispatcher, web-push delivery, send-time suppression re-check, service worker, Settings toggle, and the iOS-PWA gate) is deleted.
- `user-settings`: the settings field set drops `reminder_time` (from four fields to three: `week_starts_on`, `publishing_cadence`, `timezone`); the validation rejecting malformed `reminder_time` and the `reminder_time` key in the `GET /me` settings payload are removed; the Settings screen's "Reminders" group / time row is removed.

## Impact

- **Backend:** `app/jobs/{reminder_dispatcher_job,send_reminder_job}.rb`, `app/controllers/{push_subscriptions_controller,push_config_controller}.rb`, `app/models/reminder_log.rb`, `app/models/user.rb` (reminder_time validation/regex + `push_subscriptions`/`reminder_logs` associations), `app/controllers/me/settings_controller.rb` (permitted fields), `config/{recurring.yml,routes.rb}`, `config/initializers/{vapid.rb,push_providers.rb}`, `Gemfile` (`web-push`).
- **Frontend:** `src/lib/push.ts`, `src/api/{pushSubscriptions,pushConfig}.ts`, `public/sw.js`, `src/auth/AuthContext.tsx` (registration call), `src/auth/types.ts` (`reminder_time`), `src/screens/SettingsScreen.tsx` (Reminders group), and associated tests.
- **Database:** migration dropping `push_subscriptions`, `reminder_logs`, and `users.reminder_time`. Data is single-user and disposable; no backup dependency.
- **Deploy/secrets:** remove `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` from `config/deploy.yml` env and any CI/credentials entries.
- **OpenSpec:** delete `specs/daily-reminder/`; archive `changes/fix-push-vapid-null-guard` as superseded.
