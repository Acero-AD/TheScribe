import { api } from './client'

export interface PushConfig {
  vapid_public_key: string
}

let cached: Promise<PushConfig> | null = null

export function getPushConfig(): Promise<PushConfig> {
  if (!cached) {
    cached = api<PushConfig>('/push_config').catch((error) => {
      cached = null
      throw error
    })
  }
  return cached
}

export function resetPushConfigCache(): void {
  cached = null
}
