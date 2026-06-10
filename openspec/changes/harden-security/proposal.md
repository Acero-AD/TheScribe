## Why

A security review of the backend and frontend surfaced seven hardening gaps, none of which are exploitable by accident but several of which are reachable by any authenticated user or any anonymous caller:

- **Server-Side Request Forgery (SSRF):** `POST /push_subscriptions` stores an arbitrary `endpoint` URL with no validation, and `SendReminderJob` later issues a server-side POST to it on a schedule. An authenticated user can point the endpoint at an internal address (`169.254.169.254`, `localhost`, RFC-1918) and have the backend make requests on their behalf.
- **Unbounded user creation / no HTTP-layer throttling:** `POST /magic_links` calls `find_or_create_by!` *before* the rate check, so any valid-format email permanently inserts a `users` row; the only throttle is per-email (5/hour) and there is no per-IP limit anywhere in the stack.
- **Magic-link consumed on GET:** verifying a link is a `GET` that signs the user in, so email-security scanners and link-prefetchers silently burn the single-use token before the user clicks.
- **Plaintext deploy secrets:** a live Rails master key, Postgres password, Resend key, and GitHub PAT sit in cleartext in the working-tree file `backend/.env.deploy`. It is gitignored and was never committed, but the values are exposed and the workstation file is the weak link.
- **Missing `Host` authorization:** `config.hosts` is commented out in production, so the backend answers on any `Host` header (DNS-rebinding / Host-header injection surface).
- **No SPA security headers:** the Cloudflare Pages build ships without `Content-Security-Policy`, `frame-ancestors`, `X-Content-Type-Options`, or `Referrer-Policy` — relevant defense-in-depth for a cookie-authenticated app.
- **Unbounded note length:** `DailyLog#note` is a `text` column with no validation, so a client can store arbitrarily large notes.

These are independent fixes that share a theme; bundling them keeps the hardening pass reviewable as one unit while each maps to a distinct capability spec.

## What Changes

- **Push endpoint validation (SSRF):** `POST /push_subscriptions` SHALL reject any `endpoint` that is not an `https` URL whose host belongs to a known Web Push provider allowlist, and SHALL never accept loopback, link-local, or private-range hosts.
- **Magic-link request throttling:** the backend SHALL apply a per-IP rate limit to `POST /magic_links` (in addition to the existing per-email limit) and SHALL NOT persist a new `User` row for an email until a link is actually issued (over-limit requests create nothing).
- **Prefetch-safe verification:** `GET /magic_links/:token` SHALL NOT consume the token or establish a session; it SHALL render a minimal confirmation interstitial whose action POSTs to consume the link. Token validity (15-minute, single-use) is unchanged.
- **Secret handling:** deploy secrets SHALL be sourced from a secrets manager / CI secrets rather than a plaintext working-tree file, and the affected live credentials SHALL be rotated.
- **Host authorization:** production SHALL restrict `config.hosts` to the backend's own domain, excluding the `/up` health check.
- **SPA security headers:** the frontend SHALL ship a Cloudflare Pages `_headers` file setting `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
- **Note length cap:** `DailyLog.note` SHALL be bounded by a maximum length, rejecting oversized notes with 422.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `daily-reminder`: the "Backend SHALL accept push subscription registration" requirement gains endpoint validation (https + provider allowlist, no private/loopback hosts) to close the SSRF vector.
- `account-access`: the per-email rate-limit requirement gains a per-IP limit and defers user creation past the limit check; the magic-link verification requirement changes the consuming step from `GET` to a POST-backed confirmation so prefetchers can't burn the token.
- `deploy-backend`: gains a secret-handling requirement (no plaintext working-tree secrets; rotate on exposure) and a `Host`-authorization requirement.
- `deploy-frontend`: gains a security-headers requirement for the published SPA.
- `daily-check-in`: the daily-log persistence requirement gains a maximum note length.

## Impact

- Backend: `app/controllers/push_subscriptions_controller.rb` (endpoint validation), a new push-endpoint validator, `app/controllers/magic_links_controller.rb` + `app/models/magic_link.rb` (defer user creation, POST-backed consume), `config/routes.rb` (consume route), `config/initializers/rack_attack.rb` (new) + `Gemfile` (`rack-attack`), `config/environments/production.rb` (`config.hosts`, fail-loud `APP_HOST`), `app/models/daily_log.rb` (note length validation).
- Frontend: `public/_headers` (new), `src/screens/SignInScreen.tsx` (handle the confirmation redirect copy if needed).
- Ops: rotate `RAILS_MASTER_KEY`, Neon DB password, `RESEND_API_KEY`, and the GHCR PAT; move workstation deploy secrets out of `backend/.env.deploy` into a manager; `backend/.kamal/secrets` and CI injection are unchanged.
- Tests: push subscription validation, magic-link rate/consume flow, daily-log note length; a CI/docs check that no plaintext secrets live in the working tree.
- No database schema migration is required (note length is enforced in the model); `rack-attack` adds a middleware and a cache-backed throttle store.
