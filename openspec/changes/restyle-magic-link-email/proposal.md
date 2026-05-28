## Why

The magic-link sign-in email is currently unstyled HTML — default browser fonts, default blue link, no layout. Users who interact with the app's warm, design-rich screens land on what looks like a 1998 receipt at the very first touchpoint, creating brand whiplash on the path back into the product.

## What Changes

- Restyle `backend/app/views/user_mailer/magic_link.html.erb` to follow the SB design language: hairline cream card (`#FFFDF8`) on warm beige background (`#F2EEE5`), mono uppercase eyebrow label, Instrument Serif headline with italic green period (Georgia fallback for clients without web fonts), accent-green pill CTA (`#2EA168`) rendered as `<a>`, fallback URL in mono, muted footnote — all inline-styled for cross-client compatibility
- Update `backend/app/views/layouts/mailer.html.erb` `<body>` to reset margin and apply the warm background, so the card sits on brand chrome even before the template renders
- Plain-text companion `magic_link.text.erb` left unchanged (already on-brand for a text email)
- Mailer preview at `http://localhost:3000/rails/mailers/user_mailer` continues to work for visual verification

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-access`: add a requirement that the magic-link email visual treatment SHALL conform to the SB (warm-tone) design language. Functional behavior of issuing/verifying the link is unchanged; this codifies a visual-fidelity expectation so future regressions are catchable.

## Impact

- Files: `backend/app/views/user_mailer/magic_link.html.erb`, `backend/app/views/layouts/mailer.html.erb`
- No Rails controller, mailer, or model logic changes
- No new gems or dependencies
- No API contract changes
- Existing tests in `backend/test/integration/magic_links_create_test.rb` assert delivery + recipient, not body markup — they continue to pass without modification
