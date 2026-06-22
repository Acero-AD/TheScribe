> **SUPERSEDED (2026-06-22) — NOT IMPLEMENTED.** This change patched a bug inside
> the `daily-reminder` capability, which has since been removed in full by the
> `remove-daily-reminder` change. The crash it fixed can no longer occur (there is
> no push toggle / VAPID endpoint). Archived for history only; do not implement.

## Why

Enabling the "Daily reminder" toggle crashes with `TypeError: Cannot read properties of null (reading 'length')`. When the backend's VAPID public key is unconfigured, `GET /push_config` returns `{ vapid_public_key: null }`; the frontend trusts its `string` type and passes the `null` straight into `urlBase64ToUint8Array`, where `base64.length` throws. The user sees a cryptic, unactionable error instead of a clear message, and a misconfigured server fails silently until a user happens to toggle notifications.

## What Changes

- Backend `GET /push_config` SHALL return `503 Service Unavailable` (with an error body) when no VAPID public key is configured, instead of `{ vapid_public_key: null }`.
- Frontend `subscribe()` SHALL validate that a non-empty `vapid_public_key` was received before calling `urlBase64ToUint8Array`, throwing a clear, user-facing error if it is missing/empty.
- Frontend SHALL surface a human-readable inline message (e.g. "Notifications aren't configured on the server yet") when push configuration is unavailable, and leave the toggle OFF.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `daily-reminder`: The "Backend SHALL expose the VAPID public key" requirement gains behavior for the unconfigured case (return 503 rather than a null key). The "Frontend SHALL handle toggle interactions correctly" requirement gains a guard that turns a missing/unavailable VAPID key into a clear inline error instead of an unhandled `TypeError`.

## Impact

- Backend: `app/controllers/push_config_controller.rb` (add unconfigured guard returning 503).
- Frontend: `src/hooks/usePushSubscription.ts` (validate key before decode), `src/api/pushConfig.ts` (surface a meaningful error), `src/screens/SettingsScreen.tsx` (inline message wording). `src/lib/push.ts` `urlBase64ToUint8Array` is the crash site but is left as a pure decoder; callers guard it.
- Tests: `frontend/src/hooks/__tests__/usePushSubscription.test.tsx`, `frontend/src/lib/__tests__/push.test.ts`, `backend/test/integration/push_config_test.rb`.
- No schema/migration changes. No breaking API changes for the configured (happy) path.
