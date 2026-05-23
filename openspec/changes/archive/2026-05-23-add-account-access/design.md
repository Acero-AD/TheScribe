## Context

Scoreboard is a multi-user Rails 8.1 + React 19 (Vite) app. Per `docs/scoreboard-app.md`, the chosen identity model is **email + magic link** — no passwords, no OAuth. This is the first capability built; nothing else exists yet, so this design also establishes the auth contract that every later capability will lean on (`current_user` server-side, an authenticated-route gate client-side).

The repo uses Framing C: a single `openspec/` at the root, and each spec carries explicit Frontend + Backend requirements. This design follows the same split.

## Goals / Non-Goals

**Goals:**
- A user can sign in with only their email — request a link, click it, land in the app.
- Sessions are server-managed and persist across browser sessions on the same device.
- The full flow (request → email → click → app) works in development with no third-party email provider configured.
- The pattern established here is reusable: every later capability gets a `current_user` it can trust.

**Non-Goals:**
- Password authentication, OAuth, SSO.
- Production email delivery configuration (deferred until first deploy).
- Account deletion UI (lands with `user-settings`).
- Email change flow, multi-session management UI, device naming.
- Aggressive abuse defenses (CAPTCHA, IP-based throttling). Basic per-email throttle only.

## Decisions

### 1. Magic link over password / OAuth

**Choice:** Email + magic link.
**Why:** The product doc explicitly rejects OAuth ("no OAuth complexity at launch") and the entire product philosophy is "no friction to using the app." Passwords add a credential to manage and recover; OAuth adds a third-party dependency. Magic link is the minimum viable identity primitive that still gives us multi-device sync.
**Alternative considered:** Passphrase (doc mentioned this as a fallback). Rejected because passphrases have all the UX cost of passwords without the recovery infrastructure.

### 2. Separate `MagicLink` model, not a JWT

**Choice:** Persist a `MagicLink` row with `user_id`, `token_digest`, `expires_at`, `consumed_at`. The link URL contains the raw token; the database stores only its digest.
**Why:** A row gives us first-class single-use semantics (set `consumed_at`, refuse further use) and easy revocation. Storing only the digest means a database leak doesn't hand out working sign-in links. Rails 8's `has_secure_token` or `generates_token_for` could replace the model, but the model is simple enough and gives clean audit/expiry behavior.
**Alternative considered:** Signed JWT in the URL with no DB row. Rejected because we lose single-use enforcement (a JWT is valid until it expires) and revocation requires a denylist anyway.

### 3. Cookie-based session, not a token in localStorage

**Choice:** Rails encrypted, signed, `HttpOnly`, `SameSite=Lax` cookie. Frontend uses `fetch(..., { credentials: 'include' })`. See Decision 7 for the dev-vs-prod transport attributes.
**Why:** Cookies survive XSS better than localStorage (the JS context can't read `HttpOnly`). Rails session cookies are a well-trodden path; CSRF is handled with a per-session token included in non-GET requests.
**Alternative considered:** JWT in `Authorization: Bearer` header, stored in localStorage. Rejected for XSS exposure and the extra ceremony of refresh-token rotation we don't actually need.

### 4. Token TTL: 15 minutes, single-use

**Choice:** Magic link tokens expire 15 minutes after issue and become invalid the first time they're consumed. Each new request invalidates prior outstanding links for the same user.
**Why:** Short enough to limit replay risk if the email leaks (referer, browser history, mail logs); long enough that a user opening their phone to grab the link doesn't time out. Single-use prevents reuse if the URL is shared accidentally.

### 5. Per-email rate limit, not per-IP

**Choice:** Throttle magic-link requests at **5 per email per hour**, returning a generic "if that account exists, we sent a link" response either way.
**Why:** Prevents email-bombing a user. Per-IP limits punish shared networks without solving the abuse case. The generic response avoids leaking which emails are registered.

### 6. Dev email: Rails default mail preview / letter_opener; prod deferred

**Choice:** Use Rails' built-in mailer preview at `/rails/mailers/...` plus `letter_opener_web` (or equivalent) for clicking through links in dev. Production email provider config is out of scope for this change.
**Why:** Removes the "I need an SMTP account to test sign-in" blocker. Production delivery is its own engineering concern — the mailer code we write here is provider-agnostic.

### 7. Origin model for dev vs prod

**Dev:** Frontend on `:5173` (Vite), backend on `:3000` (Rails). CORS configured to allow the frontend origin with credentials. Session cookie is `SameSite=Lax; Secure=false`. `localhost:3000` and `localhost:5173` are different *origins* but the **same site** under SameSite's eTLD+1 rule (`localhost` has no registrable domain, so the spec falls back to host equality — both are `localhost`). `Lax` is sent on top-level navigations (covers the magic-link click) and on same-site credentialed fetches (covers `/me` from the React app), which is everything the dev flow needs. `Secure=false` is required: Rack's session middleware refuses to emit a `Secure` cookie over a plain-HTTP request, so leaving it `true` in dev silently strips the `Set-Cookie` header from the response and breaks sign-in. The "Chrome accepts Secure cookies on localhost" relaxation is a *browser-side* rule and doesn't help when the server never emits the cookie.

**Prod:** Decision deferred (split origin with proper CORS, or Rails serving the built SPA from the same origin). Whichever we pick, it's a config change, not a code change. Same-origin prod stays on `Lax`; split-origin prod needs `SameSite=None; Secure` (and HTTPS, which prod has anyway).

## Risks / Trade-offs

- **Email deliverability** → Magic-link emails are notorious for landing in spam. Mitigation: nothing to do at this stage; revisit when configuring the prod mail provider, including SPF/DKIM/DMARC.
- **Token in URL leaks via referer/history** → Mitigation: 15-minute TTL + single-use + plain link (no query string carrying the token after consumption — verify endpoint redirects to a clean URL post-consume).
- **User on a different device than where they requested** → Web link works anywhere, so this is by design and a feature. The session lands on whatever device clicked the link.
- **Cross-origin cookies in dev** → Easy to misconfigure. Two specific failure modes are worth calling out: (a) `Secure=true` with HTTP dev transport → Rack drops `Set-Cookie` entirely; (b) `SameSite=None` without `Secure` → browser rejects the cookie. Both fail silently with `ActionDispatch::IntegrationTest`, which carries the session jar in-process and so can't catch a missing `Set-Cookie` header on the response. Mitigation: bake the working config (`Lax`, `Secure=false` in dev) into the change, and assert on the actual `Set-Cookie` header in the magic-link verify integration test so a regression here is caught at the wire level.
- **Generic "we sent a link" response can mask typos** → Users who fat-finger their email get no feedback. Acceptable trade-off for not enumerating accounts.

## Migration Plan

This is the first capability; nothing to migrate. New tables (`users`, `magic_links`) ship via standard Rails migrations. No rollback strategy needed beyond `rails db:rollback`.

## Open Questions

- **Production origin model** — single-origin (Rails serves SPA) vs split-origin (separate CORS) — defer until first deploy.
- **Session lifetime** — Rails default (browser session) vs explicit "remember me" duration. Default for v1; revisit if users complain about being signed out.
- **Email provider for prod** — Postmark, Resend, SES, etc. Out of scope here.
