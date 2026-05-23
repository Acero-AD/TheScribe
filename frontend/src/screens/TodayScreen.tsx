import { useTodayDate } from '../hooks/useTodayDate'
import { formatDateHeader } from '../lib/dateHeader'
import { SB, SBfont } from '../lib/tokens'
import { TabBar } from '../components/TabBar'

export function TodayScreen() {
  const { date, timezone } = useTodayDate()
  const dateLabel = formatDateHeader(date, timezone)

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
        {/* WritingCheckInCard and NoteCard land in subsequent commits. */}
      </section>

      <TabBar />
    </main>
  )
}
