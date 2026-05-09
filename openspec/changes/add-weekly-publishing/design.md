## Context

`account-access`, `user-settings`, and `daily-check-in` are in place. A `User` exists, we know their `timezone` and `week_starts_on`, and the Today screen at `/` already hosts the writing check-in card and the note card. This change adds the second controllable input: "did I publish this week?"

The `daily-check-in` change deliberately deferred the question of biweekly cadence semantics from `user-settings`. This change resolves it.

The Today screen design (`docs/design/today.jsx`) shows the publish card as a smaller, lower-emphasis card below the daily card — same warm-tone visual language, smaller type scale, smaller streak number. The week-streak number itself is `add-streaks`'s responsibility; this change reserves the slot.

## Goals / Non-Goals

**Goals:**
- A user can toggle "I published this week" with one tap, with the change reflected immediately and persisted on the server.
- The "this week" boundary respects both the user's `timezone` and their `week_starts_on` setting.
- The data model gives `streaks` and `history-view` a clean, queryable shape: one row per user per week, looked up by week-start date.
- The patterns established in `daily-check-in` (idempotent partial PUT, server-validated current period, optimistic UI, range read endpoint) carry over directly.

**Non-Goals:**
- Computing the weekly or biweekly publishing streak — `add-streaks`.
- Showing the week-streak number on the card — slot reserved, populated empty.
- Editing past weeks' `published` flag — read-only by design.
- Calendar visualization of published weeks (the `[B]` markers in `docs/scoreboard-app.md`'s history mock) — `add-history-view`.
- Multi-publish events per week — the model is "did you publish at all?", not "how many times."
- A `published_at` timestamp column — no UI surface needs it for v1; `updated_at` is good enough if we later need to know when a row was touched.

## Decisions

### 1. Resolve biweekly: `WeekLog` is always per-week; cadence interpretation lives in `streaks`

**Choice:** `WeekLog` rows track a single ISO-style week (anchored to the user's `week_starts_on`). The `publishing_cadence` setting from `user-settings` does **not** change the granularity of `WeekLog` storage, the API surface, or the question asked on the card. Cadence is consumed only by the streak computation in `add-streaks`:
- `weekly` cadence → publishing streak counts consecutive weeks with `published = true`.
- `biweekly` cadence → publishing streak counts consecutive 2-week buckets where at least one week has `published = true`.
**Why:** Keeps storage simple and uniform across users. Gives the user the same "did you publish this week?" question regardless of cadence — which matches what they're actually doing (publishing in real weeks). Pushes the cadence-aware interpretation to one place (streaks), which is where the user-facing distinction actually shows up.
**Alternative considered:** Dynamic `period_key` whose meaning depends on cadence (e.g., `2026-W17-W18` for biweekly). Rejected — different users would have different schemas; the API surface would split; aligning a user who switches cadence becomes a migration problem.

### 2. Storage as `(user_id, week_start_date)` Date column, not `week_key` string

**Choice:** Store the week as a `Date` column representing its first day in the user's anchor. Unique composite index on `(user_id, week_start_date)`.
**Why:** Avoids the ISO-week / Sunday-anchor mismatch. ISO 8601's `YYYY-WNN` format assumes Monday-anchored weeks, which doesn't fit users whose `week_starts_on = 0` (Sunday). A `Date` column is unambiguous, easy to query (range scans, equality), and renders cleanly in JSON.
**Alternative considered:** `week_key` string format (the doc's data model). Rejected — string parsing and the ISO mismatch make it brittle. The doc's schema was a sketch; this is the pragmatic implementation.

### 3. The URL parameter is the week-start date

**Choice:** `PUT /week_logs/:week_start_date` and `GET /week_logs/:week_start_date`. The parameter format is `YYYY-MM-DD`.
**Why:** Same shape as `daily-check-in` — predictable, easy for the client to compute, easy for the server to validate. The client computes the current week's start using the same rule as the server (user's `timezone` + `week_starts_on`), so URLs match.
**Trade-off:** A week-start date doesn't communicate "this is a week" by URL inspection alone. Documentation in the API README compensates.

### 4. Server validates the URL is the user's *current* week-start

**Choice:** On `PUT`, the server computes `Time::ForUser.this_week_start(current_user)` and rejects (422) any request whose `:week_start_date` doesn't match. Past or future week-start dates → 422.
**Why:** Same product rule as `daily-check-in`'s "today only" — past data is read-only, future writes are nonsense. The server is the source of truth for "this week."
**Trade-off:** A user crossing the week boundary (Sat→Sun for Sunday-anchor users, Sun→Mon for Monday-anchor users) will see a 422 if they tap right at the rollover instant. Mitigated client-side by re-deriving the week-start on focus and on a 60-second interval, mirroring `daily-check-in`'s midnight handling.

### 5. Changing `week_starts_on` does not migrate historical rows

**Choice:** A user who switches their `week_starts_on` keeps existing `WeekLog` rows as-is. New entries use the new anchor. Streak computation, when it lands, will window using the user's *current* `week_starts_on` regardless of when historical rows were created.
**Why:** Migrating historical week-start dates would require deciding which rows merge, which split, and how to handle weeks that overlap two anchors. The juice isn't worth the squeeze for a personal tracker. The user-visible cost is: streak math during the transition week may look slightly off until the next clean weekly boundary.
**Trade-off:** Possible edge case where a row's `week_start_date` no longer aligns with the user's current week-start grid. Acceptable; documented for `streaks` to handle gracefully (treat as "any row in the windowed range counts").

### 6. No `published_at` timestamp column

**Choice:** Skip the timestamp. Use Rails' `updated_at` if any future need surfaces.
**Why:** Unlike the daily writing card (which displays "Logged · 9:14"), the publish card's design has no time-of-day surface. Adding a column we don't display is dead weight.

### 7. Today screen integration: insert the publish card between writing and note

**Choice:** The Today screen's vertical stack becomes `[date header, writing card, publish card, note card]`. The screen itself is `daily-check-in`'s territory; this change adds a widget to it without rewriting the existing requirement.
**Why:** Per the design, the publish card is positionally between the daily and the note. A new requirement in this spec captures the publish card's presence and behavior; `daily-check-in`'s requirement (which only enumerates the writing and note cards) remains accurate as a list of widgets *that capability* contributes.

## Risks / Trade-offs

- **Week boundary at the rollover instant** → mirrored from `daily-check-in`'s mitigation (focus + interval re-derive). Bad case is a 422 if the user taps in the same JS tick as the rollover; client refreshes the week and the user sees a clean state.
- **`week_starts_on` change creates non-aligned historical rows** → accepted as v1 behavior. Documented for `streaks` to handle by date-range windowing rather than exact-match week-key lookup.
- **Two consecutive PUTs with conflicting `published` values racing** → idempotent semantics + Rails' default request serialization make this safe; the second response wins.
- **Single-publish-per-week assumption** → if the user publishes twice in a week, the row remains `published: true`. We don't count "how many"; the design doesn't ask for it.

## Migration Plan

Single migration creating the `week_logs` table with composite unique index on `(user_id, week_start_date)`. No backfill — table starts empty. Rollback drops the table.

## Open Questions

- **Should `streaks` get a denormalized cache for the publishing streak?** Defer to that change.
- **Will users want a "did you publish twice this week?" multiplier?** Not in v1's scope; reconsider if the product gains traction and creators ask for it.
