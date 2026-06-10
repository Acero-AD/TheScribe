import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useCurrentUser } from '../auth/AuthContext'
import { SB, SBfont } from '../lib/tokens'
import { ScreenHeader } from '../components/ScreenHeader'

type Status = 'idle' | 'submitting' | 'error'

// Reads the error code the backend returns in { error: { code } }.
function errorCodeOf(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object' &&
    (body as { error: { code?: unknown } }).error !== null
  ) {
    const code = (body as { error: { code?: unknown } }).error.code
    if (typeof code === 'string') return code
  }
  return 'invalid'
}

export function ConfirmSignInScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useCurrentUser()
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<Status>('idle')

  if (token.length === 0) {
    return <Navigate to="/sign-in?error=invalid" replace />
  }

  async function handleConfirm() {
    setStatus('submitting')
    try {
      await api(`/magic_links/${encodeURIComponent(token)}/consume`, { method: 'POST' })
      // The session cookie is set on the consume response; load it into auth
      // state before entering the app.
      await refresh()
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        navigate(`/sign-in?error=${errorCodeOf(error.body)}`, { replace: true })
        return
      }
      setStatus('error')
    }
  }

  const isSubmitting = status === 'submitting'

  return (
    <main style={pageStyle}>
      <ScreenHeader eyebrow="SCRIBE" title="Confirm sign-in" />
      <section style={sectionStyle}>
        {status === 'error' && (
          <p role="alert" style={alertStyle}>
            Something went wrong. Please try again.
          </p>
        )}
        <p style={bodyStyle}>Tap below to finish signing in to Scribe.</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          style={{ ...pillButtonStyle, ...(isSubmitting ? pillButtonDisabledStyle : null) }}
        >
          {isSubmitting ? 'Signing in…' : 'Finish signing in'}
        </button>
      </section>
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: SB.bg,
  color: SB.ink,
  fontFamily: SBfont.ui,
  paddingBottom: 64,
  position: 'relative',
}

const sectionStyle: React.CSSProperties = {
  padding: '20px 24px 0',
}

const bodyStyle: React.CSSProperties = {
  fontFamily: SBfont.ui,
  fontSize: 15,
  lineHeight: 1.5,
  color: SB.ink,
  marginTop: 8,
}

const pillButtonStyle: React.CSSProperties = {
  appearance: 'none',
  border: 0,
  background: SB.accent,
  color: SB.surface,
  borderRadius: 999,
  height: 40,
  padding: '0 24px',
  fontFamily: SBfont.ui,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0.2,
  cursor: 'pointer',
  marginTop: 16,
}

const pillButtonDisabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
}

const alertStyle: React.CSSProperties = {
  fontFamily: SBfont.ui,
  fontSize: 13,
  color: SB.amber,
  marginTop: 8,
}
