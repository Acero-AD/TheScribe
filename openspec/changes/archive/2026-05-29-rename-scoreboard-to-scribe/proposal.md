## Why

"Scoreboard" implies points, ranking, and competition — the exact broken feedback loop this app exists to free writers from (no grading, no comparison, no social layer). The name fights the product's own philosophy. Renaming to **The Scribe** now, before the first deploy, avoids costly production renames later (database names, deploy subdomains, push-notification identity).

## What Changes

- Rebrand the product to **The Scribe** (display wordmark), **Scribe** (PWA short name and in-sentence copy), with code identifier `scribe`.
- Update all user-facing copy: the three `README.md` files, `docs/`, the PWA manifest name, the page `<title>`, the sign-in screen brand eyebrow (`SCOREBOARD` → `SCRIBE`), Settings/Sign-in UI strings, the magic-link email subject and body, and the push-notification title.
- **BREAKING (local dev only):** rename the Rails application module `Scoreboard` → `Scribe` and the PostgreSQL databases `scoreboard_*` → `scribe_*` (`config/database.yml` + `docker-compose.yml`). This requires rebuilding the local dev databases via `docker compose` + `db:prepare`; no production data exists yet, so there is no migration.
- Set the deploy subdomains to `scribe` / `scribe-api` (existing `<app>` / `<app>-api` convention).
- Rename `docs/scoreboard-app.md` → `docs/scribe-app.md` and `docs/design/Scoreboard.html` → `docs/design/Scribe.html`, and fix inbound references.
- Leave archived OpenSpec proposals under `openspec/changes/archive/` untouched — they are a historical record of decisions made when the product was named Scoreboard.

## Capabilities

### New Capabilities

_None — this is a rename/branding change; it introduces no new behavior._

### Modified Capabilities

- `account-access`: the sign-in screen's brand eyebrow changes from `SCOREBOARD` to `SCRIBE`.
- `ui-primitives`: the `ScreenHeader` requirement's illustrative eyebrow value changes from `SCOREBOARD` to `SCRIBE`, keeping the spec consistent with the live app.

## Impact

- **Frontend:** `manifest.webmanifest`, `index.html`, `public/sw.js`, `src/screens/SettingsScreen.tsx`, `src/screens/SignInScreen.tsx`, `src/components/__tests__/ScreenHeader.test.tsx`, `frontend/README.md`.
- **Backend:** `config/application.rb` (module rename), `config/database.yml`, `docker-compose.yml`, `Dockerfile.dev`, `config/initializers/vapid.rb`, `app/mailers/application_mailer.rb`, `app/mailers/user_mailer.rb` + `magic_link` views, `app/jobs/send_reminder_job.rb`, `test/integration/magic_links_show_test.rb`, `backend/README.md`.
- **Docs:** `README.md`, `docs/scoreboard-app.md` (+ rename), `docs/testing-on-phone.md`, `docs/design/*`.
- **Specs:** `openspec/specs/account-access/spec.md`, `openspec/specs/ui-primitives/spec.md`.
- **Infra / deploy:** subdomains `scribe` / `scribe-api`; `.github/workflows/ci.yml` only if it references the database name.
- **No** API contract changes, **no** dependency changes, **no** data migration (the app is not yet deployed).
