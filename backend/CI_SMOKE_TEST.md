# CI smoke test

Throwaway file used to verify that a **backend-only** change triggers the
backend CI jobs (RuboCop, security scan, and Postgres-backed tests) and skips
the frontend jobs, while `ci-success` still passes.

Safe to delete once the CI pipeline split is confirmed working.
