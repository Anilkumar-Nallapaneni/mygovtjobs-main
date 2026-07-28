import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');
const e2eDist = path.join(root, 'dist-e2e');
const env = { ...process.env, VITE_JOBS_SOURCE: 'static' };
const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const vite = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const dataDir = path.join(root, 'public', 'data');
const backupDir = path.join(root, '.e2e-data-backup');
const e2eJobPath = path.join(root, 'e2e', 'fixtures', 'e2e-test-job.json');
const snapshotFiles = ['live-jobs.json', 'live-jobs-bootstrap.json', 'live-jobs-list.json'];

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function backupDataFiles() {
  fs.mkdirSync(backupDir, { recursive: true });
  for (const name of snapshotFiles) {
    const src = path.join(dataDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, name));
    }
  }
}

function restoreDataFiles() {
  for (const name of snapshotFiles) {
    const backup = path.join(backupDir, name);
    const dest = path.join(dataDir, name);
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, dest);
    }
  }
  try {
    fs.rmSync(backupDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function injectE2eJob() {
  const e2eJob = JSON.parse(fs.readFileSync(e2eJobPath, 'utf8'));
  const snapshot = {
    generatedAt: new Date().toISOString(),
    dailySync: null,
    items: [e2eJob],
  };
  const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
  for (const name of snapshotFiles) {
    fs.writeFileSync(path.join(dataDir, name), payload, 'utf8');
  }
}

if (fs.existsSync(e2eDist)) {
  try {
    fs.rmSync(e2eDist, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  } catch (err) {
    console.error(`Failed to remove ${e2eDist}: ${err.message}`);
    process.exit(1);
  }
}

backupDataFiles();
injectE2eJob();

try {
  run(process.execPath, [tsc]);
  run(process.execPath, [vite, 'build', '--outDir', 'dist-e2e']);
} finally {
  restoreDataFiles();
}
