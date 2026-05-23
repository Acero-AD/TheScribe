import type { ReactNode } from 'react'
import { SB, SBfont } from '../lib/tokens'

interface SettingsRowProps {
  label: string
  sub?: string
  right: ReactNode
  isLast?: boolean
  error?: boolean
  errorMessage?: string
}

export function SettingsRow({
  label,
  sub,
  right,
  isLast = false,
  error = false,
  errorMessage,
}: SettingsRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: '12px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 56 - 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: SBfont.ui,
              fontSize: 15,
              color: SB.ink,
              fontWeight: 500,
              letterSpacing: -0.1,
            }}
          >
            {label}
          </div>
          {sub ? (
            <div
              style={{
                fontFamily: SBfont.ui,
                fontSize: 12,
                color: SB.inkMuted,
                marginTop: 2,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
        <div
          style={{
            flexShrink: 0,
            marginLeft: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {error ? (
            <span
              aria-hidden
              title={errorMessage ?? "Couldn't save"}
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: SB.amber,
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: SBfont.mono,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              !
            </span>
          ) : null}
          {right}
        </div>
      </div>
      {error ? (
        <div
          role="alert"
          style={{
            fontFamily: SBfont.ui,
            fontSize: 12,
            color: SB.amber,
            marginTop: 6,
          }}
        >
          {errorMessage ?? "Couldn't save."}
        </div>
      ) : null}
      {!isLast ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 18,
            right: 18,
            height: 1,
            background: SB.hairline,
          }}
        />
      ) : null}
    </div>
  )
}
