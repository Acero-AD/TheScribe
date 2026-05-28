## Context

The magic-link email currently uses default browser styling. The internal app (TodayScreen, SettingsScreen, HistoryScreen) uses a tightly-defined warm-tone design language exposed via `frontend/src/lib/tokens.ts` (`SB` / `SBfont`):

- Background: `#F2EEE5` (warm beige), Surface: `#FFFDF8` (cream), Surface alt: `#E9E2D3`
- Ink: `#1A1714`, Ink muted: `#6B635A`, Ink faint: `#A8A097`
- Accent: `#2EA168` (green), Accent deep: `#1F7A4D`
- Hairline: `rgba(26,23,20,0.08)`
- Display font: Instrument Serif (signature pattern: big headline with italic green period — e.g. `Today.`, `Settings.`)
- UI font: Geist; Mono font: JetBrains Mono (uppercase eyebrow, 11px, 1.6px letter-spacing)

HTML emails are an inhospitable environment for this stack: no web fonts in Gmail/Outlook, no CSS custom properties, no `<style>` blocks survive Gmail's sanitizer, and dark-mode handling differs wildly across clients.

## Goals / Non-Goals

**Goals:**
- The rendered email visually echoes the app's warm/cream/green/serif language even when web fonts don't load
- Preserve the signature design touch (serif headline with italic green period) using safe fallbacks
- All styles inline; no `<style>` blocks, no external CSS
- Works in Apple Mail, iOS Mail, Gmail (web + mobile), Outlook desktop without manual hacks
- Mailer preview at `/rails/mailers/user_mailer/magic_link` keeps rendering

**Non-Goals:**
- Reusable email layout chrome (no further emails planned — per scope decision)
- Pixel-perfect parity across all email clients
- Dedicated dark-mode CSS overrides (`prefers-color-scheme` is unreliable in email; we pick warm tones that degrade acceptably under Gmail's auto-inversion instead)
- Outlook VML for bulletproof buttons (overkill for a single email)
- Changes to the plain-text companion (`magic_link.text.erb`) — already on-brand
- Backend mailer/controller logic or rate-limiting behavior

## Decisions

### Inline styles only, no `<style>` block

Gmail strips `<style>` blocks in many delivery paths. The existing `mailer.html.erb` layout already comments `/* Email styles need to be inline */`. We honor that: every property is set via `style="..."` directly on the element. The empty `<style>` block in the layout is removed.

**Alternative considered:** Premailer gem to inline CSS at render time. Rejected — adds a dependency and a build step for one email.

### Font fallback stack chosen for graceful degradation

- **Headline (`Instrument Serif`)** → `'Instrument Serif', Georgia, 'Times New Roman', serif`. Georgia italic reads close to Instrument Serif italic, so the signature italic-green period survives even when the web font fails to load.
- **Body (`Geist`)** → `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`. System sans falls back cleanly.
- **Mono (`JetBrains Mono`)** → `'JetBrains Mono', 'SF Mono', ui-monospace, Consolas, monospace`.

We do **not** add `<link rel="stylesheet" href="…fonts.googleapis…">` — it would slow render in clients that do support it and is silently dropped in those that don't. The trade-off is accepted: Apple Mail / iOS Mail get the web font, everyone else gets Georgia.

### Layout: simple centered block, not full table-based

A single centered wrapper (`max-width: 480px`, `margin: 0 auto`) with a hairline-ring card inside. We use `<table role="presentation">` only for the centering wrapper (most reliable cross-client centering technique) and inline blocks within the card. No nested table maze.

**Alternative considered:** Bulletproof table-of-tables Outlook-safe layout. Rejected — readability cost is high for a single CTA email; the chosen layout renders correctly in Outlook with simple inline styles.

### CTA as styled `<a>`, not a `<button>`

Native `<button>` doesn't render in email. The CTA is `<a href="<%= @url %>">` styled with `display: inline-block`, padding, `background: #2EA168`, white-cream text color, `border-radius: 999px`, no underline. Mirrors the app's pill geometry.

**Alternative considered:** VML `<v:roundrect>` for Outlook bulletproof rounded corners. Rejected — corners going slightly square on Outlook is acceptable; the green fill, text, and click target all survive without VML.

### Dark mode: pick warm tones, let Gmail invert if it wants

Warm beige (`#F2EEE5`) and cream (`#FFFDF8`) inverted by Gmail iOS produce dark warm tones that still read as on-brand. We do not author a `@media (prefers-color-scheme: dark)` block; tests across Gmail's various dark-mode policies are out of scope.

### Layout chrome stays in the template, not the layout

`backend/app/views/layouts/mailer.html.erb` `<body>` only gets `margin: 0` and `background: #F2EEE5`. The card, headline, CTA all live in `magic_link.html.erb`. Per the no-further-emails-planned scope, no reusable wrapper is justified.

## Risks / Trade-offs

- **[Web font absent in Gmail/Outlook]** → Georgia/system sans fallbacks chosen so the layout still reads as intentional, not broken. Visual checked against both rendering paths.
- **[Outlook square-corner pill]** → Accepted; the green fill and click target are intact. VML hack avoided to keep the template readable.
- **[Gmail dark-mode auto-inversion]** → Warm tones chosen so inversion still looks intentional. No explicit dark-mode CSS authored.
- **[Future regression risk]** → No automated visual test exists. The mailer preview at `/rails/mailers/user_mailer/magic_link` is the manual verification path; called out in tasks.

## Migration Plan

Single-step deploy. No data migration, no rollback complications — the change is two view files. If the rendered email regresses in a client, revert the two files.
