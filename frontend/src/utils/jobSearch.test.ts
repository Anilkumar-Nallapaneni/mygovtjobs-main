import { describe, expect, it } from 'vitest'
import { jobMatchesSearch, jobSearchHaystack } from './jobSearch'

const sampleJob = {
  title: 'UPSC Civil Services Examination 2026',
  dept: 'Union Public Service Commission',
  state: 'All India',
  category: 'upsc',
  qual: 'Graduate',
  stateIds: ['all'],
  slug: 'upsc-cse-2026',
}

describe('jobSearchHaystack', () => {
  it('includes title, dept, and category in lowercase', () => {
    const hay = jobSearchHaystack(sampleJob)
    expect(hay).toContain('upsc civil services examination 2026')
    expect(hay).toContain('union public service commission')
    expect(hay).toContain('upsc')
  })
})

describe('jobMatchesSearch', () => {
  it('matches empty query', () => {
    expect(jobMatchesSearch(sampleJob, '')).toBe(true)
    expect(jobMatchesSearch(sampleJob, '   ')).toBe(true)
  })

  it('matches single token', () => {
    expect(jobMatchesSearch(sampleJob, 'civil')).toBe(true)
    expect(jobMatchesSearch(sampleJob, 'banking')).toBe(false)
  })

  it('requires all tokens for multi-word search', () => {
    expect(jobMatchesSearch(sampleJob, 'upsc civil')).toBe(true)
    expect(jobMatchesSearch(sampleJob, 'upsc banking')).toBe(false)
  })
})
