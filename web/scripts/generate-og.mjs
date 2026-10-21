import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

// Embed the supplied wordmark unchanged; rasterize only this derived social asset.
const original = await readFile(new URL('../public/brand/suplio-horizontal-claro.svg', import.meta.url), 'utf8');
const logo = original.replace(/<svg[^>]*>/, '<svg x="150" y="170" width="900" height="286" viewBox="0 0 378.113786 120">');
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#F5F4F0"/><path d="M60 60H1140M60 570H1140" stroke="#E3E0D8"/>${logo}<rect y="616" width="1200" height="14" fill="#FF5A1F"/></svg>`;
await sharp(Buffer.from(artwork)).png().toFile(new URL('../public/og.png', import.meta.url).pathname);
console.log('Generated public/og.png (1200 × 630).');
