export interface CurrentUser {
  id: number
  email: string
}

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export interface AuthState {
  user: CurrentUser | null
  status: AuthStatus
}
