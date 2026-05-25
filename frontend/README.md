# Scoreboard frontend

React 19 + TypeScript + Vite. Talks to the Rails backend over a credentialed
`fetch` so the session cookie is sent on every authenticated request.

## Setup

```sh
npm install
```

## Run

```sh
npm run dev   # http://localhost:5173
```

The dev server expects the backend at `http://localhost:3000`. Override with
`VITE_BACKEND_URL` if needed:

```sh
VITE_BACKEND_URL=http://localhost:4000 npm run dev
```

## Sign-in flow

1. Visit any route — `RequireAuth` (`src/auth/RequireAuth.tsx`) calls
   `GET /me` via `useCurrentUser` and redirects to `/sign-in` if 401.
2. The sign-in screen (`src/screens/SignInScreen.tsx`) POSTs the email to
   `/magic_links` and swaps to a "check your email" confirmation.
3. The user clicks the link in the email (use the dev mailbox at
   `http://localhost:3000/letter_opener`); the backend verifies the token and
   redirects to `http://localhost:5173/`.
4. The home screen (`src/screens/HomeScreen.tsx`) shows the signed-in email
   and a "Sign out" button that calls `DELETE /sessions/current`.

If the link is invalid/expired/used, the backend redirects to
`/sign-in?error=invalid|expired|consumed` and the sign-in screen surfaces a
matching message above the form.

## CORS / cookies (dev)

The API client (`src/api/client.ts`) sends `credentials: 'include'` on every
request. The backend allows `http://localhost:5173` with `credentials: true`
and sets the session cookie `SameSite=None; Secure; HttpOnly`. In production,
the cookie flips to `SameSite=Lax` (assumes same-origin); revisit the CORS
allowlist if the production deploy is split-origin.

## Today screen patterns

The Today screen (`src/screens/TodayScreen.tsx`) establishes two write patterns
that later capabilities (`weekly-publishing`, `streaks`, etc.) should mirror.

### Optimistic toggle with revert-on-error

The writing check-in card (`src/components/WritingCheckInCard.tsx`) is a "tap
and trust" control. The parent owns the request lifecycle:

1. On tap, the local state flips immediately so the UI reacts in the same
   frame.
2. `putDailyLog(today, { wrote: next })` fires in the background.
3. On 2xx, the server's row replaces local state (the timestamps come from
   the server, not the client).
4. On error, local state is reverted to the prior snapshot and an inline
   error indicator is rendered on the card.
5. Rapid taps are coalesced: only one PUT is in flight at a time. A second
   tap while a request is pending queues the latest value and fires it after
   the first request resolves. This keeps the server in sync without piling
   up requests.

When you add another check-in card (e.g. the weekly publish toggle), mirror
this contract: the card is presentational and receives `{ value, onToggle,
error }` from the screen; the screen owns the optimistic update, the
in-flight ref, and the queued-value ref. The `WeeklyPublishCard` follows
this contract — see `src/components/WeeklyPublishCard.tsx` and the publish-
toggle handlers in `TodayScreen.tsx`.

### Local-clock-driven date hooks

The Today screen uses two hooks that derive a calendar date from the user's
timezone and refresh as the local clock crosses a boundary:

- `useTodayDate()` (`src/hooks/useTodayDate.ts`) returns today's date for the
  daily card.
- `useThisWeekStart()` (`src/hooks/useThisWeekStart.ts`) returns the first
  day of the user's current week for the publish card, derived from
  `useCurrentUser().settings.timezone` and `week_starts_on`.

Both follow the same refresh pattern: recompute on a 60-second interval,
on `window focus`, and on `document visibilitychange`. This lets the cards
roll forward at midnight (and at the user's chosen week-start day) without
a manual refresh. Any future card whose visible state depends on the local
clock should use the same pattern rather than rolling its own.

### Note-on-blur autosave

The note card (`src/components/NoteCard.tsx`) saves on blur, not on every
keystroke. The pattern:

1. The textarea is a controlled input over local component state.
2. On `blur`, the current value is compared against a `persistedRef` of the
   last value the server confirmed.
3. If they differ, `onSave(value)` is fired; otherwise no request is made.
4. On success, the parent updates the source-of-truth `note` prop and the
   ref re-syncs via effect.
5. On error, the textarea content is preserved (never silently discarded)
   and an inline error with a Retry control is shown.
6. An empty string is a valid save value — the backend normalizes it to
   `null`.

When you add another freeform-text field on the Today screen, follow the
same shape: don't add a debounced per-keystroke save; rely on blur. The
backend writes are idempotent, so this stays correct under quick focus
changes.

### Streak rendering

Both check-in cards render a zero-padded streak number sourced from the
per-row endpoint response (`writing_streak` on `/daily_logs/:date`,
`publishing_streak` on `/week_logs/:week_start_date`). The Today screen
threads the value through to the card and treats it as server-authoritative:
the optimistic toggle flips `wrote`/`published` immediately, but the streak
slot keeps the prior value until the PUT resolves rather than guessing the
new number.

The `WeeklyPublishCard` picks its label based on the user's
`publishing_cadence` setting (read via `useCurrentUser()`):
`weekly` → "Week streak", `biweekly` → "Cycle streak". The streak number
itself means "weeks" for weekly users and "2-week buckets" for biweekly
users; the calculation lives on the backend (`StreakCalculator`).

## Tests

```sh
npm test          # one-shot
npm run test:watch
```

## Type-check / build

```sh
npx tsc -b
npm run build
```
