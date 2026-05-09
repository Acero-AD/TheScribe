## Why

Streaks are the entire emotional payload of the product. Per `docs/scoreboard-app.md`: "A streak is honest in a way that view counts are not." Both check-in cards (`daily-check-in`, `weekly-publishing`) ship with a reserved slot for a streak number that today renders as a placeholder. Without this capability, the cards look incomplete and the user gets no feedback signal about consistency — which is the whole product.

This is the fifth V1 capability. It depends on `daily-check-in` (writing data), `weekly-publishing` (publish data), and `user-settings` (cadence interpretation).

## What Changes

- New `StreakCalculator` service object (PORO) on the backend with two computations:
  - **Writing streak**: count of consecutive days, ending at today (or yesterday if today is unmarked), where the user wrote.
  - **Publishing streak**: cadence-aware. For `weekly` users, count of consecutive weeks (ending at this week or the previous week if this week is unmarked) with `published = true`. For `biweekly` users, count of consecutive 2-week buckets ending at the current bucket where at least one of the two weeks has `published = true`.
- Daily-log endpoint responses (`GET` and `PUT /daily_logs/:date`) gain a `writing_streak` field — the freshly-computed value at request time.
- Week-log endpoint responses (`GET` and `PUT /week_logs/:week_start_date`) gain a `publishing_streak` field — the freshly-computed value at request time.
- Writing check-in card surfaces the writing streak in its big-number slot.
- Weekly publish card surfaces the publishing streak in its smaller-number slot, with a label that adapts to cadence ("Week streak" for weekly users, "Cycle streak" for biweekly users).
- Streaks are computed on demand — no denormalized cache columns at v1. Indexes on existing tables are sufficient.

## Capabilities

### New Capabilities
- `streaks`: Cadence-aware computation of the writing and publishing streaks, surfaced inline with the existing check-in endpoints and rendered inside the existing check-in cards. Owns the algorithms, the cadence interpretation, and the streak-display behavior on Today.

### Modified Capabilities
<!-- None — existing requirements in `daily-check-in` and `weekly-publishing` describe the response as containing the row's fields without forbidding additional ones. The new `writing_streak` / `publishing_streak` fields are introduced via *new additive requirements* in this change rather than by modifying the prior requirements. -->

## Impact

- **Backend (`backend/`)**: New `StreakCalculator` PORO under `app/services/`; updates to `DailyLogsController` and `WeekLogsController` to include the streak in their JSON responses; no schema changes (computation is on-demand from existing rows); model tests for the service across all the streak edge cases.
- **Frontend (`frontend/`)**: `WritingCheckInCard` and `WeeklyPublishCard` now display the streak prop instead of an em-dash placeholder; the publish card chooses its label based on `useCurrentUser().settings.publishing_cadence`; streak values come straight from the row responses already returned by the per-day / per-week endpoints — no new fetches.
- **Cross-cutting**: The product finally feels alive — the cards now reflect consistency. This is the change that unlocks the user actually feeling the streak mechanic on every interaction.
- **Out of scope**: a denormalized cache column (`current_writing_streak`) on `users` — defer until measurement shows the on-demand compute is too slow; "streak at risk" warnings before midnight; streak history graphs; publishing-cadence label localization beyond English.
