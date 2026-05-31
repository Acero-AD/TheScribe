## Why

Users are being signed out too often and must request a new magic link to use the app again. The magic-link token (15 minutes) is fine for the email click; the problem is the session cookie, which currently has no explicit lifetime and behaves as a browser session cookie. That contradicts the original account-access goal that sessions should persist across browser sessions on the same device. Setting a 90-day session lifetime fixes the day-to-day UX without weakening magic-link security.

## What Changes

- Backend session cookie (`_scribe_session`) SHALL persist for **90 days** after sign-in via magic link, unless the user signs out or clears cookies.
- Magic-link token TTL remains **15 minutes** and single-use — unchanged.
- Integration test SHALL assert the verify response emits a persistent cookie with ~90-day expiry.
- Account-access spec gains an explicit session-lifetime requirement.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `account-access`: Add requirement that authenticated sessions persist for 90 days; clarify that magic-link expiry is independent of session lifetime.

## Impact

- Backend: `config/application.rb` (`expire_after: 90.days` on `CookieStore`).
- Tests: `backend/test/integration/magic_links_show_test.rb` (assert persistent cookie lifetime).
- Spec: `openspec/specs/account-access/spec.md` (via delta in this change).
- No frontend code changes, API changes, or migrations.
