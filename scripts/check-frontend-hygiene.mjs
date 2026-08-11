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

const deployableFiles = []

function collectDeployable(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) collectDeployable(file)
    else if (/\.(json|xml)$/i.test(name)) deployableFiles.push(file)
  }
}

collectDeployable(join(frontend, 'public'))
deployableFiles.push(join(frontend, 'package.json'))

const conflictMarker = /^(<<<<<<<(?: .*)?|=======$|>>>>>>>(?: .*)?)$/m

for (const file of deployableFiles) {
  const content = readFileSync(file, 'utf8')
  if (conflictMarker.test(content)) {
    console.error(`✗ Unresolved merge conflict in ${file}`)
    process.exit(1)
  }
  if (/\.json$/i.test(file)) {
    try {
      JSON.parse(content)
    } catch (error) {
      console.error(`✗ Invalid JSON in ${file}: ${error.message}`)
      process.exit(1)
    }
  } else {
    const rootCount = (content.match(/<(urlset|sitemapindex)\b/g) || []).length
    const closeCount = (content.match(/<\/(urlset|sitemapindex)>/g) || []).length
    if (!content.startsWith('<?xml') || rootCount !== 1 || closeCount !== 1) {
      console.error(`✗ Invalid sitemap XML structure in ${file}`)
      process.exit(1)
    }
    const locs = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    if (locs.some((loc) => !/^https:\/\//.test(loc) || /&(?!amp;|lt;|gt;|quot;|apos;)/.test(loc))) {
      console.error(`✗ Invalid or unescaped <loc> in ${file}`)
      process.exit(1)
    }
    if (new Set(locs).size !== locs.length) {
      console.error(`✗ Duplicate <loc> in ${file}`)
      process.exit(1)
    }
  }
}

console.log(`✓ ${deployableFiles.length} deployable JSON/XML files are valid and conflict-free`)
