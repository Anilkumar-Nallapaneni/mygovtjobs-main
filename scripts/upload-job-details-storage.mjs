/**
 * Upload frontend/public/data/job-details/*.json to Supabase Storage (job-details bucket).
 *
 * Requires:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run storage:upload-job-details
 *   npm run storage:upload-job-details -- --limit 50
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DETAILS_DIR = join(ROOT, "frontend", "public", "data", "job-details");
const BUCKET = process.env.JOB_DETAILS_STORAGE_BUCKET || "job-details";

function env(name, fallback = "") {
  return (process.env[name] || process.env[`VITE_${name}`] || fallback).trim();
}

async function main() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

  let files;
  try {
    files = readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`Missing ${DETAILS_DIR}`);
    process.exit(1);
  }

  files.sort((a, b) => statSync(join(DETAILS_DIR, b)).mtimeMs - statSync(join(DETAILS_DIR, a)).mtimeMs);
  if (limit > 0) files = files.slice(0, limit);

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  });
  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const path = join(DETAILS_DIR, file);
    const body = readFileSync(path);
    const storagePath = file;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) {
      failed += 1;
      console.error(`[FAIL] ${file}: ${error.message}`);
    } else {
      uploaded += 1;
      if (uploaded % 25 === 0) console.log(`Uploaded ${uploaded}/${files.length}…`);
    }
  }

  console.log(`\nDone. Uploaded ${uploaded}, failed ${failed} → bucket ${BUCKET}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
