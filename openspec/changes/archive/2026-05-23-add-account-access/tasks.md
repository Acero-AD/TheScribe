## 1. Backend — Models & migrations

- [x] 1.1 Generate `User` model with `email:string` (citext or downcased on save), unique index on email, timestamps
- [x] 1.2 Generate `MagicLink` model with `user:references`, `token_digest:string`, `expires_at:datetime`, `consumed_at:datetime`, unique index on `token_digest`, index on `(user_id, expires_at)`
- [x] 1.3 Add email format validation and normalization (trim + downcase) on `User`
- [x] 1.4 Add `MagicLink#valid_for_use?` (not consumed, not expired) and `MagicLink#consume!` helpers
- [x] 1.5 Run migrations and verify schema

## 2. Backend — Magic-link issuance

- [x] 2.1 Create `MagicLinksController#create` accepting `email`, find-or-create User, generate raw token, store digest, set 15-minute expiry
- [x] 2.2 Invalidate prior outstanding `MagicLink` records for the user when a new one is issued
- [x] 2.3 Build per-email rate limit (max 5 / 60 min rolling) — silent drop past the limit, still respond 200
- [x] 2.4 Always respond 200 with the generic `{ message: "If that account exists, we sent a link." }` payload (except 422 for malformed email)
- [x] 2.5 Route `POST /magic_links` to the controller

## 3. Backend — Mailer

- [x] 3.1 Generate `UserMailer` with a `magic_link` action that takes a `User` and a raw token
- [x] 3.2 Write the email view (text + HTML) containing the verification URL pointing at the backend's verify endpoint
- [x] 3.3 Configure dev mail delivery (`letter_opener_web` or built-in mailer preview) — confirm clicking the link in dev works end-to-end
- [x] 3.4 Add a mailer preview at `test/mailers/previews/user_mailer_preview.rb`

## 4. Backend — Verification & session

- [x] 4.1 Create `MagicLinksController#show` (GET `/magic_links/:token`) that looks up by digest, checks expiry & consumption, marks consumed, signs the user in, redirects to the app's home URL
- [x] 4.2 On expired/consumed/unknown token, redirect to the frontend `/sign-in` with an appropriate error code in the query string
- [x] 4.3 Add a `Current` attributes module (or equivalent) holding `current_user`; populate from the session in an `ApplicationController` `before_action`
- [x] 4.4 Add an `authenticate!` filter that responds 401 (JSON) when `current_user` is nil — used by API endpoints
- [x] 4.5 Create `SessionsController#show` returning `{ id, email }` for `current_user`, route as `GET /me`
- [x] 4.6 Create `SessionsController#destroy` that resets the session, route as `DELETE /sessions/current`, idempotent

## 5. Backend — Cookies, CSRF, CORS

- [x] 5.1 Configure session cookie: `HttpOnly`, signed/encrypted, `SameSite=Lax` in same-origin / `None; Secure` in cross-origin contexts
- [x] 5.2 Confirm CSRF protection is enabled and the frontend can fetch a CSRF token (or use Rails' `protect_from_forgery with: :null_session` for JSON if simpler — pick one and document)
- [x] 5.3 Add `rack-cors` config allowing the dev frontend origin (`http://localhost:5173`) with `credentials: true` and the methods used here
- [x] 5.4 Verify in dev: `fetch('/me', { credentials: 'include' })` from the Vite dev server returns 200 once signed in

## 6. Backend — Tests

- [x] 6.1 Model tests: `User` email normalization & validation; `MagicLink` expiry, consumption, digest-only storage
- [x] 6.2 Request specs for `POST /magic_links`: new email, existing email, malformed email, rate limit, generic response shape
- [x] 6.3 Request specs for `GET /magic_links/:token`: valid, expired, already-consumed, unknown
- [x] 6.4 Request specs for `GET /me`: authenticated, unauthenticated
- [x] 6.5 Request specs for `DELETE /sessions/current`: signed-in, signed-out (idempotent)

## 7. Frontend — Plumbing

- [x] 7.1 Add a router (`react-router-dom` or equivalent) with routes for `/sign-in` and `/` (home)
- [x] 7.2 Add an API client wrapper that calls `fetch` with `credentials: 'include'` and a configurable backend base URL (env var)
- [x] 7.3 Add a `useCurrentUser` hook that calls `GET /me` once on mount and exposes `{ user, status: 'loading' | 'signed-in' | 'signed-out' }`
- [x] 7.4 Add a `RequireAuth` route wrapper that redirects to `/sign-in` when status is `signed-out`

## 8. Frontend — Sign-in screen

- [x] 8.1 Build the `/sign-in` screen: email input, submit button, "Check your email" confirmation state, inline error state
- [x] 8.2 Wire submission to `POST /magic_links`; on success swap to confirmation, on failure show retryable error
- [x] 8.3 Read error code from the URL query string (`?error=expired|consumed|invalid`) and surface a matching message above the form

## 9. Frontend — Sign-out

- [x] 9.1 Add a sign-out control to a placeholder authenticated layout (header or simple button)
- [x] 9.2 On click: `DELETE /sessions/current`, clear the cached current user, route to `/sign-in`

## 10. Frontend — Tests

- [x] 10.1 Unit/component tests for the sign-in form (submission states, error rendering)
- [x] 10.2 Test for `RequireAuth` redirect behavior in each `useCurrentUser` status
- [x] 10.3 Test for the sign-out flow (calls endpoint, clears state, navigates)

## 11. End-to-end verification (manual)

- [x] 11.1 Start backend and frontend dev servers; from a fresh browser, request a link with a new email, click the link from `letter_opener`, land in the authenticated app
- [x] 11.2 Reload the app and confirm the session persists
- [x] 11.3 Sign out and confirm subsequent requests to `/me` return 401
- [x] 11.4 Click an already-consumed link and confirm the user is redirected to `/sign-in` with the correct error
- [x] 11.5 Wait past 15 minutes (or fake the clock) and confirm an expired link is rejected with the correct error

## 12. Documentation

- [x] 12.1 Add a brief `backend/README.md` section on running the magic-link flow in dev (incl. `letter_opener` URL)
- [x] 12.2 Add a brief `frontend/README.md` section on the env var pointing at the backend, and the sign-in flow
- [x] 12.3 Note the dev-only CORS / cookie config and what changes for prod

## 13. Fix the dev session cookie not reaching the browser

The integration test passed but the real-browser flow silently broke: `GET /magic_links/:token` returned 302 with no `Set-Cookie` header, so the React app's `/me` always saw 401 and `RequireAuth` bounced back to `/sign-in`. Cause: Rack's session middleware refuses to emit a `Secure` cookie over plain-HTTP, and the dev session cookie was `Secure=true`. The integration test hid this because `ActionDispatch::IntegrationTest` carries the session jar in-process and never asserts on the response's `Set-Cookie`. See Decision 7 in `design.md`.

- [x] 13.1 In `backend/config/application.rb`, change the `Session::CookieStore` options so `same_site` is `:lax` in all environments and `secure` is `false` in development (production stays `Secure=true`; test keeps its existing behavior).
- [x] 13.2 Replace the inline "Chrome treats localhost as a secure context" comment near the session config with a short, accurate note: dev uses `Lax` because `:3000` and `:5173` are same-site under SameSite's eTLD+1 rule, and `Secure=false` is required so Rack actually emits the cookie over plain HTTP.
- [x] 13.3 Extend the "valid link consumes itself…" test in `backend/test/integration/magic_links_show_test.rb` to assert that `response.headers["Set-Cookie"]` is present and contains the configured session key (`_scoreboard_session`).
- [x] 13.4 Run `docker compose exec web bin/rails test` and confirm the suite is green, including the new assertion.
- [x] 13.5 Update the "CORS, cookies, CSRF (dev vs prod)" section of `backend/README.md`: dev cookie is `SameSite=Lax; Secure=false` (not `None; Secure`), drop the misleading "Chrome treats localhost as a secure context" sentence, and keep the existing note that split-origin prod will need `SameSite=None; Secure`.
- [x] 13.6 Re-run the manual end-to-end checks now unblocked by this fix: 11.1 (fresh browser request → click → land in app), 11.2 (reload preserves session), 11.3 (sign out → `/me` returns 401). Mark each completed in section 11.
