import { describe, expect, it } from 'vitest'

import { matchSourceHealth, normalizeHealthStatus, pickMostCommonHost } from '@/utils/orgSourceHealth'

describe('orgSourceHealth', () => {
  it('normalizes source_health statuses', () => {
    expect(normalizeHealthStatus('HEALTHY')).toBe('healthy')
    expect(normalizeHealthStatus('BLOCKED')).toBe('broken')
    expect(normalizeHealthStatus('')).toBe('unknown')
  })

  it('matches a board host to the healthiest source row', () => {
    const row = matchSourceHealth('ssc.gov.in', [
      {
        sourceCode: 'ssc-rss',
        homepageUrl: 'https://ssc.gov.in/home/notice-board',
        healthStatus: 'BROKEN',
        lastCheckedAt: '2026-08-01T00:00:00Z',
      },
      {
        sourceCode: 'ssc',
        homepageUrl: 'https://ssc.gov.in/home/notice-board',
        healthStatus: 'HEALTHY',
        lastCheckedAt: '2026-09-17T02:42:42Z',
      },
    ])
    expect(row?.sourceCode).toBe('ssc')
    expect(normalizeHealthStatus(row?.healthStatus)).toBe('healthy')
  })

  it('picks the most common official host', () => {
    expect(
      pickMostCommonHost([
        'https://ssc.gov.in/apply',
        'https://www.ssc.gov.in/pdf/a.pdf',
        'https://upsc.gov.in/x',
      ])
    ).toBe('ssc.gov.in')
  })
})
