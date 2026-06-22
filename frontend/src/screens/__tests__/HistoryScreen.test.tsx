import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryScreen } from '../HistoryScreen'
import * as AuthContext from '../../auth/AuthContext'
import * as historyApi from '../../api/history'
import type { History } from '../../api/history'
import type { PublishingCadence, WeekStartsOn } from '../../auth/types'

function payload(overrides: Partial<History> = {}): History {
  return {
    month: '2026-05',
    daily_logs: [],
    week_logs: [],
    writing_streak_current: 0,
    writing_streak_best: 0,
    publishing_streak_current: 0,
    ...overrides,
  }
}

function mockCurrentUser({
  cadence = 'weekly',
  weekStartsOn = 1,
  timezone = 'UTC',
}: {
  cadence?: PublishingCadence
  weekStartsOn?: WeekStartsOn
  timezone?: string
} = {}) {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: {
      id: 1,
      email: 'me@example.com',
      settings: {
        week_starts_on: weekStartsOn,
        publishing_cadence: cadence,
        timezone,
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
    <MemoryRouter initialEntries={['/history']}>
      <HistoryScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // 2026-05-20 (Wed) at 12:00 UTC.
  vi.setSystemTime(new Date('2026-05-20T12:00:00Z'))
  mockCurrentUser()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('HistoryScreen — initial render', () => {
  it('fetches the current month and renders the chips with returned streak values', async () => {
    const spy = vi.spyOn(historyApi, 'getHistory').mockResolvedValue(
      payload({
        writing_streak_current: 3,
        writing_streak_best: 12,
        publishing_streak_current: 2,
      }),
    )

    renderScreen()

    await waitFor(() => expect(spy).toHaveBeenCalledWith('2026-05', expect.any(AbortSignal)))

    expect(await screen.findByLabelText('Current')).toHaveTextContent('03')
    expect(screen.getByLabelText('Best')).toHaveTextContent('12')
    expect(screen.getByLabelText('Published')).toHaveTextContent('02')
    expect(screen.getByLabelText('Published')).toHaveTextContent('wks')
  })

  it('renders "cycles" for biweekly users', async () => {
    mockCurrentUser({ cadence: 'biweekly' })
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(
      payload({ publishing_streak_current: 1 }),
    )

    renderScreen()
    const chip = await screen.findByLabelText('Published')
    expect(chip).toHaveTextContent('cycles')
  })
})

describe('HistoryScreen — month navigation', () => {
  it('disables the next button when viewing the current month', async () => {
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(payload())
    renderScreen()
    expect(await screen.findByRole('button', { name: 'Next month' })).toBeDisabled()
  })

  it('enables next after navigating to a past month and refetches', async () => {
    const spy = vi.spyOn(historyApi, 'getHistory').mockResolvedValue(payload())
    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => expect(spy).toHaveBeenCalledWith('2026-05', expect.any(AbortSignal)))

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('2026-04', expect.any(AbortSignal)),
    )
    expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled()
  })
})

describe('HistoryScreen — notes', () => {
  it('shows the selected-day note and lists recent notes excluding the selected day, sorted by date desc', async () => {
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(
      payload({
        daily_logs: [
          { date: '2026-05-18', wrote: true, wrote_at: null, note: 'first note' },
          { date: '2026-05-19', wrote: true, wrote_at: null, note: 'second note' },
          { date: '2026-05-20', wrote: true, wrote_at: null, note: 'today note' },
          { date: '2026-05-21', wrote: true, wrote_at: null, note: 'tomorrow note' },
          { date: '2026-05-15', wrote: true, wrote_at: null, note: null },
        ],
      }),
    )

    renderScreen()

    const selected = await screen.findByLabelText('Selected day note')
    expect(selected).toHaveTextContent('today note')

    const list = screen.getByLabelText('Recent notes')
    const entries = Array.from(list.children) as HTMLElement[]
    const texts = entries.map((entry) =>
      (entry.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
    // Selected day (2026-05-20) is excluded; remaining sorted desc.
    expect(texts).toHaveLength(3)
    expect(texts[0]).toContain('tomorrow note')
    expect(texts[1]).toContain('second note')
    expect(texts[2]).toContain('first note')
  })

  it('shows the "— no note —" placeholder when the selected day has no note', async () => {
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(payload())
    renderScreen()
    const selected = await screen.findByLabelText('Selected day note')
    expect(selected).toHaveTextContent('— no note —')
  })

  it('updates the selected note when a calendar day is tapped', async () => {
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(
      payload({
        daily_logs: [
          { date: '2026-05-18', wrote: true, wrote_at: null, note: 'monday note' },
        ],
      }),
    )

    const user = userEvent.setup()
    renderScreen()

    // Wait for fetch to settle.
    await screen.findByLabelText('Current')
    const cell = await screen.findByRole('gridcell', { name: '2026-05-18' })
    await user.click(cell)

    await waitFor(() => {
      expect(screen.getByLabelText('Selected day note')).toHaveTextContent('monday note')
    })
  })
})

describe('HistoryScreen — calendar reflects week_starts_on', () => {
  it('renders Sunday-anchored headers for a Sunday-anchored user', async () => {
    mockCurrentUser({ weekStartsOn: 0 })
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(payload())
    renderScreen()
    await screen.findByLabelText('Current')
    const grid = screen.getByRole('grid')
    const headerRow = grid.previousSibling as HTMLElement
    const heads = Array.from(headerRow.children).map((n) => n.textContent)
    expect(heads).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })
})
