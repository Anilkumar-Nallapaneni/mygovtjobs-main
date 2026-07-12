#!/usr/bin/env node
/** Regenerate PWA / Android icons from frontend/public/app-icon.png (does not touch logo.png wordmark). */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const py = process.platform === 'win32' ? join(root, 'backend', '.venv', 'Scripts', 'python.exe') : 'python3'
const script = join(root, 'scripts', 'generate-app-icons.py')

const run = spawnSync(py, [script], { stdio: 'inherit', cwd: root })
if (run.status !== 0) process.exit(run.status ?? 1)
