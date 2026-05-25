## 1. Backend — Best-streak service method

- [x] 1.1 Extend `app/services/streak_calculator.rb` with `.best_writing_streak(user)`
- [x] 1.2 Implementation: load all of the user's `DailyLog` rows ordered by `date` ascending, walk through them tracking the current run of consecutive `wrote = true` dates and the maximum seen
- [x] 1.3 A "consecutive run" is broken by either a missing day in the date sequence OR a row with `wrote = false`
- [x] 1.4 Include "today's still-active run" as a candidate for the maximum (no need to special-case — the walk does this naturally)

## 2. Backend — Best-streak tests

- [x] 2.1 Spec: brand-new user → 0
- [x] 2.2 Spec: a user with one wrote=true day → 1
- [x] 2.3 Spec: runs of length 3, 7, 2 with current run of 4 → 7
- [x] 2.4 Spec: a still-active run of 9 with prior best of 5 → 9
- [x] 2.5 Spec: a `wrote = false` row breaks a run that would otherwise span it
- [x] 2.6 Spec: a missing date in the middle of a run breaks it

## 3. Backend — History controller

- [x] 3.1 Create `HistoryController#show` requiring authentication
- [x] 3.2 Parse `month` param as `YYYY-MM`; reject malformed values with 422
- [x] 3.3 Reject months that are after the user's current month (computed from `Time::ForUser.today(user)`) with 422
- [x] 3.4 Compute month bounds: `month_start = Date.new(year, month, 1)`, `month_end = month_start.end_of_month`
- [x] 3.5 Fetch `current_user.daily_logs.where(date: month_start..month_end)`
- [x] 3.6 Fetch week logs whose 7-day span overlaps the month: `current_user.week_logs.where(week_start_date: (month_start - 6.days)..month_end)`
- [x] 3.7 Compute `writing_streak_current = StreakCalculator.writing_streak(current_user)`, `writing_streak_best = StreakCalculator.best_writing_streak(current_user)`, `publishing_streak_current = StreakCalculator.publishing_streak(current_user)`
- [x] 3.8 Render JSON: `{ month, daily_logs: [...], week_logs: [...], writing_streak_current, writing_streak_best, publishing_streak_current }`
- [x] 3.9 Route `GET /history` to the controller (`get '/history', to: 'history#show'`)
- [x] 3.10 Scope every fetch to `current_user`

## 4. Backend — History controller tests

- [x] 4.1 Request spec: authenticated current-month → 200, body shape, streaks present
- [x] 4.2 Request spec: authenticated past-month with mixed data → daily_logs and week_logs are filtered to that month
- [x] 4.3 Request spec: future-month → 422
- [x] 4.4 Request spec: malformed month string → 422
- [x] 4.5 Request spec: unauthenticated → 401
- [x] 4.6 Request spec: cross-user isolation
- [x] 4.7 Request spec: empty month (no rows) → arrays empty, streaks still present

## 5. Frontend — API helper & data hook

- [x] 5.1 `getHistory(month)` → `GET /history?month=YYYY-MM` with credentials, returns the bundled payload, throws on non-2xx
- [x] 5.2 `useHistory(month)` hook: fetches when `month` changes; exposes `{ data, status: 'idle' | 'loading' | 'ready' | 'error' }`
- [x] 5.3 `useCurrentMonth()` hook: derives the user's current `YYYY-MM` from `useTodayDate()` (introduced in `daily-check-in`); updates as date rolls over
- [x] 5.4 Date utilities: `monthBounds(month)`, `isFutureMonth(month, currentMonth)`

## 6. Frontend — History route shell

- [x] 6.1 Add `/history` route gated by `RequireAuth`
- [x] 6.2 Build `HistoryScreen` component: header ("The record." + "History."), then layout for chips, calendar, notes
- [x] 6.3 Manage `selectedMonth` state (default: `useCurrentMonth()`) and `selectedDay` state (default: today, falling back to first day of selectedMonth when selectedMonth is not the current month)
- [x] 6.4 Wire `useHistory(selectedMonth)` and pass data into the chips, calendar, and notes sections

## 7. Frontend — Streak chips

- [x] 7.1 Build `StreakChip` component with three style variants: neutral (Current, Best) and accent-filled (Published)
- [x] 7.2 Render three chips in the screen using `data.writing_streak_current` (days), `data.writing_streak_best` (days), `data.publishing_streak_current` (wks or cycles based on `useCurrentUser().settings.publishing_cadence`)
- [x] 7.3 Zero-pad numbers to 2 digits, render in mono font per design

## 8. Frontend — Calendar grid

- [x] 8.1 Build `CalendarMonth` component receiving `{ month, dailyLogs, weekLogs, weekStartsOn, selectedDay, onSelectDay, currentDay }`
- [x] 8.2 Compute the day-of-week header order from `weekStartsOn` (M T W T F S S vs S M T W T F S)
- [x] 8.3 Compute leading blanks: based on the first-of-month's weekday relative to `weekStartsOn`
- [x] 8.4 Compute trailing blanks to fill the final visible week
- [x] 8.5 Build a per-date map keyed by `YYYY-MM-DD` from `dailyLogs` and a per-week map keyed by `week_start_date` from `weekLogs`
- [x] 8.6 For each day cell, derive the visual state:
   - "wrote-in-published-week" if `dailyLogs[date]?.wrote === true && weekLogs[weekStartFor(date, weekStartsOn)]?.published === true`
   - "wrote" if `dailyLogs[date]?.wrote === true` (and not the above)
   - "no activity" otherwise
- [x] 8.7 Render each cell with the design's per-state styling (port from `docs/design/history.jsx`)
- [x] 8.8 Apply reduced opacity (per design) to future days within the current month
- [x] 8.9 Render the selection ring on the cell matching `selectedDay`
- [x] 8.10 On cell tap (only for non-blank cells), call `onSelectDay(date)`
- [x] 8.11 Render a legend below the grid with the three states

## 9. Frontend — Month navigation

- [x] 9.1 Render prev (‹) and next (›) buttons in the calendar header alongside the month label
- [x] 9.2 Disable the next button when `selectedMonth === useCurrentMonth()`
- [x] 9.3 On click, update `selectedMonth` and let `useHistory` re-fetch
- [x] 9.4 When the month changes, reset `selectedDay` to a sensible default (the current day if it's in the new month, else the first day of the new month with data, else the first day of the new month)

## 10. Frontend — Notes section

- [x] 10.1 Render the selected-day note: the date label and either the note text or "— no note —"
- [x] 10.2 Below it, render the recent-notes list: every `dailyLog` with a non-empty note, excluding the selected day, sorted by date descending
- [x] 10.3 Each list entry: `MMM DD` date label and the note text, separated visually per the design

## 11. Frontend — Tab bar update

- [x] 11.1 Update the tab-bar stub (introduced in `daily-check-in`) to include three tabs: Today, History, Settings
- [x] 11.2 Highlight the active tab based on `useLocation()` matching `/`, `/history`, or `/settings`
- [x] 11.3 Tap a tab → navigate to the corresponding route

## 12. Frontend — Tests

- [x] 12.1 Component test: `CalendarMonth` renders correct day-of-week heads for both `week_starts_on` values
- [x] 12.2 Component test: `CalendarMonth` derives correct cell states for a fixture set of daily/week logs
- [x] 12.3 Component test: tapping a day calls `onSelectDay` with the correct date
- [x] 12.4 Component test: `StreakChip` renders 2-digit zero-padded numbers and the correct unit
- [x] 12.5 Component test: Published chip shows "wks" for weekly cadence, "cycles" for biweekly
- [x] 12.6 Integration test: `HistoryScreen` fetches history, renders chips and calendar, prev/next navigation re-fetches, future-month next button is disabled
- [x] 12.7 Hook test: `useHistory` transitions through loading → ready states, surfaces errors
- [x] 12.8 Component test: notes list excludes the selected day and sorts by date descending

## 13. End-to-end verification (manual)

- [ ] 13.1 Sign in, populate the current month with a mix of wrote/published data via the rails console, navigate to `/history`
- [ ] 13.2 Confirm the chips show correct current/best/published values
- [ ] 13.3 Confirm cells render correctly: wrote (soft accent), wrote+published-week (deep accent ring), no activity (neutral)
- [ ] 13.4 Tap a day with a note → note shows below; tap a day without → "— no note —"
- [ ] 13.5 Confirm the recent-notes list appears, excludes the selected day, ordered descending by date
- [ ] 13.6 Click prev → previous month loads; click next repeatedly → eventually the next button is disabled at current month
- [ ] 13.7 Open `/settings`, change `Week starts on` → return to `/history` → confirm the calendar reflows (header order, leading-blank count)
- [ ] 13.8 Use the tab bar to navigate Today ↔ History ↔ Settings; active state always reflects the current route

## 14. Documentation

- [x] 14.1 In `backend/README.md`, document the `GET /history?month=YYYY-MM` endpoint: shape, future-month rejection, scoping
- [x] 14.2 Note the best-streak compute is on-demand and may be denormalized later if perf measurement justifies it
- [x] 14.3 In `frontend/README.md`, briefly document the `CalendarMonth` cell-state derivation rule so a future contributor can extend or modify it correctly
