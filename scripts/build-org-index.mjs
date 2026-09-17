#!/usr/bin/env node
/**
 * Build frontend/public/data/org-index.json from live jobs (dept field).
 *   node scripts/build-org-index.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livePath = join(root, "frontend/public/data/live-jobs.json");
const healthPath = join(root, "frontend/public/data/source-health.json");
const outPath = join(root, "frontend/public/data/org-index.json");
const srcOutPath = join(root, "frontend/src/data/org-index.json");
const MIN_JOBS = 1;

function slugifyOrg(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hostnameOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function loadJobs() {
  if (!existsSync(livePath)) return [];
  const payload = JSON.parse(readFileSync(livePath, "utf8"));
  return Array.isArray(payload.items) ? payload.items : [];
}

function loadHealth() {
  if (!existsSync(healthPath)) return [];
  try {
    const payload = JSON.parse(readFileSync(healthPath, "utf8"));
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

function normalizeHealth(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "HEALTHY") return "healthy";
  if (raw === "DEGRADED") return "degraded";
  if (raw === "BROKEN" || raw === "BLOCKED") return "broken";
  if (raw === "STALE") return "stale";
  return "unknown";
}

function matchHealth(host, rows) {
  if (!host) return null;
  const matches = rows.filter((row) => {
    const home = hostnameOf(row.homepageUrl);
    const recruit = hostnameOf(row.recruitmentUrl);
    return home === host || recruit === host || (home && host.endsWith(`.${home}`)) || (home && home.endsWith(`.${host}`));
  });
  if (!matches.length) return null;
  const rank = (status) => {
    const n = normalizeHealth(status);
    if (n === "healthy") return 0;
    if (n === "degraded") return 1;
    if (n === "stale") return 2;
    if (n === "broken") return 3;
    return 4;
  };
  return [...matches].sort((a, b) => {
    const byStatus = rank(a.healthStatus) - rank(b.healthStatus);
    if (byStatus !== 0) return byStatus;
    return String(b.lastCheckedAt || "").localeCompare(String(a.lastCheckedAt || ""));
  })[0];
}

function jobUrls(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  return [job.apply_url, job.primary_pdf_url, job.pdf_url, job.source_url, detail.notification_url, detail.pdf_url];
}

function hasPdf(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  return Boolean(job.primary_pdf_url || job.pdf_url || detail.pdf_url || (Array.isArray(detail.pdf_urls) && detail.pdf_urls.length));
}

function main() {
  const jobs = loadJobs();
  const healthRows = loadHealth();
  const tallies = new Map();

  for (const job of jobs) {
    const dept = String(job.dept ?? "").trim();
    if (!dept || dept.length < 2) continue;
    if (String(job.status || "live").toLowerCase() === "expired") continue;

    const key = dept.toLowerCase();
    const row = tallies.get(key) ?? {
      dept,
      slug: slugifyOrg(dept),
      count: 0,
      vacancies: 0,
      hosts: new Map(),
      pdfs: 0,
      lastPostedAt: "",
    };
    row.count += 1;
    row.vacancies += Number(job.vacancies) || 0;
    if (hasPdf(job)) row.pdfs += 1;
    const posted = String(job.published_at || job.created_at || "").slice(0, 19);
    if (posted && posted > row.lastPostedAt) row.lastPostedAt = posted;
    for (const url of jobUrls(job)) {
      const host = hostnameOf(url);
      if (!host) continue;
      row.hosts.set(host, (row.hosts.get(host) || 0) + 1);
    }
    tallies.set(key, row);
  }

  const index = [...tallies.values()]
    .filter((row) => row.count >= MIN_JOBS && row.slug)
    .sort((a, b) => b.count - a.count || a.dept.localeCompare(b.dept))
    .map((row) => {
      let officialDomain = "";
      let bestCount = 0;
      for (const [host, count] of row.hosts) {
        if (count > bestCount) {
          officialDomain = host;
          bestCount = count;
        }
      }
      const health = matchHealth(officialDomain, healthRows);
      const sourceHealth = health
        ? normalizeHealth(health.healthStatus)
        : row.lastPostedAt
          ? "healthy"
          : "unknown";
      return {
        dept: row.dept,
        slug: row.slug,
        count: row.count,
        vacancies: row.vacancies,
        officialDomain: officialDomain || null,
        officialUrl: officialDomain ? `https://${officialDomain}` : null,
        sourceHealth,
        lastPostedAt: row.lastPostedAt || null,
        lastCheckedAt: health?.lastCheckedAt || null,
        pdfCoverage: row.count ? Number((row.pdfs / row.count).toFixed(2)) : 0,
      };
    });

  const body = `${JSON.stringify(index, null, 2)}\n`;
  writeFileSync(outPath, body, "utf8");
  writeFileSync(srcOutPath, body, "utf8");
  console.log(`Wrote ${outPath} and ${srcOutPath} — ${index.length} organisations (min ${MIN_JOBS} jobs)`);
}

main();
