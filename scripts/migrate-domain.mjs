#!/usr/bin/env node
/** One-time domain migration: govtjobs.me → www.livegovtjobs.com */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const skipDirs = new Set(['node_modules', '.git', 'dist', 'dist-e2e', '.venv', 'coverage', 'playwright-report', 'test-results', 'logs']);
const skipFiles = new Set(['vercel.json', 'migrate-domain.mjs']);

const replacements = [
  ['https://api.govtjobs.me', 'https://api.livegovtjobs.com'],
  ['https://www.govtjobs.me', 'https://www.livegovtjobs.com'],
  ['https://govtjobs.me', 'https://www.livegovtjobs.com'],
  ['https://livegovtjobs.com', 'https://www.livegovtjobs.com'],
  ['contact@govtjobs.me', 'contact@livegovtjobs.com'],
  ['alerts@govtjobs.me', 'alerts@livegovtjobs.com'],
];

function walk(dir, cb) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

let changed = 0;
walk(root, (file) => {
  const base = file.split(/[/\\]/).pop();
  if (skipFiles.has(base)) return;
  if (!/\.(json|ts|tsx|md|mjs|py|yaml|toml|xml|txt|html|ps1|production)$/.test(file)) return;
  if (file.includes('live-jobs.json') || file.includes('live-jobs-list') || file.includes('live-jobs-bootstrap')) return;

  let text = readFileSync(file, 'utf8');
  if (!text.includes('govtjobs.me') && !text.includes('livegovtjobs.com')) return;

  const orig = text;
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  if (text !== orig) {
    writeFileSync(file, text);
    changed++;
    console.log('updated:', relative(root, file));
  }
});

console.log('files changed:', changed);
