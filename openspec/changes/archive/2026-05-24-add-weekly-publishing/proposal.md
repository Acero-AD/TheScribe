## Why

The product's second controllable input is "did I ship something this week?" — distinct from the daily writing check-in because publishing is heavier-cadence work that doesn't fit on a daily axis. Per `docs/scoreboard-app.md`, this gives the user a second honest signal alongside writing, and it feeds the publishing-streak counter that motivates consistent shipping. Without this capability, the Today screen has only half its check-ins and the publishing streak has no data to compute from.

This is the fourth V1 capability. It depends on `account-access` (a `User` must exist) and consumes `user-settings.timezone` and `user-settings.week_starts_on` to determine "this week."

## What Changes

- New `WeekLog` model with `user_id`, `week_start_date` (date — first day of the week in the user's anchor), `published` (boolean, default false). Unique on `(user_id, week_start_date)`.
- New `PUT /week_logs/:week_start_date` endpoint accepting `{ published?: boolean }`, idempotent, allowed only when `:week_start_date` matches the start of the user's current week (computed from `timezone` + `week_starts_on`).
- New `GET /week_logs/:week_start_date` returning the row or default values (`published: false`) if no row exists.
- New `GET /week_logs?from=&to=` returning rows in the date range — the read API `history-view` and `streaks` will rely on.
- New weekly publish card on the Today screen (`/`), sitting between the writing check-in card and the note card. Tap to toggle, optimistic update, mirrors the daily card's interaction patterns.
- A reserved slot for the week-streak number inside the card — populated empty until `add-streaks` lands.

## Capabilities

### New Capabilities
- `weekly-publishing`: Per-week record of whether the user published. Owns the `WeekLog` model, the week-level read/write API, and the publish check-in card on Today. Does **not** own the publishing-streak number or its biweekly interpretation — those live in `add-streaks`.

### Modified Capabilities
<!-- None — `daily-check-in`'s Today-screen requirement is additive and still accurate; this change adds a new requirement for the publish card on the same screen rather than rewriting the existing one. -->

## Impact

- **Backend (`backend/`)**: One migration creating `week_logs`; `WeekLog` model with validations; `WeekLogsController` with `show`, `update`, and `index` actions; routes for `/week_logs/:week_start_date` and `/week_logs`; an extension to the `Time::ForUser` helper (introduced by `daily-check-in`) adding `Time::ForUser.this_week_start(user)` that uses the user's `week_starts_on`.
- **Frontend (`frontend/`)**: New `WeeklyPublishCard` component on the Today screen; API helpers for the new endpoints; a `useThisWeekStart()` hook that derives the current week-start date from `useCurrentUser().settings`; the Today screen's vertical card stack is updated to include the publish card between the writing card and the note card.
- **Cross-cutting**: Establishes the contract `streaks` will read from for publishing — one row per user per week, queryable by date range.
- **Out of scope**: the publishing streak number itself and its weekly-vs-biweekly interpretation (lands with `add-streaks`); editing past weeks (read-only by design); calendar markers for published weeks (lands with `add-history-view`).
