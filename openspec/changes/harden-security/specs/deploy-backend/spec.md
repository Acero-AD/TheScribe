## ADDED Requirements

### Requirement: Deploy secrets are sourced from a manager, never plaintext working-tree files

Deploy-time secrets (Rails master key, database URL/password, mail provider key, container-registry credentials, and VAPID keys) SHALL be supplied to Kamal from a secrets manager, CI secrets, or the deploy environment — never stored as raw values in a working-tree file. No tracked OR untracked file in the repository working tree SHALL contain a live secret value in cleartext. Any secret that has been exposed in plaintext SHALL be rotated.

#### Scenario: No plaintext secret lives in the working tree
- **WHEN** the repository working tree is inspected (including gitignored files such as `backend/.env.deploy`)
- **THEN** secret values are sourced from a manager / CI / environment references and no live credential appears in cleartext in any file

#### Scenario: Exposed credentials are rotated
- **WHEN** a credential has been stored or transmitted in plaintext
- **THEN** that credential (Rails master key, database password, mail provider key, registry token) is rotated and the old value is invalidated

#### Scenario: Kamal resolves secrets at deploy time
- **WHEN** a deploy runs
- **THEN** Kamal reads each secret from the configured manager / CI secret / environment reference rather than from a committed or working-tree plaintext file

### Requirement: Production restricts the Host header to the backend domain

The backend SHALL authorize incoming requests by `Host` in production, accepting only its own configured domain and rejecting others, to close DNS-rebinding and Host-header injection. The health-check path SHALL be excluded so the proxy's HTTP probe still succeeds.

#### Scenario: Request for the configured host is served
- **WHEN** a request arrives with the backend's configured production `Host`
- **THEN** the request is processed normally

#### Scenario: Request with an unexpected Host is rejected
- **WHEN** a request arrives with a `Host` header that is not the configured backend domain
- **THEN** the backend rejects it (does not serve application content)

#### Scenario: Health check is exempt from Host authorization
- **WHEN** the proxy probes the health-check path
- **THEN** the probe succeeds regardless of the Host-authorization restriction

### Requirement: Mailer host configuration fails loudly when unset

Because magic-link emails embed an absolute URL built from the backend's public host, production SHALL require that host to be explicitly configured and SHALL NOT silently fall back to `localhost`. A missing host configuration SHALL surface as a startup/boot failure rather than producing unusable links.

#### Scenario: Missing host is detected
- **WHEN** the backend boots in production without the mailer host configured
- **THEN** the failure is surfaced (boot error) rather than generating magic-link URLs pointing at `localhost`

#### Scenario: Configured host produces correct links
- **WHEN** the backend boots with the mailer host set to its production domain
- **THEN** magic-link emails contain absolute URLs on that domain
