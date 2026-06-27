import { describe, expect, it } from 'vitest'

import { detectSourceLanguage, needsEnglishNormalization } from '@/utils/jobContentTranslate'

describe('jobContentTranslate', () => {
  it('detects Devanagari as Hindi', () => {
    expect(detectSourceLanguage('आई टी आर भर्ती')).toBe('hi')
    expect(needsEnglishNormalization('आई टी आर भर्ती')).toBe(true)
  })

  it('treats plain English as already normalized', () => {
    expect(detectSourceLanguage('SSC CGL 2026 Notification')).toBe('en')
    expect(needsEnglishNormalization('SSC CGL 2026 Notification')).toBe(false)
  })

  it('detects non-English content in section lists and tables', async () => {
    const { jobNeedsNormalization } = await import('@/utils/jobContentTranslate')
    const job = {
      title: 'SSC Notification',
      detail: {
        content_sections: [
          {
            heading: 'Eligibility',
            lists: [['स्नातक डिग्री']],
            tables: [[{ post: 'Clerk', qualification: 'आई टी आई' }]],
          },
        ],
      },
    }
    expect(jobNeedsNormalization(job as import('@/types/job').JobRecord)).toBe(true)
  })
})
