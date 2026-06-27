#!/usr/bin/env node
/**
 * Generate frontend/public/sitemap.xml with static routes + all job slugs.
 * Sources (first match wins): Supabase REST → live-jobs.json
 *
 *   npm run build:sitemap
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "frontend/public/sitemap.xml");

const siteUrl = (process.env.ALERT_SITE_URL || process.env.VITE_SITE_URL || "https://govtjobs.me").replace(
  /\/$/,
  ""
);

const QUALIFICATION_SLUGS = [
  "10th", "12th", "8th", "iti", "diploma", "graduate", "btech", "bsc", "bcom", "mba",
  "postgraduate", "defence", "banking", "police", "medical", "teaching",
];

const PROFESSION_SLUGS = [
  "medical", "engineering", "law", "finance", "nursing", "pharmacy", "teaching",
  "iti-diploma", "any-degree", "dental", "aviation", "naval", "hotel-management",
  "sports-quota", "architecture", "agriculture", "arts",
];

const RESULT_TOPIC_SLUGS = [
  "admit-card", "answer-key", "cutoff", "syllabus", "previous-papers",
  "written-marks", "interview", "last-date",
];

const STATIC_PATHS = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/jobs", changefreq: "hourly", priority: "0.9" },
  { loc: "/jobs/latest-notifications", changefreq: "hourly", priority: "0.85" },
  { loc: "/jobs/all-india", changefreq: "daily", priority: "0.75" },
  { loc: "/qualifications", changefreq: "weekly", priority: "0.8" },
  { loc: "/professions", changefreq: "weekly", priority: "0.8" },
  { loc: "/organizations", changefreq: "weekly", priority: "0.8" },
  { loc: "/results", changefreq: "daily", priority: "0.8" },
  { loc: "/results/topics", changefreq: "weekly", priority: "0.75" },
  { loc: "/results/admit-card", changefreq: "daily", priority: "0.8" },
  { loc: "/alerts", changefreq: "weekly", priority: "0.7" },
  { loc: "/about", changefreq: "monthly", priority: "0.5" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  { loc: "/sitemap", changefreq: "monthly", priority: "0.4" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

const STATE_IDS = [
  "jk", "la", "hp", "pb", "hr", "dl", "uk", "rj", "up", "br", "sk", "wb", "as", "ne",
  "jh", "od", "mp", "cg", "gj", "mh", "ga", "tg", "ap", "ka", "kl", "tn", "py", "an",
];

const CATEGORY_IDS = [
  "upsc", "ssc", "railways", "banking", "police", "teaching", "defence", "psu", "health", "engineering", "state",
];

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function loadJobsFromJson() {
  const livePath = join(root, "frontend/public/data/live-jobs.json");
  if (!existsSync(livePath)) return [];
  const payload = JSON.parse(readFileSync(livePath, "utf8"));
  return Array.isArray(payload.items) ? payload.items : [];
}

async function loadJobsFromSupabase() {
  const fe = loadEnv(join(root, "frontend/.env.local"));
  const url = (fe.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anon = fe.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  };

  const jobs = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${url}/rest/v1/jobs?select=slug,updated_at,published_at&status=in.(live,expired)&order=published_at.desc&limit=${pageSize}&offset=${offset}`,
      { headers }
    );
    if (!res.ok) {
      console.warn(`Supabase sitemap fetch failed (${res.status}); falling back to live-jobs.json`);
      return null;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    jobs.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return jobs;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(loc, changefreq, priority, lastmod) {
  const lastmodTag = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : "";
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function toLastmod(job) {
  const raw = job.updated_at || job.published_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function main() {
  const orgIndexPath = join(root, "frontend/public/data/org-index.json");
  if (existsSync(join(root, "scripts/build-org-index.mjs"))) {
    await import("./build-org-index.mjs");
  }

  const supabaseJobs = await loadJobsFromSupabase();
  const jobs = supabaseJobs ?? loadJobsFromJson();

  const entries = [];

  for (const page of STATIC_PATHS) {
    entries.push(urlEntry(`${siteUrl}${page.loc}`, page.changefreq, page.priority));
  }

  for (const id of STATE_IDS) {
    entries.push(urlEntry(`${siteUrl}/state/${id}`, "daily", "0.7"));
  }

  for (const id of CATEGORY_IDS) {
    entries.push(urlEntry(`${siteUrl}/category/${id}`, "daily", "0.7"));
  }

  for (const slug of QUALIFICATION_SLUGS) {
    entries.push(urlEntry(`${siteUrl}/qualification/${slug}`, "weekly", "0.75"));
  }

  for (const slug of PROFESSION_SLUGS) {
    entries.push(urlEntry(`${siteUrl}/profession/${slug}`, "weekly", "0.75"));
  }

  for (const slug of RESULT_TOPIC_SLUGS) {
    if (slug === "admit-card") continue;
    entries.push(urlEntry(`${siteUrl}/results/${slug}`, "weekly", "0.75"));
  }

  if (existsSync(orgIndexPath)) {
    const orgIndex = JSON.parse(readFileSync(orgIndexPath, "utf8"));
    if (Array.isArray(orgIndex)) {
      for (const row of orgIndex) {
        if (row?.slug) {
          entries.push(urlEntry(`${siteUrl}/org/${row.slug}`, "weekly", "0.7"));
        }
      }
    }
  }

  const seen = new Set();
  for (const job of jobs) {
    const slug = job.slug || job.id;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    entries.push(
      urlEntry(
        `${siteUrl}/jobs/${encodeURIComponent(String(slug))}`,
        "weekly",
        "0.6",
        toLastmod(job)
      )
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  writeFileSync(outPath, xml, "utf8");
  console.log(`Wrote ${outPath} — ${entries.length} URLs (${seen.size} jobs, source: ${supabaseJobs ? "supabase" : "live-jobs.json"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
