/**
 * Static/legal page copy for prerendered HTML.
 * Sourced from frontend/src/pages/legalContent.ts and guideContent.ts — keep in sync.
 */

export const STATIC_PAGES = [
  {
    path: "/about",
    file: ["about.html"],
    title: "About Us",
    description:
      "Official government job alerts from verified .gov.in sources. Daily sync, free alerts, and 22+ Indian languages.",
    sections: [
      {
        heading: "Mission",
        paragraphs: [
          "Live Govt Jobs helps candidates discover live recruitment notifications from official government portals across India — UPSC, SSC, railways, banking, state PSCs, and more.",
          "We prioritise .gov.in and verified employer career sites over third-party aggregators.",
        ],
      },
      {
        heading: "Why trust us",
        paragraphs: [
          "Live Govt Jobs lists recruitment notifications collected directly from official government portals (.gov.in, .gov, and verified employer career sites). We do not copy third-party aggregator sites.",
          "Every job detail page links to official PDFs and apply URLs whenever they are published by the recruiting body.",
        ],
      },
      {
        heading: "How daily sync works",
        paragraphs: [
          "Every morning (IST), our daily update process scans 100+ official sources, validates titles and deadlines, and publishes live listings on the website.",
          "The homepage shows when data was last synced. Job detail pages are enriched from official PDF notifications where available.",
          "The site interface is available in many Indian languages, but job notification text stays in its original language (usually English) as published by the recruiting body.",
        ],
      },
      {
        heading: "What is Live Govt Jobs?",
        paragraphs: ["A free portal for live government job notifications from official sources across India."],
      },
      {
        heading: "Is it free?",
        paragraphs: ["Yes. Browsing listings and subscribing to alerts are free."],
      },
      {
        heading: "Do you take applications?",
        paragraphs: [
          "No. Live Govt Jobs is an information service only. Apply only on the recruiting organisation's official website.",
        ],
      },
    ],
  },
  {
    path: "/privacy",
    file: ["privacy.html"],
    title: "Privacy Policy",
    description: "How Live Govt Jobs collects, uses, and protects your information.",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "Live Govt Jobs lists government recruitment notifications from official portals (.gov.in / .gov). We do not sell your personal data.",
          "If you subscribe to job alerts, we store only the contact details and filters you provide (email address, Telegram chat ID, state/category preferences).",
        ],
      },
      {
        heading: "Data we collect",
        paragraphs: [
          "Alert subscriptions: channel type, delivery address, and optional filters you choose.",
          "Technical logs: standard web server and analytics data (browser type, pages visited) to keep the service reliable.",
          "Optional sign-in stores a display name and favourite states in your profile. We do not require account registration to browse jobs.",
        ],
      },
      {
        heading: "How we use data",
        paragraphs: [
          "To send job alerts you requested.",
          "To improve listing quality, fix broken sources, and prevent abuse.",
          "We do not use your alert details for unrelated marketing.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "You can unsubscribe from alerts using the link in alert emails or by contacting us.",
          "For data deletion requests, email contact@livegovtjobs.com with the address you used to subscribe.",
        ],
      },
    ],
  },
  {
    path: "/terms",
    file: ["terms.html"],
    title: "Terms of Service",
    description: "Terms for using the Live Govt Jobs website and alert service.",
    sections: [
      {
        heading: "Service",
        paragraphs: [
          "Live Govt Jobs aggregates links to official government recruitment notifications. We are an information service, not a recruiting agency.",
          "Always verify details on the recruiting organisation's official website before applying or paying any fee.",
        ],
      },
      {
        heading: "No guarantee",
        paragraphs: [
          "We strive for accuracy and timely updates but do not guarantee completeness, correctness, or availability of listings.",
          "Deadlines, vacancies, and eligibility can change on official portals without notice.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "Do not scrape, overload, or attempt to disrupt the service.",
          "Do not use alert subscriptions to send spam or impersonate others.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "Live Govt Jobs is provided as-is. We are not liable for decisions made based on listings, missed deadlines, or third-party site content.",
        ],
      },
    ],
  },
  {
    path: "/disclaimer",
    file: ["disclaimer.html"],
    title: "Disclaimer",
    description: "Important notice about government job listings on Live Govt Jobs.",
    sections: [
      {
        heading: "Official sources only",
        paragraphs: [
          "Live Govt Jobs lists jobs from official government portals (.gov.in / .gov) and verified employer career sites.",
          "We are not affiliated with UPSC, SSC, state PSCs, or any recruiting body unless explicitly stated.",
        ],
      },
      {
        heading: "Verify before applying",
        paragraphs: [
          "Always confirm eligibility, fees, and deadlines on the recruiting organisation's website before submitting an application.",
          "Beware of fraudulent sites asking for payment to \"guarantee\" selection.",
        ],
      },
    ],
  },
  {
    path: "/contact",
    file: ["contact.html"],
    title: "Contact",
    description: "Get in touch with the Live Govt Jobs team.",
    sections: [
      {
        heading: "General enquiries",
        paragraphs: [
          "Email: contact@livegovtjobs.com",
          "For incorrect listings, please include the job title and a link to the official notification.",
        ],
      },
      {
        heading: "Alerts",
        paragraphs: [
          "To subscribe or unsubscribe, use the Alerts page or the unsubscribe link in any alert email.",
        ],
      },
    ],
  },
  {
    path: "/faq",
    file: ["faq.html"],
    title: "FAQ — Government Job Alerts",
    description: "Answers to common questions about sarkari jobs, alerts, applications, results, and official sources.",
    sections: [
      {
        heading: "Are the jobs on Live Govt Jobs official?",
        paragraphs: [
          "Yes. We list recruitment only from verified government portals ending in .gov.in or .gov. Always double-check on the recruiting organisation's website before applying or paying any fee.",
        ],
      },
      {
        heading: "Does Live Govt Jobs charge application fees?",
        paragraphs: [
          "No. We are an information service. Application fees, if any, are paid only on the official board portal mentioned in the notification.",
        ],
      },
      {
        heading: "How do job alerts work?",
        paragraphs: [
          "Subscribe on our Alerts page with email, WhatsApp, Telegram, or push. We notify you when new official postings match your preferences. You can unsubscribe anytime.",
        ],
      },
      {
        heading: "How do I know the application last date?",
        paragraphs: [
          "Each job card shows the last date from the official notification. Use our Exam Calendar page to see all deadlines sorted by date.",
        ],
      },
    ],
  },
  {
    path: "/guide/how-to-apply",
    file: ["guide", "how-to-apply.html"],
    title: "How to Apply for Government Jobs",
    description:
      "A step-by-step guide to finding, verifying, and applying for sarkari jobs safely through official portals.",
    sections: [
      {
        heading: "1. Find the official notification",
        paragraphs: [
          "Use Live Govt Jobs to discover live recruitment, then open the job detail page. Every listing links to the recruiting organisation's official .gov.in or .gov website.",
          "Never apply through third-party aggregators that charge fees. The application portal URL should match the board's official domain.",
        ],
      },
      {
        heading: "2. Read the full notification PDF",
        paragraphs: [
          "Download and read the official notification PDF for eligibility, age limit, category-wise vacancies, exam pattern, and required documents.",
        ],
      },
      {
        heading: "5. Pay fee only on official site",
        paragraphs: [
          "Application fees must be paid only on the official portal. Live Govt Jobs never collects fees.",
        ],
      },
    ],
  },
  {
    path: "/guide/exam-preparation",
    file: ["guide", "exam-preparation.html"],
    title: "Government Exam Preparation Tips",
    description:
      "Practical strategies for SSC, UPSC, banking, railways, and state PSC exams — syllabus, mock tests, and time management.",
    sections: [
      {
        heading: "Know the syllabus first",
        paragraphs: [
          "Every exam has a defined syllabus on the official notification. Download it from our Syllabus section or the board website before buying books.",
        ],
      },
      {
        heading: "Use official sources only",
        paragraphs: [
          "Practice from previous papers released by the commission, not random PDFs on social media.",
        ],
      },
    ],
  },
];

export const NOT_FOUND_PAGE = {
  path: "/404",
  title: "Page not found",
  description:
    "That link does not match a page on this site. Try home, latest notifications, or explore.",
  noindex: true,
};

export const SPA_SHELL_ROUTES = [
  { path: "/jobs", file: ["jobs", "index.html"], title: "Browse Government Jobs", description: "Search and filter live government job listings by state, category, qualification, and deadline." },
  { path: "/jobs/latest-notifications", file: ["jobs", "latest-notifications.html"], title: "Latest Government Job Notifications", description: "State-wise table of latest official recruitment notifications — board, post, vacancies, qualification, and last date." },
  { path: "/jobs/all-india", file: ["jobs", "all-india.html"], title: "All India Government Jobs 2026", description: "Central government and nationwide recruitment notifications open to candidates across all states." },
  { path: "/sarkari-naukri", file: ["sarkari-naukri.html"], title: "Sarkari Naukri 2026 — Live Government Jobs", description: "Official sarkari naukri notifications from verified .gov.in sources — UPSC, SSC, railways, banking, state PSC, and PSU vacancies with apply links." },
  { path: "/government-jobs", file: ["government-jobs.html"], title: "Sarkari Naukri 2026 — Live Government Jobs", description: "Official sarkari naukri notifications from verified .gov.in sources — UPSC, SSC, railways, banking, state PSC, and PSU vacancies with apply links." },
  { path: "/results", file: ["results.html"], title: "Latest Government Job Results", description: "Official exam results and score announcements from government recruiting bodies across India." },
  { path: "/results/admit-card", file: ["results", "admit-card.html"], title: "Admit Cards — Government Exams", description: "Download links and updates for government exam admit cards from official sources." },
  { path: "/results/answer-key", file: ["results", "answer-key.html"], title: "Government Exam Answer Keys", description: "Official answer keys released after exam." },
  { path: "/results/cutoff", file: ["results", "cutoff.html"], title: "Cutoff Lists & Merit Marks", description: "Official cutoff marks, merit lists, and category-wise qualifying scores from government recruiting bodies." },
  { path: "/results/syllabus", file: ["results", "syllabus.html"], title: "Exam Syllabus — Official PDFs", description: "Download official exam syllabus and scheme of examination from verified government recruitment portals." },
  { path: "/results/previous-papers", file: ["results", "previous-papers.html"], title: "Previous Year Question Papers", description: "Previous year question papers and sample papers from official government exam boards and PSC websites." },
  { path: "/results/written-marks", file: ["results", "written-marks.html"], title: "Written Exam Marks", description: "Written exam marks, mains scorecards, and stage-wise result sheets from official government sources." },
  { path: "/results/interview", file: ["results", "interview.html"], title: "Interview & Viva Schedules", description: "Interview schedules, personality test dates, and viva voce announcements from government recruiters." },
  { path: "/results/last-date", file: ["results", "last-date.html"], title: "Deadline Extensions", description: "Last date extensions, revised deadlines, and closing date updates for government recruitment applications." },
  { path: "/results/topics", file: ["results", "topics.html"], title: "Government Exam Updates — Results, Admit Cards & More", description: "Official results, admit cards, answer keys, syllabus, cutoff lists, and previous papers from verified .gov.in sources." },
  { path: "/alerts", file: ["alerts.html"], title: "Job Alerts — Email & Telegram", description: "Subscribe to free alerts for new government jobs by state, category, and qualification." },
  { path: "/explore", file: ["explore.html"], title: "Explore — Jobs, Results & Guides", description: "Browse every section of Live Govt Jobs — states, categories, qualifications, exam calendar, alerts, and how-to-apply guides." },
  { path: "/sitemap", file: ["sitemap.html"], title: "Sitemap", description: "Browse all main pages, job categories, and states on Live Govt Jobs." },
  { path: "/qualifications", file: ["qualifications.html"], title: "Government Jobs by Qualification", description: "Find government jobs matched to your education — 10th, 12th, ITI, diploma, graduate, engineering, and more." },
  { path: "/professions", file: ["professions.html"], title: "Government Jobs by Profession", description: "Browse live recruitment by profession — medical, engineering, nursing, law, banking, ITI, dental, aviation, and more from official sources." },
  { path: "/organizations", file: ["organizations.html"], title: "Government Jobs by Organisation", description: "Browse live notifications by recruitment board — IITs, AIIMS, SSC, RRB, state PSCs, and more." },
  { path: "/states", file: ["states.html"], title: "Government Jobs by State & UT", description: "Live recruitment from all 28 states and 8 union territories — official PSC and department notifications." },
  { path: "/categories", file: ["categories.html"], title: "Government Jobs by Board", description: "UPSC, SSC, Railways, Banking, Defence, Police, Teaching, PSU, and State PSC listings from official sources." },
  { path: "/boards", file: ["boards.html"], title: "Government Jobs by Board", description: "UPSC, SSC, Railways, Banking, Defence, Police, Teaching, PSU, and State PSC listings from official sources." },
  { path: "/exams", file: ["exams.html"], title: "Popular Government Exams 2026", description: "SSC CGL, UPSC CSE, IBPS PO, RRB NTPC, CTET, and more — dedicated exam pages with live notifications and official links." },
  { path: "/exam-calendar", file: ["exam-calendar.html"], title: "Government Job Exam Calendar", description: "Application deadlines sorted by last date — plan ahead and never miss an official closing date." },
  { path: "/admission", file: ["admission.html"], title: "Live Govt Jobs — Live Government Job Alerts", description: "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India." },
  { path: "/scholarships", file: ["scholarships.html"], title: "Live Govt Jobs — Live Government Job Alerts", description: "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India." },
  { path: "/yojana", file: ["yojana.html"], title: "Live Govt Jobs — Live Government Job Alerts", description: "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India." },
  { path: "/latest-results", file: ["latest-results.html"], title: "Latest Government Job Results", description: "Official exam results and score announcements from government recruiting bodies across India." },
  { path: "/admit-cards", file: ["admit-cards.html"], title: "Admit Cards — Government Exams", description: "Download links and updates for government exam admit cards from official sources." },
  { path: "/answer-keys", file: ["answer-keys.html"], title: "Government Exam Answer Keys", description: "Official answer keys released after exam." },
  { path: "/upcoming-exams", file: ["upcoming-exams.html"], title: "Upcoming Exam Dates", description: "Announced exam dates across active recruitment cycles." },
  { path: "/designations", file: ["designations.html"], title: "Live Govt Jobs — Live Government Job Alerts", description: "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India." },
  { path: "/account", file: ["account.html"], title: "Account", description: "Manage your Live Govt Jobs account.", noindex: true },
  { path: "/account/bookmarks", file: ["account", "bookmarks.html"], title: "Bookmarks", description: "Saved government job listings.", noindex: true },
];
