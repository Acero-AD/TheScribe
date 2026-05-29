import { useCallback, useEffect, useState } from 'react'
import { useCurrentUser } from '../auth/AuthContext'
import { detectBrowserTimezone, todayInTimezone } from '../lib/time'

const REFRESH_INTERVAL_MS = 60_000

export function useTodayDate(): { date: string; timezone: string } {
  const { user } = useCurrentUser()
  const timezone = user?.settings?.timezone || detectBrowserTimezone()

  const compute = useCallback(() => todayInTimezone(timezone), [timezone])
  const [date, setDate] = useState(compute)

  // Recompute immediately when the timezone changes. This is the React-
  // recommended render-time adjustment instead of synchronising state inside
  // an effect (which triggers cascading renders).
  const [trackedTimezone, setTrackedTimezone] = useState(timezone)
  if (trackedTimezone !== timezone) {
    setTrackedTimezone(timezone)
    setDate(compute())
  }

  useEffect(() => {
    const refresh = () => setDate(compute())

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [compute])

  return { date, timezone }
}
