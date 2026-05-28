## 1. Page shell + header pattern

- [x] 1.1 In `frontend/src/screens/SignInScreen.tsx`, import `SB` and `SBfont` from `../lib/tokens`
- [x] 1.2 Apply the page chrome to `<main>`: `minHeight: '100vh'`, `background: SB.bg`, `color: SB.ink`, `fontFamily: SBfont.ui`, `paddingBottom: 64`, `position: 'relative'`
- [x] 1.3 Wrap the header content in `<header style={{ padding: '64px 24px 0' }}>` mirroring `TodayScreen`/`SettingsScreen`
- [x] 1.4 Render the mono uppercase eyebrow above the headline. Idle state eyebrow: `SCOREBOARD`. Sent state eyebrow: `CHECK YOUR INBOX`. Styles: `fontFamily: SBfont.mono`, `fontSize: 11`, `letterSpacing: 1.6`, `textTransform: 'uppercase'`, `color: SB.inkMuted`, `fontWeight: 500`
- [x] 1.5 Render the Instrument Serif headline ending in `<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>`. Idle headline text: `Sign in`. Sent headline text: `Check your email`. Headline styles: `fontFamily: SBfont.display`, `fontSize: 56`, `lineHeight: 1`, `letterSpacing: -0.5`, `color: SB.ink`, `marginTop: 6`, `marginBottom: 0`, `fontWeight: 400`

## 2. Form body — idle state

- [x] 2.1 Below the header, render a `<section>` with `padding: '20px 24px 0'` containing the form
- [x] 2.2 Wrap the email input in a NoteCard-style hairline-ring container: `borderRadius: 22`, `boxShadow: 0 0 0 1px ${SB.hairline}`, `padding: '14px 16px'`, `display: 'flex'`, `flexDirection: 'column'`, `gap: 6`
- [x] 2.3 Inside the container, render the `<label htmlFor="email">` with text `Email`, styled as mono uppercase eyebrow: `fontFamily: SBfont.mono`, `fontSize: 10`, `letterSpacing: 1.4`, `textTransform: 'uppercase'`, `color: SB.inkMuted`, `fontWeight: 500`
- [x] 2.4 Style the `<input id="email" type="email">` as a transparent field: `width: '100%'`, `border: 0`, `outline: 0`, `background: 'transparent'`, `fontFamily: SBfont.ui` (NOT display-italic), `fontSize: 17`, `lineHeight: 1.35`, `color: SB.ink`, `padding: 0`. Add a placeholder `you@example.com`
- [x] 2.5 Below the input container (in the form, not inside the container), render the primary pill submit button with these inline styles: `appearance: 'none'`, `border: 0`, `background: SB.accent`, `color: SB.surface`, `borderRadius: 999`, `height: 40`, `padding: '0 24px'`, `fontFamily: SBfont.ui`, `fontSize: 14`, `fontWeight: 500`, `letterSpacing: 0.2`, `cursor: 'pointer'`, `marginTop: 16`. Label text stays `Send sign-in link` (or `Sending…` while submitting)
- [x] 2.6 When the button is disabled (submitting or empty email), add `opacity: 0.5` and `cursor: 'not-allowed'` to the inline style; keep the semantic `disabled` attribute

## 3. Form body — sent state

- [x] 3.1 Replace the form with a `<section>` (same padding) containing the body copy paragraph: `fontFamily: SBfont.ui`, `fontSize: 15`, `lineHeight: 1.5`, `color: SB.ink`, `marginTop: 16`. Copy stays close to the original: `If an account exists for <strong>{email}</strong>, we just sent a sign-in link. Click it from the same browser to finish signing in.`
- [x] 3.2 Render the "Use a different email" action as an underlined text `<button type="button">`: `appearance: 'none'`, `border: 0`, `background: 'transparent'`, `color: SB.inkMuted`, `fontFamily: SBfont.ui`, `fontSize: 13`, `cursor: 'pointer'`, `padding: 0`, `textDecoration: 'underline'`, `marginTop: 16`

## 4. Error states

- [x] 4.1 For both URL-driven errors (`urlError`) and submit errors (`submitError`), render `<p role="alert">` inline above the form (or above the sent body) with styles: `fontFamily: SBfont.ui`, `fontSize: 13`, `color: SB.amber`, `marginTop: 8`
- [x] 4.2 Keep the existing `ERROR_MESSAGES` map and error-handling branches unchanged

## 5. Verification

- [x] 5.1 Run `cd frontend && npm test -- SignInScreen` and confirm all existing tests pass without modification
- [x] 5.2 Run the dev server and visually check `/sign-in` in the browser:
  - [x] 5.2.1 Idle state: warm beige bg, mono eyebrow, serif headline with green italic period, hairline email input, green pill button
  - [x] 5.2.2 Submit a valid email: confirm transition to the sent state with new eyebrow + headline
  - [x] 5.2.3 Submit an invalid email (`bad`): confirm 422 inline error in amber
  - [x] 5.2.4 Visit `/sign-in?error=expired`: confirm URL-driven error in amber
  - [x] 5.2.5 Tab through the form: confirm focus order and that the label-input association still works (clicking the label focuses the input)
