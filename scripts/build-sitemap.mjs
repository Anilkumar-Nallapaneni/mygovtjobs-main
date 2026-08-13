#!/usr/bin/env node
/**
 * Generate sitemap indexes and topic-specific child sitemaps.
 * Sources (first match wins): Supabase REST → live-jobs.json
 *
 *   npm run build:sitemap
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "frontend/public");
const sitemapDir = join(publicDir, "sitemaps");
const indexPath = join(publicDir, "sitemap.xml");
const namedIndexPath = join(publicDir, "sitemap-index.xml");

const siteUrl = (process.env.ALERT_SITE_URL || process.env.VITE_SITE_URL || "https://www.livegovtjobs.com").replace(
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
  { loc: "/states", changefreq: "weekly", priority: "0.8" },
  { loc: "/boards", changefreq: "weekly", priority: "0.8" },
  { loc: "/categories", changefreq: "weekly", priority: "0.6" },
  { loc: "/explore", changefreq: "weekly", priority: "0.8" },
  { loc: "/exams", changefreq: "weekly", priority: "0.85" },
  { loc: "/exam-calendar", changefreq: "daily", priority: "0.8" },
  { loc: "/faq", changefreq: "monthly", priority: "0.7" },
  { loc: "/guide/how-to-apply", changefreq: "monthly", priority: "0.7" },
  { loc: "/guide/exam-preparation", changefreq: "monthly", priority: "0.7" },
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

function indiaDateIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isApprovedActiveJob(job, today = indiaDateIso()) {
  return (
    String(job?.status || "").toLowerCase() === "live" &&
    job?.published_to_site === true &&
    String(job?.document_type || "").toUpperCase() === "RECRUITMENT" &&
    ["VERIFIED", "PARTIALLY_VERIFIED"].includes(
      String(job?.verification_status || "").toUpperCase()
    ) &&
    Number(job?.completeness_score) >= 70 &&
    Number(job?.publication_confidence) >= 90 &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(job?.last_date || "")) &&
    String(job.last_date).slice(0, 10) >= today
  );
}

function isApprovedArchiveJob(job) {
  return (
    String(job?.status || "").toLowerCase() === "expired" &&
    job?.published_to_site === true &&
    String(job?.document_type || "").toUpperCase() === "RECRUITMENT" &&
    ["VERIFIED", "PARTIALLY_VERIFIED"].includes(
      String(job?.verification_status || "").toUpperCase()
    ) &&
    Number(job?.completeness_score) >= 70 &&
    Number(job?.publication_confidence) >= 90
  );
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
      `${url}/rest/v1/jobs?select=slug,updated_at,published_at,status,last_date,published_to_site,document_type,verification_status,completeness_score,publication_confidence&status=in.(live,expired)&published_to_site=eq.true&document_type=eq.RECRUITMENT&verification_status=in.(VERIFIED,PARTIALLY_VERIFIED)&completeness_score=gte.70&publication_confidence=gte.90&order=published_at.desc&limit=${pageSize}&offset=${offset}`,
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

function loadExamSlugs() {
  const examsPath = join(root, "frontend/src/data/exams.ts");
  if (!existsSync(examsPath)) return [];
  const text = readFileSync(examsPath, "utf8");
  const slugs = [];
  for (const match of text.matchAll(/slug:\s*'([^']+)'/g)) {
    slugs.push(match[1]);
  }
  return [...new Set(slugs)];
}

async function main() {
  const orgIndexPath = join(root, "frontend/public/data/org-index.json");
  if (existsSync(join(root, "scripts/build-org-index.mjs"))) {
    await import("./build-org-index.mjs");
  }

  const supabaseJobs = await loadJobsFromSupabase();
  const jobs = supabaseJobs ?? loadJobsFromJson();

  const staticPageEntries = [];
  const stateEntries = [];
  const qualificationEntries = [];
  const organizationEntries = [];
  const resultEntries = [];
  const admitCardEntries = [];
  const activeJobEntries = [];
  const archiveJobEntries = [];

  for (const page of STATIC_PATHS) {
    const entry = urlEntry(`${siteUrl}${page.loc}`, page.changefreq, page.priority);
    if (page.loc === "/states") stateEntries.push(entry);
    else if (page.loc === "/qualifications") qualificationEntries.push(entry);
    else if (page.loc === "/organizations") organizationEntries.push(entry);
    else if (page.loc === "/results/admit-card") admitCardEntries.push(entry);
    else if (page.loc === "/results" || page.loc === "/results/topics") resultEntries.push(entry);
    else staticPageEntries.push(entry);
  }

  for (const id of STATE_IDS) {
    stateEntries.push(urlEntry(`${siteUrl}/state/${id}`, "daily", "0.7"));
  }

  for (const id of CATEGORY_IDS) {
    staticPageEntries.push(urlEntry(`${siteUrl}/board/${id}`, "daily", "0.7"));
  }

  for (const slug of QUALIFICATION_SLUGS) {
    qualificationEntries.push(urlEntry(`${siteUrl}/qualification/${slug}`, "weekly", "0.75"));
  }

  for (const slug of PROFESSION_SLUGS) {
    staticPageEntries.push(urlEntry(`${siteUrl}/profession/${slug}`, "weekly", "0.75"));
  }

  for (const slug of RESULT_TOPIC_SLUGS) {
    if (slug === "admit-card") continue;
    resultEntries.push(urlEntry(`${siteUrl}/results/${slug}`, "weekly", "0.75"));
  }

  for (const slug of loadExamSlugs()) {
    staticPageEntries.push(urlEntry(`${siteUrl}/exam/${slug}`, "weekly", "0.8"));
  }

  if (existsSync(orgIndexPath)) {
    const orgIndex = JSON.parse(readFileSync(orgIndexPath, "utf8"));
    if (Array.isArray(orgIndex)) {
      for (const row of orgIndex) {
        if (row?.slug) {
          organizationEntries.push(urlEntry(`${siteUrl}/org/${row.slug}`, "weekly", "0.7"));
        }
      }
    }
  }

  const seen = new Set();
  const todayIndia = indiaDateIso();
  for (const job of jobs) {
    const slug = job.slug || job.id;
    if (!slug || seen.has(slug)) continue;
    const active = isApprovedActiveJob(job, todayIndia);
    const archive = isApprovedArchiveJob(job);
    if (!active && !archive) continue;
    seen.add(slug);
    const target = active ? activeJobEntries : archiveJobEntries;
    target.push(
      urlEntry(
        `${siteUrl}/jobs/${encodeURIComponent(String(slug))}`,
        active ? "daily" : "monthly",
        active ? "0.7" : "0.4",
        toLastmod(job)
      )
    );
  }

  mkdirSync(sitemapDir, { recursive: true });

  const groups = new Map([
    ["static-pages.xml", staticPageEntries],
    ["states.xml", stateEntries],
    ["qualifications.xml", qualificationEntries],
    ["organizations.xml", organizationEntries],
    ["results.xml", resultEntries],
    ["admit-cards.xml", admitCardEntries],
    ["jobs-active.xml", activeJobEntries],
    ["jobs-archive.xml", archiveJobEntries],
  ]);

  for (const name of readdirSync(sitemapDir)) {
    if (name === "static.xml" || /^jobs-\d+\.xml$/.test(name)) {
      unlinkSync(join(sitemapDir, name));
    }
  }

  for (const [name, entries] of groups) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
    writeFileSync(join(sitemapDir, name), xml, "utf8");
  }

  const indexEntries = [...groups.keys()].map(
    (name) => `  <sitemap>\n    <loc>${xmlEscape(`${siteUrl}/sitemaps/${name}`)}</loc>\n  </sitemap>`
  );
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexEntries.join("\n")}\n</sitemapindex>\n`;
  writeFileSync(indexPath, indexXml, "utf8");
  writeFileSync(namedIndexPath, indexXml, "utf8");

  console.log(
    `Wrote ${indexPath} — ${groups.size} child sitemaps, ${activeJobEntries.length} active jobs, ${archiveJobEntries.length} archive jobs`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
