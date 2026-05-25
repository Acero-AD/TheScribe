# history-view Specification

## Purpose
The History screen at `/history`, the bundled `GET /history?month=YYYY-MM` endpoint, and the `best_writing_streak` computation. Owns the calendar visual contract (one of three states per day cell) and the read composition that drives it. Does not own data persistence — purely a read-side composer over `daily-check-in` and `weekly-publishing` that surfaces the user's history at month resolution with read-only past entries.

## Requirements

### Requirement: Backend SHALL compute the user's best writing streak

The backend SHALL provide a service that returns the user's best (longest-ever) writing streak as a non-negative integer. The best streak SHALL be defined as the maximum length, over all the user's history, of any contiguous run of dates where every date has a `DailyLog` with `wrote = true`. The current streak (still in progress) SHALL be a candidate for the best — i.e., today's run counts toward "best" if it is longer than any prior completed run.

#### Scenario: A user with multiple historical runs
- **WHEN** the user has runs of consecutive `wrote = true` dates of lengths 3, 7, 2, and a current run of 4
- **THEN** the best writing streak is 7

#### Scenario: A user whose current run is the longest
- **WHEN** the user has a prior best run of 5 and a current still-active run of 9
- **THEN** the best writing streak is 9

#### Scenario: A brand-new user
- **WHEN** the user has no `DailyLog` rows
- **THEN** the best writing streak is 0

#### Scenario: A user with one wrote=true day
- **WHEN** the user has exactly one `DailyLog` with `wrote = true` and no others
- **THEN** the best writing streak is 1

#### Scenario: Toggled-off days do not count
- **WHEN** the user has a `DailyLog` row with `wrote = false`, surrounded by `wrote = true` days on each side
- **THEN** the run is broken at that day; the best streak does not bridge across it

### Requirement: Backend SHALL serve a bundled history endpoint

The backend SHALL accept `GET /history?month=YYYY-MM` for authenticated users. The response SHALL be 200 with a JSON body containing the requested month string, the user's `DailyLog` rows whose `date` falls within that month, the user's `WeekLog` rows whose `week_start_date` is within (or whose 7-day span overlaps) that month, the user's `writing_streak_current`, the user's `writing_streak_best`, and the user's `publishing_streak_current` respecting their `publishing_cadence`. Future months SHALL respond 422.

#### Scenario: Authenticated user requests current month
- **WHEN** an authenticated user GETs `/history?month=<current-month>`
- **THEN** the response is 200 with the bundled body and the streak numbers reflect the user's current state

#### Scenario: Authenticated user requests a past month
- **WHEN** an authenticated user GETs `/history?month=2025-12`
- **THEN** the response is 200 with rows from December 2025 and the current streak numbers (which describe "now," not December)

#### Scenario: Future month is rejected
- **WHEN** the user GETs `/history?month=<future-month>`
- **THEN** the backend responds 422

#### Scenario: Malformed month parameter
- **WHEN** the user GETs `/history?month=2026-13` or `/history?month=foo`
- **THEN** the backend responds 422

#### Scenario: Unauthenticated request
- **WHEN** any unauthenticated client requests `/history?month=...`
- **THEN** the backend responds 401

#### Scenario: Empty month
- **WHEN** the user GETs a month with no logged activity
- **THEN** `daily_logs` and `week_logs` arrays are empty and the streak numbers are still included

### Requirement: Backend SHALL scope all history reads to the current user

The bundled history endpoint SHALL only return rows belonging to the authenticated user. Cross-user reads SHALL be impossible.

#### Scenario: User A queries history
- **WHEN** user A GETs `/history?month=...` and user B has rows in that month
- **THEN** user A's response includes only user A's rows

### Requirement: Frontend SHALL host the History screen at /history

The frontend SHALL provide a `/history` route gated by `RequireAuth`. The screen SHALL render a header, three streak chips, a calendar grid for the selected month, prev/next month controls, an inline note for the selected day, and a list of other notes from days in the visible month that have non-empty notes. The default month on first navigation SHALL be the user's current month (in their timezone).

#### Scenario: Authenticated user opens /history
- **WHEN** an authenticated user navigates to `/history`
- **THEN** the History screen renders with the current month pre-selected

#### Scenario: Unauthenticated user opens /history
- **WHEN** an unauthenticated user navigates to `/history`
- **THEN** the user is redirected to `/sign-in`

### Requirement: Frontend SHALL render three streak chips at the top of the History screen

The frontend SHALL render three chips at the top of `/history`: a "Current" chip showing `writing_streak_current` with the unit "days," a "Best" chip showing `writing_streak_best` with the unit "days," and a "Published" chip showing `publishing_streak_current`. The Published chip's unit SHALL be "wks" for users whose `publishing_cadence` is `weekly` and "cycles" for users whose `publishing_cadence` is `biweekly`.

#### Scenario: Weekly user sees published wks
- **WHEN** the user has `publishing_cadence: weekly` and `publishing_streak_current: 3`
- **THEN** the Published chip shows "03 wks"

#### Scenario: Biweekly user sees published cycles
- **WHEN** the user has `publishing_cadence: biweekly` and `publishing_streak_current: 2`
- **THEN** the Published chip shows "02 cycles"

#### Scenario: Brand-new user
- **WHEN** the user has no logged activity
- **THEN** all three chips render zero values

### Requirement: Frontend SHALL render a month-keyed calendar grid respecting week_starts_on

The frontend SHALL render the calendar grid for the selected month with day-of-week headers and day cells anchored to the user's `week_starts_on`. The grid SHALL begin with leading blank cells representing days from the previous month that fall in the first visible week, then 28-31 day cells for the month, then trailing blank cells filling the final visible week. The number of week rows SHALL be the minimum needed to fit the month (typically 5 or 6).

#### Scenario: Monday-anchored user, April 2026 (starts Wednesday)
- **WHEN** the user has `week_starts_on: 1` and the displayed month is April 2026
- **THEN** the day-of-week header reads "M T W T F S S" and the first row has 2 leading blanks before April 1

#### Scenario: Sunday-anchored user, April 2026
- **WHEN** the user has `week_starts_on: 0` and the displayed month is April 2026
- **THEN** the day-of-week header reads "S M T W T F S" and the first row has 3 leading blanks before April 1

#### Scenario: User changes week_starts_on while on /history
- **WHEN** the user changes `week_starts_on` in `/settings` and returns to `/history`
- **THEN** the calendar grid reflows to the new anchor on next render

### Requirement: Frontend SHALL render each day cell in one of three visual states

The frontend SHALL render each day cell in exactly one of these states:
- **No activity**: no `DailyLog` for that date in the response, OR a row with `wrote = false`.
- **Wrote**: `DailyLog.wrote = true` for that date AND the `WeekLog` covering that date does not have `published = true`.
- **Wrote in published week**: `DailyLog.wrote = true` for that date AND the `WeekLog` covering that date has `published = true`.

The legend below the calendar SHALL show all three states with their visual treatments.

#### Scenario: A wrote day in a published week
- **WHEN** April 8 has `wrote = true` and the `WeekLog` for the week containing April 8 has `published = true`
- **THEN** the cell for April 8 renders in the "Wrote in published week" state

#### Scenario: A wrote day in an unpublished week
- **WHEN** April 9 has `wrote = true` and no `WeekLog` row exists (or `published = false`) for that week
- **THEN** the cell for April 9 renders in the "Wrote" state

#### Scenario: A non-wrote day in a published week
- **WHEN** April 10 has no `DailyLog` row (or `wrote = false`), but the `WeekLog` for that week has `published = true`
- **THEN** the cell for April 10 renders in the "No activity" state — the publish indicator does not transfer to days with no writing

#### Scenario: A future day within the current month
- **WHEN** the calendar shows the current month and the day cell is for a date that has not yet occurred
- **THEN** the cell renders in the "No activity" state with reduced opacity (per the design's faded treatment)

### Requirement: Frontend SHALL allow selecting a day and SHALL show its note inline

The frontend SHALL allow the user to tap any day cell with data (any non-blank cell). The tapped day SHALL become the selected day, the cell SHALL receive a visual selection indicator (e.g., an inset ring), and the area beneath the calendar SHALL render: the date label and either the day's `note` text or the placeholder "— no note —" if `note` is null or empty.

#### Scenario: Tapping a day with a note
- **WHEN** the user taps April 18 and that day's `DailyLog.note` is "Started the essay on content and analysis paralysis"
- **THEN** the area below the calendar shows "April 18" and the note text

#### Scenario: Tapping a day without a note
- **WHEN** the user taps a day whose `DailyLog` exists with no note (or no row at all)
- **THEN** the area below the calendar shows the date label and "— no note —"

#### Scenario: Selection persists within the month view
- **WHEN** the user has a day selected and the data refreshes (e.g., on focus return)
- **THEN** the selection remains on that day

### Requirement: Frontend SHALL render a recent-notes list below the selected day's note

The frontend SHALL list, beneath the selected-day note, every other day in the visible month that has a non-empty note. Each entry SHALL show the abbreviated date label (e.g., "APR 19") and the note text. The currently selected day SHALL be excluded from the list. Order SHALL be by date descending.

#### Scenario: Multiple notes in the month
- **WHEN** the visible month has notes on April 18 (selected), 19, 21, 23
- **THEN** the recent-notes list contains entries for April 23, 21, 19 (in that order) and excludes April 18

#### Scenario: Only the selected day has a note
- **WHEN** the visible month has a note only on the selected day
- **THEN** the recent-notes list is empty (no list section is rendered or it appears empty)

### Requirement: Frontend SHALL forbid editing past entries from the History screen

The frontend SHALL not present any control on `/history` that mutates `DailyLog` or `WeekLog` rows. Tapping a day SHALL only select; there SHALL be no toggle, textarea, save button, or any other affordance that would write data.

#### Scenario: Tapping a past day
- **WHEN** the user taps a day from a previous month (or any past date)
- **THEN** the day is selected and the note is displayed; no edit controls appear

#### Scenario: Tapping the current day
- **WHEN** the user taps today on the History calendar
- **THEN** the day is selected and the current note (if any) is displayed read-only; the user must navigate to `/` to edit

### Requirement: Frontend SHALL provide month navigation with the next button disabled at the current month

The frontend SHALL provide prev and next month buttons. The prev button SHALL always be enabled. The next button SHALL be disabled when the displayed month equals the user's current month (in their timezone). Clicking prev or next SHALL fetch `GET /history?month=<new-month>` and re-render with the new data.

#### Scenario: Navigating to the previous month
- **WHEN** the user clicks the prev button
- **THEN** the previous month is fetched and displayed, with the current month still navigable via the next button

#### Scenario: Next is disabled at current month
- **WHEN** the displayed month is the user's current month
- **THEN** the next button is rendered in a disabled state and clicks do nothing

#### Scenario: Far-past month
- **WHEN** the user navigates many months back to a month before any of their data
- **THEN** the response is 200 with empty arrays and the screen renders an empty calendar (no error)

### Requirement: Frontend SHALL add a History tab to the bottom tab bar

The frontend's bottom tab bar (introduced as a stub by `daily-check-in`) SHALL include a "History" entry that links to `/history`. The active tab SHALL be reflected visually based on the current route.

#### Scenario: User on /
- **WHEN** the user is on `/`
- **THEN** the Today tab is active and the History tab is inactive

#### Scenario: User on /history
- **WHEN** the user is on `/history`
- **THEN** the History tab is active and the Today tab is inactive

#### Scenario: Tapping the History tab
- **WHEN** the user taps the History tab from `/`
- **THEN** the app navigates to `/history`
