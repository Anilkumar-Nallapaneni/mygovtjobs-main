#!/usr/bin/env node
/**
 * Fetch all government job notifications from the last ~2 months (default 60 days).
 *
 * Usage:
 *   npm run fetch:historical
 *   npm run fetch:historical -- --days=60
 *   npm run fetch:historical -- --limit=10   # only first 10 portals (quick test)
 */
import { fetchRssItems } from "./fetch-all-official.mjs";
import { fetchOfficialSiteItems } from "./fetch-official-sites.mjs";
import { FEED_FILE, LIVE_JOBS_FILE, mergeFeedItems, writeOfficialPayload } from "./lib/official-feed-utils.mjs";
import { DEFAULT_LOOKBACK_DAYS, parseDaysArg } from "./lib/lookback.mjs";

async function main() {
  const lookbackDays = parseDaysArg(process.argv, DEFAULT_LOOKBACK_DAYS);
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const maxSites = limitArg ? Number(limitArg.split("=")[1]) : 0;

  console.log(`\nMy Govt Jobs — historical fetch (${lookbackDays} day window)\n`);

  const rss = await fetchRssItems({ lookbackDays });
  const sites = await fetchOfficialSiteItems({ lookbackDays, maxSites });

  const merged = mergeFeedItems(rss.items, sites.items);
  writeOfficialPayload({
    items: merged,
    sourceReports: rss.sourceReports,
    siteReports: sites.siteReports,
  });

  console.log(`\nWrote ${merged.length} notifications (last ${lookbackDays} days)`);
  console.log(`  ${FEED_FILE}`);
  console.log(`  ${LIVE_JOBS_FILE}`);
  console.log("\nNext: run backend ingest to save into Supabase:");
  console.log('  curl -X POST "http://localhost:8000/api/admin/ingest/run-all" -H "X-Admin-Key: YOUR_KEY"');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
