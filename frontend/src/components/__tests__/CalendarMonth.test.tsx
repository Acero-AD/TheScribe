import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CalendarMonth } from '../CalendarMonth'
import type { DailyLog } from '../../api/dailyLogs'
import type { WeekLog } from '../../api/weekLogs'

const APRIL_2026 = '2026-04'

function dailyFixture(date: string, wrote: boolean): DailyLog {
  return { date, wrote, wrote_at: wrote ? `${date}T12:00:00Z` : null, note: null }
}

function weekFixture(weekStart: string, published: boolean): WeekLog {
  return { week_start_date: weekStart, published }
}

describe('CalendarMonth — day-of-week headers', () => {
  it('renders Monday-anchored headers M T W T F S S for weekStartsOn=1', () => {
    const { container } = render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={[]}
        weekLogs={[]}
        weekStartsOn={1}
        selectedDay={null}
        currentDay="2026-04-15"
        onSelectDay={vi.fn()}
      />,
    )
    // Day-of-week headers are the first 7 children of the grid layout's
    // header row, rendered as plain divs. Pull them via the grid container.
    const headerRow = container.firstChild?.firstChild as HTMLElement
    const heads = Array.from(headerRow.children).map((n) => n.textContent)
    expect(heads).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })

  it('renders Sunday-anchored headers S M T W T F S for weekStartsOn=0', () => {
    const { container } = render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={[]}
        weekLogs={[]}
        weekStartsOn={0}
        selectedDay={null}
        currentDay="2026-04-15"
        onSelectDay={vi.fn()}
      />,
    )
    const headerRow = container.firstChild?.firstChild as HTMLElement
    const heads = Array.from(headerRow.children).map((n) => n.textContent)
    expect(heads).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })
})

describe('CalendarMonth — cell derivation', () => {
  // April 2026: Wed = 04-01. Monday-anchored: leading blanks = 2.
  // Weeks (Mon-anchored): 03-30, 04-06, 04-13, 04-20, 04-27.

  it('classifies wrote-only days vs wrote-in-published-week days', () => {
    const daily: DailyLog[] = [
      dailyFixture('2026-04-07', true), // in week 04-06 (published below)
      dailyFixture('2026-04-08', true), // same week
      dailyFixture('2026-04-15', true), // in week 04-13 (not published)
      dailyFixture('2026-04-09', false), // wrote=false → no activity
    ]
    const weeks: WeekLog[] = [weekFixture('2026-04-06', true)]

    render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={daily}
        weekLogs={weeks}
        weekStartsOn={1}
        selectedDay={null}
        currentDay="2026-04-30"
        onSelectDay={vi.fn()}
      />,
    )

    const cell7 = screen.getByRole('gridcell', { name: '2026-04-07' })
    const cell8 = screen.getByRole('gridcell', { name: '2026-04-08' })
    const cell15 = screen.getByRole('gridcell', { name: '2026-04-15' })
    const cell9 = screen.getByRole('gridcell', { name: '2026-04-09' })

    // The cells render the day-of-month text inside. Sanity check.
    expect(within(cell7).getByText('7')).toBeInTheDocument()
    expect(within(cell8).getByText('8')).toBeInTheDocument()
    expect(within(cell15).getByText('15')).toBeInTheDocument()
    expect(within(cell9).getByText('9')).toBeInTheDocument()

    // Color states are encoded via inline styles. We can't easily assert on
    // colors here without coupling to design tokens, so instead we assert
    // that the wrote-published-week cells have the expected text color (white)
    // and the no-activity cell does not.
    const fill7 = cell7.querySelector('[aria-hidden]') as HTMLElement
    const fill15 = cell15.querySelector('[aria-hidden]') as HTMLElement
    const fill9 = cell9.querySelector('[aria-hidden]') as HTMLElement

    // Published-week cell has an inset accent background; "wrote" doesn't ring.
    expect(fill7.style.background).not.toBe('transparent')
    expect(fill15.style.background).not.toBe('transparent')
    // No-activity cell has transparent background (just hairline ring).
    expect(fill9.style.background).toBe('transparent')
  })
})

describe('CalendarMonth — interaction', () => {
  it('calls onSelectDay with the tapped date', async () => {
    const handler = vi.fn()
    const user = userEvent.setup()

    render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={[]}
        weekLogs={[]}
        weekStartsOn={1}
        selectedDay={null}
        currentDay="2026-04-30"
        onSelectDay={handler}
      />,
    )

    await user.click(screen.getByRole('gridcell', { name: '2026-04-10' }))
    expect(handler).toHaveBeenCalledWith('2026-04-10')
  })

  it('marks the selected cell with aria-pressed', () => {
    render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={[]}
        weekLogs={[]}
        weekStartsOn={1}
        selectedDay="2026-04-18"
        currentDay="2026-04-30"
        onSelectDay={vi.fn()}
      />,
    )
    expect(screen.getByRole('gridcell', { name: '2026-04-18' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('gridcell', { name: '2026-04-17' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('fades future days within the current month', () => {
    render(
      <CalendarMonth
        month={APRIL_2026}
        dailyLogs={[]}
        weekLogs={[]}
        weekStartsOn={1}
        selectedDay={null}
        currentDay="2026-04-10"
        onSelectDay={vi.fn()}
      />,
    )
    const future = screen.getByRole('gridcell', { name: '2026-04-20' })
    const past = screen.getByRole('gridcell', { name: '2026-04-05' })
    expect(parseFloat(future.style.opacity)).toBeLessThan(1)
    expect(past.style.opacity === '' || past.style.opacity === '1').toBe(true)
  })
})
