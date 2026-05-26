import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from '../SettingsScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as pushHook from '../../hooks/usePushSubscription'
import type { PushStatus } from '../../hooks/usePushSubscription'
import type { UserSettings } from '../../auth/types'

const SETTINGS: UserSettings = {
  reminder_time: '20:00',
  week_starts_on: 1,
  publishing_cadence: 'weekly',
  timezone: 'UTC',
}

function mockUser() {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: { id: 1, email: 'me@example.com', settings: SETTINGS },
    status: 'signed-in',
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
  })
}

function mockPush(status: PushStatus, error: string | null = null) {
  const subscribe = vi.fn().mockResolvedValue(undefined)
  const unsubscribe = vi.fn().mockResolvedValue(undefined)
  vi.spyOn(pushHook, 'usePushSubscription').mockReturnValue({
    status,
    error,
    subscribe,
    unsubscribe,
  })
  return { subscribe, unsubscribe }
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockUser()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsScreen — Daily reminder toggle row', () => {
  it('renders the Daily reminder label and subtitle above the Time row', () => {
    mockPush('unsubscribed')
    renderScreen()
    expect(screen.getByText('Daily reminder')).toBeInTheDocument()
    expect(screen.getByText(/A nudge if you haven't checked in/i)).toBeInTheDocument()
  })

  it('toggle is ON when status is "subscribed"', () => {
    mockPush('subscribed')
    renderScreen()
    const toggle = screen.getByRole('switch', { name: /daily reminder/i })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toBeEnabled()
  })

  it('toggle is OFF when status is "unsubscribed"', () => {
    mockPush('unsubscribed')
    renderScreen()
    const toggle = screen.getByRole('switch', { name: /daily reminder/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(toggle).toBeEnabled()
  })

  it('toggle is disabled while transitioning', () => {
    mockPush('transitioning')
    renderScreen()
    expect(screen.getByRole('switch', { name: /daily reminder/i })).toBeDisabled()
  })

  it('toggle is disabled when unsupported', () => {
    mockPush('unsupported')
    renderScreen()
    expect(screen.getByRole('switch', { name: /daily reminder/i })).toBeDisabled()
  })

  it('toggle is disabled when install-required', () => {
    mockPush('install-required')
    renderScreen()
    expect(screen.getByRole('switch', { name: /daily reminder/i })).toBeDisabled()
  })

  it('toggle is disabled when denied', () => {
    mockPush('denied')
    renderScreen()
    expect(screen.getByRole('switch', { name: /daily reminder/i })).toBeDisabled()
  })

  it('clicking the OFF toggle invokes subscribe()', async () => {
    const { subscribe, unsubscribe } = mockPush('unsubscribed')
    renderScreen()
    await userEvent.setup().click(screen.getByRole('switch', { name: /daily reminder/i }))
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  it('clicking the ON toggle invokes unsubscribe()', async () => {
    const { subscribe, unsubscribe } = mockPush('subscribed')
    renderScreen()
    await userEvent.setup().click(screen.getByRole('switch', { name: /daily reminder/i }))
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('renders the denied-state inline message', () => {
    mockPush('denied')
    renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent(/blocked/i)
  })

  it('renders the install-required inline message', () => {
    mockPush('install-required')
    renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent(/home screen/i)
  })

  it('renders the error message when the hook surfaces a subscribe/unsubscribe error', () => {
    mockPush('unsubscribed', 'Could not enable notifications.')
    renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent(/could not enable/i)
  })

  it('does not render an alert for the unsupported state', () => {
    mockPush('unsupported')
    renderScreen()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
