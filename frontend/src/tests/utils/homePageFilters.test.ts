import { describe, expect, it } from 'vitest'
import { filterHomePageJobs, jobMatchesHeroStatFilter } from '@/utils/homePageFilters'
import type { JobRecord } from '@/types/job'

const baseJob = (overrides: Partial<JobRecord> = {}): JobRecord =>
  ({
    id: '1',
    slug: 'test-job',
    title: 'SSC CGL 2026 Recruitment',
    dept: 'SSC',
    category: 'ssc',
    state_codes: ['up'],
    vacancies: 100,
    qualification: 'Graduate',
    salary: '',
    age_limit: '',
    lastDate: '2026-12-31',
    apply_url: 'https://ssc.gov.in/notification.pdf',
    status: 'live',
    ...overrides,
  }) as JobRecord

describe('jobMatchesHeroStatFilter', () => {
  it('matches live jobs', () => {
    expect(jobMatchesHeroStatFilter(baseJob(), 'live')).toBe(true)
    expect(jobMatchesHeroStatFilter(baseJob({ status: 'expired' }), 'live')).toBe(false)
  })

  it('matches vacancy filter', () => {
    expect(jobMatchesHeroStatFilter(baseJob({ vacancies: 0 }), 'vacancies')).toBe(false)
    expect(jobMatchesHeroStatFilter(baseJob({ vacancies: 50 }), 'vacancies')).toBe(true)
  })
})

describe('filterHomePageJobs', () => {
  const jobs = [
    baseJob({ id: '1', slug: 'a', stateIds: ['up'], vacancies: 200, category: 'ssc' }),
    baseJob({ id: '2', slug: 'b', stateIds: ['mh'], vacancies: 50, category: 'banking', title: 'Bank PO 2026' }),
    baseJob({ id: '3', slug: 'c', stateIds: ['up'], vacancies: 10, category: 'banking', status: 'expired' }),
  ]

  it('filters by state when not searching', () => {
    const out = filterHomePageJobs({ jobs, selectedState: 'up' })
    expect(out.map((j) => j.slug)).toEqual(['a', 'c'])
  })

  it('filters by category', () => {
    const out = filterHomePageJobs({ jobs, activeCat: 'banking' })
    expect(out).toHaveLength(2)
  })

  it('sorts by vacancies descending', () => {
    const out = filterHomePageJobs({ jobs, sort: 'vacancies' })
    expect(out[0].slug).toBe('a')
  })

  it('filters by search across title', () => {
    const out = filterHomePageJobs({ jobs, search: 'Bank PO' })
    expect(out).toHaveLength(1)
    expect(out[0].slug).toBe('b')
  })
})
