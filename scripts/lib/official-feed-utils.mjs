import { createHash, constants as cryptoConstants } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, "..", "..", "frontend", "public", "data");
export const FEED_FILE = join(DATA_DIR, "official-feed-items.json");
export const LIVE_JOBS_FILE = join(DATA_DIR, "live-jobs.json");

export function stableId(link) {
  return createHash("sha256").update(String(link || "").trim()).digest("hex").slice(0, 16);
}

export function slugify(title) {
  const base = String(title || "job")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "job").slice(0, 72);
}

export function parseDate(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function extractPdfUrls(html) {
  if (!html || typeof html !== "string") return [];
  const re = /https?:\/\/[^\s"'<>]+\.pdf/gi;
  const found = html.match(re) || [];
  return [...new Set(found.map((u) => u.replace(/&amp;/g, "&")))].slice(0, 8);
}

export function stateLabel(stateIds, states) {
  if (!stateIds?.length || stateIds.includes("all")) return "All India";
  return stateIds.map((id) => states.find((s) => s.id === id)?.n || id).join(", ");
}

export function mergeFeedItems(...lists) {
  const byLink = new Map();
  for (const list of lists) {
    for (const row of list) {
      if (!row?.link) continue;
      if (!byLink.has(row.link)) byLink.set(row.link, row);
    }
  }
  return [...byLink.values()].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

export function feedItemToLiveJob(item) {
  const base = slugify(item.title);
  const id = item.id || stableId(item.link);
  return {
    slug: `${base}-${id}`.slice(0, 96),
    title: item.title,
    dept: item.sourceName || item.dept || "Official",
    category: item.category || null,
    apply_url: item.link,
    pdf_url: item.pdfUrls?.[0] || null,
    state_codes: item.stateIds?.includes("all") ? [] : item.stateIds || [],
    vacancies: 0,
    qualification: "As per official notification",
    status: "live",
    detail: {
      source: item.sourceId,
      summary: item.summary,
      pdfUrls: item.pdfUrls || [],
      link: item.link,
    },
  };
}

export function writeOfficialPayload({ items, sourceReports, siteReports = [], feedOnly = false }) {
  mkdirSync(DATA_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const feedPayload = { generatedAt, sourceReports, siteReports, items };
  writeFileSync(FEED_FILE, JSON.stringify(feedPayload, null, 2), "utf8");

  let livePayload = null;
  if (!feedOnly) {
    const liveItems = items.map(feedItemToLiveJob);
    livePayload = { generatedAt, items: liveItems };
    writeFileSync(LIVE_JOBS_FILE, JSON.stringify(livePayload, null, 2), "utf8");
  }

  return { feedPayload, livePayload };
}

const BROWSER_HEADERS = (userAgent) => ({
  "User-Agent": userAgent,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
});

const GOV_HOST =
  /\.(gov|nic)\.in$|\.gov\.|\.nic\.|\.co\.in$|\.org\.in$|cdac\.in$|rectt\.|recruitment\./i;

const httpsGovAgent = new https.Agent({
  rejectUnauthorized: false,
  minVersion: "TLSv1",
  secureOptions: cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT,
});

function isGovHost(hostname) {
  return GOV_HOST.test(hostname || "");
}

function shouldAcceptHtml(status, html) {
  if (status >= 200 && status < 400) return html.length >= 200;
  // Some .gov.in portals return 404/403 but still ship listing HTML.
  return html.length >= 2500;
}

function httpsGetHtml(url, userAgent, timeoutMs) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      reject(new Error("invalid url"));
      return;
    }
    if (target.protocol !== "https:") {
      reject(new Error("https only"));
      return;
    }

    const visit = (current, hops) => {
      if (hops > 8) {
        reject(new Error("too many redirects"));
        return;
      }
      let u;
      try {
        u = new URL(current);
      } catch {
        reject(new Error("invalid redirect"));
        return;
      }

      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: "GET",
          headers: BROWSER_HEADERS(userAgent),
          agent: httpsGovAgent,
          timeout: timeoutMs,
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const html = Buffer.concat(chunks).toString("utf8");
            const loc = res.headers.location;
            if (loc && [301, 302, 303, 307, 308].includes(res.statusCode)) {
              try {
                visit(new URL(loc, current).toString(), hops + 1);
              } catch {
                reject(new Error("bad redirect"));
              }
              return;
            }
            if (!shouldAcceptHtml(res.statusCode, html)) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            resolve({ html, finalUrl: current });
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
    };

    visit(url, 0);
  });
}

function needsTlsFallback(err) {
  const msg = `${err?.cause?.code || ""} ${err?.message || ""}`.toLowerCase();
  return /cert|ssl|tls|unable_to_verify|self signed|expired|legacy|econnreset|enotfound|fetch failed|network|timed out|timeout|econnrefused|ephemeral/i.test(
    msg
  );
}

export async function fetchHtml(url, userAgent, timeoutMs = 28000, retries = 2) {
  let lastErr;
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* ignore */
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: BROWSER_HEADERS(userAgent),
      });
      const html = await res.text();
      if (!shouldAcceptHtml(res.status, html)) throw new Error(`HTTP ${res.status}`);
      return { html, finalUrl: res.url || url };
    } catch (e) {
      lastErr = e;
      const tryTls =
        isGovHost(hostname) &&
        (needsTlsFallback(e) || /^HTTP [45]/.test(e.message || ""));
      if (tryTls) {
        try {
          return await httpsGetHtml(url, userAgent, timeoutMs);
        } catch (tlsErr) {
          lastErr = tlsErr;
        }
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/** Fetch any text response (RSS/XML/HTML) with the same gov TLS fallbacks. */
export async function fetchText(url, userAgent, timeoutMs = 28000) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        ...BROWSER_HEADERS(userAgent),
        Accept: "application/rss+xml, application/xml, text/xml, text/html, */*",
      },
    });
    const text = await res.text();
    if (res.ok && text.length > 50) return { text, finalUrl: res.url || url };
    if (text.length > 50 && isGovHost(new URL(url).hostname)) return { text, finalUrl: res.url || url };
    throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    if (isGovHost(new URL(url).hostname) && needsTlsFallback(e)) {
      const { html } = await httpsGetHtml(url, userAgent, timeoutMs);
      return { text: html, finalUrl: url };
    }
    throw e;
  }
}
