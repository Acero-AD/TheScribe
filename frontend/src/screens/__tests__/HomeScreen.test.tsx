import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeScreen } from '../HomeScreen'
import * as AuthContext from '../../auth/AuthContext'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('HomeScreen sign-out flow', () => {
  it('calls the sign-out endpoint, clears state, and routes to /sign-in', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const signOut = vi.fn(async () => {
      await fetch('/sessions/current', { method: 'DELETE', credentials: 'include' })
    })

    vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
      user: { id: 1, email: 'me@example.com' },
      status: 'signed-in',
      refresh: vi.fn(),
      signOut,
      setUser: vi.fn(),
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/sign-in" element={<div>At sign in</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/me@example\.com/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/at sign in/i)).toBeInTheDocument()
  })
})
