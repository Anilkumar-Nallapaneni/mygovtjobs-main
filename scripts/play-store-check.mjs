#!/usr/bin/env node
/**
 * Play Store / TWA preflight — run before bubblewrap build.
 *   npm run play:store:check
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = process.env.PLAY_STORE_SITE_URL || 'https://www.livegovtjobs.com'
const twaManifestPath = join(root, 'android-twa', 'twa-manifest.json')
const assetLinksPath = join(root, 'frontend', 'public', '.well-known', 'assetlinks.json')

let failed = 0
const ok = (label) => console.log(`✓ ${label}`)
const warn = (label, detail = '') => {
  console.log(`⚠ ${label}`)
  if (detail) console.log(`  ${detail}`)
}
const fail = (label, detail = '') => {
  console.log(`✗ ${label}`)
  if (detail) console.log(`  ${detail}`)
  failed += 1
}

async function probe(label, url, { expectJson, expectSubstr } = {}) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const body = await res.text()
    if (!res.ok) {
      fail(label, `${url} → HTTP ${res.status}`)
      return null
    }
    if (expectSubstr && !body.includes(expectSubstr)) {
      fail(label, `missing expected content at ${url}`)
      return null
    }
    if (expectJson) {
      try {
        return JSON.parse(body)
      } catch {
        fail(label, `invalid JSON at ${url}`)
        return null
      }
    }
    ok(label)
    return body
  } catch (err) {
    fail(label, `${url} → ${err.message}`)
    return null
  }
}

console.log('=== Play Store / TWA preflight ===\n')
console.log(`Site: ${site}\n`)

const twa = JSON.parse(readFileSync(twaManifestPath, 'utf8'))
const assetLinks = JSON.parse(readFileSync(assetLinksPath, 'utf8'))

if (twa.host === 'www.livegovtjobs.com') ok('TWA host = www.livegovtjobs.com')
else fail('TWA host', `expected www.livegovtjobs.com, got ${twa.host}`)

if (twa.packageId === 'me.govtjobs.app') ok('Package ID = me.govtjobs.app')
else fail('Package ID mismatch', twa.packageId)

const fp = assetLinks?.[0]?.target?.sha256_cert_fingerprints?.[0]
if (fp && !fp.includes('REPLACE')) ok('assetlinks.json has SHA-256 fingerprint')
else fail('assetlinks.json', 'add your release keystore SHA-256 fingerprint')

if (existsSync(join(root, 'android-twa', 'android.keystore'))) {
  ok('android.keystore present locally')
} else {
  warn('android.keystore missing', 'run bubblewrap init in android-twa/ to create signing key')
}

await probe('PWA manifest live', `${site}/manifest.webmanifest`, { expectJson: true })
await probe('Digital Asset Links live', `${site}/.well-known/assetlinks.json`, {
  expectSubstr: 'me.govtjobs.app',
})
await probe('Privacy policy page', `${site}/privacy`)
await probe('Job data JSON', `${site}/data/live-jobs-list.json`, { expectSubstr: '"items"' })
await probe('PWA icon 512', `${site}/pwa-512.png`)

const gaEnv = process.env.VITE_GA_MEASUREMENT_ID
if (gaEnv?.startsWith('G-')) ok(`GA4 configured (${gaEnv})`)
else warn('GA4', 'set VITE_GA_MEASUREMENT_ID on Vercel for analytics')

console.log('\n── Play Console checklist (manual) ──')
console.log('  1. Google Play Developer account ($25 one-time)')
console.log('  2. cd android-twa && bubblewrap build  → upload .aab')
console.log('  3. Store listing: screenshots (phone 6.5" + 7" tablet)')
console.log('  4. Privacy policy URL:', `${site}/privacy`)
console.log('  5. Complete Data safety + Content rating')
console.log('  6. Category: News or Business')
console.log('\nFull guide: docs/PLAY_STORE.md')

process.exit(failed ? 1 : 0)
