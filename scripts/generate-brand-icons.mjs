#!/usr/bin/env node
/** Render favicon.svg → logo.png, pwa-192.png, pwa-512.png for PWA / OG / favicon. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'public')
const svg = readFileSync(join(publicDir, 'favicon.svg'))

const targets = [
  ['logo.png', 256],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
]

for (const [name, size] of targets) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, name))
  console.log(`wrote ${name} (${size}x${size})`)
}
