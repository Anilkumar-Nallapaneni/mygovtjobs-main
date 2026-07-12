#!/usr/bin/env node
/** Regenerate PWA / Android icons from frontend/public/app-icon.png (does not touch logo.png wordmark). */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const py =
  process.platform === 'win32'
    ? join(root, 'backend', '.venv', 'Scripts', 'python.exe')
    : join(root, 'backend', '.venv', 'bin', 'python3')
const script = join(root, 'scripts', 'generate-app-icons.py')

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!existsSync(py)) {
  console.error('Python venv not found — run: cd backend && python -m venv .venv && pip install -r requirements.txt')
  process.exit(1)
}

const check = spawnSync(py, ['-c', 'import PIL, numpy'], { stdio: 'pipe' })
if (check.status !== 0) {
  console.log('Installing Pillow + numpy into backend/.venv …')
  run(py, ['-m', 'pip', 'install', 'Pillow>=11.0.0', 'numpy>=2.0.0'])
}

run(py, [script])

