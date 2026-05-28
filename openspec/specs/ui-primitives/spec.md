# ui-primitives Specification

## Purpose
TBD - created by archiving change extract-screen-header-primitive. Update Purpose after archive.
## Requirements
### Requirement: Frontend SHALL provide a `ScreenHeader` primitive for screen-level headers

The frontend SHALL provide a `ScreenHeader` React component (at `frontend/src/components/ScreenHeader.tsx`) that renders the shared screen-header pattern: a `<header>` element containing a mono uppercase eyebrow above an Instrument Serif `<h1>` headline ending in an italic green period span. The component SHALL accept `eyebrow: string`, `title: string`, and an optional `eyebrowAriaLabel: string`. All screen-level routes that today copy this pattern inline SHALL be migrated to use the primitive.

#### Scenario: Primitive renders the canonical header structure
- **WHEN** a consumer renders `<ScreenHeader eyebrow="The dial." title="Settings" />`
- **THEN** the rendered DOM contains a `<header>` with the standard SB chrome (padding `64px 24px 0`), an eyebrow `<div>` with the mono uppercase styling and text `The dial.`, and an `<h1>` with the Instrument Serif styling containing the text `Settings` followed by a `<span>` with `font-style: italic` and `color: SB.accent` containing `.`

#### Scenario: Heading is reachable by role and accessible name
- **WHEN** a screen reader or test harness queries the rendered `ScreenHeader`
- **THEN** the headline is reachable by `role="heading"` (level 1) with the accessible name matching the `title` prop (e.g., `Settings.`)

#### Scenario: Eyebrow aria-label is applied when provided
- **WHEN** a consumer renders `<ScreenHeader eyebrow={formattedDate} eyebrowAriaLabel="Today's date" title="Today" />`
- **THEN** the eyebrow `<div>` has `aria-label="Today's date"` so a screen reader announces the contextual label rather than reading the raw date string

#### Scenario: No aria-label is applied when none is supplied
- **WHEN** a consumer renders `<ScreenHeader eyebrow="SCOREBOARD" title="Sign in" />` without `eyebrowAriaLabel`
- **THEN** the eyebrow `<div>` does not have an `aria-label` attribute

#### Scenario: Period is rendered automatically, not provided by the caller
- **WHEN** a consumer renders `<ScreenHeader title="History" ... />` (title does NOT include a trailing period)
- **THEN** the headline still renders `History` followed by an italic green `.` — the period is the primitive's responsibility, not the caller's

### Requirement: All screen-level routes SHALL render their header through the `ScreenHeader` primitive

`TodayScreen`, `SettingsScreen`, `HistoryScreen`, and `SignInScreen` (both idle and sent states) SHALL render their top-of-screen `<header>` via `<ScreenHeader>` rather than copying the inline pattern. Any future screen-level route that needs the same header chrome SHALL also use the primitive; deviations from the canonical header SHALL drop back to inline JSX rather than parameterize the primitive.

#### Scenario: All four current screens delegate to the primitive
- **WHEN** the rendered tree of `TodayScreen`, `SettingsScreen`, `HistoryScreen`, or `SignInScreen` is inspected
- **THEN** the screen's top `<header>` is rendered by `<ScreenHeader>` and the screen file does not contain an inline copy of the mono-eyebrow + serif-headline + italic-period style block

#### Scenario: Existing accessibility and test queries are preserved
- **WHEN** existing screen tests query the rendered output (by `role="heading"` + name, by `aria-label`, by text content)
- **THEN** the queries continue to match the same elements they matched before this change — the primitive emits an equivalent DOM tree
