import { isPdfUrl } from "@/utils/officialDomains";

/** List/catalog summaries are capped ~400 chars; full detail is longer or has sections. */
export const LIST_SUMMARY_RICH_MIN = 800;

type DetailBlob = Record<string, unknown>;

function asDetail(job: { detail?: unknown } | null | undefined): DetailBlob {
  const d = job?.detail;
  return d && typeof d === "object" && !Array.isArray(d) ? (d as DetailBlob) : {};
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sectionHasBody(section: unknown): boolean {
  if (!section || typeof section !== "object") return false;
  const s = section as {
    paragraphs?: unknown[];
    tables?: unknown[];
    lists?: unknown[];
  };
  const paras = Array.isArray(s.paragraphs)
    ? s.paragraphs.map((p) => cleanText(p)).filter((p) => p.length >= 40)
    : [];
  if (paras.length > 0) return true;
  if (Array.isArray(s.tables) && s.tables.length > 0) return true;
  if (Array.isArray(s.lists) && s.lists.some((list) => Array.isArray(list) && list.length > 0)) {
    return true;
  }
  return false;
}

/** True when job carries publishable PDF/notification body (not just a list-card blurb). */
export function jobDetailHasRichContent(job: { detail?: unknown } | null | undefined): boolean {
  const detail = asDetail(job);
  const sections = detail.content_sections;
  if (Array.isArray(sections) && sections.some(sectionHasBody)) return true;
  return cleanText(detail.summary).length >= LIST_SUMMARY_RICH_MIN;
}

export function preferHtmlApplyUrl(...candidates: unknown[]): string | null {
  for (const raw of candidates) {
    const url = cleanText(raw);
    if (!url || url === "#") continue;
    try {
      const href = url.startsWith("http") ? url : `https://${url}`;
      if (isPdfUrl(href)) continue;
      return new URL(href).href;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function longerSummary(a: unknown, b: unknown): string {
  const left = cleanText(a);
  const right = cleanText(b);
  return right.length > left.length ? right : left;
}

function mergeStringLists(...lists: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const url = cleanText(item);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

/**
 * Merge a slim list/API row with a Storage / job-details bundle.
 * Prefer rich sections, longer summary, and non-PDF apply URLs from either side.
 */
export function mergeJobDetailPayloads<T extends Record<string, unknown>>(
  base: T | null | undefined,
  rich: T | null | undefined
): T | null {
  if (!base && !rich) return null;
  if (!rich) return (base as T) ?? null;
  if (!base) return rich;

  const baseDetail = asDetail(base as { detail?: unknown });
  const richDetail = asDetail(rich as { detail?: unknown });

  const baseSections = Array.isArray(baseDetail.content_sections)
    ? baseDetail.content_sections
    : [];
  const richSections = Array.isArray(richDetail.content_sections)
    ? richDetail.content_sections
    : [];
  const content_sections =
    richSections.some(sectionHasBody)
      ? richSections
      : baseSections.some(sectionHasBody)
        ? baseSections
        : richSections.length
          ? richSections
          : baseSections;

  const mergedDetail: DetailBlob = {
    ...baseDetail,
    ...richDetail,
    content_sections,
    summary: longerSummary(baseDetail.summary, richDetail.summary),
    apply_urls: mergeStringLists(baseDetail.apply_urls, richDetail.apply_urls, richDetail.applyUrls),
    pdf_urls: mergeStringLists(
      baseDetail.pdf_urls,
      baseDetail.pdfUrls,
      richDetail.pdf_urls,
      richDetail.pdfUrls
    ),
    pdf_url: cleanText(richDetail.pdf_url || baseDetail.pdf_url) || undefined,
    notification_url:
      cleanText(richDetail.notification_url || baseDetail.notification_url) || undefined,
    memorized_at: richDetail.memorized_at || baseDetail.memorized_at,
    detail_source: richDetail.detail_source || baseDetail.detail_source,
    detail_updated_at: richDetail.detail_updated_at || baseDetail.detail_updated_at,
  };

  if (!Array.isArray(mergedDetail.pdf_urls) || mergedDetail.pdf_urls.length === 0) {
    delete mergedDetail.pdf_urls;
  }
  if (!Array.isArray(mergedDetail.apply_urls) || mergedDetail.apply_urls.length === 0) {
    delete mergedDetail.apply_urls;
  }

  const apply_url = preferHtmlApplyUrl(
    rich.apply_url,
    base.apply_url,
    richDetail.apply_url,
    baseDetail.apply_url,
    ...(Array.isArray(mergedDetail.apply_urls) ? mergedDetail.apply_urls : [])
  );

  return {
    ...base,
    ...rich,
    apply_url: apply_url ?? (rich.apply_url ?? base.apply_url ?? null),
    detail: mergedDetail,
  } as T;
}
