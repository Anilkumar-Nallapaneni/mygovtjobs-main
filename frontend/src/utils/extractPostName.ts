import type { JobRecord } from '@/types/job'

function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

type PostRow = {
  post_name?: string
  post?: string
  name?: string
}

const TITLE_PATTERNS = [
  /\bfor\s+the\s+post\s+of\s+(.+?)(?:\s+against|\s+in\s+|\s+at\s+|\.|,|$)/i,
  /\brecruitment\s+of\s+(.+?)(?:\s+against|\s+in\s+|\.|,|$)/i,
  /\bpost\s+name\s*[:-]\s*(.+?)(?:\.|,|$)/i,
]

function postsFromJob(job: JobRecord): PostRow[] {
  const apiPosts = job.posts
  if (Array.isArray(apiPosts) && apiPosts.length) return apiPosts as PostRow[]
  const detailPosts = job.detail?.posts
  if (Array.isArray(detailPosts) && detailPosts.length) return detailPosts as PostRow[]
  return []
}

function labelFromPosts(posts: PostRow[]): string {
  const names = posts
    .map((p) => clean(p.post_name || p.post || p.name))
    .filter((n) => n.length >= 2)
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  if (names.length <= 3) return names.join(', ')
  return `${names[0]} + ${names.length - 1} more`
}

/** Short post label separate from long recruitment title. */
export function extractPostName(job: JobRecord | null | undefined): string {
  if (!job) return ''

  const explicit = clean(job.post_name || job.detail?.post_name)
  if (explicit) return explicit

  const fromPosts = labelFromPosts(postsFromJob(job))
  if (fromPosts) return fromPosts

  const title = clean(job.title)
  for (const pattern of TITLE_PATTERNS) {
    const match = title.match(pattern)
    const candidate = clean(match?.[1])
    if (candidate.length >= 2 && candidate.length <= 120) return candidate
  }

  const stripped = title.match(/^(.+?)\s*[-–]\s*\d[\d,]*\s+posts?$/i)
  if (stripped?.[1]) return clean(stripped[1])

  return ''
}

export function formatPostNameWithVacancy(job: JobRecord): string {
  const post = extractPostName(job)
  const vacancies = Number(job.vacancies) || 0
  if (post) return post
  const title = clean(job.title)
  if (vacancies > 0 && !/posts?\b/i.test(title)) {
    return `${title} – ${vacancies.toLocaleString('en-IN')} Posts`
  }
  return title
}
