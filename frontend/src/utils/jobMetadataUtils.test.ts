import { describe, expect, it } from 'vitest'
import { enrichJobMetadata, isSameCalendarDay } from './jobMetadataUtils'

describe('isSameCalendarDay', () => {
  it('matches ISO date and datetime on the same day', () => {
    expect(isSameCalendarDay('2026-06-21', '2026-06-21T00:00:00Z')).toBe(true)
  })
})

describe('enrichJobMetadata published date', () => {
  it('keeps both publishedDate and lastDate when present', () => {
    const enriched = enrichJobMetadata({
      title: 'Test recruitment',
      lastDate: '2026-06-21',
      published_at: '2026-06-01T00:00:00Z',
    })

    expect(enriched.lastDate).toBe('2026-06-21')
    expect(enriched.publishedDate).toBe('2026-06-01')
  })
})
