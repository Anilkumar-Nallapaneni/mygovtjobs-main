/**
 * Fills scripts/trees/flats/{lang}.json from en.json via Google Translate.
 * Usage: node scripts/fill-locale-flats.mjs [te] [ta] ...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countFilled, toFlat } from "./i18n-en-flat.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FLATS_DIR = path.join(__dirname, "trees/flats");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8"));
const enFlat = toFlat(en);

/** All scheduled Indian UI locales (ISO 639) → Google Translate `tl` code. */
const TARGETS = {
  hi: "hi",
  bn: "bn",
  te: "te",
  mr: "mr",
  ta: "ta",
  gu: "gu",
  kn: "kn",
  ml: "ml",
  pa: "pa",
  or: "or",
  as: "as",
  ur: "ur",
  kok: "gom",
  mni: "mni",
  ne: "ne",
  sd: "sd",
  sa: "sa",
  sat: "sat",
  mai: "mai",
  doi: "doi",
  brx: "brx",
  ks: "ks",
};

const MIN_FILLED = 150;

function protectPlaceholders(text) {
  const slots = [];
  const safe = text.replace(/\{[a-zA-Z_][\w]*\}/g, (m) => {
    const token = `__PH_${slots.length}__`;
    slots.push([token, m]);
    return token;
  });
  return { safe, slots };
}

function restorePlaceholders(text, slots) {
  let out = text;
  for (const [token, original] of slots) {
    out = out.split(token).join(original);
  }
  return out;
}

async function translate(text, tl) {
  if (!text?.trim()) return text;
  const { safe, slots } = protectPlaceholders(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(safe)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return restorePlaceholders(
    json[0].map((x) => x[0]).join(""),
    slots
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run async tasks with a concurrency cap (faster than one-by-one + long sleeps). */
async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const TRANSLATE_CONCURRENCY = 8;
const TRANSLATE_BATCH_PAUSE_MS = 120;

const paths = Object.keys(enFlat);
const only = process.argv.slice(2);
const langs = only.length ? only.filter((c) => TARGETS[c]) : Object.keys(TARGETS);

fs.mkdirSync(FLATS_DIR, { recursive: true });

for (const lang of langs) {
  const tl = TARGETS[lang];
  const outPath = path.join(FLATS_DIR, `${lang}.json`);
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
  } catch {
    /* new */
  }

  const missingCount = paths.filter((p) => !existing[p]?.trim()).length;
  if (missingCount === 0) {
    console.log(`[${lang}] skip — all ${paths.length} strings present`);
    continue;
  }

  console.log(`\n[${lang}] → ${tl} (${missingCount} new of ${paths.length} strings)`);
  const missingPaths = paths.filter((p) => !existing[p]?.trim());
  for (let batchStart = 0; batchStart < missingPaths.length; batchStart += TRANSLATE_CONCURRENCY) {
    const batch = missingPaths.slice(batchStart, batchStart + TRANSLATE_CONCURRENCY);
    await mapPool(batch, TRANSLATE_CONCURRENCY, async (p) => {
      try {
        existing[p] = await translate(enFlat[p], tl);
      } catch (e) {
        console.warn(`  skip ${p}:`, e.message);
        existing[p] = enFlat[p];
      }
    });
    fs.writeFileSync(outPath, JSON.stringify(existing));
    const done = Math.min(batchStart + batch.length, missingPaths.length);
    process.stdout.write(`  ${done}/${missingPaths.length}\r`);
    if (batchStart + TRANSLATE_CONCURRENCY < missingPaths.length) {
      await sleep(TRANSLATE_BATCH_PAUSE_MS);
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`  wrote ${outPath} (${countFilled(existing)} strings)`);
}

console.log("\nDone. Run: npm run i18n:generate");
