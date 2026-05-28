## Context

Four screens (`TodayScreen`, `SettingsScreen`, `HistoryScreen`, `SignInScreen`) currently each contain a ~25-line inline copy of the same `<header>` block:

```tsx
<header style={{ padding: '64px 24px 0' }}>
  <div style={{ fontFamily: SBfont.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: SB.inkMuted, fontWeight: 500 }}>
    {eyebrow}
  </div>
  <h1 style={{ fontFamily: SBfont.display, fontSize: 56, lineHeight: 1, letterSpacing: -0.5, color: SB.ink, marginTop: 6, marginBottom: 0, fontWeight: 400 }}>
    {title}<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
  </h1>
</header>
```

The variations across copies are limited to: the eyebrow text, the title text, and an optional `aria-label="Today's date"` on the eyebrow in `TodayScreen` (because that screen's eyebrow value is a formatted date string that benefits from explicit screen-reader context).

The existing component conventions in `frontend/src/components/` favor self-contained components with inline TS style objects (see `NoteCard.tsx`, `SettingsRow.tsx`, `TabBar.tsx`) — no CSS files, no styled-components, no class-name conventions. This change follows that convention.

## Goals / Non-Goals

**Goals:**
- One source of truth for the screen header pattern
- Eliminate the 4× inline duplication; each consumer becomes a single `<ScreenHeader>` line
- Preserve every accessibility characteristic currently in use: `<h1>` role + name, eyebrow `aria-label` when supplied
- Preserve every existing screen test without modification
- Keep the surface area small enough that the primitive is obvious and uncontroversial — no theming knobs, no layout slots, no children prop

**Non-Goals:**
- Extract micro-primitives (`<Eyebrow>`, `<Headline>`, `<AccentPeriod>`) — premature; only emerges if a second use site appears
- Move CSS into `.module.css` / `index.css` / utility classes — deferred to a separate change
- Build a generalized `<ScreenLayout>` primitive that owns page chrome + header + sections — every screen has different layout below the header (TabBar, scroll regions, settings groups, calendar). Header is the only piece that's actually duplicated; bundling more would over-fit one screen's needs
- Introduce a `<PrimaryButton>` primitive — only one use site exists (the sign-in submit). Wait for a second to justify extraction
- Change any header text, font sizes, or styling values during the refactor — visual output should be byte-identical to today

## Decisions

### Single primitive, not a primitive family

We introduce **one** component: `ScreenHeader`. Not `Eyebrow` + `Headline` + `ScreenHeader` as a composition. Reasoning: the duplication today is the *whole header block*, not the individual pieces. Atomizing now means writing API surface for sub-primitives that have no other consumers. If `NoteCard`'s mono-uppercase label or `WritingCheckInCard`'s big serif number later want to share the eyebrow/headline styles, that's the moment to extract — not now.

**Alternative considered:** Build `<Eyebrow>` + `<Headline>` + compose them inside `<ScreenHeader>`. Rejected — adds two files and two import paths for the same total deduplication.

### API: three plain-string props

```ts
interface ScreenHeaderProps {
  eyebrow: string
  title: string
  eyebrowAriaLabel?: string
}
```

- `eyebrow` is the small uppercase line. Required.
- `title` is the headline word/phrase. Required. The italic green period is appended automatically by the primitive — no consumer opts in or out, since today all four screens use the period.
- `eyebrowAriaLabel` is optional. When provided, it's applied to the eyebrow `<div>`. This covers the `TodayScreen` case where the eyebrow value is "May 28, 2026" and benefits from screen-reader context.

**Alternative considered:** Accept `eyebrow: ReactNode` to support icons or rich content. Rejected — no use site needs that today, and `string` enforces the design constraint (eyebrows are short uppercase text labels).

**Alternative considered:** Append the period only when explicitly opted into via a prop. Rejected — all four current sites use it; making it opt-out would be confusing, and there's no current case where omitting it makes sense.

### Period is part of the title rendering, not a separate concern

The primitive renders `{title}<span style={periodStyle}>.</span>` internally. Consumers pass `title="Settings"` (no trailing period). This is a small breaking change from "exact byte match" — today the screens write `Settings<span>.</span>` directly. The visual output is byte-identical.

**Why not make the period a child node?** Because the period is a *design signature* — it's what makes the headline feel branded. If the period were a child, a consumer could omit it by mistake, defeating the purpose of the primitive.

### Style consts inlined into the component module

Styles live as `const xStyle: React.CSSProperties = {...}` at the bottom of `ScreenHeader.tsx`, hoisted out of the JSX. This matches the pattern recently used in `SignInScreen.tsx` (post-restyle) and avoids per-render object allocation. No new shared style module — the styles belong to this primitive.

If a future second primitive needs to share, say, the eyebrow styles, that's the moment to extract into `lib/styles.ts`. Not now.

### TodayScreen keeps its supplementary `<p>`

The `TodayScreen` header is currently:
```tsx
<header>
  <div eyebrow>{dateLabel}</div>
  <h1>Today.</h1>
  <p>Two questions. Both within your control.</p>
</header>
```

The primitive renders eyebrow + headline only. The `<p>` stays as a sibling of `<ScreenHeader>` in `TodayScreen`, rendered after it. This keeps the primitive minimal — the explainer paragraph is `TodayScreen`-specific and doesn't belong in a shared component.

### Test placement

`frontend/src/components/__tests__/ScreenHeader.test.tsx`. Coverage:
- Renders the title text + the period
- Renders the eyebrow text
- Applies `eyebrowAriaLabel` to the eyebrow when provided
- Does not apply an `aria-label` when none is provided
- The headline is reachable by `role="heading"` with the accessible name matching the title

## Risks / Trade-offs

- **[Existing screen tests break]** → Mitigated by keeping the rendered DOM and accessible names identical. Test surface is verified after each screen swap (run `npm test` per screen). If a test queries something fragile, decide per-case: prefer fixing the primitive over loosening the test.
- **[Primitive grows unwanted features later]** → Mitigated by the design rule "no new prop without two real use sites." Cited in design.md.
- **[`<ScreenHeader>` becomes a bottleneck for future header variants]** → If a screen genuinely needs a non-standard header (no period, different eyebrow size, etc.), the primitive should NOT be parameterized to handle it — the consumer should drop back to inline JSX, and the divergent header becomes a signal to discuss design intent. Cited as a non-goal above.
- **[Per-render style allocation in the primitive itself]** → Avoided by hoisting style consts to module-level inside `ScreenHeader.tsx`. Matches the post-restyle convention from `SignInScreen.tsx`.

## Migration Plan

Single-PR refactor. Order:
1. Add `ScreenHeader.tsx` + its test (no consumer changes yet — verifies the primitive in isolation).
2. Swap `SignInScreen.tsx` first (smallest screen, fewest tests, recent change so the diff is easy to read). Run its test suite — green.
3. Swap `SettingsScreen.tsx`, `HistoryScreen.tsx`, `TodayScreen.tsx` in any order. Run their test suites — all green.
4. Verify visually (`/`, `/history`, `/settings`, `/sign-in`).

Rollback: revert the PR. The primitive is additive in isolation; the consumer swaps are mechanical.
