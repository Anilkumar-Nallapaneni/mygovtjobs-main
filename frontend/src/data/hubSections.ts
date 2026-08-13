import {
  ALL_INDIA_JOBS_PATH,
  BOARDS_INDEX_PATH,
  EXAM_CALENDAR_PATH,
  EXPLORE_HUB_PATH,
  EXAMS_INDEX_PATH,
  FAQ_PATH,
  GUIDE_EXAM_PREP_PATH,
  GUIDE_HOW_TO_APPLY_PATH,
  LATEST_NOTIFICATIONS_PATH,
  ORGANIZATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  RESULTS_TOPICS_INDEX_PATH,
  STATES_INDEX_PATH,
} from '@/utils/browseRoutes'
import { SITE_LINKS } from '@/data/siteLinks'

export type HubSectionDef = {
  id: string
  titleKey: string
  titleDefault: string
  cards: HubCardDef[]
}

export type HubCardDef = {
  id: string
  href: string
  icon: string
  titleKey: string
  titleDefault: string
  descKey: string
  descDefault: string
  accent?: string
}

export const HUB_SECTIONS: HubSectionDef[] = [
  {
    id: 'browse-jobs',
    titleKey: 'explore.sections.browseJobs',
    titleDefault: 'Browse government jobs',
    cards: [
      {
        id: 'hub-latest',
        href: LATEST_NOTIFICATIONS_PATH,
        icon: '📰',
        titleKey: 'nav.latest',
        titleDefault: 'Latest notifications',
        descKey: 'explore.cards.latestDesc',
        descDefault: 'Newest official recruitment notices with board, post, and last date.',
        accent: '#FF6B00',
      },
      {
        id: 'hub-states',
        href: STATES_INDEX_PATH,
        icon: '🗺️',
        titleKey: 'explore.cards.statesTitle',
        titleDefault: 'Jobs by state & UT',
        descKey: 'explore.cards.statesDesc',
        descDefault: 'Browse live listings from all 28 states and 8 union territories.',
        accent: '#22C55E',
      },
      {
        id: 'hub-boards',
        href: BOARDS_INDEX_PATH,
        icon: '🏛️',
        titleKey: 'explore.cards.boardsTitle',
        titleDefault: 'Jobs by board',
        descKey: 'explore.cards.boardsDesc',
        descDefault: 'UPSC, SSC, Railways, Banking, Defence, Police, Teaching, and more.',
        accent: '#38BDF8',
      },
      {
        id: 'hub-qualifications',
        href: QUALIFICATIONS_INDEX_PATH,
        icon: '🎓',
        titleKey: 'qualification.indexTitle',
        titleDefault: 'Jobs by qualification',
        descKey: 'explore.cards.qualificationsDesc',
        descDefault: '10th, 12th, ITI, diploma, graduate, engineering, and medical posts.',
        accent: '#A78BFA',
      },
      {
        id: 'hub-professions',
        href: PROFESSIONS_INDEX_PATH,
        icon: '👔',
        titleKey: 'profession.indexTitle',
        titleDefault: 'Jobs by profession',
        descKey: 'explore.cards.professionsDesc',
        descDefault: 'Medical, engineering, nursing, law, banking, and skilled trades.',
        accent: '#F472B6',
      },
      {
        id: 'hub-organizations',
        href: ORGANIZATIONS_INDEX_PATH,
        icon: '🏢',
        titleKey: 'organization.indexTitle',
        titleDefault: 'Jobs by recruitment board',
        descKey: 'explore.cards.organizationsDesc',
        descDefault: 'SSC, RRB, IBPS, AIIMS, IITs, state PSCs, and central departments.',
        accent: '#FB923C',
      },
      {
        id: 'hub-exams',
        href: EXAMS_INDEX_PATH,
        icon: '🎯',
        titleKey: 'exams.indexTitle',
        titleDefault: 'Popular government exams',
        descKey: 'exams.hubDesc',
        descDefault: 'SSC CGL, UPSC CSE, IBPS PO, RRB NTPC, CTET — each with its own landing page.',
        accent: '#FF6B00',
      },
      {
        id: 'hub-all-india',
        href: ALL_INDIA_JOBS_PATH,
        icon: '🇮🇳',
        titleKey: 'nav.allIndia',
        titleDefault: 'All India jobs',
        descKey: 'explore.cards.allIndiaDesc',
        descDefault: 'Nationwide recruitment open to candidates from every state.',
        accent: '#34D399',
      },
    ],
  },
  {
    id: 'exam-updates',
    titleKey: 'explore.sections.examUpdates',
    titleDefault: 'Exam results & updates',
    cards: [
      {
        id: 'hub-results',
        href: '/results',
        icon: '📊',
        titleKey: 'nav.results',
        titleDefault: 'Exam results',
        descKey: 'explore.cards.resultsDesc',
        descDefault: 'Official merit lists and score announcements from .gov.in sources.',
        accent: '#60A5FA',
      },
      {
        id: 'hub-admit',
        href: '/results/admit-card',
        icon: '🎫',
        titleKey: 'nav.admitCard',
        titleDefault: 'Admit cards',
        descKey: 'explore.cards.admitDesc',
        descDefault: 'Hall tickets and call letters for upcoming government exams.',
        accent: '#FBBF24',
      },
      {
        id: 'hub-answer-keys',
        href: '/results/answer-key',
        icon: '✅',
        titleKey: 'footer.answerKeys',
        titleDefault: 'Answer keys',
        descKey: 'explore.cards.answerKeysDesc',
        descDefault: 'Official answer keys and response sheets after the exam.',
        accent: '#4ADE80',
      },
      {
        id: 'hub-syllabus',
        href: '/results/syllabus',
        icon: '📚',
        titleKey: 'footer.syllabus',
        titleDefault: 'Syllabus & pattern',
        descKey: 'explore.cards.syllabusDesc',
        descDefault: 'Exam syllabus, pattern, and scheme from recruiting bodies.',
        accent: '#C084FC',
      },
      {
        id: 'hub-exam-topics',
        href: RESULTS_TOPICS_INDEX_PATH,
        icon: '🔔',
        titleKey: 'results.indexTitle',
        titleDefault: 'All exam updates',
        descKey: 'explore.cards.examTopicsDesc',
        descDefault: 'Cutoff, previous papers, and every official exam update topic.',
        accent: '#67E8F9',
      },
      {
        id: 'hub-exam-calendar',
        href: EXAM_CALENDAR_PATH,
        icon: '📅',
        titleKey: 'footer.examCalendar',
        titleDefault: 'Exam calendar',
        descKey: 'explore.cards.examCalendarDesc',
        descDefault: 'Application deadlines sorted by date — never miss a last date.',
        accent: '#EF4444',
      },
    ],
  },
  {
    id: 'help-tools',
    titleKey: 'explore.sections.helpTools',
    titleDefault: 'Alerts, guides & support',
    cards: [
      {
        id: 'hub-alerts',
        href: '/alerts',
        icon: '🔔',
        titleKey: 'nav.alert',
        titleDefault: 'Job alerts',
        descKey: 'explore.cards.alertsDesc',
        descDefault: 'Free email, WhatsApp, Telegram, and push alerts for new postings.',
        accent: '#FF6B00',
      },
      {
        id: 'hub-how-to-apply',
        href: GUIDE_HOW_TO_APPLY_PATH,
        icon: '📝',
        titleKey: 'explore.cards.howToApplyTitle',
        titleDefault: 'How to apply',
        descKey: 'explore.cards.howToApplyDesc',
        descDefault: 'Step-by-step guide to applying for sarkari jobs safely online.',
        accent: '#38BDF8',
      },
      {
        id: 'hub-exam-prep',
        href: GUIDE_EXAM_PREP_PATH,
        icon: '💡',
        titleKey: 'explore.cards.examPrepTitle',
        titleDefault: 'Exam preparation tips',
        descKey: 'explore.cards.examPrepDesc',
        descDefault: 'Smart strategies for SSC, UPSC, banking, and state PSC exams.',
        accent: '#A78BFA',
      },
      {
        id: 'hub-faq',
        href: FAQ_PATH,
        icon: '❓',
        titleKey: 'explore.cards.faqTitle',
        titleDefault: 'FAQ',
        descKey: 'explore.cards.faqDesc',
        descDefault: 'Answers to common questions about government job applications.',
        accent: '#22C55E',
      },
      {
        id: 'hub-contact',
        href: SITE_LINKS.contact,
        icon: '✉️',
        titleKey: 'footer.contact',
        titleDefault: 'Contact us',
        descKey: 'explore.cards.contactDesc',
        descDefault: 'Questions, feedback, or partnership — we reply within 2 business days.',
        accent: '#FB923C',
      },
      {
        id: 'hub-sitemap',
        href: '/sitemap',
        icon: '🧭',
        titleKey: 'footer.sitemap',
        titleDefault: 'Sitemap',
        descKey: 'explore.cards.sitemapDesc',
        descDefault: 'Every page on Live Govt Jobs — categories, states, and exam topics.',
        accent: '#60A5FA',
      },
    ],
  },
]

export { EXPLORE_HUB_PATH }
