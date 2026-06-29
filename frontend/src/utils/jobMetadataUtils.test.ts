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

describe('enrichJobMetadata vacancies', () => {
  it('ignores pincode before Posts label and uses post breakdown', () => {
    const enriched = enrichJobMetadata({
      title: 'ESIC Gurugram walk-in interview',
      vacancies: 48,
      posts: [
        { post_name: 'Full-Time Contractual Specialist', vacancies: 14 },
        { post_name: 'Senior Resident', vacancies: 34 },
      ],
      detail: {
        summary:
          'Venue: ESIC Model Hospital, Sector 9A, Gurugram, Haryana - 122001\nPosts :\n1) Specialist - 14\n2) Senior Residents – 34',
      },
    })
    expect(enriched.vacancies).toBe(48)
  })

  it('does not inflate stored count when PDF body has pincode noise', () => {
    const enriched = enrichJobMetadata({
      title: 'ESIC Gurugram walk-in',
      vacancies: 48,
      posts: [{ post_name: 'Specialist', vacancies: 14 }, { post_name: 'SR', vacancies: 34 }],
      about:
        'Sector 9A, Gurugram, Haryana - 122001 Posts : 1) Specialist - 14 2) SR - 34',
    })
    expect(enriched.vacancies).toBe(48)
  })

  it('does not drop to list-marker counts when posts breakdown exists', () => {
    const enriched = enrichJobMetadata({
      title: 'ESIC walk-in interview',
      vacancies: 48,
      posts: [
        { post_name: 'Full-Time Contractual Specialist', vacancies: 14 },
        { post_name: 'Senior Resident', vacancies: 34 },
      ],
      detail: { summary: '1) Specialist - 14\n2) Senior Residents – 34' },
    })
    expect(enriched.vacancies).toBe(48)
  })
})
