import { describe, expect, it } from 'vitest'

import {
  PROFESSION_SLUGS,
  getProfessionBySlug,
  jobMatchesProfession,
  professionLandingTitle,
} from '@/data/professions'
import type { JobRecord } from '@/types/job'

function job(partial: Partial<JobRecord> & Pick<JobRecord, 'id'>): JobRecord {
  return {
    title: '',
    dept: '',
    qual: '',
    vacancies: 0,
    lastDate: '2026-12-31',
    category: 'health',
    status: 'live',
    ...partial,
  } as JobRecord
}

describe('professions', () => {
  it('registers 17 profession routes', () => {
    expect(PROFESSION_SLUGS).toHaveLength(17)
    expect(getProfessionBySlug('dental')?.labelKey).toBe('profession.dental')
    expect(getProfessionBySlug('hotel-management')?.labelKey).toBe('profession.hotelManagement')
  })

  it('matches dental jobs by BDS probe', () => {
    const dental = getProfessionBySlug('dental')!
    expect(jobMatchesProfession(job({ id: '1', title: 'Dental Surgeon BDS', category: 'health' }), dental)).toBe(true)
    expect(jobMatchesProfession(job({ id: '2', title: 'Staff Nurse GNM', category: 'health' }), dental)).toBe(false)
  })

  it('matches naval jobs without army-only listings', () => {
    const naval = getProfessionBySlug('naval')!
    expect(jobMatchesProfession(job({ id: '1', title: 'Indian Navy Agniveer SSR', category: 'defence' }), naval)).toBe(true)
    expect(jobMatchesProfession(job({ id: '2', title: 'Indian Army Soldier GD', category: 'defence' }), naval)).toBe(false)
  })

  it('matches aviation, sports quota, and arts probes', () => {
    expect(
      jobMatchesProfession(
        job({ id: '1', title: 'AAI Junior Executive Aviation', category: 'psu' }),
        getProfessionBySlug('aviation')!
      )
    ).toBe(true)
    expect(
      jobMatchesProfession(
        job({ id: '2', title: 'Sports Quota Constable', category: 'police' }),
        getProfessionBySlug('sports-quota')!
      )
    ).toBe(true)
    expect(
      jobMatchesProfession(
        job({ id: '3', title: 'Clerk — BA graduate any stream', category: 'ssc' }),
        getProfessionBySlug('arts')!
      )
    ).toBe(true)
  })

  it('includes listing count in landing title', () => {
    const medical = getProfessionBySlug('medical')!
    expect(professionLandingTitle(medical, 42)).toContain('42')
  })
})
