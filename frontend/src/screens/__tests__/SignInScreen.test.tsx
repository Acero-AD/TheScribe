import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignInScreen } from '../SignInScreen'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SignInScreen />
    </MemoryRouter>,
  )
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('SignInScreen', () => {
  it('shows the confirmation state after a successful submission', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { message: 'ok' }))
    const user = userEvent.setup()
    renderAt('/sign-in')

    await user.type(screen.getByLabelText(/email/i), 'me@example.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByText(/me@example\.com/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'me@example.com' })
  })

  it('shows an inline retryable error on a server failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }))
    const user = userEvent.setup()
    renderAt('/sign-in')

    await user.type(screen.getByLabelText(/email/i), 'me@example.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
    })
    expect(screen.getByLabelText(/email/i)).toBeEnabled()
  })

  it('surfaces a 422 validation error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { errors: { email: ['is invalid'] } }))
    const user = userEvent.setup()
    renderAt('/sign-in')

    await user.type(screen.getByLabelText(/email/i), 'bad')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
    })
  })

  it.each([
    ['expired', /expired/i],
    ['consumed', /already been used/i],
    ['invalid', /not valid/i],
  ])('renders the %s error message from the URL query', async (code, expected) => {
    renderAt(`/sign-in?error=${code}`)
    expect(screen.getByRole('alert')).toHaveTextContent(expected)
  })
})
