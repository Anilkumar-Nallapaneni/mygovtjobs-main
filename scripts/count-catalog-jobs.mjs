#!/usr/bin/env node
/**
 * Count jobs the same way the React app does (pipeline + display filter).
 *   echo '{"items":[...]}' | node node_modules/tsx/dist/cli.mjs scripts/count-catalog-jobs.mjs
 *   node node_modules/tsx/dist/cli.mjs scripts/count-catalog-jobs.mjs path/to/live-jobs.json
 */
import { readFileSync } from 'fs'
import { processLiveJobPayload } from '../frontend/src/utils/liveJobsPipeline.ts'
import { filterDisplayJobs } from '../frontend/src/utils/jobFilters.ts'

function loadItems() {
  const file = process.argv[2]
  const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8')
  const data = JSON.parse(raw || '{}')
  return Array.isArray(data) ? data : data.items || []
}

const { rows } = processLiveJobPayload(loadItems())
process.stdout.write(String(filterDisplayJobs(rows).length))
