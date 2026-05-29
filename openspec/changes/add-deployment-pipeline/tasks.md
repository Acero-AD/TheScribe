## 1. Provision infrastructure (manual, one-time)

- [ ] 1.1 Decide the `<app>` subdomain string; reserve `<app>` and `<app>-api` DNS records on Cloudflare
- [ ] 1.2 Create a Hetzner VPS (smallest shared-vCPU tier), add a dedicated deploy SSH key, note the public IP
- [ ] 1.3 Create a Neon project with a single Postgres database; capture the pooled `DATABASE_URL`
- [ ] 1.4 Create a Cloudflare Pages project for the frontend; create a scoped Cloudflare API token + note account/project IDs
- [ ] 1.5 Create a Resend account, verify the sending domain, and generate an SMTP/API credential
- [ ] 1.6 Create a GHCR access token (or use the Actions `GITHUB_TOKEN`) for image push/pull

## 2. Backend — collapse to a single database

- [ ] 2.1 Take a Neon branch/snapshot as a rollback point before config changes
- [ ] 2.2 Edit `config/database.yml` production block to a single `primary` database driven by `DATABASE_URL` (remove `cache`, `queue`, `cable` entries)
- [ ] 2.3 Remove the per-gem `connects_to` for queue/cache in `config/environments/production.rb`
- [ ] 2.4 Fold Solid Queue and Solid Cache migrations into the primary migration path; run them against the primary database
- [ ] 2.5 Verify locally that the app boots, jobs enqueue/run, and caching works against one database

## 3. Backend — remove Solid Cable

- [ ] 3.1 Remove the `solid_cable` gem from `Gemfile` and update `Gemfile.lock`
- [ ] 3.2 Delete `config/cable.yml` and its cable migrations; remove the cable database wiring
- [ ] 3.3 Confirm the app boots with no Action Cable adapter and no channels referenced

## 4. Backend — email and CORS

- [ ] 4.1 Wire `config.action_mailer.smtp_settings` in `production.rb` from credentials/env (Resend); set the production mailer default URL host
- [ ] 4.2 Add/configure CORS (e.g. `rack-cors`) to allow the `<app>` frontend origin
- [ ] 4.3 Point the magic-link redirect target (`config/application.rb`) at the `<app>` frontend origin
- [ ] 4.4 Set `config.assume_ssl` and `config.force_ssl` in production

## 5. Backend — Kamal configuration

- [ ] 5.1 Set the real production host (Hetzner IP) in `config/deploy.yml`
- [ ] 5.2 Switch the registry to GHCR (image name, server, `KAMAL_REGISTRY_PASSWORD`)
- [ ] 5.3 Configure the proxy block for TLS on `<app>-api` (kamal-proxy Let's Encrypt)
- [ ] 5.4 Add required secrets to `.kamal/secrets` references: `RAILS_MASTER_KEY`, `DATABASE_URL`, Resend credential (no values committed)
- [ ] 5.5 Confirm the persistent storage volume for Active Storage is configured

## 6. Backend — bootstrap deploy (manual first run)

- [ ] 6.1 Run `kamal setup` from a workstation; verify the box boots the image and TLS is valid
- [ ] 6.2 Point Cloudflare `<app>-api` at the box (proxied, SSL mode `Full`)
- [ ] 6.3 Smoke-test: request a magic link (email delivered) and verify an Active Storage upload round-trips

## 7. Frontend — Cloudflare Pages

- [ ] 7.1 Configure SPA fallback so unknown paths serve the entry point (e.g. `_redirects`/`404` → index)
- [ ] 7.2 Define the production build with `VITE_BACKEND_URL` set to the `<app>-api` domain
- [ ] 7.3 Do a first `wrangler pages deploy` of the build; point Cloudflare `<app>` at the Pages project
- [ ] 7.4 Smoke-test: load the app at `<app>`, confirm it reaches the API and login works end-to-end

## 8. CI — independent deploy on green master

- [ ] 8.1 Add GitHub Actions secrets: GHCR token, deploy SSH key, `RAILS_MASTER_KEY`, `DATABASE_URL`, Resend credential, `CLOUDFLARE_API_TOKEN` + account/project IDs, `VITE_BACKEND_URL`
- [ ] 8.2 Add a `deploy-backend` job gated on `github.ref == refs/heads/master`, `needs.changes.outputs.backend == 'true'`, and `needs` on backend test/lint/scan jobs; it builds, pushes to GHCR, and runs `kamal deploy`
- [ ] 8.3 Add a `deploy-frontend` job gated on `github.ref == refs/heads/master`, `needs.changes.outputs.frontend == 'true'`, and `needs` on frontend lint/test/build jobs; it builds and runs `wrangler pages deploy`
- [ ] 8.4 Ensure the deploy jobs are excluded from the `ci-success` aggregate and not added to required branch-protection checks

## 9. Verify

- [ ] 9.1 Backend-only change on `master` deploys only the backend
- [ ] 9.2 Frontend-only change on `master` deploys only the frontend
- [ ] 9.3 A change touching both deploys both; a failing pipeline blocks its deploy; a PR deploys nothing
- [ ] 9.4 Confirm `kamal rollback` and Cloudflare Pages rollback both work as recovery paths
