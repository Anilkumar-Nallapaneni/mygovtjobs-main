export type OrgIndexEntry = {
  slug: string
  dept: string
  count: number
  vacancies: number
}

export function slugifyOrg(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function deptForOrgSlug(slug: string, index: OrgIndexEntry[]): string | null {
  const normalized = slug.toLowerCase()
  const row = index.find((entry) => entry.slug === normalized)
  return row?.dept ?? null
}

export function normalizeDeptName(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function jobMatchesOrgDept(
  job: { dept?: string | null },
  dept: string | null | undefined
): boolean {
  if (!dept) return false
  return normalizeDeptName(job.dept) === normalizeDeptName(dept)
}

/** Match jobs to an org index row — exact dept, substring, slug tokens, or parenthetical acronym. */
export function jobMatchesOrgEntry(
  job: { dept?: string | null },
  entry: OrgIndexEntry | null | undefined
): boolean {
  if (!entry) return false
  const jobDept = normalizeDeptName(job.dept)
  const entryDept = normalizeDeptName(entry.dept)
  if (!jobDept) return false
  if (jobDept === entryDept) return true
  if (entryDept.includes(jobDept) || jobDept.includes(entryDept)) return true

  const acronym = entry.dept.match(/\(([^)]+)\)/)?.[1]
  if (acronym && jobDept.includes(normalizeDeptName(acronym))) return true

  const slugTokens = entry.slug.split('-').filter((token) => token.length > 2)
  return slugTokens.some((token) => jobDept.includes(token))
}
