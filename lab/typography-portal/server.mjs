import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(root, '../..');
const modules = path.join(project, 'web/node_modules');
const publicDir = path.join(project, 'web/public');
const files = new Map([
  ['/', path.join(root, 'index.html')],
  ['/index.html', path.join(root, 'index.html')],
  ['/style.css', path.join(root, 'style.css')],
  ['/portal.js', path.join(root, 'portal.js')],
  ['/glyph.json', path.join(root, 'glyph.json')],
  ['/vendor/gsap.min.js', path.join(modules, 'gsap/dist/gsap.min.js')],
  ['/vendor/ScrollTrigger.min.js', path.join(modules, 'gsap/dist/ScrollTrigger.min.js')],
  ['/fonts/space-grotesk.woff2', path.join(modules, '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2')],
  ['/fonts/inter.woff2', path.join(modules, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')],
  ['/brand/light.svg', path.join(publicDir, 'brand/suplio-horizontal-claro.svg')],
  ['/brand/dark.svg', path.join(publicDir, 'brand/suplio-horizontal-oscuro.svg')],
  ['/media/showcase.mp4', path.join(publicDir, 'projects/naves-del-sur/motion/motion-showcase-v3.mp4')],
  ['/media/poster.webp', path.join(publicDir, 'projects/naves-del-sur/motion/poster.webp')],
]);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webp': 'image/webp' };
export function startServer(port = 4340) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost'), file = files.get(url.pathname);
      if (!file) { res.writeHead(404).end('Not found'); return; }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
      const stat = await fs.stat(file);
      const headers = { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      let start = 0, end = stat.size - 1, status = 200;
      if (range) {
        start = Number(range[1]); end = Math.min(Number(range[2] || end), end);
        if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
        status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = end - start + 1;
      res.writeHead(status, headers);
      if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
    } catch { if (!res.headersSent) res.writeHead(500); res.end('Local asset unavailable'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server)); });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const server = await startServer(Number(process.env.PORT ?? 4340)); console.log(`Suplio motion lab: http://127.0.0.1:${server.address().port}/`); }
