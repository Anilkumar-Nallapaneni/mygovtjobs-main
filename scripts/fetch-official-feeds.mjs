/**
 * Fetches allowed official RSS/Atom feeds + HTML listing fallbacks.
 *
 * Usage: npm run fetch:official:feeds
 * Output: frontend/public/data/official-feed-items.json
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOfficialSiteItems } from "./fetch-official-sites.mjs";
import { fetchOfficialRssSources } from "./lib/fetch-official-rss-sources.mjs";
import { mergeFeedItems } from "./lib/official-feed-utils.mjs";
import { filterByLookback, parseDaysArg } from "./lib/lookback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(__dirname, "official-sources.json");
const OUT_DIR = join(ROOT, "frontend", "public", "data");
const OUT_FILE = join(OUT_DIR, "official-feed-items.json");
const PORTAL_IDS_PATH = join(__dirname, "data", "admit-result-portal-ids.json");

function loadAdmitResultPortalIds() {
  if (process.argv.includes("--rss-only")) return [];
  try {
    const cfg = JSON.parse(readFileSync(PORTAL_IDS_PATH, "utf8"));
    return Array.isArray(cfg.onlySiteIds) ? cfg.onlySiteIds : [];
  } catch {
    return [];
  }
}

function parseOnlyFeedIds(argv) {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return arg
    .slice("--only=".length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberArg(argv, name, fallback = 0) {
  const arg = argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const value = Number(arg.slice(name.length + 3));
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const lookbackDays = parseDaysArg(process.argv, Number(raw.lookbackDays) || 60);
  const requestTimeoutMs = Math.max(5_000, parseNumberArg(process.argv, "request-timeout-ms", 18_000));
  const requestRetries = Math.max(0, parseNumberArg(process.argv, "request-retries", 1));
  const sourceTimeoutMs = Math.max(requestTimeoutMs, parseNumberArg(process.argv, "source-timeout-ms", 75_000));
  const portalSiteTimeoutMs = Math.max(requestTimeoutMs, parseNumberArg(process.argv, "portal-site-timeout-ms", 45_000));
  const maxRuntimeMinutes = Math.max(0, parseNumberArg(process.argv, "max-runtime-minutes", 0));
  const maxFeeds = Math.max(0, parseNumberArg(process.argv, "max-feeds", 0));
  const maxPortalSites = Math.max(0, parseNumberArg(process.argv, "max-portal-sites", 0));
  const maxTotalItems = Math.max(0, parseNumberArg(process.argv, "max-total-items", 0));
  const shouldMergeExisting =
    process.argv.includes("--merge-existing") ||
    process.argv.includes("--rss-only") ||
    Boolean(maxRuntimeMinutes || maxFeeds || maxPortalSites || maxTotalItems);
  const runtimeDeadlineAtMs = maxRuntimeMinutes > 0 ? Date.now() + maxRuntimeMinutes * 60_000 : 0;
  console.log(`Lookback window: ${lookbackDays} days`);
  console.log(
    `Runtime guards: requestTimeout=${requestTimeoutMs}ms retries=${requestRetries} rssSourceTimeout=${sourceTimeoutMs}ms portalSiteTimeout=${portalSiteTimeoutMs}ms${
      maxRuntimeMinutes ? ` maxRuntime=${maxRuntimeMinutes}m` : ""
    }${maxFeeds ? ` maxFeeds=${maxFeeds}` : ""}${maxPortalSites ? ` maxPortalSites=${maxPortalSites}` : ""}`
  );

  const onlyFeedIds = parseOnlyFeedIds(process.argv);
  const { sourceReports, items: rssFetched } = await fetchOfficialRssSources({
    lookbackDays,
    feedIds: onlyFeedIds,
    maxFeeds,
    requestRetries,
    timeoutMs: requestTimeoutMs,
    sourceTimeoutMs,
    runtimeDeadlineAtMs,
  });

  const portalIds = loadAdmitResultPortalIds();
  let siteReports = [];
  let portalItems = [];
  if (portalIds.length && (!runtimeDeadlineAtMs || Date.now() < runtimeDeadlineAtMs)) {
    console.log(`\nScraping ${portalIds.length} admit/result portals (officialSites.js)…`);
    const sites = await fetchOfficialSiteItems({
      lookbackDays,
      onlySiteIds: portalIds,
      maxSites: maxPortalSites,
      requestTimeoutMs,
      requestRetries,
      siteTimeoutMs: portalSiteTimeoutMs,
      runtimeDeadlineAtMs,
      titlePattern:
        "recruit|vacanc|notif|advert|career|employment|bharti|naukri|exam|admit|result|hall\\s*ticket|call\\s*letter|merit|cut[\\s-]*off|apply|opening|posting|selection|appointment|walk-?in|notice|marks|scorecard",
    });
    siteReports = sites.siteReports;
    portalItems = sites.items;
    const ok = siteReports.filter((r) => r.ok).length;
    console.log(`  Portal scrape: ${portalItems.length} items from ${ok}/${siteReports.length} sites`);
  }

  const fetched = mergeFeedItems(rssFetched, portalItems);
  let items = filterByLookback(fetched, lookbackDays).sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  if (maxTotalItems > 0) {
    items = items.slice(0, maxTotalItems);
  }

  if (shouldMergeExisting || onlyFeedIds?.length) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      const prevItems = Array.isArray(prev.items) ? prev.items : [];
      items = filterByLookback(mergeFeedItems(prevItems, items), lookbackDays).sort((a, b) => {
        const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      });
      if (maxTotalItems > 0) {
        items = items.slice(0, maxTotalItems);
      }
      console.log(`Merged bounded fetch with ${prevItems.length} existing items → ${items.length} total`);
    } catch {
      /* first run */
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceReports,
    siteReports,
    items,
  };
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${items.length} deduped items to ${OUT_FILE}`);
  for (const r of sourceReports) {
    const via = r.fetchMethod ? ` (${r.fetchMethod})` : "";
    console.log(`  [${r.ok ? "ok" : "fail"}] ${r.name}: ${r.itemCount} kept${via}${r.error ? ` — ${r.error}` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
