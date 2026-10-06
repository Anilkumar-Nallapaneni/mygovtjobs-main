#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const isWin = process.platform === "win32";
const candidates = isWin
  ? [join(root, ".venv", "Scripts", "python.exe"), join(backend, ".venv", "Scripts", "python.exe")]
  : [join(root, ".venv", "bin", "python"), join(backend, ".venv", "bin", "python")];
const py = candidates.find(existsSync) || (isWin ? "python" : "python3");

function loadEnvFile(path) {
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
const scriptEnv = {
  ...process.env, PYTHONUNBUFFERED: "1", PYTHONUTF8: "1",
  ...loadEnvFile(join(root, ".env")), ...loadEnvFile(join(backend, ".env")),
  PYTHONPATH: [backend, process.env.PYTHONPATH || ""].filter(Boolean).join(isWin ? ";" : ":"),
};
const args = process.argv.slice(2).filter((a) => a !== "--");
if (!args.length) { console.error("Usage: node scripts/run-python.mjs <script.py> [args…]"); process.exit(1); }
const result = spawnSync(py, args, { stdio: "inherit", cwd: root, env: scriptEnv });
if (result.error) { console.error(result.error); process.exit(1); }
process.exit(result.status ?? 1);
