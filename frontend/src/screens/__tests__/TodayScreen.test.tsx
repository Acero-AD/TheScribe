import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayScreen } from '../TodayScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as dailyLogsApi from '../../api/dailyLogs'
import * as weekLogsApi from '../../api/weekLogs'
import type { DailyLog } from '../../api/dailyLogs'
import type { WeekLog } from '../../api/weekLogs'
import type { PublishingCadence } from '../../auth/types'

const TODAY = '2026-05-23'
const WEEK_START = '2026-05-18'
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

function defaultWeekLog(overrides: Partial<WeekLog> = {}): WeekLog {
  return {
    week_start_date: WEEK_START,
    published: false,
    ...overrides,
  }
}

function mockCurrentUser(cadence: PublishingCadence = 'weekly') {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: {
      id: 1,
      email: 'me@example.com',
      settings: {
        week_starts_on: 1,
        publishing_cadence: cadence,
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
  // Default week-log fetch to the unchecked default so tests that don't care
  // about the publish card don't have to wire it up themselves.
  vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(defaultWeekLog())
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

  it('shows the prior streak during the in-flight window then the server value', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog({ writing_streak: 4 }))

    let resolvePut!: (value: DailyLog) => void
    vi.spyOn(dailyLogsApi, 'putDailyLog').mockImplementation(
      () =>
        new Promise<DailyLog>((resolve) => {
          resolvePut = resolve
        }),
    )

    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => {
      expect(screen.getByLabelText(/day streak/i)).toHaveTextContent('04')
    })

    const button = screen.getByRole('button', { name: /mark as written today/i })
    await user.click(button)

    // Mid-flight: pressed optimistically, but the streak stays at the prior value.
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/day streak/i)).toHaveTextContent('04')

    resolvePut(defaultLog({ wrote: true, wrote_at: '2026-05-23T12:00:00Z', writing_streak: 5 }))

    await waitFor(() => {
      expect(screen.getByLabelText(/day streak/i)).toHaveTextContent('05')
    })
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

describe('TodayScreen — weekly publish toggle', () => {
  it('flips state immediately, calls putWeekLog, and persists on success', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(defaultWeekLog())
    const put = vi
      .spyOn(weekLogsApi, 'putWeekLog')
      .mockResolvedValue(defaultWeekLog({ published: true }))

    const user = userEvent.setup()
    renderScreen()

    const button = await screen.findByRole('button', {
      name: /mark as published this week/i,
    })
    await user.click(button)

    // Optimistically pressed immediately
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith(WEEK_START, { published: true })
    })

    expect(
      await screen.findByRole('button', { name: /mark as not published this week/i }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('reverts the publish state and shows the error indicator on a failed PUT', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(defaultWeekLog())
    vi.spyOn(weekLogsApi, 'putWeekLog').mockRejectedValue(new Error('boom'))

    const user = userEvent.setup()
    renderScreen()

    const button = await screen.findByRole('button', {
      name: /mark as published this week/i,
    })
    await user.click(button)

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((node) => /couldn't save/i.test(node.textContent ?? ''))).toBe(
        true,
      )
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the prior publishing streak during the in-flight window then the server value', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(
      defaultWeekLog({ publishing_streak: 2 }),
    )

    let resolvePut!: (value: WeekLog) => void
    vi.spyOn(weekLogsApi, 'putWeekLog').mockImplementation(
      () =>
        new Promise<WeekLog>((resolve) => {
          resolvePut = resolve
        }),
    )

    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => {
      expect(screen.getByLabelText(/week streak/i)).toHaveTextContent('02')
    })

    const button = screen.getByRole('button', {
      name: /mark as published this week/i,
    })
    await user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    // Prior streak is preserved mid-flight.
    expect(screen.getByLabelText(/week streak/i)).toHaveTextContent('02')

    resolvePut(defaultWeekLog({ published: true, publishing_streak: 3 }))

    await waitFor(() => {
      expect(screen.getByLabelText(/week streak/i)).toHaveTextContent('03')
    })
  })
})

describe('TodayScreen — cadence-aware publish label', () => {
  it('renders "Week streak" for a weekly user', async () => {
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(defaultWeekLog({ publishing_streak: 1 }))
    renderScreen()
    expect(await screen.findByLabelText('Week streak')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cycle streak')).not.toBeInTheDocument()
  })

  it('renders "Cycle streak" for a biweekly user', async () => {
    mockCurrentUser('biweekly')
    vi.spyOn(dailyLogsApi, 'getDailyLog').mockResolvedValue(defaultLog())
    vi.spyOn(weekLogsApi, 'getWeekLog').mockResolvedValue(defaultWeekLog({ publishing_streak: 1 }))
    renderScreen()
    expect(await screen.findByLabelText('Cycle streak')).toBeInTheDocument()
    expect(screen.queryByLabelText('Week streak')).not.toBeInTheDocument()
  })
})
