#!/usr/bin/env node
/**
 * Build org-index.json from live jobs + recruitment-event organisations.
 *
 * Live jobs: include an org with >= MIN_JOBS listings after a junk filter.
 * Events: include an org with >= MIN_EVENTS official result/admit/answer rows
 * so boards that are already scraped but under-published still get a hub.
 *
 * Writes both public (sitemap) and src (bundled FE) copies.
 *
 *   node scripts/build-org-index.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livePath = join(root, "frontend/public/data/live-jobs.json");
const eventsPath = join(root, "frontend/public/data/recruitment-events.json");
const publicOut = join(root, "frontend/public/data/org-index.json");
const srcOut = join(root, "frontend/src/data/org-index.json");

/** Live-job threshold. 1 is safe: current catalog depts are real boards. */
const MIN_JOBS = 1;
/** Event-only orgs need a few official updates so one-off feed rows stay out. */
const MIN_EVENTS = 2;

const JUNK_DEPT =
  /^(government of india|govt of india|see official|n\/a|na|unknown|various|multiple|recruitment|careers|what'?s new|notifications?)$/i;
const FEED_HOST_TAIL = /\b(com|org|nic|gov|in)$/i;
const REAL_ORG_HINT =
  /\b(psc|ssc|upsc|rrb|ibps|commission|board|university|institute|corporation|authority|navy|army|isro|drdo|barc|esic|nhm|iit|iiser|icar|port|police|bank|psu|council|academy|mission|hospital|college)\b/i;

function slugifyOrg(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function isQualityLiveOrg(dept, slug) {
  if (!dept || dept.length < 3 || !slug || slug.length < 2) return false;
  if (JUNK_DEPT.test(dept.trim())) return false;
  return true;
}

function isQualityEventOrg(dept, slug) {
  if (!isQualityLiveOrg(dept, slug)) return false;
  if (dept.length < 6) return false;
  if (FEED_HOST_TAIL.test(dept.trim()) && !/\(.*\)/.test(dept)) return false;
  if (/\bwhat'?s new\b/i.test(dept) || /\bdcourts\b/i.test(dept)) return false;
  return REAL_ORG_HINT.test(dept);
}

function addTally(map, dept, { jobs = 0, vacancies = 0, events = 0 }) {
  const name = String(dept || "").trim();
  if (!name) return;
  const key = name.toLowerCase();
  const row = map.get(key) ?? {
    dept: name,
    slug: slugifyOrg(name),
    count: 0,
    vacancies: 0,
    eventCount: 0,
  };
  if (name.length > row.dept.length) {
    row.dept = name;
    row.slug = slugifyOrg(name);
  }
  row.count += jobs;
  row.vacancies += vacancies;
  row.eventCount += events;
  map.set(key, row);
}

function main() {
  const jobsPayload = loadJson(livePath, { items: [] });
  const jobs = Array.isArray(jobsPayload.items) ? jobsPayload.items : [];
  const eventsPayload = loadJson(eventsPath, { byType: {} });
  const byType = eventsPayload.byType && typeof eventsPayload.byType === "object" ? eventsPayload.byType : {};

  const tallies = new Map();

  for (const job of jobs) {
    const dept = String(job.dept ?? "").trim();
    if (!dept) continue;
    if (String(job.status || "live").toLowerCase() === "expired") continue;
    addTally(tallies, dept, {
      jobs: 1,
      vacancies: Number(job.vacancies) || 0,
    });
  }

  for (const rows of Object.values(byType)) {
    if (!Array.isArray(rows)) continue;
    for (const rec of rows) {
      const dept = String(rec.organization || rec.title || "").trim();
      if (!dept) continue;
      addTally(tallies, dept, { events: 1 });
    }
  }

  const index = [...tallies.values()]
    .filter((row) => {
      if (!row.slug) return false;
      const liveOk = row.count >= MIN_JOBS && isQualityLiveOrg(row.dept, row.slug);
      const eventOk = row.eventCount >= MIN_EVENTS && isQualityEventOrg(row.dept, row.slug);
      return liveOk || eventOk;
    })
    .map(({ eventCount, ...rest }) => rest)
    .sort((a, b) => b.count - a.count || a.dept.localeCompare(b.dept));

  const json = `${JSON.stringify(index, null, 2)}\n`;
  writeFileSync(publicOut, json, "utf8");
  writeFileSync(srcOut, json, "utf8");
  console.log(
    `Wrote ${publicOut} and ${srcOut} — ${index.length} organisations (min ${MIN_JOBS} live job or ${MIN_EVENTS} events)`
  );
}

main();
