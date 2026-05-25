## Context

`daily-check-in` and `weekly-publishing` ship the data shape; both already reserve a slot in their cards for a streak number. `user-settings` ships `publishing_cadence` (`weekly` | `biweekly`) and resolves the question of biweekly's *meaning* in the `weekly-publishing` design — it doesn't change storage; it changes interpretation, here, in `streaks`.

This change is short on novel infrastructure but high on edge-case algorithm work. The hard parts are: defining the streak rules precisely so they match the doc's wording, deciding how strictly to interpret "no grace period," and making the biweekly bucket alignment unambiguous.

## Goals / Non-Goals

**Goals:**
- Two correct, well-tested streak computations on the backend, exposed inline with the existing log endpoints — no new round-trips.
- A frontend that shows fresh streak numbers immediately on app load (from the per-row response) and updates them on every toggle (from the PUT response).
- Cadence-aware labelling on the publish card so a biweekly user isn't confused by "Week streak."
- All edge cases from the doc handled: today-not-yet-checked carries yesterday's streak; "wrote=false" toggled-off resets just the current; missing rows count as not-done.

**Non-Goals:**
- Denormalized streak cache columns on `users` — defer.
- A `GET /streaks` endpoint — every place a streak is needed already has a row endpoint that includes it.
- "Streak at risk" reminders or near-miss warnings — those would belong with `daily-reminder`, and aren't called for by the doc.
- Historical streak charting / visualizations — out of v1.
- Localizing "Week streak" / "Cycle streak" — English only at v1.

## Decisions

### 1. Compute on demand; no denormalized cache

**Choice:** `StreakCalculator` walks back from "today" (or the current week) reading rows directly. No `current_writing_streak` column on `users`; no cache invalidation.
**Why:** Streak length is bounded — ~365 days back at most for any plausible user, with proper indexing on `(user_id, date)` on `DailyLog` and `(user_id, week_start_date)` on `WeekLog`. Each lookup is microseconds. A 100-day streak walks 100 rows; we'll never see a perf problem at this scale. Caching trades correctness for nothing.
**Alternative considered:** Maintain `users.current_writing_streak` and `users.current_publishing_streak`, updated on every check-in toggle. Rejected — invalidation gets messy when the user toggles off, when a day rolls over without a check-in, when settings change. The extra columns earn their keep only at scale we won't see.

### 2. Writing streak: tolerate "today not yet checked," reset on yesterday-missed

**Choice:**
```
def writing_streak(user, today):
  cursor = today
  if no DailyLog(user, today).wrote and no DailyLog(user, today - 1.day).wrote:
    return 0
  if not DailyLog(user, today).wrote:
    cursor = today - 1.day  # streak survives by one-day tolerance for "today not yet"
  streak = 0
  while DailyLog(user, cursor).wrote == true:
    streak += 1
    cursor -= 1.day
  return streak
```
**Why:** Matches the doc's wording: "Reset: D-1 has no write check-in (checked at D open)" — i.e., the reset happens at the start of day D when day D-1 had no write. Until you reach a day without a write *behind* today, the streak holds.
**Edge cases handled:**
- Today wrote=true, yesterday wrote=true, day-before wrote=true → 3
- Today not yet checked, yesterday wrote=true, day-before wrote=true → 2 (preserved)
- Today wrote=true, yesterday wrote=false → 1
- No rows at all → 0
- Today wrote=true, yesterday no row, day-before wrote=true → 1 (yesterday's miss breaks it)
- Today wrote=false explicitly (toggled off), yesterday wrote=true → 1 (the false-today doesn't reset; we walk from yesterday)

### 3. Publishing streak (weekly): same one-period tolerance

**Choice:** Same shape as the writing streak but stepped in 7-day chunks against `WeekLog`. Tolerates "this week not yet," resets when the previous week is missed.
```
def publishing_streak_weekly(user, this_week_start):
  cursor = this_week_start
  if not WeekLog.published?(user, this_week_start) and not WeekLog.published?(user, this_week_start - 7.days):
    return 0
  if not WeekLog.published?(user, this_week_start):
    cursor = this_week_start - 7.days
  streak = 0
  while WeekLog.published?(user, cursor):
    streak += 1
    cursor -= 7.days
  return streak
```
**Why:** Symmetric with writing streak; same product feel ("the system gives you grace until you've actually missed").

### 4. Publishing streak (biweekly): 2-week buckets aligned back from this week

**Choice:**
- A *bucket* is a pair of consecutive weeks. The current bucket consists of `[this_week_start, this_week_start - 7.days]`. The previous bucket is `[this_week_start - 14.days, this_week_start - 21.days]`. And so on.
- A bucket is "published" if at least one of its two weeks has `WeekLog.published?` true.
- Streak count = consecutive buckets with at least one publish, with the same one-period tolerance for the current bucket as the weekly case.

```
def bucket(this_week_start, idx):
  start_a = this_week_start - (idx * 14).days
  start_b = start_a - 7.days
  return [start_a, start_b]

def bucket_published?(user, this_week_start, idx):
  weeks = bucket(this_week_start, idx)
  return WeekLog.published?(user, weeks[0]) or WeekLog.published?(user, weeks[1])

def publishing_streak_biweekly(user, this_week_start):
  cursor_idx = 0
  if not bucket_published?(user, this_week_start, 0) and not bucket_published?(user, this_week_start, 1):
    return 0
  if not bucket_published?(user, this_week_start, 0):
    cursor_idx = 1
  streak = 0
  while bucket_published?(user, this_week_start, cursor_idx):
    streak += 1
    cursor_idx += 1
  return streak
```
**Why:** Sliding back-aligned buckets are the only definition where a user who just changed cadence isn't immediately punished or rewarded by some arbitrary calendar parity. The current bucket always includes "this week" — the user's most recent reality. The streak measures buckets, not weeks.
**Trade-off:** A biweekly user who publishes every week sees the same streak number as one who publishes every other week — both have all buckets satisfied. That's the right answer for biweekly cadence: "did you publish in this 2-week window?" is a yes regardless.
**Cadence-switch behavior:** If the user switches `weekly` → `biweekly`, prior weeks regroup into buckets. Each bucket's published-state is determined freshly from the same `WeekLog` rows. No data migration. The streak number may jump up or down at the moment of switch; documented and intentional.

### 5. Streak goes inline with the row, not via a separate endpoint

**Choice:** `GET /daily_logs/:date` and `PUT /daily_logs/:date` responses gain a top-level `writing_streak` integer. Same for week-log endpoints with `publishing_streak`.
**Why:** Every UX moment that displays a streak (card load, card toggle) already fetches a row. Bundling avoids a second round-trip and keeps "row state" and "streak number" consistent in a single transaction (the controller computes the streak right after persisting, inside the same request).
**Alternative considered:** A dedicated `GET /streaks` endpoint. Rejected — would require a second fetch on every toggle to refresh the displayed number; more surface area for no UX gain.
**Why this isn't a MODIFIED requirement:** the existing requirements describe what the response *includes*, not the closed set of all fields. The new fields are added via additive requirements in this change.

### 6. Cadence-aware label on the publish card

**Choice:** The frontend reads `useCurrentUser().settings.publishing_cadence` and renders the streak label as:
- `"Week streak"` for `weekly`
- `"Cycle streak"` for `biweekly`

The streak NUMBER comes from `publishing_streak` and means "weeks" for weekly users, "2-week buckets" for biweekly users.
**Why:** Same word ("Week streak") for two different units is misleading. A new word ("Cycle") signals the cadence explicitly. "Cycle" was chosen over "Period" or "Bucket" — period is overloaded with menstrual/finance meanings, bucket is jargon.
**Trade-off:** Adds a tiny bit of cadence-aware logic to the frontend. Acceptable; it stays in one component.

### 7. "Today" and "this week" come from the same helpers introduced earlier

**Choice:** `StreakCalculator.writing_streak(user)` calls `Time::ForUser.today(user)`. `StreakCalculator.publishing_streak(user)` calls `Time::ForUser.this_week_start(user)`. No duplication of timezone or week-anchor logic.
**Why:** Single source of truth for "what is today/this-week for this user." Already tested in the prior changes.

## Risks / Trade-offs

- **Off-anchor historical week-log rows after a `week_starts_on` change** (flagged in `weekly-publishing`): the streak's `WeekLog.published?(user, cursor)` check assumes the rows are at the user's current anchor. A row created under a previous anchor won't be at `cursor`. Mitigation: the calculator can fall back to "is there any `WeekLog` row in the 7-day window starting at `cursor` with `published = true`?" — slightly slower but tolerant. **Decision: implement the tolerant version.** Documented in the spec.
- **A user racing through midnight while we compute** — the calculator captures `Time::ForUser.today(user)` once at the start of the request and uses it for the whole walk. No mid-walk drift.
- **Empty database / brand-new user** — both streaks return 0 cleanly with no special-casing.
- **Long streaks degrading perf** — even a 365-day streak walks 365 rows with an indexed lookup, totaling well under 50ms. If we ever see a complaint, we add a `current_*_streak` column. Until then, on-demand is fine.
- **Cadence flip momentary jump** — switching between weekly and biweekly gives a different number from the same data. Not a bug; the user is asking the system to interpret their data differently. Flag in the user-settings UI? Not in v1; revisit if confusing.

## Migration Plan

No schema changes. Service object lands as a new file. Controller responses gain a field. No rollback complications — the field is additive; clients tolerating the missing field also tolerate it being present.

## Open Questions

- **Should the publish card surface the cadence subtext beneath the streak number?** (e.g., "every 2 weeks · cycle streak"). Defer to UX polish; not blocking.
- **Should we offer a "what counts" tooltip on the streak number?** Probably not in v1; the rules are simple enough that surfacing them in-app would be more text than help.
