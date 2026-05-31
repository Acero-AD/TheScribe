## Context

Scribe authenticates via email magic link. Clicking a valid link consumes the one-time token and establishes a Rails `CookieStore` session (`_scribe_session`). The magic link expires in 15 minutes (`MagicLink::TOKEN_TTL`); that is intentional and stays as-is.

The session cookie is configured in `backend/config/application.rb` without `expire_after`, so Rails emits a **browser session cookie** (no `Max-Age` / `Expires`). Users lose auth when the browser/PWA session ends and must request another magic link — even though the original `add-account-access` design listed "sessions persist across browser sessions" as a goal and flagged session lifetime as an open question to revisit when users complain.

## Goals / Non-Goals

**Goals:**
- Keep users signed in for 90 days after a successful magic-link verification on the same device/browser.
- Preserve existing sign-out behavior (explicit `DELETE /sessions/current` still clears the session immediately).
- Leave magic-link security unchanged (15-minute, single-use tokens).
- Lock the behavior in with an integration test on the `Set-Cookie` header.

**Non-Goals:**
- Sliding/expiring sessions refreshed on activity.
- "Remember me" checkbox or per-device session management UI.
- Changing magic-link TTL or rate limits.
- Server-side session store or revocation beyond sign-out.

## Decisions

**Decision: Set `expire_after: 90.days` on `CookieStore`.**
Rails' `ActionDispatch::Session::CookieStore` accepts `expire_after` to emit a persistent cookie. One line in `application.rb` aligns implementation with the original product goal. Alternative considered: 30 days — rejected per product preference for a quarter-year stay-signed-in window on a low-risk writing tracker.

**Decision: Keep magic-link TTL at 15 minutes.**
Session length and link TTL are separate concerns. Short link TTL limits exposure of the URL in email/history; long session TTL improves daily use after the first click. No change to `MagicLink::TOKEN_TTL`.

**Decision: Assert cookie lifetime in the magic-link verify integration test.**
Rails may emit either `Max-Age` or `Expires` on `Set-Cookie`. The test accepts either form and verifies ~90 days, matching the wire-level assertion pattern already used for `_scribe_session` presence.

## Risks / Trade-offs

- [Stolen session cookie usable longer] → Mitigation: cookie remains `HttpOnly`, `Secure` in production, `SameSite=Lax`; user can sign out; acceptable for this app's risk profile.
- [Existing signed-in users keep old session cookies until browser clears them] → Mitigation: no migration needed; new logins get 90-day cookies; old session cookies expire naturally with browser session.
- [PWA / mobile browser cookie eviction policies may still drop cookies early] → Mitigation: out of scope; 90 days is the server intent; OS-level storage limits are unchanged.

## Migration Plan

Config-only deploy. No database changes. Roll back by removing `expire_after` from session config and redeploying.

## Open Questions

- None for v1. Revisit if users want explicit "sign out everywhere" or shorter sessions on shared devices.
