## ADDED Requirements

### Requirement: Backend SHALL persist a weekly publish log per user per week

The backend SHALL define a `WeekLog` record uniquely identified by `(user_id, week_start_date)` where `week_start_date` is a `Date` representing the first day of the week in the user's anchor. Each record SHALL hold a `published` boolean (default false). A record SHALL be created on first interaction with that week — toggling `published` to true. Weeks with no interaction SHALL have no row.

#### Scenario: First publish toggle creates a row
- **WHEN** an authenticated user PUTs `/week_logs/<this-week-start>` with `{ published: true }` and no row exists
- **THEN** a `WeekLog` row is created with `published: true`

#### Scenario: Uniqueness is enforced
- **WHEN** the backend attempts to insert a second `WeekLog` row for the same `(user_id, week_start_date)`
- **THEN** the database rejects the insert via the unique index

### Requirement: Backend SHALL compute the current week-start using the user's timezone and week_starts_on

The backend SHALL provide a helper, `Time::ForUser.this_week_start(user)`, returning a `Date` equal to the start of the current calendar week for that user. The week boundary SHALL be computed using the user's `timezone` (fallback UTC) for "now" and the user's `week_starts_on` (0 for Sunday, 1 for Monday) for the start-of-week day.

#### Scenario: Monday-anchored user mid-week
- **WHEN** the helper is called for a user with `week_starts_on: 1` and `timezone: "Europe/Madrid"` on a Wednesday
- **THEN** it returns the date of the Monday of that user's local week

#### Scenario: Sunday-anchored user on a Saturday
- **WHEN** the helper is called for a user with `week_starts_on: 0` on a Saturday
- **THEN** it returns the date of the Sunday six days prior

#### Scenario: Sunday-anchored user on a Sunday
- **WHEN** the helper is called for a user with `week_starts_on: 0` on a Sunday
- **THEN** it returns that same Sunday

#### Scenario: User with null timezone
- **WHEN** the helper is called for a user whose `timezone` is null
- **THEN** the calculation uses UTC for "now" and the user's `week_starts_on` for the anchor

### Requirement: Backend SHALL allow writes only for the user's current week

The backend SHALL accept `PUT /week_logs/:week_start_date` only when `:week_start_date` equals `Time::ForUser.this_week_start(current_user)`. Past or future week-start dates SHALL respond 422 with an error code `week_not_editable`.

#### Scenario: Current week
- **WHEN** the user PUTs `/week_logs/<this-week-start>` with `{ published: true }`
- **THEN** the backend processes the request normally

#### Scenario: Past week is rejected
- **WHEN** the user PUTs `/week_logs/<previous-week-start>` with any body
- **THEN** the backend responds 422 and no row is modified

#### Scenario: Future week is rejected
- **WHEN** the user PUTs `/week_logs/<next-week-start>` with any body
- **THEN** the backend responds 422 and no row is modified

#### Scenario: A date that is not a valid week-start is rejected
- **WHEN** the user PUTs `/week_logs/<a-wednesday>` with any body
- **THEN** the backend responds 422 (the date is neither the current week-start nor a recognized week-start under the user's anchor)

### Requirement: Backend SHALL accept partial PUT bodies idempotently

The backend SHALL accept `{ published?: boolean }` on `PUT /week_logs/:week_start_date`. Fields not supplied SHALL not be modified. Sending the same `published` value multiple times SHALL be a no-op.

#### Scenario: Toggle published on
- **WHEN** the user PUTs `{ published: true }` on a row currently `published: false`
- **THEN** the row becomes `published: true`

#### Scenario: Toggle published off
- **WHEN** the user PUTs `{ published: false }` on a row currently `published: true`
- **THEN** the row becomes `published: false`

#### Scenario: Re-asserting the same published value
- **WHEN** the user PUTs `{ published: true }` on a row already `published: true`
- **THEN** the row is unchanged

#### Scenario: Empty body returns current state
- **WHEN** the user PUTs `{}` on an existing row
- **THEN** the backend responds 200 with the unchanged row's representation

### Requirement: Backend SHALL expose a per-week read endpoint

The backend SHALL accept `GET /week_logs/:week_start_date` for any past or current week-start date in the user's anchor. If a row exists, the response SHALL include `week_start_date` and `published`. If no row exists, the response SHALL be 200 with `{ week_start_date, published: false }`.

#### Scenario: Existing row
- **WHEN** the user GETs `/week_logs/<a-week-start>` and a row exists
- **THEN** the response is 200 with the row's fields

#### Scenario: No row for that week
- **WHEN** the user GETs `/week_logs/<a-week-start>` and no row exists
- **THEN** the response is 200 with `{ week_start_date, published: false }`

#### Scenario: Future week-start is rejected on read
- **WHEN** the user GETs `/week_logs/<next-week-start>`
- **THEN** the backend responds 422

### Requirement: Backend SHALL expose a date-range read endpoint for weeks

The backend SHALL accept `GET /week_logs?from=YYYY-MM-DD&to=YYYY-MM-DD` returning all rows whose `week_start_date` falls within the inclusive range for the authenticated user. When `from` is omitted it SHALL default to the start of the week 12 weeks ago; when `to` is omitted it SHALL default to the start of the current week. The range SHALL not exceed 104 weeks (~728 days); larger ranges SHALL respond 422.

#### Scenario: Default range
- **WHEN** the user GETs `/week_logs` with no params
- **THEN** the response includes rows whose `week_start_date` is within `[this_week_start − 12 weeks, this_week_start]`

#### Scenario: Explicit range
- **WHEN** the user GETs `/week_logs?from=2026-01-05&to=2026-04-27`
- **THEN** the response includes only rows whose `week_start_date` is within that range

#### Scenario: Range too large
- **WHEN** the user GETs `/week_logs?from=2024-01-01&to=2026-12-31`
- **THEN** the backend responds 422

#### Scenario: Inverted range
- **WHEN** the user GETs `/week_logs?from=2026-05-04&to=2026-04-27`
- **THEN** the backend responds 422

### Requirement: Backend SHALL scope all week-log operations to the current user

Every `WeekLog` read and write SHALL operate only on rows belonging to the authenticated user. Cross-user access SHALL be impossible via these endpoints.

#### Scenario: User A cannot read User B's week logs
- **WHEN** user A GETs `/week_logs/<a-week-start>` and user B has a row for that week
- **THEN** the response reflects user A's row (or defaults if absent), never user B's

#### Scenario: Unauthenticated request
- **WHEN** any unauthenticated client requests any `/week_logs/...` endpoint
- **THEN** the backend responds 401

### Requirement: Backend SHALL reject mutations of past weeks

The backend SHALL not provide any endpoint that modifies a `WeekLog` row whose `week_start_date` is not the user's current week-start. The product rule "what happened, happened" SHALL be enforced server-side.

#### Scenario: PUT to a past week
- **WHEN** any client PUTs `/week_logs/<any-past-week-start>` with any body
- **THEN** the backend responds 422 and the historical row (if any) is unchanged

### Requirement: Frontend SHALL render a weekly publish card on the Today screen

The frontend SHALL render a publish check-in card on the `/` route, positioned between the writing check-in card and the note card. The card SHALL display the question "Did you publish this week?", a checked/unchecked visual state, and a reserved slot for the week-streak number that renders an em-dash placeholder until `add-streaks` populates it. The current week-start used by this card SHALL be re-derived on window focus and on a 60-second interval, so that crossing a week boundary rolls the card forward without manual refresh.

#### Scenario: Authenticated user opens /
- **WHEN** an authenticated user navigates to `/`
- **THEN** the publish card appears between the writing card and the note card with the correct checked/unchecked state for the current week

#### Scenario: Crossing a week boundary
- **WHEN** the app has been idle on `/` and the local clock crosses the user's week-start day at midnight
- **THEN** within 60 seconds the publish card resets to reflect the new week's row (which is empty until interacted with)

### Requirement: Frontend SHALL toggle the publish state optimistically

The frontend SHALL update the publish card's visual state immediately on tap, then fire `PUT /week_logs/<this-week-start>` with `{ published: <next> }`. On a 2xx response matching the new value, the optimistic state SHALL stand. On error, the UI SHALL revert and show an inline error indicator.

#### Scenario: Toggle on, server confirms
- **WHEN** the user taps the unchecked card and the PUT returns 200 with `published: true`
- **THEN** the card stays in the checked state

#### Scenario: Toggle on, server fails
- **WHEN** the user taps the unchecked card and the PUT returns a non-2xx or fails
- **THEN** the card reverts to unchecked and an inline error indicator appears

#### Scenario: Repeated taps
- **WHEN** the user taps the publish card three times in quick succession
- **THEN** the final PUT reflects the user's last visible state and the displayed state matches the server's confirmed value

### Requirement: Frontend SHALL derive the current week-start using the user's settings

The frontend SHALL compute the current `week_start_date` using the user's `timezone` (fallback to `Intl` detection) and `week_starts_on` (fallback 1 = Monday). The same computation SHALL be used for both the URL parameter on PUT/GET requests and the displayed boundary inside the card.

#### Scenario: Sunday-anchored user
- **WHEN** the user has `week_starts_on: 0` and the current local date is a Tuesday
- **THEN** the frontend uses the previous Sunday as `week_start_date`

#### Scenario: Monday-anchored user with no timezone
- **WHEN** the user has `week_starts_on: 1` and `timezone: null`
- **THEN** the frontend falls back to `Intl.DateTimeFormat().resolvedOptions().timeZone` to compute "now," then walks back to the most recent Monday
