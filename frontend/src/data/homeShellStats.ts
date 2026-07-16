import type { CatalogStats } from '@/utils/liveJobsPipeline'
import type { HeadlineStats } from '@/utils/headlineStats'

/** Last-known production totals — paints headline stats before Supabase responds. */
export const HOME_SHELL_HEADLINE_STATS: HeadlineStats = {
  notifications: 874,
  vacancies: 55_597,
  orgs: 75,
}

/** Avoid importing full ORG_INDEX / OFFICIAL_SITES just for counts on the home shell. */
export const HOME_SHELL_ORG_COUNT = 79
export const HOME_SHELL_OFFICIAL_SOURCE_COUNT = 153

export const HOME_SHELL_CATALOG_STATS: CatalogStats = {
  totalNotices: 874,
  liveNotices: 874,
  vacancies: 55_597,
  noticesWithVacancies: 420,
}

export const HOME_SHELL_HERO_STATS = {
  posts: 55_597,
  withPostCount: 420,
  hotNew: 86,
  states: 28,
  stateListings: 812,
  live: 874,
}
