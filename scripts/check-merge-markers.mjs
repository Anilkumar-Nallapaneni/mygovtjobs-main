#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs'
import { extname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const ignored = new Set(['.git', '.venv', 'node_modules', 'dist', '.pytest_cache', 'coverage'])
const textExtensions = new Set([
  '', '.css', '.html', '.java', '.js', '.json', '.jsx', '.md', '.mjs', '.properties',
  '.ps1', '.py', '.sql', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yml', '.yaml',
])
const marker = /^(<<<<<<<(?: .*)?|=======$|>>>>>>>(?: .*)?)$/m
const conflicts = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue
    const file = join(dir, name)
    const info = statSync(file)
    if (info.isDirectory()) walk(file)
    else if (info.size <= 10 * 1024 * 1024 && textExtensions.has(extname(name).toLowerCase())) {
      if (marker.test(readFileSync(file, 'utf8'))) conflicts.push(relative(root, file))
    }
  }
}

walk(root)
if (conflicts.length) {
  console.error(`✗ unresolved merge markers:\n${conflicts.map((file) => `  - ${file}`).join('\n')}`)
  process.exit(1)
}
console.log('✓ repository is free of unresolved merge markers')
