import type { CategoryId } from '@/data/categories'
import type { JobRecord } from '@/types/job'
import { getQualificationBySlug, jobMatchesQualification } from '@/data/qualifications'
import { jobMatchesEducationFilterKey } from '@/utils/educationVacancySummary'
import { isJobExpired } from '@/utils/jobFilters'
import { effectiveVacancyCount } from '@/utils/jobMetadataUtils'

export type ProfessionFaqItem = { q: string; a: string }

export type ProfessionDef = {
  slug: string
  labelKey: string
  qualificationSlug?: string
  categoryId?: CategoryId
  filterKey?: string
  filterKeys?: string[]
  /** Narrow a broader qual/category match (e.g. nursing within health). */
  probe?: RegExp
  probeRequired?: boolean
  /** Match by text probe only (law). */
  probeOnly?: boolean
  title?: string
  seoDescription?: string
  seoBody?: string
  faq?: ProfessionFaqItem[]
}

function jobProbe(job: JobRecord) {
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

function vacancyCount(job: JobRecord) {
  return effectiveVacancyCount(job)
}

export const PROFESSIONS: ProfessionDef[] = [
  {
    slug: 'medical',
    labelKey: 'profession.medical',
    qualificationSlug: 'medical',
    title: 'Medical Government Jobs 2026',
    seoDescription:
      'MBBS, specialist doctor, and paramedical recruitment from AIIMS, ESIC, state health departments, and official .gov.in notifications.',
    seoBody:
      'Medical government jobs cover MBBS officers, specialists, lab technicians, and allied health posts published on AIIMS, ESIC, state health directorates, and NHM portals. Every listing on My Govt Jobs links to the original PDF or apply page on a verified government domain — not third-party aggregators.',
    faq: [
      {
        q: 'Which qualifications are eligible for medical government jobs?',
        a: 'Most notifications require MBBS, BDS, nursing diplomas, or paramedical degrees. Each post lists the exact qualification in the official PDF.',
      },
      {
        q: 'Are these medical job listings from official sources?',
        a: 'Yes. We ingest only from verified .gov.in and official hospital or recruitment board websites.',
      },
    ],
  },
  {
    slug: 'engineering',
    labelKey: 'profession.engineering',
    qualificationSlug: 'btech',
    title: 'Engineering Government Jobs 2026',
    seoDescription:
      'B.Tech / B.E graduate posts in PSU, SSC JE, railways, and state engineering departments from official sources.',
    seoBody:
      'Engineering government recruitment spans PSU graduate trainee posts, SSC Junior Engineer exams, railway JE/AEE vacancies, and state PWD notifications. Filter live listings by deadline or post count and open the official notification PDF directly.',
    faq: [
      {
        q: 'Can diploma holders apply for engineering government jobs?',
        a: 'Many JE and technician posts accept diploma engineering. Graduate-only posts specify B.Tech/B.E in the official notification.',
      },
      {
        q: 'Which boards recruit engineers most often?',
        a: 'PSUs (BHEL, NTPC, ONGC), SSC, RRB, and state PWD or irrigation departments publish regular engineering vacancies.',
      },
    ],
  },
  {
    slug: 'law',
    labelKey: 'profession.law',
    probeOnly: true,
    probe: /\blaw\b|legal|llb|judicial|advocate|court/i,
    title: 'Law & Legal Government Jobs 2026',
    seoDescription:
      'Law officer, public prosecutor, judicial clerk, and legal assistant posts from courts and government departments.',
    seoBody:
      'Legal government recruitment includes law officers in ministries, public prosecutors, judicial assistants, and court clerk posts. Listings are matched by LLB qualification or legal role keywords in official notifications.',
    faq: [
      {
        q: 'Do I need an LLB for legal government jobs?',
        a: 'Most law officer and prosecutor posts require LLB or equivalent. Clerk and assistant posts may accept different qualifications — check each PDF.',
      },
      {
        q: 'Are judiciary exams listed here?',
        a: 'We list official recruitment notifications from high courts, district courts, and public service commissions when published on .gov.in portals.',
      },
    ],
  },
  {
    slug: 'finance',
    labelKey: 'profession.finance',
    filterKey: 'banking',
    title: 'Finance & Banking Government Jobs 2026',
    seoDescription:
      'IBPS, RBI, SBI, and public-sector finance officer recruitment from official banking and finance portals.',
    seoBody:
      'Finance sector listings include IBPS clerk and PO exams, RBI grade B, SBI specialist cadre, and accounts officer posts in government departments. All apply links resolve to official bank or ministry websites.',
    faq: [
      {
        q: 'Are IBPS and RBI notifications included?',
        a: 'Yes, when published on official IBPS, RBI, or government career portals.',
      },
      {
        q: 'Can commerce graduates apply?',
        a: 'Banking and accounts officer posts often accept B.Com, MBA finance, or CA — see the qualification column in each notification.',
      },
    ],
  },
  {
    slug: 'nursing',
    labelKey: 'profession.nursing',
    qualificationSlug: 'medical',
    probe: /nurs/i,
    probeRequired: true,
    title: 'Nursing Government Jobs 2026',
    seoDescription:
      'Staff nurse, ANM, GNM, and nursing officer posts from hospitals and state health missions.',
    seoBody:
      'Nursing recruitment covers staff nurse, nursing superintendent, ANM/GNM, and community health nurse posts in AIIMS, ESIC, state NHM, and district hospitals. Listings are narrowed from health-sector notifications using nursing-specific keywords.',
    faq: [
      {
        q: 'Which nursing qualifications are accepted?',
        a: 'GNM, B.Sc Nursing, ANM, and MSc Nursing — depending on the post level in the official notification.',
      },
      {
        q: 'Are walk-in nursing vacancies listed?',
        a: 'Yes, when hospitals publish walk-in nurse recruitment on official .gov.in or hospital career pages.',
      },
    ],
  },
  {
    slug: 'pharmacy',
    labelKey: 'profession.pharmacy',
    qualificationSlug: 'medical',
    probe: /pharma/i,
    probeRequired: true,
    title: 'Pharmacy Government Jobs 2026',
    seoDescription:
      'Pharmacist, drug inspector, and hospital pharmacy posts from health departments and PSUs.',
    seoBody:
      'Pharmacy government jobs include hospital pharmacists, drug inspectors, and quality control chemists in ESIC, AIIMS, state drug control, and PSU medical units. Matched from official health recruitment using pharmacy-related keywords.',
    faq: [
      {
        q: 'Is B.Pharm or D.Pharm required?',
        a: 'Hospital pharmacist posts typically need B.Pharm with registration. Some assistant posts accept D.Pharm — verify in the PDF.',
      },
      {
        q: 'Are drug inspector posts listed?',
        a: 'Yes, when state drug control or UPSC publishes official drug inspector recruitment.',
      },
    ],
  },
  {
    slug: 'teaching',
    labelKey: 'profession.teaching',
    qualificationSlug: 'teaching',
    title: 'Teaching Government Jobs 2026',
    seoDescription:
      'TGT, PGT, lecturer, and faculty recruitment from KVS, NVS, universities, and state education boards.',
    seoBody:
      'Teaching listings include school teachers (TGT/PGT), college lecturers, and university faculty posts from KVS, NVS, UGC NET-based recruitment, and state TET boards. Each links to the official board notification.',
    faq: [
      {
        q: 'Do teaching posts require B.Ed?',
        a: 'School teaching posts usually require B.Ed or equivalent. College lecturer posts may need NET/Ph.D. — check each notification.',
      },
      {
        q: 'Are KVS and NVS vacancies included?',
        a: 'Yes, from official KVS, NVS, and state education department career portals.',
      },
    ],
  },
  {
    slug: 'iti-diploma',
    labelKey: 'profession.itiDiploma',
    filterKeys: ['iti', 'diploma'],
    title: 'ITI / Diploma Government Jobs 2026',
    seoDescription:
      'ITI trade and diploma holder posts in railways, PSUs, defence, and state departments.',
    seoBody:
      'ITI and diploma government jobs cover technician, operator, and tradesman posts in Indian Railways, ordnance factories, PSUs, and municipal corporations. Filter by trade or deadline and apply through official portals only.',
    faq: [
      {
        q: 'Which ITI trades are in demand?',
        a: 'Electrician, fitter, welder, COPA, and mechanic trades appear frequently in railway and PSU notifications.',
      },
      {
        q: 'Can ITI holders apply for railway jobs?',
        a: 'Yes — RRB and railway workshops regularly recruit ITI certificate holders for technician posts.',
      },
    ],
  },
  {
    slug: 'any-degree',
    labelKey: 'profession.anyDegree',
    filterKey: 'graduate',
    title: 'Any Degree Government Jobs 2026',
    seoDescription:
      'Graduate-level posts open to any bachelor degree — clerks, assistants, and general cadre recruitment.',
    seoBody:
      'Any-degree listings show graduate-level government posts that accept a general bachelor qualification — clerks, assistants, stenographers, and multi-tasking officer cadres in SSC, state PSC, and central ministries.',
    faq: [
      {
        q: 'Does any degree mean all graduates can apply?',
        a: 'Most posts accept any recognised bachelor degree, but some specify stream (science/arts/commerce) in the official PDF.',
      },
      {
        q: 'Are SSC graduate jobs included?',
        a: 'Yes — SSC CGL, CHSL, and state PSC graduate posts appear when officially published.',
      },
    ],
  },
  {
    slug: 'dental',
    labelKey: 'profession.dental',
    qualificationSlug: 'medical',
    probe: /dental|\bbds\b|dentist|dental surgeon/i,
    probeRequired: true,
    title: 'Dental Government Jobs 2026',
    seoDescription:
      'BDS dental surgeon, dental officer, and hospital dentist posts from AIIMS, ESIC, and state health departments.',
    seoBody:
      'Dental government recruitment covers dental surgeons in ESIC hospitals, AIIMS dental officer posts, army dental corps, and state health department BDS vacancies. Listings are matched from official health notifications using BDS and dental keywords.',
    faq: [
      {
        q: 'Is BDS mandatory for dental government jobs?',
        a: 'Yes — dental surgeon and dental officer posts require BDS with state dental council registration unless the PDF states otherwise.',
      },
      {
        q: 'Are ESIC and AIIMS dental posts listed?',
        a: 'Yes, when published on official ESIC, AIIMS, or .gov.in health recruitment pages.',
      },
    ],
  },
  {
    slug: 'aviation',
    labelKey: 'profession.aviation',
    probeOnly: true,
    probe: /aviation|\baai\b|dgca|pilot|cockpit|cabin crew|air traffic|airport authority|flight attendant/i,
    title: 'Aviation Government Jobs 2026',
    seoDescription:
      'AAI, DGCA, airport authority, ATC, and civil aviation recruitment from official ministry and PSU portals.',
    seoBody:
      'Aviation sector government jobs include Airports Authority of India (AAI) junior executive posts, DGCA vacancies, air traffic control trainees, and ministry of civil aviation appointments. All listings link to official AAI, DGCA, or .gov.in career pages.',
    faq: [
      {
        q: 'Does AAI recruit through government notifications?',
        a: 'Yes — AAI publishes junior executive, manager, and apprentice recruitment on its official career portal and .gov.in.',
      },
      {
        q: 'Are pilot jobs listed here?',
        a: 'We list official government and PSU aviation posts. Commercial airline pilot hiring is typically outside .gov.in scope.',
      },
    ],
  },
  {
    slug: 'naval',
    labelKey: 'profession.naval',
    qualificationSlug: 'defence',
    probe: /navy|naval|agniveer|agniveers|sailor|Indian Navy|joinindiannavy|navik|SSR/i,
    probeRequired: true,
    title: 'Naval / Navy Government Jobs 2026',
    seoDescription:
      'Indian Navy sailor, Agniveer, SSR, MR, and naval civilian recruitment from joinindiannavy.gov.in and official sources.',
    seoBody:
      'Naval recruitment listings cover Indian Navy Agniveer, SSR, MR, sailor, and naval dockyard apprentice posts. Matched from defence notifications using navy-specific keywords so army-only listings are excluded.',
    faq: [
      {
        q: 'What is Navy Agniveer recruitment?',
        a: 'Agniveer (SSR/MR) is short-service sailor recruitment published on joinindiannavy.gov.in with age and fitness criteria in the official PDF.',
      },
      {
        q: 'Are naval dockyard apprentice posts included?',
        a: 'Yes, when naval shipyards and dockyards publish official apprentice or trade recruitment.',
      },
    ],
  },
  {
    slug: 'hotel-management',
    labelKey: 'profession.hotelManagement',
    probeOnly: true,
    probe: /hotel management|hospitality|\bHM\b|food and beverage|f\s*&\s*b|housekeeping manager|catering officer/i,
    title: 'Hotel Management Government Jobs 2026',
    seoDescription:
      'Hospitality, catering, and hotel management officer posts in railways, defence mess, and tourism departments.',
    seoBody:
      'Hotel management government jobs include catering supervisors in Indian Railways, defence institute hospitality posts, tourism department guides, and IHCL/ PSU hospitality cadre when officially advertised on .gov.in portals.',
    faq: [
      {
        q: 'Which degree is needed for HM government posts?',
        a: 'Most posts require a B.Sc in Hotel Management or diploma in hospitality — check each official notification.',
      },
      {
        q: 'Does Indian Railways recruit hotel management graduates?',
        a: 'Yes — IRCTC and railway catering units publish hospitality supervisor and manager posts on official portals.',
      },
    ],
  },
  {
    slug: 'sports-quota',
    labelKey: 'profession.sportsQuota',
    probeOnly: true,
    probe: /sports quota|sportsperson|sport\s+quota|athlete|sports\s+certificate|games\s+quota|national\s+player/i,
    title: 'Sports Quota Government Jobs 2026',
    seoDescription:
      'Sports quota vacancies in railways, police, and government departments for national and state-level sportspersons.',
    seoBody:
      'Sports quota government recruitment reserves posts for candidates with national or state-level sports achievements — common in Indian Railways, police departments, and PSU sports quota cadres. Each notification specifies required sports certificates and achievement level.',
    faq: [
      {
        q: 'Who is eligible for sports quota jobs?',
        a: 'Candidates with documented national/state-level sports achievements and a valid sports certificate as specified in the official notification.',
      },
      {
        q: 'Does Indian Railways have sports quota?',
        a: 'Yes — RRB and railway departments regularly publish sports quota posts for represented games.',
      },
    ],
  },
  {
    slug: 'architecture',
    labelKey: 'profession.architecture',
    probeOnly: true,
    probe: /architecture|\bB\.?\s*Arch\b|\barchitect\b(?!ural)|town planning|urban planner/i,
    title: 'Architecture Government Jobs 2026',
    seoDescription:
      'B.Arch architect, town planner, and CPWD architectural assistant posts from PWD and urban development departments.',
    seoBody:
      'Architecture government jobs include CPWD architect, town and country planning officers, PWD architectural assistants, and urban development authority posts requiring B.Arch or planning degrees. Matched using architecture and B.Arch keywords in official notifications.',
    faq: [
      {
        q: 'Is B.Arch required for architect government posts?',
        a: 'Most architect and planning officer posts require B.Arch or M.Plan with COA registration — verify in each PDF.',
      },
      {
        q: 'Are CPWD architect vacancies listed?',
        a: 'Yes, when CPWD, state PWD, or urban local bodies publish official architectural recruitment.',
      },
    ],
  },
  {
    slug: 'agriculture',
    labelKey: 'profession.agriculture',
    probeOnly: true,
    probe: /agriculture|agronom|icar\b|krishi|kisan|farm(?:ing|er)|horticultur|soil science|animal husbandry/i,
    title: 'Agriculture Government Jobs 2026',
    seoDescription:
      'ICAR, KVK, state agriculture department, and horticulture officer recruitment from official .gov.in sources.',
    seoBody:
      'Agriculture government recruitment spans ICAR scientist and technician posts, Krishi Vigyan Kendra officers, state agriculture extension officers, and horticulture department vacancies. Listings come from ICAR institutes, state krishi departments, and official PSU farm units.',
    faq: [
      {
        q: 'Which degrees qualify for agriculture government jobs?',
        a: 'B.Sc Agriculture, horticulture, animal husbandry, and MSc agri-sciences — depending on the post level in the notification.',
      },
      {
        q: 'Are ICAR scientist posts listed?',
        a: 'Yes, when ICAR institutes and agricultural universities publish official ASRB or direct recruitment.',
      },
    ],
  },
  {
    slug: 'arts',
    labelKey: 'profession.arts',
    probeOnly: true,
    probe: /\bBA\b|\bB\.A\.|\bMA\b|\bM\.A\.|humanities|arts graduate|liberal arts|social science graduate/i,
    title: 'Arts & Humanities Government Jobs 2026',
    seoDescription:
      'BA, MA, and humanities graduate posts — clerks, assistants, and social sector cadres from official PSC and SSC sources.',
    seoBody:
      'Arts and humanities government jobs include graduate posts open to BA/MA holders — clerks, welfare officers, cultural department assistants, and general cadre SSC/state PSC vacancies. Matched using arts and humanities qualification keywords in official notifications.',
    faq: [
      {
        q: 'Can BA graduates get central government jobs?',
        a: 'Yes — SSC CHSL/CGL and many ministry assistant posts accept any graduate degree including BA.',
      },
      {
        q: 'Are MA humanities posts listed separately?',
        a: 'Postgraduate arts listings appear when notifications specify MA history, sociology, economics, or related subjects.',
      },
    ],
  },
]

const SLUG_MAP = new Map(PROFESSIONS.map((p) => [p.slug, p]))

export const PROFESSION_SLUGS = PROFESSIONS.map((p) => p.slug)

export function getProfessionBySlug(slug: string | null | undefined): ProfessionDef | null {
  if (!slug) return null
  return SLUG_MAP.get(slug.toLowerCase()) ?? null
}

export function isValidProfessionSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && SLUG_MAP.has(slug.toLowerCase()))
}

export function professionRoutePath(slug: string): string {
  return `/profession/${encodeURIComponent(slug)}`
}

export function applyProfessionToBrowseState(prof: ProfessionDef): {
  quickFilter: string | null
  categoryId: CategoryId | null
  qualificationSlug: string | null
} {
  if (prof.probeOnly) {
    return { quickFilter: null, categoryId: null, qualificationSlug: null }
  }
  if (prof.qualificationSlug) {
    const qual = getQualificationBySlug(prof.qualificationSlug)
    if (qual) {
      if (qual.categoryId) {
        return { quickFilter: null, categoryId: qual.categoryId, qualificationSlug: null }
      }
      return {
        quickFilter: qual.filterKey ?? qual.bucketId ?? null,
        categoryId: null,
        qualificationSlug: prof.probeRequired ? null : prof.qualificationSlug,
      }
    }
  }
  if (prof.categoryId) {
    return { quickFilter: null, categoryId: prof.categoryId, qualificationSlug: null }
  }
  if (prof.filterKey) {
    return { quickFilter: prof.filterKey, categoryId: null, qualificationSlug: null }
  }
  if (prof.filterKeys?.length) {
    return { quickFilter: prof.filterKeys[0], categoryId: null, qualificationSlug: null }
  }
  return { quickFilter: null, categoryId: null, qualificationSlug: null }
}

export function jobMatchesProfession(job: JobRecord, prof: ProfessionDef): boolean {
  const probe = jobProbe(job)

  if (prof.probeOnly && prof.probe) {
    return prof.probe.test(probe)
  }

  if (prof.filterKeys?.length) {
    return prof.filterKeys.some((key) => jobMatchesEducationFilterKey(job, key))
  }

  if (prof.probeRequired && prof.probe && !prof.probe.test(probe)) {
    return false
  }

  if (prof.qualificationSlug) {
    const qual = getQualificationBySlug(prof.qualificationSlug)
    if (qual && jobMatchesQualification(job, qual)) {
      if (prof.probe) return prof.probe.test(probe)
      return true
    }
    if (prof.probe && prof.probe.test(probe)) return true
    return false
  }

  if (prof.categoryId && job.category === prof.categoryId) {
    if (prof.probe) return prof.probe.test(probe)
    return true
  }

  if (prof.filterKey && jobMatchesEducationFilterKey(job, prof.filterKey)) {
    return true
  }

  if (prof.probe && !prof.probeRequired) {
    return prof.probe.test(probe)
  }

  return false
}

export type ProfessionCount = { listings: number; vacancies: number }

export function computeProfessionCounts(jobs: JobRecord[]): Record<string, ProfessionCount> {
  const out = Object.fromEntries(
    PROFESSIONS.map((p) => [p.slug, { listings: 0, vacancies: 0 }])
  ) as Record<string, ProfessionCount>

  for (const job of jobs) {
    if (isJobExpired(job)) continue
    const vac = vacancyCount(job)
    for (const prof of PROFESSIONS) {
      if (!jobMatchesProfession(job, prof)) continue
      out[prof.slug].listings += 1
      if (vac > 0) out[prof.slug].vacancies += vac
    }
  }

  return out
}

export function professionLandingTitle(prof: ProfessionDef, listingCount?: number): string {
  const qual = prof.qualificationSlug ? getQualificationBySlug(prof.qualificationSlug) : null
  const base =
    prof.title ??
    qual?.title?.replace('Government Jobs 2026', 'Jobs 2026') ??
    `${prof.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Government Jobs 2026`
  if (listingCount != null && listingCount > 0) {
    return `${base} — ${listingCount.toLocaleString()} live listings`
  }
  return base
}

export function professionLandingDescription(prof: ProfessionDef): string {
  if (prof.seoDescription) return prof.seoDescription
  const qual = prof.qualificationSlug ? getQualificationBySlug(prof.qualificationSlug) : null
  if (qual?.seoDescription) return qual.seoDescription
  return `Live ${prof.slug.replace(/-/g, ' ')} government recruitment from official .gov.in sources.`
}

export function professionDefaultSort(): 'expiringSoon' {
  return 'expiringSoon'
}
