#!/usr/bin/env node
/** Generate Play Console icons + header banner from the website wordmark logo. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'play-store-assets')
const logoSrc = join(outDir, 'website-logo-original.png')

mkdirSync(outDir, { recursive: true })

if (!existsSync(logoSrc)) {
  try {
    const buf = execSync('git show HEAD:frontend/public/logo.png', { cwd: root })
    writeFileSync(logoSrc, buf)
  } catch {
    throw new Error('website-logo-original.png missing — restore frontend/public/logo.png from git first')
  }
}

const logoMeta = await sharp(logoSrc).metadata()
const logoW = logoMeta.width ?? 520
const logoH = logoMeta.height ?? 225

async function wordmarkOnSquare(size, bg = '#FFFFFF') {
  const pad = Math.round(size * 0.08)
  const maxW = size - pad * 2
  const maxH = size - pad * 2
  const scale = Math.min(maxW / logoW, maxH / logoH)
  const w = Math.round(logoW * scale)
  const h = Math.round(logoH * scale)
  const logo = await sharp(logoSrc).resize(w, h).png().toBuffer()
  const left = Math.round((size - w) / 2)
  const top = Math.round((size - h) / 2)
  return sharp({
    create: { width: size, height: size, channels: 3, background: bg },
  })
    .composite([{ input: logo, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const icon512 = await wordmarkOnSquare(512)
await sharp(icon512).toFile(join(outDir, 'developer-icon-512.png'))
await sharp(icon512).toFile(join(outDir, 'app-icon-512.png'))
await sharp(await wordmarkOnSquare(192)).toFile(join(outDir, 'app-icon-192.png'))

const bannerW = 4096
const bannerH = 2304
const bannerScale = Math.min((bannerW * 0.72) / logoW, (bannerH * 0.55) / logoH)
const bannerLogoW = Math.round(logoW * bannerScale)
const bannerLogoH = Math.round(logoH * bannerScale)
const bannerLogo = await sharp(logoSrc).resize(bannerLogoW, bannerLogoH).png().toBuffer()

const bannerSvg = Buffer.from(`<svg width="${bannerW}" height="${bannerH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${bannerW}" height="${bannerH}" fill="#FFFFFF"/>
  <text x="${Math.round(bannerW / 2)}" y="${Math.round(bannerH * 0.78)}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="72" font-weight="500" fill="#475569">Latest government job vacancies across India</text>
  <text x="${Math.round(bannerW / 2)}" y="${Math.round(bannerH * 0.84)}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="56" font-weight="400" fill="#64748B">SSC · UPSC · Railways · Banking · State PSC</text>
</svg>`)

await sharp(bannerSvg)
  .composite([
    {
      input: bannerLogo,
      left: Math.round((bannerW - bannerLogoW) / 2),
      top: Math.round(bannerH * 0.18),
    },
  ])
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(join(outDir, 'developer-header-4096x2304.jpg'))

const readme = `# Play Store assets — My Govt Jobs

Generated from the **website wordmark** (\`website-logo-original.png\`) — same logo shown in the site navbar.

## Files

| File | Size | Use in Play Console |
|------|------|---------------------|
| developer-icon-512.png | 512×512 | Developer profile → Developer icon |
| developer-header-4096x2304.jpg | 4096×2304 | Developer profile → Header image (< 1 MB JPEG) |
| app-icon-512.png | 512×512 | App → Store listing → App icon |
| app-icon-192.png | 192×192 | Reference size |
| website-logo-original.png | 520×225 | Source wordmark from live site |

## Regenerate

\`\`\`bash
node scripts/generate-play-store-assets.mjs
\`\`\`
`

writeFileSync(join(outDir, 'README.md'), readme)

console.log(`Play Store assets written to: ${outDir}`)
for (const name of [
  'developer-icon-512.png',
  'developer-header-4096x2304.jpg',
  'app-icon-512.png',
  'app-icon-192.png',
  'website-logo-original.png',
]) {
  const meta = await sharp(join(outDir, name)).metadata()
  console.log(`  ${name} — ${meta.width}x${meta.height}`)
}
