#!/usr/bin/env node
/**
 * Audit live job rows: PDFs, apply links, deadlines, vacancies, noise.
 * Run: npm run jobs:audit
 */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  collectJobUrls,
  isBlockedAggregatorUrl,
  isCorruptUrl,
  isSaneHttpUrl,
  rowHasBlockedAggregatorUrl,
} from "./lib/audit-urls.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const fe = loadEnv(join(root, "frontend/.env.local"));
const be = loadEnv(join(root, "backend/.env"));
const url = (fe.VITE_SUPABASE_URL || be.SUPABASE_URL || "").replace(/\/$/, "");
const key = fe.VITE_SUPABASE_ANON_KEY || be.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set Supabase URL + anon key in frontend/.env.local");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const STRICT =
  process.argv.includes("--strict") || process.env.JOBS_AUDIT_STRICT === "1";

/** Quality gates — override via env for gradual rollout. */
const THRESHOLDS = {
  // Catalog rebuild floor (was 50). Raise via JOBS_AUDIT_MIN_LIVE=50 once live count recovers.
  minLiveJobs: Number(process.env.JOBS_AUDIT_MIN_LIVE || 10),
  maxBlockedHost: Number(process.env.JOBS_AUDIT_MAX_BLOCKED_HOST || 0),
  maxNoPdfNoApplyPctLive: Number(process.env.JOBS_AUDIT_MAX_NO_LINK_PCT_LIVE || 15),
  maxShortTitlePct: Number(process.env.JOBS_AUDIT_MAX_SHORT_TITLE_PCT || 2),
  minRecruitmentLikePct: Number(process.env.JOBS_AUDIT_MIN_RECRUIT_PCT || 70),
};

const PAGE = 500;
const RECRUIT_RE =
  /recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice/i;
const PDF_RE = /\.pdf(\?|#|$)|\/writereaddata\/|\/documents\/|notification.*\.pdf/i;
function collectPdfUrls(row) {
  const detail = row.detail && typeof row.detail === "object" ? row.detail : {};
  const urls = [];
  const push = (u) => {
    if (typeof u === "string" && u.trim()) urls.push(u.trim());
  };
  push(row.pdf_url);
  push(detail.pdf_url);
  push(detail.pdfUrl);
  push(detail.notification_url);
  if (Array.isArray(detail.pdf_urls)) detail.pdf_urls.forEach(push);
  if (Array.isArray(detail.pdfUrls)) detail.pdfUrls.forEach(push);
  const apply = row.apply_url || detail.apply_url;
  if (apply && PDF_RE.test(apply)) push(apply);
  return [...new Set(urls)].filter((u) => PDF_RE.test(u) && !isBlockedAggregatorUrl(u));
}

function hasKnownDate(v) {
  const s = String(v ?? "").trim();
  return Boolean(s && !/^(-|—|tba|pending)$/i.test(s));
}

async function fetchAllJobs() {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/jobs?select=id,slug,title,dept,category,vacancies,qualification,last_date,apply_url,status,published_at,detail&status=in.(live,expired)&order=published_at.desc&offset=${offset}&limit=${PAGE}`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
    if (all.length >= 10000) break;
  }
  return all;
}

async function main() {
  console.log("Fetching jobs from Supabase…");
  const jobs = await fetchAllJobs();
  console.log(`Total rows: ${jobs.length}\n`);

  const stats = {
    live: 0,
    expired: 0,
    liveNoPdfNoApply: 0,
    withPdf: 0,
    withContentSections: 0,
    withApplyUrl: 0,
    withLastDate: 0,
    withVacancy: 0,
    recruitmentLike: 0,
    liveRecruitmentLike: 0,
    liveWithPdf: 0,
    liveWithContentSections: 0,
    blockedHost: 0,
    corruptApplyUrl: 0,
    shortTitle: 0,
    noPdfNoApply: 0,
  };

  const issues = {
    noPdfNoApply: [],
    blockedHost: [],
    corruptApplyUrl: [],
    shortTitle: [],
    notRecruitment: [],
  };

  for (const row of jobs) {
    const status = String(row.status || "live").toLowerCase();
    if (status === "live") stats.live += 1;
    if (status === "expired") stats.expired += 1;

    const title = String(row.title || "").trim();
    const pdfs = collectPdfUrls(row);
    const apply = String(row.apply_url || "").trim();
    const hasPdf = pdfs.length > 0;
    const hasApply = Boolean(apply && !isBlockedAggregatorUrl(apply) && isSaneHttpUrl(apply));

    if (apply && isCorruptUrl(apply)) {
      stats.corruptApplyUrl += 1;
      if (issues.corruptApplyUrl.length < 15) {
        issues.corruptApplyUrl.push({ slug: row.slug, title: title.slice(0, 80), url: apply });
      }
    }

    if (hasPdf) stats.withPdf += 1;
    const sections = (row.detail && typeof row.detail === "object" ? row.detail : {}).content_sections;
    if (Array.isArray(sections) && sections.length > 0) stats.withContentSections += 1;
    if (hasApply) stats.withApplyUrl += 1;
    if (hasKnownDate(row.last_date)) stats.withLastDate += 1;
    if (Number(row.vacancies) > 0) stats.withVacancy += 1;
    if (RECRUIT_RE.test(title) || RECRUIT_RE.test(String(row.dept || ""))) {
      stats.recruitmentLike += 1;
      if (status === "live") stats.liveRecruitmentLike += 1;
    }

    if (status === "live") {
      if (hasPdf) stats.liveWithPdf += 1;
      if (Array.isArray(sections) && sections.length > 0) stats.liveWithContentSections += 1;
    }

    if (rowHasBlockedAggregatorUrl(row)) {
      stats.blockedHost += 1;
      if (issues.blockedHost.length < 15) {
        const bad = collectJobUrls(row).find((u) => isBlockedAggregatorUrl(u));
        issues.blockedHost.push({ slug: row.slug, title: title.slice(0, 80), url: bad });
      }
    }

    if (title.length < 6) {
      stats.shortTitle += 1;
      if (issues.shortTitle.length < 10) issues.shortTitle.push({ slug: row.slug, title });
    }

    if (!hasPdf && !hasApply) {
      stats.noPdfNoApply += 1;
      if (status === "live") stats.liveNoPdfNoApply += 1;
      if (issues.noPdfNoApply.length < 20) {
        issues.noPdfNoApply.push({ slug: row.slug, title: title.slice(0, 90), dept: row.dept });
      }
    }

    if (title.length >= 6 && !RECRUIT_RE.test(title) && !RECRUIT_RE.test(String(row.dept || ""))) {
      if (issues.notRecruitment.length < 15) {
        issues.notRecruitment.push({ slug: row.slug, title: title.slice(0, 90) });
      }
    }
  }

  const pct = (n) => (jobs.length ? `${((n / jobs.length) * 100).toFixed(1)}%` : "0%");
  const livePct = (n) => (stats.live ? `${((n / stats.live) * 100).toFixed(1)}%` : "n/a");
  const allPct = (n) => (jobs.length ? `${((n / jobs.length) * 100).toFixed(1)}%` : "0%");

  console.log("── Quality summary ──");
  console.log(`  Live:              ${stats.live}`);
  console.log(`  Expired:           ${stats.expired}`);
  console.log(`  Has PDF link:      ${stats.withPdf} (${pct(stats.withPdf)})`);
  console.log(`  Has content_sections: ${stats.withContentSections} (${pct(stats.withContentSections)})`);
  console.log(`  Has apply URL:     ${stats.withApplyUrl} (${pct(stats.withApplyUrl)})`);
  console.log(`  Has last_date:     ${stats.withLastDate} (${pct(stats.withLastDate)})`);
  console.log(`  Has vacancies>0:   ${stats.withVacancy} (${pct(stats.withVacancy)})`);
  console.log(`  Recruitment-like:  ${stats.recruitmentLike} (${pct(stats.recruitmentLike)})`);
  console.log(`  No PDF & no apply: ${stats.noPdfNoApply} (${pct(stats.noPdfNoApply)})`);
  console.log(`  Blocked host hint: ${stats.blockedHost}`);
  console.log(`  Corrupt apply URL: ${stats.corruptApplyUrl}`);

  console.log("\n── Live-only summary ──");
  console.log(`  Live recruitment-like: ${stats.liveRecruitmentLike} (${livePct(stats.liveRecruitmentLike)})`);
  console.log(`  Live with PDF:         ${stats.liveWithPdf} (${livePct(stats.liveWithPdf)})`);
  console.log(
    `  Live content_sections: ${stats.liveWithContentSections} (${livePct(stats.liveWithContentSections)})`
  );

  const printIssues = (label, rows) => {
    if (!rows.length) return;
    console.log(`\n── Sample: ${label} (max ${rows.length}) ──`);
    for (const r of rows) console.log(`  • ${r.slug}: ${r.title}${r.dept ? ` [${r.dept}]` : ""}`);
  };

  printIssues("no PDF / no apply", issues.noPdfNoApply);
  printIssues("non-recruitment title", issues.notRecruitment);
  printIssues("blocked host", issues.blockedHost);
  printIssues("corrupt apply URL", issues.corruptApplyUrl);
  printIssues("short title", issues.shortTitle);

  const recruitPct = jobs.length ? (stats.recruitmentLike / jobs.length) * 100 : 0;
  const shortTitlePct = jobs.length ? (stats.shortTitle / jobs.length) * 100 : 0;
  const liveNoLinkPct = stats.live ? (stats.liveNoPdfNoApply / stats.live) * 100 : 0;

  const failures = [];
  if (stats.live < THRESHOLDS.minLiveJobs) {
    failures.push(`live jobs ${stats.live} < min ${THRESHOLDS.minLiveJobs}`);
  }
  if (stats.blockedHost > THRESHOLDS.maxBlockedHost) {
    failures.push(`blocked host ${stats.blockedHost} > max ${THRESHOLDS.maxBlockedHost}`);
  }
  if (stats.corruptApplyUrl > 0) {
    failures.push(`corrupt apply URLs ${stats.corruptApplyUrl} > max 0`);
  }
  if (liveNoLinkPct > THRESHOLDS.maxNoPdfNoApplyPctLive) {
    failures.push(
      `live without PDF/apply ${liveNoLinkPct.toFixed(1)}% > max ${THRESHOLDS.maxNoPdfNoApplyPctLive}%`
    );
  }
  if (shortTitlePct > THRESHOLDS.maxShortTitlePct) {
    failures.push(`short titles ${shortTitlePct.toFixed(1)}% > max ${THRESHOLDS.maxShortTitlePct}%`);
  }
  if (recruitPct < THRESHOLDS.minRecruitmentLikePct) {
    failures.push(
      `recruitment-like ${recruitPct.toFixed(1)}% < min ${THRESHOLDS.minRecruitmentLikePct}%`
    );
  }

  console.log("\n── Thresholds ──");
  console.log(`  live >= ${THRESHOLDS.minLiveJobs}: ${stats.live} ${stats.live >= THRESHOLDS.minLiveJobs ? "✓" : "✗"}`);
  console.log(`  blocked host <= ${THRESHOLDS.maxBlockedHost}: ${stats.blockedHost} ${stats.blockedHost <= THRESHOLDS.maxBlockedHost ? "✓" : "✗"}`);
  console.log(
    `  live no PDF/apply <= ${THRESHOLDS.maxNoPdfNoApplyPctLive}%: ${livePct(stats.liveNoPdfNoApply)} ${liveNoLinkPct <= THRESHOLDS.maxNoPdfNoApplyPctLive ? "✓" : "✗"}`
  );
  console.log(
    `  short title <= ${THRESHOLDS.maxShortTitlePct}%: ${allPct(stats.shortTitle)} ${shortTitlePct <= THRESHOLDS.maxShortTitlePct ? "✓" : "✗"}`
  );
  console.log(
    `  recruitment-like >= ${THRESHOLDS.minRecruitmentLikePct}%: ${allPct(stats.recruitmentLike)} ${recruitPct >= THRESHOLDS.minRecruitmentLikePct ? "✓" : "✗"}`
  );

  const reportPath = join(root, "scripts/.last-job-quality-audit.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      { at: new Date().toISOString(), total: jobs.length, stats, issues, thresholds: THRESHOLDS, failures },
      null,
      2
    )
  );
  console.log(`\nFull report: ${reportPath}`);

  if (STRICT && failures.length) {
    console.error("\n✗ jobs:audit thresholds failed:");
    for (const f of failures) console.error(`  • ${f}`);
    process.exit(1);
  }
  if (STRICT) {
    console.log("\n✓ jobs:audit thresholds passed");
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
