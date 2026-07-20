/**
 * Scrape recruitment notifications from portals in frontend/src/data/officialSites.js
 *
 * Usage: node scripts/fetch-official-sites.mjs [--limit=25]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { OFFICIAL_SITES } from "../frontend/src/data/officialSites.ts";
import { STATES } from "../frontend/src/data/states.ts";
import { discoverRssUrl, extractJobLinks } from "./lib/html-job-links.mjs";
import { enrichSite, urlsToTry } from "./lib/site-overrides.mjs";
import {
  extractPdfUrls,
  fetchHtml,
  fetchText,
  parseDate,
  stableId,
  stateLabel,
} from "./lib/official-feed-utils.mjs";
import { DEFAULT_LOOKBACK_DAYS, filterByLookback, isWithinLookback, parseDaysArg } from "./lib/lookback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "official-sites-fetch.json");

function loadConfig() {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const cliLimit = limitArg ? Number(limitArg.split("=")[1]) : null;
  const lookbackDays = parseDaysArg(process.argv, Number(raw.lookbackDays) || DEFAULT_LOOKBACK_DAYS);
  return {
    ...raw,
    lookbackDays,
    maxSites: cliLimit ?? (Number(raw.maxSites) || 0),
  };
}

function pickSites(cfg) {
  let sites = [...OFFICIAL_SITES];
  if (Array.isArray(cfg.onlySiteIds) && cfg.onlySiteIds.length) {
    sites = sites.filter((s) => cfg.onlySiteIds.includes(s.id));
  }
  if (Array.isArray(cfg.skipSiteIds) && cfg.skipSiteIds.length) {
    sites = sites.filter((s) => !cfg.skipSiteIds.includes(s.id));
  }
  if (cfg.maxSites > 0) sites = sites.slice(0, cfg.maxSites);
  return sites;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toFeedRows(rawItems, site, method) {
  return rawItems.map((row) => ({
    id: stableId(row.link),
    title: row.title,
    link: row.link,
    publishedAt: row.publishedAt || null,
    summary: row.summary || null,
    pdfUrls: row.pdfUrls || [],
    sourceId: site.id,
    sourceName: site.name,
    dept: site.name,
    state: stateLabel(site.stateIds, STATES),
    category: site.category || null,
    stateIds: site.stateIds || ["all"],
    fetchMethod: method,
  }));
}

async function parseRssFeed(feedUrl, site, parser, userAgent, maxItems, timeoutMs, lookbackDays) {
  const { text } = await fetchText(feedUrl, userAgent, timeoutMs);
  const feed = await parser.parseString(text);
  const rows = [];
  const scanLimit = Math.min(500, maxItems * 4);
  for (const it of (feed.items || []).slice(0, scanLimit)) {
    if (rows.length >= maxItems) break;
    const title = (it.title || "").trim();
    const link = (it.link || it.guid || "").toString().trim();
    if (!title || !link) continue;
    const publishedAt = parseDate(it.pubDate || it.isoDate);
    if (!isWithinLookback(publishedAt, lookbackDays, { includeUnknown: true })) continue;
    const html = [it.content, it["content:encoded"], it.summary].filter(Boolean).join("\n");
    rows.push({
      title,
      link,
      publishedAt,
      summary: (it.contentSnippet || it.summary || "").toString().replace(/\s+/g, " ").trim().slice(0, 400) || null,
      pdfUrls: extractPdfUrls(html),
    });
  }
  return rows;
}

async function scrapeFromHtml(pageUrl, site, cfg) {
  const { html, finalUrl } = await fetchHtml(pageUrl, cfg.userAgent, cfg.requestTimeoutMs);
  const links = extractJobLinks(html, finalUrl, {
    maxItems: cfg.maxItemsPerSite,
    titlePattern: cfg.titlePattern,
    relaxed: site.relaxed !== false,
  });
  return links.map((row) => ({
    title: row.title,
    link: row.link,
    publishedAt: null,
    summary: null,
    pdfUrls: row.pdfUrls || [],
  }));
}

async function scrapeSite(site, cfg, parser) {
  const enriched = enrichSite(site);
  const report = {
    id: enriched.id,
    name: enriched.name,
    url: enriched.latestUrl || enriched.url,
    ok: false,
    error: null,
    itemCount: 0,
    method: null,
    triedUrls: [],
  };

  const maxItems = cfg.maxItemsPerSite;
  const byLink = new Map();

  if (enriched.rssUrl) {
    try {
      const rows = await parseRssFeed(
        enriched.rssUrl,
        enriched,
        parser,
        cfg.userAgent,
        maxItems,
        cfg.requestTimeoutMs,
        cfg.lookbackDays
      );
      for (const row of toFeedRows(rows, enriched, "rss-config")) {
        if (row.link) byLink.set(row.link, row);
      }
      if (byLink.size) report.method = "rss-config";
      report.triedUrls.push(enriched.rssUrl);
    } catch {
      /* continue to HTML */
    }
  }

  const tryUrls = urlsToTry(enriched).slice(0, cfg.maxUrlsPerSite || 12);

  for (const pageUrl of tryUrls) {
    if (byLink.size >= maxItems) break;
    report.triedUrls.push(pageUrl);

    try {
      const { html, finalUrl } = await fetchHtml(pageUrl, cfg.userAgent, cfg.requestTimeoutMs);
      if (!enriched.rssUrl) {
        const rssDiscovered = discoverRssUrl(html, finalUrl);
        if (rssDiscovered && byLink.size < maxItems) {
          try {
            const rows = await parseRssFeed(
              rssDiscovered,
              enriched,
              parser,
              cfg.userAgent,
              maxItems,
              cfg.requestTimeoutMs,
              cfg.lookbackDays
            );
            for (const row of toFeedRows(rows, enriched, "rss-discovered")) {
              if (row.link && !byLink.has(row.link)) byLink.set(row.link, row);
            }
            if (byLink.size) report.method = report.method || "rss-discovered";
          } catch {
            /* HTML */
          }
        }
      }

      const links = extractJobLinks(html, finalUrl, {
        maxItems: maxItems - byLink.size,
        titlePattern: cfg.titlePattern,
        relaxed: enriched.relaxed !== false,
      });
      if (links.length) {
        for (const row of toFeedRows(links, enriched, report.method || "html")) {
          if (row.link && !byLink.has(row.link)) byLink.set(row.link, row);
        }
        report.method = report.method || "html";
      }
    } catch (e) {
      report.error = e instanceof Error ? e.message : String(e);
    }

    if (cfg.delayBetweenMs > 0) await sleep(Math.min(cfg.delayBetweenMs, 400));
  }

  const items = [...byLink.values()].slice(0, maxItems);
  const filtered = filterByLookback(items, cfg.lookbackDays);
  report.ok = filtered.length > 0;
  report.itemCount = filtered.length;
  if (!filtered.length && !report.error) report.error = "no matching links";
  return { report, items: filtered };
}

export async function fetchOfficialSiteItems(options = {}) {
  const cfg = { ...loadConfig(), ...options };
  const sites = pickSites(cfg).map(enrichSite);
  const parser = new Parser({
    timeout: cfg.requestTimeoutMs,
    headers: { "User-Agent": cfg.userAgent },
    maxRedirects: 5,
  });

  const siteReports = [];
  const allItems = [];
  const concurrency = Math.max(1, Number(cfg.concurrency) || 3);
  let index = 0;

  async function worker() {
    while (index < sites.length) {
      const i = index++;
      const site = sites[i];
      // Per-site wall clock so one hung .gov host cannot stall the whole daily sync.
      const siteBudgetMs = Math.max((Number(cfg.requestTimeoutMs) || 28000) * 4, 120_000);
      let report;
      let items;
      try {
        const result = await Promise.race([
          scrapeSite(site, cfg, parser),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("site budget timeout")), siteBudgetMs)
          ),
        ]);
        report = result.report;
        items = result.items;
      } catch (e) {
        report = {
          id: site.id,
          name: site.name,
          ok: false,
          itemCount: 0,
          method: null,
          error: e instanceof Error ? e.message : String(e),
        };
        items = [];
      }
      siteReports.push(report);
      allItems.push(...items);
      const tag = report.ok ? "ok" : "fail";
      console.log(
        `  [${tag}] ${site.name}: ${report.itemCount} (${report.method || "—"})${report.error ? ` — ${report.error}` : ""}`
      );
      if (cfg.delayBetweenMs > 0) await sleep(cfg.delayBetweenMs);
    }
  }

  console.log(`Scraping ${sites.length} official portals (with URL fixes + fallbacks) …`);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return { siteReports, items: allItems };
}

async function main() {
  const { siteReports, items } = await fetchOfficialSiteItems();
  const ok = siteReports.filter((r) => r.ok).length;
  const fail = siteReports.filter((r) => !r.ok);
  console.log(`\nDone: ${items.length} items from ${ok}/${siteReports.length} portals.`);
  if (fail.length) {
    console.log(`Failed (${fail.length}): ${fail.map((f) => f.id).join(", ")}`);
  }
  return { siteReports, items };
}

const isDirectRun = process.argv[1]?.includes("fetch-official-sites.mjs");
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
