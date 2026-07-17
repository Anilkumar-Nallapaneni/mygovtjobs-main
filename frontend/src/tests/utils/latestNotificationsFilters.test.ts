import { describe, expect, it } from 'vitest'

import { filterLatestNotificationJobs, isExpiringSoonJob } from '@/utils/latestNotificationsFilters'

const baseJob = {
  id: '1',
  title: 'Test Recruitment',
  dept: 'Test Board',
  category: 'banking',
  stateIds: ['up'],
  state: 'Uttar Pradesh',
  lastDate: '2030-06-01',
  status: 'live',
  qual: 'Graduate',
}

describe('latestNotificationsFilters', () => {
  it('filters by state', () => {
    const jobs = [
      baseJob,
      { ...baseJob, id: '2', stateIds: ['mh'], state: 'Maharashtra' },
    ]
    const filtered = filterLatestNotificationJobs(jobs, { stateId: 'up' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('filters by profession medical', () => {
    const jobs = [
      baseJob,
      {
        ...baseJob,
        id: '2',
        title: 'AIIMS Medical Officer Recruitment',
        qual: 'MBBS',
        category: 'health',
      },
    ]
    const filtered = filterLatestNotificationJobs(jobs, { professionSlug: 'medical' })
    expect(filtered.some((j) => j.id === '2')).toBe(true)
    expect(filtered.some((j) => j.id === '1')).toBe(false)
  })

  it('detects expiring soon within 7 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 3)
    const job = { ...baseJob, lastDate: soon.toISOString().slice(0, 10) }
    expect(isExpiringSoonJob(job)).toBe(true)

    const later = new Date()
    later.setDate(later.getDate() + 30)
    const far = { ...baseJob, lastDate: later.toISOString().slice(0, 10) }
    expect(isExpiringSoonJob(far)).toBe(false)
  })

  it('matches NE umbrella jobs to split state chips via title hints', () => {
    const tripuraJob = {
      ...baseJob,
      id: '3',
      stateIds: ['ne'],
      state: 'NE States',
      title: 'Tripura PSC Assistant Recruitment 2026',
      dept: 'Tripura PSC',
    }
    const filtered = filterLatestNotificationJobs([baseJob, tripuraJob], { stateId: 'tr' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('3')
  })
})
