import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WritingCheckInCard } from '../WritingCheckInCard'

function renderCard(overrides: Partial<Parameters<typeof WritingCheckInCard>[0]> = {}) {
  const onToggle = vi.fn()
  const props = {
    wrote: false,
    wroteAt: null,
    timezone: 'UTC',
    onToggle,
    ...overrides,
  }
  render(<WritingCheckInCard {...props} />)
  return { onToggle }
}

describe('WritingCheckInCard', () => {
  it('renders the unchecked state with "Tap to log"', () => {
    renderCard({ wrote: false })
    const button = screen.getByRole('button', { name: /mark as written today/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/tap to log/i)).toBeInTheDocument()
  })

  it('renders the checked state with "Logged · HH:MM" derived from wroteAt', () => {
    renderCard({
      wrote: true,
      wroteAt: '2026-05-23T09:14:00Z',
      timezone: 'UTC',
    })
    const button = screen.getByRole('button', { name: /mark as not written today/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Logged · 9:14')).toBeInTheDocument()
  })

  it('emits onToggle(!wrote) on click', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderCard({ wrote: false })
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('renders an inline error indicator when error is true', () => {
    renderCard({ error: true })
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't save/i)
  })

  it('renders the streak placeholder when no streak is available', () => {
    renderCard()
    expect(screen.getByLabelText(/day streak/i)).toHaveTextContent('—')
  })
})
