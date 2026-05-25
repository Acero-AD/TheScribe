import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistory } from '../useHistory'
import * as historyApi from '../../api/history'
import type { History } from '../../api/history'

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

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useHistory', () => {
  it('transitions from loading → ready and exposes the payload', async () => {
    vi.spyOn(historyApi, 'getHistory').mockResolvedValue(
      payload({ writing_streak_current: 4 }),
    )

    const { result } = renderHook(() => useHistory('2026-05'))
    expect(result.current.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.data?.writing_streak_current).toBe(4)
  })

  it('transitions to error on rejection', async () => {
    vi.spyOn(historyApi, 'getHistory').mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useHistory('2026-05'))
    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
  })

  it('refetches when month changes', async () => {
    const spy = vi.spyOn(historyApi, 'getHistory').mockResolvedValue(payload())

    const { rerender } = renderHook(({ month }: { month: string }) => useHistory(month), {
      initialProps: { month: '2026-05' },
    })

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    expect(spy).toHaveBeenLastCalledWith('2026-05', expect.any(AbortSignal))

    rerender({ month: '2026-04' })
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2))
    expect(spy).toHaveBeenLastCalledWith('2026-04', expect.any(AbortSignal))
  })
})
