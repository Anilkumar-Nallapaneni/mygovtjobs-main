import { isBlockedAggregatorHost, isOfficialRecruitmentUrl } from '@/utils/officialDomains'

const PDF_PATH_RE =
  /\.pdf(\?|#|$)|\/pdf\/|\/writereaddata\/|\/documents\/|\/attachments\/|\/uploads\/|notification.*\.pdf|advt.*\.pdf/i

const PDF_VIEWER_RE = /ViewPdf\.aspx|ViewFile\.aspx|viewpdf\.aspx|viewfile\.aspx|getfile\.aspx/i

/** True if URL likely points at a notification document (PDF or gov document path). */
export function looksLikeNotificationDocument(url: string): boolean {
  const u = String(url || '').trim()
  if (!u) return false
  if (/\.pdf(\?|#|$)/i.test(u)) return true
  if (PDF_VIEWER_RE.test(u)) return true
  if (PDF_PATH_RE.test(u)) return true
  if (/[?&](?:file|doc|document)=/i.test(u) && /\.pdf/i.test(u)) return true
  return false
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    const u = String(raw || '').trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

/** Collect every official notification PDF / document URL on a job row. */
export function collectPdfUrls(row: Record<string, unknown> | null | undefined): string[] {
  const detail = (row?.detail || {}) as Record<string, unknown>
  const candidates: string[] = []

  const push = (u: unknown) => {
    if (typeof u === 'string' && u.trim()) candidates.push(u.trim())
  }

  push(row?.pdf_url)
  push(row?.pdfUrl)
  push(detail.pdf_url)
  push(detail.pdfUrl)
  push(detail.notification_url)

  for (const key of ['pdf_urls', 'pdfUrls']) {
    const list = detail[key]
    if (Array.isArray(list)) list.forEach(push)
  }

  const apply = (row?.apply_url || row?.applyUrl) as string | undefined
  if (apply && looksLikeNotificationDocument(apply)) push(apply)

  return uniqueUrls(candidates).filter(
    (u) => !isBlockedAggregatorHost(u) && isOfficialRecruitmentUrl(u) && looksLikeNotificationDocument(u)
  )
}

/** Best official PDF link for a live/API job row. */
export function resolvePdfUrl(row: Record<string, unknown> | null | undefined): string {
  const official = collectPdfUrls(row)
  if (official.length) return official[0]

  const detail = (row?.detail || {}) as Record<string, unknown>
  const fallback = detail.pdf_url || detail.pdfUrl
  if (typeof fallback === 'string' && fallback.trim() && !isBlockedAggregatorHost(fallback)) {
    return fallback.trim()
  }

  const list = detail.pdf_urls || detail.pdfUrls
  if (Array.isArray(list)) {
    const hit = list.find((u) => typeof u === 'string' && u.trim() && !isBlockedAggregatorHost(u))
    if (hit) return String(hit).trim()
  }

  return ''
}
