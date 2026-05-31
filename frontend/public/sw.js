// The Scribe daily-reminder service worker.
//
// Two responsibilities, intentionally narrow:
//   1. `push`              → render a system notification with the payload's
//                            title/body the backend's SendReminderJob ships.
//   2. `notificationclick` → focus an existing app window at "/" if one is
//                            open, otherwise open a new one.
//
// No offline strategy. No fetch handling. No precaching. The smaller this
// stays, the fewer ways it has to break.

const APP_ROOT = '/'

self.addEventListener('push', (event) => {
  const payload = parsePayload(event)
  const title = payload.title ?? 'Did you write today?'
  const body = payload.body ?? 'A nudge from The Scribe.'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192-v2.png',
      badge: '/icons/icon-192-v2.png',
      tag: 'daily-reminder',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(focusOrOpen())
})

// A no-op fetch listener. Older Chrome versions only treat the app as
// "installable" (Add to Home Screen banner) when the SW has a fetch handler.
// We intentionally do not call event.respondWith — the browser falls back to
// its default network behaviour.
self.addEventListener('fetch', () => {})

function parsePayload(event) {
  if (!event.data) return {}
  try {
    return event.data.json()
  } catch {
    return { body: event.data.text() }
  }
}

async function focusOrOpen() {
  const targetUrl = new URL(APP_ROOT, self.location.origin).href
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of all) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      return client.focus()
    }
  }
  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl)
  }
  return null
}
