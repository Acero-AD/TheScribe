## 1. Backend — Gem and VAPID setup

- [x] 1.1 Add `gem "web-push"` to the Gemfile; `bundle install`
- [x] 1.2 Generate VAPID keys: `bin/rails runner "puts WebPush.generate_key.to_pem"` (or the gem's idiomatic helper)
- [x] 1.3 Store the public and private keys in Rails credentials under `vapid: { public_key: ..., private_key: ..., subject: "mailto:<contact>" }`
- [x] 1.4 Add a small `Rails.application.config.x.vapid` accessor that pulls from credentials, used by the send job and the config endpoint
- [x] 1.5 Document VAPID setup in `backend/README.md`: how to generate, where to store, how to rotate

## 2. Backend — Schema & models

- [x] 2.1 Generate migration for `push_subscriptions` (`user:references`, `endpoint:string`, `p256dh_key:string`, `auth_key:string`, timestamps)
- [x] 2.2 Add unique composite index on `(user_id, endpoint)`
- [x] 2.3 Generate migration for `reminder_logs` (`user:references`, `date:date`, `sent_at:datetime`, timestamps)
- [x] 2.4 Add unique composite index on `(user_id, date)` — load-bearing for idempotency
- [x] 2.5 Run migrations
- [x] 2.6 Add `PushSubscription` model with `belongs_to :user`, validations on the three string fields
- [x] 2.7 Add `ReminderLog` model with `belongs_to :user`, validations on `date` and `sent_at`

## 3. Backend — Push subscription controller

- [x] 3.1 Create `PushSubscriptionsController` requiring authentication
- [x] 3.2 `#create` accepts `{ endpoint, p256dh_key, auth_key }`; uses `find_or_initialize_by(endpoint:)` scoped to current_user; updates the keys; saves; responds 201 (created) or 200 (updated)
- [x] 3.3 `#destroy_current` (`DELETE /push_subscriptions/current`) accepts an `endpoint` body or param; deletes the matching row scoped to current_user; idempotent (always 200)
- [x] 3.4 Routes: `post '/push_subscriptions', to: 'push_subscriptions#create'`, `delete '/push_subscriptions/current', to: 'push_subscriptions#destroy_current'`

## 4. Backend — Push config controller

- [x] 4.1 Create `PushConfigController#show` returning `{ vapid_public_key: Rails.application.config.x.vapid.public_key }`
- [x] 4.2 Require authentication
- [x] 4.3 Route: `get '/push_config', to: 'push_config#show'`

## 5. Backend — Send reminder job

- [x] 5.1 Create `SendReminderJob` (ActiveJob, queue: `:reminders`)
- [x] 5.2 Pre-flight: `return if DailyLog.exists?(user_id: user.id, date: Time::ForUser.today(user), wrote: true)`
- [x] 5.3 Idempotency: `ReminderLog.create!(user_id: user.id, date: Time::ForUser.today(user), sent_at: Time.current)`; rescue `ActiveRecord::RecordNotUnique` → return (already sent)
- [x] 5.4 For each `PushSubscription` of the user, call `WebPush.payload_send(...)` with the VAPID keys, the subscription's endpoint+keys, and a JSON payload `{ title: "Did you write today?", body: "A nudge from Scoreboard." }`
- [x] 5.5 Per-subscription error handling:
   - `WebPush::ExpiredSubscription` (410), `WebPush::InvalidSubscription` (404) → `subscription.destroy`
   - Other transient errors → re-raise to trigger Solid Queue retry; cap retries via `retry_on` with a small budget
   - Unknown / persistent errors → log and swallow after retries exhausted
- [x] 5.6 Make the job idempotent across retries: if the `ReminderLog` row was already created on a prior attempt, the next attempt's `find_or_create_by!` short-circuits before any sends

## 6. Backend — Dispatcher job

- [x] 6.1 Create `ReminderDispatcherJob` (ActiveJob, queue: `:dispatcher`)
- [x] 6.2 Implementation: scope users to those with non-null `reminder_time`, non-null `timezone`, an existing `PushSubscription`, no `DailyLog(today, wrote: true)`, no `ReminderLog(today)`
- [x] 6.3 For each candidate, format `Time.current.in_time_zone(user.timezone).strftime("%H:%M")` and compare to `user.reminder_time`; skip if not matching
- [x] 6.4 For each match, `SendReminderJob.perform_later(user.id)`
- [x] 6.5 Optimize: the candidate set is small (likely tens to thousands of users); a single SQL query with the subquery filters is sufficient. Document a query plan in a comment near the job

## 7. Backend — Solid Queue recurring config

- [x] 7.1 Create `config/recurring.yml` (or v8 equivalent) with an entry for `ReminderDispatcherJob` running every minute (cron `* * * * *`)
- [x] 7.2 Verify recurring jobs are loaded by Solid Queue in dev (start the workers, observe the dispatcher firing)
- [x] 7.3 Document the recurring config in `backend/README.md`

## 8. Backend — Tests

- [x] 8.1 Model spec: `PushSubscription` validations and uniqueness
- [x] 8.2 Model spec: `ReminderLog` validations and `(user_id, date)` uniqueness
- [x] 8.3 Request spec: `POST /push_subscriptions` (new, update-existing, missing-fields, unauthenticated)
- [x] 8.4 Request spec: `DELETE /push_subscriptions/current` (existing, unknown, cross-user, unauthenticated)
- [x] 8.5 Request spec: `GET /push_config` (authenticated returns key, unauthenticated 401)
- [x] 8.6 Job spec for `SendReminderJob`: pre-flight skip when wrote=true, idempotency-skip when ReminderLog exists, success path creates ReminderLog and calls web-push (mock the gem), 410 deletes the subscription, transient error retries
- [x] 8.7 Job spec for `ReminderDispatcherJob`: due-user enqueues, wrote-today suppresses, sent-already suppresses, no-subscription suppresses, wrong-minute suppresses
- [x] 8.8 End-to-end style test: run dispatcher with a fixture of 5 users in different timezones at varying reminder_times; assert the right subset is enqueued

## 9. Frontend — Service worker

- [x] 9.1 Create `public/sw.js` with handlers for `push` (parse payload, `self.registration.showNotification(title, { body })`) and `notificationclick` (focus existing client at `/`, else `clients.openWindow('/')`)
- [x] 9.2 Keep the SW minimal: no offline strategy, no caching beyond what the browser handles by default
- [x] 9.3 Document the SW's role in `frontend/README.md`

## 10. Frontend — SW registration & push config fetch

- [x] 10.1 On app boot (after auth), if `'serviceWorker' in navigator` and `'PushManager' in window`, register `/sw.js` with scope `/`
- [x] 10.2 `getPushConfig()` API helper → `GET /push_config`, returns `{ vapid_public_key }`; cache the result for the session
- [x] 10.3 `urlBase64ToUint8Array(base64)` utility (standard Web Push helper) for converting the VAPID key for `pushManager.subscribe`

## 11. Frontend — usePushSubscription hook

- [ ] 11.1 Build `usePushSubscription()` hook returning `{ status, subscribe, unsubscribe, error }`
- [ ] 11.2 `status` is computed from: `Notification.permission`, `pushManager.getSubscription()`, iOS-PWA detection — possible values: `'unsupported'`, `'install-required'`, `'denied'`, `'subscribed'`, `'unsubscribed'`, `'transitioning'`
- [ ] 11.3 `subscribe()`: requestPermission → pushManager.subscribe → POST /push_subscriptions; transitions through `'transitioning'`; resolves to new status
- [ ] 11.4 `unsubscribe()`: pushManager.getSubscription → unsubscribe → DELETE /push_subscriptions/current; resolves to new status
- [ ] 11.5 iOS-install detection helper: `isIOSStandaloneRequired()` returns true on iOS Safari without `navigator.standalone`

## 12. Frontend — Settings toggle row

- [ ] 12.1 Update the Settings screen (introduced in `add-user-settings`) to render a "Daily reminder" `SettingsRow` ABOVE the existing Time row, with subtitle "A nudge if you haven't checked in"
- [ ] 12.2 Right-side control is the `Toggle` component (already styled in `docs/design/settings.jsx`)
- [ ] 12.3 Wire toggle state to `usePushSubscription().status`: ON when `subscribed`, OFF otherwise; disabled while `transitioning` or `unsupported` or `install-required`
- [ ] 12.4 On user click: dispatch to `subscribe()` or `unsubscribe()` based on current state
- [ ] 12.5 Render inline error/info messages beneath the row for `'denied'`, `'install-required'`, and any subscribe/unsubscribe errors
- [ ] 12.6 The Time row remains as before; document that changing time only matters once the toggle is ON

## 13. Frontend — Tests

- [ ] 13.1 Unit test: `urlBase64ToUint8Array` correctness on a known fixture
- [ ] 13.2 Hook test: `usePushSubscription` reaches `'subscribed'` after a successful subscribe (mock the browser APIs and the backend POST)
- [ ] 13.3 Hook test: `usePushSubscription` returns `'denied'` when permission is denied
- [ ] 13.4 Hook test: `usePushSubscription` returns `'install-required'` on a simulated iOS-non-standalone environment
- [ ] 13.5 Component test: the Settings toggle row renders correctly across all `status` values, and clicking dispatches the right action
- [ ] 13.6 Component test: inline messaging appears for the expected statuses

## 14. End-to-end verification (manual)

- [ ] 14.1 Sign in, open `/settings`, toggle ON → grant permission → confirm a backend `PushSubscription` row exists for the user
- [ ] 14.2 Set `reminder_time` to within the next 2 minutes; ensure `wrote = false` for today; wait → confirm a notification arrives at exactly the configured minute
- [ ] 14.3 Tap the notification → app opens at `/`
- [ ] 14.4 Without changing settings, observe that no second notification arrives the same day even with the dispatcher running every minute
- [ ] 14.5 Toggle the writing card to `wrote = true`, set reminder_time to the next minute → confirm NO notification arrives (suppression by `wrote = true`)
- [ ] 14.6 In Settings, toggle OFF → confirm the backend row is deleted; no further pushes arrive
- [ ] 14.7 In a second browser, sign in and toggle ON → confirm both devices receive the next reminder
- [ ] 14.8 Manually invalidate one device's subscription (uninstall PWA / clear browser data) → trigger the next reminder → confirm the 410 cleanup deletes the stale row
- [ ] 14.9 Test on iOS Safari without installing → confirm the inline install message renders and the toggle is disabled
- [ ] 14.10 Install the app to home screen on iOS → reopen from home screen → confirm the toggle is interactive

## 15. Documentation

- [ ] 15.1 In `backend/README.md`, document the entire reminder pipeline: VAPID setup, recurring config, the suppression rule, the idempotency model, the 410-cleanup behavior
- [ ] 15.2 In `frontend/README.md`, document the service worker, the `usePushSubscription` hook's `status` model, and the iOS install requirement
- [ ] 15.3 Add a brief operational guide for ops: what to check if reminders stop arriving (recurring job alive? credentials populated? subscriptions present? logs?)
