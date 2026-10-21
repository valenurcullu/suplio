import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const base = process.env.QA_URL ?? 'http://127.0.0.1:4321';
await mkdir('test-results', { recursive: true });
const baseline = await readFile('test-results/hero-baseline.json', 'utf8').then(JSON.parse).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const results = { static: [], motion: [], interactions: [] };
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
const resolved = page => expect.poll(() => page.locator('.hero [data-hero-line], .hero-mark path, .hero .contact-link').evaluateAll(elements => elements.every(el => {
  const style = getComputedStyle(el);
  return style.clipPath === 'none' && (style.transform === 'none' || new DOMMatrix(style.transform).isIdentity) && Number(style.opacity) === 1;
}))).toBe(true);

async function auditMotion(page) {
  await page.addInitScript(() => {
    const audit = { frames: [], cls: 0, done: false };
    window.__heroAudit = audit;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) audit.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    let start;
    function sample(now) {
      const hero = document.querySelector('.hero');
      if (hero?.dataset.heroPhase === 'reveal' || start !== undefined) {
        start ??= now;
        const lines = [...hero.querySelectorAll('[data-hero-line]')];
        audit.frames.push({ time: now - start,
          masks: lines.map(el => getComputedStyle(el).clipPath),
          cta: Number(getComputedStyle(hero.querySelector('.contact-link')).opacity),
          overflow: document.documentElement.scrollWidth > innerWidth,
        });
        if (now - start >= 1600) { audit.done = true; return; }
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}

try {
  for (const width of [320, 390, 768, 899, 900, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    watch(page);
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await resolved(page);
    const geometry = await page.evaluate(() => Object.fromEntries(['.hero', 'h1', '.hero-line', '.hero-solution', '.hero-art', '.hero-description p', '.hero .contact-link', '.hero-discover', '.hero-baseline'].map(selector => {
      const el = document.querySelector(selector); const { x, y, width, height } = el.getBoundingClientRect();
      return [selector, { x, y, width, height, text: el.textContent }];
    })));
    const before = baseline?.find(sample => sample.width === width)?.geometry;
    if (before) for (const [selector, rect] of Object.entries(geometry)) {
      assert.equal(rect.text, before[selector].text, `Copy changed: ${width} ${selector}`);
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(rect[key] - before[selector][key]) <= .1, `Layout changed: ${width} ${selector}.${key}: ${before[selector][key]} -> ${rect[key]}`);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const screenshot = `test-results/hero-after-${width}.png`;
    await page.locator('.hero').screenshot({ path: screenshot });
    let changedPixels = null;
    if (before) {
      const original = await sharp(`test-results/hero-before-${width}.png`).removeAlpha().raw().toBuffer();
      const current = await sharp(screenshot).removeAlpha().raw().toBuffer();
      assert.equal(original.length, current.length);
      let changed = 0;
      for (let i = 0; i < original.length; i += 3) if ([0, 1, 2].some(c => Math.abs(original[i + c] - current[i + c]) > 8)) changed++;
      changedPixels = changed / (original.length / 3);
      assert(changedPixels < .005, `Unexpected visual change at ${width}: ${changedPixels}`);
    }
    results.static.push({ width, layoutMatchesBaseline: Boolean(before), changedPixels });
    await page.close();
  }

  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
    watch(page);
    await auditMotion(page);
    await page.goto(base, { waitUntil: 'load' });
    if (width !== 320) {
      for (const time of [180, 500, 850]) {
        await page.waitForFunction(time => window.__heroAudit.frames.some(frame => frame.time >= time), time);
        await page.screenshot({ path: `test-results/hero-motion-${width}-${time}.png` });
      }
    }
    await page.waitForFunction(() => window.__heroAudit.done);
    await resolved(page);
    const audit = await page.evaluate(() => window.__heroAudit);
    assert(audit.frames.some(frame => frame.masks.some(mask => mask !== 'none')), 'Intro did not run');
    assert(audit.frames.every(frame => !frame.overflow), `Overflow during motion at ${width}`);
    assert(audit.frames.every(frame => frame.cta >= .79), 'Contact should remain readable during intro');
    assert(audit.cls < .01, `Layout shifts at ${width}: ${audit.cls}`);
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await page.waitForTimeout(650);
    const transform = await page.locator('.hero-mark').evaluate(el => {
      const matrix = new DOMMatrix(getComputedStyle(el).transform);
      return { x: matrix.e, y: matrix.f };
    });
    assert.equal(transform.x, 0);
    if (width >= 900) assert(transform.y < 0 && transform.y >= -8.01);
    else assert.equal(transform.y, 0, 'Mobile should not have parallax');
    await page.locator('.site-logo').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await resolved(page);
    await page.waitForTimeout(300);
    await resolved(page);
    results.motion.push({ width, cls: audit.cls, frames: audit.frames.length, parallax: transform });
    await writeFile(`test-results/hero-motion-${width}.json`, JSON.stringify(audit, null, 2));
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  watch(page);
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.hero')?.dataset.heroIntroduced);
  await page.locator('.hero .contact-link').focus();
  await resolved(page);
  await expect(page.locator('.hero .contact-link')).toBeFocused();
  await page.hover('.hero .contact-link');
  await page.waitForTimeout(450);
  const arrow = await page.locator('.hero .contact-link .arrow').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).e);
  assert(arrow > 2.9, 'CTA arrow hover should resolve smoothly');
  results.interactions.push('Early keyboard focus resolves intro; CTA hover works');

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.hero')?.dataset.heroIntroduced);
  await page.setViewportSize({ width: 390, height: 844 });
  await resolved(page);
  for (const width of [900, 768, 1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(120);
    await resolved(page);
  }
  results.interactions.push('Resize during intro and repeated breakpoint changes restore geometry');

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.hero')?.dataset.heroIntroduced);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resolved(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(160);
  await resolved(page);
  results.interactions.push('Changing reduced motion cancels intro without replay');

  await page.goto(`${base}/#servicios`, { waitUntil: 'load' });
  await resolved(page);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#servicios');
  results.interactions.push('Direct section anchor skips intro');
  await page.close();

  const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await nojs.goto(base);
  await expect(nojs.locator('.hero h1')).toBeVisible();
  await expect(nojs.locator('.hero .contact-link')).toBeVisible();
  await resolved(nojs);
  results.interactions.push('Hero and contact remain visible without JavaScript');
  await nojs.close();
  assert.deepEqual(errors, []);
  await writeFile('test-results/hero-verification.json', JSON.stringify({ base, ...results, errors }, null, 2));
  console.log(JSON.stringify({ base, ...results, errors }, null, 2));
} finally { await browser.close(); }
