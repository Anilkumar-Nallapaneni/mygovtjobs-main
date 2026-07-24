import type { CatalogStats } from '@/utils/liveJobsPipeline'
import type { HeadlineStats } from '@/utils/headlineStats'

/** Last-known production totals — paints headline stats before Supabase responds. */
export const HOME_SHELL_HEADLINE_STATS: HeadlineStats = {
  notifications: 1624,
  vacancies: 8249,
  orgs: 75,
}

/** Avoid importing full ORG_INDEX / OFFICIAL_SITES just for counts on the home shell. */
export const HOME_SHELL_ORG_COUNT = 79
export const HOME_SHELL_OFFICIAL_SOURCE_COUNT = 153

export const HOME_SHELL_CATALOG_STATS: CatalogStats = {
  totalNotices: 1624,
  liveNotices: 1624,
  vacancies: 8249,
  noticesWithVacancies: 172,
}

export const HOME_SHELL_HERO_STATS = {
  posts: 8249,
  withPostCount: 172,
  hotNew: 86,
  states: 28,
  stateListings: 812,
  live: 1624,
}
