## 1. Backend — Schema & model

- [x] 1.1 Generate migration creating `daily_logs` with `user:references`, `date:date`, `wrote:boolean default false`, `wrote_at:datetime`, `note:text`
- [x] 1.2 Add unique composite index on `(user_id, date)` and a non-unique index on `user_id, date desc` for range queries
- [x] 1.3 Run migration; verify schema
- [x] 1.4 Add `DailyLog` model with `belongs_to :user`, validations (date present, wrote present), and `note` allowed nil
- [x] 1.5 Add an instance method `DailyLog#mark_wrote!(value)` that toggles `wrote` and sets/clears `wrote_at` atomically
- [x] 1.6 Add a class method `DailyLog.for(user:, date:)` returning the row or a new unpersisted instance with defaults

## 2. Backend — Time-for-user helper

- [x] 2.1 Add `Time::ForUser.today(user)` returning a `Date` in the user's `timezone` (fallback `Time.zone` / UTC if `timezone` is null)
- [x] 2.2 Unit-test against fixed instants and several timezones, including a 23:30 NY-local test crossing midnight

## 3. Backend — Daily logs controller

- [x] 3.1 Create `DailyLogsController` requiring authentication
- [x] 3.2 `#show` — accepts `:date`, returns the row's representation or default `{ date, wrote: false, wrote_at: null, note: null }`
- [x] 3.3 `#update` — accepts `:date` and a partial body `{ wrote?, note? }`, validates `:date == Time::ForUser.today(current_user)`, finds-or-builds the row, applies changes, persists, returns 200 with the row
- [x] 3.4 In `#update`, when `wrote` flips true→false set `wrote_at = nil`; when false→true set `wrote_at = Time.current`; when unchanged, leave alone
- [x] 3.5 In `#update`, normalize blank string note to `nil` before persisting
- [x] 3.6 Past or future dates (relative to user's today) → 422 with a clear error code (`date_not_editable`)
- [x] 3.7 `#index` — accepts `from` / `to` params, defaults `from = today − 90`, `to = today`, validates `from <= to` and `(to − from) <= 366`, returns `[{...}]`
- [x] 3.8 Routes: `resources :daily_logs, param: :date, only: [:show, :update, :index]` (PUT only — disable PATCH alias if Rails generates both)
- [x] 3.9 Scope every query to `current_user.daily_logs`

## 4. Backend — Tests

- [x] 4.1 Model spec: validations, uniqueness, `mark_wrote!` semantics
- [x] 4.2 Helper spec: `Time::ForUser.today` across timezones, around midnight, with null timezone
- [x] 4.3 Request specs covering every scenario in `specs/daily-check-in/spec.md`: today happy path, past-date rejection, future-date rejection, partial body, idempotent toggle, note normalization, range index defaults and limits, cross-user isolation, unauthenticated 401

## 5. Frontend — API helpers & date utilities

- [x] 5.1 `getDailyLog(date)` → `GET /daily_logs/:date` with credentials
- [x] 5.2 `putDailyLog(date, partial)` → `PUT /daily_logs/:date` with credentials, returns updated row or throws on non-2xx
- [x] 5.3 `listDailyLogs({ from, to })` → `GET /daily_logs` (used here for hydration; `history-view` will be the heavier consumer later)
- [x] 5.4 `useTodayDate()` hook: derives today's `YYYY-MM-DD` from `useCurrentUser().settings.timezone` (fallback `Intl` detection); exposes a value that updates on window focus and via a 60-second interval
- [x] 5.5 `formatTimeOfDay(date, timezone)` utility that formats `HH:MM` in the user's tz for the "Logged · 9:14" label

## 6. Frontend — Today route shell

- [ ] 6.1 Add `/` route gated by `RequireAuth`
- [ ] 6.2 Build a `TodayScreen` component with a date header (formatted `MON · APR 28 · 2026` style per design), an "Today." headline, and a vertical stack slot for cards
- [ ] 6.3 Stub the bottom tab bar with `Today` and `Settings` links (no `History` until that capability lands)
- [ ] 6.4 Port the warm-tone shared styles (`SB.*`, `SBfont.*`) from `docs/design/today.jsx` into the frontend's style tokens

## 7. Frontend — Writing check-in card

- [ ] 7.1 Build `WritingCheckInCard` component receiving `{ wrote, wroteAt, onToggle, error }`
- [ ] 7.2 Visual states: unchecked (surface bg, ink text), checked (accent bg, white text); transition with `cubic-bezier(.2,.7,.3,1)` per design
- [ ] 7.3 Reserve a streak slot (large display number) that renders an em-dash placeholder for now — `add-streaks` will populate it
- [ ] 7.4 "Logged · HH:MM" label rendered when checked, using `formatTimeOfDay(wroteAt, timezone)`
- [ ] 7.5 On tap, call parent's `onToggle(nextValue)`; parent owns the optimistic update + reconciliation
- [ ] 7.6 Error state: when `error` is true, render an inline indicator beneath the card (compact, accessible)

## 8. Frontend — Optimistic toggle plumbing

- [ ] 8.1 In `TodayScreen`, fetch `getDailyLog(today)` on mount and on `today` rollover
- [ ] 8.2 Maintain local state `{ wrote, wroteAt, note }` derived from the fetch
- [ ] 8.3 `handleToggle(next)`: optimistically update local state, fire `putDailyLog(today, { wrote: next })`, on success replace local state with server's row, on error revert to prior state and set an error flag
- [ ] 8.4 Coalesce rapid taps so only one in-flight request exists at a time; if a second tap occurs before the first resolves, queue the latest value and fire after resolution

## 9. Frontend — Note card

- [ ] 9.1 Build `NoteCard` component with a textarea, label "Today's note · optional", placeholder "What did you write about?"
- [ ] 9.2 Initialize textarea value from local `note` state
- [ ] 9.3 On `blur`, if the current value differs from the last persisted value, call `putDailyLog(today, { note: value })`
- [ ] 9.4 On success, update last-persisted reference; on error, keep the textarea content and render an inline error with a retry control
- [ ] 9.5 Empty string is allowed and clears the note (server normalizes to null)

## 10. Frontend — Tests

- [ ] 10.1 Component test: `WritingCheckInCard` renders both visual states and emits `onToggle` on click
- [ ] 10.2 Integration test: tapping the card optimistically flips state, calls `putDailyLog`, persists on success
- [ ] 10.3 Integration test: failed PUT reverts the toggle state and shows the error indicator
- [ ] 10.4 Integration test: typing into the note and blurring fires one PUT; blurring without changes fires nothing
- [ ] 10.5 Integration test: clearing the note value and blurring fires PUT with `{ note: "" }`
- [ ] 10.6 Hook test: `useTodayDate()` updates on focus and interval given a fixed timezone

## 11. End-to-end verification (manual)

- [ ] 11.1 Sign in, open `/`, see today's date with no check-in → tap card → it stays checked → reload → still checked
- [ ] 11.2 Tap to uncheck → reload → still unchecked
- [ ] 11.3 Type a note, click outside the textarea, reload → note persists
- [ ] 11.4 Clear the note, blur, reload → empty
- [ ] 11.5 Use DevTools to artificially slow the network → tap card → verify optimistic flip + later confirm or revert (test both)
- [ ] 11.6 Set the system clock forward past midnight (or wait through one) and confirm the date header rolls and the card resets

## 12. Documentation

- [x] 12.1 In `backend/README.md`, document the `daily_logs` API: endpoints, idempotency, the today-only mutability rule, and the range index limits
- [ ] 12.2 In `frontend/README.md`, document the optimistic-toggle pattern and the note-on-blur autosave so later contributors can mirror it for `weekly-publishing`
