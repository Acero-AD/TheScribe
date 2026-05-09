# V1 Implementation Order

The 7 OpenSpec changes that make up Scoreboard V1, in the order they should be implemented. Each step's dependencies are already satisfied by the prior steps, so each can land independently on its own branch.

| # | Change | Depends on | Why this order |
|---|---|---|---|
| 1 | `add-account-access` | — | Foundational. Every other capability needs a `User`. Magic link, sessions, sign-in / sign-out. |
| 2 | `add-user-settings` | `account-access` | Adds `reminder_time`, `week_starts_on`, `publishing_cadence`, `timezone`. Three later capabilities consume these. |
| 3 | `add-daily-check-in` | `account-access`, `user-settings` (timezone) | The product's core unit. `DailyLog` model, Today screen at `/`, writing card, note autosave. |
| 4 | `add-weekly-publishing` | `account-access`, `user-settings` (timezone, week_starts_on), `daily-check-in` (Today screen) | Adds the publish card to the same Today screen. `WeekLog` model. |
| 5 | `add-streaks` | `daily-check-in`, `weekly-publishing`, `user-settings` (publishing_cadence) | Fills the reserved streak slots on both check-in cards. Cadence-aware publishing streak. |
| 6 | `add-history-view` | All of the above | Calendar grid + bundled history endpoint. Adds the "best writing streak" computation. First read-only screen. |
| 7 | `add-daily-reminder` | `account-access`, `user-settings` (reminder_time, timezone), `daily-check-in` (suppression signal) | Heaviest single change. PWA push, service worker, recurring dispatcher, idempotency, the deferred Settings toggle row. |

## Run

```
/opsx:apply add-account-access
/opsx:apply add-user-settings
/opsx:apply add-daily-check-in
/opsx:apply add-weekly-publishing
/opsx:apply add-streaks
/opsx:apply add-history-view
/opsx:apply add-daily-reminder
```

## Notes

- `add-streaks` defers a few details to `add-history-view` (best-streak computation parked under history-view because the streaks spec isn't archived yet — can be migrated post-archive).
- `add-history-view` is the first screen that doesn't write data — it composes existing capabilities via a single `GET /history?month=YYYY-MM` BFF endpoint.
- `add-daily-reminder` is roughly 2x the surface area of any other change. Plan accordingly when scheduling.
- Settings screen grows incrementally: rows from `user-settings` ship in step 2; the Daily-reminder toggle row is deferred until step 7. Tab bar grows the same way: stub in step 3, History tab in step 6.
