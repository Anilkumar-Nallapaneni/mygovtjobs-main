import { STATES } from '@/data/states'
import { CATS } from '@/data/categories'
import { isNationwideAllStatesJob } from '@/data/jobRegion'
import { resolveJobCategory } from '@/utils/jobCategory'

const STATE_NAME_TO_ID = Object.fromEntries(STATES.map((s) => [s.n, s.id]))

/** Single pass — state listing counts + category listing counts. */
export function computeJobAggregates(jobs) {
  const stateCounts = Object.fromEntries(STATES.map((s) => [s.id, 0]))
  const categoryCounts = Object.fromEntries(CATS.map((c) => [c.id, 0]))

  for (const job of jobs) {
    const cat = resolveJobCategory(job)
    if (categoryCounts[cat] !== undefined) categoryCounts[cat] += 1

    if (isNationwideAllStatesJob(job)) continue

    const ids = job.stateIds
    if (Array.isArray(ids) && ids.length) {
      for (const id of ids) {
        if (stateCounts[id] !== undefined) stateCounts[id] += 1
      }
      continue
    }

    const stateId = STATE_NAME_TO_ID[job.state]
    if (stateId && stateCounts[stateId] !== undefined) stateCounts[stateId] += 1
  }

  return { stateCounts, categoryCounts }
}
