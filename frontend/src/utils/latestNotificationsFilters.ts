import type { CategoryId } from '@/data/categories'
import { jobMatchesNationwideFilter, jobMatchesStateFilter } from '@/data/jobRegion'
import { NE_SUBSTATE_IDS, getLatestNotifStateChip } from '@/data/statesChips'
import { getProfessionBySlug, jobMatchesProfession } from '@/data/professions'
import { resolveJobCategory } from '@/utils/jobCategory'
import { resolveJobQualification } from '@/utils/jobQualification'
import { jobMatchesEducationFilterKey } from '@/utils/educationVacancySummary'
import { isJobExpired, parseLastDate } from '@/utils/jobFilters'
import type { JobRecord } from '@/types/job'

const DAY_MS = 86400000
export const EXPIRING_SOON_DAYS = 7

/** Category chips that route through profession matching (broader than category id alone). */
export const PROFESSION_CHIP_FOR_CATEGORY: Partial<Record<CategoryId, string>> = {
  health: 'medical',
  engineering: 'engineering',
}

/** Host/title hints for jobs still tagged with umbrella `ne` state code. */
const NE_SUBSTATE_HINTS: Record<string, RegExp> = {
  ar: /arunachal/i,
  mn: /manipur/i,
  ml: /meghalaya/i,
  mz: /mizoram/i,
  nl: /nagaland/i,
  tr: /tripura/i,
}

function jobStateProbe(job: JobRecord) {
  const detail = job?.detail as { notification_url?: string; summary?: string } | undefined
  return [
    job?.title,
    job?.dept,
    job?.about,
    detail?.summary,
    job?.applyUrl,
    detail?.notification_url,
  ]
    .filter(Boolean)
    .join(' ')
}

function neSubstateFromJob(job: JobRecord): string | null {
  const probe = jobStateProbe(job)
  for (const id of NE_SUBSTATE_IDS) {
    if (NE_SUBSTATE_HINTS[id]?.test(probe)) return id
  }
  return null
}

/** State filter for latest-notifications chips (36 states/UTs + NE split). */
export function jobMatchesLatestNotifStateFilter(job: JobRecord, stateId: string | null): boolean {
  if (!stateId) return true
  if (stateId === 'all') return jobMatchesNationwideFilter(job)
  if (jobMatchesStateFilter(job, stateId)) return true

  const ids = job?.stateIds
  if (!Array.isArray(ids) || !ids.includes('ne')) return false
  if (!NE_SUBSTATE_HINTS[stateId]) return false
  return neSubstateFromJob(job) === stateId
}

export type LatestNotifJobFilter = {
  stateId?: string | null
  categoryId?: CategoryId | null
  professionSlug?: string | null
  quickFilter?: string | null
  expiringOnly?: boolean
}

export function isExpiringSoonJob(job: JobRecord, withinDays = EXPIRING_SOON_DAYS): boolean {
  if (String(job?.status || '').toLowerCase() === 'expired') return false
  const last = parseLastDate(job?.lastDate)
  if (!last) return false
  const daysLeft = Math.ceil((last.getTime() - Date.now()) / DAY_MS)
  return daysLeft >= 0 && daysLeft <= withinDays
}

export function filterLatestNotificationJobs(
  jobs: JobRecord[],
  {
    stateId = null,
    categoryId = null,
    professionSlug = null,
    quickFilter = null,
    expiringOnly = false,
  }: LatestNotifJobFilter
): JobRecord[] {
  let rows = jobs.filter((job) => !isJobExpired(job))

  if (stateId === 'all') {
    rows = rows.filter((job) => jobMatchesNationwideFilter(job))
  } else if (stateId) {
    rows = rows.filter((job) => jobMatchesLatestNotifStateFilter(job, stateId))
  }

  const professionDef = getProfessionBySlug(professionSlug)
  if (professionDef) {
    rows = rows.filter((job) => jobMatchesProfession(job, professionDef))
  } else if (categoryId) {
    rows = rows.filter((job) => resolveJobCategory(job) === categoryId)
  }

  if (quickFilter) {
    rows = rows.filter((job) => {
      if ((job as { eduFilterKey?: string }).eduFilterKey === quickFilter) return true
      const q = resolveJobQualification(job)
      if (q.key === quickFilter) return true
      return jobMatchesEducationFilterKey(job, quickFilter)
    })
  }

  if (expiringOnly) {
    rows = rows.filter((job) => isExpiringSoonJob(job))
  }

  return rows
}

export function countJobsByState(jobs: JobRecord[]): Record<string, number> {
  const counts: Record<string, number> = { all: 0 }
  for (const job of jobs) {
    if (jobMatchesNationwideFilter(job)) counts.all = (counts.all || 0) + 1
    const matched = new Set<string>()
    const ids = job?.stateIds
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (!id || id === 'all') continue
        if (getLatestNotifStateChip(id)) matched.add(id)
      }
      if (ids.includes('ne')) {
        const sub = neSubstateFromJob(job)
        if (sub) matched.add(sub)
      }
    }
    for (const id of matched) {
      counts[id] = (counts[id] || 0) + 1
    }
  }
  return counts
}
