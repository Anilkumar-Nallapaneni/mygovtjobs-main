import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  process.exit(0);
}

try {
  fs.rmSync(dist, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 250,
  });
} catch (err) {
  if (err?.code === 'ENOENT') process.exit(0);
  console.error(`Failed to remove ${dist}: ${err.message}`);
  console.error('Stop any running `vite preview` / E2E webserver, then retry.');
  process.exit(1);
}
