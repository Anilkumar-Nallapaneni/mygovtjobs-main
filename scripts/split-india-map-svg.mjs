/**
 * Split frontend/public/india.svg into one SVG per state under frontend/public/maps/states/.
 * Each file keeps the full India viewBox; the map component zooms to the state at runtime.
 * Run: npm run map:split-states
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "frontend/public/india.svg");
const OUT_DIR = join(ROOT, "frontend/public/maps/states");
const INDIA_VIEWBOX = "0 0 611.85999 695.70178";
const ASH_FILL = "#DDE3ED";

const indiaSvg = readFileSync(SOURCE, "utf8");
mkdirSync(OUT_DIR, { recursive: true });

const $ = cheerio.load(indiaSvg, { xmlMode: true });
const paths = $("path[id^='IN-']");

const pathById = new Map();
paths.each((_, el) => {
  const path = $(el);
  const id = path.attr("id");
  const d = path.attr("d");
  const title = path.attr("title") || id;
  if (!id || !d) return;
  pathById.set(id, { id, d, title: String(title) });
});

function writeStateSvg(fileId, title, pathMarkup) {
  const safeTitle = String(title).replace(/"/g, "&quot;");
  const markup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${INDIA_VIEWBOX}" preserveAspectRatio="xMidYMid meet">
${pathMarkup}
</svg>
`;
  writeFileSync(join(OUT_DIR, `${fileId}.svg`), markup, "utf8");
}

function pathLine({ id, d, title }) {
  const safeTitle = String(title).replace(/"/g, "&quot;");
  return `  <path id="${id}" data-name="${safeTitle}" d="${d}" fill="${ASH_FILL}" stroke="none" stroke-width="0"/>`;
}

/** Scale simplified mini-map path (520×580) to full India viewBox coordinates. */
function scaleMiniPath(d) {
  const sx = 611.85999 / 520;
  const sy = 695.70178 / 580;
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g);
  if (!tokens?.length) return d;
  let coord = 0;
  return tokens
    .map((token) => {
      if (/^[a-zA-Z]$/.test(token)) {
        coord = token === "M" || token === "L" ? 0 : coord;
        return token;
      }
      const n = parseFloat(token);
      const scaled = coord % 2 === 0 ? n * sx : n * sy;
      coord += 1;
      return scaled.toFixed(3).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
    })
    .join(" ")
    .replace(/(\d) (\d)/g, "$1,$2");
}

let written = 0;
for (const entry of pathById.values()) {
  writeStateSvg(entry.id, entry.title, pathLine(entry));
  written += 1;
}

// Ladakh — not a separate path in india.svg; matches simplified STATES `la` silhouette.
const ladakhMini =
  "M205,18 L288,17 L302,42 L276,70 L218,70 L200,50 Z";
writeStateSvg(
  "IN-LA",
  "Ladakh",
  pathLine({ id: "IN-LA", d: scaleMiniPath(ladakhMini), title: "Ladakh" })
);
written += 1;

// NE States composite — grouped region on the homepage map.
const neIds = ["IN-AR", "IN-AS", "IN-MN", "IN-ML", "IN-MZ", "IN-NL", "IN-TR", "IN-SK"];
const nePaths = neIds
  .map((id) => pathById.get(id))
  .filter(Boolean)
  .map((entry) => pathLine(entry))
  .join("\n");
writeStateSvg("IN-NE", "Northeast India", nePaths);
written += 1;

// Dadra & Nagar Haveli and Daman and Diu (merged UT, internal id `dd`).
const dhIds = ["IN-DD", "IN-DN"];
const dhPaths = dhIds
  .map((id) => pathById.get(id))
  .filter(Boolean)
  .map((entry) => pathLine(entry))
  .join("\n");
writeStateSvg("IN-DH", "Dadra and Nagar Haveli and Daman and Diu", dhPaths);
written += 1;

console.log(`Wrote ${written} state SVGs to frontend/public/maps/states/`);
