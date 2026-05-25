## 1. Backend — StreakCalculator service

- [x] 1.1 Create `app/services/streak_calculator.rb` with two class methods: `.writing_streak(user)` and `.publishing_streak(user)`
- [x] 1.2 `.writing_streak(user)` implements the algorithm from `design.md`: capture today via `Time::ForUser.today(user)`, walk back through `DailyLog` rows, with one-day tolerance for an unmarked today
- [x] 1.3 `.publishing_streak(user)` reads `user.publishing_cadence` and dispatches to either `.publishing_streak_weekly(user)` or `.publishing_streak_biweekly(user)`
- [x] 1.4 Implement weekly variant: walk back in 7-day steps from `Time::ForUser.this_week_start(user)`, with one-week tolerance
- [x] 1.5 Implement biweekly variant: bucket-walk per the design, with one-bucket tolerance for the current bucket
- [x] 1.6 Implement the tolerant `WeekLog.published_in_week?(user, anchor_date)` lookup: returns true if any `WeekLog` row falls in the 7-day window `[anchor_date, anchor_date + 6 days]` with `published = true` (handles historical rows from a prior `week_starts_on` setting)
- [x] 1.7 Optimize the writing-streak walk to fetch all candidate `DailyLog` rows in a single query bounded by some upper limit (e.g., last 366 days), indexed into a hash for O(1) day lookups during the walk
- [x] 1.8 Same single-query optimization for the publishing-streak walks

## 2. Backend — Service tests

- [x] 2.1 Spec for `StreakCalculator.writing_streak`: every scenario from `specs/streaks/spec.md` (today-with-run, today-not-yet, today-then-yesterday-missed, today-and-yesterday-missed, today-toggled-off-with-yesterday-true, broken-by-gap, brand-new-user)
- [x] 2.2 Spec for `StreakCalculator.publishing_streak` (weekly): consecutive weeks, this-week-not-yet, both-unmarked, gap-broken, tolerant lookup across `week_starts_on` change
- [x] 2.3 Spec for `StreakCalculator.publishing_streak` (biweekly): consecutive buckets, current-bucket-empty-prior-not, both-buckets-empty, every-week-publishes-still-counts-once-per-bucket
- [x] 2.4 Spec confirming streaks are computed against the user's `Time::ForUser.today` / `this_week_start`, not against system time, including a non-UTC user

## 3. Backend — Controller integration: daily logs

- [x] 3.1 In `DailyLogsController#show`, after fetching/defaulting the row, compute `StreakCalculator.writing_streak(current_user)` and include it in the response as a top-level `writing_streak` field
- [x] 3.2 In `DailyLogsController#update`, compute the streak *after* persisting the change in the same controller action; include in response
- [x] 3.3 Ensure `DailyLogsController#index` (range endpoint) does NOT include the streak field
- [x] 3.4 Update existing controller specs (from `add-daily-check-in`) to assert the `writing_streak` field is present on `show`/`update` responses with correct values across toggle scenarios

## 4. Backend — Controller integration: week logs

- [x] 4.1 In `WeekLogsController#show`, compute `StreakCalculator.publishing_streak(current_user)` and include as top-level `publishing_streak`
- [x] 4.2 In `WeekLogsController#update`, compute after persisting; include in response
- [x] 4.3 Ensure `WeekLogsController#index` does NOT include the streak field
- [x] 4.4 Update existing controller specs (from `add-weekly-publishing`) to assert the `publishing_streak` field is present on `show`/`update` responses for both `weekly` and `biweekly` users

## 5. Frontend — Wire streak into the writing card

- [x] 5.1 Update `WritingCheckInCard` to render the `writingStreak` prop in its big-number slot, zero-padded to 2 digits via `String(n).padStart(2, '0')` per the design
- [x] 5.2 Replace the em-dash placeholder logic with the real streak rendering
- [x] 5.3 In `TodayScreen`, when a daily-log fetch or PUT response arrives, store `writing_streak` alongside `wrote`/`note` and pass it down to `WritingCheckInCard`
- [x] 5.4 Optimistic-update interaction with streak: the optimistic flip changes `wrote` immediately but waits for the server response to update the streak number — the streak slot during the brief in-flight window can show the prior value (do not optimistically guess the new streak)

## 6. Frontend — Wire streak into the publish card

- [x] 6.1 Update `WeeklyPublishCard` to render the `publishingStreak` prop in its number slot, zero-padded to 2 digits
- [x] 6.2 Add a `cadence` prop (or read it via a hook from `useCurrentUser().settings.publishing_cadence`); render label as `"Week streak"` for `weekly`, `"Cycle streak"` for `biweekly`
- [x] 6.3 In `TodayScreen`, when a week-log fetch or PUT response arrives, store `publishing_streak` and pass it to the publish card
- [x] 6.4 Same optimistic-update treatment as the writing card: don't predict the new streak; show prior value until server confirms

## 7. Frontend — Tests

- [x] 7.1 Component test: `WritingCheckInCard` renders the streak number from props with zero-padding (covers values 0, 1, 9, 10, 99)
- [x] 7.2 Component test: `WeeklyPublishCard` renders "Week streak" label for `cadence: weekly` and "Cycle streak" for `cadence: biweekly`
- [x] 7.3 Integration test: tapping the writing card optimistically flips state, the streak number stays at prior value until the PUT resolves, then updates to server's value
- [x] 7.4 Integration test: same for the publish card
- [x] 7.5 Integration test: changing cadence in `/settings` and returning to `/` updates the publish card label on next render

## 8. End-to-end verification (manual)

- [ ] 8.1 Sign in as a fresh user, open `/`, both cards display "00"
- [ ] 8.2 Toggle the writing card on → number jumps to "01"; reload → still "01"
- [ ] 8.3 Toggle the publish card on → number jumps to "01"; reload → still "01"
- [ ] 8.4 Toggle writing off → "00"; toggle back on → "01"
- [ ] 8.5 Use the rails console to insert prior days' `wrote = true` rows for the last 5 days, then reload → writing streak shows "06" (5 prior + today)
- [ ] 8.6 Switch `publishing_cadence` to `biweekly` in `/settings`, return to `/` → publish card label changes to "Cycle streak" and the number may shift to reflect bucket counting
- [ ] 8.7 With biweekly cadence and `published = true` only in last week (not this week, not 3 weeks ago) → cycle streak is "01"

## 9. Documentation

- [ ] 9.1 In `backend/README.md`, document the streak algorithms (one paragraph each) with a link to `app/services/streak_calculator.rb`
- [ ] 9.2 Note the cadence-aware label on the publish card in `frontend/README.md`
- [ ] 9.3 Add a brief note that streaks are computed on demand and that introducing a denormalized cache should be a measured decision, not a default
