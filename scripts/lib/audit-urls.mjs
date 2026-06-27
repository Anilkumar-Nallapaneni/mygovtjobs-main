/**
 * Shared URL/host checks for job quality audit (aligned with frontend officialDomains).
 */
const BLOCKED_HOST_RE = new RegExp(
  `(?:^|\\.)(?:${[
    "freejobalert",
    "sarkariresult",
    "sarkarijob",
    "sarkarinaukri",
    "governmentjob",
    "indgovtjobs",
    "rojgarresult",
    "jobriya",
    "fresherslive",
    "naukri",
    "indeed",
    "shine",
    "timesjobs",
  ].join("|")})\\.`,
  "i"
);

const OFFICIAL_TLD_RE = /\.(gov|nic|ac|org|res|edu)\.in$/i;

export function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isBlockedAggregatorUrl(url) {
  const host = hostnameOf(url);
  if (!host) return false;
  return BLOCKED_HOST_RE.test(host);
}

export function isOfficialishUrl(url) {
  if (!url || isBlockedAggregatorUrl(url)) return false;
  const host = hostnameOf(url);
  if (!host) return false;
  if (OFFICIAL_TLD_RE.test(host)) return true;
  if (host.endsWith(".bank.in") || host.endsWith(".ernet.in") || host.endsWith(".coop")) return true;
  if (host.endsWith(".gov")) return true;
  return false;
}

export function collectJobUrls(row) {
  const detail = row.detail && typeof row.detail === "object" ? row.detail : {};
  const urls = [];
  const push = (u) => {
    if (typeof u === "string" && u.trim()) urls.push(u.trim());
  };
  push(row.apply_url);
  push(detail.apply_url);
  push(detail.pdf_url);
  push(detail.notification_url);
  push(detail.source_url);
  if (Array.isArray(detail.pdf_urls)) detail.pdf_urls.forEach(push);
  if (Array.isArray(detail.pdfUrls)) detail.pdfUrls.forEach(push);
  if (Array.isArray(detail.content_sections)) {
    for (const sec of detail.content_sections) {
      if (!sec?.links) continue;
      for (const link of sec.links) push(link?.url);
    }
  }
  return [...new Set(urls)];
}

export function rowHasBlockedAggregatorUrl(row) {
  return collectJobUrls(row).some((u) => isBlockedAggregatorUrl(u));
}
