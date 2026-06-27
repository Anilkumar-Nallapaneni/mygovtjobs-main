import { describe, expect, it } from 'vitest'
import { deriveHeadlineStats } from '@/utils/headlineStats'

describe('deriveHeadlineStats', () => {
  it('prefers live notice totals over stale totals', () => {
    expect(
      deriveHeadlineStats(
        { totalNotices: 404, vacancies: 67962, noticesWithVacancies: 200, liveNotices: 380 },
        120,
        48
      )
    ).toEqual({ notifications: 380, vacancies: 67962, orgs: 48 })
  })

  it('falls back to live count when catalog is empty', () => {
    expect(deriveHeadlineStats(null, 55, 10)).toEqual({
      notifications: 55,
      vacancies: 0,
      orgs: 10,
    })
  })
})
