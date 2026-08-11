#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { basename, extname, join } from 'path'
import { gzipSync } from 'zlib'
import { fileURLToPath } from 'url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = join(root, 'frontend', 'dist')
const publicData = join(root, 'frontend', 'public', 'data')

const budgets = {
  maxJsChunkGzip: Number(process.env.BUDGET_MAX_JS_CHUNK_GZIP || 130 * 1024),
  maxCssChunkGzip: Number(process.env.BUDGET_MAX_CSS_CHUNK_GZIP || 16 * 1024),
  maxBootstrapRaw: Number(process.env.BUDGET_MAX_BOOTSTRAP_RAW || 50 * 1024),
  maxListRaw: Number(process.env.BUDGET_MAX_LIST_RAW || 4 * 1024 * 1024),
}

if (!existsSync(dist)) {
  console.error('✗ frontend/dist is missing; run npm run build first')
  process.exit(1)
}

const failures = []
const assets = join(dist, 'assets')
for (const name of readdirSync(assets)) {
  const file = join(assets, name)
  if (!statSync(file).isFile()) continue
  const extension = extname(name)
  if (extension !== '.js' && extension !== '.css') continue
  const gzipBytes = gzipSync(readFileSync(file)).length
  const limit = extension === '.js' ? budgets.maxJsChunkGzip : budgets.maxCssChunkGzip
  if (gzipBytes > limit) {
    failures.push(`${name}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip > ${(limit / 1024).toFixed(1)} KiB`)
  }
}

for (const [name, limit] of [
  ['live-jobs-bootstrap.json', budgets.maxBootstrapRaw],
  ['live-jobs-list.json', budgets.maxListRaw],
]) {
  const file = join(publicData, name)
  const bytes = statSync(file).size
  if (bytes > limit) failures.push(`${basename(file)}: ${(bytes / 1024).toFixed(1)} KiB raw > ${(limit / 1024).toFixed(1)} KiB`)
}

if (failures.length) {
  console.error(`✗ performance budget exceeded:\n${failures.map((item) => `  - ${item}`).join('\n')}`)
  process.exit(1)
}
console.log('✓ JS, CSS and catalog artifacts are within performance budgets')
