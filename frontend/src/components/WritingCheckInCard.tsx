import { SB, SBfont } from '../lib/tokens'
import { formatTimeOfDay } from '../lib/time'

interface WritingCheckInCardProps {
  wrote: boolean
  wroteAt: string | null
  timezone: string
  onToggle: (next: boolean) => void
  error?: boolean
  disabled?: boolean
}

const STREAK_PLACEHOLDER = '—'

export function WritingCheckInCard({
  wrote,
  wroteAt,
  timezone,
  onToggle,
  error = false,
  disabled = false,
}: WritingCheckInCardProps) {
  const loggedLabel = wrote
    ? `Logged · ${formatTimeOfDay(wroteAt, timezone) || '—'}`
    : 'Tap to log'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={() => onToggle(!wrote)}
        disabled={disabled}
        aria-pressed={wrote}
        aria-label={wrote ? 'Mark as not written today' : 'Mark as written today'}
        style={{
          textAlign: 'left',
          width: '100%',
          appearance: 'none',
          border: 0,
          cursor: disabled ? 'progress' : 'pointer',
          background: wrote ? SB.accent : SB.surface,
          color: wrote ? '#fff' : SB.ink,
          borderRadius: 26,
          padding: '20px 22px',
          boxShadow: wrote
            ? `0 18px 40px -20px ${SB.accentDeep}cc, inset 0 0 0 1px ${SB.accentDeep}`
            : `0 1px 0 ${SB.hairline} inset, 0 12px 30px -16px rgba(0,0,0,.16), 0 0 0 1px ${SB.hairline}`,
          transition: 'background .25s cubic-bezier(.2,.7,.3,1), color .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s cubic-bezier(.2,.7,.3,1)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: SBfont.ui,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Tag tone={wrote ? 'green' : 'ink'}>Daily</Tag>
          <span
            style={{
              fontFamily: SBfont.mono,
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: wrote ? 'rgba(255,255,255,.7)' : SB.inkFaint,
            }}
          >
            {loggedLabel}
          </span>
        </div>

        <div
          style={{
            fontFamily: SBfont.display,
            fontSize: 34,
            lineHeight: 1.05,
            marginTop: 18,
            fontStyle: 'italic',
            letterSpacing: -0.3,
          }}
        >
          Did&nbsp;you&nbsp;write today?
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 22,
          }}
        >
          <div>
            <div
              aria-label="Day streak"
              style={{
                fontFamily: SBfont.mono,
                fontSize: 56,
                lineHeight: 0.9,
                fontWeight: 500,
                letterSpacing: -2,
                color: wrote ? '#fff' : SB.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {STREAK_PLACEHOLDER}
            </div>
            <div
              style={{
                fontFamily: SBfont.mono,
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: wrote ? 'rgba(255,255,255,.75)' : SB.inkMuted,
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              Day streak
            </div>
          </div>
          <CheckCircle checked={wrote} size={56} />
        </div>
      </button>

      {error ? (
        <div
          role="alert"
          style={{
            fontFamily: SBfont.ui,
            fontSize: 12,
            lineHeight: 1.4,
            color: SB.amber,
            padding: '4px 22px 0',
          }}
        >
          Couldn't save. Tap again to retry.
        </div>
      ) : null}
    </div>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'ink' | 'green' }) {
  const palette =
    tone === 'green'
      ? { bg: SB.accentSoft, fg: SB.accentInk, bd: 'transparent' }
      : { bg: 'transparent', fg: SB.inkMuted, bd: SB.hairline2 }
  return (
    <span
      style={{
        fontFamily: SBfont.mono,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        boxShadow: palette.bd !== 'transparent' ? `inset 0 0 0 1px ${palette.bd}` : 'none',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}

function CheckCircle({ checked, size }: { checked: boolean; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: checked ? SB.accent : SB.surface,
        boxShadow: checked
          ? `inset 0 0 0 1.5px ${SB.accentDeep}, 0 6px 16px -6px ${SB.accentDeep}55`
          : `inset 0 0 0 1.5px ${SB.hairline2}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .18s cubic-bezier(.2,.7,.3,1)',
      }}
    >
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke={checked ? '#fff' : SB.inkFaint}
          strokeWidth={checked ? 3 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: checked ? 0 : 30,
            transition: 'stroke-dashoffset .35s ease, stroke .2s, stroke-width .2s',
          }}
        />
      </svg>
    </span>
  )
}
