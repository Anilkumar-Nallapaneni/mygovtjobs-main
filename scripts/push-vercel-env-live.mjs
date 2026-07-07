#!/usr/bin/env node
/** Push production env to Vercel (livegovtjobs.com primary, supabase jobs). */
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync(process.execPath, ['scripts/push-vercel-env.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    GO_LIVE: '1',
    VERCEL_SITE_URL: process.env.VERCEL_SITE_URL || 'https://livegovtjobs.com',
  },
})
process.exit(r.status ?? 1)
