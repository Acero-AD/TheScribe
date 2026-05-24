## 1. Backend — Schema & model

- [x] 1.1 Generate migration adding `reminder_time:string`, `week_starts_on:integer` (default 1), `publishing_cadence:string` (default 'weekly'), `timezone:string` to `users`
- [x] 1.2 Run migration; verify defaults apply to existing users (if any)
- [x] 1.3 Add `User` validations: `week_starts_on` ∈ {0,1}, `publishing_cadence` ∈ {`weekly`,`biweekly`}, `reminder_time` matches `^([01]\d|2[0-3]):[0-5]\d$` or nil, `timezone` is in `ActiveSupport::TimeZone::MAPPING.values` or recognized by `tzinfo` (or nil)
- [x] 1.4 Add a `User#settings_attributes` helper returning the four fields as a hash, used by serializers

## 2. Backend — /me endpoint update

- [x] 2.1 Update `SessionsController#show` (`GET /me`) to include `settings: user.settings_attributes` in the response body
- [x] 2.2 Update existing `/me` request specs from `add-account-access` to assert the new `settings` shape
- [x] 2.3 Confirm unauthenticated `/me` still returns 401 (regression check)

## 3. Backend — Settings update endpoint

- [x] 3.1 Create `Me::SettingsController#update` (or equivalent) accepting a JSON body with any subset of the four fields
- [x] 3.2 Strong params permit only the four field names; reject unknown keys silently or with 400 (pick one and document)
- [x] 3.3 Validate atomically — if any field fails, the whole request returns 422 and no field is updated
- [x] 3.4 Respond 200 with the full updated settings object on success
- [x] 3.5 Route `PATCH /me/settings` to the controller; require authentication
- [x] 3.6 Request specs covering: single-field update, multi-field update, empty body, invalid field, mixed valid+invalid (transactional rollback), unauthenticated

## 4. Backend — Tests

- [x] 4.1 Model spec: validations for each settings field, including null cases for `reminder_time` and `timezone`
- [x] 4.2 Controller spec: each scenario from `specs/user-settings/spec.md`
- [x] 4.3 Confirm `User` factory or fixtures default to sensible values

## 5. Frontend — Plumbing

- [x] 5.1 Extend the `useCurrentUser` hook (from `account-access`) to also expose `settings` from the `/me` response
- [x] 5.2 Add an API helper `patchSettings(partial)` that posts to `PATCH /me/settings` with `credentials: 'include'`, returning the updated settings or throwing on non-2xx
- [x] 5.3 Add a `detectTimezone()` utility wrapping `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [x] 5.4 In every `patchSettings` call, automatically merge the detected timezone into the body

## 6. Frontend — Settings screen scaffolding

- [x] 6.1 Add `/settings` route, gated by `RequireAuth`
- [x] 6.2 Build `SettingsGroup`, `SettingsRow`, `Pill`, and (for later) `Toggle` components — port styles from `docs/design/settings.jsx`
- [x] 6.3 Render the "Reminders" group with the Time row only (the `Daily reminder` toggle row stays hidden until `add-daily-reminder`)
- [x] 6.4 Render the "Schedule" group with the Week-start row and Publishing-cadence row

## 7. Frontend — Auto-save behavior

- [x] 7.1 Implement an `useAutoSaveField` hook: takes initial value, returns `[displayed, setLocal]`; on `setLocal`, optimistically updates display and calls `patchSettings(...)`; on error, reverts and exposes an `error` flag
- [x] 7.2 Time row: open a 24-hour time picker; debounce changes by 200ms before PATCHing
- [x] 7.3 Week-start row: dropdown with `Sunday` / `Monday` mapping to `{0, 1}`; PATCH on change
- [x] 7.4 Cadence row: dropdown with `Weekly` / `Bi-weekly` mapping to `{weekly, biweekly}`; PATCH on change
- [x] 7.5 Inline error rendering when `useAutoSaveField` reports an error — small icon + accessible message next to the row

## 8. Frontend — Tests

- [x] 8.1 Component test: settings screen renders current values from a mocked `useCurrentUser`
- [x] 8.2 Component test: changing the cadence dropdown PATCHes once and updates display on success
- [x] 8.3 Component test: PATCH failure reverts the displayed value and shows the error indicator
- [x] 8.4 Component test: time picker debounces rapid changes to a single PATCH
- [x] 8.5 Unit test: `detectTimezone()` returns a non-empty string in a default test environment

## 9. End-to-end verification (manual)

- [x] 9.1 Sign in, open `/settings`, change the cadence — refresh and confirm it persists
- [x] 9.2 Change the time, confirm it persists, and confirm the value displays in 24-hour format
- [x] 9.3 Open DevTools, inspect the most recent PATCH body — confirm `timezone` is always included and matches the browser's timezone
- [x] 9.4 Simulate a backend 422 (e.g., temporarily inject an invalid field via DevTools) and confirm the row reverts and the error indicator appears

## 10. Documentation

- [x] 10.1 Add a section to `backend/README.md` listing the settings fields, their defaults, validation rules, and which capabilities consume them
- [x] 10.2 Note in the README that `timezone` and `reminder_time` together are the contract `daily-reminder` will rely on, and any change here must be coordinated with that capability
