/** Local routing harness for built artifacts. Does not deploy or host FastAPI. */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'frontend/dist');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
function staticFile(path) {
  const file = resolve(dist, `.${path}`);
  if (!file.startsWith(`${dist}${sep}`) && file !== dist) return null;
  for (const candidate of [file, `${file}.html`, join(file, 'index.html')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}
function matches(source, path) {
  if (source.endsWith('/:path*')) {
    const prefix = source.slice(0, -'/:path*'.length);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return source === path;
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  let file = staticFile(path);
  if (!file && !path.startsWith('/api/')) {
    const rewrite = config.rewrites.find(rule => matches(rule.source, path) && rule.destination === '/');
    if (rewrite) file = staticFile('/');
  }
  const status = file ? 200 : 404;
  if (!file) file = join(dist, '404.html');
  res.writeHead(status, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
}).listen(3691, '127.0.0.1', () => console.log('Built-output routing harness: http://127.0.0.1:3691 (not Vercel runtime certification)'));
