import { api } from './client'

export interface DailyLog {
  date: string
  wrote: boolean
  wrote_at: string | null
  note: string | null
}

export interface DailyLogPatch {
  wrote?: boolean
  note?: string
}

export function getDailyLog(date: string, signal?: AbortSignal): Promise<DailyLog> {
  return api<DailyLog>(`/daily_logs/${date}`, { signal })
}

export function putDailyLog(date: string, patch: DailyLogPatch): Promise<DailyLog> {
  return api<DailyLog>(`/daily_logs/${date}`, { method: 'PUT', body: { ...patch } })
}

export interface DailyLogRange {
  from?: string
  to?: string
}

export function listDailyLogs({ from, to }: DailyLogRange = {}, signal?: AbortSignal): Promise<DailyLog[]> {
  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  const suffix = query.toString()
  return api<DailyLog[]>(`/daily_logs${suffix ? `?${suffix}` : ''}`, { signal })
}
