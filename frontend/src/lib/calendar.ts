import type { WeekStartsOn } from '../auth/types'

// All date math is performed in UTC so it is independent of the machine timezone.

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, '0')
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = date.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Walks `date` back to the most recent day-of-week matching `weekStartsOn`.
export function weekStartForDate(date: string, weekStartsOn: WeekStartsOn): string {
  const utc = parseDate(date)
  const dow = utc.getUTCDay()
  const offset = (dow - weekStartsOn + 7) % 7
  utc.setUTCDate(utc.getUTCDate() - offset)
  return formatDate(utc)
}

// Ordered single-letter day-of-week headers anchored at `weekStartsOn`.
// Monday-anchored: M T W T F S S; Sunday-anchored: S M T W T F S.
export function dayOfWeekHeaders(weekStartsOn: WeekStartsOn): string[] {
  const sundayFirst = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  if (weekStartsOn === 0) return sundayFirst
  return [...sundayFirst.slice(1), sundayFirst[0]]
}

export interface MonthGrid {
  // Each entry is a YYYY-MM-DD inside the month, or null for a leading/trailing blank.
  cells: (string | null)[]
}

// Builds the visible-grid layout: leading blanks, then each day of the month,
// then trailing blanks to fill the final week row.
export function buildMonthGrid(month: string, weekStartsOn: WeekStartsOn): MonthGrid {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthNum = Number(monthStr)
  const firstDay = new Date(Date.UTC(year, monthNum - 1, 1))
  const lastDay = new Date(Date.UTC(year, monthNum, 0))

  const firstDow = firstDay.getUTCDay()
  const leading = (firstDow - weekStartsOn + 7) % 7

  const cells: (string | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)

  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    const date = new Date(Date.UTC(year, monthNum - 1, d))
    cells.push(formatDate(date))
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return { cells }
}

export type CellState = 'no-activity' | 'wrote' | 'wrote-published-week'

interface DerivationInput {
  date: string
  dailyByDate: Map<string, { wrote: boolean }>
  weekPublishedByStart: Map<string, boolean>
  weekStartsOn: WeekStartsOn
}

export function cellStateFor({
  date,
  dailyByDate,
  weekPublishedByStart,
  weekStartsOn,
}: DerivationInput): CellState {
  const daily = dailyByDate.get(date)
  if (!daily?.wrote) return 'no-activity'

  const weekStart = weekStartForDate(date, weekStartsOn)
  return weekPublishedByStart.get(weekStart) ? 'wrote-published-week' : 'wrote'
}
