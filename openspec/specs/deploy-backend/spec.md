# deploy-backend Specification

## Purpose
TBD - created by archiving change add-deployment-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Backend is deployed to a VPS via Kamal from a container registry

The Rails backend SHALL be deployed to a single VPS using Kamal. The deployment process MUST build the production image, push it to a container registry the deploy host can pull from, and run it as the application container. The Kamal configuration MUST target the real production host and registry (no placeholder host or `localhost` registry).

#### Scenario: Deploy publishes and runs the current image
- **WHEN** a deploy is run against a green commit
- **THEN** the production image for that commit is built and pushed to the registry
- **AND** the VPS pulls and runs that image as the backend container

#### Scenario: Configuration contains no placeholders
- **WHEN** the Kamal configuration is inspected
- **THEN** it references the real production host and registry
- **AND** it contains no `192.168.0.1` host or `localhost` registry placeholder

### Requirement: Production runs against a single managed Postgres database

The backend SHALL connect to one managed PostgreSQL database via a single connection URL. Background jobs (Solid Queue) and caching (Solid Cache) MUST operate within that same primary database rather than separate databases. The production configuration MUST NOT define separate cache, queue, or cable databases.

#### Scenario: One database serves app, jobs, and cache
- **WHEN** the backend boots in production
- **THEN** Active Record, Solid Queue, and Solid Cache all use the primary database connection
- **AND** no separate `CACHE_DATABASE_URL`, `QUEUE_DATABASE_URL`, or `CABLE_DATABASE_URL` is required

#### Scenario: Solid migrations are present in the primary schema
- **WHEN** the database is prepared during release
- **THEN** the Solid Queue and Solid Cache tables are created in the primary database

### Requirement: Real-time messaging is not provisioned

The production stack SHALL NOT include Solid Cable or an Action Cable database. The `solid_cable` gem, its configuration, and its migrations MUST be removed.

#### Scenario: No cable database or adapter
- **WHEN** the backend boots in production
- **THEN** no cable database connection is established
- **AND** the application starts successfully without Solid Cable

### Requirement: Magic-link email is delivered via production SMTP

Because authentication relies on magic-link email, the backend SHALL deliver mail in production through a configured SMTP provider. SMTP credentials MUST be supplied via secrets/credentials, not committed to the repository.

#### Scenario: Magic-link email is sent
- **WHEN** a user requests a magic link in production
- **THEN** the email is delivered via the configured SMTP provider

#### Scenario: SMTP credentials are not in the repository
- **WHEN** the repository is inspected
- **THEN** SMTP credentials are read from secrets/credentials and are not present in tracked files

### Requirement: The frontend origin is allowed and is the magic-link redirect target

The backend SHALL permit cross-origin API requests from the deployed frontend origin and SHALL redirect magic-link verification back to that frontend origin. Both MUST be configured for the production frontend domain.

#### Scenario: Cross-origin request from the frontend is permitted
- **WHEN** the deployed frontend makes an API request to the backend
- **THEN** the request is allowed by CORS

#### Scenario: Magic-link verification returns the user to the frontend
- **WHEN** a user clicks a magic link and it is verified
- **THEN** the user is redirected to the production frontend origin

### Requirement: Uploaded files persist across deploys

Active Storage uploads SHALL be stored on a persistent volume that survives container restarts and redeploys.

#### Scenario: An upload survives a redeploy
- **WHEN** a file is uploaded and the backend is redeployed
- **THEN** the previously uploaded file is still retrievable

### Requirement: The backend is served over TLS

The backend SHALL be reachable only over HTTPS in production, with a valid certificate. The application MUST be configured to assume and force SSL behind its proxy.

#### Scenario: HTTPS is served with a valid certificate
- **WHEN** a client connects to the backend domain over HTTPS
- **THEN** the connection succeeds with a valid certificate

#### Scenario: Plain HTTP is not served
- **WHEN** a client connects over plain HTTP
- **THEN** it is redirected to HTTPS

### Requirement: Backend deploys automatically on a green master push that changed the backend

The backend SHALL deploy automatically when, and only when, a push to `master` has passing backend pipeline jobs and the push changed files under `backend/**`. It MUST NOT deploy from pull requests, from failing runs, or from pushes that did not change the backend.

#### Scenario: Backend-only green master push deploys the backend
- **WHEN** a push to `master` changes files under `backend/**` and the backend pipeline jobs pass
- **THEN** the backend is deployed

#### Scenario: Frontend-only push does not deploy the backend
- **WHEN** a push to `master` changes only files under `frontend/**`
- **THEN** the backend deploy does not run

#### Scenario: Failing backend pipeline blocks deploy
- **WHEN** a push to `master` changes the backend but a backend pipeline job fails
- **THEN** the backend deploy does not run

#### Scenario: Pull requests never deploy
- **WHEN** a pull request runs the pipeline
- **THEN** no backend deploy runs

