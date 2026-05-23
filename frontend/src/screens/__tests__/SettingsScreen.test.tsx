import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from '../SettingsScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as settingsApi from '../../api/settings'
import type { UserSettings } from '../../auth/types'

const SETTINGS: UserSettings = {
  reminder_time: '20:00',
  week_starts_on: 1,
  publishing_cadence: 'weekly',
  timezone: 'UTC',
}

function mockCurrentUser(settings: UserSettings = SETTINGS) {
  const setUser = vi.fn()
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: { id: 1, email: 'me@example.com', settings },
    status: 'signed-in',
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser,
  })
  return { setUser }
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsScreen />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsScreen — render', () => {
  it('renders current values from useCurrentUser', () => {
    mockCurrentUser()
    renderScreen()
    expect(screen.getByLabelText(/reminder time/i)).toHaveValue('20:00')
    expect(screen.getByLabelText(/week starts on/i)).toHaveValue('1')
    expect(screen.getByLabelText(/publishing cadence/i)).toHaveValue('weekly')
  })
})

describe('SettingsScreen — cadence dropdown', () => {
  it('PATCHes once on change and updates display on success', async () => {
    const { setUser } = mockCurrentUser()
    const patch = vi
      .spyOn(settingsApi, 'patchSettings')
      .mockResolvedValue({ ...SETTINGS, publishing_cadence: 'biweekly' })

    const user = userEvent.setup()
    renderScreen()

    await user.selectOptions(screen.getByLabelText(/publishing cadence/i), 'biweekly')

    await waitFor(() => {
      expect(patch).toHaveBeenCalledTimes(1)
    })
    expect(patch).toHaveBeenCalledWith({ publishing_cadence: 'biweekly' })
    expect(screen.getByLabelText(/publishing cadence/i)).toHaveValue('biweekly')
    await waitFor(() => expect(setUser).toHaveBeenCalled())
  })

  it('reverts displayed value and shows the error indicator on PATCH failure', async () => {
    mockCurrentUser()
    vi.spyOn(settingsApi, 'patchSettings').mockRejectedValue(new Error('boom'))

    const user = userEvent.setup()
    renderScreen()

    await user.selectOptions(screen.getByLabelText(/publishing cadence/i), 'biweekly')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/couldn't save the cadence/i)
    })
    expect(screen.getByLabelText(/publishing cadence/i)).toHaveValue('weekly')
  })
})

describe('SettingsScreen — time picker debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces rapid changes to a single PATCH', async () => {
    mockCurrentUser()
    const patch = vi
      .spyOn(settingsApi, 'patchSettings')
      .mockResolvedValue({ ...SETTINGS, reminder_time: '07:30' })

    renderScreen()
    const input = screen.getByLabelText(/reminder time/i)

    fireEvent.change(input, { target: { value: '07:00' } })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    fireEvent.change(input, { target: { value: '07:15' } })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    fireEvent.change(input, { target: { value: '07:30' } })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(patch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith({ reminder_time: '07:30' })
  })
})
