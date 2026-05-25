import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from '../auth/AuthContext'
import { useTodayDate } from '../hooks/useTodayDate'
import { useCurrentMonth } from '../hooks/useCurrentMonth'
import { useHistory } from '../hooks/useHistory'
import { monthOf, shiftMonth } from '../lib/month'
import { SB, SBfont } from '../lib/tokens'
import { TabBar } from '../components/TabBar'
import { StreakChip } from '../components/StreakChip'
import { CalendarMonth } from '../components/CalendarMonth'
import type { WeekStartsOn } from '../auth/types'

const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1
const MONTH_LABEL_LONG = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
const MONTH_LABEL_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function monthLong(month: string): { name: string; year: string } {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, 1))
  return { name: MONTH_LABEL_LONG.format(date), year: String(y) }
}

function monthShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  return MONTH_LABEL_SHORT.format(utc).toUpperCase()
}

function dayNumber(date: string): number {
  return Number(date.slice(8, 10))
}

function pickDefaultDay(month: string, currentMonth: string, currentDay: string): string {
  if (month === currentMonth) return currentDay
  return `${month}-01`
}

export function HistoryScreen() {
  const { user } = useCurrentUser()
  const cadence = user?.settings?.publishing_cadence ?? 'weekly'
  const weekStartsOn: WeekStartsOn = user?.settings?.week_starts_on ?? DEFAULT_WEEK_STARTS_ON

  const { date: currentDay } = useTodayDate()
  const currentMonth = useCurrentMonth()

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [selectedDay, setSelectedDay] = useState<string>(currentDay)

  const { data, status } = useHistory(selectedMonth)

  // When the selected month changes, fall back to a sensible default day.
  useEffect(() => {
    if (monthOf(selectedDay) === selectedMonth) return
    setSelectedDay(pickDefaultDay(selectedMonth, currentMonth, currentDay))
  }, [selectedMonth, selectedDay, currentMonth, currentDay])

  const dailyLogs = data?.daily_logs ?? []
  const weekLogs = data?.week_logs ?? []

  const selectedNote = useMemo(() => {
    const log = dailyLogs.find((l) => l.date === selectedDay)
    return log?.note ?? null
  }, [dailyLogs, selectedDay])

  const otherNotes = useMemo(() => {
    return dailyLogs
      .filter((l) => l.date !== selectedDay && (l.note ?? '').trim().length > 0)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [dailyLogs, selectedDay])

  const isCurrentMonth = selectedMonth === currentMonth
  const labels = monthLong(selectedMonth)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: SB.bg,
        color: SB.ink,
        fontFamily: SBfont.ui,
        paddingBottom: 96,
        position: 'relative',
      }}
    >
      <header style={{ padding: '64px 24px 0' }}>
        <div
          style={{
            fontFamily: SBfont.mono,
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: SB.inkMuted,
            fontWeight: 500,
          }}
        >
          The record.
        </div>
        <h1
          style={{
            fontFamily: SBfont.display,
            fontSize: 56,
            lineHeight: 1,
            letterSpacing: -0.5,
            color: SB.ink,
            marginTop: 6,
            marginBottom: 0,
            fontWeight: 400,
          }}
        >
          History<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
        </h1>
      </header>

      <section
        aria-label="Streaks"
        style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}
      >
        <StreakChip label="Current" value={data?.writing_streak_current ?? 0} unit="days" />
        <StreakChip label="Best" value={data?.writing_streak_best ?? 0} unit="days" />
        <StreakChip
          label="Published"
          value={data?.publishing_streak_current ?? 0}
          unit={cadence === 'biweekly' ? 'cycles' : 'wks'}
          tone="accent"
        />
      </section>

      <section aria-label="Calendar" style={{ padding: '16px 16px 0' }}>
        <div
          style={{
            background: SB.surface,
            borderRadius: 24,
            padding: '18px 18px 14px',
            boxShadow: `0 0 0 1px ${SB.hairline}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: SBfont.display,
                fontSize: 22,
                fontStyle: 'italic',
                letterSpacing: -0.2,
              }}
            >
              {labels.name}{' '}
              <span
                style={{
                  color: SB.inkMuted,
                  fontStyle: 'normal',
                  fontFamily: SBfont.mono,
                  fontSize: 14,
                }}
              >
                {labels.year}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <NavButton
                label="Previous month"
                glyph="‹"
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              />
              <NavButton
                label="Next month"
                glyph="›"
                disabled={isCurrentMonth}
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              />
            </div>
          </div>

          <CalendarMonth
            month={selectedMonth}
            dailyLogs={dailyLogs}
            weekLogs={weekLogs}
            weekStartsOn={weekStartsOn}
            selectedDay={selectedDay}
            currentDay={currentDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      </section>

      <section aria-label="Notes" style={{ padding: '16px 24px 0' }}>
        <div
          style={{
            fontFamily: SBfont.mono,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: SB.inkMuted,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          {monthShort(selectedDay)} {dayNumber(selectedDay)}
        </div>
        <div
          aria-label="Selected day note"
          style={{
            fontFamily: SBfont.display,
            fontStyle: 'italic',
            fontSize: 22,
            lineHeight: 1.3,
            color: selectedNote ? SB.ink : SB.inkFaint,
            letterSpacing: -0.1,
          }}
        >
          {selectedNote ?? '— no note —'}
        </div>

        {otherNotes.length > 0 ? (
          <div
            aria-label="Recent notes"
            style={{
              borderTop: `1px solid ${SB.hairline}`,
              marginTop: 18,
              paddingTop: 14,
            }}
          >
            {otherNotes.map((log) => (
              <div
                key={log.date}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '10px 0',
                  borderBottom: `1px solid ${SB.hairline}`,
                }}
              >
                <div
                  style={{
                    fontFamily: SBfont.mono,
                    fontSize: 11,
                    color: SB.inkMuted,
                    width: 56,
                    flexShrink: 0,
                    paddingTop: 3,
                  }}
                >
                  {monthShort(log.date)} {String(dayNumber(log.date)).padStart(2, '0')}
                </div>
                <div
                  style={{
                    fontFamily: SBfont.display,
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: SB.ink,
                    lineHeight: 1.35,
                  }}
                >
                  {log.note}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {status === 'error' ? (
        <div
          role="alert"
          style={{
            padding: '12px 24px 0',
            fontFamily: SBfont.ui,
            fontSize: 12,
            color: SB.amber,
          }}
        >
          Couldn't load history. Try again later.
        </div>
      ) : null}

      <TabBar />
    </main>
  )
}

interface NavButtonProps {
  label: string
  glyph: string
  onClick: () => void
  disabled?: boolean
}

function NavButton({ label, glyph, onClick, disabled = false }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent',
        boxShadow: `inset 0 0 0 1px ${SB.hairline2}`,
        fontFamily: SBfont.ui,
        fontSize: 16,
        color: SB.inkMuted,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {glyph}
    </button>
  )
}
