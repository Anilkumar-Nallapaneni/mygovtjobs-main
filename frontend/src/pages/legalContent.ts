import type { StaticPageSection } from "@/pages/StaticPage";

export const PRIVACY_PAGE = {
  title: "Privacy Policy",
  description: "How Live Govt Jobs collects, uses, and protects your information.",
  path: "/privacy",
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
        "Optional sign-in (Supabase Auth) stores a display name and favourite states in your profile. We do not require account registration to browse jobs.",
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
      heading: "Third parties",
      paragraphs: [
        "Job listings link to official government websites; their privacy policies apply when you leave our site.",
        "Email alerts may be delivered via Resend; Telegram alerts use the Telegram Bot API. Only the minimum data needed for delivery is shared.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can unsubscribe from alerts using the link in alert emails or by contacting us.",
        "For data deletion requests, email contact@livegovtjobs.com with the address you used to subscribe.",
      ],
    },
  ] satisfies StaticPageSection[],
};

export const TERMS_PAGE = {
  title: "Terms of Service",
  description: "Terms for using the Live Govt Jobs website and alert service.",
  path: "/terms",
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
      heading: "Intellectual property",
      paragraphs: [
        "Government notifications remain the property of their issuing bodies. Our UI, branding, and curated presentation are protected.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "Live Govt Jobs is provided as-is. We are not liable for decisions made based on listings, missed deadlines, or third-party site content.",
      ],
    },
  ] satisfies StaticPageSection[],
};

export const ABOUT_PAGE = {
  title: "About Us",
  description:
    "Official government job alerts from verified .gov.in sources. Daily sync, free alerts, and 22+ Indian languages.",
  path: "/about",
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
        "Live Govt Jobs lists recruitment notifications scraped directly from official government portals (.gov.in, .gov, and verified employer career sites). We do not copy third-party aggregator sites.",
        "Every job detail page links to official PDFs and apply URLs whenever they are published by the recruiting body.",
      ],
    },
    {
      heading: "How daily sync works",
      paragraphs: [
        "Every morning (IST), our ingest pipeline scans 100+ official sources, validates titles and deadlines, and publishes live listings on the website.",
        "The homepage shows when data was last synced. Job detail pages are enriched from official PDF notifications where available.",
        "The site interface is available in many Indian languages, but job notification text stays in its original language (usually English) as published by the recruiting body.",
      ],
    },
    {
      heading: "What is Live Govt Jobs?",
      paragraphs: [
        "A free portal for live government job notifications from official sources across India.",
      ],
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
    {
      heading: "Are listings accurate?",
      paragraphs: [
        "We source from official portals and validate listings daily. Always verify eligibility, fees, and deadlines on the official site before applying.",
      ],
    },
    {
      heading: "How often is the site updated?",
      paragraphs: [
        "Daily automated sync from official sources, with live status shown on the homepage.",
      ],
    },
    {
      heading: "Which sources do you use?",
      paragraphs: [
        "UPSC, SSC, RRB, IBPS, state PSCs, university career pages, and other .gov.in recruitment boards tracked in our official source directory.",
      ],
    },
    {
      heading: "Can I get alerts?",
      paragraphs: [
        "Yes — subscribe on the Alerts page via email, WhatsApp, or Telegram, filtered by state, category, and qualification.",
      ],
    },
    {
      heading: "Do I need an account?",
      paragraphs: [
        "No account is required to browse jobs. Optional sign-in saves favourite states on your profile.",
      ],
    },
    {
      heading: "Is job text translated?",
      paragraphs: [
        "Menus and labels are available in 22+ Indian languages. Notification text remains in the language published by the recruiting body (usually English).",
      ],
    },
    {
      heading: "How do I report a wrong listing?",
      paragraphs: [
        "Use the Contact page or email contact@livegovtjobs.com with the job title and a link to the official notification.",
      ],
    },
  ] satisfies StaticPageSection[],
};

export const CONTACT_PAGE = {
  title: "Contact",
  description: "Get in touch with the Live Govt Jobs team.",
  path: "/contact",
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
    {
      heading: "Advertising",
      paragraphs: [
        "For partnership or advertising enquiries, email contact@livegovtjobs.com with subject line \"Advertise\".",
      ],
    },
  ] satisfies StaticPageSection[],
};

export const DISCLAIMER_PAGE = {
  title: "Disclaimer",
  description: "Important notice about government job listings on Live Govt Jobs.",
  path: "/disclaimer",
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
  ] satisfies StaticPageSection[],
};
