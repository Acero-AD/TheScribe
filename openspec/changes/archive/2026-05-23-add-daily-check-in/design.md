## Context

`account-access` and `user-settings` are in place. A `User` exists, and we know their IANA timezone. This change introduces the actual unit of behavior the product is built around: a per-day record of whether the user wrote, plus an optional short note.

The Today screen design (`docs/design/today.jsx`) shows two check-in cards (writing + publishing), a note card, streak counts inside each card, a date header, and a tab bar. This change ships only the parts owned by `daily-check-in`: the writing card and the note card. The publishing card belongs to `add-weekly-publishing`. The streak number drawn inside the writing card belongs to `add-streaks`. The tab bar is a frontend chrome concern — a stub lands here, full tabs grow as later capabilities land.

## Goals / Non-Goals

**Goals:**
- A user can toggle "I wrote today" with one tap, with the change reflected immediately in the UI and persisted on the server.
- A user can type a short note about what they wrote; it saves on blur, no Save button.
- The wrote toggle and the note are independent — either can exist without the other.
- The data model gives downstream capabilities (`streaks`, `history-view`) a clean shape to read from: one row per user per date, queryable by range.
- The "today" boundary respects the user's timezone — at 11:59 pm local, the user is still in today; at 12:00 am, it's tomorrow.

**Non-Goals:**
- Showing the actual writing streak number inside the card — `add-streaks` ships that.
- Editing past dates' wrote flag or note — read-only by design.
- Calendar/history view of past entries — `add-history-view`.
- The weekly-publishing card on the same screen — `add-weekly-publishing`.
- Persisting drafts of the note as the user types (autosave is on blur, not on every keystroke).
- Multi-device live updates (if the user toggles on phone A, phone B's open app won't see it until refresh).

## Decisions

### 1. One row per user per date, created on first interaction

**Choice:** A `DailyLog` row exists for `(user_id, date)` only after the user has either toggled `wrote` or saved a note for that date. No background job pre-creates empty rows.
**Why:** Keeps the table lean; absent rows mean "no activity," which `history-view` and `streaks` can interpret. Pre-creating empty rows would cost space and confuse the absence-vs-presence distinction.
**Alternative considered:** Auto-create a row at midnight (in the user's tz) for every user. Rejected — needs a per-user scheduled job, and adds churn for any user who ever skips.

### 2. PUT `/daily_logs/:date` with a partial body, idempotent

**Choice:** A single endpoint accepts `{ wrote?, note? }`. Missing fields are not changed. Sending `wrote: true` repeatedly is a no-op past the first call.
**Why:** Matches the user-settings PATCH pattern for consistency. Idempotent semantics let the frontend retry on transient failures without weird state. Keeps the endpoint count small.
**Alternative considered:** Two endpoints — `PUT /daily_logs/:date/wrote` and `PATCH /daily_logs/:date/note`. Rejected — splits writes across two endpoints when the underlying row is the same; saving a note and toggling at once would need two requests.

### 3. Server validates that `:date` is "today" in the user's timezone

**Choice:** The server resolves `Time.current` against `user.timezone` (fallback UTC if unset), formats as `YYYY-MM-DD`, and compares to the URL's `:date`. Mismatch → 422.
**Why:** Prevents a stale or buggy client from writing to yesterday after midnight. The server is the source of truth for "today." Past dates are read-only by product rule ("what happened, happened").
**Trade-off:** A user crossing midnight while the app is open will see a confusing 422 if they tap right at the boundary. Mitigation: the frontend re-derives "today" on focus and on a periodic interval (e.g., every minute), and the cards re-render with the new date when it rolls over.

### 4. `wrote_at` timestamp for display

**Choice:** Add a `wrote_at` column set when `wrote` flips from false to true, cleared (set to null) when it flips back to false.
**Why:** The card design shows "Logged · 9:14" when checked. Using `updated_at` for that would lie when the user later edits the note (updated_at moves; the wrote moment didn't). A dedicated column is honest.
**Alternative considered:** Skip the timestamp; show no time inline. Rejected — the design calls for it, and the data is cheap.

### 5. Note autosaves on blur, not on every keystroke

**Choice:** The textarea's value is captured on `blur`. If the captured value differs from the last persisted value, PATCH it. No per-keystroke debounce.
**Why:** Doc explicitly says "Note field auto-saves on blur." Avoids storms of small writes for a 1-2 sentence field. Simpler client logic.
**Trade-off:** If the user closes the tab without blurring (unlikely on mobile, possible on desktop), they lose what they typed. Acceptable for v1; can add `beforeunload` / `visibilitychange` save later if it becomes a real complaint.

### 6. Optimistic toggle on the frontend

**Choice:** When the user taps the writing card, the UI flips state immediately and fires PUT in the background. On 200 with the same `wrote` value, nothing else happens. On error, the UI reverts and shows an inline error indicator.
**Why:** The product's whole vibe is "fast and frictionless." A 300ms server round-trip before the card visibly toggles would feel slow. Tap latency is the user's whole signal that they "got their point."
**Trade-off:** The brief window between tap and confirmation can mislead the user if the request fails. Mitigation: revert quickly with a clear visual + a small toast/inline message.

### 7. Read API exposes a date-range index

**Choice:** `GET /daily_logs?from=YYYY-MM-DD&to=YYYY-MM-DD` returns all rows in `[from, to]` for the current user. Both bounds inclusive. Defaults: if absent, `from` = today − 90 days, `to` = today.
**Why:** `history-view` and `streaks` will both want range reads. Better to define the contract here once than have each capability invent its own.
**Constraint:** Range must not exceed 366 days; reject with 422 otherwise. Prevents accidental full-table scans.

### 8. Today route at `/` is owned by this capability initially

**Choice:** This change creates the `/` route, the `Today` screen shell (date header, vertical card stack), and renders the writing card and note card. Subsequent capabilities (`weekly-publishing`, `streaks`) extend the same screen.
**Why:** Someone has to ship the route first, and `daily-check-in` is the most central widget on it. Other capabilities slot their widgets into the same screen by importing components or by extending the screen's layout.
**Trade-off:** "Owns the route" is a soft contract; the screen layout will keep evolving as more capabilities land. The change description for each later capability will note what it added to `/`.

## Risks / Trade-offs

- **Midnight boundary** → Server validates "today" against the user's tz; client re-derives "today" on focus and via a 1-minute interval. The bad case is the user tapping the toggle within the same JS tick the date rolls over. Acceptable: server returns 422, client refreshes the date and the user sees a fresh empty card.
- **Optimistic update lying about success** → Mitigated by quick revert on error. The visual transition is fast either way; users learn the toggle is tentative until the inline state stabilizes.
- **Race: toggle then immediately type a note** → Two writes in flight. Server processes them serially; second response wins for whatever fields it touched. Idempotent toggle means this is fine. Note-only updates don't touch `wrote`, so they don't clobber.
- **Note loss on tab close before blur** → Acceptable for v1. Add `visibilitychange` save later if needed.
- **Row growth** → Linear in active days per user. Not a concern at this scale.

## Migration Plan

Single migration creating the `daily_logs` table with composite unique index on `(user_id, date)`. No backfill — the table starts empty. Rollback: drop the table.

## Open Questions

- **Does `streaks` need a denormalized cache column on `users` (e.g., `current_writing_streak`) or compute on-read?** Defer to that change. This spec stays naive: just rows.
- **Should the read endpoint paginate?** With a 366-day cap, no — at most ~366 small rows. Revisit if the cap ever grows.
- **Tab bar — who owns it?** This change ships a minimal stub (Today + Settings); `add-history-view` will add its tab. No formal "navigation" capability — it stays as frontend chrome shared across routes.
