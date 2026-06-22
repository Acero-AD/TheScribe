## 1. Backend — remove reminder/push code

- [x] 1.1 Delete `app/jobs/reminder_dispatcher_job.rb` and `app/jobs/send_reminder_job.rb`
- [x] 1.2 Delete `app/controllers/push_subscriptions_controller.rb` and `app/controllers/push_config_controller.rb`
- [x] 1.3 Delete `app/models/reminder_log.rb`
- [x] 1.4 Delete `config/initializers/vapid.rb` and `config/initializers/push_providers.rb`
- [x] 1.5 Remove the `push_subscriptions` and `push_config` routes from `config/routes.rb`
- [x] 1.6 Remove the `reminder_dispatcher` entry from `config/recurring.yml` (keep `clear_solid_queue_finished_jobs`)
- [x] 1.7 In `app/models/user.rb`, remove `REMINDER_TIME_REGEX`, the `reminder_time` validation, and the `push_subscriptions` / `reminder_logs` associations
- [x] 1.8 In `app/controllers/me/settings_controller.rb`, remove `reminder_time` from `PERMITTED_FIELDS`
- [x] 1.9 Remove `reminder_time` from the `GET /me` settings payload (wherever the settings sub-object is serialized)
- [x] 1.10 Remove `gem "web-push"` from `Gemfile` and run `bundle install` (via docker compose) to update `Gemfile.lock`

## 2. Backend — database migration

- [x] 2.1 Generate a migration dropping the `push_subscriptions` and `reminder_logs` tables and the `users.reminder_time` column
- [x] 2.2 Run the migration (via docker compose) and confirm `db/schema.rb` reflects the drops

## 3. Frontend — remove reminder/push code

- [x] 3.1 Delete `src/lib/push.ts`, `src/api/pushSubscriptions.ts`, and `src/api/pushConfig.ts`
- [x] 3.2 Delete the service worker `public/sw.js`
- [x] 3.3 Remove the `registerPushServiceWorker()` import and call from `src/auth/AuthContext.tsx`
- [x] 3.4 Remove `reminder_time` from `src/auth/types.ts`
- [x] 3.5 Remove the "Reminders" group / reminder-time row (and any push toggle) from `src/screens/SettingsScreen.tsx`, leaving the "Schedule" group
- [x] 3.6 Delete or update push/reminder-related frontend tests (e.g. `SettingsScreen.test.tsx` reminder assertions, any push/usePushSubscription tests)

## 4. Deploy / secrets cleanup

- [x] 4.1 Remove `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` from `config/deploy.yml` env
- [x] 4.2 Remove any `VAPID_*` entries from CI variables/secrets and Rails credentials

## 5. OpenSpec bookkeeping

- [x] 5.1 Archive `openspec/changes/fix-push-vapid-null-guard` as superseded by this change (do not implement it)

## 6. Verification

- [x] 6.1 Grep backend + frontend for `reminder`, `push`, `vapid`, `web_push`, `sw.js`, `reminder_time` and confirm no lingering references (except this change's docs and the postmortem)
- [x] 6.2 Run the full backend test suite (via docker compose) — all green
- [x] 6.3 Run the full frontend test suite — all green
- [x] 6.4 Boot the app and confirm `/settings` renders only the Schedule group and `GET /me` settings has no `reminder_time`
- [x] 6.5 Confirm Solid Queue still processes magic-link `deliver_later` and that no recurring reminder job is scheduled
