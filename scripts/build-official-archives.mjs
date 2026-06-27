#!/usr/bin/env node
/**
 * Split official RSS snapshot into topic archives for static UI.
 * Supplements SPA-only sources (e.g. SSC) from live-jobs.json when available.
 * Run: npm run build:official-archives
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { stableId } from "./lib/official-feed-utils.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const feedPath = join(root, "frontend/public/data/official-feed-items.json");
const livePath = join(root, "frontend/public/data/live-jobs.json");
const outDir = join(root, "frontend/public/data/official-archives");

const ARCHIVE_TOPICS = [
  {
    name: "results",
    re: /\b(result|merit|cut[\s-]*off|cutoff|selection\s*list|provisional|scorecard|marks|recommended)\b|परिणाम|कट[\s-]*ऑफ|चयन|अंक|मेरिट/i,
  },
  {
    name: "admit-cards",
    re: /(?:admit\s*cards?|hall\s*tickets?|hallticket|call\s*letters?|e[\s-]*admit|download\s+hall|download\s+admit|intimation\s+letters?|entry\s+certificates?|entry\s+card|permission\s+slip|e[\s-]*call)|एडमिट|हॉल\s*टिकट|प्रवेश\s*पत्र|admitcard/i,
    linkRe: /admit|hallticket|hall-ticket|call-letter|e-admit|admitcards|candidate-corner|intimation|e-call|Download_HallTickets|hall_tickets|\/AC_/i,
  },
  {
    name: "answer-keys",
    re: /\banswer\s*key\b/i,
  },
  {
    name: "cutoff",
    re: /\bcut[\s-]*off\b|cutoff/i,
  },
  {
    name: "syllabus",
    re: /\bsyllabus\b/i,
  },
  {
    name: "previous-papers",
    re: /\b(previous\s*(?:year)?\s*(?:question)?\s*papers?|sample\s*papers?|model\s*papers?|old\s*papers?|pyq|question\s*bank|past\s*papers?|specimen\s*question|question\s*cum|model\s*question)\b/i,
    linkRe: /previous-question-paper|question-paper|model-question|old-paper|pyq|examination\/.*paper/i,
  },
  {
    name: "written-marks",
    re: /\b(written\s*(?:exam(?:ination)?|test)\s*marks|main(?:s)?\s*marks|marks\s*of\s*(?:written|qualified|candidates)|cbt\s*marks|tier[\s-]*[i1-3]+\s*marks|stage[\s-]*[i1-3]+\s*marks|written\s*examination\s*marks)\b/i,
  },
  {
    name: "interview",
    re: /\binterview\b|viva|personality\s*test/i,
  },
  {
    name: "last-date",
    re: /\b(last\s*date|extension|extended|deadline|closing)\b/i,
  },
];

const OFFICIAL_HOST_RE =
  /\.(gov|nic)\.in$|\.gov\.|\.ac\.in$|ssc\.gov\.in|upsc\.gov\.in|ibps\.in|rrbcdg\.gov\.in|rac\.gov\.in/i;

function liveJobHaystack(job) {
  const detail = job.detail && typeof job.detail === "object" ? job.detail : {};
  return [
    job.title,
    job.dept,
    detail.summary,
    detail.recruitment_board,
    detail.sourceName,
    detail.source,
  ]
    .filter(Boolean)
    .join(" ");
}

function isArchiveMatch(text, re, link = "", linkRe) {
  if (re.test(text)) return true;
  if (linkRe && link && linkRe.test(link)) return true;
  return false;
}

/** Stricter topic rules — avoid job notifications mis-tagged as marks/PYQ. */
function matchesArchiveTopic(topic, it) {
  const text = `${it.title || ""} ${it.summary || ""} ${it._liveHaystack || ""}`;
  const link = it.link || "";

  if (topic.name === "admit-cards") {
    if (/\/admit|hallticket|HallTicket|Download_HallTickets|CandidateAdmitCard|call-letter|call_letter/i.test(link)) {
      return true;
    }
    if (isArchiveMatch(text, topic.re, link, topic.linkRe)) return true;
    if (/\bdownload\b.{0,40}\bletter\b/i.test(text)) return true;
    if (/\bpermission\s+letters?\b/i.test(text)) return true;
    if (/\bpermission\s+slip\b/i.test(text)) return true;
    if (/\bentry\s+card\b/i.test(text)) return true;
    if (/\be[\s-]*call\b/i.test(text)) return true;
    if (
      /\.(gov|nic)\.in/i.test(link) &&
      /\bdownload\b/i.test(text) &&
      /\b(card|letter|ticket)\b/i.test(text)
    ) {
      return true;
    }
    return false;
  }

  if (topic.name === "written-marks") {
    if (!/\bmarks\b/i.test(text)) return false;
    return topic.re.test(text);
  }

  if (topic.name === "previous-papers") {
    if (isArchiveMatch(text, topic.re, link, topic.linkRe)) return true;
    if (it.sourceId === "upsc-previous-papers" && /upsc\.gov\.in/i.test(link)) {
      return /question|paper|specimen|model|qcab|examination/i.test(`${text} ${link}`);
    }
    return false;
  }

  return isArchiveMatch(text, topic.re, link, topic.linkRe);
}

function feedItemFromLiveJob(job) {
  const link = job.apply_url || job.pdf_url || job.detail?.link || "";
  if (!link) return null;
  const host = (() => {
    try {
      return new URL(link).hostname;
    } catch {
      return "";
    }
  })();
  if (!OFFICIAL_HOST_RE.test(host)) return null;
  return {
    id: stableId(link),
    title: job.title || "Official notification",
    link,
    publishedAt: job.published_at || job.detail?.publishedAt || null,
    summary: job.detail?.summary || null,
    pdfUrls: job.detail?.pdfUrls || (job.pdf_url ? [job.pdf_url] : []),
    sourceId: job.detail?.source || "live-jobs",
    sourceName: job.dept || "Official",
    dept: job.dept || "Official",
    state: job.state || "All India",
    category: job.category || null,
    fetchMethod: "live-jobs-supplement",
    _liveHaystack: liveJobHaystack(job),
  };
}

function mergeWithPreviousArchive(topic, rows) {
  const path = join(outDir, `${topic.name}.json`);
  if (!existsSync(path)) return rows;
  try {
    const prev = JSON.parse(readFileSync(path, "utf8"));
    const prevItems = Array.isArray(prev.items) ? prev.items : [];
    const byLink = new Map(rows.map((it) => [it.link, it]));
    for (const it of prevItems) {
      if (it?.link && !byLink.has(it.link) && matchesArchiveTopic(topic, it)) {
        byLink.set(it.link, it);
      }
    }
    return [...byLink.values()];
  } catch {
    return rows;
  }
}

function supplementFromLiveJobs(items) {
  if (!existsSync(livePath)) return items;
  let live;
  try {
    live = JSON.parse(readFileSync(livePath, "utf8"));
  } catch {
    return items;
  }
  const rows = Array.isArray(live.items) ? live.items : [];
  const byLink = new Map(items.map((it) => [it.link, it]));
  for (const job of rows) {
    const row = feedItemFromLiveJob(job);
    if (!row || byLink.has(row.link)) continue;
    byLink.set(row.link, row);
  }
  return [...byLink.values()];
}

function main() {
  if (!existsSync(feedPath)) {
    console.warn("No official-feed-items.json — run npm run fetch:official:feeds first");
    return;
  }
  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const baseItems = Array.isArray(feed.items) ? feed.items : [];
  const items = supplementFromLiveJobs(baseItems);

  mkdirSync(outDir, { recursive: true });
  const stamp = feed.generatedAt || new Date().toISOString();
  const write = (name, rows) => {
    const path = join(outDir, `${name}.json`);
    writeFileSync(
      path,
      JSON.stringify({ generatedAt: stamp, count: rows.length, items: rows }, null, 2),
      "utf8"
    );
    console.log(`  ${name}: ${rows.length} items → ${path}`);
  };

  console.log("Building official archives…");
  console.log(`  base feed items: ${baseItems.length}, with live-jobs supplement: ${items.length}`);
  for (const topic of ARCHIVE_TOPICS) {
    const rows = mergeWithPreviousArchive(
      topic,
      items
        .filter((it) => matchesArchiveTopic(topic, it))
        .map(({ _liveHaystack, ...row }) => row)
    );
    write(topic.name, rows);
  }
}

main();
