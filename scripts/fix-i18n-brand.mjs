#!/usr/bin/env node
/** Replace legacy domain prefix in brand.logoAlt / brand.homeAria with localized brand name. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'frontend/src/i18n/localeOverrides')

function brandLabel(brand) {
  if (brand?.name?.trim()) return brand.name.trim()
  const primary = (brand?.primary || '').trim()
  const accent = (brand?.accent || '').trim()
  if (primary && accent) return `${primary} ${accent}`
  return primary || accent || 'Live Govt Jobs'
}

function rebuildBrandString(value, label) {
  if (typeof value !== 'string') return value
  const parts = value.split(/\s*[-–—]\s*/)
  if (parts.length < 2) return value
  const suffix = parts.slice(1).join(' — ')
  return `${label} — ${suffix}`
}

let fixed = 0
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.json')) continue
  const path = join(dir, file)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const label = brandLabel(data.brand)
  const nextLogoAlt = rebuildBrandString(data.brand?.logoAlt, label)
  const nextHomeAria = rebuildBrandString(data.brand?.homeAria, label)
  if (nextLogoAlt === data.brand?.logoAlt && nextHomeAria === data.brand?.homeAria) continue
  data.brand.logoAlt = nextLogoAlt
  data.brand.homeAria = nextHomeAria
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
  fixed++
  console.log('fixed:', path)
}
console.log('fixed files:', fixed)
