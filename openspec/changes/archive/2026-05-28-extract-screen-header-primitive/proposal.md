## Why

The "screen header" pattern — a `<header>` with a mono uppercase eyebrow above a 56px Instrument Serif headline ending in an italic green period — is duplicated near-verbatim across four screens (`TodayScreen`, `SettingsScreen`, `HistoryScreen`, `SignInScreen`). Each copy carries the same `padding: '64px 24px 0'`, the same eyebrow font/size/letter-spacing/color, the same headline font/size/line-height/letter-spacing/weight, and the same italic green period span. Every new screen has to remember to copy the same 25-line block or risk drifting visually.

This change introduces a single `<ScreenHeader>` primitive that owns the pattern, then collapses the four duplicate inline blocks down to one line each. It does not touch CSS architecture — TS object styles are kept; CSS extraction to `.module.css` / Tailwind / CSS-in-JS is deferred to a follow-up change as agreed.

## What Changes

- Add `frontend/src/components/ScreenHeader.tsx` exposing a `ScreenHeader` component with the API: `{ eyebrow: string; eyebrowAriaLabel?: string; title: string }`. The primitive renders the standard `<header>` chrome, the mono uppercase eyebrow, the serif headline, and the italic green period span — all using the existing `SB` / `SBfont` tokens
- Replace the inline header block in `frontend/src/screens/TodayScreen.tsx` with `<ScreenHeader eyebrow={dateLabel} eyebrowAriaLabel="Today's date" title="Today" />`, plus keep the existing supplementary `<p>` ("Two questions. Both within your control.") rendered after it as-is
- Replace the inline header block in `frontend/src/screens/SettingsScreen.tsx` with `<ScreenHeader eyebrow="The dial." title="Settings" />`
- Replace the inline header block in `frontend/src/screens/HistoryScreen.tsx` with `<ScreenHeader eyebrow="The record." title="History" />`
- Replace the inline header blocks in `frontend/src/screens/SignInScreen.tsx` with `<ScreenHeader eyebrow="SCOREBOARD" title="Sign in" />` (idle state) and `<ScreenHeader eyebrow="CHECK YOUR INBOX" title="Check your email" />` (sent state). Remove the now-unused `headerStyle`, `eyebrowStyle`, `headlineStyle`, `periodStyle` consts
- Add a small unit test for `ScreenHeader` covering both the with- and without-`eyebrowAriaLabel` paths (renders accessible heading, renders eyebrow text, applies aria-label when provided)
- All existing screen tests continue to pass without modification — the primitive preserves the same DOM structure, the same heading text/role, and the same `aria-label` on the eyebrow when supplied

## Capabilities

### New Capabilities

- `ui-primitives`: a small library of shared React primitives that own design-system patterns used across multiple screens, starting with `ScreenHeader`. Future primitives (e.g., `Eyebrow`, `Headline`, `PrimaryButton`) can be added here when a second use site emerges.

### Modified Capabilities

None — the four screens' behavior is unchanged; only the implementation of their header is delegated to the primitive.

## Impact

- Files added: `frontend/src/components/ScreenHeader.tsx`, `frontend/src/components/__tests__/ScreenHeader.test.tsx`
- Files modified: `frontend/src/screens/TodayScreen.tsx`, `frontend/src/screens/SettingsScreen.tsx`, `frontend/src/screens/HistoryScreen.tsx`, `frontend/src/screens/SignInScreen.tsx`
- No new dependencies, no build tooling changes, no CSS file architecture change
- Net code delta: removes ~80 lines of duplicated inline styles, adds ~50 lines (primitive + test). Each affected screen shrinks by ~22 lines
- Test surface: existing screen tests query by `role="heading"` / accessible name / `aria-label` / text content — semantics preserved, no test modifications expected
