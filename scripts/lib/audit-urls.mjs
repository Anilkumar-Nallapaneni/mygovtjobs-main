/**
 * Shared URL/host checks for job quality audit.
 * Uses shared/official-hosts.json (same source as frontend + backend).
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const catalog = require(join(dirname(fileURLToPath(import.meta.url)), "../../shared/official-hosts.json"));

const BLOCKED_HOST_NAMES = [...catalog.blockedAggregators, ...catalog.blockedCommercialBoards];
const BLOCKED_HOST_RE = new RegExp(
  `(?:^|\\.)(?:${BLOCKED_HOST_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\.`,
  "i"
);

const OFFICIAL_TLD_RE = /\.(gov|nic|ac|org|res|edu)\.in$/i;
const OFFICIAL_STEMS = new Set(catalog.officialStems);

/** Common OCR / scrape TLD typos that are never official. */
const TYPO_TLDS = new Set(["ln", "con", "comm", "ogr", "edus", "govv"]);
const ILLEGAL_URL_CHARS = /[\^<>"`{|}\\]/;
const WHITESPACE = /\s/;

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

/** True when the URL is structurally corrupt (typo TLD, illegal path chars, bad host). */
export function isCorruptUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return true;
  if (ILLEGAL_URL_CHARS.test(raw) || WHITESPACE.test(raw)) return true;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return true;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
  const host = (parsed.hostname || "").toLowerCase();
  if (!host || host.startsWith(".") || host.endsWith(".") || host.includes("..")) return true;
  const labels = host.split(".");
  const tld = labels[labels.length - 1] || "";
  if (TYPO_TLDS.has(tld)) return true;
  if (parsed.pathname && ILLEGAL_URL_CHARS.test(parsed.pathname)) return true;
  return false;
}

export function isSaneHttpUrl(url) {
  return !isCorruptUrl(url);
}

export function isPublishableApplyUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  return isSaneHttpUrl(raw) && isOfficialishUrl(raw);
}

export function isOfficialishUrl(url) {
  if (!url || isCorruptUrl(url) || isBlockedAggregatorUrl(url)) return false;
  const host = hostnameOf(url);
  if (!host) return false;
  if (OFFICIAL_TLD_RE.test(host)) return true;
  if (host.endsWith(".bank.in") || host.endsWith(".ernet.in") || host.endsWith(".coop")) return true;
  if (host.endsWith(".gov") || /\.gov\.[a-z]{2,}$/i.test(host)) return true;
  if ([...OFFICIAL_STEMS].some((stem) => host === stem || host.endsWith(`.${stem}`))) return true;
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
