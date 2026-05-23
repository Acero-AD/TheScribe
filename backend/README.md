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
| GET    | `/me` | Return `{ id, email }` for the signed-in user, or 401. |
| DELETE | `/sessions/current` | Sign out (idempotent). |

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
