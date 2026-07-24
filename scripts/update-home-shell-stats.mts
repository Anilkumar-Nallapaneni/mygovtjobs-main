import { readFileSync, writeFileSync } from 'fs'
import { processLiveJobPayload } from '../frontend/src/utils/liveJobsPipeline.ts'

const data = JSON.parse(readFileSync('frontend/public/data/live-jobs.json', 'utf8'))
const { rows, stats } = processLiveJobPayload(data.items || data.jobs)
console.log(JSON.stringify({ rows: rows.length, stats }))

const n = stats.liveNotices
const v = stats.vacancies
const w = stats.noticesWithVacancies

const body = `import type { CatalogStats } from '@/utils/liveJobsPipeline'
import type { HeadlineStats } from '@/utils/headlineStats'

/** Last-known production totals — paints headline stats before Supabase responds. */
export const HOME_SHELL_HEADLINE_STATS: HeadlineStats = {
  notifications: ${n},
  vacancies: ${v},
  orgs: 75,
}

/** Avoid importing full ORG_INDEX / OFFICIAL_SITES just for counts on the home shell. */
export const HOME_SHELL_ORG_COUNT = 79
export const HOME_SHELL_OFFICIAL_SOURCE_COUNT = 153

export const HOME_SHELL_CATALOG_STATS: CatalogStats = {
  totalNotices: ${n},
  liveNotices: ${n},
  vacancies: ${v},
  noticesWithVacancies: ${w},
}

export const HOME_SHELL_HERO_STATS = {
  posts: ${v},
  withPostCount: ${w},
  hotNew: 86,
  states: 28,
  stateListings: 812,
  live: ${n},
}
`

writeFileSync('frontend/src/data/homeShellStats.ts', body)
console.log('updated homeShellStats.ts')
