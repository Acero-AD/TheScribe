# deploy-frontend Specification

## Purpose
TBD - created by archiving change add-deployment-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Frontend is published to Cloudflare Pages from CI

The static SPA build SHALL be published to Cloudflare Pages from the CI pipeline using direct upload (not Cloudflare's own git integration), so that publishing remains gated on the CI pipeline. Cloudflare credentials MUST be supplied as CI secrets.

#### Scenario: A green deploy publishes the build
- **WHEN** the frontend deploy runs against a green commit
- **THEN** the contents of the production build are uploaded to the Cloudflare Pages project
- **AND** the new version is served at the frontend domain

#### Scenario: Cloudflare credentials are not in the repository
- **WHEN** the repository is inspected
- **THEN** the Cloudflare API token and account/project identifiers are read from CI secrets and are not present in tracked files

### Requirement: The build embeds the production backend URL

The production build SHALL be produced with `VITE_BACKEND_URL` set to the backend's production API domain, so the SPA targets the production backend rather than `localhost`.

#### Scenario: Built bundle targets the production API
- **WHEN** the production build is created
- **THEN** API requests in the served bundle are sent to the production backend domain
- **AND** not to `http://localhost:3000`

### Requirement: Client-side routes are served by the SPA

Because the frontend uses client-side routing, the host SHALL serve the SPA entry point for unknown paths so that deep links and refreshes resolve to the application rather than a 404.

#### Scenario: Deep link resolves to the app
- **WHEN** a user loads a client-side route directly (e.g. refreshes a non-root path)
- **THEN** the SPA entry point is served and the route renders

### Requirement: Frontend deploys automatically on a green master push that changed the frontend

The frontend SHALL deploy automatically when, and only when, a push to `master` has passing frontend pipeline jobs and the push changed files under `frontend/**`. It MUST NOT deploy from pull requests, from failing runs, or from pushes that did not change the frontend.

#### Scenario: Frontend-only green master push deploys the frontend
- **WHEN** a push to `master` changes files under `frontend/**` and the frontend pipeline jobs pass
- **THEN** the frontend is deployed

#### Scenario: Backend-only push does not deploy the frontend
- **WHEN** a push to `master` changes only files under `backend/**`
- **THEN** the frontend deploy does not run

#### Scenario: Failing frontend pipeline blocks deploy
- **WHEN** a push to `master` changes the frontend but a frontend pipeline job fails
- **THEN** the frontend deploy does not run

#### Scenario: Pull requests never deploy
- **WHEN** a pull request runs the pipeline
- **THEN** no frontend deploy runs

### Requirement: The published SPA sends security response headers

The frontend host (Cloudflare Pages) SHALL return security headers with the served application so a cookie-authenticated SPA has standard defense-in-depth against clickjacking, MIME sniffing, and referrer leakage. The response SHALL include a `Content-Security-Policy` restricting scripts and styles to the application origin and limiting `connect-src` to the application origin and the production backend API origin; `frame-ancestors 'none'` (or an equivalent `X-Frame-Options`); `X-Content-Type-Options: nosniff`; and a `Referrer-Policy` of `strict-origin-when-cross-origin` (or stricter). The headers SHALL NOT block the SPA's own scripts/styles or its API calls to the backend.

#### Scenario: Security headers are present on the served app
- **WHEN** a client loads the deployed frontend
- **THEN** the response includes `Content-Security-Policy`, a frame-ancestors / `X-Frame-Options` restriction, `X-Content-Type-Options: nosniff`, and a `Referrer-Policy`

#### Scenario: The CSP permits the app and its backend
- **WHEN** the served SPA loads its own bundle and makes API requests to the production backend origin
- **THEN** the configured CSP allows the app's scripts/styles and the backend `connect-src`, and the app functions normally

#### Scenario: Framing is disallowed
- **WHEN** a third-party page attempts to embed the SPA in an iframe
- **THEN** the framing is blocked by `frame-ancestors 'none'` / `X-Frame-Options`

