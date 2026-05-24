import { useCallback, useEffect, useState } from 'react'
import { useCurrentUser } from '../auth/AuthContext'
import { detectBrowserTimezone, weekStartFor } from '../lib/time'
import type { WeekStartsOn } from '../auth/types'

const REFRESH_INTERVAL_MS = 60_000
const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1

export function useThisWeekStart(): {
  weekStartDate: string
  weekStartsOn: WeekStartsOn
  timezone: string
} {
  const { user } = useCurrentUser()
  const timezone = user?.settings?.timezone || detectBrowserTimezone()
  const weekStartsOn: WeekStartsOn = user?.settings?.week_starts_on ?? DEFAULT_WEEK_STARTS_ON

  const compute = useCallback(
    () => weekStartFor(new Date(), weekStartsOn, timezone),
    [timezone, weekStartsOn],
  )
  const [weekStartDate, setWeekStartDate] = useState(compute)

  useEffect(() => {
    setWeekStartDate(compute())
    const refresh = () => setWeekStartDate(compute())

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [compute])

  return { weekStartDate, weekStartsOn, timezone }
}
