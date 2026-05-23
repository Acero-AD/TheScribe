import { api } from './client'
import type { UserSettings } from '../auth/types'
import { detectTimezone } from '../lib/time'

export type SettingsPatch = Partial<UserSettings>

export function patchSettings(partial: SettingsPatch): Promise<UserSettings> {
  return api<UserSettings>('/me/settings', {
    method: 'PATCH',
    body: { ...partial, timezone: detectTimezone() },
  })
}
