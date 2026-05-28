## ADDED Requirements

### Requirement: Sign-in screen SHALL render in the SB design language

The `/sign-in` route SHALL present its UI using the warm-tone (SB) design language used by the rest of the app: warm beige page background, the standard mono-uppercase-eyebrow + Instrument Serif headline (with italic green period) header pattern, a hairline-ring container for the email input mirroring the existing `NoteCard` pattern, and a pill-shaped accent-green primary button for the submit action. Error states SHALL use the existing `SB.amber` alert treatment and remain announced via `role="alert"`. All existing accessibility semantics (`<h1>`, `<label htmlFor>`, `<input type="email">`, `<button>`, `role="alert"`) SHALL be preserved.

#### Scenario: Idle state renders with SB chrome
- **WHEN** an unauthenticated user opens `/sign-in`
- **THEN** the screen displays warm beige page background (`SB.bg`), a mono uppercase eyebrow `SCOREBOARD`, an Instrument Serif headline `Sign in` ending in an italic green period (`SB.accent`), a hairline-ring email input with a `EMAIL` mono uppercase label, and a green pill-shaped submit button labelled `Send sign-in link`

#### Scenario: Sent state renders with SB chrome
- **WHEN** the user submits a valid email and the request succeeds
- **THEN** the screen displays a mono uppercase eyebrow `CHECK YOUR INBOX`, an Instrument Serif headline `Check your email` ending in an italic green period, body copy that includes the submitted email address, and a muted underlined `Use a different email` text action (still a `<button>` for accessibility)

#### Scenario: Error states use the SB amber alert treatment
- **WHEN** the URL contains `?error=expired|consumed|invalid` or the submit fails (422 or 5xx)
- **THEN** the corresponding message renders in `SB.amber` with `role="alert"` placed inline above the form, and the form remains usable for retry

#### Scenario: Existing accessibility semantics are preserved
- **WHEN** a screen reader or test harness queries the page
- **THEN** the heading is reachable by role `heading` and accessible name `Sign in` (idle) or `Check your email` (sent); the email field is reachable by `<label htmlFor="email">`; the submit button is reachable by role `button` with accessible name `Send sign-in link`; alerts are reachable by `role="alert"`

### Requirement: Primary pill button visual pattern

The codebase SHALL introduce a single primary-action pill-button visual pattern, used initially only on the `/sign-in` submit action: filled `SB.accent` background, `SB.surface` label color, Geist UI font at weight 500, fully rounded corners (`border-radius: 999`), height ~40px, horizontal padding ~24px. The button SHALL show a disabled visual state when its semantic `disabled` attribute is set.

#### Scenario: Primary pill button matches the documented geometry
- **WHEN** the sign-in submit button renders
- **THEN** its computed styles include a `border-radius` of 999px, a background of `SB.accent` (`#2EA168`), a text color of `SB.surface` (`#FFFDF8`), Geist as the resolved `font-family`, and a height of approximately 40px

#### Scenario: Disabled state is visually distinct
- **WHEN** the submit button is disabled (mid-submission or with an empty email)
- **THEN** its rendered opacity is reduced and the cursor changes to `not-allowed`, while the semantic `disabled` attribute is set so the button is non-interactive for keyboard and screen readers
