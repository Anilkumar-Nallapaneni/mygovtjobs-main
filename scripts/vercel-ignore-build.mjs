#!/usr/bin/env node
/**
 * Vercel Ignore Build Step — exit 0 = skip build, exit 1 = proceed.
 *
 * Skip builds for RSS-only data commits so a flaky/broken live-jobs snapshot
 * on main is not redeployed every 4 hours by fetch-official-feeds.
 *
 * Docs: https://vercel.com/docs/project-configuration/git-settings#ignored-build-step
 */
import { execSync } from 'node:child_process'

function commitMessage() {
  try {
    return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim()
  } catch {
    return process.env.VERCEL_GIT_COMMIT_MESSAGE || ''
  }
}

const msg = commitMessage()
const skipPatterns = [
  /^chore\(data\):\s*refresh official RSS snapshot/i,
  /\[skip vercel]/i,
]

if (skipPatterns.some((re) => re.test(msg))) {
  console.log(`⏭ Skipping Vercel build for commit: ${msg.split('\n')[0]}`)
  process.exit(0)
}

console.log('▶ Proceeding with Vercel build')
process.exit(1)
