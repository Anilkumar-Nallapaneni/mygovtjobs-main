import { describe, expect, it } from 'vitest'
import type { JobRecord } from '@/types/job'
import { discoverExamsFromJobs } from '@/data/examDiscovery'

describe('examDiscovery', () => {
  it('discovers GATE from job titles when 2+ match', () => {
    const jobs = [
      { id: '1', title: 'GATE 2026 Scorecard for PSU Recruitment', dept: 'BHEL', category: 'psu' },
      { id: '2', title: 'GATE 2025 qualified engineers recruitment', dept: 'NTPC', category: 'psu' },
    ] as JobRecord[]

    const found = discoverExamsFromJobs(jobs)
    expect(found.some((e) => e.slug === 'gate')).toBe(true)
  })

  it('auto-generates slug from repeated title prefix', () => {
    const jobs = [
      { id: '1', title: 'NPCIL Stipendiary Trainee Recruitment 2026', dept: 'NPCIL' },
      { id: '2', title: 'NPCIL Stipendiary Trainee Notification 2026', dept: 'NPCIL' },
      { id: '3', title: 'NPCIL Stipendiary Trainee Apply Online', dept: 'NPCIL' },
    ] as JobRecord[]

    const found = discoverExamsFromJobs(jobs)
    expect(found.some((e) => e.slug.includes('npcil'))).toBe(true)
  })
})
