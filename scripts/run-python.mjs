#!/usr/bin/env node
/**
 * Run a script with backend/.venv Python (works on Windows + macOS/Linux).
 * Usage: node scripts/run-python.mjs scripts/run-ingest-direct.py --limit 20
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const py = join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");

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
  ...process.env,
  PYTHONUNBUFFERED: "1",
  PYTHONUTF8: "1",
  ...loadEnvFile(join(root, ".env")),
  ...loadEnvFile(join(root, "backend", ".env")),
};

if (!existsSync(py)) {
  console.error(`Python venv not found:\n  ${py}`);
  console.error("\nSetup once:");
  console.error("  cd backend");
  console.error("  python -m venv .venv");
  console.error(isWin ? "  .venv\\Scripts\\activate" : "  source .venv/bin/activate");
  console.error("  pip install -r requirements.txt");
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/run-python.mjs <script.py> [args…]");
  process.exit(1);
}

const result = spawnSync(py, args, { stdio: "inherit", cwd: root, env: scriptEnv });
process.exit(result.status ?? 1);
