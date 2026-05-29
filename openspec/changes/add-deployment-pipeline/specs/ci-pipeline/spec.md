## ADDED Requirements

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
