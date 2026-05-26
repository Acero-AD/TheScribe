import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pushLib from '../../lib/push'
import * as pushConfigApi from '../../api/pushConfig'
import * as pushSubsApi from '../../api/pushSubscriptions'
import { usePushSubscription } from '../usePushSubscription'

interface FakeSubscription {
  endpoint: string
  unsubscribe: ReturnType<typeof vi.fn>
  getKey: (name: 'p256dh' | 'auth') => ArrayBuffer
}

function makeFakeSubscription(endpoint = 'https://push.example/abc'): FakeSubscription {
  const buf = (n: number) => new Uint8Array(n).fill(0x11).buffer
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    getKey: vi.fn((name) => (name === 'p256dh' ? buf(65) : buf(16))),
  }
}

interface StubOptions {
  supported?: boolean
  iosInstall?: boolean
  permission?: NotificationPermission
  existing?: FakeSubscription | null
  permissionRequest?: NotificationPermission
  subscribeResult?: FakeSubscription
}

function stubBrowserApis(opts: StubOptions = {}) {
  const {
    supported = true,
    iosInstall = false,
    permission = 'default',
    existing = null,
    permissionRequest = 'granted',
    subscribeResult = makeFakeSubscription(),
  } = opts

  vi.spyOn(pushLib, 'isPushSupported').mockReturnValue(supported)
  vi.spyOn(pushLib, 'isIOSStandaloneRequired').mockReturnValue(iosInstall)

  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(existing),
    subscribe: vi.fn().mockResolvedValue(subscribeResult),
  }
  const registration = { pushManager } as unknown as ServiceWorkerRegistration
  Object.defineProperty(global.navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  })
  ;(globalThis as unknown as { Notification: unknown }).Notification = {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permissionRequest),
  }

  return { pushManager, subscribeResult }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePushSubscription', () => {
  it('starts at "subscribed" after a successful subscribe()', async () => {
    const { subscribeResult } = stubBrowserApis()
    vi.spyOn(pushConfigApi, 'getPushConfig').mockResolvedValue({
      vapid_public_key: 'aGVsbG8gd29ybGQ',
    })
    const postSpy = vi
      .spyOn(pushSubsApi, 'postPushSubscription')
      .mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('unsubscribed'))

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.status).toBe('subscribed')
    expect(postSpy).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscribeResult.endpoint }),
    )
  })

  it('returns "denied" when permission is already denied', async () => {
    stubBrowserApis({ permission: 'denied' })
    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('denied'))
  })

  it('returns "denied" if the user denies the permission prompt during subscribe()', async () => {
    stubBrowserApis({ permission: 'default', permissionRequest: 'denied' })
    vi.spyOn(pushConfigApi, 'getPushConfig').mockResolvedValue({
      vapid_public_key: 'aGVsbG8gd29ybGQ',
    })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('unsubscribed'))

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.status).toBe('denied')
  })

  it('returns "install-required" on a simulated iOS-non-standalone environment', async () => {
    stubBrowserApis({ iosInstall: true })
    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('install-required'))
  })

  it('returns "unsupported" when service worker or PushManager are missing', async () => {
    stubBrowserApis({ supported: false })
    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('unsupported'))
  })

  it('walks to "unsubscribed" after unsubscribe() and calls DELETE', async () => {
    const existing = makeFakeSubscription()
    stubBrowserApis({ existing })
    const deleteSpy = vi
      .spyOn(pushSubsApi, 'deletePushSubscription')
      .mockResolvedValue(undefined)

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.status).toBe('subscribed'))

    await act(async () => {
      await result.current.unsubscribe()
    })

    expect(existing.unsubscribe).toHaveBeenCalled()
    expect(deleteSpy).toHaveBeenCalledWith(existing.endpoint)
    expect(result.current.status).toBe('unsubscribed')
  })
})
