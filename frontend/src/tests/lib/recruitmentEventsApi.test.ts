import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  fetchEventsByType,
  fetchUpcomingCalendar,
  groupEventsWithRecruitments,
  parseRecruitmentEventsSnapshot,
  resetRecruitmentEventsSnapshotForTests,
  type RecruitmentEventRow,
  type RecruitmentRow,
} from '@/lib/recruitmentEventsApi'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  getSupabase: vi.fn(async () => null),
}))

import { isSupabaseConfigured } from '@/lib/supabase'

const rec: RecruitmentRow = {
  id: 'rec-1',
  canonical_slug: 'ssc-cgl-2026',
  organization: 'SSC',
  title: 'SSC CGL 2026',
  state_codes: [],
  status: 'active',
  primary_job_id: null,
  official_url: 'https://ssc.gov.in/notice',
}

const resultEvent: RecruitmentEventRow = {
  id: 'ev-1',
  recruitment_id: 'rec-1',
  event_type: 'result',
  event_date: '2026-08-10',
  title: 'SSC CGL 2026 result',
  official_url: 'https://ssc.gov.in/result',
  document_url: null,
  status: 'announced',
}

describe('recruitmentEventsApi', () => {
  afterEach(() => {
    resetRecruitmentEventsSnapshotForTests()
    vi.unstubAllGlobals()
    vi.mocked(isSupabaseConfigured).mockReturnValue(false)
  })

  it('groups events under their recruitment', () => {
    const rows = groupEventsWithRecruitments([resultEvent], [rec])
    expect(rows).toHaveLength(1)
    expect(rows[0].organization).toBe('SSC')
    expect(rows[0].events).toHaveLength(1)
  })

  it('drops events whose recruitment is missing', () => {
    expect(groupEventsWithRecruitments([resultEvent], [])).toEqual([])
  })

  it('rejects snapshots without byType', () => {
    expect(parseRecruitmentEventsSnapshot({ items: [] })).toBeNull()
    expect(parseRecruitmentEventsSnapshot(null)).toBeNull()
  })

  it('loads hub rows from the static snapshot when Supabase is unset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generatedAt: '2026-08-14T12:00:00Z',
          byType: { result: [{ ...rec, events: [resultEvent] }], admit_card: [] },
        }),
      }),
    )

    const rows = await fetchEventsByType('result', 100)
    expect(rows).toHaveLength(1)
    expect(rows[0].events[0].title).toBe('SSC CGL 2026 result')
  })

  it('returns an empty list when the snapshot fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(fetchEventsByType('admit_card')).resolves.toEqual([])
  })

  it('calendar uses only future-dated static events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          byType: {
            exam_date: [
              {
                ...rec,
                events: [
                  { ...resultEvent, id: 'past', event_type: 'exam_date', event_date: '2020-01-01' },
                  { ...resultEvent, id: 'future', event_type: 'exam_date', event_date: '2099-01-01' },
                ],
              },
            ],
          },
        }),
      }),
    )

    const rows = await fetchUpcomingCalendar(10)
    expect(rows).toHaveLength(1)
    expect(rows[0].events.map((e) => e.id)).toEqual(['future'])
  })
})
