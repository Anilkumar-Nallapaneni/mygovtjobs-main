#!/usr/bin/env node
/**
 * Build frontend/public/data/org-index.json from live jobs (dept field).
 *   node scripts/build-org-index.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livePath = join(root, "frontend/public/data/live-jobs.json");
const outPath = join(root, "frontend/public/data/org-index.json");
const MIN_JOBS = 3;

function slugifyOrg(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadJobs() {
  if (!existsSync(livePath)) return [];
  const payload = JSON.parse(readFileSync(livePath, "utf8"));
  return Array.isArray(payload.items) ? payload.items : [];
}

function main() {
  const jobs = loadJobs();
  const tallies = new Map();

  for (const job of jobs) {
    const dept = String(job.dept ?? "").trim();
    if (!dept || dept.length < 2) continue;
    if (String(job.status || "live").toLowerCase() === "expired") continue;

    const key = dept.toLowerCase();
    const row = tallies.get(key) ?? {
      dept,
      slug: slugifyOrg(dept),
      count: 0,
      vacancies: 0,
    };
    row.count += 1;
    row.vacancies += Number(job.vacancies) || 0;
    tallies.set(key, row);
  }

  const index = [...tallies.values()]
    .filter((row) => row.count >= MIN_JOBS && row.slug)
    .sort((a, b) => b.count - a.count || a.dept.localeCompare(b.dept));

  writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath} — ${index.length} organisations (min ${MIN_JOBS} jobs)`);
}

main();
