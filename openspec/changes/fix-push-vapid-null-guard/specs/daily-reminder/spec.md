## MODIFIED Requirements

### Requirement: Backend SHALL expose the VAPID public key

The backend SHALL serve `GET /push_config` returning `{ vapid_public_key: <string> }`. The endpoint SHALL be available to authenticated users only. The key value SHALL be loaded from Rails credentials, never committed to the repository. When no VAPID public key is configured, the endpoint SHALL respond `503 Service Unavailable` with an error body (e.g. `{ "error": "push_not_configured" }`) and SHALL NOT return a `null` key.

#### Scenario: Authenticated request
- **WHEN** an authenticated user GETs `/push_config` and a VAPID public key is configured
- **THEN** the response is 200 with the VAPID public key string

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated client GETs `/push_config`
- **THEN** the backend responds 401

#### Scenario: VAPID key not configured
- **WHEN** an authenticated user GETs `/push_config` and no VAPID public key is configured
- **THEN** the backend responds 503 with an error body and does not return `{ vapid_public_key: null }`

### Requirement: Frontend SHALL handle toggle interactions correctly

The frontend SHALL respond to toggle interactions as follows:
- **OFF → ON**: request `Notification.requestPermission()`. If granted, fetch the VAPID public key via `GET /push_config`. If the key is missing, empty, or the request fails (including a 503 "not configured" response), the toggle SHALL stay OFF and a clear inline message SHALL be shown WITHOUT throwing an unhandled error. Otherwise, call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <vapid public key> })`, then `POST /push_subscriptions` with the subscription. On success, the toggle becomes ON. On any failure, the toggle stays OFF and an inline error appears.
- **ON → OFF**: unsubscribe the local `PushSubscription` via `pushManager.subscribe(...).unsubscribe()`, then `DELETE /push_subscriptions/current` with the endpoint. The toggle becomes OFF on success.

The frontend SHALL validate that a non-empty VAPID public key was received before passing it to the base64-to-`Uint8Array` decoder, so that a missing or `null` key never reaches `.length` on an absent value.

The toggle SHALL show a spinner / disabled state while a transition is in progress.

#### Scenario: Successful enable
- **WHEN** the user toggles ON and grants permission
- **THEN** the toggle ends in the ON state and the backend has a row for this device's endpoint

#### Scenario: User denies permission
- **WHEN** the user toggles ON and denies the permission prompt
- **THEN** the toggle returns to OFF and an inline message explains that permission is required

#### Scenario: VAPID key unavailable
- **WHEN** the user toggles ON, grants permission, and `GET /push_config` returns a 503 or a missing/empty `vapid_public_key`
- **THEN** the toggle returns to OFF, no `TypeError` is thrown, and a clear inline message explains that notifications aren't available right now

#### Scenario: Successful disable
- **WHEN** the user toggles OFF
- **THEN** the local subscription is unsubscribed AND the backend row is deleted

#### Scenario: Backend POST fails
- **WHEN** the user grants permission and the local subscribe succeeds, but the backend POST fails
- **THEN** the toggle returns to OFF, the local subscription is unsubscribed (to avoid an orphaned local sub), and an inline error is shown
