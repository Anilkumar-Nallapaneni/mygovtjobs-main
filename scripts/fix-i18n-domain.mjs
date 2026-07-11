#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dirs = [
  'frontend/src/i18n/localeOverrides',
  'frontend/scripts/trees/flats',
  'frontend/src/i18n/locales',
];

let fixed = 0;
for (const dir of dirs) {
  const full = join(root, dir);
  if (!existsSync(full)) continue;
  for (const file of readdirSync(full)) {
    if (!file.endsWith('.json')) continue;
    const path = join(full, file);
    let text = readFileSync(path, 'utf8');
    const orig = text;
    text = text.replace(/"domain": "govtjobs\.me[^"]*"/g, '"domain": "livegovtjobs.com"');
    text = text.replace(/"brand\.domain": "govtjobs\.me[^"]*"/g, '"brand.domain": "livegovtjobs.com"');
    text = text.replace(/govtjobs\.me/g, 'livegovtjobs.com');
    if (text !== orig) {
      writeFileSync(path, text);
      fixed++;
      console.log('fixed:', path);
    }
  }
}
console.log('fixed files:', fixed);
