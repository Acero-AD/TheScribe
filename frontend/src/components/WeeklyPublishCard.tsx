import { SB, SBfont } from '../lib/tokens'
import type { PublishingCadence } from '../auth/types'

interface WeeklyPublishCardProps {
  published: boolean
  onToggle: (next: boolean) => void
  error?: boolean
  publishingStreak?: number | null
  cadence?: PublishingCadence
  disabled?: boolean
}

const STREAK_PLACEHOLDER = '—'

export function WeeklyPublishCard({
  published,
  onToggle,
  error = false,
  publishingStreak = null,
  cadence = 'weekly',
  disabled = false,
}: WeeklyPublishCardProps) {
  const streakValue =
    publishingStreak == null ? STREAK_PLACEHOLDER : String(publishingStreak).padStart(2, '0')
  const streakLabel = cadence === 'biweekly' ? 'Cycle streak' : 'Week streak'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={() => onToggle(!published)}
        disabled={disabled}
        aria-pressed={published}
        aria-label={
          published ? 'Mark as not published this week' : 'Mark as published this week'
        }
        style={{
          textAlign: 'left',
          width: '100%',
          appearance: 'none',
          border: 0,
          cursor: disabled ? 'progress' : 'pointer',
          background: SB.surface,
          color: SB.ink,
          borderRadius: 22,
          padding: '16px 18px',
          boxShadow: `0 1px 0 ${SB.hairline} inset, 0 0 0 1px ${SB.hairline}`,
          transition: 'all .25s',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontFamily: SBfont.ui,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tag tone={published ? 'green' : 'ink'}>Weekly</Tag>
          <div
            style={{
              fontFamily: SBfont.display,
              fontSize: 22,
              lineHeight: 1.15,
              fontStyle: 'italic',
              marginTop: 6,
              color: SB.ink,
              letterSpacing: -0.2,
            }}
          >
            Did you publish this week?
          </div>
          <div
            aria-label={streakLabel}
            style={{
              fontFamily: SBfont.mono,
              fontSize: 11,
              color: SB.inkMuted,
              marginTop: 6,
              letterSpacing: 0.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ fontWeight: 600, color: SB.ink, fontSize: 13 }}>
              {streakValue}
            </span>
            <span style={{ marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              {streakLabel}
            </span>
          </div>
        </div>
        <CheckCircle checked={published} size={48} />
      </button>

      {error ? (
        <div
          role="alert"
          style={{
            fontFamily: SBfont.ui,
            fontSize: 12,
            lineHeight: 1.4,
            color: SB.amber,
            padding: '4px 18px 0',
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
        flexShrink: 0,
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
