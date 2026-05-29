# Testing The Scribe on your phone

A practical guide to running the local dev app on a real phone — first as a quick visual check on your Wi-Fi, then as a fully-installed PWA with working push notifications.

There are two paths. Pick by what you're testing:

| Path | What you get | What you can't test |
|---|---|---|
| **A. LAN preview** | The app loads on your phone over Wi-Fi, you can poke the UI | PWA install (needs HTTPS), push notifications (needs HTTPS), session cookies in some browsers |
| **B. HTTPS tunnel + Vite proxy** | Full PWA install on the Home Screen, push notifications, real magic-link sign-in from the phone | Nothing — this is the "real" path |

If you just want to see how the layout feels on your phone, do Path A. If you're verifying the install flow or push, do Path B.

---

## Prereqs

- Backend running: `cd backend && docker compose up -d` (Postgres + Rails on `localhost:3000`)
- Node + npm available on the host
- Your laptop and phone on the **same Wi-Fi network** (Path A only)
- For Path B: `cloudflared` installed (`yay -S cloudflared` on Arch, or grab the binary from <https://github.com/cloudflare/cloudflared/releases>)
- A way to read the magic-link email (see "Reading the magic-link email" below)

---

## Path A — Quick LAN preview (no install)

### 1. Start Vite bound to all interfaces

Vite defaults to `localhost` only. Bind it to `0.0.0.0` so other devices on your network can reach it:

```sh
cd frontend
npm run dev -- --host
```

Vite prints two URLs — note the **Network** one (something like `http://192.168.1.42:5173`). That's the address your phone will use.

### 2. Allow the LAN origin in CORS

Open `backend/config/initializers/cors.rb` and add your laptop's LAN URL to the dev allowlist:

```rb
when "development", "test"
  [ "http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.42:5173" ]
```

Restart Rails so the initializer reloads:

```sh
docker compose restart web
```

### 3. Point the frontend at the backend's LAN URL

The frontend defaults `VITE_BACKEND_URL` to `http://localhost:3000`. From your phone, that means *the phone's own* localhost — not your laptop. Override it so the phone hits the laptop:

```sh
# stop the running dev server, then:
VITE_BACKEND_URL=http://192.168.1.42:3000 npm run dev -- --host
```

### 4. Open the URL on your phone

In Safari (iOS) or Chrome (Android), navigate to the Network URL Vite printed (e.g. `http://192.168.1.42:5173`).

You should see the sign-in screen. You can scroll, tap, type — but **don't try to install or enable notifications**. Both require HTTPS, and an HTTP LAN URL doesn't qualify.

### 5. Clean up

When you're done, revert the change in `cors.rb` and don't commit it.

---

## Path B — Full install with HTTPS tunnel

This path uses **one** cloudflared tunnel to expose the Vite dev server to the public internet over HTTPS, and a **Vite dev proxy** to forward `/api/*` traffic to the Rails backend. From the phone's perspective, everything is one HTTPS origin — which makes the Service Worker, push, and the session cookie all behave like production.

### 1. Create your local Vite + env files from the templates

The repo ships **template** files for the tunneled-dev setup. Copy them to remove the `.example` suffix — the copies are gitignored, so any tweaks you make stay on your machine:

```sh
cd frontend
cp vite.config.local.example.ts vite.config.local.ts
cp .env.local.example .env.local
```

What's in those files:
- **`vite.config.local.ts`** — extends the base Vite config with a `server.proxy` block that forwards `/me`, `/magic_links`, `/sessions`, `/daily_logs`, `/week_logs`, and `/push_subscriptions` to Rails on `:3000`. The phone sees one HTTPS origin, so there's no CORS to fight and the session cookie is first-party. This file only takes effect when you start Vite with `--config vite.config.local.ts`, so it can sit on disk without affecting plain `npm run dev`.
- **`.env.local`** — sets `VITE_BACKEND_URL=` (empty) so the API client builds relative URLs that route through the proxy. **The line is commented out by default**, because Vite auto-loads `.env.local` for *every* mode (including plain `npm run dev`) and an empty backend URL silently breaks the normal local dev flow. **Uncomment the `VITE_BACKEND_URL=` line when you start a tunneling session, re-comment it when you're done.**

If you need to tweak something (proxy a new route, change the backend port, swap the API target), edit the copies — the originals stay as templates for future setups.

### 2. Start Vite with the local config

```sh
cd frontend
npx vite --config vite.config.local.ts
```

No `--host` needed — cloudflared connects via localhost.

### 3. Start the cloudflared tunnel

In a second terminal:

```sh
cloudflared tunnel --url http://localhost:5173
```

It prints a URL like `https://random-words-1234.trycloudflare.com`. **That's the URL you'll open on your phone.** It will stay alive as long as the command runs.

### 4. Open the tunnel URL on your phone

Open Safari (iOS) or Chrome (Android) and navigate to the `https://*.trycloudflare.com` URL.

You should see the warm sign-in screen, served over HTTPS.

### 5. Install to Home Screen

**iOS (Safari 16.4+):**
1. Tap the Share button (square with up-arrow)
2. Scroll the share sheet down to **Add to Home Screen**
3. Confirm — The Scribe now lives on your Home Screen with the cream icon
4. **Open it from the Home Screen** (not from Safari). It launches in standalone mode without the browser chrome.

> Push notifications on iOS only work for installed PWAs. The Settings screen's "Daily reminder" toggle will stay disabled with an "Add Scribe to your Home Screen" message until you do this step.

**Android (Chrome):**
1. Chrome usually shows an "Install app" prompt in the address bar after a few seconds
2. If it doesn't, open the menu (⋮) → **Install app** / **Add to Home screen**
3. Confirm — Scribe appears in your launcher

### 6. Clean up

When you're done:
- Stop cloudflared (Ctrl-C)
- Stop Vite (Ctrl-C)
- The `vite.config.local.ts` and `.env.local` files stay around — they're gitignored, so they don't affect commits, and they'll be there next time you want to tunnel
- Remove the installed PWA from your Home Screen if you don't want it lingering

---

## Reading the magic-link email

The dev backend doesn't send real email — it uses **letter_opener_web**, which renders sent emails in a small web UI at `http://localhost:3000/letter_opener` (laptop browser).

To finish sign-in from your phone, you have two options:

### Option 1 — Tell Rails to generate tunnel URLs (recommended)

Set `DEV_PUBLIC_HOST` to your current cloudflared tunnel hostname *before* starting the backend. The compose file forwards it into the container, and `config/environments/development.rb` swaps three things when the env var is present:

- `ActionMailer.default_url_options` (the magic-link button URL in the email body)
- `Rails.application.routes.default_url_options` (any `*_url` helper)
- `Rails.application.config.frontend_url` (the `frontend_url(...)` helper used by `MagicLinksController#show` to redirect after a successful verify)

All three need the tunnel host or the round-trip breaks at one of the steps.

```sh
cd backend
export DEV_PUBLIC_HOST=random-words-1234.trycloudflare.com
docker compose up -d
```

`docker compose up -d` is the right command here — `restart` doesn't re-read the compose file's `${DEV_PUBLIC_HOST:-}` interpolation, so a `restart` alone won't propagate a new tunnel hostname into the container.

Verify it took:

```sh
docker compose exec web env | grep DEV_PUBLIC_HOST
```

Now:
1. On the phone, submit your email
2. On the laptop, open `http://localhost:3000/letter_opener`
3. See the rendered email — the **Sign in to Scribe** button links to `https://random-words-1234.trycloudflare.com/magic_links/<TOKEN>`
4. Either tap the link in `letter_opener` and continue on the laptop, or send the URL to your phone (text, AirDrop, paste) and tap it there — same-origin redirect, the session cookie sticks.

When the tunnel URL rotates (every `cloudflared --url` restart), `export DEV_PUBLIC_HOST=<new>` and `docker compose up -d` again.

### Option 2 — Manually rewrite the URL (no env var)

If you don't want to set `DEV_PUBLIC_HOST`:
1. On the phone, submit your email
2. On the laptop, open `http://localhost:3000/letter_opener`
3. Copy just the token from the magic-link URL (the bit after `/magic_links/`)
4. On the phone, type into the address bar: `https://<your-tunnel>.trycloudflare.com/magic_links/<TOKEN>`
5. Tap go — Vite proxies to Rails, Rails verifies + redirects, you're in.

---

## Testing the daily reminder push notification

1. Sign in (see above)
2. Go to **Settings**
3. Toggle **Daily reminder** on — the browser will prompt for notification permission. Accept.
4. Set **Time** to a minute or two from now
5. Lock your phone and wait

To trigger a reminder immediately for testing (instead of waiting), run on the host:

```sh
docker compose exec web bin/rails runner 'DailyReminderDispatcherJob.perform_now'
```

(Or find the equivalent job name in `backend/app/jobs/` if this one was renamed.)

The push should arrive on the lock screen even with the app closed (Android) or with the PWA closed (iOS — but the device must be unlocked).

---

## Troubleshooting

**"Failed to fetch" / CORS error in the browser console (Path A)**
The LAN origin isn't in `cors.rb` allowlist, or you forgot to restart Rails after editing it. Re-check step 2.

**"Cannot read property 'X' of undefined" or blank screen**
`VITE_BACKEND_URL` is wrong (still pointing at `localhost:3000` for Path A, or set to a non-empty value for Path B). Stop Vite and restart with the correct value.

**iOS shows "This site can't be downloaded as an app"**
You're trying to install from a non-HTTPS origin. iOS only allows install from HTTPS. Switch to Path B.

**iOS push toggle is disabled with "Add Scribe to your Home Screen"**
Expected. iOS only supports Web Push for installed PWAs. Add to Home Screen, then open the installed app — the toggle becomes interactive.

**Service worker is serving stale content after a code change**
On the phone, unregister the SW via browser DevTools, or uninstall + reinstall the PWA. Vite picks up code changes on refresh, but the SW caches independently.

**Tunnel URL changes every restart**
That's how `cloudflared tunnel --url` works (ephemeral). For a stable subdomain, set up a named tunnel — not worth the setup for casual testing.

**Vite shows "Blocked request. This host is not allowed."**
Vite refuses requests whose `Host` header isn't in `server.allowedHosts`. The shipped `vite.config.local.example.ts` already whitelists `.trycloudflare.com`. If you're using a different tunneling tool (ngrok, localtunnel, etc.), add its domain (e.g. `.ngrok-free.app`) to `allowedHosts` in your `vite.config.local.ts` and restart Vite.

**HMR doesn't update over the tunnel**
The local config sets `server.hmr.protocol: 'wss'` and `clientPort: 443` so HMR's websocket connects over the public HTTPS port. If you change to a different tunneling tool or it terminates TLS differently, you may need to tweak these.

**Magic-link click on phone redirects to localhost (or to `http://localhost:5173/`)**
Rails wasn't started with `DEV_PUBLIC_HOST` set, so it's still using its default host (`localhost`) for both the link URL and the post-verify redirect. Set the env var and recreate the container (see "Option 1" above). Note: if you set `DEV_PUBLIC_HOST` *after* a magic-link email was already sent, the redirect from that pending link will still use whatever `frontend_url` was at the time of the click — which is fine after the env-var change, but the in-flight email's button URL was rendered earlier and might still be localhost. Easiest fix: request a fresh email.

**"Notification permission denied" on Android**
The user denied permission earlier and Chrome is remembering. In Chrome on the phone: site settings → reset permissions for the tunnel domain.

---

## When you're done

- Stop background services if you want: `cd backend && docker compose down`
- For Path A: revert any temporary edits to `cors.rb` (the LAN origin you added)
- For Path B: nothing to revert in committed files — `vite.config.local.ts` and `.env.local` are gitignored; you can keep them or `rm` them
- Uninstall the PWA from the phone's Home Screen if it's not the build you want lingering
