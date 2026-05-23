import { detectBrowserTimezone } from './time'

// Formats a YYYY-MM-DD date string (interpreted in the user's timezone) as
// "MON · APR 28 · 2026" — the design's date header.
export function formatDateHeader(date: string, timezone: string = detectBrowserTimezone()): string {
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return ''

  // Build a Date at noon UTC for the parsed Y-M-D, then format in the user's
  // timezone. Noon UTC avoids any same-day rollover when the timezone is
  // applied (since the date string was already computed in that tz).
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })

  const parts = Object.fromEntries(
    fmt.formatToParts(utcNoon).map((part) => [part.type, part.value]),
  )

  const weekday = (parts.weekday || '').toUpperCase()
  const monthName = (parts.month || '').toUpperCase()
  const dayOut = parts.day || ''
  const yearOut = parts.year || ''
  return `${weekday} · ${monthName} ${dayOut} · ${yearOut}`
}
