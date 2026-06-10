## MODIFIED Requirements

### Requirement: Backend SHALL issue a magic link in response to an email submission

The backend SHALL accept an email address, normalize it (trimmed, downcased), and validate its format. When the request is within rate limits and the email is well-formed, the backend SHALL find or create a `User` with that email, generate a single-use token, persist a `MagicLink` record bound to that user with the token's digest and a 15-minute expiry, and send the user an email containing a URL with the raw token. A `User` row SHALL NOT be created for requests that are rejected by rate limiting or that otherwise never issue a link, so that anonymous traffic cannot grow the users table unbounded. The HTTP response SHALL be identical regardless of whether the email belonged to an existing user, to avoid disclosing account membership.

#### Scenario: New email requests a link
- **WHEN** the client POSTs `/magic_links` with an email that does not match any existing user and the request is within rate limits
- **THEN** the backend creates a `User` with that email, creates a `MagicLink` for that user, sends a sign-in email, and responds 200 with a generic "if that account exists, we sent a link" payload

#### Scenario: Existing email requests a link
- **WHEN** the client POSTs `/magic_links` with an email matching an existing user
- **THEN** the backend creates a new `MagicLink` for that user, invalidates that user's prior outstanding links, sends the email, and responds 200 with the same generic payload

#### Scenario: Email is malformed
- **WHEN** the client POSTs `/magic_links` with a value that is not a valid email
- **THEN** the backend responds 422 with a validation error and does not create a user or send mail

#### Scenario: Over-limit request creates no user
- **WHEN** a request is rejected by rate limiting for an email that does not yet have a `User`
- **THEN** the backend responds 200 with the generic payload and does not create a `User`, `MagicLink`, or send mail

### Requirement: Backend SHALL rate-limit magic link requests per email

The backend SHALL allow at most 5 magic-link requests per email address per rolling 60-minute window. The backend SHALL additionally apply a per-client-IP rate limit to `POST /magic_links` so that a single source cannot spray requests across many distinct emails. Requests beyond either limit SHALL receive the same generic 200 response without sending mail or creating a `MagicLink` record (and, for an email with no existing account, without creating a `User`).

#### Scenario: Within the limit
- **WHEN** an email has been used for fewer than 5 link requests in the last 60 minutes and the client IP is within its limit
- **THEN** the request is processed normally and an email is sent

#### Scenario: Over the per-email limit
- **WHEN** an email has already been used for 5 link requests in the last 60 minutes
- **THEN** the backend responds 200 with the generic payload but does not send a new email or create a new `MagicLink`

#### Scenario: Over the per-IP limit
- **WHEN** a single client IP exceeds the configured per-IP request budget for `POST /magic_links` within the window
- **THEN** further requests from that IP are throttled and receive the generic 200 payload (or a 429), without sending mail or creating records

### Requirement: Backend SHALL verify magic links and establish a session

The backend SHALL look up a `MagicLink` by the digest of the raw token from the magic-link URL and reject the request if the link is missing, expired, or already consumed. Token validity SHALL remain 15-minute, single-use. Consuming the link (marking `consumed_at` and establishing a session) SHALL NOT occur on a side-effect-free `GET`, so that email-security scanners and link-prefetchers — which issue GET requests — cannot burn a valid one-time link before the user acts. The `GET /magic_links/:token` endpoint SHALL validate the token and present a confirmation step; the actual consume-and-sign-in SHALL occur on an explicit `POST`. On success the session SHALL be established with a `Set-Cookie` header whose transport attributes (`Secure`, `SameSite`) are chosen so the header is actually emitted and accepted under the current environment's transport (HTTP in local development, HTTPS elsewhere), and the user SHALL be redirected to the app's authenticated landing path.

#### Scenario: GET on a valid link does not consume it
- **WHEN** a prefetcher or scanner issues `GET /magic_links/<token>` for a valid, unconsumed, unexpired link
- **THEN** the link's `consumed_at` remains null, no session is established, and a subsequent user-initiated confirmation can still consume it

#### Scenario: Confirmed sign-in consumes the link and establishes a session
- **WHEN** the user confirms sign-in via the explicit POST for a valid, unconsumed, unexpired link
- **THEN** the backend sets `consumed_at = now`, establishes a session for the link's user, and the response carries the session `Set-Cookie` header

#### Scenario: Expired link
- **WHEN** the link's `expires_at` is in the past
- **THEN** the backend does not establish a session and the user is sent to the sign-in screen with an "expired" message

#### Scenario: Already-consumed link
- **WHEN** the link's `consumed_at` is not null
- **THEN** the backend does not establish a session and the user is sent to the sign-in screen with an "already used" message

#### Scenario: Unknown token
- **WHEN** no `MagicLink` row matches the digest of the supplied token
- **THEN** the backend does not establish a session and the user is sent to the sign-in screen with a generic invalid-link message
