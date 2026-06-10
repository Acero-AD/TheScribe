## ADDED Requirements

### Requirement: The published SPA sends security response headers

The frontend host (Cloudflare Pages) SHALL return security headers with the served application so a cookie-authenticated SPA has standard defense-in-depth against clickjacking, MIME sniffing, and referrer leakage. The response SHALL include a `Content-Security-Policy` restricting scripts and styles to the application origin and limiting `connect-src` to the application origin and the production backend API origin; `frame-ancestors 'none'` (or an equivalent `X-Frame-Options`); `X-Content-Type-Options: nosniff`; and a `Referrer-Policy` of `strict-origin-when-cross-origin` (or stricter). The headers SHALL NOT block the SPA's own scripts/styles or its API calls to the backend.

#### Scenario: Security headers are present on the served app
- **WHEN** a client loads the deployed frontend
- **THEN** the response includes `Content-Security-Policy`, a frame-ancestors / `X-Frame-Options` restriction, `X-Content-Type-Options: nosniff`, and a `Referrer-Policy`

#### Scenario: The CSP permits the app and its backend
- **WHEN** the served SPA loads its own bundle and makes API requests to the production backend origin
- **THEN** the configured CSP allows the app's scripts/styles and the backend `connect-src`, and the app functions normally

#### Scenario: Framing is disallowed
- **WHEN** a third-party page attempts to embed the SPA in an iframe
- **THEN** the framing is blocked by `frame-ancestors 'none'` / `X-Frame-Options`
