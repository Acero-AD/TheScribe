## Context

`account-access` already exists; a `User` row anchors all per-user data. Three V1 capabilities (`weekly-publishing`, `streaks`, `daily-reminder`) and one V2 capability (`weekly-reflection`) need stable, per-user configuration: when does the user's week start, are they publishing weekly or biweekly, what time do they want a reminder, and what timezone are they in. Building a real Settings layer now avoids each later capability sprouting its own preference field.

The Settings screen design (`docs/design/settings.jsx`) is a grouped list with three groups — Reminders, Schedule, Data. This change ships the Reminders (time only) and Schedule rows. The Data group (Export, Delete-all) is V2 per the scope table and stays out.

## Goals / Non-Goals

**Goals:**
- One canonical home for user-level preferences — every later capability reads from here.
- Read-once on app load (`GET /me` includes settings) so screens that need a setting don't pay a roundtrip.
- Auto-save UX that matches the grouped-list visual language — change a row, it sticks.
- Timezone tracked accurately without bothering the user to pick one.

**Non-Goals:**
- Daily-reminder enabled/disabled toggle and push subscription management — owned by `add-daily-reminder`. Whether reminders fire is determined by "does the user have a valid push subscription," not by a stored boolean here.
- CSV export and delete-all-data — V2 per the scope table.
- A user-facing timezone selector — auto-detected from the browser.
- A Save button or dirty-state indicator — auto-save handles this.
- Server-side push of settings changes (e.g., via WebSocket) — single-device assumption is fine for v1.

## Decisions

### 1. Columns on `users`, not a separate `Settings` model

**Choice:** Add `reminder_time`, `week_starts_on`, `publishing_cadence`, `timezone` directly to the `users` table.
**Why:** The relationship is strictly 1:1, the fields are small and stable, and there's no history requirement. A separate model would be ceremony without payoff.
**Alternative considered:** A `UserSettings` table with `user_id` foreign key. Rejected — only useful if settings could be missing or versioned, neither of which applies.

### 2. Read via `/me`, write via `/me/settings`

**Choice:** `GET /me` returns `{ id, email, settings: { ... } }`. Writes go to `PATCH /me/settings`.
**Why:** Reads are cheap and frequent (every app load), so bundling settings into `/me` saves a roundtrip. Writes are infrequent and benefit from a focused endpoint with validation scoped only to settings fields.
**Alternative considered:** `PATCH /me` accepting both identity and settings fields. Rejected — couples concerns and makes future identity fields (e.g., display name) muddier.

### 3. Auto-save on change, revert on error

**Choice:** Each row PATCHes the moment the user changes it. On 200, the new value sticks. On error, the UI reverts to the prior value and shows an inline message.
**Why:** Matches the grouped-list pattern from the design (no Save button on screen). The product's whole ethos is "frictionless" — explicit save buttons in a 3-field form would feel heavy.
**Trade-off:** A flaky network can produce mid-edit churn. Mitigation: the UI reverts cleanly, and the values being edited are tiny (a time, two enums) so retry cost is negligible.

### 4. Timezone is auto-detected and sent silently with each PATCH

**Choice:** The frontend reads `Intl.DateTimeFormat().resolvedOptions().timeZone` and includes it in every `PATCH /me/settings` body, even when the user is just changing the cadence dropdown.
**Why:** A user who travels naturally updates their timezone the next time they touch settings. The reminder fires at "20:00 wherever I am now" — the obviously-right behavior. No timezone picker UI to design or maintain.
**Trade-off:** A user who never opens settings after first sign-in won't have their timezone updated if they move. Acceptable — and we can later choose to also capture timezone on `/me` reads if it proves to drift.

### 5. Reminder time stored as a local HH:MM string, not as a UTC instant

**Choice:** Store `reminder_time` as a string like `"20:00"` interpreted in the user's `timezone`. The reminder job (later, in `daily-reminder`) computes the UTC fire time per user from those two fields.
**Why:** Storing UTC means DST transitions silently shift the user's reminder by an hour. Storing local + IANA TZ rolls naturally with DST. IANA names handle every transition rule automatically.
**Alternative considered:** Store `reminder_time` as `time` type and a fixed UTC offset. Rejected — fragile across DST and manual to handle.

### 6. Validation: enums + format checks

**Choice:**
- `week_starts_on` ∈ {0, 1}.
- `publishing_cadence` ∈ {`weekly`, `biweekly`}.
- `reminder_time` matches `^([01]\d|2[0-3]):[0-5]\d$` or is null.
- `timezone` is a valid IANA name (validated against `ActiveSupport::TimeZone::MAPPING` keys or `tzinfo`).

PATCH validates only the fields supplied; missing fields are not changed.

## Risks / Trade-offs

- **Auto-save flicker on flaky network** → revert on error is fine, but rapid toggling could churn requests. Mitigation: simple debounce on the time picker (200ms) and rely on dropdown changes being discrete.
- **Timezone drift if user never re-opens settings after moving** → acceptable for v1; revisit if support requests come in. Could later also send `timezone` on every authenticated request for passive update.
- **Bi-weekly cadence semantics underspecified here** → this change stores the value but doesn't define what "biweekly" *means* (which weeks count). That's `weekly-publishing`'s problem to resolve. Flag below in Open Questions.
- **DST transition the day a user changes their reminder time** → local HH:MM + IANA TZ handles it correctly; the only edge is the spring-forward hour that doesn't exist (e.g., 02:30 on a "spring forward" day). Reject `reminder_time` values inside the skipped hour? Probably overkill — defer to `daily-reminder`'s job logic, which can handle by firing at the next valid instant.

## Migration Plan

Single Rails migration adding the four columns to `users`. Defaults: `week_starts_on: 1`, `publishing_cadence: 'weekly'`, `reminder_time: nil`, `timezone: nil`. No backfill needed — existing users (if any) get defaults. No rollback complications.

## Open Questions

- **Biweekly cadence semantics** — when `weekly-publishing` is built, decide: does the publish-streak window align with even/odd ISO weeks? With the user's signup week parity? Out of scope here, but flag at the top of that change's design.
- **Should `/me` calls passively refresh `timezone`?** Defer until we see whether timezone drift is an actual problem.
- **Save indicator on auto-save?** UI polish call — probably none for v1; the row visually committing is enough feedback.
