import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commonRecruitmentPaths } from "./html-job-links.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = join(__dirname, "..", "data", "official-site-overrides.json");

let cache = null;

export function loadSiteOverrides() {
  if (!cache) {
    cache = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
    delete cache._info;
  }
  return cache;
}

function dcourtDefaults(site) {
  const m = site.id?.match(/^dcourt-(.+)$/);
  if (!m) return {};
  const slug = m[1];
  return {
    latestUrl: `https://${slug}.dcourts.gov.in/notice-category/recruitments/`,
    altUrls: [`https://${slug}.dcourts.gov.in/`],
    relaxed: true,
  };
}

/** Merge officialSites.js entry with scripts/data/official-site-overrides.json */
export function enrichSite(site) {
  const overrides = loadSiteOverrides();
  const o = overrides[site.id] || {};
  const dc = dcourtDefaults(site);
  return {
    ...site,
    latestUrl: o.latestUrl || site.latestUrl || dc.latestUrl,
    url: o.url || site.url,
    rssUrl: o.rssUrl || site.rssUrl || null,
    relaxed: o.relaxed ?? dc.relaxed ?? true,
    altUrls: [...new Set([...(dc.altUrls || []), ...(o.altUrls || []), ...(site.altUrls || [])])],
  };
}

export function urlsToTry(site) {
  const enriched = enrichSite(site);
  const list = [
    enriched.latestUrl,
    enriched.url,
    ...enriched.altUrls,
    ...commonRecruitmentPaths(enriched.url || enriched.latestUrl),
  ].filter(Boolean);
  return [...new Set(list)];
}
