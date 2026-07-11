import type { JobRecord } from "@/types/job";
import { jobDetailUrl } from "@/utils/jobRoutes";

const SITE_NAME = "My Govt Jobs";
const DEFAULT_OG_IMAGE = "/logo.png";
const DEFAULT_DESCRIPTION =
  "Latest government jobs, official notifications, and apply links from verified .gov.in portals across India.";

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as Element | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as Element | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function jobDescription(job: JobRecord): string {
  const summary =
    (typeof job.detail === "object" && job.detail && "summary" in job.detail
      ? String((job.detail as { summary?: string }).summary || "")
      : "") ||
    String(job.about || "");
  const trimmed = summary.replace(/\s+/g, " ").trim();
  if (trimmed.length > 155) return `${trimmed.slice(0, 152)}…`;
  if (trimmed) return trimmed;
  const dept = String(job.dept || "").trim();
  const qual = String(job.qual || job.qualification || "").trim();
  return [job.title, dept, qual].filter(Boolean).join(" — ") || DEFAULT_DESCRIPTION;
}

function defaultOgImage(job?: JobRecord | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.livegovtjobs.com";
  if (job?.slug || job?.id) {
    return `${origin}/og/job.svg?title=${encodeURIComponent(String(job.title || "Govt Job").slice(0, 80))}`;
  }
  return `${origin}${DEFAULT_OG_IMAGE}`;
}

function parseIsoDate(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function buildJobPostingJsonLd(job: JobRecord): Record<string, unknown> | null {
  if (!job.title) return null;
  const url = jobDetailUrl(job);
  const validThrough = parseIsoDate(job.lastDate ?? job.last_date);
  const datePosted = parseIsoDate(job.published_at ?? job.publishedDate);

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    hiringOrganization: {
      "@type": "Organization",
      name: String(job.dept || "Government of India recruitment"),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
        addressRegion: String(job.state || "India"),
      },
    },
    employmentType: "FULL_TIME",
    industry: "Government",
    url: url || undefined,
  };

  if (datePosted) posting.datePosted = datePosted;
  const dateModified = parseIsoDate(job.updatedDate ?? job.updated_at);
  if (dateModified) posting.dateModified = dateModified;
  if (validThrough) posting.validThrough = validThrough;
  if (Number(job.vacancies) > 0) {
    posting.totalJobOpenings = Number(job.vacancies);
  }

  return posting;
}

export function applyJobSeo(job: JobRecord | null) {
  const jsonLdId = "job-posting-jsonld";

  if (!job?.title) {
    document.title = `${SITE_NAME} — Latest Government Jobs India`;
    upsertMeta("description", DEFAULT_DESCRIPTION);
    upsertMeta("og:title", `${SITE_NAME} — Latest Government Jobs India`, "property");
    upsertMeta("og:description", DEFAULT_DESCRIPTION, "property");
    upsertMeta("og:image", defaultOgImage(), "property");
    removeJsonLd(jsonLdId);
    return () => {
      document.title = `${SITE_NAME} — Latest Government Jobs India`;
      removeJsonLd(jsonLdId);
    };
  }

  const title = `${job.title} | ${SITE_NAME}`;
  const description = jobDescription(job);
  const url = jobDetailUrl(job) || window.location.href;
  const prevTitle = document.title;

  document.title = title;
  upsertMeta("description", description);
  upsertMeta("og:title", title, "property");
  upsertMeta("og:description", description, "property");
  upsertMeta("og:type", "article", "property");
  upsertMeta("og:url", url, "property");
  const ogImage = defaultOgImage(job);
  upsertMeta("og:image", ogImage, "property");
  upsertMeta("twitter:card", "summary_large_image", "name");
  upsertMeta("twitter:image", ogImage, "name");
  upsertMeta("twitter:title", title, "name");
  upsertMeta("twitter:description", description, "name");
  upsertLink("canonical", url);

  removeJsonLd(jsonLdId);
  const jsonLd = buildJobPostingJsonLd(job);
  if (jsonLd) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = jsonLdId;
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  return () => {
    document.title = prevTitle;
    removeJsonLd(jsonLdId);
  };
}
