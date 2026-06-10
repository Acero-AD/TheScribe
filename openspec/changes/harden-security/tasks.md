## 1. Push endpoint validation (SSRF) — `daily-reminder`

- [x] 1.1 Add a push-endpoint validator (e.g. `app/models/push_subscription.rb` validation or a `PushEndpointValidator` service) that accepts only absolute `https` URLs whose host matches a configured provider allowlist (FCM `*.googleapis.com`/`fcm.googleapis.com`, Mozilla `*.push.services.mozilla.com`, WNS `*.notify.windows.com`, Apple `*.push.apple.com`).
- [x] 1.2 Reject any endpoint whose host is loopback, link-local, or a private range, and any host not on the allowlist. (Allowlist-only inherently rejects these — covered by tests.)
- [x] 1.3 Put the allowlist in config (e.g. `config/initializers/` or an app config) so providers can be added without code changes. (`config/initializers/push_providers.rb`)
- [x] 1.4 In `app/controllers/push_subscriptions_controller.rb#create`, return 422 (`invalid_subscription`) when validation fails, before persisting.
- [x] 1.5 Tests: 201 for an allowlisted https endpoint; 422 for `http://`, for a non-allowlisted host, and for loopback/link-local/private hosts (e.g. `169.254.169.254`, `localhost`, `10.0.0.5`); assert no row is persisted and no outbound request is made.

## 2. Magic-link throttling & deferred user creation — `account-access`

- [ ] 2.1 Add `rack-attack` to the `Gemfile`; add `config/initializers/rack_attack.rb` using the Solid Cache store, throttling `POST /magic_links` per client IP over a rolling window.
- [ ] 2.2 In `app/controllers/magic_links_controller.rb#create`, validate email format and look up an existing user; create the `User` only inside the issue path (after the per-email rate check passes) so over-limit / never-issued requests insert nothing.
- [ ] 2.3 Preserve the generic 200 response for all rejected cases (format-valid but throttled) so account enumeration stays blocked; keep the 422 for malformed email.
- [ ] 2.4 Tests: over-limit request for a brand-new email creates no `User`/`MagicLink` and sends no mail; per-IP throttle kicks in after the budget; happy path unchanged.

## 3. Prefetch-safe magic-link verification — `account-access`

- [ ] 3.1 Change `GET /magic_links/:token` to validate the token (exists, not expired, not consumed) WITHOUT consuming it or establishing a session — render/redirect to a confirmation step carrying the token.
- [ ] 3.2 Add the consume action on an explicit `POST` (e.g. `POST /magic_links/:token/consume`) that marks `consumed_at`, signs the user in, and redirects to the app; keep the `invalid`/`expired`/`consumed` redirects.
- [ ] 3.3 Update `config/routes.rb` for the new POST route; update `frontend/src/screens/SignInScreen.tsx` (and any confirm view) for the interstitial/confirm copy if the SPA drives the POST.
- [ ] 3.4 Tests: a GET on a valid link leaves `consumed_at` null and creates no session; the POST consumes once and signs in; second POST shows "already used"; expired/invalid paths unchanged.

## 4. Host authorization & mailer host — `deploy-backend`

- [x] 4.1 In `config/environments/production.rb`, set `config.hosts` to the backend's production domain and exclude the `/up` health check via `config.host_authorization`.
- [x] 4.2 Make the mailer host fail loudly: require `APP_HOST` (no silent `localhost` default) so production boot fails if it is unset.
- [ ] 4.3 Tests/verify: request with the configured Host is served; an unexpected Host is rejected; `/up` still succeeds; booting without `APP_HOST` raises. [needs deploy/prod-boot; ruby -c syntax verified]

## 5. Secret handling & rotation — `deploy-backend`

- [ ] 5.1 Move workstation deploy secrets out of `backend/.env.deploy`: source them from a secrets manager (e.g. `kamal secrets fetch`) or the deploy environment; ensure no live credential remains in cleartext in any working-tree file.
- [ ] 5.2 Rotate the exposed credentials: regenerate `RAILS_MASTER_KEY` (re-encrypt credentials), reset the Neon Postgres role password, revoke + reissue the `RESEND_API_KEY`, and revoke + reissue the GHCR PAT.
- [ ] 5.3 Update the GitHub Actions secrets / deploy environment with the rotated values; confirm a deploy still resolves every secret via `.kamal/secrets`.
- [ ] 5.4 Add a check (CI or documented script) asserting no plaintext secret pattern (`ghp_`, `re_`, master-key hex, DB password) is present in the working tree.

## 6. SPA security headers — `deploy-frontend`

- [x] 6.1 Add `frontend/public/_headers` setting `Content-Security-Policy` (scripts/styles `self`, `connect-src` = self + production backend origin, `img-src 'self' data:`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Build confirmed to emit `_headers` and `_redirects` into `dist/`.
- [ ] 6.2 Verify the deployed bundle loads and reaches the backend API under the CSP (start in `Content-Security-Policy-Report-Only` if needed, then enforce). [needs deploy]
- [ ] 6.3 Confirm framing is blocked and the existing `_redirects` SPA fallback still works. [needs deploy]

## 7. Note length cap — `daily-check-in`

- [x] 7.1 Add a `note` length validation to `app/models/daily_log.rb` (a few-KB cap) returning 422 on violation.
- [x] 7.2 Tests: an over-length note is rejected with 422 and not persisted; a normal note still saves.

## 8. Verify

- [ ] 8.1 Run the full backend test suite via Docker Compose and the frontend vitest suite; all green.
- [ ] 8.2 Manual smoke: register a real push subscription still works; sign-in via magic link still works end-to-end with the new confirm step; deployed frontend loads under the CSP.
