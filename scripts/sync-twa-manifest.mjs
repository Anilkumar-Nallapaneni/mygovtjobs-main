#!/usr/bin/env node
/** Copy Vite PWA manifest → Android TWA raw resource + update checksum. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'frontend/dist/manifest.webmanifest')
const dest = join(root, 'android-twa/app/src/main/res/raw/web_app_manifest.json')
const checksumPath = join(root, 'android-twa/manifest-checksum.txt')

if (!existsSync(src)) {
  console.error('Missing frontend/dist/manifest.webmanifest — run `npm run build` first.')
  process.exit(1)
}

const json = JSON.stringify(JSON.parse(readFileSync(src, 'utf8')))
writeFileSync(dest, json)
const hash = createHash('sha256').update(json).digest('hex')
writeFileSync(checksumPath, `${hash}\n`)
console.log('Synced TWA manifest →', dest)
console.log('Updated checksum →', checksumPath, hash)
