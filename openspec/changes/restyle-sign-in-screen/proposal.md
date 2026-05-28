## Why

The `/sign-in` route is the only screen an unauthenticated user sees and the entry point back into the app after clicking a magic link — yet it renders as bare HTML elements (`<h1>`, `<form>`, default `<input>`, default `<button>`) with no design tokens. Every authenticated screen (TodayScreen, SettingsScreen, HistoryScreen) uses the warm-tone SB design language. Today the user experiences a hard visual cut from "unbranded form" to "designed app" at the moment of sign-in, which feels like landing on a different product.

## What Changes

- Restyle `frontend/src/screens/SignInScreen.tsx` to follow the SB design language used elsewhere in the app:
  - `<main>` adopts the warm beige background (`SB.bg`), Geist UI font, the standard `64px 24px 0` header padding
  - Mono uppercase eyebrow above an Instrument Serif headline ending in an italic green period (`Sign in.` / `Sent.`) — mirrors the `Today.` / `Settings.` pattern
  - Email input wrapped in a hairline-ring container (mirrors the `NoteCard` pattern at `components/NoteCard.tsx`): mono uppercase `EMAIL` label, transparent input with Geist font (not display-italic — italic reads weird for an email address), no native border or outline
  - Introduce the first **primary pill button** pattern in the codebase: filled `SB.accent` background, `SB.surface` text, Geist, `border-radius: 999`, ~40px height. Used for `Send sign-in link`
  - Error messages (URL-driven and submit-driven) presented in the app's existing `role="alert"` style, using `SB.amber` for non-blocking errors and inline placement (no banner above the form)
  - "Use a different email" action in the sent state becomes a muted underlined text action, not a bordered button — echoing the `Retry` affordance in `NoteCard`
- Preserve all existing test-visible semantics: heading text ("Sign in to Scoreboard" → may become "Sign in." but query stays `name: /sign in/i`-compatible, "Check your email"), `<label htmlFor="email">`, `<input type="email">`, `<button>` for submit, `role="alert"` for errors. Existing tests in `frontend/src/screens/__tests__/SignInScreen.test.tsx` continue to pass without modification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-access`: add a requirement that the `/sign-in` screen visual treatment SHALL conform to the SB design language. The existing functional requirement ("frontend SHALL provide an email-entry screen…") stays intact; this codifies the visual-fidelity expectation alongside it.

## Impact

- Files changed: `frontend/src/screens/SignInScreen.tsx`
- No new components extracted (the pill-button pattern is introduced inline in the sign-in screen; if a second use site appears later, that becomes the moment to extract it — not now)
- No new routes, no API contract changes, no auth-flow changes
- No new dependencies
- Existing test file `frontend/src/screens/__tests__/SignInScreen.test.tsx` queries by role/label/text — semantics preserved, tests untouched
