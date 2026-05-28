## 1. Build the primitive

- [x] 1.1 Create `frontend/src/components/ScreenHeader.tsx` exporting `ScreenHeader({ eyebrow, title, eyebrowAriaLabel })`. Renders `<header>` with the standard padding, a `<div>` eyebrow with the mono uppercase styling (apply `aria-label` only when `eyebrowAriaLabel` is provided), and an `<h1>` headline with the Instrument Serif styling containing `{title}<span style={periodStyle}>.</span>`. Style consts (`headerStyle`, `eyebrowStyle`, `headlineStyle`, `periodStyle`) hoisted to module-level inside the file
- [x] 1.2 Create `frontend/src/components/__tests__/ScreenHeader.test.tsx` with assertions:
  - renders the title text and the trailing period
  - renders the eyebrow text
  - applies `aria-label` to the eyebrow when `eyebrowAriaLabel` is provided
  - does NOT set an `aria-label` attribute on the eyebrow when `eyebrowAriaLabel` is omitted
  - exposes the headline via `role="heading"` with the accessible name matching `title` + `.`
- [x] 1.3 Run `cd frontend && npm test -- ScreenHeader --run` and confirm the new test file passes

## 2. Migrate consumers

- [x] 2.1 `frontend/src/screens/SignInScreen.tsx`: import `ScreenHeader`. Replace both header blocks (idle: `<header>...SCOREBOARD.../Sign in...</header>`, sent: `<header>...CHECK YOUR INBOX.../Check your email...</header>`) with `<ScreenHeader eyebrow="SCOREBOARD" title="Sign in" />` and `<ScreenHeader eyebrow="CHECK YOUR INBOX" title="Check your email" />` respectively. Remove the now-unused `headerStyle`, `eyebrowStyle`, `headlineStyle`, `periodStyle` consts
- [x] 2.2 Run `cd frontend && npm test -- SignInScreen --run` — all 6 tests must pass without modification
- [x] 2.3 `frontend/src/screens/SettingsScreen.tsx`: import `ScreenHeader`. Replace the inline header block with `<ScreenHeader eyebrow="The dial." title="Settings" />`
- [x] 2.4 Run `cd frontend && npm test -- SettingsScreen --run` — all existing tests must pass without modification
- [x] 2.5 `frontend/src/screens/HistoryScreen.tsx`: import `ScreenHeader`. Replace the inline header block with `<ScreenHeader eyebrow="The record." title="History" />`
- [x] 2.6 Run `cd frontend && npm test -- HistoryScreen --run` — all existing tests must pass without modification
- [x] 2.7 `frontend/src/screens/TodayScreen.tsx`: import `ScreenHeader`. Replace the header block — keeping the `<p>Two questions. Both within your control.</p>` paragraph as a sibling rendered after `<ScreenHeader>` — with `<ScreenHeader eyebrow={dateLabel} eyebrowAriaLabel="Today's date" title="Today" />`
- [x] 2.8 Run `cd frontend && npm test -- TodayScreen --run` — all existing tests must pass without modification

## 3. Final verification

- [x] 3.1 Run `cd frontend && npm test --run` (full suite) and confirm all tests pass
- [x] 3.2 Run `cd frontend && npx tsc --noEmit` and confirm typecheck is clean
- [x] 3.3 Run the dev server and visually walk through each screen (`/`, `/history`, `/settings`, `/sign-in`) — confirm each header looks byte-identical to before (same eyebrow text, same `Today.` / `Settings.` / `History.` / `Sign in.` headline with green italic period, same spacing)
- [x] 3.4 Confirm no inline copy of the `mono eyebrow + serif headline + italic period` block remains in any screen file: `grep -n "fontFamily: SBfont.display" frontend/src/screens/*.tsx` should return zero matches (or only references inside `ScreenHeader.tsx` consumers if any non-header serif text exists — `HistoryScreen` has some)
