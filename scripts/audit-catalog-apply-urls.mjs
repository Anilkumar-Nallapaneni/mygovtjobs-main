#!/usr/bin/env node
/**
 * Fail if live-jobs.json apply URLs are structurally corrupt (.ln, ^, etc.).
 * No database or secrets required.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isCorruptUrl } from "./lib/audit-urls.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.argv[2] || join(root, "frontend/public/data/live-jobs.json");

if (!existsSync(catalogPath)) {
  console.error(`Missing catalog: ${catalogPath}`);
  process.exit(1);
}

const payload = JSON.parse(readFileSync(catalogPath, "utf8"));
const items = Array.isArray(payload.items) ? payload.items : [];
const bad = [];
for (const row of items) {
  const apply = String(row?.apply_url || "").trim();
  if (apply && isCorruptUrl(apply)) bad.push({ slug: row.slug, url: apply });
}

console.log(`Checked ${items.length} catalog rows; ${bad.length} corrupt apply URLs.`);
for (const row of bad.slice(0, 20)) {
  console.log(`  • ${row.slug}: ${row.url}`);
}
process.exit(bad.length ? 1 : 0);
