import { SITE_DESCRIPTION, SITE_NAME } from "@/data/siteMeta";
import { SITE_ORIGIN } from "@/data/siteLinks";
import type { FaqItem } from "@/pages/guideContent";

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/jobs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/logo.png`,
    description: SITE_DESCRIPTION,
    sameAs: [
      "https://t.me/MyGovtJobs",
      "https://www.youtube.com/@MyGovtJobs",
      "https://x.com/MyGovtJobs",
      "https://www.instagram.com/mygovtjobs",
    ],
  };
}

export function buildFaqPageJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
