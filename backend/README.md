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
| GET    | `/history?month=YYYY-MM` | Bundled read for the History screen. Returns the user's `daily_logs` for that month, `week_logs` whose 7-day span overlaps the month, and three streak numbers (`writing_streak_current`, `writing_streak_best`, `publishing_streak_current`). Future months → 422; malformed `month` → 422. |

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
- **Best writing streak.** `StreakCalculator.best_writing_streak(user)` scans
  every `DailyLog` with `wrote = true` ordered by date and returns the longest
  run of consecutive dates seen. The walk is unbounded (no four-year lookback)
  so the all-time best is correct even for long-tenured users. Compute happens
  on every `/history` fetch — fast at v1 scale because the `(user_id, date)`
  index makes the scan cheap, and the bundled history endpoint is the only
  caller. If measurement later shows this scan dominating history latency,
  the obvious next step is a denormalized `users.best_writing_streak` column
  refreshed on `DailyLog` write.

## VAPID keys (for the daily reminder push channel)

The `daily-reminder` capability sends Web Push notifications via the `web-push`
gem; deliveries are signed with a VAPID keypair the server holds. The keys are
loaded by `config/initializers/vapid.rb` into `Rails.application.config.x.vapid`
with two source paths (credentials wins over ENV):

```yaml
# Rails credentials (preferred, esp. in production)
vapid:
  public_key:  "<base64url-encoded EC P-256 public key>"
  private_key: "<base64url-encoded EC P-256 private key>"
  subject:     "mailto:reminders@your-domain.example"
```

```
# ENV fallback (handy in dev/CI)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:reminders@your-domain.example
```

### Generate a keypair

```sh
docker compose exec web bin/rails runner \
  'k = WebPush.generate_key; puts "PUBLIC=#{k.public_key}"; puts "PRIVATE=#{k.private_key}"'
```

The output is base64url-encoded EC P-256, which is what `pushManager.subscribe`
expects on the browser side (the frontend converts the public key to a
`Uint8Array` before passing it to `applicationServerKey`).

### Where to put the keys

- **Production**: in Rails credentials. Edit with
  `EDITOR="vim --wait" docker compose exec web bin/rails credentials:edit -e production`
  (interactive). The `master.key` is the only thing that decrypts them.
- **Development**: either credentials (same pattern, `-e development`) or
  ENV vars in your shell / a local `.env`. ENV avoids touching the encrypted
  file when you're iterating.
- **Test**: the test suite stubs `WebPush.payload_send` so test-env keys are
  never used over the wire — leave them blank or stub them in `test_helper`.

### Rotation

The push protocol identifies subscriptions by the server's `applicationServerKey`,
so rotating VAPID keys invalidates every existing subscription. The flow:

1. Generate a new keypair.
2. Deploy the new keys to credentials.
3. The next dispatch round will fail with 410 Gone for old subscriptions and
   the send job's cleanup step will delete them.
4. Users re-subscribe by toggling the Settings row off and on again.

Treat rotation as a heavy operation and avoid it unless a key was compromised.

### Recurring dispatcher

`config/recurring.yml` registers `ReminderDispatcherJob` to run every minute
(cron `* * * * *`) on the `dispatcher` queue, both in development and
production. The job scans candidate users whose local time matches their
configured `reminder_time` and enqueues a per-user `SendReminderJob` for each
match. Solid Queue picks up the recurring entries on worker boot, so starting
the workers (`bin/jobs`) is enough to make reminders fire locally.

Production also runs `clear_solid_queue_finished_jobs` hourly to keep the
finished-jobs table from growing without bound.

## Daily-reminder pipeline

The end-to-end flow, in dependency order:

1. **VAPID keys** (above) are loaded into `Rails.application.config.x.vapid`.
2. **`GET /push_config`** returns `{ vapid_public_key }` so the frontend can
   subscribe without a build-time env var. Runtime delivery means rotation is
   "edit credentials, deploy, let old subs 410 out" — no bundle rebuild.
3. **`POST /push_subscriptions`** registers a device. `find_or_initialize_by`
   on `(user_id, endpoint)` makes a re-subscribe from the same device a key
   refresh, not a duplicate row. Each user has one row per browser/device.
4. **`ReminderDispatcherJob`** runs every minute (Solid Queue recurring) and
   enqueues `SendReminderJob` for users who are "due."
5. **`SendReminderJob`** performs the actual `web-push` delivery and writes
   the `ReminderLog` row.

### "Due" filter (dispatcher candidate set)

A user is due when ALL of:

- `reminder_time` and `timezone` are non-null.
- The user has at least one `PushSubscription`.
- No `DailyLog` for today with `wrote = true`.
- No `ReminderLog` for today.
- `Time.current.in_time_zone(user.timezone).strftime("%H:%M")` equals
  `reminder_time` exactly. Minute-precision, no window — if the dispatcher
  misses a minute (worker restart, lag), that day's reminder is lost.

### Suppression rule

The send job re-checks `DailyLog(today, wrote: true)` before doing anything,
guarding the race where a user checks in between dispatch and send. The
reminder is a nudge only for unfilled days; if the user already wrote, the
job is a no-op and no `ReminderLog` row is written.

### Idempotency

`ReminderLog` has a unique composite index on `(user_id, date)`. The send job
calls `ReminderLog.create!` before any `web-push` call; a uniqueness violation
(either `RecordInvalid` from AR validation or `RecordNotUnique` from the DB
constraint under contention) is caught and treated as "already sent today —
skip." The intentional trade-off: if the row is created but the push call
fails, the day is "done" — better one missed reminder than one duplicate.

### 410-Gone cleanup

`SendReminderJob`'s per-subscription rescue:

- `WebPush::ExpiredSubscription` (HTTP 410) or `WebPush::InvalidSubscription`
  (404) → `subscription.destroy`. The subscription is permanently invalid; we
  remove the row so it stops being a candidate.
- Any other exception is logged and swallowed. The `ReminderLog` row already
  gates the day, so a retry would skip; rather than retry-loop a failing
  endpoint, surface it in logs and move on.

### Operational checks

If reminders stop arriving, work down this list:

1. **Recurring job alive?** `docker compose exec web bin/jobs` should show
   `solid_queue` workers; `SolidQueue::RecurringExecution` rows for
   `reminder_dispatcher` should be advancing minute-by-minute.
2. **Credentials populated?** `Rails.application.config.x.vapid.public_key`
   must be set; the frontend's `/push_config` request will surface a clear
   error otherwise.
3. **Subscriptions present?** `PushSubscription.where(user: u).any?` — if
   empty, the user toggled off or their browser invalidated the sub. The
   user re-toggles in Settings to re-register.
4. **Logs?** `SendReminderJob` and `ReminderDispatcherJob` log at warn-level
   on delivery failure and skip events. Grep for `[SendReminderJob]` in the
   Rails log.
5. **DST or timezone setting drift?** A user whose `reminder_time` falls in
   the skipped hour of a DST transition gets no reminder that day; check
   `user.timezone` against the IANA name and confirm `Time.current.in_time_zone(tz)`
   yields the expected `HH:MM`.

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
