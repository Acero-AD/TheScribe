import { useMemo } from 'react'
import { SB, SBfont } from '../lib/tokens'
import type { WeekStartsOn } from '../auth/types'
import type { DailyLog } from '../api/dailyLogs'
import type { WeekLog } from '../api/weekLogs'
import {
  buildMonthGrid,
  cellStateFor,
  dayOfWeekHeaders,
  type CellState,
} from '../lib/calendar'

interface CalendarMonthProps {
  month: string
  dailyLogs: DailyLog[]
  weekLogs: WeekLog[]
  weekStartsOn: WeekStartsOn
  selectedDay: string | null
  currentDay: string
  onSelectDay: (date: string) => void
}

export function CalendarMonth({
  month,
  dailyLogs,
  weekLogs,
  weekStartsOn,
  selectedDay,
  currentDay,
  onSelectDay,
}: CalendarMonthProps) {
  const grid = useMemo(() => buildMonthGrid(month, weekStartsOn), [month, weekStartsOn])
  const headers = useMemo(() => dayOfWeekHeaders(weekStartsOn), [weekStartsOn])

  const dailyByDate = useMemo(() => {
    const map = new Map<string, { wrote: boolean }>()
    for (const log of dailyLogs) {
      map.set(log.date, { wrote: log.wrote })
    }
    return map
  }, [dailyLogs])

  const weekPublishedByStart = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const log of weekLogs) {
      if (log.published) map.set(log.week_start_date, true)
    }
    return map
  }, [weekLogs])

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 6,
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontFamily: SBfont.mono,
              fontSize: 10,
              color: SB.inkMuted,
              fontWeight: 500,
              letterSpacing: 0.6,
            }}
          >
            {h}
          </div>
        ))}
      </div>

      <div
        role="grid"
        aria-label={`Calendar for ${month}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {grid.cells.map((date, idx) => {
          if (!date) {
            return <div key={idx} aria-hidden style={{ aspectRatio: '1 / 1' }} />
          }

          const state = cellStateFor({
            date,
            dailyByDate,
            weekPublishedByStart,
            weekStartsOn,
          })
          const isSelected = date === selectedDay
          const isFuture = date > currentDay
          const dayNumber = Number(date.slice(8, 10))

          return (
            <button
              key={idx}
              type="button"
              role="gridcell"
              aria-label={date}
              aria-pressed={isSelected}
              onClick={() => onSelectDay(date)}
              style={{
                aspectRatio: '1 / 1',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                background: 'transparent',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                boxShadow: isSelected ? `inset 0 0 0 1.5px ${SB.ink}` : 'none',
                opacity: isFuture && state === 'no-activity' ? 0.35 : 1,
              }}
            >
              <CellFill state={state} />
              <span
                style={{
                  position: 'relative',
                  fontFamily: SBfont.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  color: cellTextColor(state, isFuture),
                  letterSpacing: -0.2,
                }}
              >
                {dayNumber}
              </span>
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${SB.hairline}`,
        }}
      >
        <LegendEntry state="no-activity" label="No activity" />
        <LegendEntry state="wrote" label="Wrote" />
        <LegendEntry state="wrote-published-week" label="Published wk" />
      </div>
    </div>
  )
}

function CellFill({ state }: { state: CellState }) {
  let background = 'transparent'
  let boxShadow: string | undefined
  if (state === 'wrote-published-week') {
    background = SB.accent
    boxShadow = `inset 0 0 0 2px ${SB.accent}, 0 0 0 2px ${SB.surface}, 0 0 0 3.5px ${SB.accent}`
  } else if (state === 'wrote') {
    background = SB.accentSoft
  } else {
    boxShadow = `inset 0 0 0 1px ${SB.hairline}`
  }
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 4,
        borderRadius: 9,
        background,
        boxShadow,
      }}
    />
  )
}

function cellTextColor(state: CellState, isFuture: boolean): string {
  if (state === 'wrote-published-week') return '#fff'
  if (state === 'wrote') return SB.accentInk
  if (isFuture) return SB.inkFaint
  return SB.ink
}

function LegendEntry({ state, label }: { state: CellState; label: string }) {
  const swatchBg =
    state === 'wrote-published-week'
      ? SB.accent
      : state === 'wrote'
        ? SB.accentSoft
        : 'transparent'
  const swatchShadow =
    state === 'wrote-published-week'
      ? `0 0 0 1.5px ${SB.surface}, 0 0 0 3px ${SB.accent}`
      : state === 'no-activity'
        ? `inset 0 0 0 1px ${SB.hairline2}`
        : undefined
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        aria-hidden
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: swatchBg,
          boxShadow: swatchShadow,
        }}
      />
      <span
        style={{
          fontFamily: SBfont.mono,
          fontSize: 9.5,
          color: SB.inkMuted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}
