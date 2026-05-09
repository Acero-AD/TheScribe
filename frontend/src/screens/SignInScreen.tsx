import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'

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
      <main>
        <h1>Check your email</h1>
        <p>
          If an account exists for <strong>{email}</strong>, we just sent a sign-in link.
          Click it from the same browser to finish signing in.
        </p>
        <button type="button" onClick={() => setSubmission('idle')}>
          Use a different email
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Sign in to Scoreboard</h1>
      {urlError && <p role="alert">{urlError}</p>}
      {submitError && <p role="alert">{submitError}</p>}
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submission === 'submitting'}
        />
        <button type="submit" disabled={submission === 'submitting' || email.length === 0}>
          {submission === 'submitting' ? 'Sending…' : 'Send sign-in link'}
        </button>
      </form>
    </main>
  )
}
