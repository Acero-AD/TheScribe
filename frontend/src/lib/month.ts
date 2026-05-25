// Helpers for `YYYY-MM` month strings and the dates they imply.
// All date math is performed in UTC so it is independent of the machine timezone.

export interface MonthBounds {
  start: string
  end: string
}

function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return null
  const year = Number(match[1])
  const monthNum = Number(match[2])
  if (monthNum < 1 || monthNum > 12) return null
  return { year, month: monthNum }
}

function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, '0')
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = date.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function monthBounds(month: string): MonthBounds | null {
  const parsed = parseMonth(month)
  if (!parsed) return null
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1))
  const end = new Date(Date.UTC(parsed.year, parsed.month, 0))
  return { start: formatDate(start), end: formatDate(end) }
}

export function isFutureMonth(month: string, currentMonth: string): boolean {
  return month > currentMonth
}

// Returns the `YYYY-MM` slice of a `YYYY-MM-DD` date string.
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

// Adds `delta` months to a `YYYY-MM` string. delta may be negative.
export function shiftMonth(month: string, delta: number): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + delta
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  return `${newYear.toString().padStart(4, '0')}-${newMonth.toString().padStart(2, '0')}`
}
