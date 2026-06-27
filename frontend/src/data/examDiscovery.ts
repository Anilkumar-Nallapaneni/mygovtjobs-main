import type { ExamDef } from '@/data/exams'
import { EXAM_SLUGS, EXAMS, jobMatchesExam, jobProbeText } from '@/data/exams'
import { isJobExpired } from '@/utils/jobFilters'
import { effectiveVacancyCount } from '@/utils/jobMetadataUtils'
import type { JobRecord } from '@/types/job'

type DiscoveryPattern = {
  slug: string
  probe: RegExp
  shortTitle: string
  title: string
  board: string
  icon: string
  accent: string
  minListings: number
  categoryId?: ExamDef['categoryId']
}

/** Extra exams detected from job titles — only surfaced when enough live listings match. */
const DISCOVERY_PATTERNS: DiscoveryPattern[] = [
  {
    slug: 'gate',
    probe: /\bgate\b|graduate aptitude test/i,
    shortTitle: 'GATE',
    title: 'GATE 2026 — Graduate Aptitude Test',
    board: 'IIT/IISc',
    icon: '🎓',
    accent: '#6366F1',
    minListings: 2,
    categoryId: 'engineering',
  },
  {
    slug: 'neet-pg',
    probe: /\bneet.?pg\b|neet pg/i,
    shortTitle: 'NEET PG',
    title: 'NEET PG 2026',
    board: 'National Medical Commission',
    icon: '🏥',
    accent: '#EC4899',
    minListings: 2,
    categoryId: 'health',
  },
  {
    slug: 'sbi-po',
    probe: /\bsbi\b.*\bpo\b|sbi probationary|state bank.*po/i,
    shortTitle: 'SBI PO',
    title: 'SBI PO 2026 — Probationary Officer',
    board: 'State Bank of India',
    icon: '🏦',
    accent: '#0284C7',
    minListings: 2,
    categoryId: 'banking',
  },
  {
    slug: 'lic',
    probe: /\blic\b|life insurance corporation.*(ado|aao|assistant)/i,
    shortTitle: 'LIC',
    title: 'LIC Recruitment 2026',
    board: 'Life Insurance Corporation',
    icon: '📋',
    accent: '#F59E0B',
    minListings: 2,
    categoryId: 'banking',
  },
  {
    slug: 'drdo',
    probe: /\bdrdo\b|defence research.*development/i,
    shortTitle: 'DRDO',
    title: 'DRDO Recruitment 2026',
    board: 'DRDO',
    icon: '🔬',
    accent: '#64748B',
    minListings: 2,
    categoryId: 'defence',
  },
  {
    slug: 'isro',
    probe: /\bisro\b|indian space research/i,
    shortTitle: 'ISRO',
    title: 'ISRO Recruitment 2026',
    board: 'Indian Space Research Organisation',
    icon: '🚀',
    accent: '#7C3AED',
    minListings: 2,
    categoryId: 'psu',
  },
  {
    slug: 'indian-navy',
    probe: /\bindian navy\b|navy (ssr|mr|aa)|joinindiannavy/i,
    shortTitle: 'Indian Navy',
    title: 'Indian Navy Recruitment 2026',
    board: 'Indian Navy',
    icon: '⚓',
    accent: '#1D4ED8',
    minListings: 2,
    categoryId: 'defence',
  },
  {
    slug: 'indian-army',
    probe: /\bindian army\b|army rally|joinindianarmy|agniveer/i,
    shortTitle: 'Indian Army',
    title: 'Indian Army Recruitment 2026',
    board: 'Indian Army',
    icon: '🪖',
    accent: '#15803D',
    minListings: 2,
    categoryId: 'defence',
  },
  {
    slug: 'dmrc',
    probe: /\bdmrc\b|delhi metro rail/i,
    shortTitle: 'DMRC',
    title: 'DMRC Recruitment 2026',
    board: 'Delhi Metro Rail Corporation',
    icon: '🚇',
    accent: '#DC2626',
    minListings: 2,
  },
  {
    slug: 'csir-net',
    probe: /\bcsir.?net\b|csir net/i,
    shortTitle: 'CSIR NET',
    title: 'CSIR NET 2026',
    board: 'CSIR',
    icon: '🔬',
    accent: '#0D9488',
    minListings: 2,
  },
]

const STATIC_SLUGS = new Set(EXAM_SLUGS)

const GENERIC_SLUGS = new Set([
  'government',
  'recruitment',
  'notification',
  'direct',
  'online',
  'application',
  'various',
  'multiple',
  'walk',
  'interview',
  'post',
  'posts',
  'vacancy',
  'vacancies',
  'latest',
  'new',
  'state',
  'central',
])

function vacancyCount(job: JobRecord): number {
  return effectiveVacancyCount(job)
}

function slugFromPhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function extractTitleExamLabel(title: string): string | null {
  const raw = title.trim()
  if (raw.length < 8) return null
  const m = raw.match(
    /^(.{4,48}?)(?:\s+20\d{2}\b|\s+recruitment\b|\s+notification\b|\s+exam\b|\s+vacancy\b|\s+apply\b)/i
  )
  if (!m) return null
  const label = m[1].replace(/\s+/g, ' ').trim()
  if (label.length < 4 || /^(govt|government|direct|online)$/i.test(label)) return null
  return label
}

function jobMatchedByCurated(job: JobRecord): boolean {
  return EXAMS.some((exam) => jobMatchesExam(job, exam))
}

function buildDiscoveredExam(
  slug: string,
  shortTitle: string,
  board: string,
  probe: RegExp,
  sampleTitle: string,
  categoryId?: ExamDef['categoryId']
): ExamDef {
  return {
    slug,
    shortTitle,
    title: `${shortTitle} — Live Government Notifications`,
    board,
    icon: '📌',
    accent: '#94A3B8',
    categoryId,
    probe,
    probeRequired: true,
    discovered: true,
    seoDescription: `Live official ${shortTitle} recruitment notifications, apply links, and last dates from verified .gov.in sources.`,
    seoBody: `This page groups live notifications matching "${shortTitle}" from official government portals. Sample listing: ${sampleTitle.slice(0, 120)}. Always verify eligibility on the recruiting board's website before applying.`,
    links: { results: '/results', admitCard: '/results/admit-card' },
  }
}

export function discoverExamsFromJobs(jobs: JobRecord[]): ExamDef[] {
  const found: ExamDef[] = []
  const usedSlugs = new Set(STATIC_SLUGS)

  for (const pat of DISCOVERY_PATTERNS) {
    if (usedSlugs.has(pat.slug)) continue
    const matched = jobs.filter((job) => pat.probe.test(jobProbeText(job)))
    if (matched.length < pat.minListings) continue
    usedSlugs.add(pat.slug)
    found.push(
      buildDiscoveredExam(
        pat.slug,
        pat.shortTitle,
        pat.board,
        pat.probe,
        matched[0]?.title ?? pat.title,
        pat.categoryId
      )
    )
  }

  const titleBuckets = new Map<string, { label: string; jobs: JobRecord[] }>()
  for (const job of jobs) {
    if (jobMatchedByCurated(job)) continue
    if (found.some((exam) => jobMatchesExam(job, exam))) continue
    const label = extractTitleExamLabel(job.title ?? '')
    if (!label) continue
    const slug = slugFromPhrase(label)
    if (!slug || slug.length < 4 || GENERIC_SLUGS.has(slug) || usedSlugs.has(slug)) continue
    const bucket = titleBuckets.get(slug) ?? { label, jobs: [] }
    bucket.jobs.push(job)
    titleBuckets.set(slug, bucket)
  }

  for (const [slug, { label, jobs: bucketJobs }] of titleBuckets) {
    if (bucketJobs.length < 3) continue
    usedSlugs.add(slug)
    const probe = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    found.push(buildDiscoveredExam(slug, label, 'Official recruitment board', probe, bucketJobs[0]?.title ?? label))
  }

  return found
}

export function resolveExam(slug: string | null | undefined, jobs: JobRecord[]): ExamDef | null {
  if (!slug) return null
  const key = slug.toLowerCase()
  const curated = EXAMS.find((e) => e.slug === key)
  if (curated) return curated
  return discoverExamsFromJobs(jobs).find((e) => e.slug === key) ?? null
}

export function getAllExams(jobs: JobRecord[]): ExamDef[] {
  const discovered = discoverExamsFromJobs(jobs)
  const seen = new Set<string>()
  const merged: ExamDef[] = []
  for (const exam of [...EXAMS, ...discovered]) {
    if (seen.has(exam.slug)) continue
    seen.add(exam.slug)
    merged.push(exam)
  }
  return merged
}

export function computeAllExamCounts(jobs: JobRecord[]): Record<string, import('@/data/exams').ExamCount> {
  const all = getAllExams(jobs)
  const out: Record<string, import('@/data/exams').ExamCount> = {}
  for (const exam of all) {
    out[exam.slug] = { listings: 0, vacancies: 0, live: 0 }
  }
  for (const job of jobs) {
    for (const exam of all) {
      if (!jobMatchesExam(job, exam)) continue
      const row = out[exam.slug]
      row.listings += 1
      row.vacancies += vacancyCount(job)
      if (!isJobExpired(job)) row.live += 1
      break
    }
  }
  return out
}

export function isExamSlugValid(slug: string | null | undefined, jobs: JobRecord[]): slug is string {
  if (!slug) return false
  return Boolean(resolveExam(slug, jobs))
}
