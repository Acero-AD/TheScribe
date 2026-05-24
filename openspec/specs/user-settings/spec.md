# user-settings Specification

## Purpose
TBD - created by archiving change add-user-settings. Update Purpose after archive.
## Requirements
### Requirement: Backend SHALL persist user-level settings on the User record

The backend SHALL extend the `User` record with four settings fields: `reminder_time` (string in `HH:MM` 24-hour format, nullable), `week_starts_on` (integer, 0 for Sunday or 1 for Monday, default 1), `publishing_cadence` (string, `weekly` or `biweekly`, default `weekly`), and `timezone` (IANA timezone name string, nullable). These fields SHALL be the single source of truth for these preferences across the application.

#### Scenario: A new user is created without explicit settings
- **WHEN** a `User` is created via the magic-link flow with no settings supplied
- **THEN** `week_starts_on` is `1`, `publishing_cadence` is `weekly`, `reminder_time` is null, and `timezone` is null

#### Scenario: Settings round-trip through the database
- **WHEN** a `User` record has `reminder_time` set to `20:00`, `week_starts_on` set to `0`, `publishing_cadence` set to `biweekly`, and `timezone` set to `America/New_York`
- **THEN** reading the record back yields exactly those values without coercion or loss

### Requirement: Backend SHALL validate settings field values

The backend SHALL reject settings updates whose field values are outside their allowed shape: `week_starts_on` outside `{0, 1}`, `publishing_cadence` outside `{weekly, biweekly}`, `reminder_time` not matching the `HH:MM` 24-hour format (where `HH` ∈ `00..23` and `MM` ∈ `00..59`), or `timezone` not a recognized IANA timezone name.

#### Scenario: Valid update
- **WHEN** the client PATCHes `/me/settings` with `{ reminder_time: "08:30", week_starts_on: 1, publishing_cadence: "weekly", timezone: "Europe/Madrid" }`
- **THEN** the backend responds 200 with the updated settings and the values persist

#### Scenario: Invalid week_starts_on
- **WHEN** the client PATCHes with `week_starts_on: 5`
- **THEN** the backend responds 422 with a validation error and no field is updated

#### Scenario: Invalid publishing_cadence
- **WHEN** the client PATCHes with `publishing_cadence: "monthly"`
- **THEN** the backend responds 422 with a validation error

#### Scenario: Malformed reminder_time
- **WHEN** the client PATCHes with `reminder_time: "8:30 PM"` or `reminder_time: "25:00"`
- **THEN** the backend responds 422 with a validation error

#### Scenario: Unknown timezone
- **WHEN** the client PATCHes with `timezone: "Mars/Olympus_Mons"`
- **THEN** the backend responds 422 with a validation error

#### Scenario: Null reminder_time is allowed
- **WHEN** the client PATCHes with `reminder_time: null`
- **THEN** the backend responds 200 and clears the value

### Requirement: Backend SHALL expose settings via the current-user endpoint

The backend SHALL include a `settings` sub-object on the response of `GET /me` containing the four settings fields. The shape SHALL be `{ reminder_time, week_starts_on, publishing_cadence, timezone }`.

#### Scenario: Authenticated user fetches /me
- **WHEN** the client GETs `/me` with a valid session
- **THEN** the response body contains a `settings` object with the four fields, reflecting current persisted values

#### Scenario: Unauthenticated request
- **WHEN** the client GETs `/me` without a valid session
- **THEN** the backend responds 401 (unchanged from `account-access`)

### Requirement: Backend SHALL accept partial settings updates via PATCH /me/settings

The backend SHALL accept `PATCH /me/settings` from authenticated users, validate any fields supplied in the request body against their allowed shapes, update only the supplied fields, and respond 200 with the full updated settings object. Fields not supplied SHALL remain unchanged.

#### Scenario: Single-field update
- **WHEN** an authenticated client PATCHes `/me/settings` with body `{ publishing_cadence: "biweekly" }`
- **THEN** the backend updates only `publishing_cadence`, leaves the other three fields unchanged, and responds 200 with the full updated settings

#### Scenario: Empty body
- **WHEN** the client PATCHes with `{}`
- **THEN** the backend responds 200 with the current settings unchanged

#### Scenario: Unauthenticated PATCH
- **WHEN** the client PATCHes `/me/settings` without a valid session
- **THEN** the backend responds 401

#### Scenario: One invalid field rejects the whole request
- **WHEN** the client PATCHes with `{ week_starts_on: 1, publishing_cadence: "monthly" }`
- **THEN** the backend responds 422 and neither field is updated (transactional)

### Requirement: Frontend SHALL render a settings screen with grouped configuration rows

The frontend SHALL provide a `/settings` route accessible only to authenticated users, rendering a screen with two groups: a "Reminders" group containing a time row, and a "Schedule" group containing a week-start row and a publishing-cadence row. Initial values SHALL come from the `settings` object on the current `/me` response.

#### Scenario: Authenticated user opens settings
- **WHEN** an authenticated user navigates to `/settings`
- **THEN** the screen renders with each row showing the user's current value (or a placeholder if `reminder_time` is null)

#### Scenario: Unauthenticated user attempts to open settings
- **WHEN** an unauthenticated user navigates to `/settings`
- **THEN** the user is redirected to `/sign-in` (per `account-access`)

### Requirement: Frontend SHALL auto-save settings changes and revert on error

The frontend SHALL persist a row's change immediately by PATCHing `/me/settings` with the changed field. On a 2xx response, the new value remains visible. On a non-2xx response or network failure, the row's displayed value SHALL revert to its prior value and an inline error indicator SHALL appear.

#### Scenario: User changes the publishing cadence
- **WHEN** the user selects `Bi-weekly` in the cadence dropdown and the PATCH succeeds
- **THEN** the dropdown shows `Bi-weekly` and no further user action is required

#### Scenario: PATCH fails
- **WHEN** the user changes the time to `06:00` and the PATCH returns 422 or fails
- **THEN** the time row reverts to its prior displayed value and an inline error indicator appears next to the row

#### Scenario: User changes the same row twice quickly
- **WHEN** the user changes the time picker rapidly within 200ms
- **THEN** only the final value is sent to the backend (debounced), preventing request churn

### Requirement: Frontend SHALL include the detected timezone with every settings update

The frontend SHALL detect the user's IANA timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and include it as `timezone` in the body of every `PATCH /me/settings` request, regardless of which other field the user changed.

#### Scenario: User changes the cadence in a new browser
- **WHEN** the user changes the publishing cadence from a browser whose detected timezone differs from the persisted value
- **THEN** the PATCH body includes both the cadence change and the current detected timezone, and the backend persists both

#### Scenario: User changes the cadence with no change in timezone
- **WHEN** the user changes the cadence in a browser whose detected timezone matches the persisted value
- **THEN** the PATCH still includes the timezone field, and the backend persists the same value (idempotent)
