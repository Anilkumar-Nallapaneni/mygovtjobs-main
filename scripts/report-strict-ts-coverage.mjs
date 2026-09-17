#!/usr/bin/env node
/**
 * Report how much of frontend/src is in tsconfig.strict.json.
 * Prints a single line for CI logs. Does not fail the build.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend");
const srcRoot = join(frontendRoot, "src");
const tsconfigPath = join(frontendRoot, "tsconfig.strict.json");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) acc.push(full);
  }
  return acc;
}

const all = walk(srcRoot);
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
const include = new Set(
  (tsconfig.include || []).map((entry) => String(entry).replace(/\\/g, "/"))
);
const covered = all.filter((file) => {
  const rel = relative(frontendRoot, file).replace(/\\/g, "/");
  return include.has(rel);
});
const pct = all.length ? ((covered.length / all.length) * 100).toFixed(1) : "0.0";
console.log(
  `strict TypeScript coverage: ${covered.length}/${all.length} files (${pct}%)`
);
