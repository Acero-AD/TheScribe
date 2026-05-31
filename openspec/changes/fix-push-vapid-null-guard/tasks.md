## 1. Backend: signal unconfigured push

- [x] 1.1 In `app/controllers/push_config_controller.rb`, read `Rails.application.config.x.vapid.public_key` and, when blank (`.presence` is nil), render `503` with `{ error: "push_not_configured" }` instead of `{ vapid_public_key: null }`.
- [x] 1.2 Keep the 200 happy-path response unchanged when a key is configured.

## 2. Frontend: guard the VAPID key before decoding

- [ ] 2.1 In `src/hooks/usePushSubscription.ts` `subscribe()`, after destructuring `vapid_public_key` from `getPushConfig()`, throw a clear `Error` (e.g. "Notifications aren't available right now.") when the value is falsy/empty, before calling `urlBase64ToUint8Array`.
- [ ] 2.2 Confirm the thrown error flows into the existing `catch (err)` block so `setError` shows the message and `setStatus` resets via `readStatus()` (toggle stays OFF).
- [ ] 2.3 In `src/api/pushConfig.ts`, ensure the 503 "not configured" response rejects with an intelligible message (and the existing cache reset on error still runs).
- [ ] 2.4 In `src/screens/SettingsScreen.tsx`, verify the inline error wording reads sensibly for the unavailable/unconfigured case (adjust copy if needed); keep `urlBase64ToUint8Array` in `src/lib/push.ts` as a pure decoder (no signature change).

## 3. Tests

- [ ] 3.1 `backend/test/integration/push_config_test.rb`: add a case asserting 503 + error body when no VAPID public key is configured; keep the configured-case test passing.
- [ ] 3.2 `frontend/src/hooks/__tests__/usePushSubscription.test.tsx`: add a case where `getPushConfig` resolves with a null/empty key (and/or rejects with a 503) and assert the toggle ends OFF with an inline error and NO unhandled `TypeError`.
- [ ] 3.3 `frontend/src/lib/__tests__/push.test.ts`: leave `urlBase64ToUint8Array` covering valid strings (decoder stays pure; null handling lives at the call site).

## 4. Verify

- [ ] 4.1 Run frontend tests (`npm test` / vitest) and backend tests; all green.
- [ ] 4.2 Manually toggle Daily reminder with VAPID unconfigured and confirm a clear inline message appears instead of a crash; with VAPID configured, confirm enable/disable still works.
