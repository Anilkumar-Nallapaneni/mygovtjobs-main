/** Job list filters — hide draft/pending/noise and expired listings from browse UI. */

import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob } from '@/utils/officialDomains'

const DAY_MS = 86400000

/**
 * Kept for callers/tests that still pass a grace argument.
 * Browse no longer waits — expired / past-deadline jobs are hidden immediately.
 */
export const EXPIRED_GRACE_DAYS = 0

type JobDeadlineLike = {
  status?: string | null
  lastDate?: string | null
  last_date?: string | null
}

export function parseLastDate(value: unknown): Date | null {
  if (!value || value === '—') return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysSinceDeadline(job: JobDeadlineLike, nowMs: number = Date.now()): number | null {
  const last = parseLastDate(job?.lastDate ?? job?.last_date)
  if (!last) return null
  return Math.ceil((nowMs - last.getTime()) / DAY_MS)
}

/** True when apply deadline has passed — used for badges, stats, and browse hiding. */
export function isJobExpired(job: JobDeadlineLike, nowMs: number = Date.now()): boolean {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'expired') return true

  const last = parseLastDate(job?.lastDate ?? job?.last_date)
  if (last) {
    const daysLeft = Math.ceil((last.getTime() - nowMs) / DAY_MS)
    if (daysLeft < 0) return true
  }
  return false
}

/** Hide draft/pending and any expired / past-deadline job from browse lists. */
export function shouldHideFromBrowse(
  job: JobDeadlineLike,
  _graceDays: number = EXPIRED_GRACE_DAYS,
  nowMs: number = Date.now()
): boolean {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'draft' || status === 'pending') return true
  if (isJobExpired(job, nowMs)) return true
  return false
}

/** Hide draft/pending, noise, aggregators, and expired jobs from list views. */
export function filterDisplayJobs(jobs: unknown, nowMs: number = Date.now()): JobDeadlineLike[] {
  if (!Array.isArray(jobs)) return []
  return jobs.filter((j) => {
    if (!j || isPortalNoiseJob(j)) return false
    if (!isAllowedOfficialJob(j)) return false
    if (shouldHideFromBrowse(j, EXPIRED_GRACE_DAYS, nowMs)) return false
    const status = String(j?.status || '').toLowerCase()
    return status !== 'draft' && status !== 'pending'
  })
}
