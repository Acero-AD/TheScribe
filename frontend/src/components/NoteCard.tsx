import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { SB, SBfont } from '../lib/tokens'

interface NoteCardProps {
  note: string | null
  onSave: (value: string) => Promise<void> | void
  error?: boolean
  onRetry?: () => void
}

export function NoteCard({ note, onSave, error = false, onRetry }: NoteCardProps) {
  const initial = note ?? ''
  const [value, setValue] = useState(initial)
  const persistedRef = useRef(initial)

  // Sync the editable value to the incoming note when it changes (unless the
  // last save errored, so the user's text isn't clobbered). Render-time
  // adjustment instead of syncing state in an effect.
  const [prevSync, setPrevSync] = useState({ note, error })
  if (prevSync.note !== note || prevSync.error !== error) {
    setPrevSync({ note, error })
    if (!error) setValue(note ?? '')
  }

  // Track the last persisted value (used to detect changes on blur). A ref
  // update doesn't trigger a render, so this stays in an effect.
  useEffect(() => {
    if (!error) persistedRef.current = note ?? ''
  }, [note, error])

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    const current = event.target.value
    if (current === persistedRef.current) return
    void onSave(current)
  }

  return (
    <div
      style={{
        background: 'transparent',
        borderRadius: 22,
        boxShadow: `0 0 0 1px ${SB.hairline}`,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <label
        htmlFor="today-note"
        style={{
          fontFamily: SBfont.mono,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: SB.inkMuted,
          marginBottom: 2,
          fontWeight: 500,
        }}
      >
        Today's note{' '}
        <span style={{ color: SB.inkFaint, marginLeft: 4 }}>· optional</span>
      </label>
      <textarea
        id="today-note"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        placeholder="What did you write about?"
        rows={2}
        style={{
          width: '100%',
          resize: 'none',
          border: 0,
          outline: 0,
          background: 'transparent',
          fontFamily: SBfont.display,
          fontStyle: 'italic',
          fontSize: 19,
          lineHeight: 1.35,
          color: SB.ink,
          letterSpacing: -0.1,
          padding: 0,
        }}
      />
      {error ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontFamily: SBfont.ui,
            fontSize: 12,
            color: SB.amber,
            marginTop: 2,
          }}
        >
          <span>Couldn't save your note.</span>
          {onRetry ? (
            <button
              type="button"
              onClick={() => onRetry()}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                color: SB.amber,
                fontFamily: SBfont.ui,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                textDecoration: 'underline',
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
