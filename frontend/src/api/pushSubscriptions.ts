import { api } from './client'

export interface PushSubscriptionPayload {
  endpoint: string
  p256dh_key: string
  auth_key: string
}

export function postPushSubscription(
  payload: PushSubscriptionPayload,
): Promise<{ id: number }> {
  return api('/push_subscriptions', {
    method: 'POST',
    body: {
      endpoint: payload.endpoint,
      p256dh_key: payload.p256dh_key,
      auth_key: payload.auth_key,
    },
  })
}

export function deletePushSubscription(endpoint: string): Promise<unknown> {
  return api('/push_subscriptions/current', {
    method: 'DELETE',
    body: { endpoint },
  })
}
