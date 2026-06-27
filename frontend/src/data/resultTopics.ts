/** Result / admit / syllabus headline hub definitions (Phase 2). */

export type ResultTopicDef = {
  /** URL path segment after `/results/` — null for root `/results`. */
  slug: string | null
  topicKey: string
  title: string
  seoDescription: string
  /** Static archive filename under `official-archives/` (without `.json`). */
  archiveFile: string | null
  /** i18n key under `sidebar.*` when available. */
  labelKey: string
}

export const RESULTS_TOPICS_INDEX_PATH = '/results/topics'

export const RESULT_TOPICS: ResultTopicDef[] = [
  {
    slug: null,
    topicKey: 'sarkari-result',
    title: 'Government Exam Results 2026',
    seoDescription:
      'Official exam results, merit lists, and score announcements from UPSC, SSC, RRB, IBPS, and state PSC websites across India.',
    archiveFile: 'results',
    labelKey: 'sarkariResult',
  },
  {
    slug: 'admit-card',
    topicKey: 'admit-card',
    title: 'Admit Cards — Government Exams',
    seoDescription:
      'Download links and updates for government exam admit cards, hall tickets, and call letters from official .gov.in sources.',
    archiveFile: 'admit-cards',
    labelKey: 'admitCard',
  },
  {
    slug: 'answer-key',
    topicKey: 'answer-key',
    title: 'Government Exam Answer Keys',
    seoDescription:
      'Official answer keys and response sheets for SSC, UPSC, RRB, banking, and state recruitment exams.',
    archiveFile: 'answer-keys',
    labelKey: 'answerKey',
  },
  {
    slug: 'cutoff',
    topicKey: 'cutoff',
    title: 'Cutoff Lists & Merit Marks',
    seoDescription:
      'Official cutoff marks, merit lists, and category-wise qualifying scores from government recruiting bodies.',
    archiveFile: 'cutoff',
    labelKey: 'cutoff',
  },
  {
    slug: 'syllabus',
    topicKey: 'syllabus',
    title: 'Exam Syllabus — Official PDFs',
    seoDescription:
      'Download official exam syllabus and scheme of examination from verified government recruitment portals.',
    archiveFile: 'syllabus',
    labelKey: 'syllabus',
  },
  {
    slug: 'previous-papers',
    topicKey: 'previous-papers',
    title: 'Previous Year Question Papers',
    seoDescription:
      'Previous year question papers and sample papers from official government exam boards and PSC websites.',
    archiveFile: 'previous-papers',
    labelKey: 'previousPapers',
  },
  {
    slug: 'written-marks',
    topicKey: 'written-marks',
    title: 'Written Exam Marks',
    seoDescription:
      'Written exam marks, mains scorecards, and stage-wise result sheets from official government sources.',
    archiveFile: 'written-marks',
    labelKey: 'writtenMarks',
  },
  {
    slug: 'interview',
    topicKey: 'interview',
    title: 'Interview & Viva Schedules',
    seoDescription:
      'Interview schedules, personality test dates, and viva voce announcements from government recruiters.',
    archiveFile: 'interview',
    labelKey: 'interview',
  },
  {
    slug: 'last-date',
    topicKey: 'last-date',
    title: 'Deadline Extensions',
    seoDescription:
      'Last date extensions, revised deadlines, and closing date updates for government recruitment applications.',
    archiveFile: 'last-date',
    labelKey: 'lastDate',
  },
]

const TOPIC_BY_KEY = new Map(RESULT_TOPICS.map((row) => [row.topicKey, row]))
const TOPIC_BY_SLUG = new Map(
  RESULT_TOPICS.filter((row) => row.slug).map((row) => [row.slug as string, row])
)

export const RESULT_TOPIC_SLUGS = RESULT_TOPICS.filter((row) => row.slug).map((row) => row.slug as string)

export function isValidResultTopicSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && TOPIC_BY_SLUG.has(slug))
}

export function getResultTopicByKey(topicKey: string | null | undefined): ResultTopicDef | null {
  if (!topicKey) return null
  return TOPIC_BY_KEY.get(topicKey) ?? null
}

export function getResultTopicBySlug(slug: string | null | undefined): ResultTopicDef | null {
  if (!slug) return null
  return TOPIC_BY_SLUG.get(slug) ?? null
}

export function resultTopicRoutePath(topicKey: string): string {
  const row = getResultTopicByKey(topicKey)
  if (!row) return '/results'
  if (!row.slug) return '/results'
  return `/results/${encodeURIComponent(row.slug)}`
}

export function getArchiveFileForTopic(topicKey: string | null | undefined): string | null {
  return getResultTopicByKey(topicKey)?.archiveFile ?? null
}

export function isResultHubPath(pathname: string): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === RESULTS_TOPICS_INDEX_PATH) return false
  return path === '/results' || path.startsWith('/results/')
}
