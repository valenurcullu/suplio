import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.NAVES_SOURCE;
if (!source) throw new Error('Set NAVES_SOURCE to the original Naves del Sur source directory. Existing local assets already suffice to render V3.');
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const copied = [
  'estilos/style.css', 'estilos/bootstrap.min.css',
  'imagenes/naves3.png', 'imagenes/indPetrolera.webp',
  'imagenes/bombasImg/j2.jpeg', 'imagenes/bombasImg/NEA5.jpeg',
];
const manifest = [];
for (const file of copied) {
  const output = path.join(root, 'assets', file);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const buffer = await fs.readFile(path.join(source, file));
  await fs.writeFile(output, buffer);
  manifest.push({ file, source: path.join(source, file), sha256: crypto.createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length });
}
await fs.mkdir(path.join(root, 'assets/fonts'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const index = await fs.readFile(path.join(source, 'index.html'), 'utf8');
  const products = await fs.readFile(path.join(source, 'productos.html'), 'utf8');
  const fragments = await page.evaluate(({ index, products }) => {
    const parser = new DOMParser();
    const home = parser.parseFromString(index, 'text/html');
    const catalog = parser.parseFromString(products, 'text/html');
    const main = catalog.querySelector('main.container');
    const heading = main.querySelector('.row.justify-content-center').outerHTML;
    const row = main.querySelector('.row.row-cols-1').cloneNode(true);
    [...row.children].slice(2).forEach(child => child.remove());
    return {
      hero: home.querySelector('.custom-header').outerHTML + '<main>' + home.querySelector('.hero-section').outerHTML + '</main>',
      catalog: '<main class="container mb-5 py-4">' + heading + row.outerHTML + '</main>',
    };
  }, { index, products });
  const stylesheetUrls = [
    ['roboto.css', 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap'],
    ['icons.css', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'],
  ];
  let fontIndex = 0;
  const downloaded = new Map();
  for (const [name, url] of stylesheetUrls) {
    const response = await context.request.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' } });
    if (!response.ok()) throw new Error(`Stylesheet ${url}: ${response.status()}`);
    let css = await response.text();
    const urls = [...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1].replace(/['"]/g, '')).filter(item => /\.woff2(?:\?|$)/.test(item)))];
    for (const value of urls) {
      const absolute = new URL(value, url).href;
      let local = downloaded.get(absolute);
      if (!local) {
        local = `font-${String(fontIndex++).padStart(2, '0')}.woff2`;
        const fontResponse = await context.request.get(absolute);
        if (!fontResponse.ok()) throw new Error(`Font ${absolute}: ${fontResponse.status()}`);
        const buffer = await fontResponse.body();
        await fs.writeFile(path.join(root, 'assets/fonts', local), buffer);
        manifest.push({ file: `fonts/${local}`, source: absolute, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length });
        downloaded.set(absolute, local);
      }
      css = css.split(value).join(local);
    }
    await fs.writeFile(path.join(root, 'assets/fonts', name), css);
  }
  for (const [mode, html] of Object.entries(fragments)) {
    const fragment = html.replaceAll('./imagenes/', 'assets/imagenes/');
    const document = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="assets/estilos/bootstrap.min.css"><link rel="stylesheet" href="assets/fonts/roboto.css"><link rel="stylesheet" href="assets/fonts/icons.css"><link rel="stylesheet" href="assets/estilos/style.css"><style>html{scroll-behavior:auto}html,body{margin:0;overflow:hidden}*,*::before,*::after{animation:none!important;transition:none!important}body{min-height:100vh}a,button{pointer-events:none} .hero-section{background:none} .hero-photo{position:absolute;inset:0;background:url('assets/imagenes/indPetrolera.webp') center/cover} .line-mask{display:block;overflow:clip;padding-block:2px;margin-block:-2px} .line-inner{display:block;will-change:transform} </style></head><body>${html}<script>const hero=document.querySelector('.hero-section');if(hero){const photo=document.createElement('div');photo.className='hero-photo';hero.prepend(photo);}document.querySelectorAll('[loading]').forEach(img=>img.loading='eager');</script></body></html>`;
    await fs.writeFile(path.join(root, `${mode}.html`), document.replace(html, fragment));
  }
  await fs.writeFile(path.join(root, 'assets/manifest.json'), JSON.stringify({ source, note: 'Original HTML fragments; styles and images copied byte-for-byte. Font CSS URLs rewritten for offline rendering.', files: manifest }, null, 2));
  console.log(`Prepared ${copied.length} original files, ${downloaded.size} fonts, and original DOM fragments.`);
} finally { await browser.close(); }
