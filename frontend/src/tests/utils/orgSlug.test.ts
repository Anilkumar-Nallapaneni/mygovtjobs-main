import { describe, expect, it } from 'vitest'

import {
  deptForOrgSlug,
  jobMatchesOrgDept,
  jobMatchesOrgEntry,
  normalizeDeptName,
  slugifyOrg,
  type OrgIndexEntry,
} from '@/utils/orgSlug'

const INDEX: OrgIndexEntry[] = [
  { slug: 'iit-delhi', dept: 'IIT Delhi', count: 12, vacancies: 40 },
  { slug: 'aiims-jodhpur', dept: 'AIIMS Jodhpur', count: 5, vacancies: 20 },
]

describe('orgSlug', () => {
  it('slugifies organisation names', () => {
    expect(slugifyOrg('IIT Delhi')).toBe('iit-delhi')
    expect(slugifyOrg('  AIIMS Jodhpur  ')).toBe('aiims-jodhpur')
    expect(slugifyOrg('RRB — NTPC')).toBe('rrb-ntpc')
  })

  it('resolves dept from slug via index', () => {
    expect(deptForOrgSlug('iit-delhi', INDEX)).toBe('IIT Delhi')
    expect(deptForOrgSlug('unknown', INDEX)).toBeNull()
  })

  it('matches jobs by normalised dept', () => {
    expect(jobMatchesOrgDept({ dept: 'IIT Delhi' }, 'IIT Delhi')).toBe(true)
    expect(jobMatchesOrgDept({ dept: '  iit delhi ' }, 'IIT Delhi')).toBe(true)
    expect(jobMatchesOrgDept({ dept: 'SSC' }, 'IIT Delhi')).toBe(false)
    expect(normalizeDeptName(null)).toBe('')
  })

  it('matches jobs to org index rows with fuzzy dept matching', () => {
    const upsc = {
      slug: 'union-public-service-commission-upsc',
      dept: 'Union Public Service Commission (UPSC)',
      count: 10,
      vacancies: 100,
    }
    expect(jobMatchesOrgEntry({ dept: 'UPSC' }, upsc)).toBe(true)
    expect(jobMatchesOrgEntry({ dept: 'Union Public Service Commission' }, upsc)).toBe(true)
    expect(jobMatchesOrgEntry({ dept: 'SSC' }, upsc)).toBe(false)
  })
})
