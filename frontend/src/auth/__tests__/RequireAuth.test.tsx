import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../RequireAuth'
import * as AuthContext from '../AuthContext'
import type { AuthStatus } from '../types'

function setAuthStatus(status: AuthStatus, email = 'me@example.com') {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: status === 'signed-in' ? { id: 1, email } : null,
    status,
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
  })
}

function renderTree() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          }
        />
        <Route path="/sign-in" element={<div>Sign-in screen</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renders a loading indicator while auth status is loading', () => {
    setAuthStatus('loading')
    renderTree()
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument()
  })

  it('redirects to /sign-in when signed out', () => {
    setAuthStatus('signed-out')
    renderTree()
    expect(screen.getByText(/sign-in screen/i)).toBeInTheDocument()
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument()
  })

  it('renders children when signed in', () => {
    setAuthStatus('signed-in')
    renderTree()
    expect(screen.getByText(/protected content/i)).toBeInTheDocument()
  })
})
