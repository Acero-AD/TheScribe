## Why

The app is fully built and CI-gated, but there is no production environment and no path from a green `master` to a running deployment — it cannot be used by real users. The frontend and backend are developed and tested independently (the CI already path-filters them), so their deployments should be independent too: a green push to `master` that only touched one side should redeploy only that side. We also want the cheapest, lowest-maintenance hosting that still scales, reusing the Kamal scaffolding the backend already ships with.

## What Changes

- **New**: A production environment for the **backend** — Rails deployed to a Hetzner VPS via Kamal, image published to GitHub Container Registry (GHCR), TLS via kamal-proxy (Let's Encrypt) behind Cloudflare (`Full` SSL mode), and Active Storage on the existing Kamal persistent volume.
- **New**: A production environment for the **frontend** — the static Vite/React SPA published to Cloudflare Pages (free, unmetered bandwidth), built with `VITE_BACKEND_URL` baked to the backend's `<app>-api` subdomain.
- **New**: Magic-link auth made deliverable in production by wiring **SMTP (Resend free tier)** via `action_mailer.smtp_settings` (currently commented out), plus **CORS** allowing the frontend origin and the magic-link redirect target pointed at the frontend.
- **Database simplification (BREAKING for prod config)**: Run a **single Neon Postgres database** instead of four. Keep **Solid Queue** (used by magic-link `deliver_later` and the reminder jobs) and **Solid Cache** colocated in the primary database; **remove Solid Cable entirely** (no channels or broadcasts exist). Requires editing `config/database.yml` and `config/environments/production.rb` to drop the per-gem `connects_to` and fold the Solid migrations into the primary schema.
- **Modified CI**: Add two deploy jobs to the existing workflow — `deploy-backend` and `deploy-frontend` — each gated on *push to `master`* **and** its area changed **and** its existing test/lint/build jobs passing. These are **not** required branch-protection checks (only `ci-success` stays required).
- **Subdomain convention**: Frontend at `<app>` and backend at `<app>-api` (hyphen — TLS rejects underscores), so multiple apps can share one domain.

## Capabilities

### New Capabilities
- `deploy-backend`: Production deployment of the Rails backend — Hetzner VPS via Kamal, GHCR image registry, single Neon Postgres database (Solid Queue + Solid Cache colocated, Solid Cable removed), production SMTP for magic-link email, CORS for the frontend origin, persistent Active Storage volume, and TLS. Includes the trigger: auto-deploy on a green `master` push that touched `backend/**`.
- `deploy-frontend`: Production deployment of the static SPA to Cloudflare Pages via `wrangler` (Direct Upload, so deploys stay gated on CI rather than CF's own git integration), with `VITE_BACKEND_URL` resolved to the `<app>-api` subdomain at build time. Includes the trigger: auto-deploy on a green `master` push that touched `frontend/**`.

### Modified Capabilities
- `ci-pipeline`: Extend the path-filtered workflow with deployment jobs that run only on `master` pushes, only after the relevant pipeline jobs succeed, and independently per changed area — without becoming required branch-protection checks.

## Impact

- **Code/config**: `.github/workflows/ci.yml` (two deploy jobs + needed secrets), `backend/config/deploy.yml` (real host, GHCR registry, env), `backend/.kamal/secrets`, `backend/config/database.yml` + `backend/config/environments/production.rb` (single DB, drop Cable, SMTP), `backend/config/cable.yml` removal, `backend/Gemfile` (drop `solid_cable`), CORS config, `frontend` build env (`VITE_BACKEND_URL`).
- **Infrastructure (manual, one-time)**: Hetzner VPS provisioned + SSH key; Neon project + database; Cloudflare DNS for `<app>` and `<app>-api` + Pages project; Resend account + verified domain.
- **Secrets (GitHub Actions)**: `KAMAL_REGISTRY_PASSWORD`/GHCR token, SSH deploy key, `RAILS_MASTER_KEY`, `DATABASE_URL`, Resend API key, `CLOUDFLARE_API_TOKEN` + account/project IDs.
- **Dependencies**: removes `solid_cable`; adds a CORS mechanism (e.g. `rack-cors`) if not already present.
- **No user-facing behavior change** beyond enabling production: removing Solid Cable is invisible (it was unused).
