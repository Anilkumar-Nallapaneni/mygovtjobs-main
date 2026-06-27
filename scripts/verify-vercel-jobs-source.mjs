#!/usr/bin/env node
/**
 * Confirm VITE_JOBS_SOURCE is set on Vercel production (value is encrypted in CLI output).
 * Run: npm run vercel:env:check
 *
 * If missing or wrong, run: npm run vercel:env:push  (defaults VITE_JOBS_SOURCE=supabase)
 */
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vercel = process.platform === "win32" ? "vercel.cmd" : "vercel";

const r = spawnSync(vercel, ["env", "ls", "production"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});

const out = `${r.stdout || ""}${r.stderr || ""}`;
if (r.status !== 0) {
  console.error("Could not list Vercel env. Run: vercel login && npm run vercel:link");
  process.exit(r.status || 1);
}

const hasJobsSource = /^\s*VITE_JOBS_SOURCE\s+/m.test(out);
const hasSupabase = /^\s*VITE_SUPABASE_URL\s+/m.test(out) && /^\s*VITE_SUPABASE_ANON_KEY\s+/m.test(out);

if (hasJobsSource && hasSupabase) {
  console.log("✓ Vercel production has VITE_JOBS_SOURCE, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
  console.log("  Re-push to force supabase: npm run vercel:env:push");
  console.log("  If you previously pushed from .env.local with auto/api, fix in Dashboard or re-push.");
  process.exit(0);
}

console.error("✗ Missing required Vercel production env vars:");
if (!hasJobsSource) console.error("  - VITE_JOBS_SOURCE (set to supabase)");
if (!hasSupabase) console.error("  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
console.error("\nFix: npm run vercel:env:push");
process.exit(1);
