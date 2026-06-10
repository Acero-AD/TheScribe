## Context

The app is a Rails 8.1 API-only backend (cookie-session auth, magic links, Web Push via Solid Queue) and a React 19 / Vite SPA on Cloudflare Pages, deployed with Kamal to a single Hetzner VPS with a managed Neon Postgres. The review found that the code is otherwise well-scoped (every query runs through `current_user`; tokens are HMAC-digested; cookies are `HttpOnly`/`Secure`/`SameSite=Lax`). The gaps here are at the edges: input validation on the one user-supplied URL the server later calls (push endpoint), the absence of an HTTP-layer throttle, a one-time token consumed by a side-effecting GET, plaintext deploy secrets, and missing hardening headers.

This change groups them because they are small, independent, and each maps cleanly to an existing capability spec. None require a schema migration.

## Goals / Non-Goals

**Goals:**
- Make the push `endpoint` un-abusable as an SSRF primitive without breaking real Web Push providers (FCM, Mozilla autopush, WNS, Apple).
- Add a per-IP throttle to magic-link requests and stop persisting users for over-limit / never-issued requests.
- Make magic-link verification safe against email prefetchers without weakening the 15-minute single-use guarantee.
- Get live deploy secrets out of a plaintext working-tree file and rotated.
- Add `Host` allow-listing and SPA security headers as standard defense-in-depth.
- Bound note size.

**Non-Goals:**
- Replacing cookie-session auth with tokens, or changing the magic-link cryptography.
- Building a general-purpose WAF or bot-detection system (a single `rack-attack` throttle is the scope).
- Migrating secrets to a specific vendor's vault as a hard requirement — the spec requires "a manager / CI secrets," and the implementation may pick one (e.g. 1Password via `kamal secrets fetch`).
- Adding a nonce-based strict CSP that would require app changes to inline styles; the SPA uses inline `style` objects, so the initial CSP is pragmatic (see Decisions).

## Decisions

**Decision: Validate push endpoints with an https + provider-host allowlist, rejecting private/loopback/link-local hosts.**
`POST /push_subscriptions` parses `endpoint` as a URI and rejects it unless the scheme is `https` and the host matches a configured suffix allowlist of real push services (e.g. `*.googleapis.com`, `fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `*.push.apple.com`). As a backstop, any host that resolves to or is literally a loopback/link-local/private address is rejected. Rationale: an allowlist is the only robust SSRF defense here because the server *initiates* the request later; a blocklist of internal ranges alone can be bypassed via DNS. The allowlist lives in config so new providers can be added without code changes. Alternative considered: blocking only RFC-1918/loopback hosts — rejected as insufficient (DNS-rebinding, cloud metadata via non-standard IPs).

**Decision: Defer `User` creation until a link is actually issued, and add a per-IP `rack-attack` throttle.**
`MagicLinksController#create` validates the email format, then looks up an existing user; it creates a `User` only inside the issue path (after the rate check passes), so over-limit and never-issued requests insert nothing. A new `rack-attack` initializer throttles `POST /magic_links` per IP (a small budget per rolling window) using the existing Solid Cache store. The generic 200 response is preserved for all rejected cases so enumeration stays blocked. Rationale: the per-email limit alone neither bounds table growth (each new email = a row, pre-check) nor stops a single IP spraying many emails. Alternative considered: a database-unique "pending email" table — rejected as heavier than deferring the insert.

**Decision: Magic-link verification is a two-step GET-then-POST; the GET is side-effect-free.**
`GET /magic_links/:token` validates the token (existence, not-expired, not-consumed) and renders a minimal interstitial (or redirects the SPA to a confirm screen) that carries the token; the actual consume + sign-in happens on a `POST` (e.g. `POST /magic_links/:token/consume` or the SPA posting back). Prefetchers issue GETs, not POSTs, so they can no longer burn the token. Rationale: this is the standard mitigation and keeps the single-use/expiry semantics untouched — only the HTTP method that mutates state changes. The user-facing error redirects (`invalid` / `expired` / `consumed`) are unchanged. Alternative considered: detecting prefetch via headers (`Purpose: prefetch`) — rejected as unreliable across scanners.

**Decision: Source deploy secrets from a manager / CI; rotate the exposed values.**
`backend/.kamal/secrets` already reads from the deploy environment, and CI already injects from GitHub Actions secrets; the only offender is the workstation `backend/.env.deploy` holding raw values. The spec requires that no plaintext secret lives in a working-tree file and that exposed credentials are rotated (Rails master key, Neon password, Resend key, GHCR PAT). Implementation may use `kamal secrets fetch` from a password manager. Rationale: the file is gitignored and not in history, so the residual risk is local exposure + accidental future commit; rotation neutralizes what was already exposed.

**Decision: Pragmatic CSP plus the standard header set in a Pages `_headers` file.**
The SPA renders with inline `style` objects (not inline `<style>`/`<script>`), so `style-src` can stay strict without `unsafe-inline` for scripts. The CSP allows `self` for scripts/styles, `connect-src` for the backend API origin, `img-src 'self' data:`, and sets `frame-ancestors 'none'`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. Rationale: meaningful clickjacking + sniffing protection without an app refactor. Alternative considered: a nonce-based strict-dynamic CSP — deferred; it needs server-rendered nonces the static Pages host doesn't provide.

**Decision: Enforce note length in the model, not via a migration.**
`DailyLog` validates `note` length (e.g. a few-KB cap) and returns 422 on violation, rather than adding a DB `CHECK` constraint. Rationale: avoids a migration, gives a clean validation error, and matches how the controller already surfaces model errors.

## Risks / Trade-offs

- **[Push allowlist rejects a legitimate provider not yet listed]** → Mitigation: keep the allowlist in config and document how to extend it; cover the major providers (FCM, Mozilla, WNS, Apple) at launch.
- **[Per-IP throttle penalizes users behind shared NAT / corporate proxies]** → Mitigation: size the budget generously (sign-in is infrequent) and keep the generic 200 so a throttled user still sees "if that account exists…", not a hard error.
- **[Two-step verification adds a click]** → Mitigation: the interstitial is a single confirm button; copy makes clear the link is valid for 15 minutes and single-use.
- **[Rotating the Rails master key invalidates anything encrypted with it]** → Mitigation: the app's credentials are re-encrypted under the new key as part of rotation; sessions are signed by the secret_key_base derivation and will be reset, logging users out once (acceptable).
- **[CSP breaks an asset path or the API connection]** → Mitigation: derive `connect-src` from the same backend origin the build already embeds (`VITE_BACKEND_URL`); test the deployed bundle before cutover, and start with `Content-Security-Policy-Report-Only` if needed.
- **[Secret rotation is operational, not code, and can be missed]** → Mitigation: tasks list each credential explicitly and a check asserts no plaintext secret remains in the working tree.
