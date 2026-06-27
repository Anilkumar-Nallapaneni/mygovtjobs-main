/**
 * Official recruitment URLs only — block third-party job-aggregator domains.
 */
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

const BLOCKED_HOST_RE =
  new RegExp(
    `(?:^|\\.)(?:${[
      `${'free'}${'job'}${'alert'}`,
      'sarkariresult',
      'sarkarijob',
      'sarkarinaukri',
      'governmentjob',
      'indgovtjobs',
      'rojgarresult',
      'jobriya',
      'fresherslive',
      'naukri',
      'indeed',
      'shine',
      'timesjobs',
      'foundit',
      'monster',
    ].join('|')})\\.`,
    'i'
  )

const BLOCKED_TEXT_RE =
  new RegExp(
    [
      `${'free'}${'job'}${'alert'}`,
      'sarkariresult',
      'sarkarijob',
      'sarkarinaukri',
      'governmentjob',
      'indgovtjobs',
      'rojgarresult',
      'jobriya',
      'fresherslive',
    ].join('|'),
    'i'
  )

const OFFICIAL_HOST_RE = /\.(gov|nic|ac|org|res|edu)\.in$/i
const ERNET_IN_RE = /\.ernet\.in$/i
const BANK_IN_RE = /\.bank\.in$/i
const COOP_TLD_RE = /\.coop$/i
const GOOGLE_FILE_RE = /drive\.google\.com\/file\/d\/|docs\.google\.com\/forms\//i
const FORMS_SHORT_RE = /^https?:\/\/(www\.)?forms\.gle\//i
const SAIL_S3_RE = /aima-web-images\.s3\.ap-south-1\.amazonaws\.com\/sailcareers\.com\//i

const PSU_PREFIX_RE =
  /^(www\.)?(upsc|ssc|rrb|ibps|isro|drdo|bel|coalindia|ntpc|nhai|esic|aiims|jipmer|nimhans|nielit|npcil|pib|bsnl|ecil|hal|ongc|oil|irctc|nfl|eil)\./i

/** PSU / bank / institute career portals (not always .gov.in). */
const OFFICIAL_STEMS = [
  'aaiclas.aero',
  'afspanchwati.com',
  'allahabadhighcourt.in',
  'andrewyule.com',
  'annauniv.edu',
  'apprenticeshipindia.gov.in',
  'apeda.gov.in',
  'aweil.in',
  'balmerlawrie.com',
  'bankofbaroda.co.in',
  'bankofbaroda.in',
  'bcclweb.in',
  'bfuhs.ggsmch.org',
  'biharsports.org',
  'bobcaps.in',
  'braithwaiteindia.com',
  'bsnl.co.in',
  'canarabank.com',
  'careers.cdac.in',
  'careers.nfl.co.in',
  'cdac.in',
  'centralbankofindia.co.in',
  'cochinshipyard.in',
  'cswcrtiweb.org',
  'csu-puri.edu.in',
  'delhimetrorail.com',
  'demo-appiness.com',
  'dicmedia.digitalindiacorporation.in',
  'dredge-india.com',
  'dhsgsu.edu.in',
  'ecil.co.in',
  'eil.co.in',
  'employmentnews.gov.in',
  'fact.co.in',
  'fddiindia.com',
  'g03.tcsion.com',
  'glidersindia.com',
  'gujaratmetrorail.com',
  'hal-india.co.in',
  'hindustancopper.com',
  'hrrl.in',
  'hslvizag.in',
  'hpptcl.com',
  'ibps.in',
  'icar-crri.in',
  'icgeb.org',
  'icsi.edu',
  'ilpgt.com',
  'indianbank.in',
  'iprcl.in',
  'irctc.com',
  'isro.gov.in',
  'jkicds.com',
  'kksgovwc.org',
  'kochimetro.org',
  'konkanrailway.com',
  'kribhco.net',
  'kvafsu.edu.in',
  'kvk4.in',
  'licindia.in',
  'lifecarehll.com',
  'mahatransco.in',
  'mahanadicoal.in',
  'manipurpollution.org',
  'meconlimited.co.in',
  'midhani-india.in',
  'mmrcl.com',
  'mpmetrorail.com',
  'nabcons.com',
  'nabfins.org',
  'nalcoindia.com',
  'ncdc.in',
  'nclcil.in',
  'ncrtc.co.in',
  'nhsrcindia.org',
  'nimhans.edu.in',
  'nitt.edu',
  'nplindia.in',
  'ntpc.co.in',
  'oil-india.com',
  'ongcindia.com',
  'optcl.co.in',
  'pcbassam.org',
  'pau.edu',
  'portals.secl-cil.in',
  'pnbindia.in',
  'pspcl.in',
  'purabi.coop',
  'punepeoples.bank.in',
  'rbi.org.in',
  'railtel.in',
  'railtelindia.com',
  'rcfltd.com',
  'recruitment.ggsmch.org',
  'recruitment.mmrcl.com',
  'recruitment.nhsrcindia.org',
  'recruitment.purabi.coop',
  'recruitment.thsti.in',
  'rites.com',
  'rvnl.org',
  'sailcareers.com',
  'sainikschoolgoalpara.org',
  'sainikschooljhansi.com',
  'sbi.bank.in',
  'sbi.co.in',
  'scdrc.chdadmnrectt.in',
  'sdclindia.com',
  'secl-cil.in',
  'ssgopalganj.in',
  'stpi.in',
  'tcsion.com',
  'tezu.ernet.in',
  'theacms.in',
  'udupicsl.com',
  'unionbankofindia.co.in',
  'virtualofficeerp.com',
  'wbsetcl.in',
  'westerncoal.in',
]

export function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function containsBlockedBrandText(...parts) {
  const hay = parts.filter(Boolean).join(' ')
  return BLOCKED_TEXT_RE.test(hay)
}

export function isBlockedAggregatorHost(url) {
  const host = hostnameOf(url)
  if (!host) return false
  return BLOCKED_HOST_RE.test(host) || containsBlockedBrandText(host)
}

export function isOfficialRecruitmentUrl(url) {
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

function collectSectionLinks(job) {
  const sections = job?.detail?.content_sections
  if (!Array.isArray(sections)) return []
  return sections.flatMap((section) =>
    (section?.links || []).map((link) => link?.url).filter(Boolean)
  )
}

/** Primary outbound URLs — excludes scraped section promos (Telegram/WhatsApp, etc.). */
export function collectPrimaryJobUrls(job) {
  return [
    job?.applyUrl,
    job?.officialUrl,
    job?.pdfUrl,
    job?.pdf_url,
    job?.apply_url,
    job?.detail?.pdf_url,
    job?.detail?.pdfUrl,
    job?.detail?.notification_url,
    job?.detail?.link,
    job?.detail?.source_url,
    ...(Array.isArray(job?.detail?.pdf_urls) ? job.detail.pdf_urls : []),
    ...(Array.isArray(job?.detail?.pdfUrls) ? job.detail.pdfUrls : []),
  ].filter(Boolean)
}

export function collectJobUrls(job) {
  return [...collectPrimaryJobUrls(job), ...collectSectionLinks(job)]
}

export function isStructuredCatalogJob(job) {
  return isCatalogImportDetail(job?.detail)
}

export function rowHasBlockedHost(job) {
  const urls = isStructuredCatalogJob(job) ? collectPrimaryJobUrls(job) : collectJobUrls(job)
  return urls.some((u) => isBlockedAggregatorHost(u))
}

/** Outbound links restricted to official domains. */
export function sanitizeOfficialUrls(job) {
  const applyUrl = pickOfficialDetailUrl(job)
  const pdfs = collectPdfUrls(job)
  let pdfUrl = pdfs[0] || job?.pdfUrl || job?.pdf_url || null
  if (pdfUrl && !isOfficialRecruitmentUrl(pdfUrl)) pdfUrl = pdfs[0] || null
  if (!pdfUrl && applyUrl && /\.pdf(\?|$)/i.test(applyUrl)) pdfUrl = applyUrl

  return {
    applyUrl: applyUrl || '#',
    officialUrl: applyUrl || '#',
    pdfUrl: pdfUrl || null,
    pdfUrls: pdfs,
  }
}

export function isPdfUrl(url) {
  return looksLikeNotificationDocument(String(url || ''))
}

/** Prefer an official portal page; fall back to an official notification PDF. */
export function pickOfficialDetailUrl(job) {
  const official = collectJobUrls(job).filter((u) => isOfficialRecruitmentUrl(u))
  const portal = official.find((u) => !isPdfUrl(u))
  return portal || official[0] || null
}

/** Single outbound apply link for UI — portal first, then official PDF. */
export function resolveOfficialApplyHref(job) {
  return pickOfficialDetailUrl(job)
}

/**
 * Show listing only when it points at an official portal and has no aggregator links.
 */
export function isAllowedOfficialJob(job) {
  if (!job) return false
  if (containsBlockedBrandText(job.title, job.dept, job.about)) return false
  if (rowHasBlockedHost(job)) return false
  return Boolean(pickOfficialDetailUrl(job))
}
