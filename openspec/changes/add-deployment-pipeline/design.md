## Context

The repository is a monorepo with an independently-tested Rails backend (`backend/`) and a static Vite/React SPA (`frontend/`). CI (`.github/workflows/ci.yml`) already path-filters the two areas and gates branch protection on a single aggregate `ci-success` job. There is no production environment yet.

Relevant existing facts that constrain the design:
- The backend ships production-ready Kamal scaffolding: `config/deploy.yml`, `.kamal/secrets`, a production `Dockerfile`, and Thruster in front of Puma.
- The backend is stateful: PostgreSQL, Active Storage (image variants via libvips), Solid Queue running **in-Puma** (`SOLID_QUEUE_IN_PUMA: true`), and magic-link email auth.
- `frontend/src/api/client.ts` reads `VITE_BACKEND_URL` at **build time**, defaulting to `http://localhost:3000`. The backend URL is therefore compiled into the bundle.
- `config/application.rb` redirects magic-link verification back to the frontend, so the backend must know the frontend origin (CORS + redirect).
- Solid Queue is genuinely used (`deliver_later`, `ReminderDispatcherJob`, `SendReminderJob`); Solid Cache is configured but uncalled; Solid Cable has **no channels or broadcasts** anywhere.

## Goals / Non-Goals

**Goals:**
- A cheap (~$5/mo + domain), low-maintenance production environment that still scales.
- Frontend and backend deploy **independently**, automatically, when a push to `master` is green and touched that area.
- Reuse the existing Kamal scaffolding and path-filtered CI rather than introducing new orchestration tooling.
- Offload database backups/HA to a managed provider.

**Non-Goals:**
- Multi-server / horizontal scaling, blue-green or canary deploys, or zero-downtime guarantees beyond what Kamal provides out of the box.
- Real-time features (Action Cable) — explicitly removed until a feature needs them.
- Object storage for Active Storage (stays on the Kamal volume for now).
- Staging/preview environments (production only for this change).
- Provisioning automation (Terraform/Ansible) — infra is set up manually once.

## Decisions

### D1 — Backend on a single Hetzner VPS via Kamal
Chosen over PaaS (Render/Railway) and serverless (Cloud Run/CF Containers). The app's shape — in-Puma Solid Queue, persistent Active Storage disk, long-lived process — fights scale-to-zero serverless, and Kamal is already scaffolded. Hetzner is the price leader (~€4.5/mo). **Alternative considered:** Render/Fly for zero box-ops, rejected on cost and because it would waste the existing Kamal setup. **Trade-off:** we own OS patching (mitigated below; DB backups are offloaded to Neon).

### D2 — Single Neon Postgres database (not four, not self-hosted)
Managed Postgres offloads backups/HA (the main downside of D1). Collapse the four-database Rails-8 default into **one** database: Solid Queue and Solid Cache tables live in the primary schema; their per-gem `connects_to` is removed and their migrations are folded into the primary migration path. The 4-DB split is a write-isolation optimization with no payoff at this scale, and one `DATABASE_URL` is simpler to wire and uses fewer connections against Neon's pooled endpoint. **Alternative:** keep 4 separate Neon databases — rejected as needless connection/secret sprawl. **Alternative:** self-host Postgres as a Kamal accessory — rejected because it reintroduces the backup burden D2 is meant to remove. Use Neon's **pooled** connection string (Rails keeps connections open; the pooler absorbs Solid Queue polling).

### D3 — Remove Solid Cable
No channels, no `broadcast`/`stream_from` exist. Remove the gem, `config/cable.yml`, and the cable database/migrations. It's reintroducible in ~minutes (and can also live in the primary DB) when a live-update feature is actually built. **Alternative:** leave it dormant — rejected as carrying an unused database/connection.

### D4 — Frontend on Cloudflare Pages
Chosen over Vercel/Netlify for **unmetered bandwidth** — a static SPA scales on bandwidth, and CF stays free at any traffic where Vercel/Netlify meter and bill. Workers/Pages Functions remain an escape hatch for future edge logic. **Alternative:** Vercel — only wins if migrating to Next.js/SSR, which is a non-goal. **Alternative:** serve the SPA from the Hetzner box — rejected because it couples the two deploys, contradicting the core requirement.

### D5 — Deploy from CI via Direct Upload, gated on green master
Both deploys are GitHub Actions jobs in the existing workflow, **not** the host's native git auto-deploy, so "deploy only when the master pipeline succeeds" is enforced in one place. Frontend uses `wrangler pages deploy` (Direct Upload); backend runs `kamal deploy` from the runner. Each deploy job is gated on `github.ref == refs/heads/master` AND its `changes.*` output AND `needs` on its test/lint/build jobs. They are **excluded** from the required `ci-success` aggregate so branch protection (which runs on PRs) is unaffected. **Alternative:** a separate `deploy.yml` triggered on `workflow_run` — rejected as more moving parts than reusing the `changes` gate already present.

### D6 — Image registry: GHCR
The runner is already authenticated to GitHub; GHCR is free for the repo. Replaces the `localhost:5555` placeholder in `deploy.yml`. Build the amd64 image on the runner, push to GHCR, then `kamal deploy`.

### D7 — TLS: kamal-proxy + Cloudflare "Full"
kamal-proxy terminates Let's Encrypt on the box; Cloudflare proxies the `<app>-api` record in "Full" SSL mode (the `deploy.yml` comment already anticipates this), giving CF CDN/DDoS in front of the API. Requires `assume_ssl`/`force_ssl` in production.

### D8 — SMTP via Resend
Magic-link auth is unusable in production without SMTP. Resend's free tier covers the volume; wire `action_mailer.smtp_settings` (currently commented) from credentials/env. Requires a verified sending domain.

### D9 — Subdomain convention `<app>` / `<app>-api`
Frontend at `<app>.<domain>`, backend at `<app>-api.<domain>` (hyphen — hostnames with underscores break TLS/Let's Encrypt). Lets multiple apps share one domain. `VITE_BACKEND_URL` and the CORS/redirect origin are set from these.

## Risks / Trade-offs

- **Backend URL baked at build time (D4/D5)** → the `<app>-api` domain must be permanent before the first frontend build; changing it forces a frontend rebuild+redeploy. Mitigation: settle the subdomain once, store as a CI variable.
- **We own the VPS (D1)** → OS/security patching is manual. Mitigation: Hetzner unattended-upgrades; the only stateful thing on the box is the Active Storage volume (DB is on Neon).
- **Active Storage on a single volume** → uploads are not backed up off-box and don't survive box loss. Mitigation: accept for now (non-goal to move to object storage); flag a future move to R2/S3. Document a periodic volume snapshot.
- **Neon scale-to-zero cold start** → first request after idle can be slow. Mitigation: acceptable at this scale; can disable suspend or keep-warm later.
- **Single DB write churn (D2)** → Solid Queue/Cache writes hit the primary DB. Mitigation: fine at current scale; the 4-DB split can be reintroduced if load demands.
- **Kamal-from-CI needs SSH + registry secrets** → broader secret surface. Mitigation: a dedicated deploy SSH key and a scoped GHCR token, stored as GitHub Actions secrets; never in the repo.
- **First deploy is a manual bootstrap** → `kamal setup` and DNS/Neon/Resend provisioning happen once by hand before CD can run green. Mitigation: capture as ordered setup tasks; CD only takes over after bootstrap.

## Migration Plan

1. **Provision infra (manual, once):** Hetzner VPS + deploy SSH key; Neon project + single database (+ pooled `DATABASE_URL`); Cloudflare DNS for `<app>` and `<app>-api` + Pages project + API token; Resend account + verified domain.
2. **Backend config:** collapse to single DB (`database.yml`, `production.rb`), remove Solid Cable (gem, `cable.yml`, migrations), wire Resend SMTP, add CORS for the frontend origin, point Kamal at the real host + GHCR, set `assume_ssl`/`force_ssl`.
3. **Bootstrap:** `kamal setup` from a workstation to validate the box, TLS, and a first boot end-to-end; verify magic-link email and an Active Storage upload.
4. **Frontend:** create the Pages project, set `VITE_BACKEND_URL`, do a first `wrangler` upload; verify the SPA reaches the API and login works.
5. **Enable CD:** add `deploy-backend`/`deploy-frontend` jobs gated as in D5; merge to `master` and confirm independent triggering (backend-only change deploys only backend, and vice versa).

**Rollback:** Kamal retains the previous container image and can roll back (`kamal rollback`); Cloudflare Pages keeps prior deployments and supports instant rollback to a previous build. The single-DB migration is the one not-trivially-reversible step — take a Neon branch/snapshot before step 2.

## Open Questions

- The concrete `<app>` string for the subdomains (drives `VITE_BACKEND_URL`, CORS, DNS).
- Proxy the `<app>-api` record through Cloudflare (CDN/DDoS, "Full" SSL) or leave it DNS-only and let kamal-proxy own TLS directly? (Leaning proxied.)
- VPS sizing — start on the smallest Hetzner shared-vCPU tier and resize if needed?
- Active Storage: accept volume-only for now, or move to Cloudflare R2 in this change? (Leaning defer.)
