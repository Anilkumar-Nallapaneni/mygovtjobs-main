#!/usr/bin/env node
/**
 * Website Health Agent (Agent 4) — audits code, data, Supabase, API, deploy, analytics.
 *
 *   npm run health:website              # fast: assets, env, stack, data (~30–90s)
 *   npm run health:website:code         # + typecheck, lint, tests
 *   npm run health:website:full         # + code + production verify + live probes
 *   npm run health:website -- --json    # machine-readable report
 *
 * Env overrides:
 *   SITE_URL=https://www.livegovtjobs.com
 *   API_HEALTH_URL=https://api.livegovtjobs.com/health
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const wantFull = args.has('--full') || process.env.HEALTH_FULL === '1'
const wantCode = wantFull || args.has('--code') || process.env.HEALTH_CODE === '1'
const wantJson = args.has('--json')
const wantQuiet = args.has('--quiet')
const modeLabel = wantFull ? 'full' : wantCode ? 'code' : 'fast'

const SITE_URL = (process.env.SITE_URL || 'https://www.livegovtjobs.com').replace(/\/$/, '')
function resolveApiHealthUrl() {
  if (process.env.API_HEALTH_URL) return process.env.API_HEALTH_URL
  const raw = (process.env.VITE_API_URL || 'https://api.livegovtjobs.com').replace(/\/$/, '')
  return raw.endsWith('/health') ? raw : `${raw}/health`
}
const API_HEALTH_URL = resolveApiHealthUrl()

/** @typedef {'pass'|'fail'|'warn'|'skip'} Status */
/** @typedef {{ id: string, layer: string, label: string, status: Status, detail?: string, fix?: string, durationMs?: number }} Finding */

/** @type {Finding[]} */
const findings = []

function log(msg) {
  if (!wantQuiet) console.log(msg)
}

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/**
 * @param {string} id
 * @param {string} layer
 * @param {string} label
 * @param {Status} status
 * @param {string} [detail]
 * @param {string} [fix]
 * @param {number} [durationMs]
 */
function record(id, layer, label, status, detail, fix, durationMs) {
  findings.push({ id, layer, label, status, detail, fix, durationMs })
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'warn' ? '⚠' : '○'
  const extra = detail ? ` — ${detail}` : ''
  log(`${icon} [${layer}] ${label}${extra}`)
}

/**
 * @param {string} id
 * @param {string} layer
 * @param {string} label
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {{ fix?: string, optional?: boolean, timeoutMs?: number }} [opts]
 */
function runNpm(id, layer, label, cmd, cmdArgs, opts = {}) {
  const started = Date.now()
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    timeout: opts.timeoutMs ?? 600_000,
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  const durationMs = Date.now() - started
  const ok = r.status === 0
  const tail = [r.stdout, r.stderr]
    .filter(Boolean)
    .join('\n')
    .trim()
    .split('\n')
    .slice(-4)
    .join(' | ')
    .slice(0, 240)

  if (ok) {
    record(id, layer, label, 'pass', tail || `${durationMs}ms`, undefined, durationMs)
    return true
  }
  if (opts.optional) {
    record(id, layer, label, 'warn', tail || `exit ${r.status}`, opts.fix, durationMs)
    return false
  }
  record(id, layer, label, 'fail', tail || `exit ${r.status}`, opts.fix, durationMs)
  return false
}

/**
 * @param {string} label
 * @param {string} url
 * @param {{ expectSubstr?: string, expectOk?: boolean, optional?: boolean, fix?: string }} [opts]
 */
async function probe(id, layer, label, url, opts = {}) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'user-agent': 'mygovtjobs-website-health-agent/1.0' },
    })
    const body = await res.text()
    const durationMs = Date.now() - started
    const okHttp = opts.expectOk === false ? true : res.ok
    const okBody = !opts.expectSubstr || body.includes(opts.expectSubstr)
    if (okHttp && okBody) {
      record(id, layer, label, 'pass', `HTTP ${res.status} (${durationMs}ms)`, undefined, durationMs)
      return true
    }
    record(
      id,
      layer,
      label,
      opts.optional ? 'warn' : 'fail',
      `HTTP ${res.status} (${durationMs}ms)`,
      opts.fix || `Check ${url} and fix deploy/API`,
      durationMs,
    )
    return false
  } catch (err) {
    record(
      id,
      layer,
      label,
      opts.optional ? 'warn' : 'fail',
      err instanceof Error ? err.message : String(err),
      opts.fix || `Ensure ${url} is reachable`,
    )
    return false
  }
}

function checkStaticAssets() {
  const paths = [
    ['frontend/src/App.tsx', 'App shell'],
    ['frontend/public/data/live-jobs.json', 'Live jobs snapshot'],
    ['frontend/public/data/live-jobs-list.json', 'Live jobs list'],
    ['frontend/public/sitemap.xml', 'Sitemap'],
    ['frontend/public/robots.txt', 'Robots'],
    ['vercel.json', 'Root Vercel config'],
  ]
  for (const [rel, label] of paths) {
    const ok = existsSync(join(root, rel))
    record(
      `asset:${rel}`,
      'code',
      label,
      ok ? 'pass' : 'fail',
      ok ? rel : 'missing',
      ok ? undefined : `Restore ${rel}`,
    )
  }

  const livePath = join(root, 'frontend/public/data/live-jobs.json')
  if (existsSync(livePath)) {
    try {
      const data = JSON.parse(readFileSync(livePath, 'utf8'))
      const items = Array.isArray(data) ? data : data.items
      const n = Array.isArray(items) ? items.length : 0
      record(
        'data:live-jobs-count',
        'data',
        'live-jobs.json jobs',
        n > 0 ? 'pass' : 'fail',
        `${n} jobs`,
        n > 0 ? undefined : 'Run npm run sync:production or daily:sync then export',
      )
    } catch (err) {
      record(
        'data:live-jobs-parse',
        'data',
        'live-jobs.json parse',
        'fail',
        err instanceof Error ? err.message : String(err),
        'Fix JSON or re-export live jobs',
      )
    }
  }
}

function checkEnvReadiness() {
  const fe = loadEnv(join(root, 'frontend/.env.local'))
  const be = loadEnv(join(root, 'backend/.env'))

  if (!existsSync(join(root, 'frontend/.env.local'))) {
    record(
      'env:fe-file',
      'env',
      'frontend/.env.local',
      'warn',
      'missing (static mode OK locally)',
      'copy frontend/.env.example → frontend/.env.local',
    )
  } else {
    record('env:fe-file', 'env', 'frontend/.env.local', 'pass')
    const hasSb = Boolean(fe.VITE_SUPABASE_URL?.includes('supabase.co') && fe.VITE_SUPABASE_ANON_KEY)
    record(
      'env:fe-supabase',
      'env',
      'Frontend Supabase keys',
      hasSb ? 'pass' : 'warn',
      hasSb ? 'URL + anon present' : 'incomplete',
      'Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY',
    )
    const ga = fe.VITE_GA_MEASUREMENT_ID || ''
    record(
      'env:ga4',
      'analytics',
      'GA4 measurement ID',
      ga.startsWith('G-') ? 'pass' : 'warn',
      ga.startsWith('G-') ? ga : 'not set',
      'Add VITE_GA_MEASUREMENT_ID=G-XXXX then vercel:env:push:live',
    )
  }

  if (!existsSync(join(root, 'backend/.env'))) {
    record(
      'env:be-file',
      'env',
      'backend/.env',
      'warn',
      'missing (API/DB checks may fail)',
      'copy backend/.env.example → backend/.env',
    )
  } else {
    record('env:be-file', 'env', 'backend/.env', 'pass')
    const pooler = be.DATABASE_URL?.includes(':6543/')
    record(
      'env:db-pooler',
      'env',
      'DATABASE_URL transaction pooler',
      pooler ? 'pass' : be.DATABASE_URL ? 'warn' : 'fail',
      pooler ? 'port 6543' : 'expected postgresql+asyncpg://…:6543/…',
      'Use Supabase Transaction pooler URI (port 6543)',
    )
    const admin = be.ADMIN_API_KEY || ''
    record(
      'env:admin-key',
      'env',
      'ADMIN_API_KEY',
      admin && admin !== 'change-me-in-production' ? 'pass' : 'warn',
      admin ? 'set' : 'missing/default',
      'npm run admin:key:generate',
    )
  }
}

async function checkLiveSite() {
  await probe('live:home', 'live', 'Production homepage', `${SITE_URL}/`, {
    expectSubstr: 'html',
  })
  await probe('live:sitemap', 'live', 'Production sitemap', `${SITE_URL}/sitemap.xml`, {
    expectSubstr: 'sitemap',
  })
  await probe('live:robots', 'live', 'Production robots.txt', `${SITE_URL}/robots.txt`)
  await probe('live:jobs-json', 'live', 'Production live-jobs.json', `${SITE_URL}/data/live-jobs.json`, {
    expectSubstr: '{',
  })
  await probe('live:api-health', 'api', 'API /health', API_HEALTH_URL, {
    expectSubstr: 'status',
    optional: true,
    fix: 'Deploy backend (docs/DEPLOY_RAILWAY_RENDER.md) and point api.livegovtjobs.com CNAME at Railway/Render. Browse works via Supabase without it.',
  })
}

function writeReport() {
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: modeLabel,
    siteUrl: SITE_URL,
    apiHealthUrl: API_HEALTH_URL,
    counts: {
      pass: findings.filter((f) => f.status === 'pass').length,
      fail: findings.filter((f) => f.status === 'fail').length,
      warn: findings.filter((f) => f.status === 'warn').length,
      skip: findings.filter((f) => f.status === 'skip').length,
      total: findings.length,
    },
    findings,
    nextFixes: findings
      .filter((f) => f.status === 'fail' || f.status === 'warn')
      .map((f) => ({
        severity: f.status === 'fail' ? 'critical' : 'warning',
        layer: f.layer,
        label: f.label,
        fix: f.fix || 'Investigate failure output above',
        detail: f.detail,
      })),
  }

  const outDir = join(root, 'scripts/output')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'website-health-report.json')
  writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')
  return { summary, outPath }
}

async function main() {
  log(`=== Website Health Agent (${modeLabel}) ===\n`)
  log(`Site: ${SITE_URL}`)
  log(`API:  ${API_HEALTH_URL}\n`)

  log('── Static + env ──')
  checkStaticAssets()
  checkEnvReadiness()

  if (wantCode) {
    log('\n── Code quality ──')
    runNpm('code:hygiene', 'code', 'Frontend TS-only hygiene', 'npm', ['run', 'check:frontend'], {
      fix: 'Remove .js/.jsx under frontend/src; use TypeScript only',
    })
    runNpm('code:typecheck', 'code', 'TypeScript', 'npm', ['run', 'type-check'], {
      fix: 'Fix type errors reported by tsc',
    })
    runNpm('code:lint', 'code', 'ESLint', 'npm', ['run', 'lint'], {
      fix: 'npm run lint --prefix frontend -- --fix (then re-check)',
    })
    runNpm('code:test', 'code', 'Unit tests', 'npm', ['run', 'test'], {
      fix: 'Fix failing Vitest/backend tests',
      timeoutMs: 900_000,
    })
  } else {
    record(
      'code:skipped',
      'code',
      'Typecheck / lint / tests',
      'skip',
      'use --code or --full',
      'npm run health:website:code',
    )
  }

  log('\n── Stack / data ──')
  runNpm('stack:verify', 'code', 'Stack smoke (verify)', 'npm', ['run', 'verify'], {
    fix: 'Restore missing static assets or run npm run dev',
  })
  runNpm('env:align', 'env', 'Env Supabase ref alignment', 'npm', ['run', 'env:check'], {
    fix: 'Align VITE_SUPABASE_URL with backend SUPABASE_URL / DATABASE_URL ref',
    optional: true,
  })
  runNpm('data:supabase-test', 'supabase', 'Supabase REST', 'npm', ['run', 'supabase:test'], {
    fix: 'Check VITE_SUPABASE_URL + anon key; npm run setup:supabase-env',
    optional: true,
  })
  runNpm('data:supabase-audit', 'supabase', 'Supabase table audit', 'npm', ['run', 'supabase:audit'], {
    fix: 'Inspect empty/low tables; run sync:production if jobs empty',
    optional: true,
  })
  runNpm('data:db-test', 'supabase', 'Backend DB pooler', 'npm', ['run', 'db:test'], {
    fix: 'Fix DATABASE_URL (port 6543 pooler) in backend/.env',
    optional: true,
  })
  runNpm('data:jobs-audit', 'data', 'Job quality audit', 'npm', ['run', 'jobs:audit'], {
    fix: 'npm run jobs:audit:strict then scrub noise/aggregators if needed',
    optional: true,
  })
  runNpm('data:live-jobs', 'data', 'Live jobs snapshot strict', 'npm', ['run', 'verify:live-jobs'], {
    fix: 'Re-export live-jobs.json after sync; npm run clean:live-jobs',
    optional: true,
  })

  if (wantFull) {
    log('\n── Full / production ──')
    runNpm('prod:verify', 'deploy', 'verify:production', 'npm', ['run', 'verify:production'], {
      fix: 'Resolve env/DB/job-quality failures before deploy',
      optional: true,
      timeoutMs: 900_000,
    })
    runNpm('prod:build', 'code', 'Production build', 'npm', ['run', 'build'], {
      fix: 'Fix Vite build errors',
    })
    runNpm('prod:vercel-env', 'vercel', 'Vercel jobs-source env', 'npm', ['run', 'vercel:env:check'], {
      fix: 'Set VITE_JOBS_SOURCE=supabase on Vercel; npm run vercel:env:push:live',
      optional: true,
    })
    runNpm('prod:go-live', 'deploy', 'Go-live preflight', 'npm', ['run', 'go-live:check'], {
      fix: 'See docs/GO_LIVE.md for remaining manual steps',
      optional: true,
      timeoutMs: 900_000,
    })

    log('\n── Live site probes ──')
    await checkLiveSite()
  } else {
    record(
      'live:skipped',
      'live',
      'Production probes',
      'skip',
      'use --full for live site + API probes',
      'npm run health:website:full',
    )
  }

  const { summary, outPath } = writeReport()

  log('\n══ Summary ══')
  log(
    `pass=${summary.counts.pass}  fail=${summary.counts.fail}  warn=${summary.counts.warn}  skip=${summary.counts.skip}`,
  )
  log(`Report: ${outPath}`)

  if (summary.nextFixes.length) {
    log('\n── Fix next (priority) ──')
    for (const [i, item] of summary.nextFixes.slice(0, 12).entries()) {
      log(`${i + 1}. [${item.severity}/${item.layer}] ${item.label}`)
      log(`   → ${item.fix}`)
    }
  }

  if (wantJson) {
    console.log(JSON.stringify(summary, null, 2))
  }

  const exitCode = summary.counts.fail > 0 ? 1 : 0
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
