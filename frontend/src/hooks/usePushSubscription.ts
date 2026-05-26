import { useCallback, useEffect, useRef, useState } from 'react'
import { getPushConfig } from '../api/pushConfig'
import {
  deletePushSubscription,
  postPushSubscription,
} from '../api/pushSubscriptions'
import {
  isIOSStandaloneRequired,
  isPushSupported,
  urlBase64ToUint8Array,
} from '../lib/push'

export type PushStatus =
  | 'unsupported'
  | 'install-required'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed'
  | 'transitioning'

interface UsePushSubscriptionResult {
  status: PushStatus
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

// Resolves the device's actual current state from browser APIs.
// `'transitioning'` is owned by the caller — we never return it here.
async function readStatus(): Promise<Exclude<PushStatus, 'transitioning'>> {
  if (!isPushSupported()) return 'unsupported'
  if (isIOSStandaloneRequired()) return 'install-required'
  if (Notification.permission === 'denied') return 'denied'

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  return existing ? 'subscribed' : 'unsubscribed'
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [status, setStatus] = useState<PushStatus>(() =>
    isPushSupported()
      ? isIOSStandaloneRequired()
        ? 'install-required'
        : 'transitioning'
      : 'unsupported',
  )
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    void (async () => {
      const resolved = await readStatus()
      if (mounted.current) setStatus(resolved)
    })()
    return () => {
      mounted.current = false
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (status === 'unsupported' || status === 'install-required') return
    setError(null)
    setStatus('transitioning')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        if (mounted.current) setStatus(permission === 'denied' ? 'denied' : 'unsubscribed')
        return
      }

      const { vapid_public_key } = await getPushConfig()
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public_key),
      })

      try {
        await postPushSubscription({
          endpoint: sub.endpoint,
          p256dh_key: arrayBufferToBase64Url(sub.getKey('p256dh')),
          auth_key: arrayBufferToBase64Url(sub.getKey('auth')),
        })
      } catch (postError) {
        // Avoid orphaning a local subscription the backend doesn't know about.
        try {
          await sub.unsubscribe()
        } catch {
          // best-effort cleanup
        }
        throw postError
      }

      if (mounted.current) setStatus('subscribed')
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Could not enable notifications.')
        setStatus(await readStatus())
      }
    }
  }, [status])

  const unsubscribe = useCallback(async () => {
    if (status === 'unsupported' || status === 'install-required') return
    setError(null)
    setStatus('transitioning')
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        const endpoint = existing.endpoint
        await existing.unsubscribe()
        try {
          await deletePushSubscription(endpoint)
        } catch {
          // Server delete is idempotent; ignore failures so the UI still
          // reflects the local unsubscribe.
        }
      }
      if (mounted.current) setStatus('unsubscribed')
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Could not disable notifications.')
        setStatus(await readStatus())
      }
    }
  }, [status])

  return { status, error, subscribe, unsubscribe }
}
