import { SB, SBfont } from '../lib/tokens'

interface StreakChipProps {
  label: string
  value: number
  unit: string
  tone?: 'neutral' | 'accent'
}

export function StreakChip({ label, value, unit, tone = 'neutral' }: StreakChipProps) {
  const accent = tone === 'accent'
  const padded = value.toString().padStart(2, '0')

  return (
    <div
      aria-label={label}
      style={{
        flex: 1,
        background: accent ? SB.accent : SB.surface,
        borderRadius: 18,
        padding: '12px 14px',
        boxShadow: accent ? 'none' : `0 0 0 1px ${SB.hairline}`,
        color: accent ? '#fff' : SB.ink,
      }}
    >
      <div
        style={{
          fontFamily: SBfont.mono,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,.8)' : SB.inkMuted,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SBfont.mono,
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: -1,
          marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {padded}
        <span
          style={{
            fontSize: 12,
            marginLeft: 4,
            letterSpacing: 0,
            color: accent ? 'rgba(255,255,255,.8)' : SB.inkMuted,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}
