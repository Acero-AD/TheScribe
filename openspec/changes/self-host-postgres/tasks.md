## 1. VPS preparation

- [x] 1.1 Add a 2 GB swapfile on the VPS (`/swapfile`), enable it, and persist in `/etc/fstab` (idempotent — skip if swap already present)
- [x] 1.2 Verify swap is active (`free -h` shows 2 GB) and disk headroom is still healthy (`df -h /`)

## 2. Kamal config: add the Postgres accessory

- [x] 2.1 Add a `db` accessory to `backend/config/deploy.yml` (`image: postgres:17-alpine`, `host: KAMAL_DEPLOY_IP`, `env.clear` POSTGRES_USER=scribe / POSTGRES_DB=scribe_production, `env.secret` POSTGRES_PASSWORD, `directories: data:/var/lib/postgresql/data`; no public port — internal `kamal` network only)
- [x] 2.2 Add `POSTGRES_PASSWORD` to `backend/.kamal/secrets` as a `$POSTGRES_PASSWORD` env reference (no raw value)
- [x] 2.3 Generate a strong `POSTGRES_PASSWORD` and add it to the workstation deploy env and to CI deploy secrets (GitHub Actions), alongside the existing deploy secrets
- [x] 2.4 Validate the Kamal config renders (`kamal config`) with the new accessory and secret resolved

## 3. Boot the database accessory

- [x] 3.1 Boot the accessory: `bin/kamal accessory boot db`
- [x] 3.2 Confirm `backend-db` is running and healthy (`bin/kamal accessory details db`; check it joined the `kamal` network)

## 4. Migrate data from Neon

- [ ] 4.1 `pg_dump -Fc` the current Neon production database to a local dump file (using the pooled/direct Neon `DATABASE_URL`)
- [ ] 4.2 Restore the dump into the `backend-db` accessory (`pg_restore` into `scribe_production` via `docker exec` / copied dump)
- [ ] 4.3 Verify the migration: compare table row counts (and key tables) between Neon and the new database

## 5. Cutover

- [ ] 5.1 Repoint production `DATABASE_URL` to `postgresql://scribe:<password>@backend-db:5432/scribe_production` in workstation env + CI deploy secret
- [ ] 5.2 Redeploy the backend (`bin/kamal deploy` or via CI) so the app picks up the new `DATABASE_URL`
- [ ] 5.3 Verify the app is connected to the self-hosted DB: `kamal app exec 'bin/rails runner "puts ActiveRecord::Base.connection_db_config.configuration_hash[:host]"'` reports `backend-db`
- [ ] 5.4 Smoke test in production: request a magic link (login), perform a write, and confirm Solid Queue processes a job

## 6. Decommission & follow-up

- [ ] 6.1 Grace period: leave the Neon database connected-but-unused as a cold fallback for ~1 week of stable operation (do not delete yet)
- [ ] 6.2 After the grace period, decommission the Neon project `TheScribe` and remove the old Neon `DATABASE_URL` from env/CI; update the `neon-database` memory note
- [ ] 6.3 Create the follow-up change `add-db-backups` (nightly `pg_dump` → Cloudflare R2) — backups are a known deferred risk and MUST be scheduled before this is considered operationally complete
- [ ] 6.4 Update OpenSpec specs/docs to reflect the self-hosted database (archive this change)
