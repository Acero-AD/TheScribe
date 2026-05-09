## ADDED Requirements

### Requirement: Backend SHALL persist a daily log per user per date

The backend SHALL define a `DailyLog` record uniquely identified by `(user_id, date)`. Each record SHALL hold a `wrote` boolean (default false), a `wrote_at` datetime (nullable), and a `note` text field (nullable). A record SHALL be created on first interaction with that date — either toggling `wrote` to true or saving a non-empty note. Dates with no interaction SHALL have no row.

#### Scenario: First interaction with a date creates a row
- **WHEN** an authenticated user PUTs `/daily_logs/2026-05-08` with `{ wrote: true }` and no row exists for `(user, 2026-05-08)`
- **THEN** a `DailyLog` row is created with `wrote: true`, `wrote_at` set to the current time, and `note: null`

#### Scenario: Note-only first interaction also creates a row
- **WHEN** an authenticated user PUTs `/daily_logs/2026-05-08` with `{ note: "first thought" }` and no row exists
- **THEN** a row is created with `wrote: false`, `wrote_at: null`, and `note: "first thought"`

#### Scenario: Uniqueness is enforced
- **WHEN** the backend attempts to insert a second `DailyLog` row for the same `(user_id, date)`
- **THEN** the database rejects the insert via the unique index

### Requirement: Backend SHALL allow writes only for the user's current date

The backend SHALL accept `PUT /daily_logs/:date` only when `:date` equals the current date computed in the user's `timezone` (falling back to UTC if `timezone` is null). Requests for any other date SHALL respond 422 with an error indicating the date is not editable.

#### Scenario: Today in the user's timezone
- **WHEN** a user with `timezone: "America/New_York"` PUTs `/daily_logs/<today-in-NY>` at 23:30 NY local time
- **THEN** the backend processes the request normally

#### Scenario: Past date is rejected
- **WHEN** a user PUTs `/daily_logs/<yesterday>`
- **THEN** the backend responds 422 and does not modify any row

#### Scenario: Future date is rejected
- **WHEN** a user PUTs `/daily_logs/<tomorrow>`
- **THEN** the backend responds 422 and does not modify any row

#### Scenario: User without a timezone falls back to UTC
- **WHEN** a user with `timezone: null` PUTs `/daily_logs/<today-in-UTC>`
- **THEN** the backend processes the request normally

### Requirement: Backend SHALL accept partial PUT bodies idempotently

The backend SHALL accept `{ wrote?, note? }` on `PUT /daily_logs/:date`. Fields not supplied SHALL not be modified. Sending the same `wrote` value multiple times SHALL be a no-op. When `wrote` flips from false to true, `wrote_at` SHALL be set to the current time; when it flips from true to false, `wrote_at` SHALL be cleared to null.

#### Scenario: Toggle wrote on
- **WHEN** the user PUTs `{ wrote: true }` on a row currently `wrote: false`
- **THEN** the row becomes `wrote: true` and `wrote_at` is set to the current time

#### Scenario: Toggle wrote off
- **WHEN** the user PUTs `{ wrote: false }` on a row currently `wrote: true`
- **THEN** the row becomes `wrote: false` and `wrote_at` becomes null

#### Scenario: Re-asserting the same wrote value
- **WHEN** the user PUTs `{ wrote: true }` on a row already `wrote: true`
- **THEN** the row is unchanged and `wrote_at` is not updated

#### Scenario: Note-only update preserves wrote
- **WHEN** the user PUTs `{ note: "edited" }` on a row currently `wrote: true`
- **THEN** the row's `note` is updated to "edited" and `wrote` and `wrote_at` are unchanged

#### Scenario: Empty body returns current state
- **WHEN** the user PUTs `{}` on an existing row
- **THEN** the backend responds 200 with the unchanged row's representation

### Requirement: Backend SHALL expose a per-date read endpoint

The backend SHALL accept `GET /daily_logs/:date` for any past or current date in the user's timezone. If a row exists, the response SHALL include its `date`, `wrote`, `wrote_at`, and `note`. If no row exists, the response SHALL be 200 with default values `{ date, wrote: false, wrote_at: null, note: null }`.

#### Scenario: Existing row
- **WHEN** the user GETs `/daily_logs/2026-05-08` and a row exists
- **THEN** the response is 200 with that row's fields

#### Scenario: No row for that date
- **WHEN** the user GETs `/daily_logs/2026-05-08` and no row exists
- **THEN** the response is 200 with `{ date: "2026-05-08", wrote: false, wrote_at: null, note: null }`

#### Scenario: Future date is rejected on read
- **WHEN** the user GETs `/daily_logs/<tomorrow>`
- **THEN** the backend responds 422

### Requirement: Backend SHALL expose a date-range read endpoint

The backend SHALL accept `GET /daily_logs?from=YYYY-MM-DD&to=YYYY-MM-DD` returning all rows in the inclusive range for the authenticated user. When `from` is omitted it SHALL default to today minus 90 days; when `to` is omitted it SHALL default to today. The range SHALL not exceed 366 days; longer ranges SHALL respond 422.

#### Scenario: Default range
- **WHEN** the user GETs `/daily_logs` with no params
- **THEN** the response is 200 with rows from `today − 90 days` through `today`, inclusive

#### Scenario: Explicit range
- **WHEN** the user GETs `/daily_logs?from=2026-01-01&to=2026-01-31`
- **THEN** the response includes rows whose `date` falls in that range and excludes others

#### Scenario: Range too large
- **WHEN** the user GETs `/daily_logs?from=2025-01-01&to=2026-12-31`
- **THEN** the backend responds 422

#### Scenario: Inverted range
- **WHEN** the user GETs `/daily_logs?from=2026-05-10&to=2026-05-01`
- **THEN** the backend responds 422

### Requirement: Backend SHALL reject mutations of past entries

The backend SHALL not provide any endpoint that modifies a `DailyLog` row whose date is not the user's current date. The product rule "what happened, happened" SHALL be enforced server-side.

#### Scenario: PUT to past date
- **WHEN** any client PUTs `/daily_logs/<any-past-date>` with any body
- **THEN** the backend responds 422 and the historical row (if any) is unchanged

### Requirement: Backend SHALL scope all daily-log operations to the current user

Every `DailyLog` read and write SHALL operate only on rows belonging to the authenticated user. Cross-user access SHALL be impossible via these endpoints.

#### Scenario: User A cannot read User B's logs
- **WHEN** user A GETs `/daily_logs/2026-05-08` and user B has a row for that date
- **THEN** the response reflects user A's row (or defaults if absent), never user B's

#### Scenario: Unauthenticated request
- **WHEN** any unauthenticated client requests any `/daily_logs/...` endpoint
- **THEN** the backend responds 401

### Requirement: Frontend SHALL host the Today screen at /

The frontend SHALL render the Today screen at the `/` route for authenticated users. The screen SHALL show a date header reflecting the user's current date in their timezone, the writing check-in card, and the note card. The current date SHALL be re-derived when the page regains focus and on a 60-second interval, so that crossing midnight rolls the displayed date forward without a manual refresh.

#### Scenario: Authenticated user opens /
- **WHEN** an authenticated user navigates to `/`
- **THEN** the Today screen renders with today's date (in their timezone) in the header

#### Scenario: Unauthenticated user opens /
- **WHEN** an unauthenticated user navigates to `/`
- **THEN** the user is redirected to `/sign-in` (per `account-access`)

#### Scenario: App is open when midnight passes
- **WHEN** the app has been idle on `/` and the local clock crosses midnight in the user's timezone
- **THEN** within 60 seconds the date header updates to the new date and the cards reset to the new day's state

### Requirement: Frontend SHALL render a writing check-in card with optimistic toggle

The frontend SHALL render a card on `/` whose tap target toggles `wrote` for today. On tap, the UI SHALL update its visual state (checked / unchecked) immediately, then fire `PUT /daily_logs/<today>` with the new value. On a 2xx response matching the new value, the optimistic state SHALL stand. On any error, the UI SHALL revert to the prior state and surface an inline error indicator.

#### Scenario: Toggle on, server confirms
- **WHEN** the user taps the unchecked card and the PUT returns 200 with `wrote: true`
- **THEN** the card stays in the checked state with no further change

#### Scenario: Toggle on, server fails
- **WHEN** the user taps the unchecked card and the PUT returns a non-2xx or fails to reach the server
- **THEN** the card reverts to unchecked and an inline error indicator appears

#### Scenario: Repeated taps
- **WHEN** the user taps the card three times in quick succession
- **THEN** the final PUT reflects the user's last visible state and the displayed state matches the server's confirmed value

### Requirement: Frontend SHALL render a note card that auto-saves on blur

The frontend SHALL render a textarea card below the check-in card. The textarea SHALL be initialized to the existing note for today (if any). When the textarea loses focus AND its current value differs from the last persisted value, the frontend SHALL fire `PUT /daily_logs/<today>` with `{ note: <value> }`. Empty strings SHALL persist as `null` server-side.

#### Scenario: User types a note and blurs
- **WHEN** the user types "shipped the landing" and blurs the textarea
- **THEN** the frontend PUTs the new note to the backend

#### Scenario: Blur with no change
- **WHEN** the user focuses the textarea, types nothing, and blurs
- **THEN** no request is made

#### Scenario: User clears the note
- **WHEN** the user removes all text and blurs
- **THEN** the frontend PUTs `{ note: "" }` and the backend stores `null`

#### Scenario: Save fails
- **WHEN** the PUT returns a non-2xx or network failure
- **THEN** the frontend keeps the textarea's current value (does not revert) and surfaces an inline error indicator with a retry option, since unsaved keystrokes are user-typed content that should not be silently discarded
