#!/usr/bin/env node
/**
 * Post-build: SEO HTML for /jobs/:slug (JSON-LD + meta inside the Vite SPA shell).
 * Writes frontend/dist/jobs/{slug}.html — served at /jobs/{slug} when cleanUrls is on.
 * Missing slugs fall through to SPA rewrite (fetch-by-slug still works).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "frontend/dist");
const distIndex = join(dist, "index.html");
const siteUrl = (process.env.ALERT_SITE_URL || process.env.VITE_SITE_URL || "https://www.livegovtjobs.com").replace(
  /\/$/,
  ""
);
const MAX_PAGES = Number(process.env.PRERENDER_JOB_LIMIT || 5000);
const NATIONWIDE_RE = /^(all[\s-]?india|india|nationwide|pan[\s-]?india)$/i;

/** Keep in sync with frontend/src/data/states.ts (id → display name). */
const STATE_NAMES = {
  jk: "Jammu & Kashmir",
  la: "Ladakh",
  hp: "Himachal Pradesh",
  pb: "Punjab",
  hr: "Haryana",
  dl: "Delhi",
  ch: "Chandigarh",
  uk: "Uttarakhand",
  rj: "Rajasthan",
  up: "Uttar Pradesh",
  br: "Bihar",
  sk: "Sikkim",
  wb: "West Bengal",
  as: "Assam",
  ar: "Arunachal Pradesh",
  nl: "Nagaland",
  mn: "Manipur",
  mz: "Mizoram",
  tr: "Tripura",
  ml: "Meghalaya",
  ne: "NE States",
  jh: "Jharkhand",
  od: "Odisha",
  mp: "Madhya Pradesh",
  cg: "Chhattisgarh",
  gj: "Gujarat",
  dd: "Dadra & Nagar Haveli and Daman & Diu",
  mh: "Maharashtra",
  ga: "Goa",
  tg: "Telangana",
  ap: "Andhra Pradesh",
  ka: "Karnataka",
  kl: "Kerala",
  ld: "Lakshadweep",
  tn: "Tamil Nadu",
  py: "Puducherry",
  an: "Andaman & Nicobar",
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Always emit addressLocality — Google Search Console flags when missing. */
function resolveJobPostalAddress(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  const explicitLocality = String(
    job.city || job.location || job.district || detail.city || detail.location || detail.district || ""
  ).trim();

  const fromStateField = String(job.state || "").trim();
  const codes = Array.isArray(job.state_codes) ? job.state_codes : [];
  const fromCodes = codes
    .map((id) => STATE_NAMES[String(id).toLowerCase()])
    .filter(Boolean);

  const regionCandidate =
    (fromStateField && !NATIONWIDE_RE.test(fromStateField) ? fromStateField : "") ||
    fromCodes[0] ||
    "";

  const isNationwide = !regionCandidate || NATIONWIDE_RE.test(fromStateField);
  const addressRegion = isNationwide ? "India" : regionCandidate;
  const addressLocality =
    explicitLocality ||
    (isNationwide ? "India" : regionCandidate.split(",")[0]?.trim() || addressRegion);

  return {
    addressLocality,
    addressRegion,
    addressCountry: "IN",
  };
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

function buildJobPostingJsonLd(job, canonical) {
  const address = resolveJobPostalAddress(job);
  const slug = job.slug || job.id;
  const orgName = job.dept || "Government of India recruitment";
  const applyUrl = String(job.apply_url || job.applyUrl || "").trim();
  const hiringOrganization = {
    "@type": "Organization",
    name: orgName,
  };
  if (applyUrl && applyUrl !== "#" && /^https?:\/\//i.test(applyUrl)) {
    hiringOrganization.sameAs = applyUrl;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted: resolveDatePosted(job),
    hiringOrganization,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: address.addressLocality,
        addressRegion: address.addressRegion,
        addressCountry: address.addressCountry,
      },
    },
    employmentType: "FULL_TIME",
    industry: "Government",
    url: canonical,
    identifier: {
      "@type": "PropertyValue",
      name: "Live Govt Jobs",
      value: String(job.id || slug),
    },
  };
  const lastDate = job.last_date || job.lastDate;
  if (lastDate) jsonLd.validThrough = String(lastDate).slice(0, 10);
  const dateModified = parseIsoDate(job.updatedDate ?? job.updated_at);
  if (dateModified) jsonLd.dateModified = dateModified;
  if (Number(job.vacancies) > 0) jsonLd.totalJobOpenings = Number(job.vacancies);
  const qual = String(job.qualification || job.qual || "").trim();
  if (qual && qual !== "—" && qual.toLowerCase() !== "see notification") {
    jsonLd.educationRequirements = qual;
  }
  return jsonLd;
}

function replaceMeta(html, key, value, attrName = "name") {
  const re = new RegExp(
    `<meta ${attrName}="${key}" content="[^"]*"\\s*/?>`,
    "i"
  );
  const tag = `<meta ${attrName}="${key}" content="${value}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n  </head>`);
}

/** Clone Vite SPA shell and inject job SEO + JobPosting JSON-LD (no redirect loop). */
function buildHtml(job, spaHtml) {
  const slug = job.slug || job.id;
  const title = escapeHtml(job.title || "Government recruitment");
  const desc = escapeHtml(jobDescription(job));
  const canonical = `${siteUrl}/jobs/${encodeURIComponent(slug)}`;
  const ogImage = `${siteUrl}/api/og?title=${encodeURIComponent(job.title || "Govt Job")}`;
  const jsonLd = buildJobPostingJsonLd(job, canonical);

  let html = spaHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title} | Live Govt Jobs</title>`);
  html = replaceMeta(html, "description", desc, "name");
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
  );
  html = replaceMeta(html, "og:type", "article", "property");
  html = replaceMeta(html, "og:title", `${title} | Live Govt Jobs`, "property");
  html = replaceMeta(html, "og:description", desc, "property");
  html = replaceMeta(html, "og:url", canonical, "property");
  html = replaceMeta(html, "og:image", ogImage, "property");
  html = replaceMeta(html, "twitter:title", title, "name");
  html = replaceMeta(html, "twitter:description", desc, "name");
  html = replaceMeta(html, "twitter:image", ogImage, "name");

  const jsonLdTag = `<script type="application/ld+json" id="job-posting-jsonld">${JSON.stringify(jsonLd)}</script>`;
  if (html.includes('id="job-posting-jsonld"')) {
    html = html.replace(
      /<script type="application\/ld\+json" id="job-posting-jsonld">[\s\S]*?<\/script>/i,
      jsonLdTag
    );
  } else {
    html = html.replace("</head>", `  ${jsonLdTag}\n  </head>`);
  }

  return html;
}

function main() {
  if (!existsSync(distIndex)) {
    console.error("frontend/dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const spaHtml = readFileSync(distIndex, "utf8");
  const jobsDir = join(dist, "jobs");
  mkdirSync(jobsDir, { recursive: true });

  const jobs = loadJobs().filter((j) => j.slug || j.id).slice(0, MAX_PAGES);
  let written = 0;
  let withLocality = 0;
  for (const job of jobs) {
    const slug = String(job.slug || job.id);
    // Skip reserved SPA browse routes under /jobs/*
    if (slug === "latest-notifications" || slug === "all-india") continue;

    const html = buildHtml(job, spaHtml);
    writeFileSync(join(jobsDir, `${slug}.html`), html, "utf8");
    written += 1;
    if (html.includes("addressLocality")) withLocality += 1;
  }
  console.log(
    `Prerendered ${written} job pages under frontend/dist/jobs/*.html (${withLocality} with addressLocality)`
  );
}

main();
