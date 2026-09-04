#!/usr/bin/env node
/**
 * Post-build: SEO HTML for /jobs/:slug plus static/legal pages and 404.html.
 * Job pages inject a visible #seo-job island (H1 + facts) for crawlers / no-JS.
 * Legal routes get unique title/canonical/body — never homepage clones.
 * Unknown paths are left to Vercel 404.html (no SPA catch-all rewrite).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { jobSeoDescription } from "../shared/scrub-seo-text.mjs";
import { STATIC_PAGES, NOT_FOUND_PAGE, SPA_SHELL_ROUTES } from "./lib/static-page-content.mjs";
import {
  buildSeoHubIsland,
  flattenArchiveItems,
  flattenEventsMatching,
  flattenJobItems,
  flattenOrgItems,
  flattenRecruitmentEvents,
  matchesOrgSlug,
  textMatchesBoard,
} from "./lib/prerender-hub-islands.mjs";

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

function loadArchiveJobs() {
  const payload = loadJson(join(root, "frontend/public/data/jobs-archive.json"), { items: [] });
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items
    .filter((job) => job && (job.slug || job.id))
    .map((job) => ({ ...job, status: "expired" }));
}

function mergeJobsForPrerender(liveJobs, archiveJobs) {
  const seen = new Set(
    liveJobs.map((job) => String(job.slug || job.id || "")).filter(Boolean)
  );
  const extras = archiveJobs.filter((job) => {
    const slug = String(job.slug || job.id || "");
    return slug && !seen.has(slug);
  });
  return [...liveJobs, ...extras];
}

function jobDescription(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  return jobSeoDescription({
    summary: detail.summary,
    about: job.about,
    title: job.title,
    dept: job.dept,
    qualification: job.qualification || job.qual,
  });
}

function restoreBlockingCss(html) {
  let next = String(html);
  next = next.replace(
    /<link([^>]*rel="stylesheet"[^>]*)\s+media="print"\s+onload="this.media='all'"\s*\/>/gi,
    "<link$1 />"
  );
  next = next.replace(/\s*<noscript><link rel="stylesheet" href="[^"]+" \/><\/noscript>/gi, "");
  return next;
}

function stripLcpShell(html) {
  return String(html).replace(/<div id="lcp-shell"[\s\S]*?<\/div>\s*(?=<div id="root")/i, "");
}

function applyRouteHead(html, { title, description, canonical, noindex = false, ogType = "website" }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  let next = html;
  next = next.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
  next = replaceMeta(next, "description", safeDesc, "name");
  if (/<link rel="canonical" href="[^"]*"\s*\/?>/i.test(next)) {
    next = next.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
  } else {
    next = next.replace("</head>", `  <link rel="canonical" href="${canonical}" />\n  </head>`);
  }
  next = replaceMeta(next, "og:type", ogType, "property");
  next = replaceMeta(next, "og:title", safeTitle, "property");
  next = replaceMeta(next, "og:description", safeDesc, "property");
  next = replaceMeta(next, "og:url", canonical, "property");
  next = replaceMeta(next, "twitter:title", safeTitle, "name");
  next = replaceMeta(next, "twitter:description", safeDesc, "name");
  if (noindex) {
    next = replaceMeta(next, "robots", "noindex, nofollow", "name");
  }
  return next;
}

function injectIsland(html, islandHtml) {
  if (html.includes('id="root"')) {
    return html.replace(/<div id="root"><\/div>/i, `${islandHtml}\n    <div id="root"></div>`);
  }
  return html.replace("<body>", `<body>\n    ${islandHtml}`);
}

function formatDisplayDate(value) {
  const raw = String(value ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return raw && raw !== "—" ? escapeHtml(raw) : "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

function buildSeoJobIsland(job) {
  const title = escapeHtml(job.title || "Government recruitment");
  const dept = escapeHtml(job.dept || "");
  const vacancies = Number(job.vacancies);
  const vacLabel =
    Number.isFinite(vacancies) && vacancies > 0 ? `${vacancies.toLocaleString("en-IN")} vacancies` : "";
  const last = formatDisplayDate(job.last_date || job.lastDate);
  const applyUrl = String(job.apply_url || job.applyUrl || "").trim();
  const applyHref =
    applyUrl && applyUrl !== "#" && /^https?:\/\//i.test(applyUrl) ? escapeHtml(applyUrl) : "";
  const summary = escapeHtml(
    jobSeoDescription({
      summary: job.detail && typeof job.detail === "object" ? job.detail.summary : "",
      about: job.about,
      title: job.title,
      dept: job.dept,
      qualification: job.qualification || job.qual,
      maxLen: 320,
    })
  );
  const facts = [dept, vacLabel, last ? `Last date: ${last}` : ""].filter(Boolean);
  return `<article id="seo-job" class="seo-job-island">
  <h1>${title}</h1>
  ${facts.length ? `<p class="seo-job-island__facts">${facts.join(" · ")}</p>` : ""}
  ${summary ? `<p class="seo-job-island__summary">${summary}</p>` : ""}
  ${applyHref ? `<p><a href="${applyHref}" rel="noopener noreferrer">Apply on official website</a></p>` : ""}
</article>`;
}

function buildSeoStaticIsland(page) {
  const sections = (page.sections || [])
    .map((section) => {
      const paras = (section.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n    ");
      return `<section>
    <h2>${escapeHtml(section.heading)}</h2>
    ${paras}
  </section>`;
    })
    .join("\n  ");
  return `<article id="seo-static" class="seo-static-island">
  <h1>${escapeHtml(page.title)}</h1>
  <p class="seo-static-island__lede">${escapeHtml(page.description)}</p>
  ${sections}
</article>`;
}

function buildSeo404Island() {
  return `<article id="seo-404" class="seo-static-island">
  <p class="seo-static-island__code" aria-hidden="true">404</p>
  <h1>${escapeHtml(NOT_FOUND_PAGE.title)}</h1>
  <p class="seo-static-island__lede">${escapeHtml(NOT_FOUND_PAGE.description)}</p>
  <p><a href="/">Home</a> · <a href="/jobs/latest-notifications">Latest</a> · <a href="/explore">Explore</a></p>
</article>`;
}

/** First-paint + crawler body for Latest so hard reload is not a blank #root. */
function buildSeoLatestIsland(jobs) {
  const rows = (jobs || [])
    .slice(0, 8)
    .map((job) => {
      const title = escapeHtml(job.title || "Government recruitment");
      const dept = escapeHtml(job.dept || "");
      const last = formatDisplayDate(job.last_date || job.lastDate);
      const slug = encodeURIComponent(String(job.slug || job.id || ""));
      return `<tr><td>${dept}</td><td><a href="/jobs/${slug}">${title}</a></td><td>${last || "—"}</td></tr>`;
    })
    .join("\n    ");
  return `<article id="seo-static" class="seo-static-island">
  <h1>Latest Government Job Notifications</h1>
  <p class="seo-static-island__lede">Official recruitment notifications from verified .gov.in sources — board, post, vacancies, and last date.</p>
  ${
    rows
      ? `<table class="seo-latest-table">
    <thead><tr><th>Board</th><th>Post</th><th>Last date</th></tr></thead>
    <tbody>
    ${rows}
    </tbody>
  </table>`
      : ""
  }
</article>`;
}

function parseIsoDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function indiaDateIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
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

function resolveValidThrough(job, datePosted) {
  const fromLast = parseIsoDate(job.last_date || job.lastDate);
  if (fromLast) return `${fromLast}T23:59:59+05:30`;
  const base = new Date(`${datePosted}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + 180);
    return `${fallback.toISOString().slice(0, 10)}T23:59:59+05:30`;
  }
  base.setUTCDate(base.getUTCDate() + 180);
  return `${base.toISOString().slice(0, 10)}T23:59:59+05:30`;
}

function parseMoneyToken(raw) {
  const cleaned = String(raw).replace(/,/g, "").replace(/\s+/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 100 || n > 10_000_000) return undefined;
  return Math.round(n);
}

function parseJobBaseSalary(salary) {
  const raw = String(salary ?? "").replace(/\s+/g, " ").trim();
  if (!raw || raw === "—" || raw.length > 160) return null;
  if (/not specified|see (official|notification)/i.test(raw) && !/(?:rs\.?|inr|₹)\s*[\d,]/i.test(raw)) {
    return null;
  }
  const unitText = /\b(per\s*month|p\.?\s*m\.?|monthly|\/\s*month)\b/i.test(raw)
    ? "MONTH"
    : /\b(per\s*annum|per\s*year|p\.?\s*a\.?|yearly|annually|\/\s*year)\b/i.test(raw)
      ? "YEAR"
      : "MONTH";
  const range = raw.match(
    /(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)/i
  );
  if (range) {
    const minValue = parseMoneyToken(range[1]);
    const maxValue = parseMoneyToken(range[2]);
    if (minValue && maxValue && maxValue >= minValue) {
      return {
        "@type": "MonetaryAmount",
        currency: "INR",
        value: { "@type": "QuantitativeValue", minValue, maxValue, unitText },
      };
    }
  }
  const single = raw.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i) || raw.match(/^([\d,]+(?:\.\d+)?)$/);
  if (single) {
    const value = parseMoneyToken(single[1]);
    if (value) {
      return {
        "@type": "MonetaryAmount",
        currency: "INR",
        value: { "@type": "QuantitativeValue", value, unitText },
      };
    }
  }
  return null;
}

const GOOGLE_CREDENTIAL_CATEGORIES = [
  "high school",
  "associate degree",
  "bachelor degree",
  "professional certificate",
  "postgraduate degree",
];

/** Map Indian qual text → Google credentialCategory (or omit). */
function mapEducationRequirements(qualification) {
  const raw = String(qualification ?? "").replace(/\s+/g, " ").trim();
  if (!raw || raw === "—" || /^see\b/i.test(raw)) return null;
  const lower = raw.toLowerCase();
  if (
    /\b(no (educational )?requirement|not required|any (person|candidate)|8th\s*pass|literate only)\b/i.test(
      lower
    )
  ) {
    return "no requirements";
  }
  const categories = new Set();
  const isPostgrad =
    /\b(ph\.?\s*d|doctorate|post[\s-]?grad(?:uate)?|p\.?\s*g\.?\b|masters?|m\.?\s*a\.?\b|m\.?\s*sc|m\.?\s*com|m\.?\s*tech|m\.?\s*e\.?\b|mba|llm|md\b)\b/i.test(
      lower
    );
  const isBachelor =
    /\b(bachelor|b\.?\s*a\.?\b|b\.?\s*sc|b\.?\s*com|b\.?\s*tech|b\.?\s*e\.?\b|b\.?\s*pharm|llb|mbbs|ug\b)\b/i.test(
      lower
    ) ||
    (/\b(graduate|graduation|degree)\b/i.test(lower) && !isPostgrad);
  if (isPostgrad) categories.add("postgraduate degree");
  if (isBachelor) categories.add("bachelor degree");
  if (/\b(diploma|polytechnic|iti|certificate|ncvt|apprentice)\b/i.test(lower)) {
    categories.add("professional certificate");
  }
  if (/\b(associate)\b/i.test(lower)) categories.add("associate degree");
  if (
    /\b(10th|12th|matric|hsc|ssc|intermediate|\+2|senior secondary|higher secondary|class\s*(?:10|12)|xth|xiith)\b/i.test(
      lower
    )
  ) {
    categories.add("high school");
  }
  if (categories.size === 0) return null;
  const ordered = GOOGLE_CREDENTIAL_CATEGORIES.filter((c) => categories.has(c));
  const credentials = ordered.map((credentialCategory) => ({
    "@type": "EducationalOccupationalCredential",
    credentialCategory,
  }));
  return credentials.length === 1 ? credentials[0] : credentials;
}

function isRecruitmentJobPosting(job) {
  const title = String(job.title || "").toLowerCase();
  const slug = String(job.slug || "").toLowerCase();
  const blob = `${title} ${slug}`;
  if (
    /\b(exam\s*schedule|tentative\s*exam|admit\s*card|hall\s*ticket|merit\s*list|cutoff|cut[\s-]?off|result\s*notice|answer\s*key|circular\s*order|corrigendum|hackathon|teams?\s*selected|seating\s*plan|press\s*(?:note|release)|shortlist(?:ing|ed)?\s*for\s*medical|provisionally\s*(?:in-?)?eligible|travel\s*allowance\s*form)\b/i.test(
      blob
    )
  ) {
    return false;
  }
  if (Number(job.vacancies) > 0) return true;
  return /\b(recruit(?:ment|ing)?|vacanc(?:y|ies)|apply\s*(?:online|offline)|walk[\s-]?in|notification\s*for\s*(?:the\s*)?post|posts?\s+of|engagement\s+of|hiring)\b/i.test(
    blob
  );
}

function isApprovedActiveJobPosting(job, today = indiaDateIso()) {
  const lastDate = parseIsoDate(job.last_date || job.lastDate);
  return (
    String(job.status || "").toLowerCase() === "live" &&
    job.published_to_site === true &&
    String(job.document_type || "").toUpperCase() === "RECRUITMENT" &&
    ["VERIFIED", "PARTIALLY_VERIFIED"].includes(
      String(job.verification_status || "").toUpperCase()
    ) &&
    Number(job.completeness_score) >= 70 &&
    Number(job.publication_confidence) >= 90 &&
    Boolean(lastDate && lastDate >= today) &&
    isRecruitmentJobPosting(job)
  );
}

function buildJobPostingJsonLd(job, canonical) {
  if (!isApprovedActiveJobPosting(job)) return null;
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

  const datePosted = resolveDatePosted(job);
  const postalAddress = {
    "@type": "PostalAddress",
    addressLocality: address.addressLocality,
    addressRegion: address.addressRegion,
    addressCountry: address.addressCountry,
  };
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  const street = String(
    job.streetAddress ||
      job.street_address ||
      detail.streetAddress ||
      detail.street_address ||
      detail.office_address ||
      detail.address ||
      detail.hq_address ||
      ""
  ).trim();
  let pin = String(
    job.postalCode || job.postal_code || job.pincode || detail.postalCode || detail.pincode || detail.pin || ""
  ).trim();
  if (!/^\d{6}$/.test(pin)) {
    const pinMatch = `${street} ${pin}`.match(/\b(\d{6})\b/);
    if (pinMatch) pin = pinMatch[1];
  }
  const hasStreetHint =
    /\b(road|rd\.?|street|st\.?|lane|marg|nagar|complex|bhawan|bhavan|sector|plot|floor|building|office|hq|headquarters|block|hill)\b/i.test(
      street
    );
  const looksLikeStreet =
    street.length >= 8 &&
    street.length <= 200 &&
    !/^(all[\s-]?india|india|nationwide|pan[\s-]?india)$/i.test(street) &&
    (!/^[A-Za-z\s]+$/.test(street) || hasStreetHint);
  if (street && (looksLikeStreet || hasStreetHint) && street.length >= 5) {
    postalAddress.streetAddress = street.replace(/\b\d{6}\b/, "").replace(/[,\s]+$/g, "").trim() || street;
  }
  if (/^\d{6}$/.test(pin)) postalAddress.postalCode = pin;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted,
    validThrough: resolveValidThrough(job, datePosted),
    hiringOrganization,
    jobLocation: {
      "@type": "Place",
      address: postalAddress,
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
  const dateModified = parseIsoDate(job.updatedDate ?? job.updated_at);
  if (dateModified) jsonLd.dateModified = dateModified;
  if (Number(job.vacancies) > 0) jsonLd.totalJobOpenings = Number(job.vacancies);
  const baseSalary = parseJobBaseSalary(job.salary);
  if (baseSalary) jsonLd.baseSalary = baseSalary;
  const education = mapEducationRequirements(job.qualification || job.qual);
  if (education) jsonLd.educationRequirements = education;
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

function prepareNonHomeShell(spaHtml) {
  return restoreBlockingCss(stripLcpShell(spaHtml));
}

/** Clone Vite SPA shell and inject job SEO + JobPosting JSON-LD + visible body island. */
function buildHtml(job, spaHtml) {
  const slug = job.slug || job.id;
  const title = `${job.title || "Government recruitment"} | Live Govt Jobs`;
  const desc = jobDescription(job);
  const canonical = `${siteUrl}/jobs/${encodeURIComponent(slug)}`;
  const ogImage = `${siteUrl}/api/og?title=${encodeURIComponent(job.title || "Govt Job")}`;
  const jsonLd = buildJobPostingJsonLd(job, canonical);

  let html = prepareNonHomeShell(spaHtml);
  html = applyRouteHead(html, { title, description: desc, canonical, ogType: "article" });
  html = replaceMeta(html, "og:image", ogImage, "property");
  html = replaceMeta(html, "twitter:image", ogImage, "name");

  if (jsonLd) {
    const jsonLdTag = `<script type="application/ld+json" id="job-posting-jsonld">${JSON.stringify(jsonLd)}</script>`;
    if (html.includes('id="job-posting-jsonld"')) {
      html = html.replace(
        /<script type="application\/ld\+json" id="job-posting-jsonld">[\s\S]*?<\/script>/i,
        jsonLdTag
      );
    } else {
      html = html.replace("</head>", `  ${jsonLdTag}\n  </head>`);
    }
  } else if (html.includes('id="job-posting-jsonld"')) {
    html = html.replace(
      /<script type="application\/ld\+json" id="job-posting-jsonld">[\s\S]*?<\/script>\s*/i,
      ""
    );
  }

  html = injectIsland(html, buildSeoJobIsland(job));
  return html;
}

function writeHtml(dest, html) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html, "utf8");
}

function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function jobMatchesState(job, stateId, stateName) {
  const codes = Array.isArray(job.state_codes) ? job.state_codes.map((c) => String(c).toLowerCase()) : [];
  if (codes.includes(stateId)) return true;
  const state = String(job.state || "").toLowerCase();
  return Boolean(stateName && state.includes(String(stateName).toLowerCase()));
}

function hubIslandForRoute(route, { jobs, events, archives, seoBodies, orgs }) {
  const path = route.path;
  if (path === "/organizations") {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenOrgItems(orgs),
      empty: "No organisation hubs in the current snapshot.",
    });
  }
  if (path === "/sarkari-naukri" || path === "/government-jobs") {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      body: "Sarkari naukri means official government recruitment. Each listing links to the recruiting organisation’s website or PDF.",
      items: flattenJobItems(jobs),
    });
  }
  if (path === "/results") {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenRecruitmentEvents(events, "result"),
      empty: "No result updates in the current snapshot.",
    });
  }
  if (path === "/results/admit-card" || path === "/admit-cards") {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenRecruitmentEvents(events, "admit_card"),
      empty: "No admit-card updates in the current snapshot.",
    });
  }
  if (path === "/results/answer-key" || path === "/answer-keys") {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenRecruitmentEvents(events, "answer_key"),
      empty: "No answer-key updates in the current snapshot.",
    });
  }
  const topicFile = {
    "/results/cutoff": "cutoff",
    "/results/syllabus": "syllabus",
    "/results/previous-papers": "previous-papers",
    "/results/written-marks": "written-marks",
    "/results/interview": "interview",
    "/results/last-date": "last-date",
  }[path];
  if (topicFile) {
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenArchiveItems(archives[topicFile]),
      empty: "No official archive items for this topic in the current snapshot.",
    });
  }
  const stateMatch = /^\/state\/([^/]+)$/.exec(path);
  if (stateMatch) {
    const id = stateMatch[1];
    const name = STATE_NAMES[id] || id;
    const matched = jobs.filter((job) => jobMatchesState(job, id, name));
    const nameNeedle = String(name).toLowerCase();
    const eventItems = flattenEventsMatching(events, (hay) => {
      const t = hay.toLowerCase();
      if (id === "up") return /uttar pradesh|\buppsc\b/.test(t) && !/uttarakhand/.test(t);
      if (id === "uk") return /uttarakhand|\bukpsc\b/.test(t);
      return t.includes(nameNeedle);
    });
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      body: seoBodies.states[id] || "",
      items: [...flattenJobItems(matched), ...eventItems].slice(0, 16),
    });
  }
  const boardMatch = /^\/(?:board|category)\/([^/]+)$/.exec(path);
  if (boardMatch) {
    const id = boardMatch[1];
    const matched = jobs.filter((job) => {
      if (String(job.category || "").toLowerCase() === id) return true;
      return textMatchesBoard(`${job.title || ""} ${job.dept || ""}`, id);
    });
    const eventItems = flattenEventsMatching(events, (hay) => textMatchesBoard(hay, id));
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      body: seoBodies.boards[id] || "",
      items: [...flattenJobItems(matched), ...eventItems].slice(0, 16),
      empty: "No matching live notifications or official updates in the current snapshot.",
    });
  }
  const examMatch = /^\/exam\/([^/]+)$/.exec(path);
  if (examMatch) {
    const slug = examMatch[1];
    const needle = slug.replace(/-/g, " ");
    const matched = jobs.filter((job) =>
      `${job.title || ""} ${job.dept || ""}`.toLowerCase().includes(needle)
    );
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: flattenJobItems(matched),
    });
  }
  const orgMatch = /^\/org\/([^/]+)$/.exec(path);
  if (orgMatch) {
    const slug = orgMatch[1];
    const matched = jobs.filter((job) => matchesOrgSlug(job.dept, slug));
    const eventItems = flattenEventsMatching(events, (_hay, rec) =>
      matchesOrgSlug(rec.organization || rec.title || "", slug)
    );
    return buildSeoHubIsland({
      title: route.title,
      lede: route.description,
      items: [...flattenJobItems(matched), ...eventItems].slice(0, 16),
      empty: "No matching live notifications or official updates in the current snapshot.",
    });
  }
  return "";
}

function slugsFromSource(filePath, key = "slug") {
  if (!existsSync(filePath)) return [];
  const text = readFileSync(filePath, "utf8");
  const re = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`, "g");
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return [...new Set(out)];
}

function writeSpaRoute(spaHtml, route, { latestJobs = [], islandHtml = "" } = {}) {
  const canonical = `${siteUrl}${route.path === "/government-jobs" ? "/sarkari-naukri" : route.path}`;
  const title = route.title.includes("Live Govt Jobs") ? route.title : `${route.title} | Live Govt Jobs`;
  let html = prepareNonHomeShell(spaHtml);
  html = applyRouteHead(html, {
    title,
    description: route.description,
    canonical,
    noindex: Boolean(route.noindex),
  });
  if (islandHtml) {
    html = injectIsland(html, islandHtml);
  } else if (route.path === "/jobs/latest-notifications") {
    html = injectIsland(html, buildSeoLatestIsland(latestJobs));
  }
  writeHtml(join(dist, ...route.file), html);
}

function main() {
  if (!existsSync(distIndex)) {
    console.error("frontend/dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const spaHtml = readFileSync(distIndex, "utf8");
  const jobsDir = join(dist, "jobs");
  mkdirSync(jobsDir, { recursive: true });

  const liveJobs = loadJobs().filter((j) => j.slug || j.id).slice(0, MAX_PAGES);
  const archiveJobs = loadArchiveJobs();
  const jobs = mergeJobsForPrerender(liveJobs, archiveJobs).slice(0, MAX_PAGES);
  const events = loadJson(join(root, "frontend/public/data/recruitment-events.json"), { byType: {} });
  const archiveTopics = [
    "results",
    "admit-cards",
    "answer-keys",
    "cutoff",
    "syllabus",
    "previous-papers",
    "written-marks",
    "interview",
    "last-date",
  ];
  const archives = Object.fromEntries(
    archiveTopics.map((topic) => [
      topic,
      loadJson(join(root, "frontend/public/data/official-archives", `${topic}.json`), { items: [] }),
    ])
  );
  const seoBodies = {
    states: Object.fromEntries(
      Object.entries(STATE_NAMES).map(([id, name]) => [
        id,
        `${name} government jobs include PSC, police, health, and department notifications published on official state portals.`,
      ])
    ),
    boards: {
      upsc: "UPSC notifications on this hub come from upsc.gov.in.",
      ssc: "SSC notifications on this hub come from ssc.gov.in / ssc.nic.in.",
      railways: "Railway recruitments on this hub come from official RRB websites.",
      banking: "Banking recruitments on this hub come from IBPS, SBI, RBI, and PSU bank career pages.",
      police: "Police and CAPF recruitments on this hub come from official police or PSC websites.",
      teaching: "Teaching recruitments on this hub come from CTET, KVS, NVS, and university career pages.",
      defence: "Defence civilian recruitments on this hub come from official service career hosts.",
      psu: "PSU recruitments on this hub come from official employer career sites.",
      health: "Health-sector recruitments on this hub come from NHM, ESIC, AIIMS, and state health portals.",
      engineering: "Engineering posts on this hub come from official PSU, railway, and state notifications.",
      state: "State PSC recruitments on this hub come from official state e-recruitment portals.",
    },
  };
  const orgsRaw = loadJson(join(root, "frontend/src/data/org-index.json"), []);
  const orgs = Array.isArray(orgsRaw) ? orgsRaw : [];
  const hubCtx = { jobs: liveJobs, events, archives, seoBodies, orgs };
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
  // /jobs is a directory after slug HTML is written. Without index.html Vercel
  // 404s the listing even when the SPA rewrite is correct.
  for (const page of STATIC_PAGES) {
    const canonical = `${siteUrl}${page.path}`;
    let html = prepareNonHomeShell(spaHtml);
    html = applyRouteHead(html, {
      title: `${page.title} | Live Govt Jobs`,
      description: page.description,
      canonical,
    });
    html = injectIsland(html, buildSeoStaticIsland(page));
    writeHtml(join(dist, ...page.file), html);
  }

  for (const route of SPA_SHELL_ROUTES) {
    writeSpaRoute(spaHtml, route, {
      latestJobs: liveJobs,
      islandHtml: hubIslandForRoute(route, hubCtx),
    });
  }

  for (const [id, name] of Object.entries(STATE_NAMES)) {
    const route = {
      path: `/state/${id}`,
      file: ["state", `${id}.html`],
      title: `${name} Government Jobs 2026`,
      description: `Browse live ${name} government job notifications from official state portals and PSC websites.`,
    };
    writeSpaRoute(spaHtml, route, { islandHtml: hubIslandForRoute(route, hubCtx) });
  }

  const categoryNames = {
    upsc: "UPSC",
    ssc: "SSC",
    railways: "Railways",
    banking: "Banking",
    police: "Police",
    teaching: "Teaching",
    defence: "Defence",
    psu: "PSU",
    health: "Health",
    engineering: "Engineering",
    state: "State PSC",
  };
  for (const [id, name] of Object.entries(categoryNames)) {
    const boardRoute = {
      path: `/board/${id}`,
      file: ["board", `${id}.html`],
      title: `${name} Government Jobs`,
      description: `Official ${name} recruitment notifications, vacancies, and apply links from verified government sources.`,
    };
    const categoryRoute = {
      path: `/category/${id}`,
      file: ["category", `${id}.html`],
      title: `${name} Government Jobs`,
      description: `Official ${name} recruitment notifications, vacancies, and apply links from verified government sources.`,
    };
    writeSpaRoute(spaHtml, boardRoute, { islandHtml: hubIslandForRoute(boardRoute, hubCtx) });
    writeSpaRoute(spaHtml, categoryRoute, { islandHtml: hubIslandForRoute(categoryRoute, hubCtx) });
  }

  const feSrc = join(root, "frontend/src");
  for (const slug of slugsFromSource(join(feSrc, "data/exams.ts"))) {
    const examRoute = {
      path: `/exam/${slug}`,
      file: ["exam", `${slug}.html`],
      title: `${slug.replace(/-/g, " ")} | Live Govt Jobs`,
      description: `Live official ${slug.replace(/-/g, " ")} recruitment from verified .gov.in sources.`,
    };
    writeSpaRoute(spaHtml, examRoute, { islandHtml: hubIslandForRoute(examRoute, hubCtx) });
  }
  for (const slug of slugsFromSource(join(feSrc, "data/professions.ts"))) {
    writeSpaRoute(spaHtml, {
      path: `/profession/${slug}`,
      file: ["profession", `${slug}.html`],
      title: `${slug.replace(/-/g, " ")} Government Jobs 2026`,
      description: `Live official ${slug.replace(/-/g, " ")} recruitment from verified .gov.in sources.`,
    });
  }
  for (const slug of slugsFromSource(join(feSrc, "data/qualifications.ts"))) {
    writeSpaRoute(spaHtml, {
      path: `/qualification/${slug}`,
      file: ["qualification", `${slug}.html`],
      title: `${slug.replace(/-/g, " ")} Government Jobs 2026`,
      description: `Find government jobs matched to ${slug.replace(/-/g, " ")} from official sources.`,
    });
  }
  for (const slug of slugsFromSource(join(feSrc, "data/designations.ts"))) {
    writeSpaRoute(spaHtml, {
      path: `/designation/${slug}`,
      file: ["designation", `${slug}.html`],
      title: `${slug.replace(/-/g, " ")} Government Jobs 2026`,
      description: `Live official ${slug.replace(/-/g, " ")} recruitment from verified .gov.in sources.`,
    });
  }
  for (const row of orgs) {
    const slug = String(row?.slug || "").trim();
    if (!slug) continue;
    const dept = String(row?.dept || slug).trim();
    const orgRoute = {
      path: `/org/${slug}`,
      file: ["org", `${slug}.html`],
      title: `${dept} Recruitment 2026`,
      description: `Live ${dept} government job notifications from official sources.`,
    };
    writeSpaRoute(spaHtml, orgRoute, { islandHtml: hubIslandForRoute(orgRoute, hubCtx) });
  }

  const notFoundCanonical = `${siteUrl}/404`;
  let notFoundHtml = prepareNonHomeShell(spaHtml);
  notFoundHtml = applyRouteHead(notFoundHtml, {
    title: `${NOT_FOUND_PAGE.title} | Live Govt Jobs`,
    description: NOT_FOUND_PAGE.description,
    canonical: notFoundCanonical,
    noindex: true,
  });
  notFoundHtml = injectIsland(notFoundHtml, buildSeo404Island());
  writeHtml(join(dist, "404.html"), notFoundHtml);

  console.log(
    `Prerendered ${written} job pages under frontend/dist/jobs/*.html (${withLocality} with addressLocality); static + 404.html written`
  );
}

main();
