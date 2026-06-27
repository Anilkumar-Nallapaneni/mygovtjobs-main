import * as cheerio from "cheerio";

const STRICT_PATTERN =
  /recruit|vacanc|notif|advert|career|employment|bharti|naukri|exam|admit|result|apply|opening|posting|appointment|walk-?in|directorate|commission|board|notification|job/i;

const PATH_PATTERN =
  /recruit|vacanc|notif|advert|career|employment|bharti|exam|admit|result|apply|opening|posting|notice|job|cwe|archive|walkin/i;

const TENDER_URL_PATTERN = /\/tenders?(?:\/|$|\?|s\b)|\/e-?tender|\/procurement|downloadtender/i;
const TENDER_TEXT_PATTERN =
  /\be-?tenders?\b|\btenders?\b|\bprocurement\b|\bquotations?\b|\bnotice\s+tender\b/i;

const SKIP_HREF =
  /^(mailto:|javascript:|#)|facebook\.com|twitter\.com|instagram\.com|youtube\.com\/watch|linkedin\.com\/share|play\.google|apps\.apple|\.(jpg|jpeg|png|gif|svg|css|js)(\?|$)/i;

function hostKey(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h;
  } catch {
    return "";
  }
}

function scoreLink(text, abs, pageHost) {
  const probe = `${text} ${abs}`.toLowerCase();
  let score = 0;
  if (STRICT_PATTERN.test(probe)) score += 3;
  if (PATH_PATTERN.test(new URL(abs).pathname)) score += 2;
  if (/\.pdf(\?|$)/i.test(abs)) score += 4;
  if (hostKey(abs) === pageHost) score += 1;
  if (text.length >= 15) score += 1;
  if (text.length >= 30) score += 1;
  if (/login|signup|register|privacy|terms|contact|sitemap|gallery|tourism/i.test(probe)) score -= 5;
  if (TENDER_URL_PATTERN.test(abs) || TENDER_TEXT_PATTERN.test(text)) score -= 20;
  if (
    /^(apply\s+online|notifications?|advertisements?|examination\s+syllabus|recruitment\s+calendar|results?)$/i.test(
      text.trim()
    )
  ) {
    score -= 8;
  }
  return score;
}

export function discoverRssUrl(html, pageUrl) {
  const $ = cheerio.load(html);
  const found = [];
  $("link[rel='alternate'], link[rel=\"alternate\"]").each((_, el) => {
    const type = String($(el).attr("type") || "").toLowerCase();
    const href = $(el).attr("href");
    if (!href) return;
    if (type.includes("rss") || type.includes("atom") || type.includes("xml")) {
      try {
        found.push(new URL(href, pageUrl).toString());
      } catch {
        /* ignore */
      }
    }
  });
  $("a[href*='rss'], a[href*='feed'], a[href*='.xml']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const abs = new URL(href, pageUrl).toString();
      if (/rss|feed|\.xml/i.test(abs)) found.push(abs);
    } catch {
      /* ignore */
    }
  });
  return found[0] || null;
}

function collectAnchors(html, pageUrl, options) {
  const $ = cheerio.load(html);
  const pageHost = hostKey(pageUrl);
  const minScore = options.relaxed ? 1 : 2;
  const maxItems = Math.min(60, Math.max(1, Number(options.maxItems) || 20));
  const candidates = [];

  $("a[href]").each((_, el) => {
    const hrefRaw = $(el).attr("href")?.trim();
    if (!hrefRaw || SKIP_HREF.test(hrefRaw)) return;

    let abs;
    try {
      abs = new URL(hrefRaw, pageUrl).toString();
    } catch {
      return;
    }
    if (!/^https?:/i.test(abs)) return;

    const text = $(el).text().replace(/\s+/g, " ").trim();
    const title = text || $(el).attr("title") || "";
    const score = scoreLink(title, abs, pageHost);

    if (options.relaxed) {
      const sameGov =
        pageHost.endsWith(".gov.in") || pageHost.endsWith(".nic.in")
          ? abs.includes(".gov.in") || abs.includes(".nic.in") || hostKey(abs) === pageHost
          : hostKey(abs) === pageHost;
      if (score < minScore && !(sameGov && (PATH_PATTERN.test(abs) || /\.pdf/i.test(abs)))) return;
    } else if (score < minScore) {
      return;
    }

    const pdfUrls = /\.pdf(\?|$)/i.test(abs) ? [abs] : [];
    candidates.push({
      title: title || abs.split("/").filter(Boolean).pop() || "Official notification",
      link: abs,
      pdfUrls,
      score,
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const results = [];
  for (const c of candidates) {
    if (results.length >= maxItems) break;
    if (seen.has(c.link)) continue;
    seen.add(c.link);
    results.push(c);
  }
  return results;
}

/**
 * Pull recruitment-like links from an official portal HTML page.
 */
export function extractJobLinks(html, pageUrl, options = {}) {
  const strict = collectAnchors(html, pageUrl, { ...options, relaxed: false });
  if (strict.length > 0) return strict;
  if (options.relaxed !== false) {
    return collectAnchors(html, pageUrl, { ...options, relaxed: true });
  }
  return [];
}

/** Try common recruitment paths on the same host when the primary page fails. */
export function commonRecruitmentPaths(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const paths = [
    "/recruitment",
    "/recruitments",
    "/career",
    "/careers",
    "/notification",
    "/notifications",
    "/notices",
    "/notice",
    "/vacancy",
    "/vacancies",
    "/whats-new",
    "/advertisement",
    "/archive",
    "/notice-category/recruitments/",
    "/notice-category/recruitment/",
  ];
  return paths.map((p) => `${origin}${p}`);
}
