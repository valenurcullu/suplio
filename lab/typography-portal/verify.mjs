import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { startServer } from './server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const sharp = require('sharp');
const output = path.resolve(root, '../../.production/typography-portal/review');
await fs.mkdir(output, { recursive: true });
const server = await startServer(0), browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = `http://127.0.0.1:${server.address().port}/`;
const report = { viewports: [], reducedMotion: null, noJavaScript: null, resize: null, errors: [] };
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { report.errors.push(`External dependency: ${route.request().url()}`); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  if (options.javaScriptEnabled !== false) await page.waitForFunction(() => window.portalLab);
  return { context, page };
}
async function move(page, progress) {
  await page.evaluate(p => { const s = window.portalLab.inspect(); scrollTo({ top: s.start + (s.end - s.start) * p, behavior: 'instant' }); }, progress);
  await page.waitForFunction(p => Math.abs(window.portalLab.inspect().progress - p) < .001, progress);
  await page.waitForTimeout(80);
  return page.evaluate(() => window.portalLab.inspect());
}
try {
  for (const [width, height] of [[1440,1000],[1280,720],[768,1024],[390,844],[320,568]]) {
    const { context, page } = await open({ viewport: { width, height } });
    assert((await page.evaluate(() => window.portalLab.inspect())).motion);
    await page.locator('video').evaluate(async v => { v.pause(); v.currentTime = 4.8; await new Promise(r => v.addEventListener('seeked', r, { once: true })); });
    const samples = [];
    for (const p of [0,.16,.32,.44,.54,.64,.75,.9,1,.75,.44,.16,0]) {
      const s = await move(page, p); samples.push(s);
      assert(s.viewport.contentWidth <= width, `Overflow at ${width}/${p}`);
      assert.equal(s.triggers, 1);
      if (p === 1) { assert.equal(s.inert, false); await page.screenshot({ path: path.join(output, `${width}-project.png`) }); }
      if (p === .54) await page.screenshot({ path: path.join(output, `${width}-passage.png`) });
    }
    const first = samples[0], returned = samples.at(-1);
    assert.equal(first.viewBox, returned.viewBox, 'Camera failed to return to its original state');
    assert.equal(returned.inert, true);
    await page.screenshot({ path: path.join(output, `${width}-type.png`) });
    // Real keyboard shortcut through the global navigation: skip the entire pin.
    await page.locator('.nav-project').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.portalLab.inspect().progress > .999);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'project-title');
    assert.equal(await page.locator('#proyecto').evaluate(el => el.inert), false);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `A11y ${width}`);
    // Custom controls must really play/pause the original MP4.
    if (await page.locator('video').evaluate(v => v.paused)) await page.locator('.video-toggle').click();
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.locator('.video-toggle').click();
    assert(await page.locator('video').evaluate(v => v.paused));
    const bounds = await page.locator('video').boundingBox();
    assert(bounds.y >= 68 && bounds.y + bounds.height <= height - 35, `Video cropped at ${width}x${height}: ${JSON.stringify(bounds)}`);
    report.viewports.push({ width, height, reversible: true, overflow: false, video: { width: first.video.width, height: first.video.height }, controls: true, keyboardSkip: true, accessibilityViolations: audit.violations.length });
    await context.close();
  }
  {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const s = await page.evaluate(() => window.portalLab.inspect());
    assert(!s.motion && s.triggers === 0 && !s.inert);
    assert(await page.locator('video').evaluate(v => v.paused && v.controls));
    await page.locator('.nav-project').click();
    await page.locator('video').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'reduced-motion.png') });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    report.reducedMotion = { noPin: true, videoPaused: true, nativeControls: true, allContentVisible: true };
    await context.close();
  }
  {
    const { context, page } = await open({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    assert.equal(await page.locator('.is-motion').count(), 0);
    assert(await page.locator('h1').count());
    await page.locator('video').scrollIntoViewIfNeeded();
    assert(await page.locator('video').isVisible());
    assert(await page.locator('video').getAttribute('controls') !== null);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(output, 'no-js.png') });
    report.noJavaScript = { contentVisible: true, nativeVideo: true, overflow: false };
    await context.close();
  }
  {
    const { context, page } = await open();
    await move(page, .52);
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
    let s = await page.evaluate(() => window.portalLab.inspect()); assert(s.triggers === 1 && s.viewport.contentWidth <= 390);
    await move(page, .6); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(300);
    s = await page.evaluate(() => window.portalLab.inspect()); assert(!s.motion && s.triggers === 0 && !s.inert);
    for (const selector of ['.type-meta','.project-heading','.project-label','.project-camera']) assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).opacity), '1');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(300);
    s = await page.evaluate(() => window.portalLab.inspect()); assert(s.motion && s.triggers === 1);
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
    s = await page.evaluate(() => window.portalLab.inspect()); assert(!s.motion && s.triggers === 0 && s.viewport.contentWidth <= 844);
    report.resize = { desktopToMobile: true, preferenceChangeRestoresFlow: true, noDuplicateTriggers: true, shortLandscapeFlow: true };
    await context.close();
  }
  {
    const { context, page } = await open();
    await page.goto(url + '#proyecto'); await page.waitForFunction(() => window.portalLab?.inspect().progress > .999);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'project-title');
    await context.close();
  }
  // Lossless preview montage: frames from the actual interactive browser.
  const widths = [1440,390], labels = ['type','passage','project'];
  const layers = [];
  for (const [row, width] of widths.entries()) for (const [col, label] of labels.entries()) {
    const input = await sharp(path.join(output, `${width}-${label}.png`)).resize(420,300,{fit:'contain',background:'#e3e0d8'}).toBuffer();
    layers.push({ input, left:col*420, top:row*300 });
  }
  await sharp({ create: { width:1260,height:600,channels:3,background:'#e3e0d8' } }).composite(layers).png().toFile(path.join(output,'overview.png'));
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report,null,2));
} finally { await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)); await browser.close(); await new Promise(r => server.close(r)); }
