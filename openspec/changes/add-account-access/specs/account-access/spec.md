## ADDED Requirements

### Requirement: Backend SHALL issue a magic link in response to an email submission

The backend SHALL accept an email address, find or create a `User` with that email (normalized: trimmed, downcased), generate a single-use token, persist a `MagicLink` record bound to that user with the token's digest and a 15-minute expiry, and send the user an email containing a URL with the raw token. The HTTP response SHALL be identical regardless of whether the email belonged to an existing user, to avoid disclosing account membership.

#### Scenario: New email requests a link
- **WHEN** the client POSTs `/magic_links` with an email that does not match any existing user
- **THEN** the backend creates a `User` with that email, creates a `MagicLink` for that user, sends a sign-in email, and responds 200 with a generic "if that account exists, we sent a link" payload

#### Scenario: Existing email requests a link
- **WHEN** the client POSTs `/magic_links` with an email matching an existing user
- **THEN** the backend creates a new `MagicLink` for that user, invalidates that user's prior outstanding links, sends the email, and responds 200 with the same generic payload

#### Scenario: Email is malformed
- **WHEN** the client POSTs `/magic_links` with a value that is not a valid email
- **THEN** the backend responds 422 with a validation error and does not create a user or send mail

### Requirement: Backend SHALL rate-limit magic link requests per email

The backend SHALL allow at most 5 magic-link requests per email address per rolling 60-minute window. Requests beyond the limit SHALL receive the same generic 200 response without sending mail or creating a `MagicLink` record.

#### Scenario: Within the limit
- **WHEN** an email has been used for fewer than 5 link requests in the last 60 minutes
- **THEN** the request is processed normally and an email is sent

#### Scenario: Over the limit
- **WHEN** an email has already been used for 5 link requests in the last 60 minutes
- **THEN** the backend responds 200 with the generic payload but does not send a new email or create a new `MagicLink`

### Requirement: Backend SHALL verify magic links and establish a session

The backend SHALL accept the raw token from a magic-link URL, look up the matching `MagicLink` by token digest, reject the request if the link is missing, expired, or already consumed, mark the link as consumed on success, set a session cookie identifying the user, and redirect to the app's authenticated landing path.

#### Scenario: Valid, unconsumed, unexpired link
- **WHEN** the user GETs `/magic_links/<token>` for a `MagicLink` whose `expires_at` is in the future and `consumed_at` is null
- **THEN** the backend sets `consumed_at = now`, establishes a session for the link's user, and redirects to the app

#### Scenario: Expired link
- **WHEN** the link's `expires_at` is in the past
- **THEN** the backend does not establish a session and redirects to the sign-in screen with an "expired" message

#### Scenario: Already-consumed link
- **WHEN** the link's `consumed_at` is not null
- **THEN** the backend does not establish a session and redirects to the sign-in screen with an "already used" message

#### Scenario: Unknown token
- **WHEN** no `MagicLink` row matches the digest of the supplied token
- **THEN** the backend does not establish a session and redirects to the sign-in screen with a generic invalid-link message

### Requirement: Backend SHALL expose the current user to authenticated requests

The backend SHALL provide a `/me` endpoint returning the authenticated user's id and email, and SHALL reject the request with 401 when no valid session is present. Other capabilities depending on identity SHALL use the same session mechanism.

#### Scenario: Authenticated request
- **WHEN** the client GETs `/me` with a valid session cookie
- **THEN** the backend responds 200 with `{ id, email }` for the session's user

#### Scenario: Unauthenticated request
- **WHEN** the client GETs `/me` with no session cookie or an invalid one
- **THEN** the backend responds 401

### Requirement: Backend SHALL terminate the session on sign-out

The backend SHALL accept a sign-out request, invalidate the current session, and respond with success. Subsequent requests with the prior session cookie SHALL be treated as unauthenticated.

#### Scenario: Signed-in user signs out
- **WHEN** an authenticated client DELETEs `/sessions/current`
- **THEN** the backend clears the session cookie and responds 200

#### Scenario: Sign-out without an active session
- **WHEN** a client DELETEs `/sessions/current` with no valid session
- **THEN** the backend responds 200 (idempotent) and no error is raised

### Requirement: Backend SHALL store only the digest of magic-link tokens

The backend SHALL never persist the raw token value. The token SHALL appear only in the email body and the verification request URL. The database column SHALL hold a one-way digest sufficient to look up the link by raw token at verification time but useless if leaked.

#### Scenario: Database inspection after a link is issued
- **WHEN** an operator inspects the `magic_links` table after a link has been issued
- **THEN** the raw token does not appear in any column; only the digest is present

### Requirement: Frontend SHALL provide an email-entry screen for unauthenticated users

The frontend SHALL render a sign-in screen at `/sign-in` with an email input and a submit action. On submit, it SHALL POST to the magic-link endpoint and display a confirmation message instructing the user to check their email. Unauthenticated users hitting any other route SHALL be redirected to `/sign-in`.

#### Scenario: Unauthenticated user opens the app
- **WHEN** a user with no valid session opens any app route other than `/sign-in` or the magic-link landing route
- **THEN** the frontend redirects them to `/sign-in`

#### Scenario: User submits their email
- **WHEN** the user enters an email and submits the form
- **THEN** the frontend POSTs to the magic-link endpoint with credentials and replaces the form with a "Check your email" confirmation message

#### Scenario: Submission fails with a network or server error
- **WHEN** the magic-link request returns a non-2xx response or fails to reach the server
- **THEN** the frontend surfaces an inline error and leaves the form interactive so the user can retry

### Requirement: Frontend SHALL handle the magic-link landing route

The frontend SHALL not host its own token-verification logic; the magic-link URL points at the backend, which performs the verification and redirects. After a successful verification redirect, the frontend SHALL recognize that the user is now signed in and route them to the app's home screen.

#### Scenario: User clicks a valid magic link
- **WHEN** the user clicks the magic-link URL from their email and the backend completes verification
- **THEN** the user lands in the authenticated app at the home screen

#### Scenario: User clicks an expired or invalid link
- **WHEN** the backend redirects with an error indicator
- **THEN** the frontend displays the corresponding message on the `/sign-in` screen and leaves the form ready to request a fresh link

### Requirement: Frontend SHALL gate the application on an authenticated session

The frontend SHALL determine sign-in status by calling the `/me` endpoint on app load, treat a 200 response as "signed in" and a 401 as "signed out," and render the appropriate routes accordingly. Authenticated requests SHALL include credentials so the session cookie is sent.

#### Scenario: App loads with a valid session
- **WHEN** the frontend's initial `/me` call returns 200
- **THEN** the user sees the authenticated app, not the sign-in screen

#### Scenario: App loads without a session
- **WHEN** the frontend's initial `/me` call returns 401
- **THEN** the user is redirected to `/sign-in`

### Requirement: Frontend SHALL provide a sign-out action

The frontend SHALL expose a sign-out control to authenticated users, which when activated calls the backend sign-out endpoint and returns the user to the sign-in screen.

#### Scenario: Authenticated user signs out
- **WHEN** the user activates the sign-out control
- **THEN** the frontend calls the sign-out endpoint, clears any client-side user state, and routes to `/sign-in`
