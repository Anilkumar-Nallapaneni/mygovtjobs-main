#!/usr/bin/env node
/**
 * Post-build: enrich dist/index.html LCP shell with real bootstrap jobs.
 * Keeps first paint meaningful without waiting for React hydrate.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = join(root, 'frontend/dist/index.html')
const bootstrapPath = join(root, 'frontend/public/data/live-jobs-bootstrap.json')
const CARD_COUNT = Number(process.env.HOME_SHELL_CARD_COUNT || 4)

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function loadBootstrapJobs() {
  if (!existsSync(bootstrapPath)) return []
  const payload = JSON.parse(readFileSync(bootstrapPath, 'utf8'))
  return Array.isArray(payload.items) ? payload.items : []
}

function formatVacancies(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ''
  return `${v.toLocaleString('en-IN')} posts`
}

function cardHtml(job) {
  const title = escapeHtml(job.title || job.post_name || 'Government recruitment')
  const dept = escapeHtml(job.dept || '')
  const vac = formatVacancies(job.vacancies)
  const last = job.last_date ? escapeHtml(String(job.last_date).slice(0, 10)) : ''
  const meta = [vac, last ? `Apply by ${last}` : ''].filter(Boolean).join(' · ')
  return `<article class="static-app-shell__job">
  <h3 class="static-app-shell__job-title">${title}</h3>
  ${dept ? `<p class="static-app-shell__job-dept">${dept}</p>` : ''}
  ${meta ? `<p class="static-app-shell__job-meta">${meta}</p>` : ''}
</article>`
}

function main() {
  if (!existsSync(distIndex)) {
    console.error(`Missing ${distIndex} — run vite build first`)
    process.exit(1)
  }

  const jobs = loadBootstrapJobs().slice(0, CARD_COUNT)
  let html = readFileSync(distIndex, 'utf8')

  if (jobs.length) {
    const cards = jobs.map(cardHtml).join('\n            ')
    const next = html.replace(
      /<div class="static-app-shell__cards"[^>]*>[\s\S]*?<\/div>\s*<\/section>/,
      `<div class="static-app-shell__cards" data-prerendered="1">
            ${cards}
          </div>
          </section>`
    )
    if (next === html) {
      console.warn('prerender-home-shell: cards marker not found — skipped job cards')
    } else {
      html = next
      console.log(`prerender-home-shell: injected ${jobs.length} job cards into LCP shell`)
    }

    const live = jobs.filter((j) => !j.status || j.status === 'live').length || jobs.length
    const vacSum = jobs.reduce((sum, j) => sum + (Number(j.vacancies) || 0), 0)
    const statsLine = `${vacSum.toLocaleString('en-IN')}+ vacancies · ${live} latest notices · official sources`
    html = html.replace(
      /(<div class="static-app-shell__stats">)[^<]*(<\/div>)/,
      `$1${escapeHtml(statsLine)}$2`
    )
  }

  // Ensure shell sits outside #root (islands LCP) if an older build still nested it.
  if (!html.includes('id="lcp-shell"')) {
    console.warn('prerender-home-shell: id="lcp-shell" missing — update index.html')
  }

  writeFileSync(distIndex, html, 'utf8')
}

main()
