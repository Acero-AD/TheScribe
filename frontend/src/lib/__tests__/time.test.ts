import { describe, expect, it } from 'vitest'
import { detectTimezone, detectBrowserTimezone } from '../time'

describe('detectTimezone', () => {
  it('returns a non-empty string in a default test environment', () => {
    const zone = detectTimezone()
    expect(typeof zone).toBe('string')
    expect(zone.length).toBeGreaterThan(0)
  })

  it('aliases detectBrowserTimezone', () => {
    expect(detectTimezone).toBe(detectBrowserTimezone)
  })
})
