import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const gsap = path.resolve(root, '../../web/node_modules/gsap/dist/gsap.min.js');
const publicMotion = path.resolve(root, '../../web/public/projects/naves-del-sur/motion');
// Explicit files only: the local production archive is never exposed by this server.
const delivery = new Map(['motion-showcase-v3.mp4', 'poster.webp'].map(name => [`/delivery/${name}`, path.join(publicMotion, name)]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
export function startServer(port = 4330) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.startsWith('/delivery/') && !delivery.has(pathname)) { res.writeHead(404).end(); return; }
      const file = delivery.get(pathname) ?? (pathname === '/vendor/gsap.min.js' ? gsap : path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
      if (file !== gsap && !delivery.has(pathname) && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const stat = await fs.stat(file);
      const mime = types[path.extname(file)] ?? 'application/octet-stream';
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]), end = Math.min(Number(range[2] || stat.size - 1), stat.size - 1);
        if (start >= stat.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
        res.writeHead(206, { 'Content-Type': mime, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
        if (req.method === 'HEAD') { res.end(); return; }
        const handle = await fs.open(file); const data = Buffer.alloc(end - start + 1); await handle.read(data, 0, data.length, start); await handle.close(); res.end(data);
      } else { res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : await fs.readFile(file)); }
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server)); });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const server = await startServer(Number(process.env.PORT ?? 4330)); console.log(`Motion preview: http://127.0.0.1:${server.address().port}`); }
