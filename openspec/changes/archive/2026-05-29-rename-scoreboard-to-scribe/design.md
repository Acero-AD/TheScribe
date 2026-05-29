## Context

The product was scaffolded under the name "Scoreboard". That name appears in ~111 places across ~50 files spanning four very different layers: user-facing copy, machine identifiers (Rails module, PostgreSQL database names), infrastructure (docker-compose, CI), and historical OpenSpec archives. The app is an API-only Rails 8.1 backend + React 19 PWA frontend, governed by the OpenSpec workflow, and **not yet deployed** — there is no production data. Operator constraints: Rails/db commands run through `docker compose` (not host `bin/rails`); prefer many small, focused commits; deploy subdomains follow the `<app>` / `<app>-api` convention on a shared domain.

## Goals / Non-Goals

**Goals:**
- One consistent identity: **The Scribe** (display), **Scribe** (PWA short name + in-sentence copy), `scribe` (all machine identifiers).
- Land the rename *before* the first deploy so database names, subdomains, and push identity are correct from day one.
- Keep the active spec suite truthful by updating the two requirement-level mentions of the old name.
- Sequence the work so the app builds and tests green after each commit.

**Non-Goals:**
- Renaming the git repository (the directory is already `TheScribe`).
- Rewriting archived OpenSpec proposals under `openspec/changes/archive/` — frozen history.
- Any behavior change beyond the displayed brand eyebrow text.
- Data migration — none exists.

## Decisions

1. **Display / code identifier split.** "The Scribe" for human-facing display, "Scribe" for the PWA `short_name` and in-sentence copy (avoids "Your The Scribe sign-in link"), and `scribe` for every machine identifier (Ruby module, DB names, subdomain). *Why:* Ruby constants and Postgres DB names cannot carry an article or space, and a clean lowercase token is also the correct subdomain label. *Alternative rejected:* keeping "The" everywhere — produces awkward copy and a longer `thescribe` subdomain.

2. **Rename the databases now, not later.** `config/database.yml` + `docker-compose.yml` move from `scoreboard_*` to `scribe_*`; dev DBs are rebuilt with `db:prepare`. *Why:* pre-deploy is the only zero-cost moment to do this — renaming a live Postgres database after deploy means downtime and a migration. *Alternative rejected:* leaving legacy `scoreboard_*` names — a permanent brand/infra mismatch that is confusing on the server.

3. **Rename the Rails module `Scoreboard` → `Scribe`.** *Why:* the module name surfaces in logs, the Rails console, and generated code; leaving it would be a lingering inconsistency. *Risk profile:* low — references are confined to `config/application.rb` and a couple of bootstrap files; a case-sensitive grep confirms completeness.

4. **Eyebrow text becomes `SCRIBE` (not `THE SCRIBE`).** *Why:* the sign-in eyebrow is a short mono-uppercase brand chip and should match the PWA `short_name`. This is the only user-visible *behavior* change, and it is captured in the two delta specs.

5. **Freeze archives; update only active specs.** *Why:* archived proposals are the decision log; rewriting them would falsify history. Active specs describe the current system and must stay accurate.

6. **Commit per layer.** Separate commits for docs, frontend, backend code, db/infra, and specs. *Why:* operator preference for small focused commits, and it isolates the riskier infra/module rename from the low-risk copy edits.

## Risks / Trade-offs

- **A missed `Scoreboard` reference breaks Rails boot** → after editing, grep case-sensitively for `Scoreboard` across `backend/`, then boot via `docker compose` and run the test suite before committing.
- **Stale `scoreboard_*` database / Postgres volume lingers in the dev container** → `db:prepare` recreates under the new names; the old DB is harmless dev data and can be dropped.
- **Service-worker cache-name change invalidates cached PWA assets** → acceptable pre-deploy (no users); a cache-key bump is expected behavior.
- **VAPID subject / mailer identity still references the old name** → updated in the same backend commit; no push subscriptions exist yet.
- **CI references the DB name** → inspect `.github/workflows/ci.yml`; update only if it sets `scoreboard_*`, otherwise leave it to minimize churn.

## Migration Plan

1. Work on a single branch, pre-deploy. Rollback = revert the branch; no data complexity.
2. After the `database.yml` / compose edits: `docker compose down && docker compose up -d`, then run `db:prepare` through `docker compose` to build the `scribe_*` databases.
3. Verify: backend tests green, frontend build + tests green, app boots, and the sign-in screen renders the `SCRIBE` eyebrow.

## Open Questions

- None blocking. Actually registering/pointing the `scribe` / `scribe-api` subdomains is a deploy-time step, out of scope for this change.
