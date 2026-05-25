## Context

`account-access`, `user-settings`, `daily-check-in`, `weekly-publishing`, and `streaks` are in place. The data needed for the History screen — `DailyLog` rows, `WeekLog` rows, current streaks — already exists. This change is mostly a frontend screen and a backend BFF endpoint that composes existing data. The only genuinely new computation is "best writing streak."

The History screen design (`docs/design/history.jsx`) shows: a header, three streak chips at the top, a calendar grid, prev/next month navigation, a selected-day note inline, and a "recent notes" list. The calendar uses Mon-first day-of-week heads in the design's hard-coded mock — but our `user-settings.week_starts_on` is configurable, so the real implementation has to honor that.

## Goals / Non-Goals

**Goals:**
- One round-trip per month-view, returning everything the screen needs.
- A calendar that respects the user's `week_starts_on` so Monday-anchored and Sunday-anchored users both see a familiar layout.
- Read-only past data — tapping a day shows its note, never opens an editor.
- "Best writing streak" surfaced in the streak chips alongside the current streak.

**Non-Goals:**
- Editing past entries — both backend and frontend forbid it (`daily-check-in` already enforces server-side; the History UI never offers an edit affordance).
- Best publishing streak — design only shows best for writing.
- Per-week ribbon decoration on the calendar (the doc's "accent border on the whole week column") — at v1 the per-day "wrote in published week" cell-color is enough to communicate which weeks were published.
- Month navigation past the current month.
- Forward/back across years via gesture — single-step prev/next is enough for v1.
- A separate "all notes" archive view — recent notes inline are enough; full search lands later if at all.

## Decisions

### 1. One bundled endpoint per month: `GET /history?month=YYYY-MM`

**Choice:** A single backend endpoint takes a month string and returns all data the History screen needs:
```
{
  month: "2026-04",
  daily_logs: [{ date, wrote, wrote_at, note }, ...],
  week_logs: [{ week_start_date, published }, ...],
  writing_streak_current: <int>,
  writing_streak_best: <int>,
  publishing_streak_current: <int>
}
```
**Why:** The screen needs four data shapes at once. Four separate endpoints would mean four round-trips and a flicker as data lands at different times. The bundled response is small (max ~31 daily logs + ~6 week logs + 3 numbers) — well under any payload concern.
**Alternative considered:** Reuse the existing `GET /daily_logs?from=&to=` and `GET /week_logs?from=&to=` plus a new `GET /streaks` endpoint. Rejected — three round-trips for one screen, and the frontend would need to assemble the cell-state matrix anyway.
**Trade-off:** This endpoint is a "BFF" — backend-for-frontend, shaped specifically for this screen. We accept that coupling because the alternative is worse UX. If a second consumer ever needs the same data, we generalize.

### 2. The endpoint scope is the calendar month, not the visible cells

**Choice:** The backend returns rows whose `date` falls strictly within the requested month. Leading and trailing blank cells in the calendar grid (days from adjacent months that fill the first/last row) carry no data and render as empty.
**Why:** Simpler endpoint contract, no need for the frontend to reason about the visible-cell range. The empty cells in the design have no data on them anyway (the cell renders nothing when `d` is null), so there's nothing to fetch.
**Alternative considered:** Fetch the full visible-cell range (week-aligned). Rejected — adds backend logic for week alignment that the frontend is doing anyway, and the savings (a few more cells with notes) aren't visible to the user.

### 3. Calendar visual states are per-day, derived from logs

**Choice:** Each day cell has one of three states:
- **No activity**: no `DailyLog` row, OR `wrote = false`. Rendered with neutral border, no fill.
- **Wrote**: `wrote = true` AND that day's containing week's `WeekLog.published` is false (or absent). Rendered with the soft accent fill.
- **Wrote in published week**: `wrote = true` AND the week's `WeekLog.published = true`. Rendered with the deeper accent fill (and per the design, an outer ring for emphasis).

**Why:** Per-day states map cleanly to per-cell rendering — no row-level overlay logic. The "Wrote in published week" state is the only intersection between the two data sources, and it's exactly the cell-level signal a user wants ("on this day I wrote, AND that was a week I shipped"). Days where the user *didn't* write but the week was published get no special marker — the calendar speaks "what did I do *this day*."
**Trade-off:** Per the doc, "Published weeks are visually distinct (accent border on the whole week column or a dot above)." We're choosing the simpler "deeper-accent on the wrote-in-published days" interpretation. A user who publishes but doesn't write any specific day in that week (rare) gets no calendar marker for the publish. Documented; revisit if it becomes a complaint.

### 4. Calendar respects `week_starts_on`

**Choice:** The day-of-week header reorders based on `user.week_starts_on`. For `1` (Monday), heads are M T W T F S S; for `0` (Sunday), heads are S M T W T F S. Day cells are anchored to the same start-of-week. Leading/trailing blanks compute from the month's first day's offset against the user's start.
**Why:** Users have strong preferences here — Sunday-first is the US convention, Monday-first is the ISO/European convention. We already store the preference; using it is the right thing.
**Trade-off:** A user who flips `week_starts_on` mid-flight will see the calendar reflow. That's the desired behavior — the layout follows the setting.

### 5. Streak chips: Current days, Best days, Published [wks/cycles]

**Choice:** Three chips at the top:
- **Current** — `writing_streak_current` (days). Same number as the writing card on `/`.
- **Best** — `writing_streak_best` (days). New computation.
- **Published** — `publishing_streak_current` (label depends on `publishing_cadence`: "wks" for weekly, "cycles" for biweekly). Same number as the publish card on `/`.

**Why:** The design shows three chips with these exact labels. "Current" and "Best" are about the daily writing rhythm (the headline streak); "Published" is about the slower-cadence publishing. Mixing best for both would be visual clutter for a metric most users won't care to track twice.
**Why not best publishing too?** No design surface for it; product simplicity; can be added later if requested.

### 6. Best writing streak: full-history scan, on every history fetch

**Choice:** `StreakCalculator.best_writing_streak(user)` reads all of the user's `DailyLog` rows ordered by date and computes the longest run of consecutive `wrote = true` dates. No caching.
**Why:** A user with 1000 days of history scans 1000 rows in microseconds with the existing `(user_id, date)` index. The compute is run on every history fetch — at most once per month-view — so the load is tiny.
**Trade-off:** If a user reaches 5+ years of daily history, this scan grows. Acceptable until then; we can add a `best_writing_streak` denormalized column on `users` if measurement justifies it.

### 7. Past entries are read-only on the frontend

**Choice:** Tapping a day on the calendar selects it (visual ring) and renders its note inline below. There is **no edit control** — no toggle to flip `wrote`, no textarea to edit the note.
**Why:** Doc explicitly says "No editing past check-ins — what happened, happened." The backend already enforces this (the `daily-check-in` and `weekly-publishing` PUT endpoints reject past dates). The frontend's role is to never offer the affordance in the first place.
**Today on the History calendar:** The current day in the calendar IS still read-only here. To check in, the user goes to `/`. This avoids two competing UIs for the same toggle.

### 8. Month navigation: prev unrestricted, next disabled at current month

**Choice:** The prev arrow always works (further back into history). The next arrow is disabled when the displayed month is the user's current month (in their timezone).
**Why:** "Future months" don't have data; navigating to them would always show empty calendars. Avoiding the navigation removes the dead-end UX. Far-past months show empty data gracefully — the user signed up some date, so anything before that is just an empty grid.
**Far past:** Allow without restriction. Pre-signup months render empty. We don't track signup date for navigation purposes.

## Risks / Trade-offs

- **A user who publishes but doesn't write in the same week** has a published `WeekLog` row but no day cell to highlight it. Visually, that week looks "empty" on the calendar even though they published. The streak chip "Published wks" still reflects it. Acceptable; rare edge case.
- **Best-streak compute on every fetch** — fast at v1 scale, can become an issue at multi-year history; denormalize when needed.
- **The bundled endpoint is screen-coupled** — can't easily reuse for other consumers. Acceptable as long as History is the only consumer; if a second consumer appears, refactor into smaller endpoints.
- **Mid-month timezone changes** — a user who travels and changes their detected timezone could shift "today" by a day mid-month, which slightly shifts the "current month" calculation. Edge case; documented; not worth solving in v1.

## Migration Plan

No schema changes. New controller and service method ship as code. Rollback is removing the route and the service method.

## Open Questions

- **Tap-and-hold or long-press to expand a note?** Some notes might be longer than the inline render area. v1: render full note text inline, line-wrapped — accept that very long notes push the recent-notes list down.
- **Year header navigation?** Single-step prev/next is fine for v1. A "jump to month" picker can land later if users complain.
- **Should we surface the user's first-activity date and use it as a navigation floor?** Probably overkill; empty months are not harmful.
