## Why

Scoreboard's check-ins, streaks, notes, and reminders are all per-user data. Before any of those capabilities can be built, the product needs a way for a person to identify themselves and have their state persist across devices. Per `docs/scoreboard-app.md`, the chosen approach is magic-link auth — no OAuth, no passwords — to keep the signup friction near zero while still supporting a multi-user Rails backend with sync.

This is the foundational capability: every other V1 capability (`daily-check-in`, `weekly-publishing`, `streaks`, `history-view`, `daily-reminder`, `user-settings`) depends on a `User` existing.

## What Changes

- New `User` record (id, email, timestamps) — the anchor for all per-user data.
- Magic-link request flow: user enters email, backend issues a single-use, time-limited token, mailer sends a link.
- Magic-link verification flow: clicking the link consumes the token, creates a session, and lands the user on the app.
- Session management: cookie-based session keyed to the user, with a sign-out endpoint.
- Frontend email-entry screen and magic-link landing route — minimal UI, just enough to get someone signed in and out.
- Mailer configuration sufficient to send the magic-link email (dev: letter_opener-style preview; prod deferred until deploy).

## Capabilities

### New Capabilities
- `account-access`: Email-based identity for the app. Covers requesting a magic link, verifying it, establishing a session, and signing out. Does not cover profile fields beyond email — those land with `user-settings`.

### Modified Capabilities
<!-- None — this is the first capability. -->

## Impact

- **Backend (`backend/`)**: New `User` and `Session` (or token) models, new migrations, `SessionsController` + `MagicLinksController`, `UserMailer`, routes for `/sign_in`, `/magic_links`, `/sessions`, dev mailer config.
- **Frontend (`frontend/`)**: New routes/screens for email entry and magic-link landing, fetch wrapper that includes session cookie, a "signed in?" gate that redirects unauthenticated users to the sign-in screen.
- **Cross-cutting**: Establishes the auth contract every later capability will lean on (current user available server-side; `useCurrentUser`-style hook client-side).
- **Out of scope**: password auth, OAuth, account deletion (covered by Settings later), email change, multi-session management UI, rate limiting beyond a basic per-email throttle.
