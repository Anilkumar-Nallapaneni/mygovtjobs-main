#!/usr/bin/env node
/**
 * Count rows in every My Govt Jobs Supabase table via REST.
 * Run: npm run supabase:audit
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
const url = (fe.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anon = fe.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local");
  process.exit(1);
}

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  Prefer: "count=exact",
};

const TABLES = [
  "sources",
  "raw_ingest",
  "jobs",
  "job_posts",
  "job_dates",
  "alert_subscriptions",
  "alert_deliveries",
];

async function countTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers });
  const range = res.headers.get("content-range") || "";
  const m = range.match(/\/(\d+|\*)/);
  const total = m && m[1] !== "*" ? Number(m[1]) : null;
  if (!res.ok) {
    const body = await res.text();
    return { table, ok: false, status: res.status, error: body.slice(0, 120) };
  }
  return { table, ok: true, count: total };
}

console.log("Supabase project:", url);
let ok = true;
for (const table of TABLES) {
  const row = await countTable(table);
  if (!row.ok) {
    ok = false;
    console.log(`✗ ${table}: HTTP ${row.status} — ${row.error}`);
    if (row.status === 404) {
      console.log("  → Run database/supabase_setup.sql and database/migrations/002_supabase_rls_and_grants.sql");
    }
  } else {
    console.log(`✓ ${table}: ${row.count ?? "?"} rows`);
  }
}

async function countJobsByStatus(status) {
  const res = await fetch(`${url}/rest/v1/jobs?select=id&status=eq.${status}&limit=1`, { headers });
  const range = res.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)/);
  return res.ok && match ? Number(match[1]) : null;
}

const liveCount = await countJobsByStatus("live");
const expiredCount = await countJobsByStatus("expired");
const draftCount = await countJobsByStatus("draft");
if (liveCount != null) console.log(`  jobs (live only): ${liveCount}`);
if (expiredCount != null) console.log(`  jobs (expired): ${expiredCount}`);
if (draftCount != null && draftCount > 0) console.log(`  jobs (draft, hidden from anon): ${draftCount}`);
if (liveCount != null && expiredCount != null) console.log(`  jobs (visible total): ${liveCount + expiredCount}`);

if (expiredCount === 0) {
  console.log(
    '  tip: if backend /health/detailed shows expired rows, run database/migrations/003_ensure_expired_jobs_public_read.sql'
  );
}

process.exit(ok ? 0 : 1);
