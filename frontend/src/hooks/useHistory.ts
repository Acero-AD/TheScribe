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
  const [status, setStatus] = useState<HistoryStatus>('idle')

  useEffect(() => {
    if (!month) {
      setStatus('idle')
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setStatus('loading')

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
