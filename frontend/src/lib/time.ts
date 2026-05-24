export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const detectTimezone = detectBrowserTimezone

export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(now)
}

// Walks `now` (in `timezone`) back to the most recent day-of-week matching
// `weekStartsOn` (0 = Sunday, 1 = Monday). Returns a YYYY-MM-DD string.
export function weekStartFor(
  now: Date,
  weekStartsOn: 0 | 1,
  timezone: string,
): string {
  const localToday = todayInTimezone(timezone, now)
  // Treat the YYYY-MM-DD string as a UTC date so day-of-week math is stable
  // regardless of the machine's local timezone.
  const [year, month, day] = localToday.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  const dow = utc.getUTCDay() // 0 = Sunday … 6 = Saturday
  const offset = (dow - weekStartsOn + 7) % 7
  utc.setUTCDate(utc.getUTCDate() - offset)
  const yyyy = utc.getUTCFullYear().toString().padStart(4, '0')
  const mm = (utc.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = utc.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function formatTimeOfDay(date: Date | string | null | undefined, timezone: string): string {
  if (date == null) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
  return fmt.format(d).replace(/^0/, '')
}
