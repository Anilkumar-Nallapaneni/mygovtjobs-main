#!/usr/bin/env node
/**
 * Save Google Search Console verification to frontend/.env.local
 *
 * Meta tag method (recommended):
 *   npm run google:verify -- abc123token456
 *
 * HTML file method:
 *   npm run google:verify -- --file google123abc.html
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'frontend', '.env.local')
const publicDir = join(root, 'frontend', 'public')

const args = process.argv.slice(2)
if (!args.length) {
  console.log('Usage:')
  console.log('  Meta tag:  npm run google:verify -- YOUR_TOKEN')
  console.log('  HTML file: npm run google:verify -- --file googleXXXXXXXX.html')
  console.log('\nGet token from Search Console → Verify → HTML tag or HTML file')
  process.exit(1)
}

function upsertEnv(key, value) {
  let lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : []
  const prefix = `${key}=`
  let found = false
  lines = lines.map((line) => {
    if (line.startsWith(prefix) || line.startsWith(`# ${prefix}`)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) lines.push(`${key}=${value}`)
  writeFileSync(envPath, lines.filter((l, i, a) => !(i === a.length - 1 && l === '')).join('\n') + '\n')
}

if (args[0] === '--file') {
  const filename = args[1]
  if (!filename || !filename.endsWith('.html')) {
    console.error('Provide filename like google1234567890abcdef.html')
    process.exit(1)
  }
  const body = `google-site-verification: ${filename}`
  writeFileSync(join(publicDir, filename), body)
  console.log(`✓ Wrote frontend/public/${filename}`)
  console.log('  Deploy: npm run vercel:deploy')
  console.log('  Then click Verify in Search Console')
} else {
  const token = args[0].trim()
  upsertEnv('VITE_GOOGLE_SITE_VERIFICATION', token)
  console.log('✓ Saved VITE_GOOGLE_SITE_VERIFICATION to frontend/.env.local')
  console.log('  Next: npm run vercel:env:push:live && npm run vercel:deploy')
  console.log('  Then click Verify in Search Console')
}
