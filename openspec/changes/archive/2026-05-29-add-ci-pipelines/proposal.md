## Why

The repository has no active CI. The Rails-generated `ci.yml` lives at `backend/.github/workflows/ci.yml`, but GitHub Actions only reads workflows from the repository root (`.github/workflows/`), so it has never run — and neither has the misplaced Dependabot config. As a result, lint, security scanning, and tests for both the Rails backend and the Vite/React frontend are unverified on every push and pull request. We want CI in place now, structured from day one as two independent pipelines that only run when their own directory changes.

## What Changes

- Add a single root workflow `.github/workflows/ci.yml` that always runs on pull requests and pushes to `master`, uses a change-detection gate (`dorny/paths-filter`) to determine whether `backend/` and/or `frontend/` changed, and runs only the affected pipeline's jobs.
- **Backend jobs** (run only when `backend/**` changes), as discrete parallel jobs:
  - `backend-scan`: Brakeman static analysis + bundler-audit gem audit.
  - `backend-lint`: RuboCop (with rubocop cache).
  - `backend-test`: `bin/rails db:test:prepare test` against a Postgres 17 service container, with `libvips` installed; Ruby pinned via `.ruby-version` (4.0.3) with bundler cache. No repository secrets required.
- **Frontend jobs** (run only when `frontend/**` changes), as discrete parallel jobs:
  - `frontend-lint`: ESLint.
  - `frontend-test`: Vitest (`npm run test`).
  - `frontend-build`: `npm run build` (`tsc -b && vite build`, which also covers type-checking). Node 25 (matching `mise.toml`) with npm cache.
- Add an aggregate `ci-success` job (`if: always()`, needs all pipeline jobs) that passes unless a job actually failed — skipped jobs do not block. This is the single status check intended to be marked **required** in branch protection, so a frontend-only PR is never blocked waiting on backend jobs that never started.
- Relocate Dependabot config to the root `.github/dependabot.yml`, watching both the `bundler` ecosystem (`/backend`) and the `npm` ecosystem (`/frontend`).
- Remove the misplaced `backend/.github/` directory (its `ci.yml` and `dependabot.yml`).
- Fix the default-branch reference from `main` to `master`.

Scope note: this change is **CI only**. Deployment (CD) — backend via Kamal, frontend to a separate static host — is intentionally out of scope and will be a separate change.

## Capabilities

### New Capabilities
- `ci-pipeline`: Continuous integration for the monorepo — path-scoped, independent backend and frontend pipelines wired to a single required aggregate status check that is branch-protection-safe.

### Modified Capabilities
<!-- None. No existing product capability's requirements change. -->

## Impact

- **New files**: `.github/workflows/ci.yml`, `.github/dependabot.yml`.
- **Removed files**: `backend/.github/workflows/ci.yml`, `backend/.github/dependabot.yml` (and the now-empty `backend/.github/`).
- **External config**: branch protection on `master` should require the `ci-success` check (manual GitHub setting, documented in tasks).
- **CI dependencies**: GitHub Actions `dorny/paths-filter`, `ruby/setup-ruby`, `actions/setup-node`, `actions/cache`, Postgres 17 service image, `libvips` apt package.
- **No application code changes** and **no repository secrets** required for CI to pass.
