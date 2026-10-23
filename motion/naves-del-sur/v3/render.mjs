import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startServer } from '../server.mjs';
import { frames, review, reports } from './paths.mjs';
const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const sharp = require('sharp');
const preview = process.argv.includes('--preview');
const output = preview ? review : frames;
await fs.mkdir(reports, { recursive: true });
await fs.mkdir(output, { recursive: true });
const server = await startServer(0);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const requests = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { errors.push(`External dependency: ${route.request().url()}`); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { requests.push(response.url()); if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}/v3/index.html?render=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.motionReady, { timeout: 30000 });
  const dimensions = await page.evaluate(() => ({ duration: window.motion.duration, initialViewport: window.motion.inspect(), fonts: [...document.querySelector('#web-frame').contentDocument.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, weight: f.weight })) }));
  console.log(JSON.stringify(dimensions));
  if (errors.length) throw new Error(errors.join('\n'));
  // Prime image resampling caches before the first captured frame.
  for (const time of [2.5, 5.2, 9.5, 12.6, 0]) await page.evaluate(async time => { window.motion.seek(time); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, time);
  const count = Math.round(dimensions.duration * 30);
  const times = preview ? [0, .4, 1.3, 2.5, 2.74, 3.2, 3.85, 4.8, 5.35, 5.6, 5.85, 6.05, 6.25, 6.43, 6.54, 6.65, 7.2, 7.6, 7.85, 8.1, 8.4, 8.7, 9.1, 9.8, 10.5, 10.98, 11.1, 11.3, 11.5, 11.8, (count - 1) / 30] : Array.from({ length: count }, (_, i) => i / 30);
  const interactionSamples = [];
  for (const [index, time] of times.entries()) {
    const sample = await page.evaluate(async time => { window.motion.seek(time); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); window.motion.settle(); await new Promise(resolve => requestAnimationFrame(resolve)); return window.motion.inspect(); }, time);
    interactionSamples.push(sample);
    if (sample.cursorEdgeError !== null && sample.cursorEdgeError > .2) throw new Error('Cursor detached from window edge');
    if (Math.abs(sample.cssWidth - sample.viewportWidth) > 1) throw new Error('Responsive viewport did not update');
    await page.screenshot({ path: path.join(output, `${String(index).padStart(5, '0')}.png`), animations: 'allow' });
    if (!preview && index % 60 === 0) console.log(`Rendered ${index}/${count}`);
  }
  const first = await sharp(path.join(output, '00000.png')).raw().toBuffer();
  const last = await sharp(path.join(output, `${String(times.length - 1).padStart(5, '0')}.png`)).raw().toBuffer();
  let difference = 0;
  for (let i = 0; i < first.length; i++) difference += Math.abs(first[i] - last[i]);
  const loopMeanAbsoluteDifference = difference / first.length;
  const report = { ...dimensions, width: 1280, height: 720, fps: 30, frameCount: times.length, times: preview ? times : undefined, interactionSamples, firstLastPixelIdentical: first.equals(last), loopMeanAbsoluteDifference, externalDependencies: requests.filter(url => new URL(url).hostname !== '127.0.0.1'), errors };
  await fs.writeFile(path.join(reports, preview ? 'keyframes.json' : 'render-report.json'), JSON.stringify(report, null, 2));
  if (loopMeanAbsoluteDifference > .05) throw new Error('Visible difference between loop endpoints');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Complete: ${times.length} frames; loop endpoint difference ${loopMeanAbsoluteDifference.toFixed(6)} / 255.`);
} catch (error) { console.error('Render errors:', errors); throw error; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
