import { CATS } from "@/data/categories";
import { STATES } from "@/data/states";
import { getLatestNotifStateChip } from "@/data/statesChips";
import { getSiteOrigin } from "@/data/siteLinks";
import { getOrgBySlug } from "@/data/orgIndex";
import { getQualificationBySlug } from "@/data/qualifications";
import { getResultTopicByKey } from "@/data/resultTopics";
import {
  ALL_INDIA_JOBS_PATH,
  BOARDS_INDEX_PATH,
  CATEGORIES_INDEX_PATH,
  EXAM_CALENDAR_PATH,
  EXAMS_INDEX_PATH,
  EXPLORE_HUB_PATH,
  FAQ_PATH,
  GUIDE_EXAM_PREP_PATH,
  GUIDE_HOW_TO_APPLY_PATH,
  LATEST_NOTIFICATIONS_PATH,
  ORGANIZATIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  RESULTS_TOPICS_INDEX_PATH,
  STATES_INDEX_PATH,
  parseBrowsePath,
  parseLatestNotifQuery,
  parseResultsHubQuery,
} from "@/utils/browseRoutes";
import { getProfessionBySlug, professionRoutePath } from "@/data/professions";
import { getExamBySlug } from "@/data/exams";
import { getCanonicalProfessionForQualification } from "@/data/professionCrossLinks";
import { isPrivatePath, SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH } from "@/data/siteMeta";
import { beginSeoHead } from "@/utils/seoHead";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/utils/structuredData";

const DEFAULT_DESCRIPTION = SITE_DESCRIPTION;

function stateLabel(stateId: string): string {
  return (
    getLatestNotifStateChip(stateId)?.n ||
    STATES.find((s) => s.id === stateId)?.n ||
    stateId.toUpperCase()
  );
}

function categoryLabel(categoryId: string): string {
  return CATS.find((c) => c.id === categoryId)?.name || categoryId.toUpperCase();
}

export type BrowseSeoMeta = {
  title: string;
  description: string;
  path: string;
};

export function browseSeoForPath(pathname: string, _search = ""): BrowseSeoMeta {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const parsed = parseBrowsePath(path);

  if (path === LATEST_NOTIFICATIONS_PATH) {
    const q = parseLatestNotifQuery(_search);
    if (q.professionSlug) {
      const prof = getProfessionBySlug(q.professionSlug);
      const label = prof?.slug === "medical" ? "Medical" : prof?.slug === "engineering" ? "Engineering" : prof?.slug?.replace(/-/g, " ") ?? q.professionSlug;
      return {
        path,
        title: `${label} Government Job Notifications | ${SITE_NAME}`,
        description: `Latest official ${label.toLowerCase()} recruitment notifications — board, post, vacancies, qualification, and last date.`,
      };
    }
    if (q.categoryId) {
      const label = categoryLabel(q.categoryId);
      return {
        path,
        title: `${label} Latest Notifications | ${SITE_NAME}`,
        description: `State-wise table of latest ${label} recruitment notifications from official government portals.`,
      };
    }
    if (q.stateId === "all") {
      return {
        path,
        title: `All India Latest Job Notifications | ${SITE_NAME}`,
        description:
          "Central government recruitment notifications open nationwide — board, post, vacancies, qualification, and last date.",
      };
    }
    if (q.stateId) {
      const label = stateLabel(q.stateId);
      return {
        path,
        title: `${label} Latest Job Notifications | ${SITE_NAME}`,
        description: `State-wise table of latest ${label} government recruitment notifications from official portals.`,
      };
    }
    if (q.showExpiring) {
      return {
        path,
        title: `Government Jobs Expiring Soon | ${SITE_NAME}`,
        description:
          "Official recruitment notifications with application deadlines in the next 7 days — apply before the last date.",
      };
    }
    return {
      path,
      title: `Latest Government Job Notifications | ${SITE_NAME}`,
      description:
        "State-wise table of latest official recruitment notifications — board, post, vacancies, qualification, and last date.",
    };
  }

  if (path === "/contact") {
    return {
      path,
      title: `Contact | ${SITE_NAME}`,
      description: `Contact the ${SITE_NAME} team — report incorrect listings or ask about alerts.`,
    };
  }

  if (path === "/sitemap") {
    return {
      path,
      title: `Sitemap | ${SITE_NAME}`,
      description: `Browse all main pages, job categories, and states on ${SITE_NAME}.`,
    };
  }

  if (path === "/about") {
    return {
      path,
      title: `About Us | ${SITE_NAME}`,
      description:
        "Official government job alerts from verified .gov.in sources. Daily sync, free alerts, and 22+ Indian languages.",
    };
  }

  if (path === "/privacy") {
    return {
      path,
      title: `Privacy Policy | ${SITE_NAME}`,
      description: "How Live Govt Jobs collects, uses, and protects your information.",
    };
  }

  if (path === "/terms") {
    return {
      path,
      title: `Terms of Service | ${SITE_NAME}`,
      description: "Terms for using the Live Govt Jobs website and alert service.",
    };
  }

  if (path === "/disclaimer") {
    return {
      path,
      title: `Disclaimer | ${SITE_NAME}`,
      description: "Important notice about government job listings on Live Govt Jobs.",
    };
  }

  if (path === QUALIFICATIONS_INDEX_PATH) {
    return {
      path,
      title: `Government Jobs by Qualification | ${SITE_NAME}`,
      description: "Find government jobs matched to your education — 10th, 12th, ITI, diploma, graduate, engineering, and more.",
    };
  }

  if (path === PROFESSIONS_INDEX_PATH) {
    return {
      path,
      title: `Government Jobs by Profession | ${SITE_NAME}`,
      description:
        "Browse live recruitment by profession — medical, engineering, nursing, law, banking, ITI, dental, aviation, and more from official sources.",
    };
  }

  if (path === ORGANIZATIONS_INDEX_PATH) {
    return {
      path,
      title: `Government Jobs by Organisation | ${SITE_NAME}`,
      description: "Browse live notifications by recruitment board — IITs, AIIMS, SSC, RRB, state PSCs, and more.",
    };
  }

  if (path === EXPLORE_HUB_PATH) {
    return {
      path,
      title: `Explore — Jobs, Results & Guides | ${SITE_NAME}`,
      description:
        `Browse every section of ${SITE_NAME} — states, categories, qualifications, exam calendar, alerts, and how-to-apply guides.`,
    };
  }

  if (path === EXAMS_INDEX_PATH) {
    return {
      path,
      title: `Popular Government Exams 2026 | ${SITE_NAME}`,
      description:
        "SSC CGL, UPSC CSE, IBPS PO, RRB NTPC, CTET, and more — dedicated exam pages with live notifications and official links.",
    };
  }

  const examMatch = /^\/exam\/([^/]+)$/i.exec(path);
  if (examMatch) {
    const slug = decodeURIComponent(examMatch[1]).toLowerCase();
    const exam = getExamBySlug(slug);
    if (exam) {
      return {
        path,
        title: `${exam.title} | ${SITE_NAME}`,
        description: exam.seoDescription,
      };
    }
  }

  if (path === STATES_INDEX_PATH) {
    return {
      path,
      title: `Government Jobs by State & UT | ${SITE_NAME}`,
      description: "Live recruitment from all 28 states and 8 union territories — official PSC and department notifications.",
    };
  }

  if (path === BOARDS_INDEX_PATH || path === CATEGORIES_INDEX_PATH) {
    return {
      path: BOARDS_INDEX_PATH,
      title: `Government Jobs by Board | ${SITE_NAME}`,
      description: "UPSC, SSC, Railways, Banking, Defence, Police, Teaching, PSU, and State PSC listings from official sources.",
    };
  }

  if (path === EXAM_CALENDAR_PATH) {
    return {
      path,
      title: `Government Job Exam Calendar | ${SITE_NAME}`,
      description: "Application deadlines sorted by last date — plan ahead and never miss an official closing date.",
    };
  }

  if (path === FAQ_PATH) {
    return {
      path,
      title: `FAQ — Government Job Alerts | ${SITE_NAME}`,
      description: "Answers to common questions about sarkari jobs, alerts, applications, results, and official sources.",
    };
  }

  if (path === GUIDE_HOW_TO_APPLY_PATH) {
    return {
      path,
      title: `How to Apply for Government Jobs | ${SITE_NAME}`,
      description: "Step-by-step guide to finding, verifying, and applying for sarkari jobs safely through official portals.",
    };
  }

  if (path === GUIDE_EXAM_PREP_PATH) {
    return {
      path,
      title: `Government Exam Preparation Tips | ${SITE_NAME}`,
      description: "Strategies for SSC, UPSC, banking, railways, and state PSC exams — syllabus, mocks, and time management.",
    };
  }

  if (path === ALL_INDIA_JOBS_PATH) {
    return {
      path,
      title: `All India Government Jobs 2026 | ${SITE_NAME}`,
      description: "Central government and nationwide recruitment notifications open to candidates across all states.",
    };
  }

  if (path === RESULTS_TOPICS_INDEX_PATH) {
    return {
      path,
      title: `Government Exam Updates — Results, Admit Cards & More | ${SITE_NAME}`,
      description:
        "Official results, admit cards, answer keys, syllabus, cutoff lists, and previous papers from verified .gov.in sources.",
    };
  }

  if (parsed.headlinesTopicKey) {
    const topic = getResultTopicByKey(parsed.headlinesTopicKey);
    if (topic) {
      const hubQ = parseResultsHubQuery(_search);
      const filterParts: string[] = [];
      if (hubQ.stateId) filterParts.push(stateLabel(hubQ.stateId));
      if (hubQ.categoryId) filterParts.push(categoryLabel(hubQ.categoryId));
      const filterSuffix = filterParts.length ? ` — ${filterParts.join(" · ")}` : "";
      const filterDesc = filterParts.length
        ? ` Official updates for ${filterParts.join(" and ")}.`
        : "";
      return {
        path,
        title: `${topic.title}${filterSuffix} | ${SITE_NAME}`,
        description: `${topic.seoDescription}${filterDesc}`,
      };
    }
  }

  if (parsed.professionSlug) {
    const prof = getProfessionBySlug(parsed.professionSlug);
    if (prof) {
      const title = prof.title ?? `${prof.slug.replace(/-/g, " ")} Government Jobs 2026`;
      return {
        path,
        title: `${title} | ${SITE_NAME}`,
        description: prof.seoDescription ?? `Live official ${prof.slug.replace(/-/g, " ")} recruitment from verified .gov.in sources.`,
      };
    }
  }

  if (parsed.qualificationSlug) {
    const qual = getQualificationBySlug(parsed.qualificationSlug);
    if (qual) {
      const canonical = getCanonicalProfessionForQualification(parsed.qualificationSlug);
      const professionHint = canonical
        ? ` Browse the full ${canonical.slug.replace(/-/g, " ")} sector at ${getSiteOrigin()}${professionRoutePath(canonical.slug)}.`
        : "";
      const titleBase = canonical?.title ?? qual.title;
      const descriptionBase = canonical?.seoDescription ?? qual.seoDescription;
      return {
        path,
        title: `${titleBase} | ${SITE_NAME}`,
        description: `${descriptionBase}${professionHint}`,
      };
    }
  }

  if (parsed.orgSlug) {
    const org = getOrgBySlug(parsed.orgSlug);
    if (org) {
      return {
        path,
        title: `${org.dept} Recruitment 2026 | ${SITE_NAME}`,
        description: `Live ${org.dept} government job notifications from official sources.`,
      };
    }
  }

  if (parsed.stateId) {
    const label = stateLabel(parsed.stateId);
    return {
      path,
      title: `${label} Government Jobs 2026 | ${SITE_NAME}`,
      description: `Browse live ${label} government job notifications from official state portals and PSC websites.`,
    };
  }

  if (parsed.categoryId) {
    const label = categoryLabel(parsed.categoryId);
    return {
      path,
      title: `${label} Government Jobs | ${SITE_NAME}`,
      description: `Official ${label} recruitment notifications, vacancies, and apply links from verified government sources.`,
    };
  }

  switch (parsed.view) {
    case "jobs":
      return {
        path: path === "/" ? "/jobs" : path,
        title: `Browse Government Jobs | ${SITE_NAME}`,
        description: "Search and filter live government job listings by state, category, qualification, and deadline.",
      };
    case "results":
      return {
        path,
        title: `Government Exam Results | ${SITE_NAME}`,
        description: "Official exam results and score announcements from government recruiting bodies across India.",
      };
    case "admit-card":
      return {
        path,
        title: `Admit Cards — Government Exams | ${SITE_NAME}`,
        description: "Download links and updates for government exam admit cards from official sources.",
      };
    case "alert":
      return {
        path,
        title: `Job Alerts — Email & Telegram | ${SITE_NAME}`,
        description: "Subscribe to free alerts for new government jobs by state, category, and qualification.",
      };
    default:
      return {
        path: path === "/" ? "/" : path,
        title: `${SITE_NAME} — Live Government Job Alerts`,
        description: DEFAULT_DESCRIPTION,
      };
  }
}

export function applyBrowseSeo(pathname: string, search = "") {
  const meta = browseSeoForPath(pathname, search);
  const origin = getSiteOrigin();
  const canonical = `${origin}${meta.path}`;
  const ogImage = `${origin}${SITE_OG_IMAGE_PATH}`;
  const privatePage = isPrivatePath(pathname);
  const head = beginSeoHead();

  head.setTitle(meta.title);
  head.upsertMeta("description", meta.description);
  head.upsertMeta("og:site_name", SITE_NAME, "property");
  head.upsertMeta("og:locale", "en_IN", "property");
  head.upsertMeta("og:title", meta.title, "property");
  head.upsertMeta("og:description", meta.description, "property");
  head.upsertMeta("og:type", "website", "property");
  head.upsertMeta("og:url", canonical, "property");
  head.upsertMeta("og:image", ogImage, "property");
  head.upsertMeta("twitter:card", "summary_large_image", "name");
  head.upsertMeta("twitter:image", ogImage, "name");
  head.upsertMeta("twitter:title", meta.title, "name");
  head.upsertMeta("twitter:description", meta.description, "name");
  head.upsertLink("canonical", canonical);

  if (privatePage) {
    head.upsertMeta("robots", "noindex, nofollow");
  } else {
    head.upsertMeta("robots", "index, follow, max-image-preview:large");
  }

  if (meta.path === "/" || meta.path === "/jobs") {
    head.upsertJsonLd("site-website-jsonld", buildWebSiteJsonLd());
    head.upsertJsonLd("site-organization-jsonld", buildOrganizationJsonLd());
  }

  return head.restore;
}
