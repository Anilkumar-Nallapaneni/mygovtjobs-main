#!/usr/bin/env node
/**
 * CI sanity: frontend/public/data JSON is parseable and free of merge markers.
 * Also checks recruitment-events / official-archives / org-index / jobs-archive shape.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "frontend/public/data");
const conflictMarker = /^(<<<<<<<(?: .*)?|=======$|>>>>>>>(?: .*)?)$/m;
const errors = [];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, acc);
    else if (name.endsWith(".json")) acc.push(file);
  }
  return acc;
}

function rel(file) {
  return relative(root, file).replace(/\\/g, "/");
}

const files = existsSync(dataDir) ? walk(dataDir) : [];
if (!files.length) {
  console.error("✗ no JSON files under frontend/public/data");
  process.exit(1);
}

const parsed = new Map();
for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (conflictMarker.test(content)) {
    errors.push(`unresolved merge conflict in ${rel(file)}`);
    continue;
  }
  try {
    parsed.set(file, JSON.parse(content));
  } catch (error) {
    errors.push(`invalid JSON in ${rel(file)}: ${error.message}`);
  }
}

const eventsPath = join(dataDir, "recruitment-events.json");
const events = parsed.get(eventsPath);
if (events) {
  if (!events.counts || typeof events.counts !== "object") {
    errors.push("recruitment-events.json missing counts");
  }
  if (!events.byType || typeof events.byType !== "object") {
    errors.push("recruitment-events.json missing byType");
  }
}

const orgPath = join(dataDir, "org-index.json");
const orgs = parsed.get(orgPath);
if (!Array.isArray(orgs)) {
  errors.push("org-index.json must be an array");
} else if (orgs.length < 1) {
  errors.push("org-index.json is empty — expected at least one organisation");
} else if (orgs.some((row) => !row?.slug || !row?.dept)) {
  errors.push("org-index.json rows must include slug and dept");
}

const archivePath = join(dataDir, "jobs-archive.json");
const archive = parsed.get(archivePath);
if (!archive) {
  errors.push("jobs-archive.json is missing");
} else if (!Array.isArray(archive.items) || typeof archive.count !== "number") {
  errors.push("jobs-archive.json must have count + items[]");
}

const archivesDir = join(dataDir, "official-archives");
if (existsSync(archivesDir)) {
  for (const file of files.filter((f) => f.includes(`${join("official-archives")}`))) {
    const payload = parsed.get(file);
    if (!payload) continue;
    if (!Array.isArray(payload.items)) {
      errors.push(`${rel(file)} missing items[]`);
    }
  }
}

if (errors.length) {
  console.error(`✗ public data check failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

console.log(`✓ ${files.length} public data JSON files are valid and conflict-free`);
