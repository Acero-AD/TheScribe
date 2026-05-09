## 1. Backend — Models & migrations

- [ ] 1.1 Generate `User` model with `email:string` (citext or downcased on save), unique index on email, timestamps
- [ ] 1.2 Generate `MagicLink` model with `user:references`, `token_digest:string`, `expires_at:datetime`, `consumed_at:datetime`, unique index on `token_digest`, index on `(user_id, expires_at)`
- [ ] 1.3 Add email format validation and normalization (trim + downcase) on `User`
- [ ] 1.4 Add `MagicLink#valid_for_use?` (not consumed, not expired) and `MagicLink#consume!` helpers
- [ ] 1.5 Run migrations and verify schema

## 2. Backend — Magic-link issuance

- [ ] 2.1 Create `MagicLinksController#create` accepting `email`, find-or-create User, generate raw token, store digest, set 15-minute expiry
- [ ] 2.2 Invalidate prior outstanding `MagicLink` records for the user when a new one is issued
- [ ] 2.3 Build per-email rate limit (max 5 / 60 min rolling) — silent drop past the limit, still respond 200
- [ ] 2.4 Always respond 200 with the generic `{ message: "If that account exists, we sent a link." }` payload (except 422 for malformed email)
- [ ] 2.5 Route `POST /magic_links` to the controller

## 3. Backend — Mailer

- [ ] 3.1 Generate `UserMailer` with a `magic_link` action that takes a `User` and a raw token
- [ ] 3.2 Write the email view (text + HTML) containing the verification URL pointing at the backend's verify endpoint
- [ ] 3.3 Configure dev mail delivery (`letter_opener_web` or built-in mailer preview) — confirm clicking the link in dev works end-to-end
- [ ] 3.4 Add a mailer preview at `test/mailers/previews/user_mailer_preview.rb`

## 4. Backend — Verification & session

- [ ] 4.1 Create `MagicLinksController#show` (GET `/magic_links/:token`) that looks up by digest, checks expiry & consumption, marks consumed, signs the user in, redirects to the app's home URL
- [ ] 4.2 On expired/consumed/unknown token, redirect to the frontend `/sign-in` with an appropriate error code in the query string
- [ ] 4.3 Add a `Current` attributes module (or equivalent) holding `current_user`; populate from the session in an `ApplicationController` `before_action`
- [ ] 4.4 Add an `authenticate!` filter that responds 401 (JSON) when `current_user` is nil — used by API endpoints
- [ ] 4.5 Create `SessionsController#show` returning `{ id, email }` for `current_user`, route as `GET /me`
- [ ] 4.6 Create `SessionsController#destroy` that resets the session, route as `DELETE /sessions/current`, idempotent

## 5. Backend — Cookies, CSRF, CORS

- [ ] 5.1 Configure session cookie: `HttpOnly`, signed/encrypted, `SameSite=Lax` in same-origin / `None; Secure` in cross-origin contexts
- [ ] 5.2 Confirm CSRF protection is enabled and the frontend can fetch a CSRF token (or use Rails' `protect_from_forgery with: :null_session` for JSON if simpler — pick one and document)
- [ ] 5.3 Add `rack-cors` config allowing the dev frontend origin (`http://localhost:5173`) with `credentials: true` and the methods used here
- [ ] 5.4 Verify in dev: `fetch('/me', { credentials: 'include' })` from the Vite dev server returns 200 once signed in

## 6. Backend — Tests

- [ ] 6.1 Model tests: `User` email normalization & validation; `MagicLink` expiry, consumption, digest-only storage
- [ ] 6.2 Request specs for `POST /magic_links`: new email, existing email, malformed email, rate limit, generic response shape
- [ ] 6.3 Request specs for `GET /magic_links/:token`: valid, expired, already-consumed, unknown
- [ ] 6.4 Request specs for `GET /me`: authenticated, unauthenticated
- [ ] 6.5 Request specs for `DELETE /sessions/current`: signed-in, signed-out (idempotent)

## 7. Frontend — Plumbing

- [ ] 7.1 Add a router (`react-router-dom` or equivalent) with routes for `/sign-in` and `/` (home)
- [ ] 7.2 Add an API client wrapper that calls `fetch` with `credentials: 'include'` and a configurable backend base URL (env var)
- [ ] 7.3 Add a `useCurrentUser` hook that calls `GET /me` once on mount and exposes `{ user, status: 'loading' | 'signed-in' | 'signed-out' }`
- [ ] 7.4 Add a `RequireAuth` route wrapper that redirects to `/sign-in` when status is `signed-out`

## 8. Frontend — Sign-in screen

- [ ] 8.1 Build the `/sign-in` screen: email input, submit button, "Check your email" confirmation state, inline error state
- [ ] 8.2 Wire submission to `POST /magic_links`; on success swap to confirmation, on failure show retryable error
- [ ] 8.3 Read error code from the URL query string (`?error=expired|consumed|invalid`) and surface a matching message above the form

## 9. Frontend — Sign-out

- [ ] 9.1 Add a sign-out control to a placeholder authenticated layout (header or simple button)
- [ ] 9.2 On click: `DELETE /sessions/current`, clear the cached current user, route to `/sign-in`

## 10. Frontend — Tests

- [ ] 10.1 Unit/component tests for the sign-in form (submission states, error rendering)
- [ ] 10.2 Test for `RequireAuth` redirect behavior in each `useCurrentUser` status
- [ ] 10.3 Test for the sign-out flow (calls endpoint, clears state, navigates)

## 11. End-to-end verification (manual)

- [ ] 11.1 Start backend and frontend dev servers; from a fresh browser, request a link with a new email, click the link from `letter_opener`, land in the authenticated app
- [ ] 11.2 Reload the app and confirm the session persists
- [ ] 11.3 Sign out and confirm subsequent requests to `/me` return 401
- [ ] 11.4 Click an already-consumed link and confirm the user is redirected to `/sign-in` with the correct error
- [ ] 11.5 Wait past 15 minutes (or fake the clock) and confirm an expired link is rejected with the correct error

## 12. Documentation

- [ ] 12.1 Add a brief `backend/README.md` section on running the magic-link flow in dev (incl. `letter_opener` URL)
- [ ] 12.2 Add a brief `frontend/README.md` section on the env var pointing at the backend, and the sign-in flow
- [ ] 12.3 Note the dev-only CORS / cookie config and what changes for prod
