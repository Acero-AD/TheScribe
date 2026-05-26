import { SB } from '../lib/tokens'

interface ToggleProps {
  on: boolean
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
  busy?: boolean
}

export function Toggle({ on, onClick, ariaLabel, disabled = false, busy = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        border: 0,
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? SB.accent : '#D8D2C5',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        transition: 'background .2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.18)',
          transition: 'left .2s cubic-bezier(.2,.7,.3,1)',
        }}
      />
    </button>
  )
}
