## MODIFIED Requirements

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
- **WHEN** a consumer renders `<ScreenHeader eyebrow="SCRIBE" title="Sign in" />` without `eyebrowAriaLabel`
- **THEN** the eyebrow `<div>` does not have an `aria-label` attribute

#### Scenario: Period is rendered automatically, not provided by the caller
- **WHEN** a consumer renders `<ScreenHeader title="History" ... />` (title does NOT include a trailing period)
- **THEN** the headline still renders `History` followed by an italic green `.` — the period is the primitive's responsibility, not the caller's
