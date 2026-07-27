#!/usr/bin/env node
/** Fail on frontend source-policy violations and invalid critical static data. */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src')
const frontend = join(src, '..')
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

const criticalFiles = [
  join(frontend, 'public', 'data', 'live-jobs.json'),
  join(frontend, 'package.json'),
]

for (const file of criticalFiles) {
  const content = readFileSync(file, 'utf8')
  if (/^(<<<<<<<|=======|>>>>>>>) /m.test(content) || /^(<<<<<<<|=======|>>>>>>>)$/m.test(content)) {
    console.error(`✗ Unresolved merge conflict in ${file}`)
    process.exit(1)
  }
  try {
    JSON.parse(content)
  } catch (error) {
    console.error(`✗ Invalid JSON in ${file}: ${error.message}`)
    process.exit(1)
  }
}

console.log('✓ critical frontend JSON is valid and conflict-free')
