## Context

TheScribe is a monorepo with two deployable apps:

- `backend/` — Rails 8, Ruby 4.0.3 (`.ruby-version`), Postgres (`postgresql` adapter), Kamal for deploy.
- `frontend/` — Vite 8 + React 19 + TypeScript 6, Vitest (17 test files), ESLint flat config.

There is currently **no active CI**. The Rails-generated `ci.yml` and `dependabot.yml` live under `backend/.github/`, but GitHub Actions only reads workflows from the repository root (`.github/workflows/`), so they have never executed. The backend also ships a Rails 8 `bin/ci` / `config/ci.rb` orchestrator, which we are not using as the GitHub entrypoint (see Decisions).

The user wants CI structured as two independent pipelines that run only when their own directory changes, and CI is expected to become a required check for merging. Deployment (CD) is explicitly out of scope for this change.

Verified constraints from the codebase:
- Backend uses Postgres → CI needs a Postgres service container (the shipped `ci.yml` lacks one and would fail).
- Backend test boot needs **no secrets**: the only boot-time credentials reader (`config/initializers/vapid.rb`) falls back to ENV and a default when `config/master.key` is absent, and push is stubbed in tests.
- `mise.toml` pins `node = "25.0.0"`; backend `.ruby-version` is `ruby-4.0.3`.
- Default branch is `master` (the stale `ci.yml` referenced `main`).
- `npm run build` is `tsc -b && vite build`, so the build job also type-checks.

## Goals / Non-Goals

**Goals:**
- Two independent pipelines (backend, frontend) that each run only when their directory changes.
- Compatible with branch protection: a required check must never hang on a path that didn't trigger.
- Fast feedback via discrete parallel jobs.
- Works on the first push with zero repository secrets.
- Single source of truth for CI config, at the repository root.

**Non-Goals:**
- Any deployment / CD (backend Kamal deploy, frontend static-host deploy) — separate change.
- Adopting `bin/ci` / `config/ci.rb` as the CI entrypoint.
- Frontend hosting decisions (confirmed: separate static host, but not configured here).
- Code coverage gates, system/E2E tests, or release tagging.

## Decisions

### Decision 1: One workflow file with a change-detection gate (Pattern B), not two separate workflow files (Pattern A)

A single root `.github/workflows/ci.yml` always runs. A first `changes` job uses `dorny/paths-filter` to emit `backend` and `frontend` boolean outputs; pipeline jobs are gated with `if: needs.changes.outputs.<area> == 'true'`.

**Why over Pattern A (two files with `on.paths`):** With required status checks, a path-filtered workflow that never triggers leaves its required check stuck "pending," blocking the PR forever. Pattern B keeps a single always-running workflow whose aggregate job can resolve, so branch protection "just works." The user confirmed CI will likely be required, which makes this the safer choice. Trade-off: jobs are conditional (slightly more YAML), and the two pipelines share one file rather than feeling fully separate — but their *behavior* is still fully independent.

### Decision 2: Aggregate `ci-success` job as the sole required check

A final job runs `if: always()`, `needs:` every pipeline job, and fails only if any dependency's result is `failure` or `cancelled` (skipped/success are acceptable). Branch protection requires **only** `ci-success`.

**Why:** This is the canonical pattern for "required check + path filtering." It lets a frontend-only PR pass even though backend jobs were skipped, while still failing fast on any real failure. Alternative — marking each job required — reintroduces the stuck-pending problem.

### Decision 3: Discrete parallel jobs, not `bin/ci`

Backend = three jobs (`backend-scan`, `backend-lint`, `backend-test`); frontend = three jobs (`frontend-lint`, `frontend-test`, `frontend-build`). The Rails `bin/ci` orchestrator runs serially in one process.

**Why:** Parallel jobs give faster feedback and clearer per-check status. The user chose discrete jobs. Trade-off: this is a second CI definition alongside `config/ci.rb`, which can drift — accepted; `config/ci.rb` remains the local convenience runner.

### Decision 4: Native toolchains + Postgres service container, not docker compose

CI uses `ruby/setup-ruby` (reads `.ruby-version`, bundler cache) and `actions/setup-node` (Node 25, npm cache), with a Postgres 17 service container for the test job — mirroring the credentials in `docker-compose.yml` (`scoreboard`/`scoreboard`, db `scoreboard_test`). `libvips` is installed via apt for Active Storage image processing.

**Why:** Native runners + service containers are the standard, fastest GitHub Actions approach. The project's "run Rails via docker compose" convention applies to *local* development, not CI; using it in CI would be slower and add no value. No conflict.

### Decision 5: Per-area `working-directory` defaults

Each job sets `defaults.run.working-directory` to `backend` or `frontend` so steps run in the right subdirectory. Caches are keyed to the relevant lockfile (`backend/Gemfile.lock`, `frontend/package-lock.json`).

### Decision 6: Consolidate config at the root; remove the misplaced copies

Create `.github/workflows/ci.yml` and `.github/dependabot.yml` (watching `bundler` at `/backend` and `npm` at `/frontend`). Delete `backend/.github/` entirely. Fix `main` → `master`.

## Risks / Trade-offs

- **Required check misconfigured in GitHub UI** → Document the exact step: require only `ci-success` (not individual jobs). Branch protection is a manual GitHub setting outside the repo.
- **`dorny/paths-filter` behaves differently on push vs PR** → On PRs it diffs against the base branch; on pushes against the before-SHA. Both are supported; document that brand-new branches/first push may report all-changed (acceptable — just runs more jobs).
- **Two CI definitions drift** (`config/ci.rb` vs the workflow) → Accepted per Decision 3; treat the GitHub workflow as authoritative for merge gating.
- **Postgres/version or libvips drift** vs local docker compose → Pin Postgres 17 to match compose; revisit if compose changes.
- **No master key in CI** could surprise a future test that genuinely needs decrypted credentials → Today none do; if that changes, add a `RAILS_MASTER_KEY` secret and wire it into the test job env.
- **Node 25 pin** must track `mise.toml` → If `mise.toml` changes the Node version, update the workflow (or read it from `mise.toml`); accepted as a manual sync for now.

## Migration Plan

1. Add root `.github/workflows/ci.yml` and `.github/dependabot.yml`.
2. Remove `backend/.github/`.
3. Open a PR; confirm the workflow appears and that path filtering skips the untouched side.
4. After merge, enable branch protection on `master` requiring the `ci-success` check.
- **Rollback:** delete `.github/workflows/ci.yml` (and relax branch protection); no application code is affected.

## Open Questions

- Should the Node version be read dynamically from `mise.toml` rather than hard-coded in the workflow? (Default: hard-code now, revisit.)
- Do we want a separate explicit type-check step, or is the `tsc -b` inside `npm run build` sufficient? (Default: rely on the build.)
- Future: when CD is designed, should deploy live in this same workflow (needs gate) or a separate one? (Out of scope here.)
