## 1. Backend — Schema & model

- [x] 1.1 Generate migration creating `week_logs` with `user:references`, `week_start_date:date`, `published:boolean default false`
- [x] 1.2 Add unique composite index on `(user_id, week_start_date)` and an index on `user_id, week_start_date desc` for range queries
- [x] 1.3 Run migration; verify schema
- [x] 1.4 Add `WeekLog` model with `belongs_to :user`, validations (`week_start_date` present, `published` not null)
- [x] 1.5 Add `WeekLog.for(user:, week_start_date:)` returning the row or a new unpersisted instance with defaults

## 2. Backend — Time-for-user helper extension

- [x] 2.1 Extend the `Time::ForUser` module (introduced in `add-daily-check-in`) with `Time::ForUser.this_week_start(user)` returning a `Date`
- [x] 2.2 Implementation uses `Time::ForUser.today(user).beginning_of_week(user.week_starts_on == 0 ? :sunday : :monday)`
- [x] 2.3 Unit-test against fixed instants for: Monday-anchored user mid-week, Sunday-anchored user on Saturday, Sunday-anchored user on Sunday (returns same day), null-timezone user, around midnight in a non-UTC tz

## 3. Backend — Week logs controller

- [x] 3.1 Create `WeekLogsController` requiring authentication
- [x] 3.2 `#show` — accepts `:week_start_date`, returns the row's representation or default `{ week_start_date, published: false }`
- [x] 3.3 `#update` — accepts `:week_start_date` and a partial body `{ published? }`, validates `:week_start_date == Time::ForUser.this_week_start(current_user)`, finds-or-builds the row, applies changes, persists, returns 200 with the row
- [x] 3.4 Reject past or future week-start dates, or any date that isn't a valid week-start under the user's anchor, with 422 + error code `week_not_editable`
- [x] 3.5 `#index` — accepts `from` / `to` params, defaults `from = this_week_start − 12.weeks`, `to = this_week_start`, validates `from <= to` and `(to − from) <= 728 days`, returns the rows
- [x] 3.6 Routes: `resources :week_logs, param: :week_start_date, only: [:show, :update, :index]`
- [x] 3.7 Scope every query to `current_user.week_logs`

## 4. Backend — Tests

- [x] 4.1 Model spec: validations, uniqueness, defaults
- [x] 4.2 Helper spec: `Time::ForUser.this_week_start` across the scenarios in the spec file
- [x] 4.3 Request specs covering every scenario in `specs/weekly-publishing/spec.md`: current-week happy path, past/future rejection, mid-week date rejection, partial body, idempotent toggle, range index defaults and limits, cross-user isolation, unauthenticated 401

## 5. Frontend — API helpers & date utilities

- [x] 5.1 `getWeekLog(weekStartDate)` → `GET /week_logs/:week_start_date` with credentials
- [x] 5.2 `putWeekLog(weekStartDate, partial)` → `PUT /week_logs/:week_start_date`, returns updated row or throws on non-2xx
- [x] 5.3 `listWeekLogs({ from, to })` → `GET /week_logs` (used here for hydration; `history-view` will be the heavier consumer later)
- [x] 5.4 `useThisWeekStart()` hook: derives current `week_start_date` from `useCurrentUser().settings.timezone` + `week_starts_on` (with fallbacks); updates on focus and via 60-second interval — same shape as `useTodayDate()` from `daily-check-in`
- [x] 5.5 `weekStartFor(date, weekStartsOn, timezone)` pure utility used by both the hook and any range computation

## 6. Frontend — Weekly publish card

- [x] 6.1 Build `WeeklyPublishCard` component receiving `{ published, onToggle, error }` plus a reserved `weekStreak` prop (rendered as em-dash placeholder until `add-streaks` is wired up)
- [x] 6.2 Visual states port from `docs/design/today.jsx`: smaller padding/type than the daily card, `Tag tone="green|ink"`, `CheckCircle` size 48
- [x] 6.3 On tap, call parent's `onToggle(nextValue)`; parent owns the optimistic update + reconciliation
- [x] 6.4 Error state: when `error` is true, render an inline indicator beneath the card

## 7. Frontend — Today screen integration

- [x] 7.1 Update the `TodayScreen` component (introduced in `add-daily-check-in`) to insert the publish card between the writing card and the note card
- [x] 7.2 In the screen, fetch `getWeekLog(thisWeekStart)` on mount and on week-start rollover; maintain local state `{ published }` derived from the fetch
- [x] 7.3 `handlePublishToggle(next)`: optimistically update local state, fire `putWeekLog(thisWeekStart, { published: next })`, on success replace state with server's row, on error revert and set an error flag
- [x] 7.4 Coalesce rapid taps into a single in-flight request, queueing the latest value if a new tap occurs before resolution (mirror the daily-card pattern)

## 8. Frontend — Tests

- [x] 8.1 Component test: `WeeklyPublishCard` renders both visual states and emits `onToggle`
- [x] 8.2 Integration test: tapping the publish card optimistically flips state, calls `putWeekLog`, persists on success
- [x] 8.3 Integration test: failed PUT reverts the toggle and shows the error indicator
- [x] 8.4 Hook test: `useThisWeekStart()` returns correct date for Sunday-anchored and Monday-anchored users in a fixed timezone, and updates on focus

## 9. End-to-end verification (manual)

- [x] 9.1 Sign in, open `/`, see today + the publish card unchecked → tap → it stays checked → reload → still checked
- [x] 9.2 Tap to uncheck → reload → still unchecked
- [x] 9.3 Open `/settings`, change `Week starts on` to the opposite of current → return to `/` → confirm the card reflects the new week-start (may show as unchecked if the new windowed week has no row)
- [x] 9.4 With DevTools, simulate a slow network → tap card → verify optimistic flip + later confirm or revert
- [x] 9.5 Wait through (or fake the clock past) the user's week-start day at midnight and confirm the card resets within 60 seconds

## 10. Documentation

- [x] 10.1 In `backend/README.md`, document the `week_logs` API: endpoints, the current-week-only mutability rule, how week boundaries are derived from `week_starts_on`, the range index limits
- [x] 10.2 Add a note in the README clarifying that `WeekLog` rows are *not* re-aligned when a user changes `week_starts_on`, and that streak computation must be tolerant of slightly off-grid historical rows
- [x] 10.3 In `frontend/README.md`, note that `useThisWeekStart` and `useTodayDate` follow the same focus-+-interval refresh pattern, used by both check-in cards on `/`
