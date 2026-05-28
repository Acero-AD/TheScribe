import { SB, SBfont } from '../lib/tokens'

interface ScreenHeaderProps {
  eyebrow: string
  title: string
  eyebrowAriaLabel?: string
}

export function ScreenHeader({ eyebrow, title, eyebrowAriaLabel }: ScreenHeaderProps) {
  return (
    <header style={headerStyle}>
      <div style={eyebrowStyle} aria-label={eyebrowAriaLabel}>
        {eyebrow}
      </div>
      <h1 style={headlineStyle}>
        {title}
        <span style={periodStyle}>.</span>
      </h1>
    </header>
  )
}

const headerStyle: React.CSSProperties = {
  padding: '64px 24px 0',
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: SBfont.mono,
  fontSize: 11,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  color: SB.inkMuted,
  fontWeight: 500,
}

const headlineStyle: React.CSSProperties = {
  fontFamily: SBfont.display,
  fontSize: 56,
  lineHeight: 1,
  letterSpacing: -0.5,
  color: SB.ink,
  marginTop: 6,
  marginBottom: 0,
  fontWeight: 400,
}

const periodStyle: React.CSSProperties = {
  fontStyle: 'italic',
  color: SB.accent,
}
