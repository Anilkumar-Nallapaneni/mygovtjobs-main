import { OFFICIAL_SITES } from "@/data/officialSites";
import { isBlockedAggregatorHost, isPdfUrl } from "@/utils/officialDomains";
import { collectPdfUrls } from "@/utils/resolvePdfUrl";
import type { DetailLink } from "@/utils/jobDetailStructured";

const APPLY_LABEL_RE =
  /apply\s*online|apply\s*here|apply\s*now|registration|register|candidate\s*login|recruitment\s*portal|official\s*website/i;
const APPLY_PATH_RE =
  /\/(apply|registration|register|login|recruit|career|careers|vacancy|vacancies|advt|notification|jobs|job|portal|rrbdv|online|notice-category\/recruitments|Public\/OSSC)/i;
const APPLY_HOST_RE = /forms\.gle|docs\.google\.com\/forms|onlineregistration|recruitmentportal/i;
const BARE_GOV_IN_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?([a-z0-9][-a-z0-9.]*\.(?:gov|nic)\.in)(\/[^\s)"'<>[\],;]*)?/gi;
const VACANCY_PATH_RE =
  /\/(uploads|files|careers|recruit|vacancy|vacancies|advt|notification|img|writereaddata|documents|attachments)\//i;
const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const OFFICIAL_EMAIL_RE =
  /[a-z0-9][a-z0-9._%+-]*@(?:[a-z0-9-]+\.)*(?:gov\.in|nic\.in|ac\.in|res\.in)\b/gi;
const EMAIL_APPLY_MODE_RE = /\bemail\b/i;
const EMAIL_APPLY_TEXT_RE = /\b(?:apply|send|submit).{0,40}\bemail\b|\bemail\b.{0,40}\b(?:apply|application)\b/i;

/** Bare org homepage → official recruitment / careers listing (from curated portal directory). */
const HOMEPAGE_UPGRADE_BY_HOST = (() => {
  const map = new Map<string, string>();
  for (const site of OFFICIAL_SITES) {
    try {
      const home = new URL(site.url);
      const latest = new URL(site.latestUrl || site.url);
      const hostKey = home.hostname.replace(/^www\./i, "").toLowerCase();
      const homePath = home.pathname.replace(/\/+$/, "") || "/";
      const latestPath = latest.pathname.replace(/\/+$/, "") || "/";
      const sameHost =
        home.hostname.replace(/^www\./i, "").toLowerCase() ===
        latest.hostname.replace(/^www\./i, "").toLowerCase();
      if (sameHost && homePath === "/" && latestPath !== "/") {
        map.set(hostKey, latest.href);
      }
    } catch {
      /* ignore invalid site URLs */
    }
  }
  return map;
})();

/** Dept / title hints when catalog only stores a generic homepage. */
const ORG_RECRUITMENT_PORTAL: Array<{ match: RegExp; url: string }> = [
  { match: /\bbedf\b|basmati export development foundation/i, url: "https://apeda.gov.in/recruitment-appointment" },
  { match: /\bapeda\b/i, url: "https://apeda.gov.in/recruitment-appointment" },
  { match: /\bnsut\b|netaji subhas university of technology/i, url: "https://www.nsut.ac.in/teaching-post/105" },
  { match: /\bwii\b|wildlife institute of india/i, url: "https://www.wii.gov.in/recruitments" },
  { match: /\bbisag/i, url: "https://bisag-n.gov.in" },
];

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractUrlsFromText(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];
  const found = new Set<string>();
  for (const url of text.match(URL_IN_TEXT_RE) || []) {
    found.add(url.replace(/[.,;]+$/, ""));
  }
  for (const match of text.matchAll(BARE_GOV_IN_URL_RE)) {
    const host = match[1];
    const path = (match[2] || "").replace(/[.,;]+$/, "");
    found.add(`https://${host}${path}`);
  }
  return [...found];
}

export function normalizeDetailUrl(url: unknown): string | null {
  const raw = cleanText(url);
  if (!raw || raw === "#") return null;
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (isBlockedAggregatorHost(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function labelForUrl(url: string, label?: string) {
  const text = cleanText(label);
  if (text && !/^click here$/i.test(text)) return text;
  if (isPdfUrl(url)) return "Download Notification PDF";
  if (APPLY_LABEL_RE.test(text)) return text;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return `Visit ${host}`;
  } catch {
    return "Official Link";
  }
}

export function dedupeDetailLinks(links: DetailLink[]): DetailLink[] {
  const seen = new Set<string>();
  const out: DetailLink[] = [];
  for (const link of links) {
    const url = normalizeDetailUrl(link.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ label: labelForUrl(url, link.label), url });
  }
  return out;
}

/** Hosts where the root URL is itself the apply/recruitment destination (not a generic org brochure). */
const DEDICATED_APPLY_HOST_RE =
  /^(?:www\.)?(?:apprenticeshipindia\.gov\.in|coach\.biharsports\.org|bisag-n\.gov\.in)$/i;

export function isGenericHomepageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" || parsed.search) return false;
    const host = parsed.hostname.toLowerCase();
    if (DEDICATED_APPLY_HOST_RE.test(host)) return false;
    if (/recruitment|recruit|apply|career|register|portal|online|exam|apprentice|coach/.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Map bare org homepages to known official apply / recruitment listing pages. */
export function upgradeGenericApplyUrl(url: string): string {
  if (!url || !isGenericHomepageUrl(url)) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const mapped = HOMEPAGE_UPGRADE_BY_HOST.get(host);
    if (mapped) return mapped;
    if (host.endsWith(".dcourts.gov.in")) {
      return new URL("/notice-category/recruitments/", parsed.origin).href;
    }
    if (host === "ossc.gov.in") {
      return new URL("/Public/OSSC/Default.aspx", parsed.origin).href;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function resolveKnownOrgRecruitmentPortal(job: Record<string, unknown>): string | null {
  const haystack = [cleanText(job.dept), cleanText(job.title)].join(" ");
  for (const rule of ORG_RECRUITMENT_PORTAL) {
    if (rule.match.test(haystack)) return rule.url;
  }
  return null;
}

/** Map PDF / notification host → curated recruitment listing from OFFICIAL_SITES. */
function resolveOfficialPortalFromHost(host: string): string | null {
  const key = host.replace(/^www\./i, "").toLowerCase();
  if (!key) return null;
  const upgraded = HOMEPAGE_UPGRADE_BY_HOST.get(key);
  if (upgraded) return upgraded;
  for (const site of OFFICIAL_SITES) {
    try {
      const siteHost = new URL(site.url).hostname.replace(/^www\./i, "").toLowerCase();
      if (siteHost === key || key.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${key}`)) {
        return site.latestUrl || site.url;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function hostsFromJob(job: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  for (const raw of [
    ...collectPdfUrls(job),
    job.apply_url,
    job.applyUrl,
    detail.notification_url,
    detail.source_url,
    detail.link,
    detail.pdf_url,
  ]) {
    const url = normalizeDetailUrl(raw);
    if (url) urls.push(url);
  }
  const hosts: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
      if (!host || seen.has(host)) continue;
      seen.add(host);
      hosts.push(host);
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

const CDN_OR_STORAGE_HOST_RE =
  /(?:^|\.)(?:s3waas\.gov\.in|amazonaws\.com|cloudfront\.net|azureedge\.net|blob\.core\.windows\.net|googleusercontent\.com|googleapis\.com)$/i;

function isCdnOrStorageHost(host: string): boolean {
  return CDN_OR_STORAGE_HOST_RE.test(host.replace(/^www\./i, "").toLowerCase());
}

/** Prefer curated portal; else org origin homepage (as Official Website, not Apply Now). */
function resolveOfficialWebsiteFromJob(job: Record<string, unknown>): string | null {
  for (const host of hostsFromJob(job)) {
    if (isCdnOrStorageHost(host)) continue;
    const curated = resolveOfficialPortalFromHost(host);
    if (curated) return curated;
  }
  for (const host of hostsFromJob(job)) {
    if (isCdnOrStorageHost(host)) continue;
    if (!/\.(gov|nic|ac|res|edu)\.in$/i.test(host)) continue;
    try {
      return `https://www.${host}/`;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function pickUpgradedHtmlApplyUrl(url: unknown): string | null {
  const normalized = normalizeDetailUrl(url);
  if (!normalized || isPdfUrl(normalized)) return null;
  const upgraded = upgradeGenericApplyUrl(normalized);
  return isGenericHomepageUrl(upgraded) ? null : upgraded;
}

function scoreApplyLink(link: DetailLink): number {
  const { url, label } = link;
  let score = 0;
  if (isPdfUrl(url)) score -= 100;
  if (isGenericHomepageUrl(url)) score -= 80;
  if (APPLY_LABEL_RE.test(label)) score += 40;
  if (APPLY_PATH_RE.test(url)) score += 35;
  if (APPLY_HOST_RE.test(url)) score += 40;
  if (/official\s*website|visit\s+/i.test(label)) score += 12;
  if (/notification|pdf|download/i.test(label)) score -= 20;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (path !== "/") score += 8;
    if (/\.(gov|nic|ac|org|res)\.in$/i.test(parsed.hostname)) score += 4;
  } catch {
    /* ignore */
  }
  return score;
}

function scoreApplyEmail(email: string) {
  let score = 0;
  const local = email.split("@")[0] || "";
  if (/recruit|apply|jobs?|hr|bedf|career/i.test(local)) score += 25;
  if (/noreply|donotreply|info@|contact@|webmaster@/i.test(email)) score -= 30;
  return score;
}

function collectJobTextChunks(job: Record<string, unknown>): string[] {
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const chunks: string[] = [
    cleanText(job.about),
    cleanText(detail.summary),
    cleanText(job.email),
    cleanText(detail.apply_email),
  ];

  for (const key of ["howApply", "how_to_apply", "documents_required"]) {
    const list = job[key] ?? detail[key];
    if (Array.isArray(list)) chunks.push(...list.map((item) => cleanText(item)));
  }

  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];
  for (const section of sections) {
    const s = section as {
      paragraphs?: unknown[];
      lists?: unknown[];
      tables?: Record<string, string>[][];
    };
    for (const paragraph of s.paragraphs || []) chunks.push(cleanText(paragraph));
    for (const list of s.lists || []) {
      if (!Array.isArray(list)) continue;
      for (const item of list) chunks.push(cleanText(item));
    }
    for (const table of s.tables || []) {
      for (const row of table) {
        for (const value of Object.values(row)) chunks.push(cleanText(value));
      }
    }
  }

  return chunks.filter(Boolean);
}

function jobImpliesEmailApply(job: Record<string, unknown>): boolean {
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const applyMode = cleanText(detail.apply_mode || job.apply_mode);
  if (EMAIL_APPLY_MODE_RE.test(applyMode)) return true;

  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];
  for (const section of sections) {
    const s = section as { tables?: Record<string, string>[][] };
    for (const table of s.tables || []) {
      for (const row of table) {
        const fact = Object.entries(row).find(([k]) => /apply\s*mode/i.test(k));
        if (fact && EMAIL_APPLY_MODE_RE.test(cleanText(fact[1]))) return true;
      }
    }
  }

  return collectJobTextChunks(job).some((text) => EMAIL_APPLY_TEXT_RE.test(text));
}

/** Official application email from notification text or known org mappings. */
export function extractApplyEmailFromJob(
  job: Record<string, unknown> | null | undefined
): string | null {
  if (!job) return null;

  const haystack = [
    cleanText(job.dept),
    cleanText(job.title),
    ...collectJobTextChunks(job),
  ].join(" ");

  const found = new Set<string>();
  for (const match of haystack.matchAll(OFFICIAL_EMAIL_RE)) {
    found.add(match[0].toLowerCase());
  }

  if (!found.size) return null;
  return [...found].sort((a, b) => scoreApplyEmail(b) - scoreApplyEmail(a))[0] || null;
}

function buildMailtoApplyHref(job: Record<string, unknown>, email: string): string {
  const post =
    cleanText(job.post_name) ||
    cleanText((job.detail as Record<string, unknown> | undefined)?.post_name) ||
    cleanText(job.title);
  const subject = post ? `Application - ${post}` : "Job Application";
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

/** Rank outbound links for Apply — specific vacancy PDF/portal beats generic org homepage. */
function scoreOutboundLink(link: DetailLink): number {
  const { url, label } = link;
  let score = 0;
  if (APPLY_LABEL_RE.test(label)) score += 45;
  if (APPLY_PATH_RE.test(url)) score += 40;
  if (APPLY_HOST_RE.test(url)) score += 45;
  if (VACANCY_PATH_RE.test(url)) score += 28;
  if (isPdfUrl(url)) score += 18;
  if (isGenericHomepageUrl(url)) score -= 75;
  if (/official\s*website|visit\s+/i.test(label) && isGenericHomepageUrl(url)) score -= 25;
  if (/notification|pdf|download/i.test(label) && !isGenericHomepageUrl(url)) score += 8;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (path !== "/") score += 10;
    if (/\.(gov|nic|ac|org|res)\.in$/i.test(parsed.hostname)) score += 4;
  } catch {
    /* ignore */
  }
  return score;
}

function pushLink(candidates: DetailLink[], url: unknown, label?: string) {
  const normalized = normalizeDetailUrl(url);
  if (!normalized) return;
  candidates.push({ label: labelForUrl(normalized, label), url: normalized });
}

/** Collect every usable outbound link on a job row (detail panel — import-trusted, not strict official filter). */
export function collectDetailLinksFromJob(job: Record<string, unknown> | null | undefined): DetailLink[] {
  if (!job) return [];
  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const candidates: DetailLink[] = [];

  for (const key of ["apply_urls", "applyUrls"]) {
    const list = detail[key] ?? job[key];
    if (Array.isArray(list)) {
      for (const item of list) pushLink(candidates, item, "Apply Online");
    }
  }

  const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];

  for (const section of sections) {
    const s = section as {
      links?: Array<{ label?: string; url?: string }>;
      paragraphs?: unknown[];
      lists?: unknown[];
    };
    for (const link of s.links || []) {
      pushLink(candidates, link.url, link.label);
    }
    for (const paragraph of s.paragraphs || []) {
      for (const url of extractUrlsFromText(paragraph)) {
        pushLink(candidates, url, "Official Website");
      }
    }
    for (const list of s.lists || []) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        for (const url of extractUrlsFromText(item)) {
          pushLink(candidates, url, "Official Website");
        }
      }
    }
  }

  for (const key of ["apply_links", "links", "apply_urls"]) {
    const list = detail[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string") {
          pushLink(candidates, item, "Apply Online");
        } else if (item && typeof item === "object") {
          const row = item as { label?: string; url?: string; text?: string };
          pushLink(candidates, row.url, row.label || row.text || "Apply Online");
        }
      }
    }
  }

  pushLink(candidates, detail.link, "Official Link");
  pushLink(candidates, detail.source_url, "Official Website");

  pushLink(candidates, job.apply_url, "Apply Online");
  pushLink(candidates, job.applyUrl, "Apply Online");
  pushLink(candidates, job.officialUrl, "Official Website");
  pushLink(candidates, detail.notification_url, "Official Website");
  pushLink(candidates, job.pdf_url, "Download Notification PDF");
  pushLink(candidates, job.pdfUrl, "Download Notification PDF");
  pushLink(candidates, detail.pdf_url, "Download Notification PDF");
  pushLink(candidates, detail.pdfUrl, "Download Notification PDF");

  for (const key of ["pdf_urls", "pdfUrls"]) {
    const list = detail[key];
    if (Array.isArray(list)) {
      for (const item of list) pushLink(candidates, item, "Download Notification PDF");
    }
  }

  const pdfList = job.pdfUrls;
  if (Array.isArray(pdfList)) {
    for (const item of pdfList) pushLink(candidates, item, "Download Notification PDF");
  }

  for (const key of ["howApply", "documents_required"]) {
    const list = job[key] ?? detail[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        for (const url of extractUrlsFromText(item)) {
          pushLink(candidates, url, "Official Website");
        }
      }
    }
  }

  return dedupeDetailLinks(candidates);
}

export type UnifiedDetailAction = {
  url: string;
  label: string;
  variant: "primary" | "secondary";
};

/** True when two outbound URLs point at the same document or apply destination. */
export function sameOutboundUrl(a: string, b: string): boolean {
  const left = normalizeDetailUrl(a);
  const right = normalizeDetailUrl(b);
  if (!left || !right) return false;
  if (left === right) return true;
  try {
    const ua = new URL(left);
    const ub = new URL(right);
    const hostA = ua.hostname.replace(/^www\./, "").toLowerCase();
    const hostB = ub.hostname.replace(/^www\./, "").toLowerCase();
    if (hostA !== hostB) return false;
    const fileA = ua.pathname.split("/").pop()?.toLowerCase() || "";
    const fileB = ub.pathname.split("/").pop()?.toLowerCase() || "";
    if (fileA && fileB && fileA === fileB && fileA.includes(".")) return true;
    const pathA = ua.pathname.replace(/\/+$/, "") || "/";
    const pathB = ub.pathname.replace(/\/+$/, "") || "/";
    return pathA === pathB && !ua.search && !ub.search;
  } catch {
    return false;
  }
}

function pickOfficialWebsiteLink(
  links: DetailLink[],
  primaryUrl: string | null
): DetailLink | null {
  const candidates = links
    .filter((l) => !isPdfUrl(l.url))
    .map((l) => ({ ...l, url: upgradeGenericApplyUrl(l.url) }))
    .filter((l) => {
      if (primaryUrl && sameOutboundUrl(l.url, primaryUrl)) return false;
      if (primaryUrl && !isPdfUrl(primaryUrl) && isGenericHomepageUrl(l.url)) {
        try {
          const h1 = new URL(primaryUrl).hostname.replace(/^www\./, "");
          const h2 = new URL(l.url).hostname.replace(/^www\./, "");
          if (h1 === h2) return false;
        } catch {
          /* ignore */
        }
      }
      return true;
    });

  if (!candidates.length) return null;
  const ranked = [...candidates].sort((a, b) => scoreOutboundLink(b) - scoreOutboundLink(a));
  const best = ranked[0];
  if (!best || scoreOutboundLink(best) < 0) return null;
  return best;
}

function normalizeActionUrl(url: unknown): string | null {
  const raw = cleanText(url);
  if (!raw || raw === "#") return null;
  if (raw.toLowerCase().startsWith("mailto:")) return raw;
  return normalizeDetailUrl(raw);
}

/** Apply destination — real recruitment portal URL, never a bare homepage or PDF. */
export function resolveHtmlApplyHref(
  job: Record<string, unknown> | null | undefined
): string | null {
  if (!job) return null;

  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const links = collectDetailLinksFromJob(job);
  const pdfUrl = collectPdfUrls(job)[0] || null;

  for (const key of ["apply_urls", "applyUrls"]) {
    const list = detail[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const upgraded = pickUpgradedHtmlApplyUrl(item);
      if (upgraded && (!pdfUrl || !sameOutboundUrl(upgraded, pdfUrl))) return upgraded;
    }
  }

  const specific = pickBestHtmlApplyLink(links);
  if (specific) {
    const upgraded = upgradeGenericApplyUrl(specific);
    if (!isGenericHomepageUrl(upgraded)) return upgraded;
  }

  const htmlCandidates = links
    .filter((l) => !isPdfUrl(l.url))
    .map((l) => ({ ...l, url: upgradeGenericApplyUrl(l.url) }))
    .filter((l) => !isGenericHomepageUrl(l.url))
    .filter((l) => !pdfUrl || !sameOutboundUrl(l.url, pdfUrl));

  if (htmlCandidates.length) {
    const ranked = [...htmlCandidates]
      .map((link) => ({ link, score: scoreApplyLink(link) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (best && best.score > 0) return best.link.url;
  }

  for (const raw of [
    job.apply_url,
    job.applyUrl,
    job.officialUrl,
    detail.notification_url,
    detail.source_url,
    detail.link,
  ]) {
    const upgraded = pickUpgradedHtmlApplyUrl(raw);
    if (upgraded && (!pdfUrl || !sameOutboundUrl(upgraded, pdfUrl))) return upgraded;
  }

  // Host-derived portals are Apply Now only when they look like a recruitment path.
  for (const host of hostsFromJob(job)) {
    if (isCdnOrStorageHost(host)) continue;
    const curated = resolveOfficialPortalFromHost(host);
    if (!curated || isGenericHomepageUrl(curated)) continue;
    if (pdfUrl && sameOutboundUrl(curated, pdfUrl)) continue;
    return curated;
  }

  return resolveKnownOrgRecruitmentPortal(job);
}

/** Apply Now + View Notification + optional official site — always separate buttons. */
export function buildUnifiedDetailActions(
  job: Record<string, unknown> | null | undefined
): UnifiedDetailAction[] {
  const allLinks = collectDetailLinksFromJob(job);
  const pdfUrl = collectPdfUrls(job)[0] || null;
  const htmlApply = resolveHtmlApplyHref(job);

  const actions: UnifiedDetailAction[] = [];
  const seen: string[] = [];

  const add = (url: unknown, label: string, variant: UnifiedDetailAction["variant"]) => {
    const normalized = normalizeActionUrl(url);
    if (!normalized) return;
    if (seen.some((existing) => sameOutboundUrl(existing, normalized))) return;
    seen.push(normalized);
    actions.push({ url: normalized, label, variant });
  };

  if (htmlApply) {
    add(htmlApply, "Apply Now", "primary");
  } else if (jobImpliesEmailApply(job)) {
    const email = extractApplyEmailFromJob(job);
    if (email) add(buildMailtoApplyHref(job, email), "Apply by Email", "primary");
  }

  if (pdfUrl && (!htmlApply || !sameOutboundUrl(pdfUrl, htmlApply))) {
    add(pdfUrl, "View Notification", "secondary");
  }

  const official =
    pickOfficialWebsiteLink(allLinks, htmlApply || pdfUrl) ||
    (() => {
      if (!job) return null;
      const fallback = resolveOfficialWebsiteFromJob(job);
      if (!fallback) return null;
      if (htmlApply && sameOutboundUrl(fallback, htmlApply)) return null;
      if (pdfUrl && sameOutboundUrl(fallback, pdfUrl)) return null;
      return { label: "Official Website", url: fallback };
    })();
  if (official) {
    add(official.url, "Official Website", "secondary");
  }

  return actions;
}

/** Remove URLs already shown in the unified action bar so body text stays clean. */
export function sanitizeParagraphText(
  text: unknown,
  actionUrls: ReadonlySet<string>
): string {
  let out = cleanText(text);
  if (!out) return "";

  out = out.replace(URL_IN_TEXT_RE, (match) => {
    const trimmed = match.replace(/[.,;]+$/, "");
    const normalized = normalizeDetailUrl(trimmed);
    if (normalized && actionUrls.has(normalized)) return "";
    return match;
  });

  for (const match of out.matchAll(BARE_GOV_IN_URL_RE)) {
    const host = match[1];
    const path = (match[2] || "").replace(/[.,;]+$/, "");
    const normalized = normalizeDetailUrl(`https://${host}${path}`);
    if (normalized && actionUrls.has(normalized)) {
      out = out.replace(match[0], "");
    }
  }

  out = out
    .replace(/\bLink to application form:\s*/gi, "")
    .replace(/\bRelated files:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

export function resolveTrustedPdfHref(job: Record<string, unknown> | null | undefined): string | null {
  const links = collectDetailLinksFromJob(job);
  return links.find((l) => isPdfUrl(l.url))?.url || null;
}

/**
 * Best Apply destination — specific apply portal or vacancy PDF, not a bare org homepage.
 * Falls back to notification PDF when no HTML apply page exists.
 */
function pickBestHtmlApplyLink(links: DetailLink[]): string | null {
  const html = links.filter((l) => {
    if (isPdfUrl(l.url)) return false;
    return !isGenericHomepageUrl(upgradeGenericApplyUrl(l.url));
  });
  if (!html.length) return null;
  const ranked = [...html]
    .map((link) => ({ link, score: scoreOutboundLink(link) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  return best && best.score > -30 ? best.link.url : null;
}

export function resolveJobApplyHref(job: Record<string, unknown> | null | undefined): string | null {
  if (!job) return null;

  const links = collectDetailLinksFromJob(job);
  const htmlApply = pickBestHtmlApplyLink(links);
  if (htmlApply) return upgradeGenericApplyUrl(htmlApply);

  if (links.length) {
    const ranked = [...links]
      .map((link) => ({ link, score: scoreOutboundLink(link) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (best && best.score > -40) return upgradeGenericApplyUrl(best.link.url);

    const portal = ranked.find((row) => !isPdfUrl(row.link.url));
    if (portal) {
      const upgraded = upgradeGenericApplyUrl(portal.link.url);
      if (!isGenericHomepageUrl(upgraded)) return upgraded;
    }
  }

  const pdf = resolveTrustedPdfHref(job) || collectPdfUrls(job)[0] || null;
  if (pdf) return pdf;

  const raw = normalizeDetailUrl(job.apply_url || job.applyUrl || job.officialUrl);
  if (raw) return upgradeGenericApplyUrl(raw);

  const detail = (job.detail && typeof job.detail === "object" ? job.detail : {}) as Record<
    string,
    unknown
  >;
  const notification = normalizeDetailUrl(detail.notification_url);
  if (notification) return upgradeGenericApplyUrl(notification);

  return null;
}
