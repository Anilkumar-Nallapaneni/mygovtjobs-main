import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freePort } from './free-e2e-port.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.E2E_PORT || '4321';
const e2eDist = path.join(root, 'dist-e2e');

if (!existsSync(path.join(e2eDist, 'index.html'))) {
  console.error('Missing frontend/dist-e2e — run `npm run build:e2e` before E2E tests.');
  process.exit(1);
}

freePort(port);

const child = spawn(
  'npx',
  ['vite', 'preview', '--outDir', 'dist-e2e', '--host', '127.0.0.1', '--port', port, '--strictPort'],
  { cwd: root, stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 0));
