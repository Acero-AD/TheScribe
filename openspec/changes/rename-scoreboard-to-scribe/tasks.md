## 1. Docs & top-level README (commit: "docs: rename Scoreboard -> The Scribe")

- [x] 1.1 Update `README.md`: H1 to `# The Scribe`, body prose to "The Scribe" / "Scribe", and the `docs/scoreboard-app.md` link to `docs/scribe-app.md`
- [x] 1.2 `git mv docs/scoreboard-app.md docs/scribe-app.md` and update the product name inside it
- [x] 1.3 Update `docs/testing-on-phone.md` name references
- [x] 1.4 Rename `docs/design/Scoreboard.html` -> `docs/design/Scribe.html` (`git mv`) and update name references in `docs/design/*.jsx` + the renamed HTML
- [x] 1.5 Confirm no broken intra-doc links remain (grep docs/ for `scoreboard-app` and `Scoreboard.html`)

## 2. Frontend copy & UI (commit: "frontend: rebrand to The Scribe / Scribe")

- [ ] 2.1 `frontend/public/manifest.webmanifest`: set `name` to "The Scribe" and `short_name` to "Scribe"
- [ ] 2.2 `frontend/index.html`: set `<title>` to "The Scribe" and any meta description/name references
- [ ] 2.3 `frontend/public/sw.js`: update notification title and any cache-name string containing `scoreboard` (cache-key bump is acceptable pre-deploy)
- [ ] 2.4 `frontend/src/screens/SignInScreen.tsx`: change the brand eyebrow from `SCOREBOARD` to `SCRIBE` (per the account-access delta spec)
- [ ] 2.5 `frontend/src/screens/SettingsScreen.tsx`: update any visible name/eyebrow references to "Scribe"
- [ ] 2.6 `frontend/src/components/__tests__/ScreenHeader.test.tsx`: update the `SCOREBOARD` test value to `SCRIBE` (per the ui-primitives delta spec)
- [ ] 2.7 `frontend/README.md`: update product-name references
- [ ] 2.8 Check for any `scoreboard` localStorage keys or constants in `frontend/src`; rename to `scribe` (resetting local state is acceptable pre-deploy)

## 3. Backend code & identity (commit: "backend: rename module + identity to Scribe")

- [ ] 3.1 `backend/config/application.rb`: rename `module Scoreboard` -> `module Scribe`
- [ ] 3.2 Grep `backend/` case-sensitively for `Scoreboard` and update any remaining `Scoreboard::` references (e.g. `config/environment.rb`, `config.ru`)
- [ ] 3.3 `backend/config/initializers/vapid.rb`: update the VAPID subject / identity name reference
- [ ] 3.4 `backend/app/mailers/application_mailer.rb` + `user_mailer.rb`: update default `from` display name and the magic-link subject to use "Scribe" (e.g. "Your Scribe sign-in link" — no article)
- [ ] 3.5 `backend/app/views/user_mailer/magic_link.html.erb` + `.text.erb`: update name references in the email body
- [ ] 3.6 `backend/app/jobs/send_reminder_job.rb`: update the push-notification title to "Scribe"
- [ ] 3.7 `backend/Dockerfile.dev`: update any `scoreboard` references (paths/labels)
- [ ] 3.8 `backend/test/integration/magic_links_show_test.rb`: update any asserted copy/name strings
- [ ] 3.9 `backend/README.md`: update product-name references

## 4. Database & infra rename (commit: "infra: rename databases scoreboard_* -> scribe_*")

- [ ] 4.1 `backend/config/database.yml`: rename all `scoreboard_*` database names to `scribe_*` (development, test, production, and the solid_* secondary DBs)
- [ ] 4.2 `backend/docker-compose.yml`: update `POSTGRES_DB`, service/container name, and named volume from `scoreboard` to `scribe`
- [ ] 4.3 Inspect `.github/workflows/ci.yml`; update only if it references a `scoreboard_*` database name, otherwise leave unchanged
- [ ] 4.4 Rebuild dev databases via docker compose: `docker compose down && docker compose up -d`, then run `db:prepare` through `docker compose`

## 5. Verification & residual sweep

- [ ] 5.1 Backend: run the test suite via `docker compose`; confirm green
- [ ] 5.2 Frontend: `npm run build` + test suite; confirm green
- [ ] 5.3 Boot the app and confirm the sign-in screen renders the `SCRIBE` eyebrow and the magic-link email reads "Scribe"
- [ ] 5.4 Final sweep: `grep -ri scoreboard` excluding `node_modules`, `.git`, and `openspec/changes/archive/` returns no hits (archived proposals are intentionally left frozen)
