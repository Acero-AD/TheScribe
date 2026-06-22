## REMOVED Requirements

### Requirement: Backend SHALL persist push subscriptions per user per device
**Reason**: The daily-reminder capability is removed; Web Push brings no value at the current single-user stage and its recurring dispatcher is the app's only always-on background workload.
**Migration**: None. The `push_subscriptions` table is dropped. No replacement.

### Requirement: Backend SHALL accept push subscription registration
**Reason**: Push notifications are removed; there is nothing to register.
**Migration**: None. `POST /push_subscriptions` and the provider-allowlist initializer are deleted; clients no longer call this endpoint.

### Requirement: Backend SHALL accept push subscription removal
**Reason**: Push notifications are removed; there is nothing to unsubscribe.
**Migration**: None. `DELETE /push_subscriptions/current` is deleted.

### Requirement: Backend SHALL expose the VAPID public key
**Reason**: Push notifications are removed; no VAPID keys are needed.
**Migration**: None. `GET /push_config`, the VAPID initializer, and the `VAPID_*` secrets/env are deleted.

### Requirement: Backend SHALL persist reminder-sent records to enforce one-per-day idempotency
**Reason**: No reminders are sent, so no per-day idempotency record is needed.
**Migration**: None. The `reminder_logs` table and `ReminderLog` model are dropped.

### Requirement: Backend SHALL run a recurring dispatcher every minute
**Reason**: This every-minute scan is the polling workload being eliminated; with the feature gone there is nothing to dispatch.
**Migration**: None. The `reminder_dispatcher` entry is removed from `config/recurring.yml`; `ReminderDispatcherJob` is deleted.

### Requirement: Backend SHALL deliver pushes via web-push and clean up failed subscriptions
**Reason**: No pushes are delivered.
**Migration**: None. `SendReminderJob` is deleted and the `web-push` gem is removed.

### Requirement: Backend SHALL re-check suppression conditions at send time
**Reason**: There is no send path to guard.
**Migration**: None.

### Requirement: Frontend SHALL register a service worker that handles push events
**Reason**: With push removed there are no push events to handle.
**Migration**: None. `public/sw.js` and the registration call in `AuthContext` are deleted.

### Requirement: Frontend SHALL render a daily reminder toggle row in Settings
**Reason**: The toggle controlled a removed capability.
**Migration**: None. The toggle row is removed from the Settings screen (see the `user-settings` delta).

### Requirement: Frontend SHALL handle toggle interactions correctly
**Reason**: The toggle is removed.
**Migration**: None. The frontend push library and API clients are deleted.

### Requirement: Frontend SHALL gate the toggle on iOS Safari outside an installed PWA
**Reason**: The toggle is removed, so the iOS-PWA gate is moot.
**Migration**: None.
