import { describe, expect, it, vi } from 'vitest'
import {
  dedupeLiveRows,
  isUsefulLiveRow,
  processLiveJobPayload,
  processLiveJobPayloadAsync,
  resolveJobsSourceMode,
  sourceOrder,
  statsFromRows,
} from '@/utils/liveJobsPipeline'

describe('resolveJobsSourceMode', () => {
  it('defaults to auto', () => {
    expect(resolveJobsSourceMode(undefined)).toBe('auto')
    expect(resolveJobsSourceMode('')).toBe('auto')
  })

  it('accepts explicit modes', () => {
    expect(resolveJobsSourceMode('static')).toBe('static')
    expect(resolveJobsSourceMode('API')).toBe('api')
    expect(resolveJobsSourceMode('supabase')).toBe('supabase')
  })
})

describe('sourceOrder', () => {
  it('prioritizes static JSON in auto mode for fast first paint', () => {
    expect(sourceOrder('auto')).toEqual(['static', 'supabase', 'api'])
  })

  it('honors static-only mode', () => {
    expect(sourceOrder('static')).toEqual(['static'])
  })

  it('loads static snapshot before Supabase in supabase mode', () => {
    expect(sourceOrder('supabase')).toEqual(['static', 'supabase', 'api'])
  })
})

describe('isUsefulLiveRow', () => {
  it('rejects draft and noise rows', () => {
    expect(isUsefulLiveRow({ title: 'Home', status: 'live' })).toBe(false)
    expect(isUsefulLiveRow({ title: 'SSC CGL 2026 Notification', status: 'draft' })).toBe(false)
  })

  it('accepts recruitment-like official rows', () => {
    expect(
      isUsefulLiveRow({
        title: 'UPSC Civil Services Examination 2026',
        dept: 'UPSC',
        status: 'live',
        apply_url: 'https://upsc.gov.in/notification.pdf',
      })
    ).toBe(true)
  })

  it('accepts official rows with vacancy count even when title lacks recruit keyword', () => {
    expect(
      isUsefulLiveRow({
        title: 'Junior Research Fellow — NIT Hamirpur',
        vacancies: 2,
        status: 'live',
        apply_url: 'https://www.nith.ac.in/notice.pdf',
        last_date: '2026-12-31',
      })
    ).toBe(true)
  })
})

describe('dedupeLiveRows', () => {
  it('dedupes by slug and caps volume', () => {
    const rows = [
      {
        slug: 'job-a',
        title: 'Railway Recruitment 2026',
        vacancies: 1,
        apply_url: 'https://indianrailways.gov.in/notification.pdf',
      },
      {
        slug: 'job-a',
        title: 'Railway Recruitment 2026 duplicate',
        vacancies: 2,
        apply_url: 'https://indianrailways.gov.in/notification.pdf',
      },
      {
        slug: 'job-b',
        title: 'Bank PO Recruitment 2026',
        vacancies: 3,
        apply_url: 'https://ibps.in/recruitment.pdf',
      },
    ]
    const out = dedupeLiveRows(rows)
    expect(out).toHaveLength(2)
    const slugs = out.map((row) => (row as { slug: string }).slug).sort()
    expect(slugs).toEqual(['job-a', 'job-b'])
  })
})

describe('processLiveJobPayload', () => {
  it('returns adapted rows and catalog stats', () => {
    const { rows, stats } = processLiveJobPayload([
      {
        slug: 'ssc-cgl-2026',
        title: 'SSC CGL 2026 Recruitment',
        vacancies: 7500,
        status: 'live',
        apply_url: 'https://ssc.gov.in/notice.pdf',
        state_codes: ['all'],
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].slug).toBe('ssc-cgl-2026')
    expect(stats.totalNotices).toBe(1)
    expect(stats.vacancies).toBe(7500)
  })
})

describe('processLiveJobPayloadAsync', () => {
  it('matches sync output for the same payload', async () => {
    const raw = [
      {
        slug: 'ssc-cgl-2026',
        title: 'SSC CGL 2026 Recruitment',
        vacancies: 7500,
        status: 'live',
        apply_url: 'https://ssc.gov.in/notice.pdf',
        state_codes: ['all'],
      },
      {
        slug: 'upsc-capf',
        title: 'UPSC CAPF AC Recruitment',
        vacancies: 400,
        status: 'live',
        apply_url: 'https://upsc.gov.in/notice.pdf',
        state_codes: ['all'],
      },
    ]
    const sync = processLiveJobPayload(raw)
    const async = await processLiveJobPayloadAsync(raw)
    expect(async.rows.map((r) => r.slug)).toEqual(sync.rows.map((r) => r.slug))
    expect(async.stats).toEqual(sync.stats)
  })
})

describe('statsFromRows', () => {
  it('counts only live notices and skips expired status', () => {
    const stats = statsFromRows([
      { status: 'live', vacancies: 10, lastDate: '2099-01-01' },
      { status: 'expired', vacancies: 0, lastDate: '2099-01-01' },
    ] as never[])
    expect(stats.liveNotices).toBe(1)
    expect(stats.totalNotices).toBe(1)
    expect(stats.noticesWithVacancies).toBe(1)
    expect(stats.vacancies).toBe(10)
  })

  it('skips jobs past last apply date even when status is live', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-03T12:00:00Z'))
    const stats = statsFromRows([
      { status: 'live', vacancies: 5, lastDate: '2026-12-31' },
      { status: 'live', vacancies: 99, lastDate: '2026-01-01' },
    ] as never[])
    expect(stats.liveNotices).toBe(1)
    expect(stats.vacancies).toBe(5)
    vi.useRealTimers()
  })

  it('uses enriched vacancies when rawVacancies is zero', () => {
    const stats = statsFromRows([
      { status: 'live', vacancies: 9, rawVacancies: 0, lastDate: '2099-01-01' },
    ] as never[])
    expect(stats.vacancies).toBe(9)
    expect(stats.noticesWithVacancies).toBe(1)
  })
})
