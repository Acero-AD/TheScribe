import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from './AuthContext'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useCurrentUser()

  if (status === 'loading') {
    return <div role="status" aria-live="polite">Loading…</div>
  }

  if (status === 'signed-out') {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
