# Scoreboard backend

Rails 8.1, PostgreSQL, API-only. Sessions and cookies are added back manually
because the magic-link flow needs them (see `config/application.rb`).

## Setup

Postgres runs in a local Docker container — see `docker-compose.yml`.

```sh
docker compose up -d        # start Postgres on :5432 (data persists in a named volume)
bundle install
bin/rails db:prepare        # create + migrate development and test databases
```

To wipe the database (drops the volume):

```sh
docker compose down -v
```

The defaults (`scoreboard` / `scoreboard` / `localhost:5432`) match the env
fallbacks in `config/database.yml`. Override with `DATABASE_HOST`,
`DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` if you
point Rails at a different Postgres.

## Run

```sh
bin/rails server   # http://localhost:3000
```

## Magic-link sign-in flow (development)

1. Start the backend (`bin/rails server`) and the frontend
   (`npm run dev` from `../frontend`).
2. Open `http://localhost:5173/sign-in` and submit your email.
3. Open the dev mailbox at `http://localhost:3000/letter_opener` to see the
   email and click the sign-in link.
4. The link points at `GET /magic_links/:token` on the backend, which:
   - Marks the link consumed,
   - Sets a session cookie,
   - Redirects to `http://localhost:5173/`.
5. Subsequent requests from the frontend (with `credentials: 'include'`) carry
   the session cookie and authenticate as that user. Sign out via
   `DELETE /sessions/current`.

If a link is invalid, expired, or already used, the backend redirects to
`http://localhost:5173/sign-in?error=<invalid|expired|consumed>` and the
sign-in screen surfaces the matching message.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/magic_links` | Request a magic link for an email. Always responds 200 with a generic message (or 422 on a malformed email). Rate-limited to 5 per email per 60 minutes. |
| GET    | `/magic_links/:token` | Verify a magic link, set the session cookie, redirect into the app. |
| GET    | `/me` | Return `{ id, email, settings }` for the signed-in user, or 401. |
| PATCH  | `/me/settings` | Partial update of the four user settings fields. Returns the full updated settings on success, 422 on validation failure (transactional — no field is updated). Unknown keys are silently ignored. |
| DELETE | `/sessions/current` | Sign out (idempotent). |
| GET    | `/daily_logs/:date` | Return the user's row for that date, or defaults (`wrote: false, wrote_at: null, note: null`) if absent. Future dates → 422. |
| PUT    | `/daily_logs/:date` | Partial update with `{ wrote?, note? }`. Idempotent — re-asserting the same `wrote` is a no-op. Allowed only when `:date` equals the user's local today. |
| GET    | `/daily_logs?from=&to=` | Range read. Defaults: `from = today − 90 days`, `to = today`. Inverted or >366-day ranges → 422. |
| GET    | `/week_logs/:week_start_date` | Return the user's row for that week-start, or defaults (`published: false`) if absent. Future weeks → 422. |
| PUT    | `/week_logs/:week_start_date` | Partial update with `{ published? }`. Idempotent. Allowed only when `:week_start_date` equals the user's current week-start. |
| GET    | `/week_logs?from=&to=` | Range read. Defaults: `from = this_week_start − 12 weeks`, `to = this_week_start`. Inverted or >728-day ranges → 422. |

`GET` and `PUT` responses for the per-day and per-week endpoints also include a
streak field — `writing_streak` and `publishing_streak` respectively —
computed freshly from the database state after any mutation in the same
request. Range (`index`) responses do not include these fields.

### User settings

The `User` record carries four configuration fields, surfaced by `GET /me` as a
`settings` sub-object and updated via `PATCH /me/settings`:

| Field | Type | Default | Validation | Consumers |
| ----- | ---- | ------- | ---------- | --------- |
| `reminder_time` | `string \| null` | `null` | Matches `HH:MM` (24-hour, `HH` ∈ `00..23`, `MM` ∈ `00..59`) or is null | `daily-reminder` (fire time of the daily nudge) |
| `week_starts_on` | `integer` | `1` | `0` (Sunday) or `1` (Monday) | `weekly-publishing`, history views |
| `publishing_cadence` | `string` | `'weekly'` | `weekly` or `biweekly` | `streaks` (publish-streak window) |
| `timezone` | `string \| null` | `null` | Recognized IANA name (via `ActiveSupport::TimeZone[…]`) or null | `daily-reminder`, `Time::ForUser.today` |

- **Single source of truth.** Other capabilities should *read* these fields,
  never duplicate them. Adding a new per-user preference column is the V1
  guideline only for fields shared across more than one capability.
- **Atomic validation.** `PATCH /me/settings` validates the whole update
  before persisting anything — if any field fails, the response is 422 and no
  field is changed.
- **Timezone contract.** The frontend sends `timezone` on every PATCH (auto-
  detected from `Intl.DateTimeFormat().resolvedOptions().timeZone`); the user
  does not pick it explicitly. `timezone` together with `reminder_time` is the
  contract that `daily-reminder` will rely on to compute each user's UTC fire
  instant — any change to these two fields (rename, type change, validation
  shape) must be coordinated with that capability.

### Daily logs

- **One row per (user, date)**, created lazily on first interaction. Absent rows are treated as "no activity," not missing data.
- **Today-only mutability.** `PUT /daily_logs/:date` is rejected with `{ error: { code: "date_not_editable" } }` unless `:date` matches `Time::ForUser.today(current_user)`. Past entries are read-only by product rule ("what happened, happened"). Future dates are also rejected on read (`date_not_readable`) and write.
- **Today is per-user.** `Time::ForUser.today` resolves `Time.current` against the user's `timezone` setting (falls back to UTC if null, blank, or unrecognized). At 23:59 NY-local on 2026-05-08, `:date = 2026-05-08` is still valid even though UTC is already 2026-05-09.
- **`wrote_at` tracks the flip.** It is set when `wrote` transitions false → true and cleared when it transitions true → false. Re-asserting the same value does not move it. A note-only update never touches `wrote` or `wrote_at`.
- **Blank notes normalize.** A whitespace-only or empty `note` is persisted as `NULL`.
- **Range read limits.** `(to − from)` is capped at **366 days**; longer ranges respond 422 with `range_too_large`. Inverted (`from > to`) responds 422 with `invalid_range`. The cap prevents accidental full-table scans from downstream consumers (`history-view`, `streaks`).
- **All queries are scoped to `current_user.daily_logs`.** Unauthenticated requests get 401; cross-user reads or writes are impossible via these endpoints.

### Week logs

- **One row per (user, week_start_date)**, created lazily on first interaction. `week_start_date` is a `Date` representing the first day of the week in the user's anchor (`week_starts_on = 0` → Sunday, `1` → Monday). Absent rows mean "no publish recorded that week."
- **Current-week-only mutability.** `PUT /week_logs/:week_start_date` is rejected with `{ error: { code: "week_not_editable" } }` unless `:week_start_date` matches `Time::ForUser.this_week_start(current_user)`. Past weeks are read-only by the same "what happened, happened" rule as daily logs.
- **Week boundary is per-user.** `Time::ForUser.this_week_start(user)` resolves `Time.current` against the user's `timezone` and then walks back to the most recent day matching `week_starts_on`. A Sunday-anchored user on a Saturday gets the prior Sunday; a Sunday-anchored user on a Sunday gets that same Sunday.
- **Changing `week_starts_on` does NOT re-align historical rows.** A user who flips between Sunday- and Monday-anchored keeps existing `WeekLog` rows on whichever grid they were written. Streak computation (lands with `add-streaks`) must therefore tolerate slightly off-grid historical rows — window by date range rather than exact-match lookup against the user's current anchor.
- **Range read limits.** `(to − from)` is capped at **728 days** (≈ 104 weeks); longer ranges respond 422 with `range_too_large`. Inverted (`from > to`) responds 422 with `invalid_range`. The cap protects against accidental full-table scans from `history-view` and `streaks`.
- **All queries are scoped to `current_user.week_logs`.** Unauthenticated requests get 401; cross-user reads or writes are impossible via these endpoints.

### Streaks

The `StreakCalculator` service (`app/services/streak_calculator.rb`) computes
two streaks on demand from existing rows.

- **Writing streak.** Walks back day-by-day from `Time::ForUser.today(user)`
  over `DailyLog` rows with `wrote = true`. The walk tolerates an unmarked
  "today" by falling back to "yesterday" as the anchor — so a streak survives
  through the morning before the user has checked in. Returns `0` if neither
  today nor yesterday is `wrote = true`. A `wrote = false` row at today is
  treated the same as a missing row (the user toggled it off; the streak walks
  from yesterday).
- **Publishing streak.** Cadence-aware via `user.publishing_cadence`. The
  `weekly` variant is symmetric to the writing streak but stepped in 7-day
  chunks against `WeekLog`. The `biweekly` variant counts consecutive 2-week
  buckets sliding back from the current bucket `[this_week_start, this_week_start − 7]`,
  where a bucket counts if at least one of its two weeks has `published = true`.
  Both variants tolerate one period of grace before "this period" is checked.
- **Tolerant week lookup.** Because changing `week_starts_on` does not realign
  historical `WeekLog` rows, the calculator checks "is week W published?" by
  asking whether any row falls in the 7-day window `[anchor, anchor + 6 days]`
  with `published = true` — not by exact-match anchor lookup.
- **On-demand by design.** Streaks are recomputed per request from the rows
  themselves; there is no `users.current_writing_streak` cache column.
  Introducing a denormalized cache should be a measured decision (driven by
  observed slow requests or query counts), not the default — the current
  walk is bounded to the last four years and does a single indexed query
  per streak.

## CORS, cookies, CSRF (dev vs prod)

**Development** (frontend `:5173`, backend `:3000`):

- `rack-cors` allows `http://localhost:5173` with `credentials: true`.
- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure=false`. The two ports
  are different origins but the *same site* under SameSite's eTLD+1 rule
  (`localhost` has no registrable domain, so host equality applies — both are
  `localhost`), so `Lax` is sent on top-level navigations (the magic-link
  click) and on same-site credentialed fetches (`/me` from React). `Secure`
  must be `false` because Rack's session middleware refuses to emit a
  `Secure` cookie over plain HTTP and would silently drop the `Set-Cookie`
  header.
- CSRF tokens are not used. Defense-in-depth comes from the CORS allowlist
  plus same-site cookies; see `app/controllers/application_controller.rb`.

**Production** (defer to first deploy):

- Decide same-origin (Rails serves the SPA) vs split-origin (separate CORS).
- Set `FRONTEND_URL` so `rack-cors` and post-verification redirects point at
  the right host.
- Session cookie defaults to `SameSite=Lax; Secure=true` in production
  (config in `config/application.rb`). Same-origin can leave that as-is;
  split-origin needs `SameSite=None; Secure` so the cookie crosses origins
  on credentialed fetches.
- Force HTTPS (`config.force_ssl = true`).
- Configure a real mail provider (`config.action_mailer.smtp_settings`).
- Provision four databases on the production Postgres
  (`scoreboard_production`, `_cache`, `_queue`, `_cable`) and supply the
  matching `DATABASE_URL` / `CACHE_DATABASE_URL` / `QUEUE_DATABASE_URL` /
  `CABLE_DATABASE_URL`. The Solid* gems each run on their own database.

## Tests

```sh
bin/rails test
```
