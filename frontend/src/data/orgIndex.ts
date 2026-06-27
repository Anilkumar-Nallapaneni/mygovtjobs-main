import type { OrgIndexEntry } from '@/utils/orgSlug'

import rawIndex from '@/data/org-index.json'

export const ORG_INDEX: OrgIndexEntry[] = Array.isArray(rawIndex) ? rawIndex : []

export function getOrgBySlug(slug: string | null | undefined): OrgIndexEntry | null {
  if (!slug) return null
  const normalized = slug.toLowerCase()
  return ORG_INDEX.find((row) => row.slug === normalized) ?? null
}
