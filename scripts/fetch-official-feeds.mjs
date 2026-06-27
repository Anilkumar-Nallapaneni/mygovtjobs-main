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

async function main() {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const lookbackDays = parseDaysArg(process.argv, Number(raw.lookbackDays) || 60);
  console.log(`Lookback window: ${lookbackDays} days`);

  const onlyFeedIds = parseOnlyFeedIds(process.argv);
  const { sourceReports, items: rssFetched } = await fetchOfficialRssSources({
    lookbackDays,
    feedIds: onlyFeedIds,
  });

  const portalIds = loadAdmitResultPortalIds();
  let siteReports = [];
  let portalItems = [];
  if (portalIds.length) {
    console.log(`\nScraping ${portalIds.length} admit/result portals (officialSites.js)…`);
    const sites = await fetchOfficialSiteItems({
      lookbackDays,
      onlySiteIds: portalIds,
      maxSites: 0,
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

  if (onlyFeedIds?.length) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      const prevItems = Array.isArray(prev.items) ? prev.items : [];
      items = filterByLookback(mergeFeedItems(prevItems, items), lookbackDays).sort((a, b) => {
        const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      });
      console.log(`Merged partial fetch (${onlyFeedIds.length} sources) with ${prevItems.length} existing items → ${items.length} total`);
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
