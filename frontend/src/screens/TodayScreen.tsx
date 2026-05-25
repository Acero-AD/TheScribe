import { useCallback, useEffect, useRef, useState } from 'react'
import { useTodayDate } from '../hooks/useTodayDate'
import { useThisWeekStart } from '../hooks/useThisWeekStart'
import { formatDateHeader } from '../lib/dateHeader'
import { SB, SBfont } from '../lib/tokens'
import { TabBar } from '../components/TabBar'
import { WritingCheckInCard } from '../components/WritingCheckInCard'
import { WeeklyPublishCard } from '../components/WeeklyPublishCard'
import { NoteCard } from '../components/NoteCard'
import { getDailyLog, putDailyLog, type DailyLog } from '../api/dailyLogs'
import { getWeekLog, putWeekLog, type WeekLog } from '../api/weekLogs'

interface LocalState {
  wrote: boolean
  wroteAt: string | null
  note: string | null
  writingStreak: number | null
}

function toLocal(log: DailyLog): LocalState {
  return {
    wrote: log.wrote,
    wroteAt: log.wrote_at,
    note: log.note,
    writingStreak: log.writing_streak ?? null,
  }
}

const EMPTY: LocalState = { wrote: false, wroteAt: null, note: null, writingStreak: null }

export function TodayScreen() {
  const { date, timezone } = useTodayDate()
  const { weekStartDate } = useThisWeekStart()
  const dateLabel = formatDateHeader(date, timezone)

  const [state, setState] = useState<LocalState>(EMPTY)
  const [toggleError, setToggleError] = useState(false)
  const [noteError, setNoteError] = useState(false)

  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState(false)

  const inFlightRef = useRef(false)
  const queuedToggleRef = useRef<boolean | null>(null)
  const publishInFlightRef = useRef(false)
  const queuedPublishRef = useRef<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    setToggleError(false)
    setNoteError(false)
    const controller = new AbortController()

    getDailyLog(date, controller.signal)
      .then((log) => {
        if (!cancelled) setState(toLocal(log))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState(EMPTY)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [date])

  const runToggle = useCallback(
    async (next: boolean) => {
      inFlightRef.current = true
      const previous = state
      setState((current) => ({ ...current, wrote: next }))
      setToggleError(false)
      try {
        const updated = await putDailyLog(date, { wrote: next })
        setState((current) => ({
          ...current,
          wrote: updated.wrote,
          wroteAt: updated.wrote_at,
          writingStreak: updated.writing_streak ?? current.writingStreak,
        }))
      } catch {
        setState(previous)
        setToggleError(true)
      } finally {
        inFlightRef.current = false
        const queued = queuedToggleRef.current
        if (queued !== null) {
          queuedToggleRef.current = null
          void runToggle(queued)
        }
      }
    },
    [date, state],
  )

  const handleToggle = useCallback(
    (next: boolean) => {
      if (inFlightRef.current) {
        queuedToggleRef.current = next
        setState((current) => ({ ...current, wrote: next }))
        return
      }
      void runToggle(next)
    },
    [runToggle],
  )

  const handleNoteSave = useCallback(
    async (value: string) => {
      setNoteError(false)
      try {
        const updated = await putDailyLog(date, { note: value })
        setState((current) => ({ ...current, note: updated.note }))
      } catch {
        setNoteError(true)
      }
    },
    [date],
  )

  const handleNoteRetry = useCallback(() => {
    setNoteError(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    setPublishError(false)
    const controller = new AbortController()

    getWeekLog(weekStartDate, controller.signal)
      .then((log: WeekLog) => {
        if (!cancelled) setPublished(log.published)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPublished(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [weekStartDate])

  const runPublish = useCallback(
    async (next: boolean) => {
      publishInFlightRef.current = true
      const previous = published
      setPublished(next)
      setPublishError(false)
      try {
        const updated = await putWeekLog(weekStartDate, { published: next })
        setPublished(updated.published)
      } catch {
        setPublished(previous)
        setPublishError(true)
      } finally {
        publishInFlightRef.current = false
        const queued = queuedPublishRef.current
        if (queued !== null) {
          queuedPublishRef.current = null
          void runPublish(queued)
        }
      }
    },
    [weekStartDate, published],
  )

  const handlePublishToggle = useCallback(
    (next: boolean) => {
      if (publishInFlightRef.current) {
        queuedPublishRef.current = next
        setPublished(next)
        return
      }
      void runPublish(next)
    },
    [runPublish],
  )

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
          aria-label="Today's date"
          style={{
            fontFamily: SBfont.mono,
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: SB.inkMuted,
            fontWeight: 500,
          }}
        >
          {dateLabel}
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
          Today<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
        </h1>
        <p
          style={{
            fontFamily: SBfont.ui,
            fontSize: 14,
            color: SB.inkMuted,
            marginTop: 8,
            lineHeight: 1.45,
            maxWidth: 280,
          }}
        >
          Two questions. Both within your control.
        </p>
      </header>

      <section
        aria-label="Daily check-in cards"
        style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <WritingCheckInCard
          wrote={state.wrote}
          wroteAt={state.wroteAt}
          timezone={timezone}
          onToggle={handleToggle}
          error={toggleError}
          writingStreak={state.writingStreak}
        />
        <WeeklyPublishCard
          published={published}
          onToggle={handlePublishToggle}
          error={publishError}
        />
        <NoteCard
          note={state.note}
          onSave={handleNoteSave}
          error={noteError}
          onRetry={handleNoteRetry}
        />
      </section>

      <TabBar />
    </main>
  )
}
