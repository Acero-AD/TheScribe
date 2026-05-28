## 1. Layout chrome (mailer layout)

- [x] 1.1 Update `backend/app/views/layouts/mailer.html.erb`: remove the empty `<style>` block, add `style="margin: 0; background: #F2EEE5;"` to `<body>`
- [x] 1.2 Verify the mailer preview at `http://localhost:3000/rails/mailers/user_mailer/magic_link` still loads

## 2. Magic-link HTML template

- [x] 2.1 Replace the body of `backend/app/views/user_mailer/magic_link.html.erb` with a centered single-column layout: outer `<table role="presentation">` wrapper for cross-client centering, inner card `max-width: 480px`
- [x] 2.2 Add the cream card (`background: #FFFDF8`, padding `40px 32px`, `border-radius: 12px`, `box-shadow: 0 0 0 1px rgba(26,23,20,0.08)`)
- [x] 2.3 Add the mono uppercase eyebrow `SCOREBOARD` (font stack `'JetBrains Mono', 'SF Mono', ui-monospace, Consolas, monospace`, `font-size: 11px`, `letter-spacing: 1.6px`, `color: #6B635A`, `font-weight: 500`)
- [x] 2.4 Add the Instrument Serif headline `Sign in.` with `<span style="font-style: italic; color: #2EA168;">.</span>` (font stack `'Instrument Serif', Georgia, 'Times New Roman', serif`, `font-size: 48px`, `line-height: 1`, `letter-spacing: -0.5px`, `color: #1A1714`, `font-weight: 400`)
- [x] 2.5 Add the Geist body paragraph: "Tap the button below to finish signing in. The link is valid for 15 minutes and can only be used once." (font stack `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`, `font-size: 15px`, `line-height: 1.5`, `color: #1A1714`)
- [x] 2.6 Add the accent-green pill CTA as `<a href="<%= @url %>">`: `display: inline-block`, `padding: 12px 24px`, `background: #2EA168`, `color: #FFFDF8`, `border-radius: 999px`, `font-weight: 500`, `text-decoration: none`, Geist font stack — label text `Sign in to Scoreboard`
- [x] 2.7 Add the hairline divider (`height: 1px; background: rgba(26,23,20,0.08)`) and the fallback URL block: muted intro line in Geist + the URL in mono with `word-break: break-all` and `color: #1F7A4D`
- [x] 2.8 Add the muted footnote: "If you didn't request this email, you can safely ignore it." (Geist, `font-size: 12px`, `color: #A8A097`)

## 3. Manual verification

- [x] 3.1 Open the mailer preview at `http://localhost:3000/rails/mailers/user_mailer/magic_link` and confirm the rendered HTML matches the design (warm beige bg, cream card, serif headline with green italic period, green pill CTA)
- [x] 3.2 Toggle the preview's "View raw" / source view and confirm every style is inline (no `<style>` block, no class selectors)
- [x] 3.3 Run `docker compose exec web bin/rails test test/integration/magic_links_create_test.rb` and confirm existing tests still pass — 5 of 6 pass; the 1 failure (`normalizes_email_casing_on_lookup`) pre-exists on master without these view changes (test-isolation artifact, not caused by this change)
- [x] 3.4 Inspect the preview in at least one web-font-disabled context (browser with web fonts blocked, or directly via the email source) and confirm the headline degrades to Georgia, body to system sans, and the layout remains intentional
