#!/usr/bin/env node
/**
 * Generate /rss.xml from frontend/public/data/live-jobs.json.
 * Publishes the latest 50 jobs sorted by publishedDate (fallback: updatedDate).
 *
 *   npm run build:rss
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livePath = join(root, "frontend/public/data/live-jobs.json");
const outPath = join(root, "frontend/public/rss.xml");

const SITE_URL = (
  process.env.ALERT_SITE_URL || process.env.VITE_SITE_URL || "https://www.livegovtjobs.com"
).replace(/\/$/, "");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function jobUrl(job) {
  const slug = job.slug || job.id;
  return slug ? `${SITE_URL}/jobs/${encodeURIComponent(slug)}` : SITE_URL;
}

function jobDescription(job) {
  const parts = [];
  if (job.dept) parts.push(job.dept);
  if (job.vacancies) parts.push(`${job.vacancies} vacancies`);
  if (job.qual) parts.push(job.qual);
  if (job.lastDate || job.last_date) parts.push(`Last date: ${job.lastDate || job.last_date}`);
  if (job.about) parts.push(String(job.about).slice(0, 300));
  return parts.filter(Boolean).join(" · ");
}

function main() {
  if (!existsSync(livePath)) {
    console.error("[rss] live-jobs.json not found");
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(livePath, "utf8"));
  const items = Array.isArray(payload.items) ? payload.items : [];
  const sorted = items
    .slice()
    .sort((a, b) => {
      const at = new Date(a.publishedDate || a.published_at || a.updatedDate || a.updated_at || 0).getTime();
      const bt = new Date(b.publishedDate || b.published_at || b.updatedDate || b.updated_at || 0).getTime();
      return bt - at;
    })
    .slice(0, 50);

  const rssItems = sorted
    .map((job) => {
      const link = jobUrl(job);
      const title = escapeXml(job.title || "Government recruitment");
      const description = escapeXml(jobDescription(job));
      const pubDate = toRfc822(job.publishedDate || job.published_at || job.updatedDate || job.updated_at);
      const guid = escapeXml(link);
      const category = escapeXml(job.category || "govt-job");
      return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <description>${description}</description>
      <category>${category}</category>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${guid}</guid>
    </item>`;
    })
    .join("\n");

  const lastBuild = toRfc822(new Date().toISOString());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Live Govt Jobs — Latest Notifications</title>
    <link>${SITE_URL}</link>
    <description>Latest official Indian government job notifications, results, admit cards and answer keys.</description>
    <language>en-IN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`;

  writeFileSync(outPath, xml, "utf8");
  console.log(`[rss] wrote ${sorted.length} items → ${outPath}`);
}

main();
