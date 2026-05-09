## Context

This is the largest single change in V1: it introduces scheduled work, a service worker, browser-permission UX, and external delivery (the push protocol). All prior V1 changes were CRUD-shaped and lived inside our own request/response loop. This one steps outside it, with all the risk that implies.

The product expectation is small and clear: "a nudge if you haven't checked in," at the user's chosen local time, on a phone-style notification. Everything else in this design is the plumbing required to make that happen reliably.

`user-settings` already ships `reminder_time` (`HH:MM` local string) and `timezone` (IANA name). `daily-check-in` already ships `DailyLog.wrote`, which lets us suppress the nudge once the user has checked in. Solid Queue is in the Gemfile from the Rails 8 default; we use its recurring-jobs feature for the dispatcher. `web-push` is the standard Ruby gem for VAPID-signed delivery.

## Goals / Non-Goals

**Goals:**
- A user who sets `reminder_time = 20:00` and grants permission gets a phone notification at 20:00 in their local timezone, on every day they haven't already checked in.
- One push per user per day, no matter how chaotic the dispatcher is.
- The system gracefully removes subscriptions that the browser has invalidated (uninstall, permission revoked).
- The Settings toggle reflects the current device's actual subscription state, not a stored boolean.
- The full flow works in development without a third-party push service — only the browser, the dev server, and Solid Queue.

**Non-Goals:**
- Native iOS / Android apps.
- A custom push server. We use the Web Push protocol via the `web-push` gem; commercial push services (FCM, APNs, OneSignal) are not introduced.
- Cross-channel fallback (email/SMS if push fails).
- Reminder personalization, quiet hours, or DND respect.
- Snooze, reschedule-for-today, or "remind me in 30 minutes."
- Reminder analytics or open-rate tracking.

## Decisions

### 1. Web Push (VAPID), not a third-party push service

**Choice:** Use the IETF Web Push protocol with VAPID-signed headers, via the `web-push` Ruby gem on the server and the browser's native `PushManager` on the client. No FCM, APNs, OneSignal.
**Why:** The product is small, the user count will be small, and Web Push works the same on every modern browser (with the iOS PWA caveat below). Adding a third-party service introduces accounts, keys, dashboards, and SDK integrations for no functional gain at this scale.
**Alternative considered:** OneSignal or similar. Rejected for v1 — overkill, and they pull data into their cloud which conflicts with the product's privacy ethos.

### 2. Per-device subscription, not per-account

**Choice:** Each browser/device that opts in creates its own `PushSubscription` row. A user with a phone and a laptop has two rows; both fire when a reminder is due.
**Why:** Matches how the browser API works (`PushManager` is per-browser), matches user expectation ("I want this notification on my phone"), and degrades sensibly (lose one device's subscription, others still work).
**Trade-off:** A user could end up with stale rows from a browser they no longer use. Mitigated by the 410-Gone cleanup on send (`§5`).

### 3. Settings toggle reflects current-device state, not a stored boolean

**Choice:** The "Daily reminder" toggle row is "is THIS device subscribed right now?" The frontend determines this from `pushManager.getSubscription()` on this browser plus the backend's confirmation that the subscription is registered.
**Why:** A stored "reminders enabled?" boolean lies the moment the user revokes browser permission or moves to a new device. Making the toggle a live read of "is subscription active" keeps the UX honest.
**Trade-off:** The toggle's truth is split across browser and server; both must agree. We define the source of truth as: subscription exists in `pushManager.getSubscription()` AND the backend has a row for this endpoint. UI shows ON only when both are true.

### 4. Recurring dispatcher every minute, per-user send job

**Choice:** A Solid Queue recurring job, `ReminderDispatcherJob`, runs every minute. It scans candidate users and enqueues a per-user `SendReminderJob` for each one due. Send jobs handle the actual `web-push` delivery and the `ReminderLog` write.
**Why:** Splitting dispatch from send means failures on one user's send don't block others; Solid Queue's retry semantics apply per-job; the dispatcher is a tiny, idempotent scan that's safe to run minute by minute.
**Alternative considered:** A single big job that loops through users and sends. Rejected — one slow `web-push` call would back up the rest; one transient failure would block dispatch for everyone.
**Alternative considered:** Per-user one-off scheduled jobs. Rejected — would require scheduling and re-scheduling on every settings change, and DST transitions become a maintenance headache.

### 5. Idempotency via a `ReminderLog` table with unique `(user_id, date)`

**Choice:** Before sending, the send job does `ReminderLog.find_or_create_by!(user_id:, date:)`. The unique index makes "did we already send today?" a database-enforced fact. If the row already exists, the send is skipped.
**Why:** A duplicate dispatch (two minutes both matching `HH:MM`, a job retry, a clock skew) cannot send a duplicate notification. The constraint is what enforces this — application-level checks alone are insufficient under contention.
**Trade-off:** If the row is created but the `web-push` call fails, we won't retry today (the row blocks it). That's intentional: better one missed reminder than the user getting two pushes because we retried after a transient hiccup. Solid Queue will still surface the failure for observability.

### 6. Suppression rule: skip if the user already wrote today

**Choice:** The dispatcher candidate filter and the send job's pre-flight both check `DailyLog.exists?(user, today, wrote: true)` and skip when true. The reminder is a nudge ONLY for unfilled days.
**Why:** This is exactly what the Settings subtitle says ("A nudge if you haven't checked in") and matches user expectation. Sending a reminder to someone who already did the thing is annoying.
**Trade-off:** A user who just wrote moments before their reminder time will never see the nudge. Correct behavior — the suppression is a feature, not a miss.

### 7. Time-matching: minute-precision, no window

**Choice:** A user is "due" when their current local time formatted as `HH:MM` exactly equals their `reminder_time`. The dispatcher running every minute means each minute is naturally evaluated once.
**Why:** Simple, deterministic, and aligned with the data we already store (`HH:MM`). No fuzzy windows, no "did we already check this minute" state.
**Trade-off:** If the dispatcher misses a minute (queue lag, restart in the wrong moment, scheduler downtime), affected users miss that day's reminder. Acceptable for v1; we revisit by adding a small lookback (e.g., "due if local time is within the last 5 minutes AND no log row yet") if it becomes a real problem.

### 8. VAPID keys: Rails credentials, generated once

**Choice:** Run `bin/rails credentials:edit` and add a VAPID public/private key pair, generated by `WebPush.generate_key`. The frontend gets the public key from `GET /push_config` (not at build time — runtime delivery is friendlier for rotation).
**Why:** Treat VAPID keys like any other secret — `master.key`-protected, env-specific, never committed. Runtime delivery means rotating keys is "edit credentials, deploy, expire old subscriptions" rather than "rebuild the bundle."
**Trade-off:** One extra request on app boot to fetch `/push_config`. Tiny cost; cache the result.

### 9. iOS PWA install gate

**Choice:** When the toggle is engaged on iOS Safari and `navigator.standalone !== true` (i.e., the page is not running as an installed PWA), the toggle does not request permission. Instead, an inline message explains that the user must add the app to their Home Screen first, with brief instructions.
**Why:** iOS 16.4+ supports web push, but only for installed PWAs. Calling `Notification.requestPermission` from Mobile Safari's tab UI silently no-ops or fails confusingly. We pre-detect and educate.
**Trade-off:** A small amount of platform-specific UX. Worth it; the alternative is a broken-feeling toggle for all iOS users.

### 10. Service worker scope: `/`

**Choice:** Register the service worker at `/` with the broadest scope. It handles `push` events (display notification) and `notificationclick` events (focus or open the app at `/`). No offline / caching strategy at v1.
**Why:** Web push requires a service worker. We don't need offline; we're not a content app. Keep the SW minimal — fewer features, fewer ways to break.

## Risks / Trade-offs

- **iOS PWA experience is the rough edge** → Mitigation: explicit install gate with on-screen instructions. A user who refuses to install can never receive push on iOS — accepted, no workaround exists.
- **Browser permission denial is silent the second time** → If a user denies once, the browser remembers. The toggle's "denied" state shows a clear explanation that they have to change their browser's site settings to re-enable. Mitigation: clear inline copy.
- **Dispatcher missing minutes** → A restart at 19:59:30 that completes at 20:00:30 means anyone whose reminder was 20:00 misses today. Mitigation: tolerable for v1; document; add lookback later if it bites.
- **`web-push` library returning 4xx/5xx** → Send job catches and routes: 410 → delete subscription; transient errors → Solid Queue retries; persistent unknown → log + give up after retry budget.
- **DST transitions** → Storing `reminder_time` as local HH:MM + `timezone` as IANA means DST transitions are handled by the underlying tz database. The "spring-forward" hour that doesn't exist (e.g., 02:30 on a transition day) — if a user has reminder_time inside the skipped hour, they get no reminder that day. Acceptable; document.
- **A user wipes their push subscription via browser settings without telling us** → They keep getting nothing, the toggle still says ON until either they toggle off, or the next dispatched send fails 410 and we clean up. Settle for "next send will fix it."
- **Race between toggle ON click and POST /push_subscriptions** → Frontend only marks the toggle ON after the POST resolves successfully. Spinner while pending.

## Migration Plan

- Two migrations: `push_subscriptions` and `reminder_logs`.
- Add `web-push` to the Gemfile, bundle.
- Generate VAPID keys via `bin/rails runner "puts WebPush.generate_key.to_pem"` (or the gem's helper) and place in Rails credentials.
- Configure Solid Queue's `recurring.yml` (or equivalent v8 config) with the `ReminderDispatcherJob` entry firing every minute.
- Roll out: initial deployment establishes infrastructure; existing users see the new toggle row in Settings; no backfill required.
- Rollback: drop the recurring job entry, drop the routes, drop the tables. The frontend service worker registration is harmless when the backend doesn't accept subscriptions.

## Open Questions

- **Should the dispatcher do a small lookback (e.g., 5 min) to forgive missed minutes?** Defer until measurement shows it's needed.
- **Should we persist a `last_failed_at` on `PushSubscription` to surface chronic failures to ops?** Probably; small addition. Decide during implementation.
- **Click-through analytics?** Skipped at v1; the product's privacy ethos doesn't reward this kind of tracking.
- **Notification body copy** — single shared static message, or rotate among a small set? v1: single message ("Did you write today?" or similar). Revisit if it stops landing.
