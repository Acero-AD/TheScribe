import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from '../SettingsScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as settingsApi from '../../api/settings'
import type { UserSettings } from '../../auth/types'

const SETTINGS: UserSettings = {
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
