import { execSync } from 'node:child_process';

/** Stop any process listening on the E2E preview port (stale vite preview from prior runs). */
export function freePort(port) {
  const target = String(port);

  if (process.platform === 'win32') {
    let out = '';
    try {
      out = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {
      return;
    }
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const match = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
      if (!match || match[1] !== target) continue;
      pids.add(match[2]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        /* already gone */
      }
    }
    return;
  }

  try {
    execSync(`fuser -k ${target}/tcp 2>/dev/null`, { stdio: 'ignore', shell: true });
  } catch {
    try {
      const pids = execSync(`lsof -ti tcp:${target}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
        .trim()
        .split('\n')
        .filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* port free */
    }
  }
}
