## ADDED Requirements

### Requirement: Magic-link email SHALL render in the SB design language

The HTML body of the magic-link email SHALL present its content using the warm-tone (SB) design language used by the rest of the app: a hairline card on a warm beige background, a mono uppercase eyebrow, an Instrument Serif (with Georgia fallback) headline ending in a green italic period, an accent-green pill-shaped link styled as the primary call-to-action, a fallback URL in monospace, and a muted footnote. All styles SHALL be inline on their elements so they survive email-client CSS sanitization.

#### Scenario: Magic-link email is delivered with branded chrome
- **WHEN** the backend sends a magic-link email and the recipient's client renders the HTML body
- **THEN** the body uses the warm beige page background (`#F2EEE5`), a cream card surface (`#FFFDF8`), an Instrument Serif headline with an italic green period (accent `#2EA168`), a mono uppercase eyebrow, and a pill-shaped accent-green `<a>` as the primary action — with every style applied inline on the element

#### Scenario: HTML body degrades gracefully without web fonts
- **WHEN** the recipient's client (e.g., Gmail web) does not load custom web fonts
- **THEN** the headline falls back to Georgia / Times via the inline `font-family` stack, body text falls back to a system sans-serif, and the layout still reads as the intentional SB design — no layout breakage and no default-browser "1998 receipt" appearance

#### Scenario: Plain-text companion is unchanged
- **WHEN** a client requests the `text/plain` part of the email (or renders text-only mode)
- **THEN** the text version (`magic_link.text.erb`) is delivered unchanged from its current copy — visual treatment applies only to the HTML body
