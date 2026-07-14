## Context

Production currently runs against Neon (project `TheScribe`), reached via a pooled `DATABASE_URL` secret injected by Kamal. Neon credits are being consumed quickly even for a single user, so the cost is not justified at this stage.

The backend already deploys to a single Hetzner VPS (`46.225.164.186`) via Kamal 2.11.0. The box currently runs two containers (`backend-web`, `kamal-proxy`) and has ≈2.7 GB free RAM, 31 GB free disk, and **0 swap**. Local development already runs `postgres:17-alpine` via `docker-compose.yml`, so the engine and version are known-good.

Kamal supports first-class **accessories**: long-lived containers (DBs, caches) that Kamal boots on the host and attaches to the shared `kamal` Docker network, so the app container can reach them by container name.

## Goals / Non-Goals

**Goals:**
- Eliminate the external database cost by self-hosting Postgres on the existing VPS.
- Keep the single-database model (Solid Queue + Solid Cache share the primary DB).
- Keep Postgres off the public internet — app reaches it only over the internal Docker network.
- Persist DB data across container restarts and redeploys.
- Migrate existing production data with no schema rework.

**Non-Goals:**
- Automated backups / point-in-time recovery (deferred to a follow-up change `add-db-backups`).
- High availability, replication, or read replicas.
- Connection pooling (PgBouncer) — single user, the Rails pool is sufficient.
- Changing `config/database.yml`'s production shape beyond the `DATABASE_URL` value.

## Decisions

### Decision 1: Run Postgres as a Kamal accessory (not a hand-rolled docker-compose on the host)
Kamal already manages the app and proxy on this host. Modeling the DB as a Kamal accessory keeps a single deploy tool in charge: `kamal accessory boot/reboot/logs db` lifecycle, automatic attachment to the `kamal` network, and config-as-code in `deploy.yml`.

- **Alternative considered:** a separate `docker-compose.yml` on the server. Rejected — splits ownership across two tools, easy to drift, and the app container wouldn't share a network with it without extra wiring.

### Decision 2: Reach the DB by accessory container name over the internal network
Kamal names the accessory container `backend-db` (`<service>-<accessory>`) and joins it to the `kamal` network, so the app resolves `backend-db:5432` internally. Production `DATABASE_URL` becomes:
```
postgresql://scribe:<POSTGRES_PASSWORD>@backend-db:5432/scribe_production
```
The Postgres port is **not** published to a public interface. Optionally bind-publish to `127.0.0.1:5432` only, to allow host-side `pg_dump` for the one-time migration and future ops; this keeps it off the public internet.

- **Alternative considered:** exposing the port publicly with a firewall. Rejected — unnecessary attack surface; internal network is sufficient.

### Decision 3: `postgres:17-alpine`, matching dev
Same image/major version as `docker-compose.yml` avoids dump/restore version skew and surprises. `POSTGRES_USER=scribe`, `POSTGRES_DB=scribe_production`, `POSTGRES_PASSWORD` from a new Kamal secret. Data on a Kamal-managed `data:/var/lib/postgresql/data` directory.

### Decision 4: Add a 2 GB swapfile before booting Postgres
3.7 GB RAM with 0 swap, already hosting the app + proxy + periodic image pulls, is tight once Postgres is added. A 2 GB swapfile (`/swapfile`, persisted in `/etc/fstab`) is cheap insurance against OOM during load spikes or deploys. One-time host change, idempotent.

### Decision 5: Migrate via `pg_dump` (custom format) → `pg_restore`
One-time: dump Neon with `pg_dump -Fc`, restore into the freshly-booted accessory. Cutover then flips `DATABASE_URL` and redeploys. A brief maintenance window (single user) makes a stop-the-world dump/restore acceptable — no need for logical replication.

## Risks / Trade-offs

- **No backups after cutover (accepted, deferred)** → If the VPS volume is lost, data is gone. Mitigation: explicitly tracked as follow-up `add-db-backups` (nightly `pg_dump` → R2); do not let this change be considered "done" operationally without scheduling that follow-up. Until then, the Neon database can be left intact (not deleted, just disconnected) for a short grace period as a cold fallback of the migrated snapshot.
- **Single point of failure on one box** → App and DB share a host; if the VPS dies, everything is down. Accepted for a single-user app at this stage.
- **Memory pressure / OOM** → Mitigated by the 2 GB swapfile; monitor `free -h` and container memory after cutover.
- **Data loss during migration** → Mitigation: do not delete Neon until the migrated DB is verified (row counts / app smoke test) in production; keep Neon as a fallback during the grace period.
- **`DATABASE_URL` secret misconfig at cutover** → Kamal env is injected from CI/workstation secrets. Mitigation: verify with `kamal app exec 'bin/rails runner "puts ActiveRecord::Base.connection_db_config.host"'` after deploy; rollback is repointing `DATABASE_URL` back to Neon and redeploying.

## Migration Plan

1. Add 2 GB swapfile to the VPS (idempotent; persist in fstab).
2. Add `db` accessory + `POSTGRES_PASSWORD` to Kamal config; set the secret in CI + workstation env.
3. `kamal accessory boot db` → empty Postgres running on the `kamal` network.
4. `pg_dump -Fc` from Neon → copy to host → `pg_restore` into `backend-db`.
5. Verify restored data (row counts vs. Neon).
6. Repoint `DATABASE_URL` to `backend-db`, redeploy the app, run smoke tests (login/magic-link, a write, Solid Queue).
7. Grace period: leave Neon connected-but-unused as fallback; after confidence, decommission Neon and remove the old `DATABASE_URL`.

**Rollback:** repoint `DATABASE_URL` back to the Neon URL and redeploy the app; the Neon database is untouched until the final decommission step.

## Open Questions

- Length of the Neon grace period before decommission (suggest ~1 week of stable operation).
- Whether to publish Postgres on `127.0.0.1:5432` for host-side ops, or do all dump/restore via `kamal accessory exec` / `docker exec` (no published port at all). Default to no published port unless host-side `pg_dump` is needed for the follow-up backup job.
