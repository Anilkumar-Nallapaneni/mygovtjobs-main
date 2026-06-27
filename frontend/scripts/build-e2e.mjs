import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDist = path.join(root, 'dist-e2e');
const env = { ...process.env, VITE_JOBS_SOURCE: 'static' };

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (fs.existsSync(e2eDist)) {
  try {
    fs.rmSync(e2eDist, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  } catch (err) {
    console.error(`Failed to remove ${e2eDist}: ${err.message}`);
    process.exit(1);
  }
}

run('npx', ['tsc']);
run('npx', ['vite', 'build', '--outDir', 'dist-e2e']);
