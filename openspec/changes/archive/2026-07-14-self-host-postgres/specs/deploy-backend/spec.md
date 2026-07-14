## MODIFIED Requirements

### Requirement: Production runs against a single managed Postgres database

The backend SHALL connect to one PostgreSQL database via a single connection URL. That database SHALL be self-hosted as a Kamal-managed accessory co-located on the same VPS as the backend container, rather than an external database service. The database MUST be reachable by the application only over the internal Docker network (it MUST NOT be exposed on a public interface), and its data MUST persist on a Kamal-managed volume/directory so it survives container restarts and redeploys. Background jobs (Solid Queue) and caching (Solid Cache) MUST operate within that same primary database rather than separate databases. The production configuration MUST NOT define separate cache, queue, or cable databases.

#### Scenario: One database serves app, jobs, and cache
- **WHEN** the backend boots in production
- **THEN** Active Record, Solid Queue, and Solid Cache all use the primary database connection
- **AND** no separate `CACHE_DATABASE_URL`, `QUEUE_DATABASE_URL`, or `CABLE_DATABASE_URL` is required

#### Scenario: Solid migrations are present in the primary schema
- **WHEN** the database is prepared during release
- **THEN** the Solid Queue and Solid Cache tables are created in the primary database

#### Scenario: Database runs co-located on the VPS over the internal network
- **WHEN** the production stack is running
- **THEN** Postgres runs as a Kamal accessory container on the same VPS as the backend
- **AND** the backend reaches it via the internal Docker network host (not a public/external endpoint)
- **AND** the Postgres port is not published on a public interface

#### Scenario: Database data survives a redeploy
- **WHEN** data is written and the backend (and/or its database accessory) is redeployed or restarted
- **THEN** the previously written data is still present
