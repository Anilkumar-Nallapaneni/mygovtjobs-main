import { describe, expect, it } from 'vitest'

import { resolveStateCodes } from '@/utils/jobStateResolve'

describe('jobStateResolve extra UT hints', () => {
  it('tags union territory hosts without inventing All-India boards', () => {
    expect(resolveStateCodes({ dept: 'JKPSC Combined Services' })).toEqual(['jk'])
    expect(resolveStateCodes({ dept: 'NCRTC Recruitment' })).toEqual(['dl'])
    expect(resolveStateCodes({ title: 'Puducherry Police Constable' })).toEqual(['py'])
    expect(resolveStateCodes({ dept: 'Staff Selection Commission (SSC)', apply_url: 'https://ssc.gov.in/apply' })).toEqual([])
  })
})
