## 1. Docs & top-level README (commit: "docs: rename Scoreboard -> The Scribe")

- [x] 1.1 Update `README.md`: H1 to `# The Scribe`, body prose to "The Scribe" / "Scribe", and the `docs/scoreboard-app.md` link to `docs/scribe-app.md`
- [x] 1.2 `git mv docs/scoreboard-app.md docs/scribe-app.md` and update the product name inside it
- [x] 1.3 Update `docs/testing-on-phone.md` name references
- [x] 1.4 Rename `docs/design/Scoreboard.html` -> `docs/design/Scribe.html` (`git mv`) and update name references in `docs/design/*.jsx` + the renamed HTML
- [x] 1.5 Confirm no broken intra-doc links remain (grep docs/ for `scoreboard-app` and `Scoreboard.html`)

## 2. Frontend copy & UI (commit: "frontend: rebrand to The Scribe / Scribe")

- [x] 2.1 `frontend/public/manifest.webmanifest`: set `name` to "The Scribe" and `short_name` to "Scribe"
- [x] 2.2 `frontend/index.html`: set `<title>` to "The Scribe" and any meta description/name references
- [x] 2.3 `frontend/public/sw.js`: update notification title and any cache-name string containing `scoreboard` (cache-key bump is acceptable pre-deploy) — no cache-name referenced the old name; updated the comment and notification-body fallback
- [x] 2.4 `frontend/src/screens/SignInScreen.tsx`: change the brand eyebrow from `SCOREBOARD` to `SCRIBE` (per the account-access delta spec)
- [x] 2.5 `frontend/src/screens/SettingsScreen.tsx`: update any visible name/eyebrow references to "Scribe"
- [x] 2.6 `frontend/src/components/__tests__/ScreenHeader.test.tsx`: update the `SCOREBOARD` test value to `SCRIBE` (per the ui-primitives delta spec)
- [x] 2.7 `frontend/README.md`: update product-name references
- [x] 2.8 Check for any `scoreboard` localStorage keys or constants in `frontend/src`; rename to `scribe` (resetting local state is acceptable pre-deploy) — none found

## 3. Backend code & identity (commit: "backend: rename module + identity to Scribe")

- [x] 3.1 ~~rename `module Scoreboard` -> `module Scribe`~~ — N/A: the Rails module is `Backend`, not `Scoreboard`. The real "scoreboard" code identifier is the session cookie key `_scoreboard_session` in `config/application.rb`; renamed it to `_scribe_session`
- [x] 3.2 Grep `backend/` case-sensitively for `Scoreboard` — no `Scoreboard::` constant references exist; updated the cookie-key assertion in `test/integration/magic_links_show_test.rb` to `_scribe_session`
- [x] 3.3 `backend/config/initializers/vapid.rb`: VAPID subject -> `mailto:reminders@scribe.local`
- [x] 3.4 `backend/app/mailers/application_mailer.rb` + `user_mailer.rb`: `from` -> "The Scribe <no-reply@scribe.local>", subject -> "Sign in to Scribe"
- [x] 3.5 `backend/app/views/user_mailer/magic_link.html.erb` + `.text.erb`: eyebrow `SCRIBE`, button "Sign in to Scribe", body + "— The Scribe" sign-off
- [x] 3.6 `backend/app/jobs/send_reminder_job.rb`: `NOTIFICATION_BODY` -> "A nudge from The Scribe." (title was already generic "Did you write today?")
- [x] 3.7 `backend/Dockerfile.dev`: comment -> "The Scribe backend"
- [x] 3.8 `backend/test/integration/magic_links_show_test.rb`: cookie assertion updated (3.2); no copy/name strings asserted
- [x] 3.9 `backend/README.md`: H1 -> "# The Scribe backend" (db-name references deferred to layer 4 with `database.yml`)

## 4. Database & infra rename (commit: "infra: rename databases scoreboard_* -> scribe_*")

- [x] 4.1 `backend/config/database.yml`: renamed all `scoreboard_*` database names to `scribe_*` and the default user/password `scoreboard` -> `scribe`
- [x] 4.2 `backend/docker-compose.yml`: updated `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`, the `DATABASE_*` web env, the healthcheck, and container names (`scribe-postgres`/`scribe-web`). The named volumes (`postgres-data`/`bundle-cache`/`rails-tmp`) never referenced the old name
- [x] 4.3 `.github/workflows/ci.yml` referenced `scoreboard_test` + creds; renamed to `scribe_test` + `scribe` to keep CI green. Also fixed a missed product-name reference in `IMPLEMENTATION_ORDER.md`
- [ ] 4.4 Rebuild dev databases via docker compose: `docker compose down && docker compose up -d`, then run `db:prepare` through `docker compose`

## 5. Verification & residual sweep

- [ ] 5.1 Backend: run the test suite via `docker compose`; confirm green
- [ ] 5.2 Frontend: `npm run build` + test suite; confirm green
- [ ] 5.3 Boot the app and confirm the sign-in screen renders the `SCRIBE` eyebrow and the magic-link email reads "Scribe"
- [ ] 5.4 Final sweep: `grep -ri scoreboard` excluding `node_modules`, `.git`, and `openspec/changes/archive/` returns no hits (archived proposals are intentionally left frozen)
