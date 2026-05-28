## Why

Per `docs/scoreboard-app.md`: "Make showing up feel like winning … Be fast enough that using it never becomes the task." A daily reminder converts the app from "something I have to remember to open" into "something that nudges me at the time I asked to be nudged." Without it, the streak mechanic relies entirely on the user's memory; with it, the user sets an intention once and the system carries it.

The product chose **PWA web push** as the delivery channel — a phone-style notification that doesn't depend on email and works without a native app. This is the seventh and final V1 capability and the heaviest single change in the V1 set, because it spans browser permissions, a service worker, server-side VAPID keys, a recurring scheduled job, and end-to-end idempotency.

It depends on `account-access` (a User), `user-settings` (`reminder_time`, `timezone`), and `daily-check-in` (the "did the user already write today?" signal that suppresses the nudge).

## What Changes

- New `PushSubscription` model on the backend: `user_id`, `endpoint` (unique per user), `p256dh_key`, `auth_key`, timestamps. Each subscription represents one device that has opted in.
- New `POST /push_subscriptions` and `DELETE /push_subscriptions/current` endpoints for the frontend to register and unregister the current device.
- New `GET /push_config` returning `{ vapid_public_key }` so the frontend can subscribe without a build-time env var.
- New `ReminderLog` model: `user_id`, `date`, `sent_at`, with unique index on `(user_id, date)`. Enforces one-reminder-per-user-per-day idempotency.
- New `ReminderDispatcherJob` (Solid Queue recurring, every minute) that scans candidate users — users with `reminder_time` set, `timezone` set, at least one `PushSubscription`, no `ReminderLog` for today, and no `DailyLog` with `wrote = true` for today — and enqueues `SendReminderJob` for each.
- New `SendReminderJob` (per user) that re-checks the same conditions atomically, attempts to deliver via `web-push` to all of the user's subscriptions, writes a `ReminderLog` row, removes any subscription that returns a permanent failure (HTTP 410 Gone), and surfaces transient failures via standard Solid Queue retry.
- Frontend service worker (`public/sw.js`) registered on app load, handling `push` events by displaying a notification with the app's brand and a click action that opens the app at `/`.
- Frontend Settings screen gains the previously-deferred **"Daily reminder"** toggle row in the Reminders group. Toggling on: requests browser permission, subscribes via `PushManager`, POSTs the subscription. Toggling off: unsubscribes locally, DELETEs the subscription server-side.
- Frontend detection of iOS Safari outside of an installed PWA, with an inline message explaining that the user needs to "Add to Home Screen" before push notifications will work.
- VAPID keys generated once and stored in Rails credentials.

## Capabilities

### New Capabilities
- `daily-reminder`: Per-user daily push notification at a configured local time, suppressed if the user has already written today. Owns push-subscription lifecycle, the dispatch and send jobs, idempotency, and the Settings toggle row that controls subscription on the current device.

### Modified Capabilities
<!-- None — `user-settings`'s `reminder_time` and `timezone` fields are already in place; this change only consumes them. The Settings screen requirement in `user-settings` does not enumerate every row, so this change adds the toggle row as a new requirement under `daily-reminder`. -->

## Impact

- **Backend (`backend/`)**: Add `web-push` gem; one migration per new model (`push_subscriptions`, `reminder_logs`); two new controllers (`PushSubscriptionsController`, `PushConfigController`); two new jobs (`ReminderDispatcherJob`, `SendReminderJob`); Solid Queue recurring-jobs config; Rails credentials setup for VAPID; routes and tests for everything above.
- **Frontend (`frontend/`)**: Add `public/sw.js` (service worker); register it on app boot; add a `usePushSubscription` hook that exposes `{ status: 'unsupported' | 'install-required' | 'denied' | 'subscribed' | 'unsubscribed', subscribe, unsubscribe }`; add the Daily-reminder toggle row to the Settings screen; add iOS-install detection and inline messaging; small fetch helper for `/push_config`.
- **Cross-cutting**: This change introduces the first scheduled work in the system. Operations and observability surface area grows: Solid Queue's recurring config, the `web-push` library's failure modes, the per-user push permission flow. README documentation is heavier than for other changes accordingly.
- **Out of scope**: digest-style reminders ("you've missed 3 days"); reminders for the publishing cadence; multi-channel fallback (email if push fails); reminder snoozing or rescheduling within a day; quiet hours / Do Not Disturb integration; reminder content personalization beyond the static title/body. All can be revisited post-V1.
