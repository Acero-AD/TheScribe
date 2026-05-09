## ADDED Requirements

### Requirement: Backend SHALL compute the current writing streak per user

The backend SHALL provide a service that returns the user's current writing streak as a non-negative integer. The streak SHALL be defined as the length of the longest run of consecutive dates ending at "today" (in the user's timezone) where every date in the run has a `DailyLog` with `wrote = true`. If "today" has no `DailyLog` or has `wrote = false`, the run is allowed to start at "yesterday" instead, preserving the streak through a not-yet-checked current day. If neither today nor yesterday has `wrote = true`, the streak SHALL be 0.

#### Scenario: Three consecutive days written, including today
- **WHEN** user has `DailyLog(today).wrote = true`, `DailyLog(today − 1).wrote = true`, `DailyLog(today − 2).wrote = true`, and no row for `today − 3`
- **THEN** the writing streak is 3

#### Scenario: Today not yet checked, recent days written
- **WHEN** user has no row for today, `DailyLog(today − 1).wrote = true`, `DailyLog(today − 2).wrote = true`
- **THEN** the writing streak is 2

#### Scenario: Today checked but yesterday missed
- **WHEN** `DailyLog(today).wrote = true` and `DailyLog(today − 1)` does not exist
- **THEN** the writing streak is 1

#### Scenario: Today and yesterday both unmarked
- **WHEN** today has no row and yesterday has no row
- **THEN** the writing streak is 0

#### Scenario: Today wrote=false explicitly, yesterday wrote=true
- **WHEN** the user previously toggled today on then off (so `DailyLog(today).wrote = false`) and `DailyLog(today − 1).wrote = true` and `DailyLog(today − 2).wrote = true`
- **THEN** the writing streak is 2

#### Scenario: Run broken by a missed day
- **WHEN** `DailyLog(today).wrote = true`, `DailyLog(today − 1).wrote = true`, no row for `today − 2`, `DailyLog(today − 3).wrote = true`
- **THEN** the writing streak is 2 (the run stops at the gap)

#### Scenario: Brand-new user with no logs
- **WHEN** the user has no `DailyLog` rows at all
- **THEN** the writing streak is 0

### Requirement: Backend SHALL compute the current publishing streak with weekly cadence

When the authenticated user's `publishing_cadence` is `weekly`, the backend SHALL compute the publishing streak as the length of the longest run of consecutive weeks (in the user's anchor) ending at "this week" (or "last week" if this week is unmarked) where every week in the run has a `WeekLog` with `published = true`. The streak SHALL be 0 if neither this week nor last week is published.

For tolerance to historical rows created under a previous `week_starts_on` setting, the check "is week W published?" SHALL be implemented as: "does the user have any `WeekLog` row whose `week_start_date` falls in the 7-day window `[week-anchor-of-W, week-anchor-of-W + 6 days]` with `published = true`?"

#### Scenario: Two consecutive weeks published, including this week
- **WHEN** user has `published = true` for this week and last week, no row for two weeks ago
- **THEN** the publishing streak (weekly) is 2

#### Scenario: This week not yet, prior weeks published
- **WHEN** no row for this week, `published = true` for last week, `published = true` for two weeks ago, no row for three weeks ago
- **THEN** the publishing streak (weekly) is 2

#### Scenario: This week and last week both unmarked
- **WHEN** no row for this week and no row for last week
- **THEN** the publishing streak (weekly) is 0

#### Scenario: Tolerant lookup across `week_starts_on` change
- **WHEN** user has `WeekLog` rows under a previous Sunday-anchor that don't match the current Monday-anchored `week_start_date` exactly, but their dates fall within the windowed 7-day spans
- **THEN** those rows are considered for the streak

### Requirement: Backend SHALL compute the current publishing streak with biweekly cadence

When the authenticated user's `publishing_cadence` is `biweekly`, the backend SHALL compute the publishing streak as the count of consecutive 2-week buckets (sliding back from the current bucket) where at least one of the bucket's two weeks has `published = true`. The current bucket consists of `[this_week_start, this_week_start − 7 days]`. Bucket index n is `[this_week_start − (n × 14) days, this_week_start − (n × 14 + 7) days]`. The streak SHALL tolerate the current bucket being unsatisfied, in the same way the weekly case tolerates this week being unmarked: if bucket 0 has no publish but bucket 1 does, the streak starts counting from bucket 1.

#### Scenario: Most recent two buckets each have at least one publish
- **WHEN** the user published in week (this_week − 1) and in week (this_week − 3), and no rows further back
- **THEN** the publishing streak (biweekly) is 2

#### Scenario: Current bucket unmarked, prior bucket published
- **WHEN** no rows for this week or last week, `published = true` for two weeks ago, no rows further back
- **THEN** the publishing streak (biweekly) is 1

#### Scenario: Both current and prior buckets unmarked
- **WHEN** the user has no `published = true` in any week within the last 4 weeks
- **THEN** the publishing streak (biweekly) is 0

#### Scenario: Publishing every week counts the same as every other week
- **WHEN** user with `biweekly` cadence has published every week for the last 6 weeks (3 buckets satisfied)
- **THEN** the publishing streak (biweekly) is 3 (each bucket counts once regardless of how many of its weeks were published)

### Requirement: Backend SHALL include the writing streak in daily-log endpoint responses

The backend SHALL include a `writing_streak` integer field at the top level of the JSON response for `GET /daily_logs/:date` and `PUT /daily_logs/:date`. The value SHALL be computed *after* any mutation in the same request, reflecting the streak as of immediately after the request's effects. Range read responses (`GET /daily_logs?from=&to=`) SHALL NOT include this field.

#### Scenario: GET response includes streak
- **WHEN** an authenticated user GETs `/daily_logs/<today>`
- **THEN** the response body contains a `writing_streak` field

#### Scenario: PUT response reflects post-mutation streak
- **WHEN** an authenticated user with a current streak of 4 PUTs `{ wrote: true }` for today (and today was previously unmarked)
- **THEN** the response includes `writing_streak: 5`

#### Scenario: PUT-off response reflects post-mutation streak
- **WHEN** an authenticated user with a current streak of 5 PUTs `{ wrote: false }` for today (rolling today back to unmarked, with yesterday `wrote = true` and a 4-day prior run)
- **THEN** the response includes `writing_streak: 4`

#### Scenario: Range endpoint does not include streak
- **WHEN** the user GETs `/daily_logs?from=...&to=...`
- **THEN** the response is an array of rows and no top-level `writing_streak` is included

### Requirement: Backend SHALL include the publishing streak in week-log endpoint responses

The backend SHALL include a `publishing_streak` integer field at the top level of the JSON response for `GET /week_logs/:week_start_date` and `PUT /week_logs/:week_start_date`. The value SHALL respect the user's `publishing_cadence` and SHALL be computed after any mutation in the same request. Range read responses (`GET /week_logs?from=&to=`) SHALL NOT include this field.

#### Scenario: GET response includes streak (weekly cadence)
- **WHEN** an authenticated weekly user GETs `/week_logs/<this-week-start>`
- **THEN** the response body contains a `publishing_streak` field whose value reflects the weekly definition

#### Scenario: GET response includes streak (biweekly cadence)
- **WHEN** an authenticated biweekly user GETs `/week_logs/<this-week-start>`
- **THEN** the response body contains a `publishing_streak` field whose value reflects the biweekly bucket definition

#### Scenario: PUT response reflects post-mutation streak
- **WHEN** an authenticated weekly user with a 2-week run PUTs `{ published: true }` for this week (previously unmarked)
- **THEN** the response includes `publishing_streak: 3`

#### Scenario: Range endpoint does not include streak
- **WHEN** the user GETs `/week_logs?from=...&to=...`
- **THEN** no top-level `publishing_streak` is included

### Requirement: Backend SHALL recompute streaks within the same request as the mutation

The streak value returned by `PUT` endpoints SHALL be derived from the database state *after* the mutation has persisted, within the same database transaction or in a read immediately following commit. Stale or pre-mutation streak values SHALL NOT be returned.

#### Scenario: Toggle on, response reflects new state
- **WHEN** the user PUTs `{ wrote: true }` for today
- **THEN** the streak value in the response includes today

#### Scenario: Toggle off, response reflects new state
- **WHEN** the user PUTs `{ wrote: false }` for today
- **THEN** the streak value in the response excludes today (and reflects whatever yesterday-and-back yields)

### Requirement: Frontend SHALL display the writing streak inside the writing check-in card

The frontend SHALL render the writing streak number inside the writing check-in card on `/`, replacing the em-dash placeholder reserved by `daily-check-in`. The number SHALL come from the `writing_streak` field on the most recent daily-log response. The label "Day streak" (per the design) SHALL appear beneath the number.

#### Scenario: Card mounts with streak from initial fetch
- **WHEN** the Today screen mounts and `getDailyLog(today)` returns `{ ..., writing_streak: 7 }`
- **THEN** the writing card displays "07" (zero-padded to two digits per the design) above the "Day streak" label

#### Scenario: Card updates streak on toggle
- **WHEN** the user taps to toggle `wrote = true` and the PUT response returns `writing_streak: 8`
- **THEN** the displayed number updates to "08"

#### Scenario: Brand-new user
- **WHEN** the user signs in with no logs and `getDailyLog(today)` returns `writing_streak: 0`
- **THEN** the card displays "00"

### Requirement: Frontend SHALL display the publishing streak inside the weekly publish card

The frontend SHALL render the publishing streak number inside the publish card on `/`, replacing the em-dash placeholder reserved by `weekly-publishing`. The number SHALL come from the `publishing_streak` field on the most recent week-log response. The label SHALL adapt to the user's cadence: "Week streak" for users whose `publishing_cadence` is `weekly`, "Cycle streak" for users whose `publishing_cadence` is `biweekly`.

#### Scenario: Weekly user sees "Week streak"
- **WHEN** the user has `publishing_cadence: weekly` and the publish card has `publishing_streak: 3`
- **THEN** the card displays "03" with the label "Week streak"

#### Scenario: Biweekly user sees "Cycle streak"
- **WHEN** the user has `publishing_cadence: biweekly` and the publish card has `publishing_streak: 2`
- **THEN** the card displays "02" with the label "Cycle streak"

#### Scenario: Card updates label on cadence change
- **WHEN** the user changes `publishing_cadence` from `weekly` to `biweekly` in `/settings` and returns to `/`
- **THEN** the publish card's label updates to "Cycle streak" on the next render
