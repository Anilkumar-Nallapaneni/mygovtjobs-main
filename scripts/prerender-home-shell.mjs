#!/usr/bin/env node
/**
 * Post-build: enrich dist/index.html LCP shell with bootstrap job cards
 * and catalog-wide stats from homeShellStats / live-jobs.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = join(root, 'frontend/dist/index.html')
const bootstrapPath = join(root, 'frontend/public/data/live-jobs-bootstrap.json')
const livePath = join(root, 'frontend/public/data/live-jobs.json')
const statsPath = join(root, 'frontend/src/data/homeShellStats.ts')
const CARD_COUNT = Number(process.env.HOME_SHELL_CARD_COUNT || 4)

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function loadJsonItems(path) {
  if (!existsSync(path)) return []
  try {
    const payload = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(payload.items) ? payload.items : []
  } catch {
    return []
  }
}

function catalogStats() {
  const live = loadJsonItems(livePath)
  if (live.length) {
    const countable = live.filter((row) => Number(row?.vacancies) > 0)
    const vacancies = countable.reduce((sum, row) => sum + (Number(row.vacancies) || 0), 0)
    const orgs = new Set(
      live.map((row) => String(row?.dept || row?.organization || '').trim()).filter(Boolean)
    ).size
    return { notifications: live.length, vacancies, orgs: Math.max(orgs, 1) }
  }
  if (existsSync(statsPath)) {
    const src = readFileSync(statsPath, 'utf8')
    const notifications = Number(/notifications:\s*(\d+)/.exec(src)?.[1] || 0)
    const vacancies = Number(/vacancies:\s*(\d+)/.exec(src)?.[1] || 0)
    const orgs = Number(/orgs:\s*(\d+)/.exec(src)?.[1] || 1)
    return { notifications, vacancies, orgs }
  }
  return null
}

function formatVacancies(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ''
  return `${v.toLocaleString('en-IN')} posts`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Display format matching frontend/src/utils/formatJobDate.ts (`4 Sep 2026`). */
function formatJobDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim())
  if (!iso) return ''
  const day = Number(iso[3])
  const month = MONTHS[Number(iso[2]) - 1]
  if (!month || day < 1) return ''
  return `${day} ${month} ${iso[1]}`
}

function cardHtml(job) {
  const title = escapeHtml(job.title || job.post_name || 'Government recruitment')
  const dept = escapeHtml(job.dept || '')
  const vac = formatVacancies(job.vacancies)
  const last = formatJobDate(job.last_date)
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

  const jobs = loadJsonItems(bootstrapPath).slice(0, CARD_COUNT)
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
  }

  const stats = catalogStats()
  if (stats && stats.notifications > 0) {
    const statsLine = `${stats.vacancies.toLocaleString('en-IN')} vacancies · ${stats.notifications} notifications · ${stats.orgs} orgs`
    const statsRe = /(<div class="static-app-shell__stats">)[^<]*(<\/div>)/
    if (!statsRe.test(html)) {
      console.warn('prerender-home-shell: stats marker not found')
    } else {
      html = html.replace(statsRe, `$1${escapeHtml(statsLine)}$2`)
      console.log(`prerender-home-shell: stats ${statsLine}`)
    }
  }

  if (!html.includes('id="lcp-shell"')) {
    console.warn('prerender-home-shell: id="lcp-shell" missing — update index.html')
  }

  writeFileSync(distIndex, html, 'utf8')
}

main()
