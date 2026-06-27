import { describe, expect, it } from 'vitest'

import { extractPostName, formatPostNameWithVacancy } from '@/utils/extractPostName'

describe('extractPostName', () => {
  it('uses detail.post_name when set', () => {
    expect(
      extractPostName({
        title: 'Long SSC notification title 2026',
        detail: { post_name: 'Combined Graduate Level' },
      })
    ).toBe('Combined Graduate Level')
  })

  it('parses "for the post of" from title', () => {
    expect(
      extractPostName({
        title: 'Notification for the post of Junior Engineer in PWD, Bihar',
      })
    ).toBe('Junior Engineer')
  })

  it('joins multiple API post rows', () => {
    expect(
      extractPostName({
        title: 'RRB recruitment',
        posts: [
          { post_name: 'ALP', vacancies: 100 },
          { post_name: 'Technician', vacancies: 200 },
        ],
      })
    ).toBe('ALP, Technician')
  })
})

describe('formatPostNameWithVacancy', () => {
  it('prefers short post name over title', () => {
    expect(
      formatPostNameWithVacancy({
        title: 'UPSC Civil Services Examination 2026',
        detail: { post_name: 'IAS / IPS' },
        vacancies: 1000,
      })
    ).toBe('IAS / IPS')
  })
})
