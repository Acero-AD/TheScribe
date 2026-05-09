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
