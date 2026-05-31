## Context

Enabling the "Daily reminder" toggle calls `usePushSubscription.subscribe()`, which fetches the VAPID public key from `GET /push_config` and passes it into `urlBase64ToUint8Array(base64)`. The first line of that function, `base64.length`, throws `TypeError: Cannot read properties of null (reading 'length')` when the key is `null`.

The key is `null` whenever the backend has no VAPID public key configured: `config/initializers/vapid.rb` falls back to `nil`, and `push_config_controller.rb` renders it verbatim as `{ vapid_public_key: null }`. The frontend's `PushConfig` type declares `vapid_public_key: string`, so the compiler offers no protection against the runtime `null`.

This is fundamentally a misconfiguration (missing server keys) that manifests as an opaque client crash. The fix has two layers: stop the backend from advertising a non-functional config, and make the frontend fail loudly and legibly if it ever receives one anyway.

## Goals / Non-Goals

**Goals:**
- Replace the unhandled `TypeError` with a clear, user-facing message when push isn't configured.
- Make `GET /push_config` signal "unavailable" (503) instead of returning a `null` key.
- Keep `urlBase64ToUint8Array` a pure decoder; validate inputs at the call boundary.
- Preserve the existing happy-path behavior and the toggle's OFF/error states.

**Non-Goals:**
- Generating, rotating, or documenting actual VAPID keys (a deployment/ops task, out of scope here).
- Changing the subscription persistence model, dispatcher, or send-job behavior.
- Adding retry/caching semantics beyond what already exists in `getPushConfig`.

## Decisions

**Decision: Backend returns 503 when VAPID public key is blank.**
`PushConfigController#show` checks `Rails.application.config.x.vapid.public_key.presence`; if blank, render `503` with `{ error: "push_not_configured" }`. Rationale: a null key is not a valid configuration, so the endpoint should report unavailability rather than hand the client a value it cannot use. Alternative considered: returning 200 with an explicit `configured: false` flag — rejected because every caller would need to branch on it, whereas a non-2xx status flows naturally through the existing `getPushConfig().catch` path.

**Decision: Frontend guards the key before decoding.**
In `subscribe()`, after `const { vapid_public_key } = await getPushConfig()`, throw a typed `Error` with a clear message if the value is falsy/empty, before calling `urlBase64ToUint8Array`. Rationale: the existing `catch (err)` block already maps `Error` instances to the inline message, so a thrown error needs no new plumbing. Alternative considered: hardening `urlBase64ToUint8Array` itself to accept `string | null` — rejected to keep that utility a single-responsibility decoder; the meaningful, user-facing message belongs at the call site that knows the context.

**Decision: `getPushConfig` surfaces a friendly error for the unconfigured 503.**
The 503 from the backend becomes a rejected promise via the existing `api()` client; the rejection message should be intelligible so the Settings inline error reads sensibly. Rationale: reuses the existing cache-reset-on-error logic in `getPushConfig`.

## Risks / Trade-offs

- [A future legitimate 503 (transient outage) is shown as "not configured"] → Mitigation: keep the user-facing copy general ("Notifications aren't available right now"), so it remains accurate whether the cause is misconfiguration or a transient backend error.
- [Tests stub the web-push gem and may assume `/push_config` always returns a key] → Mitigation: add explicit unconfigured-case tests and keep the configured-case tests unchanged.
- [Type says `string` but runtime guard handles `null`] → Mitigation: relax the call-site handling without loosening the public `PushConfig` type, so the happy path stays strongly typed while the guard covers the misconfig edge.
