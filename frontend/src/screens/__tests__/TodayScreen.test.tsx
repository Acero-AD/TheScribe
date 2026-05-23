import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayScreen } from '../TodayScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as dailyLogsApi from '../../api/dailyLogs'
import type { DailyLog } from '../../api/dailyLogs'

const TODAY = '2026-05-23'
const TIMEZONE = 'UTC'

function defaultLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: TODAY,
    wrote: false,
    wrote_at: null,
    note: null,
    ...overrides,
  }
}

function mockCurrentUser() {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: {
      id: 1,
      email: 'me@example.com',
      settings: {
        reminder_time: null,
        week_starts_on: 1,
        publishing_cadence: 'weekly',
        timezone: TIMEZONE,
      },
    },
    status: 'signed-in',
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
  })
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TodayScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-05-23T12:00:00Z'))
  mockCurrentUser()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('TodayScreen — optimistic toggle', () => {
  it('flips state immediately, calls putDailyLog, and persists on success', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    const put = vi
      .spyOn(dailyLogsApi, 'putDailyLog')
      .mockResolvedValue(defaultLog({ wrote: true, wrote_at: '2026-05-23T12:00:00Z' }))

    const user = userEvent.setup()
    renderScreen()

    const button = await screen.findByRole('button', { name: /mark as written today/i })
    await user.click(button)

    // Optimistically pressed immediately
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith(TODAY, { wrote: true })
    })
    expect(await screen.findByText(/logged · /i)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('reverts the toggle state and shows the error indicator on a failed PUT', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(dailyLogsApi, 'putDailyLog').mockRejectedValue(new Error('boom'))

    const user = userEvent.setup()
    renderScreen()

    const button = await screen.findByRole('button', { name: /mark as written today/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/couldn't save/i)
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('TodayScreen — note autosave', () => {
  it('saves once when the textarea content changed on blur', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    const put = vi
      .spyOn(dailyLogsApi, 'putDailyLog')
      .mockResolvedValue(defaultLog({ note: 'shipped the landing' }))

    const user = userEvent.setup()
    renderScreen()

    const textarea = await screen.findByLabelText(/today's note/i)
    await user.type(textarea, 'shipped the landing')
    await user.tab()

    await waitFor(() => {
      expect(put).toHaveBeenCalledTimes(1)
    })
    expect(put).toHaveBeenCalledWith(TODAY, { note: 'shipped the landing' })
  })

  it('does not save when the textarea blurs with no change', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog({ note: 'hello' }))
    const put = vi.spyOn(dailyLogsApi, 'putDailyLog')

    const user = userEvent.setup()
    renderScreen()

    const textarea = await screen.findByLabelText(/today's note/i)
    await waitFor(() => expect(textarea).toHaveValue('hello'))

    await user.click(textarea)
    await user.tab()

    expect(put).not.toHaveBeenCalled()
  })

  it('sends an empty-string note on blur when the textarea is cleared', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog({ note: 'hello' }))
    const put = vi
      .spyOn(dailyLogsApi, 'putDailyLog')
      .mockResolvedValue(defaultLog({ note: null }))

    const user = userEvent.setup()
    renderScreen()

    const textarea = await screen.findByLabelText(/today's note/i)
    await waitFor(() => expect(textarea).toHaveValue('hello'))
    await user.clear(textarea)
    await user.tab()

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith(TODAY, { note: '' })
    })
  })
})
