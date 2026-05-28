# Scoreboard

A private, distraction-free tracker for writers who want to build the habit before they chase the result.

Two questions per day. A streak that tells the truth. Nothing else.

## Why

Most people writing online measure themselves against things they don't control — views, follows, the algorithm. The feedback loop is broken: you do the work, a system decides the outcome, and you walk away feeling either lucky or defeated. Neither teaches you anything.

Scoreboard flips it. You only measure what's yours to control:

- **Did I write today?**
- **Did I publish this week?**

That's it. Binary, honest, fast. If the streak holds, you held it. If it breaks, you broke it. No grading, no comparison, no social layer.

## What's in the app

- **Today** — the two daily check-ins, your current streaks, and a one-line note ("what did you write about?") that auto-saves
- **History** — a calendar of your past activity; a published week reads differently from a written-only week
- **Settings** — daily reminder time, week-start day, weekly vs. bi-weekly publish cadence
- **Daily reminder push** — an opt-in nudge at the time you choose, delivered as a system notification (PWA + Web Push)

It installs to the Home Screen on iOS and Android and runs in standalone mode — no browser chrome, no tabs to lose it in.

The full design rationale lives in [`docs/scoreboard-app.md`](docs/scoreboard-app.md).

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, installable PWA with a small Service Worker for push |
| Backend | Rails 8.1 (API-only with sessions added back manually), PostgreSQL 17 |
| Auth | Email magic links (no passwords) |
| Notifications | Web Push (VAPID) via the backend dispatcher |
| Spec workflow | [OpenSpec](https://github.com/openspec-org) — every change is proposed → designed → implemented → archived |

## Run it locally

```sh
# Backend (Postgres + Rails on :3000)
cd backend
docker compose up -d
bundle install
bin/rails db:prepare

# Frontend (Vite on :5173)
cd ../frontend
npm install
npm run dev
```

Then open <http://localhost:5173/sign-in>. Submit your email, grab the magic link from <http://localhost:3000/letter_opener>, and you're in.

Per-app details live in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## Run it on your phone

The dev app can be tunneled out and installed on a phone — useful for verifying the PWA install flow, push notifications, and how the layout feels on a real device.

See [`docs/testing-on-phone.md`](docs/testing-on-phone.md).

## Project layout

```
backend/    Rails API — magic-link auth, daily/week logs, push dispatcher
frontend/   React PWA — screens, components, design tokens, service worker
docs/       Design document and operational playbooks
openspec/   Active and archived change proposals (the spec-driven workflow)
```

## Philosophy

The app isn't a productivity tool. It's a commitment device.

It's built so showing up feels like winning, regardless of what the algorithm decides about your work. The bar is low enough to clear every day; the streak is the proof you cleared it.
