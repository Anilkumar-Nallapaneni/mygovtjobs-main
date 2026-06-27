import type { CatalogStats } from '@/utils/liveJobsPipeline'

export type HeadlineStats = {
  notifications: number
  vacancies: number
  orgs: number
}

/** Notifications · vacancies · orgs — uses live-notice totals only (expired excluded). */
export function deriveHeadlineStats(
  catalogStats: CatalogStats | null | undefined,
  liveCount: number,
  orgCount: number
): HeadlineStats {
  const notifications =
    Number(catalogStats?.liveNotices) ||
    liveCount ||
    Number(catalogStats?.totalNotices) ||
    0
  const vacancies = Number(catalogStats?.vacancies) || 0
  return {
    notifications,
    vacancies,
    orgs: orgCount,
  }
}
