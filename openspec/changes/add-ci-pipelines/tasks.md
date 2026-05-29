## 1. Clean up misplaced config

- [x] 1.1 Remove `backend/.github/workflows/ci.yml`
- [x] 1.2 Remove `backend/.github/dependabot.yml` and the now-empty `backend/.github/` directory

## 2. Root workflow scaffold

- [x] 2.1 Create `.github/workflows/ci.yml` named `CI`, triggering on `pull_request` and `push` to `master` (no top-level `paths` filter)
- [x] 2.2 Add a `concurrency` group keyed on the ref with `cancel-in-progress: true`
- [x] 2.3 Add a `changes` job using `dorny/paths-filter` that outputs `backend` and `frontend` booleans (filters: `backend/**`, `frontend/**`)

## 3. Backend pipeline jobs (gated on `needs.changes.outputs.backend == 'true'`)

- [x] 3.1 `backend-scan`: checkout, `ruby/setup-ruby` with `bundler-cache` and `working-directory: backend`; run `bin/brakeman --no-pager` and `bin/bundler-audit`
- [x] 3.2 `backend-lint`: checkout, `ruby/setup-ruby` (bundler cache, `working-directory: backend`), restore rubocop cache (carry over key from old `ci.yml`); run `bin/rubocop -f github`
- [x] 3.3 `backend-test`: install `libvips` via apt; add a Postgres 17 service (`scoreboard`/`scoreboard`, db `scoreboard_test`, with healthcheck)
- [x] 3.4 `backend-test`: `ruby/setup-ruby` (bundler cache, `working-directory: backend`); set env `RAILS_ENV=test`, `DATABASE_HOST=localhost`, `DATABASE_PORT=5432`, `DATABASE_USER=scoreboard`, `DATABASE_PASSWORD=scoreboard`, `DATABASE_NAME=scoreboard_test`; run `bin/rails db:test:prepare test`
- [x] 3.5 Confirm no GitHub secret is referenced by any backend job (no `RAILS_MASTER_KEY`)

## 4. Frontend pipeline jobs (gated on `needs.changes.outputs.frontend == 'true'`)

- [x] 4.1 `frontend-lint`: checkout, `actions/setup-node` (Node 25, `cache: npm`, `cache-dependency-path: frontend/package-lock.json`, `working-directory: frontend`); run `npm ci` then `npm run lint`
- [x] 4.2 `frontend-test`: same setup; run `npm ci` then `npm run test`
- [x] 4.3 `frontend-build`: same setup; run `npm ci` then `npm run build` (covers `tsc -b` type-check + `vite build`)

## 5. Aggregate gate

- [x] 5.1 Add `ci-success` job with `if: always()`, `needs:` all backend and frontend jobs
- [x] 5.2 Make it fail if any needed job's result is `failure` or `cancelled`, and succeed when all are `success` or `skipped`

## 6. Dependabot

- [x] 6.1 Create `.github/dependabot.yml` with a `bundler` ecosystem entry for `/backend` and an `npm` ecosystem entry for `/frontend` (weekly schedule)

## 7. Verify

- [ ] 7.1 Validate the change with `openspec validate add-ci-pipelines --strict`
- [ ] 7.2 Lint the workflow YAML locally (e.g. `actionlint` if available) and confirm valid syntax
- [ ] 7.3 Open a PR touching only `frontend/`; confirm frontend jobs run, backend jobs are skipped, and `ci-success` passes
- [ ] 7.4 Open a PR touching only `backend/`; confirm backend jobs (incl. Postgres-backed tests) run, frontend jobs are skipped, and `ci-success` passes
- [ ] 7.5 In GitHub branch protection for `master`, require only the `ci-success` status check (document this manual step in the PR description)
