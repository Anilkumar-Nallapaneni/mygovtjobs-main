import type { CategoryId } from '@/data/categories'
import type { JobRecord } from '@/types/job'
import { jobMatchesEducationBucket, jobMatchesEducationFilterKey } from '@/utils/educationVacancySummary'

export type QualificationDef = {
  slug: string
  title: string
  seoDescription: string
  /** Match EDUCATION_BUCKETS id when set. */
  bucketId?: string
  /** Sets home quick-filter / ?filter= when set. */
  filterKey?: string
  categoryId?: CategoryId
}

export const QUALIFICATIONS: QualificationDef[] = [
  {
    slug: '10th',
    title: '10th Pass Government Jobs 2026',
    seoDescription: 'Live 10th pass / matric government jobs from official .gov.in notifications.',
    bucketId: 'tenth',
    filterKey: 'tenth',
  },
  {
    slug: '12th',
    title: '12th Pass Government Jobs 2026',
    seoDescription: 'Intermediate / 12th pass government jobs from official sources.',
    bucketId: 'twelfth',
    filterKey: 'twelfth',
  },
  {
    slug: '8th',
    title: '8th Pass Government Jobs 2026',
    seoDescription: 'Class 8 pass government job notifications across India.',
    bucketId: 'eighth',
    filterKey: 'eighth',
  },
  {
    slug: 'iti',
    title: 'ITI Government Jobs 2026',
    seoDescription: 'ITI trade government jobs and apprenticeships from official portals.',
    bucketId: 'iti',
    filterKey: 'iti',
  },
  {
    slug: 'diploma',
    title: 'Diploma Government Jobs 2026',
    seoDescription: 'Diploma holder government recruitment notifications.',
    bucketId: 'diploma',
    filterKey: 'diploma',
  },
  {
    slug: 'graduate',
    title: 'Graduate Government Jobs 2026',
    seoDescription: 'Any degree / graduate level government jobs.',
    bucketId: 'graduate',
    filterKey: 'graduate',
  },
  {
    slug: 'btech',
    title: 'B.Tech / B.E Government Jobs 2026',
    seoDescription: 'Engineering graduate government jobs — PSU, SSC JE, and more.',
    bucketId: 'engineering',
    filterKey: 'engineering',
  },
  {
    slug: 'bsc',
    title: 'B.Sc Government Jobs 2026',
    seoDescription: 'Bachelor of Science government job notifications.',
    bucketId: 'bsc',
  },
  {
    slug: 'bcom',
    title: 'B.Com Government Jobs 2026',
    seoDescription: 'Commerce graduate government jobs.',
    bucketId: 'bcom',
  },
  {
    slug: 'mba',
    title: 'MBA Government Jobs 2026',
    seoDescription: 'MBA / management graduate government positions.',
    bucketId: 'mba',
  },
  {
    slug: 'postgraduate',
    title: 'Post Graduate Government Jobs 2026',
    seoDescription: "PG / master's degree government jobs.",
    bucketId: 'post_graduate',
    filterKey: 'postgraduate',
  },
  {
    slug: 'defence',
    title: 'Defence Government Jobs 2026',
    seoDescription: 'Army, Navy, Air Force, CAPF recruitment from official sources.',
    bucketId: 'defence',
    filterKey: 'defence',
  },
  {
    slug: 'banking',
    title: 'Banking Government Jobs 2026',
    seoDescription: 'IBPS, SBI, RBI and public sector bank jobs.',
    bucketId: 'banking',
    filterKey: 'banking',
  },
  {
    slug: 'police',
    title: 'Police Government Jobs 2026',
    seoDescription: 'Police constable, SI, and state police recruitment.',
    bucketId: 'police',
    filterKey: 'police',
  },
  {
    slug: 'medical',
    title: 'Medical & Paramedical Govt Jobs 2026',
    seoDescription: 'MBBS, nursing, and paramedical posts from official notifications.',
    categoryId: 'health',
  },
  {
    slug: 'teaching',
    title: 'Teaching Government Jobs 2026',
    seoDescription: 'Teaching, lecturer, and faculty recruitment from official boards.',
    categoryId: 'teaching',
  },
]

const SLUG_MAP = new Map(QUALIFICATIONS.map((q) => [q.slug, q]))

export function getQualificationBySlug(slug: string | null | undefined): QualificationDef | null {
  if (!slug) return null
  return SLUG_MAP.get(slug.toLowerCase()) ?? null
}

export function getQualificationSlugForFilterKey(filterKey: string): string | null {
  const row = QUALIFICATIONS.find((q) => q.filterKey === filterKey)
  return row?.slug ?? null
}

export function jobMatchesQualification(job: JobRecord, def: QualificationDef): boolean {
  if (def.categoryId) return job.category === def.categoryId
  if (def.bucketId) return jobMatchesEducationBucket(job, def.bucketId)
  if (def.filterKey) return jobMatchesEducationFilterKey(job, def.filterKey)
  return false
}

export const QUALIFICATION_SLUGS = QUALIFICATIONS.map((q) => q.slug)
