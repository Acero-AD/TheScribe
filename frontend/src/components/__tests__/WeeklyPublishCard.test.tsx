import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WeeklyPublishCard } from '../WeeklyPublishCard'

function renderCard(overrides: Partial<Parameters<typeof WeeklyPublishCard>[0]> = {}) {
  const onToggle = vi.fn()
  const props = {
    published: false,
    onToggle,
    ...overrides,
  }
  render(<WeeklyPublishCard {...props} />)
  return { onToggle }
}

describe('WeeklyPublishCard', () => {
  it('renders the unchecked state with aria-pressed=false', () => {
    renderCard({ published: false })
    const button = screen.getByRole('button', { name: /mark as published this week/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/did you publish this week/i)).toBeInTheDocument()
  })

  it('renders the checked state with aria-pressed=true', () => {
    renderCard({ published: true })
    const button = screen.getByRole('button', { name: /mark as not published this week/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('emits onToggle(!published) on click', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderCard({ published: false })
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('renders an inline error indicator when error is true', () => {
    renderCard({ error: true })
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't save/i)
  })

  it('renders the streak placeholder when no streak is provided', () => {
    renderCard()
    expect(screen.getByLabelText(/week streak/i)).toHaveTextContent('—')
  })
})
