#!/usr/bin/env node
/** Start FastAPI with backend/.venv (no manual activate). */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const isWin = process.platform === "win32";
const py = join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");

if (!existsSync(py)) {
  console.error(`Python venv not found: ${py}`);
  console.error("\nSetup once:");
  console.error("  cd backend");
  console.error("  python -m venv .venv");
  console.error(isWin ? "  .venv\\Scripts\\pip install -r requirements.txt" : "  .venv/bin/pip install -r requirements.txt");
  process.exit(1);
}

const child = spawn(
  py,
  ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
  { cwd: backend, stdio: "inherit", env: process.env }
);

child.on("exit", (code) => process.exit(code ?? 1));
