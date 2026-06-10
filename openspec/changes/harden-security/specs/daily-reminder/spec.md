## MODIFIED Requirements

### Requirement: Backend SHALL accept push subscription registration

The backend SHALL accept `POST /push_subscriptions` from authenticated users with a body containing `endpoint`, `p256dh_key`, and `auth_key`. On success, the response SHALL be 201 with the persisted subscription's id (or 200 if it already existed and was updated). Missing or malformed fields SHALL respond 422.

The backend SHALL validate `endpoint` before persisting it, because the send job later issues a server-side request to that URL. The `endpoint` SHALL be rejected with 422 unless it is an absolute `https` URL whose host matches the configured Web Push provider allowlist (a set of trusted host suffixes such as the FCM, Mozilla autopush, Windows Notification Service, and Apple Push hosts). An `endpoint` whose host is a loopback, link-local, or private-range address — or any host not on the allowlist — SHALL be rejected and SHALL NOT be persisted. The allowlist SHALL be configurable so additional providers can be added without code changes.

#### Scenario: Successful new subscription
- **WHEN** an authenticated user POSTs `/push_subscriptions` with a complete, well-formed body whose `endpoint` is an `https` URL on an allowlisted provider host
- **THEN** the backend persists the subscription and responds 201

#### Scenario: Missing keys
- **WHEN** the body lacks `p256dh_key` or `auth_key`
- **THEN** the backend responds 422 and no row is persisted

#### Scenario: Endpoint targets an internal address
- **WHEN** an authenticated user POSTs `/push_subscriptions` with an `endpoint` whose host is loopback, link-local, or a private range (e.g. `http://169.254.169.254/...`, `http://localhost/...`, `http://10.0.0.5/...`)
- **THEN** the backend responds 422 and no row is persisted, and no request is ever made to that host

#### Scenario: Endpoint host is not an allowlisted provider
- **WHEN** an authenticated user POSTs `/push_subscriptions` with an `https` `endpoint` whose host is not on the configured provider allowlist
- **THEN** the backend responds 422 and no row is persisted

#### Scenario: Endpoint is not https
- **WHEN** an authenticated user POSTs `/push_subscriptions` with an `http://` `endpoint`
- **THEN** the backend responds 422 and no row is persisted

#### Scenario: Unauthenticated POST
- **WHEN** an unauthenticated client POSTs `/push_subscriptions`
- **THEN** the backend responds 401
