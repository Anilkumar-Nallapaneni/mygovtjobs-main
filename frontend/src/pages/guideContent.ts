import type { StaticPageSection } from '@/pages/StaticPage'
import { FAQ_PATH, GUIDE_EXAM_PREP_PATH, GUIDE_HOW_TO_APPLY_PATH } from '@/utils/browseRoutes'

export const HOW_TO_APPLY_PAGE = {
  title: 'How to Apply for Government Jobs',
  description:
    'A step-by-step guide to finding, verifying, and applying for sarkari jobs safely through official portals.',
  path: GUIDE_HOW_TO_APPLY_PATH,
  sections: [
    {
      heading: '1. Find the official notification',
      paragraphs: [
        'Use My Govt Jobs to discover live recruitment, then open the job detail page. Every listing links to the recruiting organisation’s official .gov.in or .gov website.',
        'Never apply through third-party aggregators that charge fees. The application portal URL should match the board’s official domain.',
      ],
    },
    {
      heading: '2. Read the full notification PDF',
      paragraphs: [
        'Download and read the official notification PDF for eligibility, age limit, category-wise vacancies, exam pattern, and required documents.',
        'Check the last date and time zone (usually IST). Note whether the form closes at midnight or at a specific hour.',
      ],
    },
    {
      heading: '3. Register on the official portal',
      paragraphs: [
        'Create an account on the board’s application portal (e.g. upsconline.nic.in, ssc.nic.in, ibps.in). Use a valid email and mobile number you check daily.',
        'Upload photograph and signature as per the prescribed size and format. Keep scanned copies of certificates ready.',
      ],
    },
    {
      heading: '4. Fill the form carefully',
      paragraphs: [
        'Enter personal details exactly as on your 10th certificate. Select category (General/OBC/SC/ST/EWS) and PwBD status correctly.',
        'Preview the form before final submit. Take a screenshot or print the confirmation page and application number.',
      ],
    },
    {
      heading: '5. Pay fee only on official site',
      paragraphs: [
        'Application fees must be paid only on the official portal. My Govt Jobs never collects fees.',
        'Fee exemptions apply for SC/ST/PwBD/female candidates on many notifications — verify in the PDF.',
      ],
    },
    {
      heading: '6. Track admit card & results',
      paragraphs: [
        'Bookmark the board’s admit-card and results pages. Use our Exam Calendar to watch deadlines and our Results section for official updates.',
        'Subscribe to free job alerts on My Govt Jobs to get notified when new matching posts are published.',
      ],
    },
  ] satisfies StaticPageSection[],
}

export const EXAM_PREP_PAGE = {
  title: 'Government Exam Preparation Tips',
  description:
    'Practical strategies for SSC, UPSC, banking, railways, and state PSC exams — syllabus, mock tests, and time management.',
  path: GUIDE_EXAM_PREP_PATH,
  sections: [
    {
      heading: 'Know the syllabus first',
      paragraphs: [
        'Every exam has a defined syllabus on the official notification. Download it from our Syllabus section or the board website before buying books.',
        'Focus on previous-year question trends — SSC CGL, IBPS PO, and state PSC papers repeat similar patterns.',
      ],
    },
    {
      heading: 'Build a realistic timetable',
      paragraphs: [
        'Split daily study into quant, reasoning, English/Hindi, and general awareness blocks. Reserve weekends for full-length mocks.',
        'Revise weak topics every Sunday. Consistency beats cramming in the last month.',
      ],
    },
    {
      heading: 'Use official sources only',
      paragraphs: [
        'Practice from previous papers released by the commission, not random PDFs on social media.',
        'For current affairs, follow PIB, official board press releases, and standard yearbooks aligned to the exam level.',
      ],
    },
    {
      heading: 'Mock tests & analysis',
      paragraphs: [
        'Attempt timed mocks under exam conditions. Analyse every wrong answer — was it concept, silly mistake, or time pressure?',
        'Improve speed in quant and reasoning with short tricks only after fundamentals are solid.',
      ],
    },
    {
      heading: 'Interview & document verification',
      paragraphs: [
        'For posts with interviews, prepare state/national current affairs and your home district basics.',
        'Keep original certificates, caste/EWS certificates, and NOC (if employed) ready before the DV date.',
      ],
    },
  ] satisfies StaticPageSection[],
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'official',
    question: 'Are the jobs on My Govt Jobs official?',
    answer:
      'Yes. We list recruitment only from verified government portals ending in .gov.in or .gov. Always double-check on the recruiting organisation’s website before applying or paying any fee.',
  },
  {
    id: 'fees',
    question: 'Does My Govt Jobs charge application fees?',
    answer:
      'No. We are an information service. Application fees, if any, are paid only on the official board portal mentioned in the notification.',
  },
  {
    id: 'alerts',
    question: 'How do job alerts work?',
    answer:
      'Subscribe on our Alerts page with email, WhatsApp, Telegram, or push. We notify you when new official postings match your preferences. You can unsubscribe anytime.',
  },
  {
    id: 'last-date',
    question: 'How do I know the application last date?',
    answer:
      'Each job card shows the last date from the official notification. Use our Exam Calendar page to see all deadlines sorted by date.',
  },
  {
    id: 'qualification',
    question: 'Can I filter jobs by my education?',
    answer:
      'Yes. Browse by Qualification (10th, 12th, graduate, ITI, etc.) or use education filters on the home page. Job detail pages show eligibility from the official PDF.',
  },
  {
    id: 'results',
    question: 'Where do I check exam results and admit cards?',
    answer:
      'Visit our Results and Admit Card pages. They link to official RSS feeds and portals — not unofficial mirrors.',
  },
  {
    id: 'states',
    question: 'How do I find jobs in my state?',
    answer:
      'Open Jobs by State, pick your state or UT, or use the interactive India map on the home page. State PSC and department notifications are included.',
  },
  {
    id: 'contact',
    question: 'How can I contact the team?',
    answer:
      'Use the Contact page or email contact@livegovtjobs.com. We respond within 2 business days for feedback, corrections, and partnership enquiries.',
  },
]

export { FAQ_PATH }
