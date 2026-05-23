export interface UserSettings {
  timezone?: string
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
