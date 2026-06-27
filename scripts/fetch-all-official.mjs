/**
 * Fetches RSS feeds + officialSites.js portals → official-feed-items.json + live-jobs.json
 *
 * Usage: npm run fetch:official [-- --limit=25]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOfficialSiteItems } from "./fetch-official-sites.mjs";
import { fetchOfficialRssSources } from "./lib/fetch-official-rss-sources.mjs";
import { FEED_FILE, LIVE_JOBS_FILE, mergeFeedItems, writeOfficialPayload } from "./lib/official-feed-utils.mjs";
import { DEFAULT_LOOKBACK_DAYS, parseDaysArg } from "./lib/lookback.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function fetchRssItems(options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const { sourceReports, items } = await fetchOfficialRssSources({ lookbackDays });
  for (const report of sourceReports) {
    const via = report.fetchMethod ? ` (${report.fetchMethod})` : "";
    console.log(
      `  [${report.ok ? "ok" : "fail"}] RSS ${report.name}: ${report.itemCount}${via}${report.error ? ` — ${report.error}` : ""}`
    );
  }
  return { sourceReports, items };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const cliLimit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const lookbackDays = parseDaysArg(process.argv, DEFAULT_LOOKBACK_DAYS);
  const feedOnly = process.argv.includes("--feed-only");

  console.log(`=== Notifications from last ${lookbackDays} days ===`);
  console.log("\n=== RSS feeds (official-sources.json) ===");
  const rss = await fetchRssItems({ lookbackDays });

  console.log("\n=== Official portals (officialSites.js) ===");
  const sites = await fetchOfficialSiteItems(
    cliLimit != null ? { maxSites: cliLimit, lookbackDays } : { lookbackDays }
  );

  const merged = mergeFeedItems(rss.items, sites.items);
  writeOfficialPayload({
    items: merged,
    sourceReports: rss.sourceReports,
    siteReports: sites.siteReports,
    feedOnly,
  });

  console.log(`\nWrote ${merged.length} items →`);
  console.log(`  ${FEED_FILE}`);
  if (!feedOnly) console.log(`  ${LIVE_JOBS_FILE}`);
  else console.log("  (skipped live-jobs.json — Python ingest owns the catalog)");
}

const isDirectRun = process.argv[1]?.includes("fetch-all-official.mjs");
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
