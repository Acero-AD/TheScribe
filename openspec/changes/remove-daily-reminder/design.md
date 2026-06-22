## Context

The `daily-reminder` capability spans the whole stack: backend jobs (`ReminderDispatcherJob`, `SendReminderJob`), controllers (`push_subscriptions`, `push_config`), the `ReminderLog` model, VAPID + push-provider initializers, the `web-push` gem, two DB tables (`push_subscriptions`, `reminder_logs`) plus the `users.reminder_time` column, and a frontend stack (service worker `public/sw.js`, `lib/push.ts`, push API clients, the Settings toggle). Web Push exists in this app **only** to serve reminders — nothing else consumes it.

The `ReminderDispatcherJob` recurring entry (`* * * * *`) is the app's single always-on background workload. It is what kept Neon's compute endpoint awake 24/7 (`docs/neon-postmortem.md`) and what keeps the self-hosted Postgres from idling. At a single user, the feature delivers no value, so removal is the cleanest fix rather than tuning the polling.

An in-flight change, `fix-push-vapid-null-guard` (10/11 tasks), patches a crash *inside* this feature. Removing the feature supersedes it.

## Goals / Non-Goals

**Goals:**
- Remove the daily-reminder capability end-to-end (backend, frontend, DB, deploy config, specs).
- Eliminate the every-minute recurring job so the worker has no always-on workload.
- Keep the rest of the app behaving identically, especially anything depending on `timezone`.

**Non-Goals:**
- Removing or reworking Solid Queue itself — it still serves `deliver_later` for magic-link emails.
- Changing Solid Queue polling intervals (moot once the recurring scan is gone; can be revisited separately).
- Building any replacement notification/reminder mechanism.

## Decisions

### Decision 1: Remove the capability rather than tune it
The original thread was about reducing constant DB polling. Tuning `polling_interval` and redesigning the dispatcher were options, but the feature itself is unused at this stage. Deleting it removes the root cause (the recurring scan) and a large unused surface in one move.
- **Alternative considered:** raise polling intervals + redesign reminders to a `next_reminder_at` model. Rejected for now — more code to maintain a feature nobody uses.

### Decision 2: Retain `timezone`, remove only `reminder_time`
`timezone` (via `Time::ForUser`) is load-bearing for daily check-in, streaks, history, and weekly publishing. Only `reminder_time` is reminder-specific.
- **Alternative considered:** drop both. Rejected — would break date math across the app.

### Decision 3: Drop the DB tables/column in this change
`push_subscriptions`, `reminder_logs`, and `users.reminder_time` are removed by a migration in this change rather than left dormant. The data is single-user and disposable (ephemeral push endpoints + a log of sent reminders + one time string), so there is no backup dependency despite the not-yet-implemented backup follow-up.
- **Alternative considered:** delete code now, drop tables later. Rejected — leaving orphan tables/columns is exactly the dead weight this change removes; the data has no recovery value.

### Decision 4: Supersede `fix-push-vapid-null-guard`
That change fixes a bug in code being deleted. It is archived as superseded (not implemented) to avoid wasted work and a confusing spec history.
- **Alternative considered:** implement it first, then delete. Rejected — pure waste.

### Decision 5: Keep Solid Queue and `SOLID_QUEUE_IN_PUMA`
The worker still runs magic-link `deliver_later`. Keep the supervisor-in-Puma setup; only the recurring reminder entry is removed. `clear_solid_queue_finished_jobs` stays.

## Risks / Trade-offs

- **Irreversible data loss from dropping tables** → Mitigation: data is disposable (push endpoints re-register on opt-in; reminder logs are historical only; `reminder_time` is a single preference). Accepted.
- **Stray references left behind cause boot/test failures** → Mitigation: grep for `reminder`, `push`, `vapid`, `web_push`, `sw.js`, `reminder_time` across backend and frontend after removal; run the full backend and frontend test suites.
- **Deploy env drift (orphaned VAPID secrets)** → Mitigation: remove `VAPID_*` from `config/deploy.yml` and any CI variables/credentials; a leftover secret is harmless but should be cleaned for clarity.
- **Service worker cached on existing clients** → Mitigation: removing `/sw.js` means the route 404s; existing registrations become inert (no push will arrive since the backend no longer sends). Acceptable for a single user; no explicit unregister script needed.

## Migration Plan

1. Backend: delete jobs, controllers, model, initializers, routes; remove `reminder_time` validation/regex and push/reminder associations from `User`; remove `reminder_time` from permitted settings params and the `/me` settings payload; remove `web-push` from the Gemfile and `bundle`.
2. Frontend: delete push lib/API clients and `public/sw.js`; remove the service-worker registration call; remove the Reminders group/time row from Settings and `reminder_time` from `auth/types.ts`; delete related tests.
3. DB: add a migration dropping `push_subscriptions`, `reminder_logs`, and `users.reminder_time`; run it.
4. Config/secrets: remove `reminder_dispatcher` from `recurring.yml`; remove `VAPID_*` env from `deploy.yml` and CI/credentials.
5. OpenSpec: this change deletes `specs/daily-reminder/` and modifies `user-settings`; archive `changes/fix-push-vapid-null-guard` as superseded.
6. Verify: full backend + frontend test suites green; grep shows no lingering reminder/push/vapid references; app boots and `/settings` renders the Schedule group only.

**Rollback:** revert the change commit. Because the migration drops tables, a rollback after deploy would recreate empty tables (data is not recoverable, which is acceptable given its disposable nature).

## Open Questions

- None blocking. (Polling-interval tuning is intentionally deferred to a separate change if ever wanted.)
