import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmSignInScreen } from '../ConfirmSignInScreen'

const refreshMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../../auth/AuthContext', () => ({
  useCurrentUser: () => ({ refresh: refreshMock }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  refreshMock.mockClear()
  vi.unstubAllGlobals()
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function LocationDisplay() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sign-in/confirm" element={<ConfirmSignInScreen />} />
        <Route path="*" element={null} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  )
}

describe('ConfirmSignInScreen', () => {
  it('POSTs to consume, refreshes auth, and lands on the app on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    const user = userEvent.setup()
    renderAt('/sign-in/confirm?token=ABC')

    await user.click(screen.getByRole('button', { name: /finish signing in/i }))

    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/'))
    expect(refreshMock).toHaveBeenCalled()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/magic_links/ABC/consume')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
  })

  it('redirects to sign-in with the backend error code on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { error: { code: 'expired' } }))
    const user = userEvent.setup()
    renderAt('/sign-in/confirm?token=ABC')

    await user.click(screen.getByRole('button', { name: /finish signing in/i }))

    await waitFor(() =>
      expect(screen.getByTestId('loc').textContent).toBe('/sign-in?error=expired'),
    )
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('redirects to sign-in when the token is missing', () => {
    renderAt('/sign-in/confirm')
    expect(screen.getByTestId('loc').textContent).toBe('/sign-in?error=invalid')
  })
})
