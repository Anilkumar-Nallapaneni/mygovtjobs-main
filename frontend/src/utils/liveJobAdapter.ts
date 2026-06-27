import { collectPdfUrls, resolvePdfUrl } from '@/utils/resolvePdfUrl'
import { cleanJobTitle, cleanDept } from '@/utils/jobNoiseFilter'
import { enrichJobMetadata, sanitizeVacancyCount } from '@/utils/jobMetadataUtils'
import { isJobExpired, parseLastDate } from '@/utils/jobFilters'
import { resolveStateDisplay } from '@/utils/jobStateResolve'
import { resolveJobQualification } from '@/utils/jobQualification'
import { resolveJobCategory } from '@/utils/jobCategory'
import { isPdfUrl, sanitizeOfficialUrls } from '@/utils/officialDomains'
import {
  collectDetailLinksFromJob,
  resolveJobApplyHref,
  resolveTrustedPdfHref,
} from '@/utils/jobDetailLinks'
function sanitizeDetailForUi(detail) {
  if (!detail || typeof detail !== 'object') return {}
  const out = { ...detail }
  delete out.discovery_ref
  delete out.discovered_via
  return out
}

const DAY_MS = 86400000

function deriveDisplayStatus(
  row: Record<string, unknown>,
  rawStatus: string,
  lastDate: string
): 'expired' | 'hot' | 'new' | 'live' {
  if (rawStatus === 'expired' || isJobExpired({ status: rawStatus, lastDate })) {
    return 'expired'
  }
  if (rawStatus === 'hot') return 'hot'
  if (rawStatus === 'new') return 'new'

  const publishedIso = row.published_at ?? (row.detail as Record<string, unknown> | undefined)?.published
  if (publishedIso) {
    const publishedMs = new Date(String(publishedIso)).getTime()
    if (!Number.isNaN(publishedMs)) {
      const ageDays = (Date.now() - publishedMs) / DAY_MS
      if (ageDays <= 10) return 'new'
      const vac = Number(row.vacancies) || 0
      if (ageDays <= 30 && vac >= 500) return 'hot'
    }
  }

  const last = parseLastDate(lastDate)
  if (last) {
    const daysLeft = Math.ceil((last.getTime() - Date.now()) / DAY_MS)
    if (daysLeft >= 0 && daysLeft <= 7) return 'hot'
    if (daysLeft >= 0 && daysLeft <= 14) return 'new'
  }

  return 'live'
}

/** Map API / Supabase job row → shape used by JobCard / HomePage. */
export function adaptLiveJob(row, index = 0) {
  const { stateIds, stateName } = resolveStateDisplay(row)
  const qualResolved = resolveJobQualification({
    qual: row.qualification,
    title: row.title,
    about: row.detail?.summary,
    dept: row.dept,
    detail: row.detail,
  })

  const category = resolveJobCategory(row)
  const rawStatus = String(row.status || 'live').toLowerCase()
  const lastDate = row.last_date || '—'
  const displayStatus = deriveDisplayStatus(row, rawStatus, lastDate)

  const links = collectDetailLinksFromJob(row)
  const apply = resolveJobApplyHref(row)
  let pdf = resolveTrustedPdfHref(row) || resolvePdfUrl(row)
  if (!pdf) {
    const rawApply = row.apply_url || row.applyUrl
    if (typeof rawApply === 'string' && isPdfUrl(rawApply)) pdf = rawApply
  }
  const pdfUrls = links.filter((l) => isPdfUrl(l.url)).map((l) => l.url)
  const officialFallback = sanitizeOfficialUrls(row)
  const outbound =
    apply ||
    (officialFallback.applyUrl !== '#' ? officialFallback.applyUrl : null) ||
    pdf ||
    null
  const urls = {
    applyUrl: outbound || '#',
    officialUrl: outbound || '#',
    pdfUrl: pdf || officialFallback.pdfUrl,
    pdfUrls: pdfUrls.length ? pdfUrls : pdf ? [pdf] : officialFallback.pdfUrls,
  }
  const title = cleanJobTitle(row.title) || 'Government recruitment'
  const rawVacancies = Number(row.vacancies) || 0
  const vacancies = sanitizeVacancyCount(rawVacancies, title)

  return enrichJobMetadata({
    id: row.id || `live-${index}`,
    slug: row.slug || `live-job-${index}`,
    title,
    dept: cleanDept(row.dept, row.detail?.source),
    state: stateName,
    stateIds,
    category,
    vacancies,
    rawVacancies,
    qual: qualResolved.label || 'See notification',
    eduFilterKey: qualResolved.key,
    lastDate,
    published_at: row.published_at || row.detail?.published || null,
    updated_at: row.updated_at || null,
    salary: row.salary || '—',
    age: row.age_limit || '—',
    type: 'Notification',
    status: displayStatus,
    officialUrl: urls.officialUrl,
    applyUrl: urls.applyUrl,
    apply_url: row.apply_url || row.applyUrl || urls.applyUrl,
    pdfUrl: urls.pdfUrl || resolvePdfUrl(row),
    pdf_url: row.pdf_url || row.pdfUrl || urls.pdfUrl || resolvePdfUrl(row),
    pdfUrls: urls.pdfUrls?.length ? urls.pdfUrls : collectPdfUrls(row),
    about: row.detail?.summary || '',
    detail: sanitizeDetailForUi(row.detail || {}),
    qualification: row.qualification,
    age_limit: row.age_limit,
    dates: row.detail?.dates || {},
    fee: row.detail?.fee || {},
    post_name: row.post_name || row.detail?.post_name || null,
    posts: row.posts || row.detail?.posts || [],
    important_dates: row.important_dates || row.detail?.important_dates || [],
    selection: row.detail?.selection || [],
    howApply: row.detail?.howApply || [],
    isLive: true,
    _fromLive: true,
    is_sponsored: Boolean(row.is_sponsored),
    isSponsored: Boolean(row.is_sponsored),
  })
}
