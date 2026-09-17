export type OrgSourceHealthStatus = "healthy" | "degraded" | "broken" | "stale" | "unknown"

export type PublicSourceHealthRow = {
  sourceCode: string
  homepageUrl: string
  recruitmentUrl?: string | null
  healthStatus: string
  lastCheckedAt?: string | null
  acceptedCount?: number
  discoveredCount?: number
}

export function hostnameOfUrl(url: string | null | undefined): string {
  if (!url) return ""
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase()
  } catch {
    return ""
  }
}

export function normalizeHealthStatus(value: string | null | undefined): OrgSourceHealthStatus {
  const raw = String(value || "").trim().toUpperCase()
  if (raw === "HEALTHY") return "healthy"
  if (raw === "DEGRADED") return "degraded"
  if (raw === "BROKEN" || raw === "BLOCKED") return "broken"
  if (raw === "STALE") return "stale"
  return "unknown"
}

export function matchSourceHealth(
  host: string,
  rows: PublicSourceHealthRow[]
): PublicSourceHealthRow | null {
  const needle = hostnameOfUrl(host.startsWith("http") ? host : `https://${host}`)
  if (!needle) return null
  const matches = rows.filter((row) => {
    const home = hostnameOfUrl(row.homepageUrl)
    const recruit = hostnameOfUrl(row.recruitmentUrl)
    return home === needle || recruit === needle || home.endsWith(`.${needle}`) || needle.endsWith(`.${home}`)
  })
  if (!matches.length) return null
  const rank = (status: string) => {
    const n = normalizeHealthStatus(status)
    if (n === "healthy") return 0
    if (n === "degraded") return 1
    if (n === "stale") return 2
    if (n === "broken") return 3
    return 4
  }
  return [...matches].sort((a, b) => {
    const byStatus = rank(a.healthStatus) - rank(b.healthStatus)
    if (byStatus !== 0) return byStatus
    return String(b.lastCheckedAt || "").localeCompare(String(a.lastCheckedAt || ""))
  })[0] ?? null
}

export function pickMostCommonHost(urls: Array<string | null | undefined>): string {
  const counts = new Map<string, number>()
  for (const url of urls) {
    const host = hostnameOfUrl(url)
    if (!host) continue
    counts.set(host, (counts.get(host) || 0) + 1)
  }
  let best = ""
  let bestCount = 0
  for (const [host, count] of counts) {
    if (count > bestCount) {
      best = host
      bestCount = count
    }
  }
  return best
}
