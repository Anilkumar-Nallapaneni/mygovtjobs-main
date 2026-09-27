/** Hub routes already registered in AppRoutes. Shared by header, footer, and explore. */
export type ContentHubLink = {
  id: string
  href: string
  labelKey: string
  labelDefault: string
  descKey: string
  descDefault: string
  icon: string
}

export const CONTENT_HUB_LINKS: ContentHubLink[] = [
  {
    id: 'latest-results',
    href: '/latest-results',
    labelKey: 'hubs.latestResults',
    labelDefault: 'Latest results',
    descKey: 'hubs.latestResultsDesc',
    descDefault: 'Result notices grouped from official recruitment updates.',
    icon: '📊',
  },
  {
    id: 'admit-cards',
    href: '/admit-cards',
    labelKey: 'hubs.admitCards',
    labelDefault: 'Admit cards',
    descKey: 'hubs.admitCardsDesc',
    descDefault: 'Hall tickets and call letters from recruiting boards.',
    icon: '🎫',
  },
  {
    id: 'answer-keys',
    href: '/answer-keys',
    labelKey: 'hubs.answerKeys',
    labelDefault: 'Answer keys',
    descKey: 'hubs.answerKeysDesc',
    descDefault: 'Official answer keys released after the exam.',
    icon: '✅',
  },
  {
    id: 'upcoming-exams',
    href: '/upcoming-exams',
    labelKey: 'hubs.upcomingExams',
    labelDefault: 'Upcoming exams',
    descKey: 'hubs.upcomingExamsDesc',
    descDefault: 'Exam dates and application deadlines on the calendar.',
    icon: '📅',
  },
  {
    id: 'admission',
    href: '/admission',
    labelKey: 'hubs.admission',
    labelDefault: 'Admission',
    descKey: 'hubs.admissionDesc',
    descDefault: 'Official entrance-exam and admission portals.',
    icon: '🎓',
  },
  {
    id: 'scholarships',
    href: '/scholarships',
    labelKey: 'hubs.scholarships',
    labelDefault: 'Scholarships',
    descKey: 'hubs.scholarshipsDesc',
    descDefault: 'Central and state scholarship and fellowship portals.',
    icon: '💰',
  },
  {
    id: 'yojana',
    href: '/yojana',
    labelKey: 'hubs.yojana',
    labelDefault: 'Yojana',
    descKey: 'hubs.yojanaDesc',
    descDefault: 'Government welfare schemes and yojana portals.',
    icon: '🏛️',
  },
  {
    id: 'designations',
    href: '/designations',
    labelKey: 'hubs.designations',
    labelDefault: 'Designations',
    descKey: 'hubs.designationsDesc',
    descDefault: 'Browse live jobs by role — clerk, officer, teacher, and more.',
    icon: '👔',
  },
  {
    id: 'bookmarks',
    href: '/account/bookmarks',
    labelKey: 'hubs.bookmarks',
    labelDefault: 'Saved jobs',
    descKey: 'hubs.bookmarksDesc',
    descDefault: 'Jobs you starred. Sign in to sync them across devices.',
    icon: '★',
  },
]
