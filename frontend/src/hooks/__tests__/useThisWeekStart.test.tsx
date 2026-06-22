import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThisWeekStart } from '../useThisWeekStart'
import * as AuthContext from '../../auth/AuthContext'
import type { WeekStartsOn } from '../../auth/types'

function mockUser({
  timezone,
  weekStartsOn,
}: {
  timezone: string | null
  weekStartsOn: WeekStartsOn
}) {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: {
      id: 1,
      email: 'me@example.com',
      settings: {
        week_starts_on: weekStartsOn,
        publishing_cadence: 'weekly',
        timezone,
      },
    },
    status: 'signed-in',
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
  })
}

beforeEach(() => {
  // 2026-05-20 is a Wednesday in UTC.
  vi.useFakeTimers({ now: new Date('2026-05-20T12:00:00Z') })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useThisWeekStart', () => {
  it('returns the prior Monday for a Monday-anchored user mid-week', () => {
    mockUser({ timezone: 'UTC', weekStartsOn: 1 })
    const { result } = renderHook(() => useThisWeekStart())
    expect(result.current.weekStartDate).toBe('2026-05-18')
    expect(result.current.weekStartsOn).toBe(1)
    expect(result.current.timezone).toBe('UTC')
  })

  it('returns the prior Sunday for a Sunday-anchored user mid-week', () => {
    mockUser({ timezone: 'UTC', weekStartsOn: 0 })
    const { result } = renderHook(() => useThisWeekStart())
    expect(result.current.weekStartDate).toBe('2026-05-17')
    expect(result.current.weekStartsOn).toBe(0)
  })

  it('updates when the window regains focus across a week boundary', () => {
    mockUser({ timezone: 'UTC', weekStartsOn: 1 })
    // Start on Sunday 2026-05-17 (still last week for a Monday-anchored user).
    vi.setSystemTime(new Date('2026-05-17T23:30:00Z'))
    const { result } = renderHook(() => useThisWeekStart())
    expect(result.current.weekStartDate).toBe('2026-05-11')

    act(() => {
      // Cross midnight into Monday 2026-05-18 UTC.
      vi.setSystemTime(new Date('2026-05-18T00:05:00Z'))
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current.weekStartDate).toBe('2026-05-18')
  })

  it('updates on the 60-second interval', () => {
    mockUser({ timezone: 'UTC', weekStartsOn: 1 })
    vi.setSystemTime(new Date('2026-05-17T23:30:00Z'))
    const { result } = renderHook(() => useThisWeekStart())
    expect(result.current.weekStartDate).toBe('2026-05-11')

    act(() => {
      vi.setSystemTime(new Date('2026-05-18T00:00:30Z'))
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.weekStartDate).toBe('2026-05-18')
  })
})
