// Template for the local-only dev config used by Path B in
// docs/testing-on-phone.md (tunneled phone testing).
//
// To use:
//   cp vite.config.local.example.ts vite.config.local.ts
//   npx vite --config vite.config.local.ts
//
// The copied file (`vite.config.local.ts`) is gitignored.
import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vite.config'

const backendTarget = 'http://localhost:3000'

export default mergeConfig(
  base,
  defineConfig({
    server: {
      // Allow the cloudflared tunnel hostname (rotates per restart) and any
      // ad-hoc *.trycloudflare.com subdomain to pass Vite's host check.
      allowedHosts: ['.trycloudflare.com'],
      // HMR runs over the public HTTPS tunnel, so the client must connect on
      // port 443 (wss) rather than the local 5173.
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
      proxy: {
        '/me': backendTarget,
        '/magic_links': backendTarget,
        '/sessions': backendTarget,
        '/daily_logs': backendTarget,
        '/week_logs': backendTarget,
        '/push_subscriptions': backendTarget,
      },
    },
  }),
)
