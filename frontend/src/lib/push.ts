// Utilities for Web Push subscription on the frontend.

// Converts the backend's base64url-encoded VAPID public key into the
// `Uint8Array` that `pushManager.subscribe`'s `applicationServerKey` expects.
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i)
  }
  return out
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// iOS Safari only delivers Web Push to installed PWAs (Add to Home Screen).
// Returns true on iOS Safari when the page is running in a regular tab,
// false when it's running standalone or when the user is on any other
// platform. The Settings toggle uses this to surface an install gate
// instead of silently letting `requestPermission` no-op.
export function isIOSStandaloneRequired(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  if (!isIOS) return false
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayStandalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  return !(standalone || displayStandalone)
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (error) {
    console.warn('Service worker registration failed:', error)
    return null
  }
}
