## ADDED Requirements

### Requirement: Backend SHALL persist authenticated sessions for 90 days

After a successful magic-link verification, the session cookie SHALL remain valid for 90 days from issue unless the user signs out or the client clears the cookie. Magic-link token expiry (15 minutes, single-use) SHALL remain independent of session lifetime.

#### Scenario: Session cookie carries a 90-day lifetime
- **WHEN** the user GETs `/magic_links/<token>` for a valid, unconsumed, unexpired link
- **THEN** the `Set-Cookie` header for `_scribe_session` is a persistent cookie expiring approximately 90 days after issue (via `Max-Age` or `Expires`)

#### Scenario: Session survives beyond the magic-link token window
- **WHEN** the user signed in via a consumed magic link and later GETs `/me` with the session cookie within 90 days of sign-in
- **THEN** the backend responds 200 without requiring a new magic link

#### Scenario: Sign-out still ends the session immediately
- **WHEN** an authenticated user DELETEs `/sessions/current`
- **THEN** subsequent GETs `/me` with the prior session cookie respond 401 regardless of the 90-day window
