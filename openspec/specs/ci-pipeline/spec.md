# ci-pipeline Specification

## Purpose
TBD - created by archiving change add-ci-pipelines. Update Purpose after archive.
## Requirements
### Requirement: Continuous integration triggers on pull requests and master pushes

The CI workflow SHALL run on every pull request and on every push to the `master` branch. The workflow itself MUST NOT carry a top-level path filter, so that the change-detection gate and the aggregate result check always execute.

#### Scenario: Pull request opened
- **WHEN** a pull request targeting `master` is opened or updated
- **THEN** the CI workflow runs

#### Scenario: Push to master
- **WHEN** a commit is pushed to `master`
- **THEN** the CI workflow runs

#### Scenario: Superseded run is cancelled
- **WHEN** a newer commit is pushed to the same ref while a CI run is in progress
- **THEN** the in-progress run for that ref is cancelled and the newer run proceeds

### Requirement: Backend jobs run only when backend code changes

The backend pipeline jobs SHALL execute only when files under `backend/**` changed in the triggering event. When no backend files changed, the backend jobs MUST be skipped (not run and not failed).

#### Scenario: Change touches backend only
- **WHEN** a pull request changes files under `backend/` but no files under `frontend/`
- **THEN** the backend jobs run
- **AND** the frontend jobs are skipped

#### Scenario: Change touches frontend only
- **WHEN** a pull request changes files under `frontend/` but no files under `backend/`
- **THEN** the backend jobs are skipped

### Requirement: Frontend jobs run only when frontend code changes

The frontend pipeline jobs SHALL execute only when files under `frontend/**` changed in the triggering event. When no frontend files changed, the frontend jobs MUST be skipped (not run and not failed).

#### Scenario: Change touches frontend only
- **WHEN** a pull request changes files under `frontend/` but no files under `backend/`
- **THEN** the frontend jobs run
- **AND** the backend jobs are skipped

#### Scenario: Change touches both directories
- **WHEN** a pull request changes files under both `backend/` and `frontend/`
- **THEN** both the backend jobs and the frontend jobs run

### Requirement: Backend pipeline validates style, security, and tests

When the backend pipeline runs, it SHALL verify Ruby style with RuboCop, scan for security issues with Brakeman and bundler-audit, and run the Rails test suite against a Postgres database. The test job MUST provision a Postgres service and prepare the test database before running tests. CI MUST require no repository secrets to pass.

#### Scenario: Backend checks pass
- **WHEN** the backend pipeline runs against code with no RuboCop offenses, no Brakeman/bundler-audit findings, and a passing test suite
- **THEN** all backend jobs (scan, lint, test) succeed

#### Scenario: A backend check fails
- **WHEN** any of RuboCop, Brakeman, bundler-audit, or the Rails test suite reports a failure
- **THEN** the corresponding backend job fails

#### Scenario: Tests run against Postgres without external secrets
- **WHEN** the backend test job starts
- **THEN** a Postgres service is available, the test database is prepared, and the suite runs without any configured GitHub secret

### Requirement: Frontend pipeline validates lint, tests, and build

When the frontend pipeline runs, it SHALL verify code with ESLint, run the Vitest suite, and produce a production build (which also type-checks via `tsc`). Dependencies MUST be installed from the lockfile.

#### Scenario: Frontend checks pass
- **WHEN** the frontend pipeline runs against code that lints clean, has a passing Vitest suite, and builds successfully
- **THEN** all frontend jobs (lint, test, build) succeed

#### Scenario: A frontend check fails
- **WHEN** ESLint reports an error, the Vitest suite fails, or the build (including type-check) fails
- **THEN** the corresponding frontend job fails

### Requirement: A single aggregate check gates branch protection

The workflow SHALL provide one aggregate result job that always runs and depends on all pipeline jobs. This job MUST succeed when every pipeline job either succeeded or was skipped, and MUST fail when any pipeline job failed or was cancelled. This aggregate job is the only status check intended to be marked required in branch protection.

#### Scenario: Frontend-only change with passing frontend jobs
- **WHEN** a frontend-only pull request runs, the frontend jobs pass, and the backend jobs are skipped
- **THEN** the aggregate check succeeds
- **AND** the pull request is not blocked waiting on the skipped backend jobs

#### Scenario: A pipeline job fails
- **WHEN** any backend or frontend job fails
- **THEN** the aggregate check fails

#### Scenario: No relevant code changed
- **WHEN** a change touches neither `backend/` nor `frontend/` (e.g. only `docs/`)
- **THEN** all pipeline jobs are skipped
- **AND** the aggregate check still runs and succeeds

### Requirement: CI configuration lives at the repository root

All CI workflow and dependency-automation configuration SHALL reside under the repository-root `.github/` directory, since GitHub Actions only reads workflows from the repository root. Misplaced nested copies under subdirectories MUST be removed.

#### Scenario: Workflow discoverable by GitHub
- **WHEN** the repository is pushed to GitHub
- **THEN** the CI workflow at the repository-root `.github/workflows/` is discovered and executed

#### Scenario: No nested workflow directories remain
- **WHEN** inspecting the repository after this change
- **THEN** no `.github/workflows/` directory exists under `backend/` or `frontend/`

### Requirement: Dependency updates are monitored for both ecosystems

The repository SHALL configure Dependabot at the repository root to monitor the backend `bundler` dependencies and the frontend `npm` dependencies.

#### Scenario: Backend gem update available
- **WHEN** a backend gem has a newer version
- **THEN** Dependabot can open a pull request updating it under `backend/`

#### Scenario: Frontend npm update available
- **WHEN** a frontend npm package has a newer version
- **THEN** Dependabot can open a pull request updating it under `frontend/`

### Requirement: Deployment jobs run only on master pushes after a green pipeline

The workflow SHALL include deployment jobs that run only on pushes to `master`, never on pull requests. Each deployment job MUST depend on its area's pipeline jobs and run only when those jobs succeeded. This keeps deployment gated on the same checks that protect the branch.

#### Scenario: Deploy jobs are skipped on pull requests
- **WHEN** the workflow runs for a pull request
- **THEN** no deployment job runs

#### Scenario: Deploy runs only after a green pipeline on master
- **WHEN** a push to `master` completes its pipeline jobs successfully
- **THEN** the matching deployment job runs

#### Scenario: A failed pipeline job prevents its deploy
- **WHEN** a push to `master` has a failing pipeline job for an area
- **THEN** that area's deployment job does not run

### Requirement: Deployments are independent per changed area

The backend and frontend deployments SHALL be independent: a deployment job for an area runs only when that area changed in the push, reusing the existing change-detection outputs. A push that changed only one area MUST deploy only that area.

#### Scenario: Backend-only change deploys backend only
- **WHEN** a push to `master` changes files under `backend/**` but not `frontend/**`
- **THEN** the backend deployment runs
- **AND** the frontend deployment does not run

#### Scenario: Frontend-only change deploys frontend only
- **WHEN** a push to `master` changes files under `frontend/**` but not `backend/**`
- **THEN** the frontend deployment runs
- **AND** the backend deployment does not run

#### Scenario: A change touching both areas deploys both
- **WHEN** a push to `master` changes files under both `backend/**` and `frontend/**` and both pipelines pass
- **THEN** both deployments run

### Requirement: Deployment jobs are not required branch-protection checks

The deployment jobs SHALL NOT be part of the required aggregate gate. The only required status check MUST remain the existing aggregate `ci-success` job, so that pull requests are never blocked waiting on deployment jobs (which do not run for pull requests).

#### Scenario: Required check is unchanged by deployment
- **WHEN** branch protection is configured
- **THEN** only the aggregate `ci-success` job is required
- **AND** the deployment jobs are not required checks

