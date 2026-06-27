#!/usr/bin/env node
/**
 * Trigger full India ingest via backend API (all enabled scrapers in registry).
 * Requires: uvicorn on port 8000, ADMIN_API_KEY in backend/.env
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}

const env = loadEnv(join(__dirname, "..", "backend", ".env"));
const apiUrl = (process.env.MYGOVTJOBS_API_URL || "http://localhost:8000").replace(/\/$/, "");
const adminKey = process.env.ADMIN_API_KEY || env.ADMIN_API_KEY;

if (!adminKey) {
  console.error("Missing ADMIN_API_KEY in backend/.env");
  process.exit(1);
}

console.log(`POST ${apiUrl}/api/admin/ingest/run-all (this may take 30–60+ minutes)…`);

const res = await fetch(`${apiUrl}/api/admin/ingest/run-all`, {
  method: "POST",
  headers: { "X-Admin-Key": adminKey, "Content-Type": "application/json" },
});

const text = await res.text();
console.log("HTTP", res.status);
try {
  const json = JSON.parse(text);
  const results = json.results || [];
  let saved = 0;
  let fetched = 0;
  for (const r of results) {
    saved += r.saved || 0;
    fetched += r.fetched || 0;
  }
  console.log(`Sources: ${results.length}, fetched: ${fetched}, saved: ${saved}`);
} catch {
  console.log(text.slice(0, 2000));
}

if (!res.ok) process.exit(1);
