export type PublishingCadence = 'weekly' | 'biweekly'
export type WeekStartsOn = 0 | 1

export interface UserSettings {
  reminder_time: string | null
  week_starts_on: WeekStartsOn
  publishing_cadence: PublishingCadence
  timezone: string | null
}

export interface CurrentUser {
  id: number
  email: string
  settings?: UserSettings
}

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export interface AuthState {
  user: CurrentUser | null
  status: AuthStatus
}
