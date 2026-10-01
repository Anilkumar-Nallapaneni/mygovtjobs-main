import { describe, expect, it } from 'vitest'
import { resolveAdsenseUnit } from '@/components/ads/AdSlot'

describe('resolveAdsenseUnit', () => {
  it('accepts a numeric ad-unit id', () => {
    expect(resolveAdsenseUnit('1234567890')).toBe('1234567890')
  })

  it('rejects semantic placement names when no slot env is set', () => {
    expect(resolveAdsenseUnit('job-detail-mid')).toBeNull()
    expect(resolveAdsenseUnit('results-hub')).toBeNull()
    expect(resolveAdsenseUnit('not-a-slot')).toBeNull()
  })
})
