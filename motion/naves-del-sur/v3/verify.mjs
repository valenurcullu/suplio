import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { startServer } from '../server.mjs';
import { root, review, reports, movie } from './paths.mjs';
const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const { chromium } = require('@playwright/test'), sharp = require('sharp');
const run = promisify(execFile);
await fs.mkdir(review, { recursive: true });
await fs.mkdir(reports, { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(root, '../assets/manifest.json'), 'utf8'));
for (const file of manifest.files) assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root, '../assets', file.file))).digest('hex'), file.sha256, `Original resource changed: ${file.file}`);
const render = JSON.parse(await fs.readFile(path.join(reports, 'render-report.json'), 'utf8'));
const drag = render.interactionSamples.filter(sample => sample.time >= 6.65 && sample.time <= 9.1);
assert.equal(render.frameCount, 378);
assert(new Set(drag.map(sample => sample.viewportWidth)).size > 60, 'Resize was not continuous');
assert.equal(drag[0].viewportWidth, 1440); assert.equal(drag.at(-1).viewportWidth, 390);
for (let i = 0; i < drag.length; i++) {
  const sample = drag[i];
  if (i) assert(sample.viewportWidth <= drag[i - 1].viewportWidth);
  assert.equal(sample.navbarMobile, sample.viewportWidth < 992, 'Original menu breakpoint did not run');
  assert(sample.cursorEdgeError < .2);
  assert(Math.abs(sample.viewportWidth - sample.cssWidth) < 1);
  assert.equal(sample.titleText.replace(/\s+/g, ' ').trim(), 'Fabricantes de Bombas a Tornillo para la Industria');
}
assert(new Set(drag.map(sample => sample.titleHeight)).size >= 3, 'Text did not reflow');
const closing = render.interactionSamples.filter(s => s.time >= 11.1 && s.logo.visible);
for (const sample of closing) assert(sample.logo.bottom <= sample.whiteBottom + .1, `Logo over uncovered interface at ${sample.time}s`);
const report = { closingLogoAlwaysOverWhite: true, originalResourceHashesVerified: manifest.files.length, realResponsiveFrames: drag.length, distinctViewportWidths: new Set(drag.map(sample => sample.viewportWidth)).size, maximumCursorEdgeError: Math.max(...drag.map(sample => sample.cursorEdgeError)), originalBreakpointVerified: true, originalTitleVerified: true, playback: [], encodedResizeSamples: [], errors: [] };
const server = await startServer(0), browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  for (const format of ['mp4']) {
    await page.goto(`http://127.0.0.1:${server.address().port}/v3/player.html`, { waitUntil: 'networkidle' });
    const video = page.locator('video');
    await video.evaluate((v, format) => { v.pause(); v.src = '/delivery/motion-showcase-v3.mp4'; v.load(); }, format);
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    const info = await video.evaluate(v => ({ width: v.videoWidth, height: v.videoHeight, duration: v.duration, error: v.error?.message ?? null }));
    assert.equal(info.width, 1280); assert.equal(info.height, 720); assert(Math.abs(info.duration - 12.6) < .01); assert.equal(info.error, null);
    const loops = await video.evaluate(async v => { v.playbackRate = 3; v.currentTime = 0; let previous = 0, wraps = 0, stalled = 0; v.addEventListener('stalled', () => stalled++); await v.play(); const start = performance.now(); while (wraps < 2 && performance.now() - start < 20000) { await new Promise(r => setTimeout(r, 60)); if (v.currentTime < previous - 1) wraps++; previous = v.currentTime; } v.pause(); return { wraps, stalled, error: v.error?.message ?? null }; });
    assert.equal(loops.wraps, 2); assert.equal(loops.error, null);
    report.playback.push({ format, ...info, ...loops });
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/v3/player.html`, { waitUntil: 'networkidle' });
  await page.locator('video').evaluate(async v => { v.pause(); v.currentTime = 7.85; await new Promise(r => v.addEventListener('seeked', r, { once: true })); });
  await page.screenshot({ path: path.join(review, 'player.png') });
  assert.deepEqual(report.errors, []);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
const indices = [0, 12, 39, 75, 82, 96, 116, 144, 159, 165, 171, 177, 183, 189, 193, 196, 201, 216, 228, 237, 244, 252, 262, 272, 294, 315, 324, 333, 339, 345, 354, 377];
const select = indices.map(i => `eq(n\\,${i})`).join('+');
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', movie, '-vf', `select=${select}`, '-fps_mode', 'vfr', path.join(review, 'encoded-%02d.png')]);
for (const i of [216, 228, 237, 244, 252, 262, 272]) {
  const sample = render.interactionSamples[i];
  const data = await sharp(path.join(review, `encoded-${String(indices.indexOf(i) + 1).padStart(2, '0')}.png`)).removeAlpha().raw().toBuffer();
  let best = { x: 0, count: 0 };
  for (let x = Math.floor(sample.edge.x) - 7; x <= Math.ceil(sample.edge.x) + 7; x++) {
    let count = 0;
    for (let y = 120; y < 610; y++) { const n = (y * 1280 + x) * 3; if (data[n] < 140 && data[n + 1] > 140 && data[n + 2] > 210 && data[n + 2] > data[n] + 60) count++; }
    if (count > best.count) best = { x, count };
  }
  const borderError = Math.abs(best.x - sample.edge.x);
  let cursorWhitePixels = 0;
  for (let y = Math.round(sample.cursor.y) - 8; y <= Math.round(sample.cursor.y) + 8; y++) for (let x = Math.round(sample.cursor.x) - 18; x <= Math.round(sample.cursor.x) + 18; x++) {
    const n = (y * 1280 + x) * 3; if (data[n] > 245 && data[n + 1] > 245 && data[n + 2] > 245) cursorWhitePixels++;
  }
  report.encodedResizeSamples.push({ frame: i, time: i / 30, viewportWidth: sample.viewportWidth, cyanBorderPixels: best.count, borderError, cursorWhitePixels });
  assert(best.count > 180 && borderError < 4, `Encoded border detached at ${i / 30}s`);
  assert(cursorWhitePixels > 10, `Cursor not visible in MP4 at ${i / 30}s`);
}
const first = await sharp(path.join(review, 'encoded-01.png')).raw().toBuffer(), last = await sharp(path.join(review, `encoded-${String(indices.length).padStart(2, '0')}.png`)).raw().toBuffer();
let difference = 0; for (let i = 0; i < first.length; i++) difference += Math.abs(first[i] - last[i]);
report.encodedLoopMeanAbsoluteDifference = difference / first.length; assert(report.encodedLoopMeanAbsoluteDifference < .25);
const signal = path.join(review, 'signalstats.txt');
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', movie, '-vf', `signalstats,metadata=print:file=${signal}`, '-f', 'null', '-']);
const stats = await fs.readFile(signal, 'utf8');
const differences = [...stats.matchAll(/lavfi\.signalstats\.YDIF=([\d.]+)/g)].map(m => Number(m[1]));
report.decodedFrames = differences.length; assert.equal(differences.length, 378);
report.maxAdjacentLumaDifference = Math.max(...differences); report.peakMotionTime = differences.indexOf(report.maxAdjacentLumaDifference) / 30;
const bridgeDifferences = differences.slice(159, 197);
report.catalogToResponsivePeakLumaDifference = Math.max(...bridgeDifferences);
// Build the visual-review sheet from the decoded, compressed video, never from
// the original render frames. Keep the labels tied to frame indices.
const columns = 4, thumbWidth = 384, thumbHeight = 240, layers = [];
for (const [i, frame] of indices.entries()) {
  const x = i % columns * thumbWidth, y = Math.floor(i / columns) * thumbHeight;
  layers.push({ input: await sharp(path.join(review, `encoded-${String(i + 1).padStart(2, '0')}.png`)).resize(thumbWidth, 216).toBuffer(), left: x, top: y + 24 });
  layers.push({ input: Buffer.from(`<svg width="384" height="24"><rect width="384" height="24" fill="white"/><text x="8" y="17" font-family="Arial" font-size="15">MP4 V3 · ${(frame / 30).toFixed(3)} s</text></svg>`), left: x, top: y });
}
await sharp({ create: { width: columns * thumbWidth, height: Math.ceil(indices.length / columns) * thumbHeight, channels: 3, background: '#ddd' } }).composite(layers).png().toFile(path.join(review, 'exported-sheet.png'));
await fs.writeFile(path.join(reports, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
