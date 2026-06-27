import { STATES } from '@/data/states'

/** Build searchable haystack for a job card / live row. */
export function jobSearchHaystack(job) {
  const stateNames = (job.stateIds || [])
    .map((id) => STATES.find((s) => s.id === id)?.n || id)
    .join(' ')
  const parts = [
    job.title,
    job.dept,
    job.state,
    job.category,
    job.qual,
    job.about,
    job.slug,
    job.type,
    stateNames,
    ...(job.stateIds || []),
  ]
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** True if job matches free-text query (supports multi-word). */
export function jobMatchesSearch(job, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true

  const hay = jobSearchHaystack(job)
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.length) return true

  return tokens.every((token) => hay.includes(token))
}
