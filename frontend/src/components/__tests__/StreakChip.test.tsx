import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StreakChip } from '../StreakChip'

describe('StreakChip', () => {
  it('renders a 2-digit zero-padded value and the unit', () => {
    render(<StreakChip label="Current" value={3} unit="days" />)
    const chip = screen.getByLabelText('Current')
    expect(chip).toHaveTextContent('03')
    expect(chip).toHaveTextContent('days')
  })

  it('renders large numbers without truncating', () => {
    render(<StreakChip label="Best" value={123} unit="days" />)
    expect(screen.getByLabelText('Best')).toHaveTextContent('123')
  })

  it('renders zero as "00"', () => {
    render(<StreakChip label="Current" value={0} unit="days" />)
    expect(screen.getByLabelText('Current')).toHaveTextContent('00')
  })

  it('applies the accent tone variant when tone="accent"', () => {
    render(<StreakChip label="Published" value={2} unit="wks" tone="accent" />)
    expect(screen.getByLabelText('Published')).toHaveTextContent('02')
    expect(screen.getByLabelText('Published')).toHaveTextContent('wks')
  })

  it('renders the "cycles" unit when supplied (biweekly cadence)', () => {
    render(<StreakChip label="Published" value={2} unit="cycles" tone="accent" />)
    expect(screen.getByLabelText('Published')).toHaveTextContent('cycles')
  })
})
