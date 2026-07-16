#!/usr/bin/env node
/**
 * Post-build: static HTML shells for /jobs/:slug (SEO + social crawlers).
 * Run automatically after `npm run build` or: node scripts/prerender-job-pages.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "frontend/dist");
const siteUrl = (process.env.ALERT_SITE_URL || process.env.VITE_SITE_URL || "https://www.livegovtjobs.com").replace(
  /\/$/,
  ""
);
const MAX_PAGES = Number(process.env.PRERENDER_JOB_LIMIT || 5000);

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadJobs() {
  const livePath = join(root, "frontend/public/data/live-jobs.json");
  if (!existsSync(livePath)) return [];
  const payload = JSON.parse(readFileSync(livePath, "utf8"));
  return Array.isArray(payload.items) ? payload.items : [];
}

function jobDescription(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  const summary = String(detail.summary || job.about || "").replace(/\s+/g, " ").trim();
  if (summary.length > 155) return `${summary.slice(0, 152)}…`;
  if (summary) return summary;
  return [job.title, job.dept, job.qualification].filter(Boolean).join(" — ");
}

function parseIsoDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Google JobPosting requires datePosted — never omit it. */
function resolveDatePosted(job) {
  return (
    parseIsoDate(job.published_at) ||
    parseIsoDate(job.publishedDate) ||
    parseIsoDate(job.updatedDate) ||
    parseIsoDate(job.updated_at) ||
    parseIsoDate(job.created_at) ||
    parseIsoDate(job.createdAt) ||
    new Date().toISOString().slice(0, 10)
  );
}

function buildHtml(job) {
  const slug = job.slug || job.id;
  const title = escapeHtml(job.title || "Government recruitment");
  const desc = escapeHtml(jobDescription(job));
  const canonical = `${siteUrl}/jobs/${encodeURIComponent(slug)}`;
  const ogImage = `${siteUrl}/api/og?title=${encodeURIComponent(job.title || "Govt Job")}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted: resolveDatePosted(job),
    hiringOrganization: {
      "@type": "Organization",
      name: job.dept || "Government of India recruitment",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
        addressRegion: String(job.state || "India"),
      },
    },
    employmentType: "FULL_TIME",
    industry: "Government",
    url: canonical,
  };
  const lastDate = job.last_date || job.lastDate;
  if (lastDate) jsonLd.validThrough = String(lastDate).slice(0, 10);
  const dateModified = parseIsoDate(job.updatedDate ?? job.updated_at);
  if (dateModified) jsonLd.dateModified = dateModified;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Live Govt Jobs</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Live Govt Jobs" />
  <meta property="og:title" content="${title} | Live Govt Jobs" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogImage}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <meta http-equiv="refresh" content="0;url=${canonical}" />
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${desc}</p>
    <p><a href="${canonical}">View full notification on Live Govt Jobs</a></p>
  </main>
  <script>location.replace(${JSON.stringify(canonical)});</script>
</body>
</html>`;
}

function main() {
  if (!existsSync(dist)) {
    console.error("frontend/dist not found — run npm run build first");
    process.exit(1);
  }

  const jobs = loadJobs().filter((j) => j.slug || j.id).slice(0, MAX_PAGES);
  let written = 0;
  for (const job of jobs) {
    const slug = String(job.slug || job.id);
    const dir = join(dist, "jobs", slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), buildHtml(job), "utf8");
    written += 1;
  }
  console.log(`Prerendered ${written} job pages under frontend/dist/jobs/*/index.html`);
}

main();
