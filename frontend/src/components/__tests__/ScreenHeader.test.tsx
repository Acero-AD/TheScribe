import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScreenHeader } from '../ScreenHeader'

describe('ScreenHeader', () => {
  it('renders the title text followed by a trailing period', () => {
    render(<ScreenHeader eyebrow="The dial." title="Settings" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings.')
  })

  it('renders the eyebrow text', () => {
    render(<ScreenHeader eyebrow="The dial." title="Settings" />)
    expect(screen.getByText('The dial.')).toBeInTheDocument()
  })

  it('applies aria-label to the eyebrow when eyebrowAriaLabel is provided', () => {
    render(
      <ScreenHeader eyebrow="May 28, 2026" eyebrowAriaLabel="Today's date" title="Today" />,
    )
    const eyebrow = screen.getByLabelText("Today's date")
    expect(eyebrow).toHaveTextContent('May 28, 2026')
  })

  it('does not set an aria-label on the eyebrow when none is provided', () => {
    render(<ScreenHeader eyebrow="SCOREBOARD" title="Sign in" />)
    expect(screen.getByText('SCOREBOARD')).not.toHaveAttribute('aria-label')
  })

  it('exposes the headline by role with accessible name matching title plus period', () => {
    render(<ScreenHeader eyebrow="The record." title="History" />)
    expect(screen.getByRole('heading', { name: /history\./i })).toBeInTheDocument()
  })
})
