import { api } from './client'

export interface WeekLog {
  week_start_date: string
  published: boolean
  publishing_streak?: number
}

export interface WeekLogPatch {
  published?: boolean
}

export function getWeekLog(weekStartDate: string, signal?: AbortSignal): Promise<WeekLog> {
  return api<WeekLog>(`/week_logs/${weekStartDate}`, { signal })
}

export function putWeekLog(weekStartDate: string, patch: WeekLogPatch): Promise<WeekLog> {
  return api<WeekLog>(`/week_logs/${weekStartDate}`, { method: 'PUT', body: { ...patch } })
}

export interface WeekLogRange {
  from?: string
  to?: string
}

export function listWeekLogs({ from, to }: WeekLogRange = {}, signal?: AbortSignal): Promise<WeekLog[]> {
  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  const suffix = query.toString()
  return api<WeekLog[]>(`/week_logs${suffix ? `?${suffix}` : ''}`, { signal })
}
