import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { discoverRssUrl, extractJobLinks } from "./html-job-links.mjs";
import { extractPdfUrls, fetchHtml, fetchText, parseDate, stableId } from "./official-feed-utils.mjs";
import { DEFAULT_LOOKBACK_DAYS, isWithinLookback } from "./lookback.mjs";

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "official-sources.json");

function listingUrlsFor(feed) {
  return [...new Set([feed.listingUrl, ...(feed.altListingUrls || [])].filter(Boolean))];
}

function toRow(item, feed, sourceId, fetchMethod) {
  return {
    id: stableId(item.link),
    title: item.title,
    link: item.link,
    publishedAt: item.publishedAt || null,
    summary: item.summary || null,
    pdfUrls: item.pdfUrls || [],
    sourceId,
    sourceName: feed.name || sourceId,
    dept: feed.dept || feed.name || sourceId,
    state: feed.state || "All India",
    category: feed.category || null,
    stateIds: feed.stateIds || ["all"],
    fetchMethod,
  };
}

async function parseRssText(xml, feed, sourceId, { titleRe, maxItems, scanLimit, lookbackDays, fetchMethod }) {
  const parser = new Parser({ timeout: 25000, maxRedirects: 5 });
  const parsed = await parser.parseString(xml);
  const rows = [];
  for (const it of (parsed.items || []).slice(0, scanLimit)) {
    if (rows.length >= maxItems) break;
    const title = (it.title || "").trim();
    const link = (it.link || it.guid || "").toString().trim();
    if (!title || !link) continue;
    if (titleRe && !titleRe.test(title)) continue;
    const publishedAt = parseDate(it.pubDate || it.isoDate);
    if (!isWithinLookback(publishedAt, lookbackDays, { includeUnknown: true })) continue;
    const html = [it.content, it["content:encoded"], it.contentSnippet, it.summary].filter(Boolean).join("\n");
    rows.push(
      toRow(
        {
          title,
          link,
          publishedAt,
          summary: (it.contentSnippet || it.summary || "").toString().replace(/\s+/g, " ").trim().slice(0, 400) || null,
          pdfUrls: extractPdfUrls(html),
        },
        feed,
        sourceId,
        fetchMethod
      )
    );
  }
  return rows;
}

async function fetchRssFeed(feedUrl, feed, sourceId, ctx) {
  const { text } = await fetchText(feedUrl, ctx.userAgent, ctx.timeoutMs);
  return parseRssText(text, feed, sourceId, { ...ctx, fetchMethod: "rss-feed" });
}

async function fetchHtmlListing(pageUrl, feed, sourceId, ctx) {
  const { html, finalUrl } = await fetchHtml(pageUrl, ctx.userAgent, ctx.timeoutMs);
  const discovered = discoverRssUrl(html, finalUrl);
  if (discovered) {
    try {
      const rssRows = await fetchRssFeed(discovered, feed, sourceId, ctx);
      if (rssRows.length) return { rows: rssRows, method: "rss-discovered", listingUrl: pageUrl };
    } catch {
      /* fall through to anchor scrape */
    }
  }

  const links = extractJobLinks(html, finalUrl, {
    maxItems: ctx.maxItems,
    relaxed: feed.relaxed !== false,
  });
  const rows = [];
  for (const link of links) {
    if (rows.length >= ctx.maxItems) break;
    if (ctx.titleRe && !ctx.titleRe.test(link.title)) continue;
    rows.push(
      toRow(
        {
          title: link.title,
          link: link.link,
          publishedAt: null,
          summary: null,
          pdfUrls: link.pdfUrls || [],
        },
        feed,
        sourceId,
        "html-listing"
      )
    );
  }
  return { rows, method: "html-listing", listingUrl: pageUrl };
}

async function fetchOneSource(feed, ctx) {
  const sourceId = feed.id || feed.feedUrl || feed.listingUrl;
  const report = {
    id: sourceId,
    name: feed.name || sourceId,
    feedUrl: feed.feedUrl || null,
    listingUrl: feed.listingUrl || null,
    ok: false,
    error: null,
    itemCount: 0,
    fetchMethod: null,
  };

  const titleRe = feed.titleMustMatch ? new RegExp(feed.titleMustMatch, "i") : null;
  const maxItems = Math.min(300, Math.max(1, Number(feed.maxItems) || 80));
  const scanLimit = Math.min(500, maxItems * 4);
  const sourceCtx = { ...ctx, titleRe, maxItems, scanLimit };

  const errors = [];

  if (feed.feedUrl) {
    try {
      const rows = await fetchRssFeed(feed.feedUrl, feed, sourceId, sourceCtx);
      if (rows.length) {
        report.ok = true;
        report.itemCount = rows.length;
        report.fetchMethod = "rss-feed";
        return { report, rows };
      }
      errors.push("rss-empty");
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const listings = listingUrlsFor(feed);
  if (!listings.length) {
    report.error = errors.join("; ") || "missing feedUrl and listingUrl";
    return { report, rows: [] };
  }

  const merged = [];
  for (const pageUrl of listings) {
    try {
      const { rows, method } = await fetchHtmlListing(pageUrl, feed, sourceId, sourceCtx);
      if (rows.length) {
        merged.push(...rows);
        report.fetchMethod = method;
      }
    } catch (e) {
      errors.push(`${pageUrl}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (merged.length >= maxItems) break;
  }

  const byLink = new Map();
  for (const row of merged) {
    if (!byLink.has(row.link)) byLink.set(row.link, row);
    if (byLink.size >= maxItems) break;
  }
  const rows = [...byLink.values()];

  if (rows.length) {
    report.ok = true;
    report.itemCount = rows.length;
    report.error = null;
  } else {
    report.error = errors.join("; ") || "no items";
  }
  return { report, rows };
}

export async function fetchOfficialRssSources(options = {}) {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const lookbackDays = options.lookbackDays ?? Number(raw.lookbackDays) ?? DEFAULT_LOOKBACK_DAYS;
  const userAgent = raw.userAgent || "GovJobAlertFetcher/1.0";
  const timeoutMs = options.timeoutMs ?? 28000;
  const feedIds = options.feedIds;
  const feeds = (Array.isArray(raw.feeds) ? raw.feeds : []).filter(
    (feed) => !feedIds?.length || feedIds.includes(feed.id)
  );
  const sourceReports = [];
  const byLink = new Map();

  for (const feed of feeds) {
    process.stdout.write(`  RSS/HTML ${feed.id || feed.name}…\n`);
    const { report, rows } = await fetchOneSource(feed, { userAgent, lookbackDays, timeoutMs });
    sourceReports.push(report);
    for (const row of rows) {
      if (!byLink.has(row.link)) byLink.set(row.link, row);
    }
  }

  const items = [...byLink.values()].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  return { sourceReports, items, lookbackDays };
}
