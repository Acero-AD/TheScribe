# daily-reminder Specification

## Purpose
Per-user daily push notification at a configured local time, suppressed if the user has already written today. Owns push-subscription lifecycle, the recurring dispatch and per-user send jobs, one-per-day idempotency via `ReminderLog`, the VAPID public-key endpoint, the service worker that surfaces push events as system notifications, and the "Daily reminder" toggle row on the Settings screen that controls subscription on the current device.

## Requirements

### Requirement: Backend SHALL persist push subscriptions per user per device

The backend SHALL define a `PushSubscription` record with `user_id`, `endpoint` (string, unique per user), `p256dh_key` (string), and `auth_key` (string). Each row represents a single browser-on-a-device opt-in. Multiple rows MAY exist per user — one per device.

#### Scenario: Two devices, two rows
- **WHEN** the same user opts in on two different browsers and creates two distinct `endpoint` values
- **THEN** two `PushSubscription` rows exist for that user

#### Scenario: Re-subscribing the same endpoint
- **WHEN** a client POSTs a subscription whose `endpoint` matches an existing row for that user
- **THEN** the existing row's `p256dh_key` and `auth_key` are updated rather than a duplicate row being inserted

### Requirement: Backend SHALL accept push subscription registration

The backend SHALL accept `POST /push_subscriptions` from authenticated users with a body containing `endpoint`, `p256dh_key`, and `auth_key`. On success, the response SHALL be 201 with the persisted subscription's id (or 200 if it already existed and was updated). Missing or malformed fields SHALL respond 422.

#### Scenario: Successful new subscription
- **WHEN** an authenticated user POSTs `/push_subscriptions` with a complete, well-formed body
- **THEN** the backend persists the subscription and responds 201

#### Scenario: Missing keys
- **WHEN** the body lacks `p256dh_key` or `auth_key`
- **THEN** the backend responds 422 and no row is persisted

#### Scenario: Unauthenticated POST
- **WHEN** an unauthenticated client POSTs `/push_subscriptions`
- **THEN** the backend responds 401

### Requirement: Backend SHALL accept push subscription removal

The backend SHALL accept `DELETE /push_subscriptions/current` from authenticated users with a body or param containing the `endpoint` to remove. The matching row, if any, SHALL be deleted. Idempotency: deleting an unknown endpoint SHALL respond 200 with no error.

#### Scenario: Removing an existing subscription
- **WHEN** an authenticated user DELETEs `/push_subscriptions/current` with their device's endpoint
- **THEN** the row is removed and the response is 200

#### Scenario: Removing an unknown endpoint
- **WHEN** the user DELETEs with an endpoint that doesn't match any of their rows
- **THEN** the response is 200 (idempotent) and no error is raised

#### Scenario: Cross-user removal is impossible
- **WHEN** user A DELETEs with an endpoint that belongs to user B
- **THEN** no row is deleted (the query is scoped to user A) and the response is 200

### Requirement: Backend SHALL expose the VAPID public key

The backend SHALL serve `GET /push_config` returning `{ vapid_public_key: <string> }`. The endpoint SHALL be available to authenticated users only. The key value SHALL be loaded from Rails credentials, never committed to the repository.

#### Scenario: Authenticated request
- **WHEN** an authenticated user GETs `/push_config`
- **THEN** the response is 200 with the VAPID public key string

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated client GETs `/push_config`
- **THEN** the backend responds 401

### Requirement: Backend SHALL persist reminder-sent records to enforce one-per-day idempotency

The backend SHALL define a `ReminderLog` record with `user_id`, `date`, and `sent_at`, with a unique composite index on `(user_id, date)`. The send job SHALL create this row before invoking `web-push`; a uniqueness violation on insert SHALL cause the send to be skipped silently.

#### Scenario: First send of the day
- **WHEN** the send job runs for user U on date D and no `ReminderLog(U, D)` exists
- **THEN** a row is created with `sent_at = now` before any push is dispatched

#### Scenario: Second invocation same day
- **WHEN** the send job runs again for user U on date D and a row already exists
- **THEN** the second insert raises a unique-constraint violation, the send is skipped, and no push is dispatched

### Requirement: Backend SHALL run a recurring dispatcher every minute

The backend SHALL configure a Solid Queue recurring job, `ReminderDispatcherJob`, scheduled to run every minute. Each run SHALL identify users who are due for a reminder right now and enqueue a `SendReminderJob` for each one.

A user is "due" when ALL of:
- `user.reminder_time` is non-null.
- `user.timezone` is non-null.
- The current time, formatted as `HH:MM` in `user.timezone`, equals `user.reminder_time`.
- The user has at least one `PushSubscription`.
- No `ReminderLog` exists for `(user.id, Time::ForUser.today(user))`.
- No `DailyLog` exists for `(user.id, Time::ForUser.today(user))` with `wrote = true`.

#### Scenario: A due user
- **WHEN** the dispatcher runs at 20:00 NY local for a user with `reminder_time: "20:00"`, `timezone: "America/New_York"`, an active subscription, no log for today, and `wrote = false` for today
- **THEN** a `SendReminderJob` is enqueued for that user

#### Scenario: Already wrote today
- **WHEN** the same user has `DailyLog(today).wrote = true`
- **THEN** no `SendReminderJob` is enqueued for them

#### Scenario: Already sent today
- **WHEN** the same user has a `ReminderLog(today)` row already
- **THEN** no `SendReminderJob` is enqueued for them

#### Scenario: No active subscription
- **WHEN** the same user has no `PushSubscription` rows
- **THEN** no `SendReminderJob` is enqueued for them

#### Scenario: Wrong minute
- **WHEN** the local-time-formatted-as-HH:MM does not equal `reminder_time`
- **THEN** no `SendReminderJob` is enqueued for that user this run

### Requirement: Backend SHALL deliver pushes via web-push and clean up failed subscriptions

The send job SHALL use the `web-push` library with the configured VAPID keys to dispatch a notification payload to each of the user's `PushSubscription` rows. Per-subscription outcomes SHALL be handled as:
- **2xx**: success; nothing further.
- **410 Gone** or **404 Not Found**: the subscription is permanently invalid; the row SHALL be deleted.
- **5xx or transient errors**: surface via Solid Queue's retry mechanism for the send job, up to the configured retry budget.

The notification payload SHALL include a title and a short body indicating it's the daily writing nudge.

#### Scenario: Successful delivery
- **WHEN** the send job dispatches to a subscription and `web-push` returns 201
- **THEN** the subscription row is left intact and no further action is taken for that subscription

#### Scenario: Permanently invalid subscription
- **WHEN** `web-push` returns 410 Gone for a subscription
- **THEN** that `PushSubscription` row is deleted

#### Scenario: Transient failure
- **WHEN** `web-push` returns 503 or a network timeout
- **THEN** the send job is retried per Solid Queue's configured backoff and budget

#### Scenario: Multiple devices, mixed outcomes
- **WHEN** the user has three subscriptions and the dispatch returns `[201, 410, 201]`
- **THEN** the 410'd subscription is deleted, the other two remain, and the `ReminderLog` row stands (the day was effectively delivered)

### Requirement: Backend SHALL re-check suppression conditions at send time

The send job SHALL, immediately before invoking `web-push`, re-verify that no `DailyLog(user, today)` with `wrote = true` exists. This guards against the race where a user checks in between dispatch and send.

#### Scenario: User checks in between dispatch and send
- **WHEN** the dispatcher enqueues `SendReminderJob` at 20:00 and the user toggles `wrote = true` at 20:00:05, before the job runs
- **THEN** the send job's pre-flight check finds `wrote = true`, the `ReminderLog` row is NOT created, and no push is dispatched

### Requirement: Frontend SHALL register a service worker that handles push events

The frontend SHALL register a service worker at `/sw.js` with scope `/` on app load (only when the runtime supports `navigator.serviceWorker`). The service worker SHALL listen for `push` events and call `self.registration.showNotification(title, { body })` with the payload from the push event. It SHALL listen for `notificationclick` events and focus an existing app window at `/`, opening one if none exists.

#### Scenario: Push received while app is closed
- **WHEN** the browser receives a push event for a registered subscription and the app is not open
- **THEN** the service worker shows a system notification with the daily-reminder title and body

#### Scenario: User taps the notification
- **WHEN** the user taps the notification
- **THEN** the app opens at `/` (or focuses an existing tab)

#### Scenario: Browser without service-worker support
- **WHEN** the user's browser does not support service workers (e.g., very old browsers)
- **THEN** the frontend silently does nothing (no error, no toggle visible)

### Requirement: Frontend SHALL render a daily reminder toggle row in Settings

The frontend SHALL render a toggle row labelled "Daily reminder" with the subtitle "A nudge if you haven't checked in" inside the "Reminders" group of `/settings`. The toggle's visual state SHALL reflect whether the current device is currently subscribed: ON if `pushManager.getSubscription()` resolves to a non-null subscription whose endpoint is registered with the backend, OFF otherwise.

#### Scenario: Settings opened with an active subscription on this device
- **WHEN** the device has an active `PushSubscription` known to the backend
- **THEN** the toggle renders ON

#### Scenario: Settings opened with no subscription
- **WHEN** the device has no active subscription
- **THEN** the toggle renders OFF

#### Scenario: Browser permission was previously denied
- **WHEN** the browser's notification permission for this origin is `denied`
- **THEN** the toggle renders OFF and an inline message explains that the user must change their browser's site settings to enable

### Requirement: Frontend SHALL handle toggle interactions correctly

The frontend SHALL respond to toggle interactions as follows:
- **OFF → ON**: request `Notification.requestPermission()`. If granted, call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <vapid public key> })`, then `POST /push_subscriptions` with the subscription. On success, the toggle becomes ON. On any failure, the toggle stays OFF and an inline error appears.
- **ON → OFF**: unsubscribe the local `PushSubscription` via `pushManager.subscribe(...).unsubscribe()`, then `DELETE /push_subscriptions/current` with the endpoint. The toggle becomes OFF on success.

The toggle SHALL show a spinner / disabled state while a transition is in progress.

#### Scenario: Successful enable
- **WHEN** the user toggles ON and grants permission
- **THEN** the toggle ends in the ON state and the backend has a row for this device's endpoint

#### Scenario: User denies permission
- **WHEN** the user toggles ON and denies the permission prompt
- **THEN** the toggle returns to OFF and an inline message explains that permission is required

#### Scenario: Successful disable
- **WHEN** the user toggles OFF
- **THEN** the local subscription is unsubscribed AND the backend row is deleted

#### Scenario: Backend POST fails
- **WHEN** the user grants permission and the local subscribe succeeds, but the backend POST fails
- **THEN** the toggle returns to OFF, the local subscription is unsubscribed (to avoid an orphaned local sub), and an inline error is shown

### Requirement: Frontend SHALL gate the toggle on iOS Safari outside an installed PWA

The frontend SHALL detect when the runtime is iOS Safari and the page is not running as an installed PWA (`navigator.standalone !== true` AND `display-mode !== 'standalone'`). In this state, the toggle SHALL render in a disabled / informational state with an inline message explaining that the user must "Add to Home Screen" before enabling push notifications.

#### Scenario: iOS Safari, not installed
- **WHEN** the user opens `/settings` on iOS Safari without having added the app to the Home Screen
- **THEN** the toggle is disabled and an inline message explains the install requirement with brief instructions

#### Scenario: iOS Safari, installed PWA
- **WHEN** the user opens `/settings` on iOS Safari from the installed Home Screen icon
- **THEN** the toggle behaves as on other platforms — interactive, with the standard ON/OFF semantics

#### Scenario: Non-iOS browser
- **WHEN** the user is on Chrome, Firefox, Edge, etc.
- **THEN** the install gate is not shown; the toggle is fully interactive
