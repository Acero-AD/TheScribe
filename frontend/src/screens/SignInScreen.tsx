import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { SB, SBfont } from '../lib/tokens'
import { ScreenHeader } from '../components/ScreenHeader'

type Submission = 'idle' | 'submitting' | 'sent' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'That sign-in link has expired. Request a new one below.',
  consumed: 'That sign-in link has already been used. Request a new one below.',
  invalid: 'That sign-in link is not valid. Request a new one below.',
}

export function SignInScreen() {
  const [params] = useSearchParams()
  const errorCode = params.get('error') ?? ''
  const urlError = ERROR_MESSAGES[errorCode]

  const [email, setEmail] = useState('')
  const [submission, setSubmission] = useState<Submission>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmission('submitting')
    setSubmitError(null)

    try {
      await api('/magic_links', {
        method: 'POST',
        body: { email },
      })
      setSubmission('sent')
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setSubmitError('Please enter a valid email address.')
      } else {
        setSubmitError('Something went wrong. Please try again.')
      }
      setSubmission('error')
    }
  }

  if (submission === 'sent') {
    return (
      <main style={pageStyle}>
        <ScreenHeader eyebrow="CHECK YOUR INBOX" title="Check your email" />
        <section style={sectionStyle}>
          <p style={bodyStyle}>
            If an account exists for <strong>{email}</strong>, we just sent a sign-in link.
            Click it from the same browser to finish signing in.
          </p>
          <button type="button" onClick={() => setSubmission('idle')} style={textButtonStyle}>
            Use a different email
          </button>
        </section>
      </main>
    )
  }

  const isSubmitting = submission === 'submitting'
  const isButtonDisabled = isSubmitting || email.length === 0

  return (
    <main style={pageStyle}>
      <ScreenHeader eyebrow="SCOREBOARD" title="Sign in" />
      <section style={sectionStyle}>
        {urlError && (
          <p role="alert" style={alertStyle}>
            {urlError}
          </p>
        )}
        {submitError && (
          <p role="alert" style={alertStyle}>
            {submitError}
          </p>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div style={inputContainerStyle}>
            <label htmlFor="email" style={inputLabelStyle}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={isButtonDisabled}
            style={{
              ...pillButtonStyle,
              ...(isButtonDisabled ? pillButtonDisabledStyle : null),
            }}
          >
            {isSubmitting ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
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

const inputContainerStyle: React.CSSProperties = {
  borderRadius: 22,
  boxShadow: `0 0 0 1px ${SB.hairline}`,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const inputLabelStyle: React.CSSProperties = {
  fontFamily: SBfont.mono,
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: SB.inkMuted,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: 0,
  outline: 0,
  background: 'transparent',
  fontFamily: SBfont.ui,
  fontSize: 17,
  lineHeight: 1.35,
  color: SB.ink,
  padding: 0,
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

const bodyStyle: React.CSSProperties = {
  fontFamily: SBfont.ui,
  fontSize: 15,
  lineHeight: 1.5,
  color: SB.ink,
  marginTop: 16,
}

const textButtonStyle: React.CSSProperties = {
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: SB.inkMuted,
  fontFamily: SBfont.ui,
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  marginTop: 16,
}

const alertStyle: React.CSSProperties = {
  fontFamily: SBfont.ui,
  fontSize: 13,
  color: SB.amber,
  marginTop: 8,
}
