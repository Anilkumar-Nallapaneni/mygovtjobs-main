/**
 * Official recruitment URLs only — block third-party job-aggregator domains.
 * Host lists live in shared/official-hosts.json (single source of truth).
 */
import hostsCatalog from '@shared/official-hosts.json'
import { collectPdfUrls, looksLikeNotificationDocument } from '@/utils/resolvePdfUrl'

const LEGACY_CATALOG_SOURCES = new Set(['structured-import', 'fja-import'])

/** True for rows imported from a legacy third-party catalog (never shown in live listings). */
export function isStructuredImportSource(source: unknown): boolean {
  return LEGACY_CATALOG_SOURCES.has(String(source || ''))
}

function isCatalogImportDetail(detail: unknown): boolean {
  if (!detail || typeof detail !== 'object') return false
  const d = detail as Record<string, unknown>
  if (isStructuredImportSource(d.source)) return true
  return String(d.data_origin || '').toLowerCase() === 'freejobalert'
}

const BLOCKED_HOST_NAMES = [
  ...hostsCatalog.blockedAggregators,
  ...hostsCatalog.blockedCommercialBoards,
]

const BLOCKED_HOST_RE = new RegExp(`(?:^|\\.)(?:${BLOCKED_HOST_NAMES.map(escapeRegExp).join('|')})\\.`, 'i')

const BLOCKED_TEXT_RE = new RegExp(hostsCatalog.blockedAggregators.map(escapeRegExp).join('|'), 'i')

const OFFICIAL_HOST_RE = /\.(gov|nic|ac|org|res|edu)\.in$/i
const ERNET_IN_RE = /\.ernet\.in$/i
const BANK_IN_RE = /\.bank\.in$/i
const COOP_TLD_RE = /\.coop$/i
const GOOGLE_FILE_RE = /drive\.google\.com\/file\/d\/|docs\.google\.com\/forms\//i
const FORMS_SHORT_RE = /^https?:\/\/(www\.)?forms\.gle\//i
const SAIL_S3_RE = /aima-web-images\.s3\.ap-south-1\.amazonaws\.com\/sailcareers\.com\//i

const PSU_PREFIX_RE = new RegExp(
  `^(www\\.)?(${hostsCatalog.psuPrefixes.map(escapeRegExp).join('|')})\\.`,
  'i'
)

const OFFICIAL_STEMS = hostsCatalog.officialStems

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function containsBlockedBrandText(...parts: unknown[]): boolean {
  const hay = parts.filter(Boolean).join(' ')
  return BLOCKED_TEXT_RE.test(hay)
}

export function isBlockedAggregatorHost(url: string): boolean {
  const host = hostnameOf(url)
  if (!host) return false
  return BLOCKED_HOST_RE.test(host) || containsBlockedBrandText(host)
}

export function isOfficialRecruitmentUrl(url: string): boolean {
  if (!url || url === '#') return false
  if (isBlockedAggregatorHost(url)) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    if (OFFICIAL_HOST_RE.test(host)) return true
    if (ERNET_IN_RE.test(host)) return true
    if (BANK_IN_RE.test(host)) return true
    if (COOP_TLD_RE.test(host)) return true
    if ((host === 'drive.google.com' || host === 'docs.google.com') && GOOGLE_FILE_RE.test(url)) {
      return true
    }
    if (host === 'forms.gle' || FORMS_SHORT_RE.test(url)) return true
    if (SAIL_S3_RE.test(url)) return true
    if (host.endsWith('.gov')) return true
    if (/\.gov\.[a-z]{2,}$/.test(host)) return true
    if (PSU_PREFIX_RE.test(host)) return true
    if (host === 'pib.gov.in' || host.endsWith('.pib.gov.in')) return true
    if (OFFICIAL_STEMS.some((stem) => host === stem || host.endsWith(`.${stem}`))) return true
    // Hindi / IDN government hosts (punycode) serving DRDO, NIC, etc.
    if (host.includes('xn--') && /\/(drdo|nic|gov)\//.test(path)) return true
    return false
  } catch {
    return false
  }
}

function collectSectionLinks(job: Record<string, unknown> | null | undefined): string[] {
  const detail = job?.detail as { content_sections?: Array<{ links?: Array<{ url?: string }> }> } | undefined
  const sections = detail?.content_sections
  if (!Array.isArray(sections)) return []
  return sections.flatMap((section) => (section?.links || []).map((link) => link?.url).filter(Boolean) as string[])
}

/** Primary outbound URLs — excludes scraped section promos (Telegram/WhatsApp, etc.). */
export function collectPrimaryJobUrls(job: Record<string, unknown> | null | undefined): string[] {
  const detail = (job?.detail || {}) as Record<string, unknown>
  return [
    job?.applyUrl,
    job?.officialUrl,
    job?.pdfUrl,
    job?.pdf_url,
    job?.apply_url,
    detail.pdf_url,
    detail.pdfUrl,
    detail.notification_url,
    detail.link,
    detail.source_url,
    ...(Array.isArray(detail.pdf_urls) ? detail.pdf_urls : []),
    ...(Array.isArray(detail.pdfUrls) ? detail.pdfUrls : []),
  ].filter(Boolean) as string[]
}

export function collectJobUrls(job: Record<string, unknown> | null | undefined): string[] {
  return [...collectPrimaryJobUrls(job), ...collectSectionLinks(job)]
}

export function isStructuredCatalogJob(job: Record<string, unknown> | null | undefined): boolean {
  return isCatalogImportDetail(job?.detail)
}

export function rowHasBlockedHost(job: Record<string, unknown> | null | undefined): boolean {
  const urls = isStructuredCatalogJob(job) ? collectPrimaryJobUrls(job) : collectJobUrls(job)
  return urls.some((u) => isBlockedAggregatorHost(u))
}

/** Outbound links restricted to official domains. */
export function sanitizeOfficialUrls(job: Record<string, unknown> | null | undefined) {
  const applyUrl = pickOfficialDetailUrl(job)
  const pdfs = collectPdfUrls(job)
  let pdfUrl = pdfs[0] || (job?.pdfUrl as string | undefined) || (job?.pdf_url as string | undefined) || null
  if (pdfUrl && !isOfficialRecruitmentUrl(pdfUrl)) pdfUrl = pdfs[0] || null
  if (!pdfUrl && applyUrl && /\.pdf(\?|$)/i.test(applyUrl)) pdfUrl = applyUrl

  return {
    applyUrl: applyUrl || '#',
    officialUrl: applyUrl || '#',
    pdfUrl: pdfUrl || null,
    pdfUrls: pdfs,
  }
}

export function isPdfUrl(url: string): boolean {
  return looksLikeNotificationDocument(String(url || ''))
}

/** Prefer an official portal page; fall back to an official notification PDF. */
export function pickOfficialDetailUrl(job: Record<string, unknown> | null | undefined): string | null {
  const official = collectJobUrls(job).filter((u) => isOfficialRecruitmentUrl(u))
  const portal = official.find((u) => !isPdfUrl(u))
  return portal || official[0] || null
}

/** Single outbound apply link for UI — portal first, then official PDF. */
export function resolveOfficialApplyHref(job: Record<string, unknown> | null | undefined): string | null {
  return pickOfficialDetailUrl(job)
}

/**
 * Show listing only when it points at an official portal and has no aggregator links.
 */
export function isAllowedOfficialJob(job: Record<string, unknown> | null | undefined): boolean {
  if (!job) return false
  if (containsBlockedBrandText(job.title, job.dept, job.about)) return false
  if (rowHasBlockedHost(job)) return false
  return Boolean(pickOfficialDetailUrl(job))
}
