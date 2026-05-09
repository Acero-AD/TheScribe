## Why

Three later capabilities need configuration that's per-user but not per-event: `weekly-publishing` needs to know when a user's week starts, `daily-reminder` needs a fire time and a timezone, and `streaks` (specifically the publishing streak) needs to know whether the user is on a weekly or biweekly cadence. Without a settings layer, every one of those capabilities would either hardcode defaults or grow its own ad-hoc preference field. This change establishes a single, coherent place where user-level preferences live, owned by one capability.

This is the second V1 capability and depends on `account-access` (a `User` must exist).

## What Changes

- Extend the `User` model with four columns: `reminder_time` (HH:MM, nullable), `week_starts_on` (0=Sunday, 1=Monday; default 1), `publishing_cadence` (`weekly` | `biweekly`; default `weekly`), and `timezone` (IANA name, nullable until first save).
- Extend the existing `GET /me` endpoint to include a `settings` object with those four fields.
- New `PATCH /me/settings` endpoint accepting any subset of the four fields, validating, and returning the updated settings.
- New `/settings` screen on the frontend rendering grouped rows for "Reminders" (time only — the on/off toggle lands with `daily-reminder`) and "Schedule" (week start, publishing cadence).
- Frontend captures the user's IANA timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it silently on every settings PATCH so it stays current as the user travels.
- Auto-save on change for each row — no explicit "Save" button — matching the grouped-list pattern in the design.

## Capabilities

### New Capabilities
- `user-settings`: Per-user configuration that other capabilities consume. Owns reminder time-of-day, week-start day, publishing cadence, and detected timezone. Read via `/me`, written via `/me/settings`.

### Modified Capabilities
- `account-access`: `GET /me` response gains a `settings` sub-object. This is additive — existing `{ id, email }` fields remain unchanged — but the spec needs to reflect the new shape.

## Impact

- **Backend (`backend/`)**: One migration adding four columns to `users`; validations on the `User` model; one new controller action (`SettingsController#update` or `Me::SettingsController#update`); update the existing `SessionsController#show` (`GET /me`) to include settings; routes for `PATCH /me/settings`.
- **Frontend (`frontend/`)**: New `/settings` route, settings screen with three rows (time picker, week-start dropdown, cadence dropdown), API helper for `PATCH /me/settings`, timezone capture on PATCH, auto-save semantics with revert-on-error.
- **Out of scope**: daily-reminder push subscription management and the on/off toggle (lands with `add-daily-reminder`); CSV export and delete-all-data (V2 per the scope table); user-facing timezone selection (auto-detected).
- **Cross-cutting note**: Future capabilities will read these fields freely. They are the single source of truth — no capability should add its own duplicate preference column.
