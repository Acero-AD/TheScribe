import { api } from './client'
import type { DailyLog } from './dailyLogs'
import type { WeekLog } from './weekLogs'

export interface History {
  month: string
  daily_logs: DailyLog[]
  week_logs: WeekLog[]
  writing_streak_current: number
  writing_streak_best: number
  publishing_streak_current: number
}

export function getHistory(month: string, signal?: AbortSignal): Promise<History> {
  return api<History>(`/history?month=${encodeURIComponent(month)}`, { signal })
}
