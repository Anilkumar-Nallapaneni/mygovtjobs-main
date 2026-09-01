#!/usr/bin/env node
/**
 * Regenerate HTML scraper entries from frontend/src/data/officialSites.js
 * Keeps existing RSS scrapers in scripts/scraper_registry.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_SITES } from "../frontend/src/data/officialSites.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, "scraper_registry.json");

const existing = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const rssScrapers = (existing.scrapers || []).filter((s) => s.module === "rss_feed");
const existingByCode = new Map((existing.scrapers || []).map((s) => [s.code, s]));
const CUSTOM_MODULES = new Set([
  "iocl_listings",
  "rrb_cen",
  "rrb_open_cen",
  "bsf_portal",
  "bhel_careers",
  "hal_careers",
  "ssc_api",
]);

const htmlScrapers = [];
const seen = new Set();

for (const site of OFFICIAL_SITES) {
  const code = site.id;
  if (!code || seen.has(code)) continue;
  seen.add(code);

  const portalUrl = (site.latestUrl || site.url || "").replace(/\?.*$/, "").replace(/\/$/, "");
  if (!portalUrl.startsWith("http")) continue;

  const stateId =
    site.stateIds?.length === 1 && site.stateIds[0] !== "all" ? site.stateIds[0] : "all";

  const prev = existingByCode.get(code);
  if (prev && CUSTOM_MODULES.has(prev.module)) {
    htmlScrapers.push({ ...prev, category: prev.category || site.category || "state" });
    continue;
  }

  htmlScrapers.push({
    code,
    module: "state_portal_html",
    portal_url: portalUrl,
    state: stateId,
    category: site.category || "state",
    enabled: true,
    maxItems: site.scope === "state" ? 80 : 50,
  });
}

const registry = {
  _info: "Auto-generated HTML scrapers + RSS feeds. Run: node scripts/generate-scraper-registry.mjs",
  lookbackDays: 60,
  maxItems: 80,
  scrapers: [...rssScrapers, ...htmlScrapers],
};

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
console.log(`Wrote ${registry.scrapers.length} scrapers (${rssScrapers.length} RSS + ${htmlScrapers.length} HTML)`);
