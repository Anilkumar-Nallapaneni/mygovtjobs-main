#!/usr/bin/env node
/** Fail if legacy .js/.jsx exist under frontend/src (TS-only policy). */
import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src')
const bad = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|jsx)$/.test(name)) bad.push(p.replace(/\\/g, '/').split('/frontend/src/')[1] || name)
  }
}

walk(src)
if (bad.length) {
  console.error('✗ Remove legacy JS from frontend/src:', bad.join(', '))
  process.exit(1)
}
console.log('✓ frontend/src is TS-only (no stray .js/.jsx)')
