## Context

The `/sign-in` route lives at `frontend/src/screens/SignInScreen.tsx`. It has two visible states (form + "Check your email" confirmation) and three error variants (URL-driven `expired`/`consumed`/`invalid`, plus a 422 validation error and a generic submit failure). It currently uses no styling at all — bare `<main>`, `<h1>`, `<p>`, `<form>`, `<label>`, `<input>`, `<button>`.

The rest of the app uses the warm-tone tokens in `frontend/src/lib/tokens.ts` (`SB` palette + `SBfont` font stacks). The header pattern across `TodayScreen`, `SettingsScreen`, `HistoryScreen` is consistent: `<header style={{ padding: '64px 24px 0' }}>` containing a mono uppercase eyebrow + an Instrument Serif headline (size 56, line-height 1, letter-spacing -0.5, weight 400) ending in `<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>`.

Two input patterns already exist:

1. `NoteCard` (`components/NoteCard.tsx`) — hairline-ring container with a mono uppercase eyebrow label inside, a transparent textarea on top. Used for free-text entry.
2. `PillTimeInput` / `PillSelect` (in `SettingsScreen.tsx`) — pill on `SB.surfaceAlt`, mono value, very compact. Used for config tweaks.

No primary CTA button currently exists in the codebase — the closest things are the `Toggle` component and the underlined `Retry` text in `NoteCard`. This change introduces the first one.

## Goals / Non-Goals

**Goals:**
- Visual + semantic continuity with the app's logged-in screens — same header pattern, same fonts, same accent
- Reuse the existing NoteCard input pattern for the email field (don't invent a second input pattern)
- Introduce a single new pattern (primary pill button) used in exactly one place for now
- Preserve all accessibility semantics already covered by tests: `<h1>`, `<label htmlFor>`, `<input type="email">`, `<button>`, `role="alert"`
- Error states render in the existing `SB.amber` palette already used for `NoteCard` errors

**Non-Goals:**
- Extracting a shared `PrimaryButton` component now (premature; YAGNI until a second caller exists)
- Restyling the magic-link landing redirect handler (that's a backend redirect, no frontend screen)
- Restyling other unauthenticated surfaces (there are none — `/sign-in` is the only one)
- Changing form behavior, validation, or copy beyond what the headline shift requires
- Changing the URL error code → message mapping (`ERROR_MESSAGES` table stays as is)

## Decisions

### Email input mirrors NoteCard, not PillTimeInput

NoteCard's pattern — hairline-ring container with a mono uppercase eyebrow label inside, transparent input on top, no native border/outline — is the right ergonomic fit for a full-width text field. The Pill pattern is sized for short values (a time, a select) and would feel cramped for an email.

The one deviation from NoteCard: **font for the input value is Geist (SBfont.ui), not Instrument Serif italic (SBfont.display).** NoteCard uses display-italic because a journal note is an expressive moment; an email address is a utilitarian value, and italic reads weird for `you@example.com`. Decision confirmed in exploration.

### Primary pill button is inlined, not extracted into a component

We need exactly one primary CTA today. Extracting `PrimaryButton.tsx` up front means designing an API for a single caller — premature. When a second use site appears (e.g., a future "Save profile" button), that's the right moment to extract. For now: an inline-styled `<button type="submit">` inside the sign-in form.

Geometry chosen to echo the existing pill family:
- `borderRadius: 999`
- `height: 40` (taller than the 32px config-pill so it reads as primary action, not a value chip)
- `background: SB.accent` (`#2EA168`)
- `color: SB.surface` (`#FFFDF8` — warm white, not pure white)
- `fontFamily: SBfont.ui`, `fontSize: 14`, `fontWeight: 500`, `letterSpacing: 0.2`
- `padding: '0 24px'`
- `cursor: pointer`; disabled state drops opacity to 0.5 and sets `cursor: not-allowed`

### Headline copy: "Sign in." and "Sent."

Mirrors the `Today.` / `Settings.` pattern — one word, italic green period. Keeps the test's heading-by-name query passing (`name: /sign in/i` and `name: /check your email/i`). For the "sent" state the eyebrow changes to `CHECK YOUR INBOX` and the headline to `Sent.` — preserves the test's "check your email" assertion via the eyebrow text.

**Wait — test assertion check:** the test queries `getByRole('heading', { name: /check your email/i })`. If we change the heading to `Sent.`, the test breaks. Resolution: keep the heading text as `Check your email` (still works visually under the eyebrow + serif treatment), or update the test. We choose **keep the heading copy intact** in the sent state — the visual shift is the eyebrow + typography, not a copy rewrite. So:

- Idle state: eyebrow `SCOREBOARD`, headline `Sign in.`
- Sent state: eyebrow `CHECK YOUR INBOX`, headline `Check your email.` (italic green period added)
- Both pass existing role/name tests unchanged

### Error placement: inline before the form, in the existing amber alert style

URL-driven errors and submit errors render as `<p role="alert" style={{ color: SB.amber, font: SBfont.ui, fontSize: 13 }}>` placed above the form. This mirrors NoteCard's error treatment (also `SB.amber`). No banner, no toast. The `role="alert"` semantics are preserved so the tests keep passing.

### "Use a different email" is a text action, not a button

In the sent state, the action to start over becomes an underlined text link in `SB.inkMuted`, mirroring NoteCard's `Retry` affordance. Keeps the primary action role reserved for the green pill, which doesn't exist in this state.

The element stays a `<button type="button">` for keyboard/a11y reasons; only its visual treatment changes.

## Risks / Trade-offs

- **[Introducing a new pattern (primary pill button) without extraction]** → Accepted; extraction is cheap to do later when a second caller exists. Documenting the geometry in this design doc so the future extraction has a reference.
- **[Headline copy might shift expectations for the rest of the app]** → No — `Today.` / `Settings.` already established the pattern; `Sign in.` extends it consistently.
- **[Web fonts (Instrument Serif, Geist) need to be loaded]** → Already loaded by the app; no new loader work needed. If they're not loaded yet (cold cache, first visit), Geist's system fallbacks render acceptably.
- **[Pill button disabled state with `opacity: 0.5` is low-contrast]** → Acceptable for a disabled control (a11y guidance allows lower contrast on inactive elements); not a primary readability concern.

## Migration Plan

Single-file edit. No data migration, no rollback complications. If a regression appears, revert `SignInScreen.tsx`.
