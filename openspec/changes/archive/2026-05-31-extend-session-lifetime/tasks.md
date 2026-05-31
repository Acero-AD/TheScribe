## 1. Backend: 90-day session cookie

- [x] 1.1 In `backend/config/application.rb`, add `expire_after: 90.days` to the `ActionDispatch::Session::CookieStore` config for `_scribe_session`.
- [x] 1.2 Confirm magic-link TTL (`MagicLink::TOKEN_TTL = 15.minutes`) is unchanged.

## 2. Tests

- [x] 2.1 In `backend/test/integration/magic_links_show_test.rb`, extend the valid-link test to assert the `Set-Cookie` header for `_scribe_session` is persistent with ~90-day lifetime (accept `Max-Age` or `Expires`).
- [x] 2.2 Confirm existing session tests (`sessions_test.rb`) still pass — sign-out clears the session regardless of expiry window.

## 3. Verify

- [x] 3.1 Run backend integration tests for magic links and sessions via Docker Compose; all green.
- [x] 3.2 Manually sign in, close and reopen the browser (or PWA), and confirm `/me` still returns 200 without a new magic link.
