/**
 * Report translation coverage in scripts/trees/flats/*.json vs en.json.
 * Usage: node scripts/audit-locale-flats.mjs [te] [hi] ...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toFlat } from "./i18n-en-flat.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FLATS_DIR = path.join(__dirname, "trees/flats");
const FLAT_MIN = 150;

const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/locales/en.json"), "utf8"));
const enFlat = toFlat(en);
const enKeys = Object.keys(enFlat);

const only = process.argv.slice(2);
const langs = only.length
  ? only
  : fs
      .readdirSync(FLATS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort();

let exitCode = 0;

for (const lang of langs) {
  const flatPath = path.join(FLATS_DIR, `${lang}.json`);
  let flat;
  try {
    flat = JSON.parse(fs.readFileSync(flatPath, "utf8"));
  } catch (e) {
    console.log(`${lang}: INVALID JSON — ${e.message}`);
    exitCode = 1;
    continue;
  }

  const missing = enKeys.filter((k) => !flat[k]);
  const english = enKeys.filter((k) => flat[k] === enFlat[k]);
  const broken = enKeys.filter((k) => flat[k] && /\{\{count\}_\}/.test(String(flat[k])));
  const filled = Object.keys(flat).length;
  const status = filled >= FLAT_MIN ? "flat" : "partial";

  console.log(
    `${lang.padEnd(4)} ${status.padEnd(7)} ${filled}/${enKeys.length} keys | missing ${missing.length} | still-English ${english.length}${broken.length ? ` | broken placeholders ${broken.length}` : ""}`
  );

  if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
  if (english.length && english.length <= 15) console.log(`  still-English: ${english.join(", ")}`);
  if (broken.length) console.log(`  broken: ${broken.join(", ")}`);

  if (status === "partial" || missing.length || broken.length) exitCode = 1;
}

process.exit(exitCode);
