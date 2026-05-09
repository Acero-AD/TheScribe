import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError } from '../api/client'
import type { AuthState, CurrentUser } from './types'

interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: CurrentUser | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ user: null, status: 'loading' })

  const refresh = useCallback(async () => {
    try {
      const user = await api<CurrentUser>('/me')
      setState({ user, status: 'signed-in' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState({ user: null, status: 'signed-out' })
        return
      }
      setState({ user: null, status: 'signed-out' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await api('/sessions/current', { method: 'DELETE' })
    } finally {
      setState({ user: null, status: 'signed-out' })
    }
  }, [])

  const setUser = useCallback((user: CurrentUser | null) => {
    setState({ user, status: user ? 'signed-in' : 'signed-out' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, refresh, signOut, setUser }),
    [state, refresh, signOut, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useCurrentUser(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used inside an <AuthProvider>')
  }
  return context
}
