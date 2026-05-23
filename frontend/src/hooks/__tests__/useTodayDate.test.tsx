import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTodayDate } from '../useTodayDate'
import * as AuthContext from '../../auth/AuthContext'

function mockUserWithTimezone(timezone: string | undefined) {
  vi.spyOn(AuthContext, 'useCurrentUser').mockReturnValue({
    user: {
      id: 1,
      email: 'me@example.com',
      settings: {
        reminder_time: null,
        week_starts_on: 1,
        publishing_cadence: 'weekly',
        timezone: timezone ?? null,
      },
    },
    status: 'signed-in',
    refresh: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
  })
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-05-23T23:30:00Z') })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useTodayDate', () => {
  it('returns today in the user\'s timezone', () => {
    mockUserWithTimezone('UTC')
    const { result } = renderHook(() => useTodayDate())
    expect(result.current).toEqual({ date: '2026-05-23', timezone: 'UTC' })
  })

  it('updates when the 60-second interval fires across a date boundary', () => {
    mockUserWithTimezone('UTC')
    const { result } = renderHook(() => useTodayDate())
    expect(result.current.date).toBe('2026-05-23')

    // 23:30Z + 31 minutes lands in the next day.
    act(() => {
      vi.setSystemTime(new Date('2026-05-24T00:01:00Z'))
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.date).toBe('2026-05-24')
  })

  it('updates when the window regains focus', () => {
    mockUserWithTimezone('UTC')
    const { result } = renderHook(() => useTodayDate())
    expect(result.current.date).toBe('2026-05-23')

    act(() => {
      vi.setSystemTime(new Date('2026-05-24T00:05:00Z'))
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current.date).toBe('2026-05-24')
  })
})
