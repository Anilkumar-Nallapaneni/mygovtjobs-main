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
