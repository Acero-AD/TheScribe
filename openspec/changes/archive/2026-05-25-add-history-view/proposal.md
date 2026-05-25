## Why

Per `docs/scoreboard-app.md`: "A visible history of effort that compounds into motivation over time." Today, the user can check in but can't *see* the record they're building. Without history, the streak number is the only feedback signal, which is high-information but low-emotional. The calendar grid — and the inline notes from past days — turns the abstract "I have a 12-day streak" into a concrete, scrollable record.

This is the sixth V1 capability. It depends on `account-access` (auth), `daily-check-in` (DailyLog data and notes), `weekly-publishing` (WeekLog data), and `user-settings` (week_starts_on for calendar grid orientation, timezone for "today" boundary). It composes data from those capabilities; it does not produce new persisted state.

## What Changes

- New `GET /history?month=YYYY-MM` endpoint that bundles, for the requested month: the user's daily logs whose `date` falls in the month, the user's week logs whose `week_start_date` overlaps the month, the user's current writing streak, the user's best (longest-ever) writing streak, and the user's current publishing streak.
- New backend computation: `StreakCalculator.best_writing_streak(user)` — scans all DailyLog rows once and returns the longest-ever run of consecutive `wrote = true` dates.
- New `/history` route on the frontend gated by `RequireAuth`, rendering: a header, three streak chips (Current days / Best days / Published wks), a month-keyed calendar grid that respects `week_starts_on`, prev/next month navigation (next disabled when at the current month), a selected-day inline note, and a recent-notes list.
- Calendar visual states per day cell: "no activity" (no row or `wrote = false`), "wrote" (`wrote = true`, week not published), "wrote in published week" (`wrote = true` AND that week's `published = true`).
- Tab bar (introduced in `daily-check-in`) gains a "History" entry linking to `/history`.
- Past entries SHALL be read-only; tapping a day on the calendar selects it and shows its note (or "— no note —") but never offers an edit affordance.

## Capabilities

### New Capabilities
- `history-view`: The History screen at `/history`, the bundled `GET /history` endpoint, and the new `best_writing_streak` computation. Owns the calendar visual contract (states per day cell) and the read composition that drives it. Does not own data persistence — purely a read-side composer over `daily-check-in` and `weekly-publishing`.

### Modified Capabilities
<!-- None. The "best writing streak" computation conceptually extends the streaks capability, but since add-streaks is not yet archived, the requirement lives under history-view here for self-containment. It can be migrated to the streaks spec if/when both are archived and a refactor is desired. -->

## Impact

- **Backend (`backend/`)**: New `HistoryController#show` action; new route `GET /history?month=YYYY-MM`; one new service method `StreakCalculator.best_writing_streak(user)` (extends the service introduced by `add-streaks`); model tests covering best-streak edge cases; controller tests for the bundled response shape.
- **Frontend (`frontend/`)**: New `/history` route; `HistoryScreen` component composed of a header, streak-chips row, calendar grid, and notes section; calendar grid component (`CalendarMonth`) that takes daily-log/week-log data and a `week_starts_on` value; month navigation; `useHistory(month)` hook fetching the bundled endpoint; tab bar updated to include a "History" entry.
- **Cross-cutting**: This is the first screen that *only reads* — no writes, no toggles. It establishes the read-composition pattern for any future read-heavy screens.
- **Out of scope**: best publishing streak (design only shows best for writing); historical reflection viewing (lands with `weekly-reflection`, V2); editing past entries (read-only by design); "streak at risk" visual indicators; export of history (V2 CSV export); month navigation past the current month.
