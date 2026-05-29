import { useEffect, useState } from 'react'
import { getHistory, type History } from '../api/history'

export type HistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseHistoryResult {
  data: History | null
  status: HistoryStatus
}

// Fetches /history?month=<month>; re-runs whenever `month` changes. Cancels
// in-flight requests on unmount or month change.
export function useHistory(month: string): UseHistoryResult {
  const [data, setData] = useState<History | null>(null)
  const [status, setStatus] = useState<HistoryStatus>(month ? 'loading' : 'idle')

  // Reflect month changes at render time — loading when a month is selected,
  // idle when cleared — instead of synchronising status inside the effect.
  // The effect below only performs the async fetch and resolves to
  // ready/error in its callbacks.
  const [prevMonth, setPrevMonth] = useState(month)
  if (prevMonth !== month) {
    setPrevMonth(month)
    setStatus(month ? 'loading' : 'idle')
  }

  useEffect(() => {
    if (!month) return

    let cancelled = false
    const controller = new AbortController()

    getHistory(month, controller.signal)
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('error')
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [month])

  return { data, status }
}
