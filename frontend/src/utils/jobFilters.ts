/** Job list filters — hide draft/pending/noise and expired listings from browse UI. */

import { isPortalNoiseJob } from '@/utils/jobNoiseFilter'
import { isAllowedOfficialJob } from '@/utils/officialDomains'

const DAY_MS = 86400000

/** Days after apply deadline before a job disappears from browse lists. */
export const EXPIRED_GRACE_DAYS = 30

export function parseLastDate(value) {
  if (!value || value === '—') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysSinceDeadline(job) {
  const last = parseLastDate(job?.lastDate)
  if (!last) return null
  return Math.ceil((Date.now() - last.getTime()) / DAY_MS)
}

/** True when apply deadline has passed — used for badges and hero "live" stats. */
export function isJobExpired(job) {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'expired') return true

  const last = parseLastDate(job?.lastDate)
  if (last) {
    const daysLeft = Math.ceil((last.getTime() - Date.now()) / DAY_MS)
    if (daysLeft < 0) return true
  }
  return false
}

/** Hide from browse after grace period (ROADMAP 2.10). */
export function shouldHideFromBrowse(job, graceDays = EXPIRED_GRACE_DAYS) {
  const status = String(job?.status || '').toLowerCase()
  if (status === 'draft' || status === 'pending') return true

  const since = daysSinceDeadline(job)
  if (since !== null && since > graceDays) return true
  if (status === 'expired' && since === null) return true

  return false
}

/** Hide draft/pending rows, portal noise, and jobs past grace from list views. */
export function filterDisplayJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter((j) => {
    if (!j || isPortalNoiseJob(j)) return false
    if (!isAllowedOfficialJob(j)) return false
    if (shouldHideFromBrowse(j)) return false
    const status = String(j?.status || '').toLowerCase()
    return status !== 'draft' && status !== 'pending'
  })
}
