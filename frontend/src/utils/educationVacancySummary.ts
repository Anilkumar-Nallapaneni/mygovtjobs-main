import { isJobExpired } from '@/utils/jobFilters'
import { effectiveVacancyCount } from '@/utils/jobMetadataUtils'

/** Education-wise vacancy totals from official job catalog (realistic, no double-count per job). */

export const QUICK_FILTER_KEYS = [
  'tenth',
  'twelfth',
  'eighth',
  'iti',
  'diploma',
  'graduate',
  'engineering',
  'defence',
  'banking',
  'police',
] as const

export type QuickFilterKey = (typeof QUICK_FILTER_KEYS)[number]

export type QuickFilterCount = {
  listings: number
  vacancies: number
}

export type EducationSummaryRow = {
  id: string
  label: string
  filterKey: string | null
  vacancies: number
  listings: number
  listingsWithVacancies: number
}

type BucketDef = {
  id: string
  label: string
  filterKey: string | null
  matches: (job: Record<string, unknown>, probe: string) => boolean
}

function jobProbe(job: Record<string, unknown>) {
  return [
    job?.title,
    job?.qual,
    job?.qualification,
    job?.dept,
    job?.about,
    (job?.detail as { summary?: string })?.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function vacancyCount(job: Record<string, unknown>) {
  return effectiveVacancyCount(job as { vacancies?: number; rawVacancies?: number })
}

function isLiveJob(job: Record<string, unknown>) {
  return !isJobExpired(job)
}

/** First matching bucket wins — each notification counted once. */
const EDUCATION_BUCKETS: BucketDef[] = [
  {
    id: 'tenth',
    label: '10TH',
    filterKey: 'tenth',
    matches: (_, p) => /\b10th\b|10\s*th\b|class\s*10\b|matric|sslc\b/i.test(p),
  },
  {
    id: 'eighth',
    label: '8TH',
    filterKey: 'eighth',
    matches: (_, p) => /\b8th\b|8\s*th\b|class\s*8\b/i.test(p),
  },
  {
    id: 'twelfth',
    label: '12TH',
    filterKey: 'twelfth',
    matches: (_, p) => /\b12th\b|12\s*th\b|10\s*\+\s*2|intermediate|hsc\b|senior secondary/i.test(p),
  },
  {
    id: 'iti',
    label: 'ITI',
    filterKey: 'iti',
    matches: (_, p) => /\biti\b|industrial training institute/i.test(p),
  },
  {
    id: 'diploma',
    label: 'Diploma',
    filterKey: 'diploma',
    matches: (_, p) => /diploma/i.test(p) && !/b\.?\s*tech|b\.?\s*e\b/i.test(p),
  },
  {
    id: 'engineering',
    label: 'B.Tech / B.E',
    filterKey: 'engineering',
    matches: (job, p) =>
      job?.category === 'engineering' ||
      /b\.?\s*tech|b\.?\s*e\.|b\.?\s*e\b|m\.?\s*tech|engineering/i.test(p),
  },
  {
    id: 'bcom',
    label: 'B.Com',
    filterKey: 'bcom',
    matches: (_, p) => /b\.?\s*com|bachelor of commerce/i.test(p),
  },
  {
    id: 'mba',
    label: 'MBA',
    filterKey: 'mba',
    matches: (_, p) => /\bmba\b|master of business/i.test(p),
  },
  {
    id: 'msw',
    label: 'MSW',
    filterKey: 'graduate',
    matches: (_, p) => /\bmsw\b|master of social work/i.test(p),
  },
  {
    id: 'bsc',
    label: 'B.Sc',
    filterKey: 'bsc',
    matches: (_, p) => /b\.?\s*sc\b|bachelor of science/i.test(p),
  },
  {
    id: 'msc',
    label: 'M.Sc',
    filterKey: 'graduate',
    matches: (_, p) => /m\.?\s*sc\b|master of science/i.test(p),
  },
  {
    id: 'ba',
    label: 'BA',
    filterKey: 'graduate',
    matches: (_, p) => /\bba\b|bachelor of arts/i.test(p) && !/mba|b\.?\s*com|b\.?\s*sc/i.test(p),
  },
  {
    id: 'ma',
    label: 'MA',
    filterKey: 'graduate',
    matches: (_, p) => /\bma\b|master of arts/i.test(p) && !/mba|msw|m\.?\s*sc/i.test(p),
  },
  {
    id: 'post_graduate',
    label: 'Any Post Graduate',
    filterKey: 'postgraduate',
    matches: (_, p) =>
      /post\s*grad|postgraduate|\bpg\b|m\.?\s*a\.|m\.?\s*sc|ph\.?\s*d|master'?s degree/i.test(p),
  },
  {
    id: 'graduate',
    label: 'Any Graduate',
    filterKey: 'graduate',
    matches: (_, p) =>
      /graduate|graduation|any\s+degree|bachelor|degree holder|under\s*graduate/i.test(p),
  },
  {
    id: 'defence',
    label: 'Defence',
    filterKey: 'defence',
    matches: (job, p) =>
      job?.category === 'defence' ||
      /defen[cs]e|army|navy|air force|nda\b|cds\b|cisf|capf/i.test(p),
  },
  {
    id: 'banking',
    label: 'Banking',
    filterKey: 'banking',
    matches: (job, p) =>
      job?.category === 'banking' || /\bbank\b|ibps|sbi\b|rbi\b|probationary officer/i.test(p),
  },
  {
    id: 'police',
    label: 'Police',
    filterKey: 'police',
    matches: (job, p) =>
      job?.category === 'police' || /police|constable|sub[\s-]?inspector|\bsi\b exam/i.test(p),
  },
]

function assignBucket(job: Record<string, unknown>): BucketDef | null {
  const probe = jobProbe(job)
  for (const bucket of EDUCATION_BUCKETS) {
    if (bucket.matches(job, probe)) return bucket
  }
  return null
}

/** Same bucket as the education table — filter counts match pill labels. */
export function jobMatchesEducationFilterKey(job: Record<string, unknown>, filterKey: string) {
  const bucket = assignBucket(job)
  return bucket?.filterKey === filterKey
}

export function jobMatchesEducationBucket(job: Record<string, unknown>, bucketId: string) {
  return assignBucket(job)?.id === bucketId
}

export function aggregateCountsByQuickFilter(
  rows: EducationSummaryRow[]
): Record<QuickFilterKey, QuickFilterCount> {
  const out = Object.fromEntries(
    QUICK_FILTER_KEYS.map((key) => [key, { listings: 0, vacancies: 0 }])
  ) as Record<QuickFilterKey, QuickFilterCount>

  for (const row of rows) {
    if (!row.filterKey) continue
    const key = row.filterKey as QuickFilterKey
    if (!out[key]) continue
    out[key].listings += row.listings
    out[key].vacancies += row.vacancies
  }

  return out
}

export function computeEducationVacancySummary(
  jobs: Array<Record<string, unknown>>,
  { liveOnly = true }: { liveOnly?: boolean } = {}
): EducationSummaryRow[] {
  const tallies = new Map<string, EducationSummaryRow>(
    EDUCATION_BUCKETS.map((b) => [
      b.id,
      {
        id: b.id,
        label: b.label,
        filterKey: b.filterKey,
        vacancies: 0,
        listings: 0,
        listingsWithVacancies: 0,
      },
    ])
  )

  for (const job of jobs) {
    if (liveOnly && !isLiveJob(job)) continue
    const bucket = assignBucket(job)
    if (!bucket) continue
    const row = tallies.get(bucket.id)
    if (!row) continue
    row.listings += 1
    const vac = vacancyCount(job)
    if (vac > 0) {
      row.vacancies += vac
      row.listingsWithVacancies += 1
    }
  }

  return EDUCATION_BUCKETS.map((b) => tallies.get(b.id)!)
}
