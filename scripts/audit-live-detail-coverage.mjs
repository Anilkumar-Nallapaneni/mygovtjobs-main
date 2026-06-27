#!/usr/bin/env node
/** Live jobs: PDF + content_sections coverage from Supabase */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const fe = loadEnv(join(root, "frontend/.env.local"));
const be = loadEnv(join(root, "backend/.env"));
const url = (fe.VITE_SUPABASE_URL || be.SUPABASE_URL || "").replace(/\/$/, "");
const key = fe.VITE_SUPABASE_ANON_KEY || be.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL/key");
  process.exit(1);
}

const hdr = { apikey: key, Authorization: `Bearer ${key}` };
let offset = 0;
const rows = [];
while (true) {
  const res = await fetch(
    `${url}/rest/v1/jobs?select=slug,title,detail,apply_url,status&status=in.(live,expired)&order=published_at.desc&offset=${offset}&limit=500`,
    { headers: hdr }
  );
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  const batch = await res.json();
  if (!Array.isArray(batch) || !batch.length) break;
  rows.push(...batch);
  if (batch.length < 500) break;
  offset += 500;
}

const live = rows.filter((j) => j.status === "live");

let withSections = 0;
let withPdf = 0;
let pdfNoSections = 0;
const pdfNoSecSamples = [];

for (const j of live) {
  const d = j.detail && typeof j.detail === "object" ? j.detail : {};
  const secs = Array.isArray(d.content_sections) ? d.content_sections : [];
  const hasPdf =
    Boolean(d.pdf_url || d.pdfUrl || j.apply_url) ||
    (Array.isArray(d.pdf_urls) && d.pdf_urls.length > 0) ||
    (typeof j.apply_url === "string" && /\.pdf(\?|#|$)/i.test(j.apply_url));
  if (secs.length > 0) withSections++;
  if (hasPdf) {
    withPdf++;
    if (!secs.length) {
      pdfNoSections++;
      if (pdfNoSecSamples.length < 8) {
        pdfNoSecSamples.push({ slug: j.slug, title: String(j.title).slice(0, 70) });
      }
    }
  }
}

const sample = live.find((j) => (j.detail?.content_sections?.length || 0) >= 3);

console.log("── Live job detail coverage (Supabase) ──");
console.log(`  Live jobs:           ${live.length}`);
console.log(`  With PDF:            ${withPdf} (${((100 * withPdf) / live.length).toFixed(1)}%)`);
console.log(`  With content_sections: ${withSections} (${((100 * withSections) / live.length).toFixed(1)}%)`);
console.log(`  PDF but no sections: ${pdfNoSections}`);
if (sample) {
  const secs = sample.detail.content_sections;
  console.log(`\n  Sample with PDF sections: ${sample.slug}`);
  console.log(`    sections: ${secs.length}`);
  console.log(`    headings: ${secs.slice(0, 6).map((s) => s.heading).join(" | ")}`);
}
if (pdfNoSecSamples.length) {
  console.log("\n  PDF jobs missing sections (sample):");
  for (const s of pdfNoSecSamples) console.log(`    • ${s.slug}`);
}
