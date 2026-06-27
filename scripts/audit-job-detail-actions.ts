/**
 * Audit every job row against job-detail action bar rules.
 * Run: npx tsx scripts/audit-job-detail-actions.ts
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  buildUnifiedDetailActions,
  isGenericHomepageUrl,
  resolveHtmlApplyHref,
  sameOutboundUrl,
} from "../frontend/src/utils/jobDetailLinks.ts";
import { isPdfUrl } from "../frontend/src/utils/officialDomains.ts";
import { buildStructuredJobDetail } from "../frontend/src/utils/jobDetailStructured.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapPath = join(root, "frontend/public/data/live-jobs.json");

type JobRow = Record<string, unknown>;

function isGenericHome(u: string) {
  try {
    return isGenericHomepageUrl(u);
  } catch {
    return false;
  }
}

function loadJobs(): JobRow[] {
  const snap = JSON.parse(readFileSync(snapPath, "utf8")) as { items?: JobRow[] };
  return (snap.items || []).filter((j) => j.status === "live" || !j.status);
}

function auditJob(job: JobRow) {
  const issues: string[] = [];
  const actions = buildUnifiedDetailActions(job);
  const htmlApply = resolveHtmlApplyHref(job);
  const slug = String(job.slug || job.id || "unknown");

  if (!actions.length) {
    const hasLink = Boolean(job.apply_url || job.pdf_url || (job.detail as Record<string, unknown>)?.pdf_urls);
    if (hasLink) issues.push("no_actions_despite_links");
  }

  const pdfActions = actions.filter((a) => isPdfUrl(a.url));
  if (pdfActions.length > 1) issues.push("duplicate_pdf_buttons");

  if (actions.some((a) => /Apply Now — View Notification/i.test(a.label))) {
    issues.push("combined_apply_notification_label");
  }

  const applyAction = actions.find((a) => a.label === "Apply Now");
  if (applyAction) {
    if (isGenericHome(applyAction.url)) issues.push("generic_homepage_apply");
    if (applyAction.url.toLowerCase().startsWith("mailto:")) issues.push("mailto_apply");
    if (isPdfUrl(applyAction.url)) issues.push("pdf_as_apply_now");
  }

  if (htmlApply) {
    if (isGenericHome(htmlApply)) issues.push("generic_html_apply_href");
    if (htmlApply.toLowerCase().startsWith("mailto:")) issues.push("mailto_html_apply_href");
  }

  const structured = buildStructuredJobDetail(job);
  if (structured.isStructured && structured.summary) {
    const dupOverview =
      structured.overviewFacts.length > 0 &&
      structured.articleSections.some((s) => /overview/i.test(s.heading));
    if (dupOverview) issues.push("duplicate_overview_section");

    const dupLinks = structured.articleSections.some((s) => /important links/i.test(s.heading));
    if (dupLinks) issues.push("links_section_in_body");
  }

  const seen = new Set<string>();
  for (const a of actions) {
    const key = a.url.toLowerCase();
    if (seen.has(key)) issues.push("duplicate_action_url");
    seen.add(key);
    for (const b of actions) {
      if (a !== b && sameOutboundUrl(a.url, b.url) && a.label !== b.label) {
        issues.push("same_url_different_labels");
        break;
      }
    }
  }

  return { slug, title: String(job.title || "").slice(0, 80), issues, actions: actions.map((a) => a.label) };
}

function main() {
  console.log("Loading live-jobs.json…");
  const jobs = loadJobs();
  console.log(`Auditing ${jobs.length} jobs…`);
  const results: ReturnType<typeof auditJob>[] = [];
  for (let i = 0; i < jobs.length; i++) {
    results.push(auditJob(jobs[i]));
    if ((i + 1) % 150 === 0 || i + 1 === jobs.length) {
      console.log(`  … ${i + 1}/${jobs.length}`);
    }
  }
  const withIssues = results.filter((r) => r.issues.length > 0);

  const byIssue = new Map<string, number>();
  for (const r of withIssues) {
    for (const i of r.issues) byIssue.set(i, (byIssue.get(i) || 0) + 1);
  }

  console.log(`\nJob detail action audit — ${jobs.length} live jobs\n`);
  console.log(`Jobs with issues: ${withIssues.length} (${((withIssues.length / jobs.length) * 100).toFixed(1)}%)`);
  console.log(`Jobs OK: ${results.length - withIssues.length}\n`);

  if (byIssue.size) {
    console.log("Issue breakdown:");
    for (const [issue, count] of [...byIssue.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${issue}: ${count}`);
    }
    console.log("\nSample jobs with issues (up to 15):");
    for (const r of withIssues.slice(0, 15)) {
      console.log(`  • ${r.slug}`);
      console.log(`    ${r.title}`);
      console.log(`    issues: ${r.issues.join(", ")}`);
      console.log(`    actions: ${r.actions.join(" | ") || "(none)"}`);
    }
  } else {
    console.log("✓ All jobs pass job-detail action checks.");
  }

  const noApply = results.filter((r) => r.issues.includes("no_actions_despite_links"));
  const genericApply = results.filter((r) => r.issues.includes("generic_homepage_apply"));
  console.log(`\nSummary:`);
  console.log(`  Missing actions: ${noApply.length}`);
  console.log(`  Generic homepage Apply Now: ${genericApply.length}`);
  console.log(`  Duplicate PDF buttons: ${results.filter((r) => r.issues.includes("duplicate_pdf_buttons")).length}`);

  const failPct = Number(process.env.JOB_DETAIL_AUDIT_MAX_ISSUE_PCT || 5);
  const issuePct = (withIssues.length / Math.max(jobs.length, 1)) * 100;
  if (issuePct > failPct) {
    console.error(`\n✗ Audit failed: ${issuePct.toFixed(1)}% jobs with issues (max ${failPct}%)`);
    process.exit(1);
  }
  console.log(`\n✓ Audit passed (${issuePct.toFixed(1)}% with issues ≤ ${failPct}%)`);
}

main();
