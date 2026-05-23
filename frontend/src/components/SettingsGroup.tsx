import type { ReactNode } from 'react'
import { SB, SBfont } from '../lib/tokens'

interface SettingsGroupProps {
  header?: string
  children: ReactNode
}

export function SettingsGroup({ header, children }: SettingsGroupProps) {
  return (
    <div style={{ padding: '0 16px', marginTop: 18 }}>
      {header ? (
        <div
          style={{
            fontFamily: SBfont.mono,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: SB.inkMuted,
            padding: '0 6px 6px',
            fontWeight: 500,
          }}
        >
          {header}
        </div>
      ) : null}
      <div
        role="group"
        aria-label={header}
        style={{
          background: SB.surface,
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: `0 0 0 1px ${SB.hairline}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
