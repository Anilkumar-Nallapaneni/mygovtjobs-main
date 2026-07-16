import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH } from "@/data/siteMeta";
import { SITE_ORIGIN } from "@/data/siteLinks";
import type { JobRecord } from "@/types/job";
import { jobDetailUrl } from "@/utils/jobRoutes";
import { beginSeoHead } from "@/utils/seoHead";

const DEFAULT_DESCRIPTION = SITE_DESCRIPTION;

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
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_ORIGIN;
  if (job?.slug || job?.id) {
    return `${origin}/api/og?title=${encodeURIComponent(String(job.title || "Govt Job").slice(0, 80))}`;
  }
  return `${origin}${SITE_OG_IMAGE_PATH}`;
}

function parseIsoDate(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Google JobPosting requires datePosted — never omit it. */
function resolveDatePosted(job: JobRecord): string {
  return (
    parseIsoDate(job.published_at) ||
    parseIsoDate(job.publishedDate) ||
    parseIsoDate(job.updatedDate) ||
    parseIsoDate(job.updated_at) ||
    parseIsoDate(job.created_at) ||
    parseIsoDate(job.createdAt) ||
    new Date().toISOString().slice(0, 10)
  );
}

export function buildJobPostingJsonLd(job: JobRecord): Record<string, unknown> | null {
  if (!job.title) return null;
  const url = jobDetailUrl(job);
  const validThrough = parseIsoDate(job.lastDate ?? job.last_date);
  const datePosted = resolveDatePosted(job);

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted,
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
  const head = beginSeoHead();
  const fallbackTitle = `${SITE_NAME} — Latest Government Jobs India`;

  if (!job?.title) {
    head.setTitle(fallbackTitle);
    head.upsertMeta("description", DEFAULT_DESCRIPTION);
    head.upsertMeta("og:site_name", SITE_NAME, "property");
    head.upsertMeta("og:title", fallbackTitle, "property");
    head.upsertMeta("og:description", DEFAULT_DESCRIPTION, "property");
    head.upsertMeta("og:image", defaultOgImage(), "property");
    head.upsertMeta("robots", "index, follow, max-image-preview:large");
    return head.restore;
  }

  const title = `${job.title} | ${SITE_NAME}`;
  const description = jobDescription(job);
  const url = jobDetailUrl(job) || window.location.href;
  const ogImage = defaultOgImage(job);

  head.setTitle(title);
  head.upsertMeta("description", description);
  head.upsertMeta("og:site_name", SITE_NAME, "property");
  head.upsertMeta("og:locale", "en_IN", "property");
  head.upsertMeta("og:title", title, "property");
  head.upsertMeta("og:description", description, "property");
  head.upsertMeta("og:type", "article", "property");
  head.upsertMeta("og:url", url, "property");
  head.upsertMeta("og:image", ogImage, "property");
  head.upsertMeta("twitter:card", "summary_large_image", "name");
  head.upsertMeta("twitter:image", ogImage, "name");
  head.upsertMeta("twitter:title", title, "name");
  head.upsertMeta("twitter:description", description, "name");
  head.upsertLink("canonical", url);
  head.upsertMeta("robots", "index, follow, max-image-preview:large");

  const jsonLd = buildJobPostingJsonLd(job);
  if (jsonLd) {
    head.upsertJsonLd(jsonLdId, jsonLd);
  }

  return head.restore;
}
