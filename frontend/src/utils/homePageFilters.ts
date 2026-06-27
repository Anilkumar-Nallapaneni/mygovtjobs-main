import { STATES } from '@/data/states'
import { isNationwideAllStatesJob, jobMatchesNationwideFilter, jobMatchesStateFilter } from '@/data/jobRegion'
import { getProfessionBySlug, jobMatchesProfession } from '@/data/professions'
import { getQualificationBySlug, jobMatchesQualification } from '@/data/qualifications'
import { jobMatchesEducationFilterKey } from '@/utils/educationVacancySummary'
import { getOrgBySlug } from '@/data/orgIndex'
import { jobMatchesOrgDept, jobMatchesOrgEntry } from '@/utils/orgSlug'
import { isExpiringSoonJob } from '@/utils/latestNotificationsFilters'
import { resolveJobQualification } from '@/utils/jobQualification'
import { isJobExpired } from '@/utils/jobFilters'
import { jobMatchesSearch } from '@/utils/jobSearch'
import type { JobRecord } from '@/types/job'
import { vacancyCountForStats } from '@/components/home/homePageConstants'

export const HOME_SORT_KEYS = ['lastDate', 'vacancies', 'expiringSoon'] as const
export type HomeSortKey = (typeof HOME_SORT_KEYS)[number]

export const HERO_STAT_FILTER_KEYS = ['vacancies', 'hotNew', 'states', 'live'] as const
export type HeroStatFilterKey = (typeof HERO_STAT_FILTER_KEYS)[number]

export function jobMatchesHeroStatFilter(job: JobRecord, statKey: string) {
  switch (statKey) {
    case 'vacancies':
      return vacancyCountForStats(job) > 0
    case 'hotNew':
      return job?.status === 'hot' || job?.status === 'new'
    case 'states':
      if (isNationwideAllStatesJob(job)) return false
      return STATES.some((s) => jobMatchesStateFilter(job, s.id))
    case 'live':
      return !isJobExpired(job)
    default:
      return true
  }
}

function sortJobs(j: JobRecord[], sort: HomeSortKey) {
  if (sort === 'vacancies') {
    j.sort((a, b) => b.vacancies - a.vacancies)
    return
  }
  if (sort === 'expiringSoon') {
    j.sort((a, b) => {
      const aExpired = a.status === 'expired' ? 1 : 0
      const bExpired = b.status === 'expired' ? 1 : 0
      if (aExpired !== bExpired) return aExpired - bExpired
      const aSoon = isExpiringSoonJob(a) ? 0 : 1
      const bSoon = isExpiringSoonJob(b) ? 0 : 1
      if (aSoon !== bSoon) return aSoon - bSoon
      return new Date(String(a.lastDate)).getTime() - new Date(String(b.lastDate)).getTime()
    })
    return
  }
  if (sort === 'lastDate') {
    j.sort((a, b) => {
      const aExpired = a.status === 'expired' ? 1 : 0
      const bExpired = b.status === 'expired' ? 1 : 0
      if (aExpired !== bExpired) return aExpired - bExpired
      return new Date(String(a.lastDate)).getTime() - new Date(String(b.lastDate)).getTime()
    })
  }
}

export type HomePageFilterInput = {
  jobs: JobRecord[]
  selectedState?: string | null
  activeCat?: string | null
  search?: string
  quickFilter?: string | null
  heroStatFilter?: string | null
  sort?: HomeSortKey
  qualificationSlug?: string | null
  professionSlug?: string | null
  orgDept?: string | null
  orgSlug?: string | null
  allIndiaOnly?: boolean
}

/** Pure filter + sort used by HomePage job list. */
export function filterHomePageJobs({
  jobs,
  selectedState = null,
  activeCat = null,
  search = '',
  quickFilter = null,
  heroStatFilter = null,
  sort = 'lastDate',
  qualificationSlug = null,
  professionSlug = null,
  orgDept = null,
  orgSlug = null,
  allIndiaOnly = false,
}: HomePageFilterInput): JobRecord[] {
  let j = [...jobs]

  if (allIndiaOnly) {
    j = j.filter((x) => jobMatchesNationwideFilter(x))
  } else if (selectedState && !search.trim()) {
    j = j.filter((x) => jobMatchesStateFilter(x, selectedState))
  }

  if (search.trim()) {
    j = j.filter((x) => jobMatchesSearch(x, search))
  }

  if (activeCat) j = j.filter((x) => x.category === activeCat)

  const professionDef = getProfessionBySlug(professionSlug)
  if (professionDef) {
    j = j.filter((x) => jobMatchesProfession(x, professionDef))
  } else {
    const qualDef = getQualificationBySlug(qualificationSlug)
    if (qualDef) {
      j = j.filter((x) => jobMatchesQualification(x, qualDef))
    } else if (quickFilter) {
    j = j.filter((x) => {
      if ((x as { eduFilterKey?: string }).eduFilterKey === quickFilter) return true
      const q = resolveJobQualification(x)
      if (q.key === quickFilter) return true
      return jobMatchesEducationFilterKey(x, quickFilter)
    })
    }
  }

  const orgEntry = orgSlug ? getOrgBySlug(orgSlug) : null
  if (orgEntry) {
    j = j.filter((x) => jobMatchesOrgEntry(x, orgEntry))
  } else if (orgDept) {
    j = j.filter((x) => jobMatchesOrgDept(x, orgDept))
  }

  if (heroStatFilter) {
    j = j.filter((x) => jobMatchesHeroStatFilter(x, heroStatFilter))
  }

  sortJobs(j, sort)
  return j
}

export function filterNationwideJobsForState({
  jobs,
  selectedState,
  search = '',
  activeCat = null,
  quickFilter = null,
  sort = 'lastDate',
  limit = 16,
}: HomePageFilterInput & { limit?: number }): JobRecord[] {
  if (!selectedState || search.trim() || activeCat || quickFilter) return []
  let j = jobs.filter((x) => jobMatchesNationwideFilter(x))
  sortJobs(j, sort)
  return j.slice(0, limit)
}
