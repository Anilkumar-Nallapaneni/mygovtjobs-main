import type { CategoryId } from '@/data/categories'
import type { JobRecord } from '@/types/job'
import { isJobExpired } from '@/utils/jobFilters'
import { effectiveVacancyCount } from '@/utils/jobMetadataUtils'

export type ExamFaqItem = { q: string; a: string }

export type ExamDef = {
  slug: string
  title: string
  shortTitle: string
  board: string
  icon: string
  accent: string
  categoryId?: CategoryId
  /** Match notification title, dept, qual text (case-insensitive). */
  probe: RegExp
  /** When true, probe must match (ignores category-only matches). */
  probeRequired?: boolean
  seoDescription: string
  seoBody: string
  faq?: ExamFaqItem[]
  /** Auto-built from live job titles — not in the curated static list. */
  discovered?: boolean
  /** Quick links shown on landing hero. */
  links?: {
    results?: string
    admitCard?: string
    syllabus?: string
    answerKey?: string
  }
}

export function jobProbeText(job: JobRecord): string {
  return [
    job?.title,
    job?.qual,
    job?.qualification,
    job?.dept,
    job?.about,
    job?.detail?.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function vacancyCount(job: JobRecord): number {
  return effectiveVacancyCount(job)
}

export const EXAMS: ExamDef[] = [
  {
    slug: 'ssc-cgl',
    title: 'SSC CGL 2026 — Combined Graduate Level',
    shortTitle: 'SSC CGL',
    board: 'Staff Selection Commission',
    icon: '📋',
    accent: '#FFAA00',
    categoryId: 'ssc',
    probe: /\bcgl\b|combined graduate level/i,
    seoDescription:
      'Latest SSC CGL 2026 notifications, apply links, exam dates, and vacancy details from ssc.nic.in — official Combined Graduate Level recruitment.',
    seoBody:
      'SSC CGL (Combined Graduate Level) is one of India\'s largest graduate recruitment exams for Group B and Group C posts in ministries, departments, and attached offices. My Govt Jobs lists only official CGL notifications from ssc.nic.in and verified .gov.in sources — never unofficial form mirrors.',
    links: { results: '/results', admitCard: '/results/admit-card', syllabus: '/results/syllabus', answerKey: '/results/answer-key' },
    faq: [
      {
        q: 'What is the eligibility for SSC CGL?',
        a: 'Most posts require a bachelor\'s degree from a recognised university. Age limit is typically 18–32 years (relaxations apply). Check the official CGL notification PDF for post-wise rules.',
      },
      {
        q: 'Where do I apply for SSC CGL?',
        a: 'Only on ssc.nic.in when the official notification is live. My Govt Jobs links directly to the board portal — we never collect application fees.',
      },
    ],
  },
  {
    slug: 'ssc-chsl',
    title: 'SSC CHSL 2026 — 10+2 Level',
    shortTitle: 'SSC CHSL',
    board: 'Staff Selection Commission',
    icon: '📝',
    accent: '#FBBF24',
    categoryId: 'ssc',
    probe: /\bchsl\b|combined higher secondary|10\+2 level|lower division/i,
    seoDescription:
      'SSC CHSL 2026 LDC, DEO, PA, and SA recruitment — official notifications, last dates, and apply links from ssc.nic.in.',
    seoBody:
      'SSC CHSL recruits Lower Division Clerk (LDC), Data Entry Operator (DEO), Postal Assistant, and Sorting Assistant posts for candidates with 10+2 qualification. Track live CHSL notifications and deadlines on this page.',
    links: { results: '/results', admitCard: '/results/admit-card', syllabus: '/results/syllabus' },
  },
  {
    slug: 'ssc-gd',
    title: 'SSC GD Constable 2026',
    shortTitle: 'SSC GD',
    board: 'Staff Selection Commission',
    icon: '🛡️',
    accent: '#EF4444',
    categoryId: 'ssc',
    probe: /\bssc\b.*\bgd\b|general duty|gd constable|capf gd/i,
    probeRequired: true,
    seoDescription:
      'SSC GD Constable 2026 recruitment for CAPF, NIA, SSF, and Delhi Police — official notifications and apply links.',
    seoBody:
      'SSC GD Constable examination fills General Duty posts in BSF, CISF, CRPF, ITBP, SSB, NIA, SSF, and Delhi Police. Notifications are published on ssc.nic.in — verify PET, medical, and document requirements in the official PDF.',
    links: { admitCard: '/results/admit-card', results: '/results' },
  },
  {
    slug: 'ssc-mts',
    title: 'SSC MTS 2026 — Multi Tasking Staff',
    shortTitle: 'SSC MTS',
    board: 'Staff Selection Commission',
    icon: '👷',
    accent: '#FB923C',
    categoryId: 'ssc',
    probe: /\bmts\b|multi.?tasking staff|havaldar/i,
    seoDescription:
      'SSC MTS and Havaldar 2026 notifications — official vacancy, eligibility, and apply links from ssc.nic.in.',
    seoBody:
      'SSC Multi Tasking Staff (MTS) recruitment covers Group C non-gazetted posts in central government ministries and departments. Havaldar posts in CBIC and CBN are also advertised under MTS notifications.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'upsc-cse',
    title: 'UPSC Civil Services (IAS/IPS/IFS) 2026',
    shortTitle: 'UPSC CSE',
    board: 'Union Public Service Commission',
    icon: '🏛️',
    accent: '#FF6B00',
    categoryId: 'upsc',
    probe: /civil services|cse\b|\bias\b|\bips\b|\bifs\b|prelims|mains.*upsc/i,
    seoDescription:
      'UPSC Civil Services Examination 2026 — IAS, IPS, IFS notifications, syllabus, and official apply links from upsc.gov.in.',
    seoBody:
      'The UPSC Civil Services Examination selects officers for IAS, IPS, IFS, and other Group A services. Notifications appear on upsc.gov.in. This page tracks related departmental recruitment and allied UPSC notices ingested from official sources.',
    links: { results: '/results', admitCard: '/results/admit-card', syllabus: '/results/syllabus', answerKey: '/results/answer-key' },
    faq: [
      {
        q: 'What is the UPSC CSE age limit?',
        a: 'General category: 21–32 years on 1 August of the exam year (relaxations for OBC, SC/ST, PwBD). Confirm in the official notification.',
      },
    ],
  },
  {
    slug: 'upsc-nda',
    title: 'UPSC NDA 2026',
    shortTitle: 'UPSC NDA',
    board: 'Union Public Service Commission',
    icon: '⚔️',
    accent: '#34D399',
    categoryId: 'upsc',
    probe: /\bnda\b|national defence academy|naval academy/i,
    probeRequired: true,
    seoDescription:
      'UPSC NDA & NA Examination 2026 — official notification, apply link, and exam updates from upsc.gov.in.',
    seoBody:
      'The NDA exam selects candidates for Army, Navy, and Air Force wings of the National Defence Academy. Apply only through upsc.gov.in when the notification is published.',
    links: { admitCard: '/results/admit-card', results: '/results' },
  },
  {
    slug: 'upsc-cds',
    title: 'UPSC CDS 2026',
    shortTitle: 'UPSC CDS',
    board: 'Union Public Service Commission',
    icon: '🎖️',
    accent: '#22C55E',
    categoryId: 'upsc',
    probe: /\bcds\b|combined defence services|ota\b/i,
    probeRequired: true,
    seoDescription:
      'UPSC CDS 2026 for IMA, INA, AFA, and OTA — official notifications and apply links from upsc.gov.in.',
    seoBody:
      'Combined Defence Services (CDS) examination fills officer cadre posts in Indian Military Academy, Naval Academy, Air Force Academy, and Officers Training Academy.',
    links: { admitCard: '/results/admit-card', results: '/results', syllabus: '/results/syllabus' },
  },
  {
    slug: 'ibps-po',
    title: 'IBPS PO 2026 — Probationary Officer',
    shortTitle: 'IBPS PO',
    board: 'Institute of Banking Personnel Selection',
    icon: '🏦',
    accent: '#38BDF8',
    categoryId: 'banking',
    probe: /ibps.*\bpo\b|probationary officer|bank po|cwe.*po/i,
    seoDescription:
      'IBPS PO 2026 CWE — official bank probationary officer notifications, apply dates, and ibps.in links.',
    seoBody:
      'IBPS conducts Common Written Examination (CWE) for Probationary Officer/Management Trainee posts in participating public sector banks. Apply only on ibps.in — never through unofficial registration sites.',
    links: { results: '/results', admitCard: '/results/admit-card', answerKey: '/results/answer-key' },
  },
  {
    slug: 'ibps-clerk',
    title: 'IBPS Clerk 2026',
    shortTitle: 'IBPS Clerk',
    board: 'Institute of Banking Personnel Selection',
    icon: '💳',
    accent: '#60A5FA',
    categoryId: 'banking',
    probe: /ibps.*clerk|cwe.*clerk|office assistant.*ibps/i,
    seoDescription:
      'IBPS Clerk 2026 CWE notifications — official apply links, eligibility, and exam calendar from ibps.in.',
    seoBody:
      'IBPS Clerk recruitment fills clerical cadre posts in public sector banks across India. Track live clerk notifications and last dates on this page.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'rrb-ntpc',
    title: 'RRB NTPC 2026',
    shortTitle: 'RRB NTPC',
    board: 'Railway Recruitment Board',
    icon: '🚂',
    accent: '#22C55E',
    categoryId: 'railways',
    probe: /\bntpc\b|non.?technical popular categories|under graduate.*rrb/i,
    probeRequired: true,
    seoDescription:
      'RRB NTPC 2026 graduate and undergraduate posts — official notifications, CBT dates, and apply links from regional RRB websites.',
    seoBody:
      'Railway Recruitment Board NTPC examination fills commercial, traffic, and other non-technical popular category posts. Each region publishes on its official RRB .gov.in subdomain.',
    links: { admitCard: '/results/admit-card', results: '/results', answerKey: '/results/answer-key' },
  },
  {
    slug: 'rrb-group-d',
    title: 'RRB Group D 2026',
    shortTitle: 'RRB Group D',
    board: 'Railway Recruitment Board',
    icon: '🔧',
    accent: '#4ADE80',
    categoryId: 'railways',
    probe: /group\s*d\b|rrb.*group.?d|track maintainer|pointsman/i,
    probeRequired: true,
    seoDescription:
      'RRB Group D 2026 Level 1 posts — official track maintainer, helper, and pointman recruitment from RRB .gov.in portals.',
    seoBody:
      'RRB Group D (Level 1) recruitment covers track maintainer, helper, porter, and related posts in Indian Railways. Verify medical standards and PET requirements in the official PDF.',
    links: { admitCard: '/results/admit-card', results: '/results' },
  },
  {
    slug: 'rrb-alp',
    title: 'RRB ALP & Technician 2026',
    shortTitle: 'RRB ALP',
    board: 'Railway Recruitment Board',
    icon: '🛤️',
    accent: '#A78BFA',
    categoryId: 'railways',
    probe: /\balp\b|assistant loco pilot|technician.*rrb|rrb.*technician/i,
    probeRequired: true,
    seoDescription:
      'RRB ALP and Technician 2026 notifications — official apply links and exam updates from Railway Recruitment Boards.',
    seoBody:
      'Assistant Loco Pilot (ALP) and Technician categories are recruited through RRB CBT examinations. Notifications are published on official regional RRB websites only.',
    links: { admitCard: '/results/admit-card', results: '/results' },
  },
  {
    slug: 'ctet',
    title: 'CTET 2026 — Central Teacher Eligibility Test',
    shortTitle: 'CTET',
    board: 'Central Board of Secondary Education',
    icon: '📚',
    accent: '#C084FC',
    categoryId: 'teaching',
    probe: /\bctet\b|central teacher eligibility|tet\b.*central/i,
    probeRequired: true,
    seoDescription:
      'CTET 2026 notification, apply link, admit card, and results — official updates from cbse.gov.in.',
    seoBody:
      'CTET qualifies candidates for teaching posts in central government schools (KVS, NVS) and state schools that accept CTET scores. Apply only on the official CBSE CTET portal when notification is live.',
    links: { admitCard: '/results/admit-card', results: '/results', syllabus: '/results/syllabus' },
  },
  {
    slug: 'ssc-je',
    title: 'SSC JE 2026 — Junior Engineer',
    shortTitle: 'SSC JE',
    board: 'Staff Selection Commission',
    icon: '🔩',
    accent: '#60A5FA',
    categoryId: 'ssc',
    probe: /ssc.*\bje\b|junior engineer.*ssc|cpwd.*je/i,
    seoDescription:
      'SSC Junior Engineer (JE) 2026 — civil, mechanical, electrical posts from official ssc.nic.in notifications.',
    seoBody:
      'SSC JE examination fills Junior Engineer posts in CPWD, MES, BRO, and other central engineering departments. Diploma and degree engineers should verify trade-wise eligibility in the official PDF.',
    links: { results: '/results', admitCard: '/results/admit-card', syllabus: '/results/syllabus' },
  },
  {
    slug: 'capf',
    title: 'CAPF 2026 — Assistant Commandant',
    shortTitle: 'CAPF AC',
    board: 'Union Public Service Commission',
    icon: '🛡️',
    accent: '#78716C',
    categoryId: 'defence',
    probe: /\bcapf\b|assistant commandant|central armed police forces/i,
    probeRequired: true,
    seoDescription:
      'UPSC CAPF Assistant Commandant 2026 — official notification, apply link, and exam updates from upsc.gov.in.',
    seoBody:
      'Central Armed Police Forces (CAPF) Assistant Commandant examination recruits officers for BSF, CRPF, CISF, ITBP, and SSB. Apply only through upsc.gov.in when the notification is published.',
    links: { admitCard: '/results/admit-card', results: '/results', syllabus: '/results/syllabus' },
  },
  {
    slug: 'afcat',
    title: 'AFCAT 2026 — Air Force Common Admission Test',
    shortTitle: 'AFCAT',
    board: 'Indian Air Force',
    icon: '✈️',
    accent: '#0EA5E9',
    categoryId: 'defence',
    probe: /\bafcat\b|air force common admission|\bfcat\b/i,
    probeRequired: true,
    seoDescription:
      'AFCAT 2026 notification, apply dates, admit card, and results — official Indian Air Force officer recruitment.',
    seoBody:
      'AFCAT selects candidates for flying and ground duty branches of the Indian Air Force. Notifications appear on the official IAF career portal — verify medical and age standards in the official PDF before applying.',
    links: { admitCard: '/results/admit-card', results: '/results' },
  },
  {
    slug: 'uppsc',
    title: 'UPPSC 2026 — Uttar Pradesh Public Service Commission',
    shortTitle: 'UPPSC',
    board: 'Uttar Pradesh PSC',
    icon: '🏛️',
    accent: '#F97316',
    categoryId: 'state',
    probe: /\buppsc\b|uttar pradesh public service|up pcs|uppsc.*pcs/i,
    probeRequired: true,
    seoDescription:
      'UPPSC PCS, ARO, and state service notifications — official recruitment from uppsc.up.nic.in.',
    seoBody:
      'Uttar Pradesh Public Service Commission conducts PCS, review officer, and departmental examinations. All apply links must be on uppsc.up.nic.in or other official .gov.in UP portals.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'mpsc',
    title: 'MPSC 2026 — Maharashtra Public Service Commission',
    shortTitle: 'MPSC',
    board: 'Maharashtra PSC',
    icon: '🏛️',
    accent: '#EAB308',
    categoryId: 'state',
    probe: /\bmpsc\b|maharashtra public service|maharashtra pcs/i,
    probeRequired: true,
    seoDescription:
      'MPSC Rajyaseva, combine, and state service notifications — official maharashtra.gov.in recruitment.',
    seoBody:
      'Maharashtra Public Service Commission releases state civil service, police sub-inspector, and clerical recruitment on mpsc.gov.in. Verify Marathi language requirements in each notification.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'tnpsc',
    title: 'TNPSC 2026 — Tamil Nadu Public Service Commission',
    shortTitle: 'TNPSC',
    board: 'Tamil Nadu PSC',
    icon: '🏛️',
    accent: '#14B8A6',
    categoryId: 'state',
    probe: /\btnpsc\b|tamil nadu public service|group [iiv]+.*tnpsc/i,
    probeRequired: true,
    seoDescription:
      'TNPSC Group I, II, IV and departmental exams — official notifications from tnpsc.gov.in.',
    seoBody:
      'Tamil Nadu PSC conducts Group examinations and direct recruitment for state government departments. Apply only on tnpsc.gov.in when applications are open.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'kpsc-karnataka',
    title: 'KPSC 2026 — Karnataka Public Service Commission',
    shortTitle: 'KPSC (KA)',
    board: 'Karnataka PSC',
    icon: '🏛️',
    accent: '#DC2626',
    categoryId: 'state',
    probe: /\bkpsc\b|karnataka public service|karnataka administrative service/i,
    probeRequired: true,
    seoDescription:
      'KPSC KAS, FDA, SDA, and state recruitment — official notifications from kpsc.kar.nic.in.',
    seoBody:
      'Karnataka Public Service Commission publishes KAS, gazetted, and non-gazetted vacancies on its official portal. Check Kannada language eligibility in the notification PDF.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'bpsc',
    title: 'BPSC 2026 — Bihar Public Service Commission',
    shortTitle: 'BPSC',
    board: 'Bihar PSC',
    icon: '🏛️',
    accent: '#059669',
    categoryId: 'state',
    probe: /\bbpsc\b|bihar public service|bihar pcs|68th bpsc|69th bpsc/i,
    probeRequired: true,
    seoDescription:
      'BPSC 68th/69th CCE and state service notifications — official bpsc.bih.nic.in recruitment.',
    seoBody:
      'Bihar Public Service Commission conducts combined competitive examinations and departmental tests for state cadre posts. All applications route through bpsc.bih.nic.in.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'rpsc',
    title: 'RPSC 2026 — Rajasthan Public Service Commission',
    shortTitle: 'RPSC',
    board: 'Rajasthan PSC',
    icon: '🏛️',
    accent: '#D97706',
    categoryId: 'state',
    probe: /\brpsc\b|rajasthan public service|rajasthan administrative service|\bras\b.*rpsc/i,
    probeRequired: true,
    seoDescription:
      'RPSC RAS, teacher, and state service notifications — official rpsc.rajasthan.gov.in recruitment.',
    seoBody:
      'Rajasthan Public Service Commission releases RAS, lecturer, and departmental vacancies on rpsc.rajasthan.gov.in. Verify domicile and Hindi proficiency rules per notification.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'wbpsc',
    title: 'WBPSC 2026 — West Bengal Public Service Commission',
    shortTitle: 'WBPSC',
    board: 'West Bengal PSC',
    icon: '🏛️',
    accent: '#2563EB',
    categoryId: 'state',
    probe: /\bwbppsc\b|\bpscwb\b|west bengal public service|wb pcs/i,
    probeRequired: true,
    seoDescription:
      'WBPSC/WBCS and state service notifications — official west bengal PSC recruitment.',
    seoBody:
      'West Bengal Public Service Commission conducts WBCS and other state examinations. Apply through psc.wb.gov.in or the URL specified in the official PDF.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'appsc',
    title: 'APPSC 2026 — Andhra Pradesh Public Service Commission',
    shortTitle: 'APPSC',
    board: 'Andhra Pradesh PSC',
    icon: '🏛️',
    accent: '#7C3AED',
    categoryId: 'state',
    probe: /\bappsc\b|andhra pradesh public service|group [iiv]+.*appsc/i,
    probeRequired: true,
    seoDescription:
      'APPSC Group I, II, III notifications — official appsc.gov.in state recruitment.',
    seoBody:
      'Andhra Pradesh PSC publishes group services and departmental recruitment on appsc.gov.in. Check local language and domicile clauses before applying.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'tspsc',
    title: 'TSPSC 2026 — Telangana Public Service Commission',
    shortTitle: 'TSPSC',
    board: 'Telangana PSC',
    icon: '🏛️',
    accent: '#BE185D',
    categoryId: 'state',
    probe: /\btspsc\b|telangana public service|group [iiv]+.*tspsc/i,
    probeRequired: true,
    seoDescription:
      'TSPSC Group I, II, IV and state notifications — official tspsc.gov.in recruitment.',
    seoBody:
      'Telangana Public Service Commission conducts group examinations for state government posts. All official notifications link from tspsc.gov.in.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'gpsc',
    title: 'GPSC 2026 — Gujarat Public Service Commission',
    shortTitle: 'GPSC',
    board: 'Gujarat PSC',
    icon: '🏛️',
    accent: '#EA580C',
    categoryId: 'state',
    probe: /\bgpsc\b|gujarat public service|gujarat administrative service/i,
    probeRequired: true,
    seoDescription:
      'GPSC class 1–3 and state service notifications — official gpsc.gujarat.gov.in recruitment.',
    seoBody:
      'Gujarat Public Service Commission releases class I, II, and III vacancies on gpsc.gujarat.gov.in. Verify Gujarati language requirements where applicable.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'hpsc',
    title: 'HPSC 2026 — Haryana Public Service Commission',
    shortTitle: 'HPSC',
    board: 'Haryana PSC',
    icon: '🏛️',
    accent: '#0891B2',
    categoryId: 'state',
    probe: /\bhpsc\b|haryana public service|haryana civil service|\bhcs\b.*haryana/i,
    probeRequired: true,
    seoDescription:
      'HPSC HCS and state service notifications — official hpsc.gov.in recruitment.',
    seoBody:
      'Haryana Public Service Commission conducts HCS and allied services examinations. Apply only on hpsc.gov.in when the notification is active.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
  {
    slug: 'kerala-psc',
    title: 'Kerala PSC 2026',
    shortTitle: 'Kerala PSC',
    board: 'Kerala Public Service Commission',
    icon: '🏛️',
    accent: '#16A34A',
    categoryId: 'state',
    probe: /\bkerala public service|\bkpsc\b.*kerala|keralapsc|thulasi.*kerala/i,
    probeRequired: true,
    seoDescription:
      'Kerala PSC Thulasi notifications — official keralapsc.gov.in recruitment and last dates.',
    seoBody:
      'Kerala Public Service Commission publishes rank lists and recruitment notifications on keralapsc.gov.in (Thulasi portal). One-time registration is required before applying.',
    links: { results: '/results', admitCard: '/results/admit-card' },
  },
]

export const EXAM_SLUGS = EXAMS.map((e) => e.slug)

const EXAM_BY_SLUG = new Map(EXAMS.map((e) => [e.slug, e]))

export function getExamBySlug(slug: string | null | undefined): ExamDef | null {
  if (!slug) return null
  return EXAM_BY_SLUG.get(slug.toLowerCase()) ?? null
}

export function isValidExamSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && EXAM_BY_SLUG.has(slug.toLowerCase()))
}

export function examRoutePath(slug: string): string {
  return `/exam/${encodeURIComponent(slug)}`
}

export function jobMatchesExam(job: JobRecord, exam: ExamDef): boolean {
  const text = jobProbeText(job)
  const probeMatch = exam.probe.test(text)

  if (exam.probeRequired) return probeMatch

  if (exam.categoryId && job.category === exam.categoryId) {
    return probeMatch || /\b202[4-9]\b|recruitment|notification|vacancy/i.test(text)
  }

  return probeMatch
}

export type ExamCount = { listings: number; vacancies: number; live: number }

export function computeExamCounts(jobs: JobRecord[]): Record<string, ExamCount> {
  const out: Record<string, ExamCount> = {}
  for (const exam of EXAMS) {
    out[exam.slug] = { listings: 0, vacancies: 0, live: 0 }
  }
  for (const job of jobs) {
    for (const exam of EXAMS) {
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

export function filterJobsForExam(jobs: JobRecord[], exam: ExamDef): JobRecord[] {
  return jobs.filter((job) => jobMatchesExam(job, exam))
}
