#!/usr/bin/env node
/**
 * One-shot production setup (GitHub + Supabase + Vercel only — no Railway).
 *   npm run setup:production
 */
import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args, label) {
  console.log(`\n── ${label} ──`)
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: true, stdio: 'inherit' })
  return r.status === 0
}

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

console.log('=== My Govt Jobs — production setup ===')
console.log('Stack: GitHub + Supabase + Vercel (no Railway)\n')

const fe = loadEnv(join(root, 'frontend', '.env.local'))

// 1. GitHub secrets
const gh = process.platform === 'win32' ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh'
const ghExists = existsSync(gh) || spawnSync('gh', ['--version'], { shell: true }).status === 0
if (ghExists) {
  run('npm', ['run', 'github:secrets:push'], 'GitHub Actions secrets')
} else {
  console.log('\n── GitHub Actions secrets ──')
  console.log('○ Install GitHub CLI: winget install GitHub.cli')
  console.log('  Then: gh auth login && npm run github:secrets:push')
}

// 2. Vercel env
run('npm', ['run', 'vercel:env:push:live'], 'Vercel production env')

// 3. Status
console.log('\n── Google (you do these in browser) ──')
if (!fe.VITE_GOOGLE_SITE_VERIFICATION) {
  console.log('○ Search Console: sign in with GMAIL → add https://www.livegovtjobs.com')
  console.log('  Copy HTML tag token → npm run google:verify -- YOUR_TOKEN')
} else {
  console.log('✓ VITE_GOOGLE_SITE_VERIFICATION in .env.local — redeploy if not done')
}

if (!fe.VITE_GA_MEASUREMENT_ID?.startsWith('G-')) {
  console.log('○ Analytics: analytics.google.com → create property → copy G- ID')
  console.log('  Add VITE_GA_MEASUREMENT_ID=G-XXX to frontend/.env.local')
  console.log('  Then: npm run vercel:env:push:live && npm run vercel:deploy')
} else {
  console.log('✓ VITE_GA_MEASUREMENT_ID in .env.local')
}

console.log('\n── contact@livegovtjobs.com ──')
console.log('○ Not a Google login — optional inbox (Zoho/Cloudflare Email Routing)')
console.log('  Site contact page now shows contact@livegovtjobs.com')

console.log('\n── Deploy site ──')
console.log('  npm run vercel:deploy')
console.log('\n── After Search Console verified ──')
console.log('  Sitemaps → submit: sitemap.xml')
console.log('\nFull guide: docs/GO_LIVE.md')
