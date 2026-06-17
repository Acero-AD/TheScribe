## Why

The production database is hosted on Neon, whose credits are being consumed unexpectedly fast even with a single user, making it an unsustainable cost. The Hetzner VPS that already runs the backend has spare capacity (≈2.7 GB free RAM, 31 GB free disk), so co-locating Postgres there removes the recurring database cost entirely.

## What Changes

- Run production Postgres as a Kamal **accessory** (`postgres:17-alpine`) on the existing Hetzner VPS instead of on Neon.
- Add a 2 GB swapfile to the VPS so the new Postgres process has headroom on the 3.7 GB / 0-swap box.
- Add a `POSTGRES_PASSWORD` deploy secret and point production `DATABASE_URL` at the accessory over the internal Docker network (`backend-db:5432`), not exposed to the public internet.
- Persist the database on a Kamal-managed directory so it survives container restarts and redeploys.
- One-time data migration from Neon (`pg_dump` → `pg_restore`) before cutover.
- **BREAKING (operational):** the external Neon database is decommissioned and the old `DATABASE_URL` is retired after cutover.
- **Deferred / known risk:** automated backups are intentionally out of scope for this change. Self-hosting removes Neon's automatic backups and point-in-time recovery, so until a follow-up adds them, loss of the VPS volume means loss of the data. Tracked as a follow-up change (`add-db-backups`).

## Capabilities

### New Capabilities
<!-- None: this reuses the existing deploy-backend capability. -->

### Modified Capabilities
- `deploy-backend`: the "Production runs against a single managed Postgres database" requirement changes from an externally managed service to a self-hosted Postgres co-located on the VPS as a Kamal accessory, reachable only over the internal Docker network, with data persisting across deploys.

## Impact

- **Infra:** Hetzner VPS (`46.225.164.186`) — new `backend-db` Postgres container, swapfile, persistent data directory.
- **Config:** `backend/config/deploy.yml` (new `db` accessory + env), `backend/.kamal/secrets` (`POSTGRES_PASSWORD`).
- **Secrets/env:** new `POSTGRES_PASSWORD`; `DATABASE_URL` repointed from Neon to `backend-db`. CI deploy secrets/vars updated.
- **External services:** Neon project `TheScribe` decommissioned after successful cutover.
- **Data:** one-time migration of all production data from Neon to the new database.
