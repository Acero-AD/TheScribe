## MODIFIED Requirements

### Requirement: Sign-in screen SHALL render in the SB design language

The `/sign-in` route SHALL present its UI using the warm-tone (SB) design language used by the rest of the app: warm beige page background, the standard mono-uppercase-eyebrow + Instrument Serif headline (with italic green period) header pattern, a hairline-ring container for the email input mirroring the existing `NoteCard` pattern, and a pill-shaped accent-green primary button for the submit action. Error states SHALL use the existing `SB.amber` alert treatment and remain announced via `role="alert"`. All existing accessibility semantics (`<h1>`, `<label htmlFor>`, `<input type="email">`, `<button>`, `role="alert"`) SHALL be preserved.

#### Scenario: Idle state renders with SB chrome
- **WHEN** an unauthenticated user opens `/sign-in`
- **THEN** the screen displays warm beige page background (`SB.bg`), a mono uppercase eyebrow `SCRIBE`, an Instrument Serif headline `Sign in` ending in an italic green period (`SB.accent`), a hairline-ring email input with a `EMAIL` mono uppercase label, and a green pill-shaped submit button labelled `Send sign-in link`

#### Scenario: Sent state renders with SB chrome
- **WHEN** the user submits a valid email and the request succeeds
- **THEN** the screen displays a mono uppercase eyebrow `CHECK YOUR INBOX`, an Instrument Serif headline `Check your email` ending in an italic green period, body copy that includes the submitted email address, and a muted underlined `Use a different email` text action (still a `<button>` for accessibility)

#### Scenario: Error states use the SB amber alert treatment
- **WHEN** the URL contains `?error=expired|consumed|invalid` or the submit fails (422 or 5xx)
- **THEN** the corresponding message renders in `SB.amber` with `role="alert"` placed inline above the form, and the form remains usable for retry

#### Scenario: Existing accessibility semantics are preserved
- **WHEN** a screen reader or test harness queries the page
- **THEN** the heading is reachable by role `heading` and accessible name `Sign in` (idle) or `Check your email` (sent); the email field is reachable by `<label htmlFor="email">`; the submit button is reachable by role `button` with accessible name `Send sign-in link`; alerts are reachable by `role="alert"`
