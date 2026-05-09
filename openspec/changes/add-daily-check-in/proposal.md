## Why

The daily writing check-in is the heartbeat of the product. The whole point of Scoreboard, per `docs/scoreboard-app.md`, is "you only measure what you control" — and "did I write today?" is the single most important controllable signal. Without this capability, none of the streak math, none of the calendar history, and none of the reminders have anything to operate on.

This is the third V1 capability. It depends on `account-access` (a `User` must exist) and consumes `user-settings.timezone` to determine "today."

## What Changes

- New `DailyLog` model with `user_id`, `date` (YYYY-MM-DD), `wrote` (boolean), `wrote_at` (datetime, nullable), `note` (text, nullable). Unique on `(user_id, date)`.
- New `PUT /daily_logs/:date` endpoint accepting a partial body `{ wrote?, note? }`, idempotent, allowed only when `:date` matches the user's "today" in their `timezone` setting.
- New `GET /daily_logs/:date` returning the row for that date, or default values (`wrote: false, note: null`) if no row exists.
- New `GET /daily_logs?from=&to=` returning an array of rows in the date range — the read API later capabilities (history, streaks) will lean on.
- New Today screen at `/` for authenticated users, with a date header, a writing check-in card (tap to toggle), and a note card (textarea, auto-saves on blur).
- Tap-to-toggle is optimistic on the frontend — UI updates immediately, then reconciles with the server response.

## Capabilities

### New Capabilities
- `daily-check-in`: Per-day record of whether the user wrote, plus an optional one-line note. Owns the `DailyLog` model and the day-level read/write API. Establishes the `/` (Today) route on the frontend.

### Modified Capabilities
<!-- None — `streaks` will later add a `writing_streak` field to the daily-log response, but that's owned by that future change. -->

## Impact

- **Backend (`backend/`)**: One migration creating `daily_logs`; `DailyLog` model with validations; `DailyLogsController` with `show`, `update`, and `index` actions; routes for `/daily_logs/:date` and `/daily_logs`; a small `Time::ForUser` helper that resolves "today" given a `User` and the current instant.
- **Frontend (`frontend/`)**: New `/` route hosting the Today screen; a `WritingCheckInCard` component (toggle, optimistic update, displays the date); a `NoteCard` component (autosave-on-blur textarea); API helpers for the three new endpoints; date utilities that compute "today" in the user's timezone from `useCurrentUser().settings`.
- **Cross-cutting**: Establishes the `/` route as a composition surface — `weekly-publishing`, `streaks`, and (later) parts of `history-view` will add their widgets to this same screen.
- **Out of scope**: streak number display inside the writing card (the slot is reserved but populated empty until `add-streaks` lands); editing past entries (read-only past dates by design); calendar/history view (lands with `add-history-view`); the weekly-publish card on the same screen (lands with `add-weekly-publishing`).
