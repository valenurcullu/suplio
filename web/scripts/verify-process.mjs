import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.QA_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const errors = [];
await mkdir('test-results', { recursive: true });
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
const scroll = async (page, top) => {
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const styles = page => page.locator('[data-process-step]').evaluateAll(steps => steps.map(step => {
  const style = getComputedStyle(step);
  return { y: new DOMMatrix(style.transform).f, opacity: +style.opacity };
}));
const final = page => expect.poll(async () => (await styles(page)).every(step => Math.abs(step.y) < .01 && step.opacity === 1)).toBe(true);
const range = page => page.evaluate(() => {
  const section = document.querySelector('#como-trabajamos');
  const grid = section.querySelector('.process-grid');
  const pinned = section.dataset.processMode === 'pinned';
  if (!pinned) {
    const rect = grid.getBoundingClientRect();
    return { start: rect.top + scrollY - innerHeight * .92, end: rect.bottom + scrollY - innerHeight * .82, pinned };
  }
  const spacer = section.parentElement;
  const header = document.querySelector('[data-header]').offsetHeight;
  const start = spacer.getBoundingClientRect().top + scrollY - (header + 16 - parseFloat(getComputedStyle(section).paddingTop));
  return { start, end: start + parseFloat(getComputedStyle(spacer).paddingBottom), pinned };
});

try {
  for (const [width, height, mode] of [[1440,900,'pinned'], [1440,1200,'pinned'], [1024,900,'pinned'], [768,1200,'pinned'], [768,900,'flow'], [1440,600,'flow'], [390,844,'flow'], [320,844,'flow']]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    watch(page);
    await page.goto(`${base}/#inicio`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#como-trabajamos');
    await expect(section).toHaveAttribute('data-process-mode', mode);
    await expect(section).toHaveCSS('background-color', 'rgb(227, 224, 216)');
    assert.equal(await page.locator('#como-trabajamos [data-reveal]').count(), 0);
    const positions = await page.locator('[data-process-step]').evaluateAll(steps => steps.map(step => step.getBoundingClientRect().top - new DOMMatrix(getComputedStyle(step).transform).f));
    if (width >= 900) for (let index = 1; index < 4; index++) assert(Math.abs(positions[index] - positions[0] - 46 * index) < .1, 'Stepped layout changed');
    const extent = await range(page);
    const duration = extent.pinned ? 4.2 : 4;
    const at = progress => scroll(page, extent.start + (extent.end - extent.start) * progress);
    const initial = await styles(page);
    assert(initial.every(step => step.opacity === 0 && step.y > 44));
    if (extent.pinned) {
      assert(await page.locator('.process-grid').evaluate(grid => [...grid.querySelectorAll('[data-process-step]')].every(step => step.getBoundingClientRect().top > grid.getBoundingClientRect().bottom + 30)));
    }
    let heading;
    for (let index = 0; index < 4; index++) {
      await at((index + .5) / duration);
      const middle = await styles(page);
      assert(Math.abs(middle[index].opacity - .5) < .015, `Step ${index + 1} not driven by scroll at ${width}x${height}`);
      assert(middle[index].y > 0 && middle[index].y < initial[index].y);
      assert(middle.slice(0, index).every(step => step.opacity === 1 && step.y === 0));
      assert(middle.slice(index + 1).every(step => step.opacity === 0));
      if (extent.pinned) {
        await expect(section).toHaveCSS('position', 'fixed');
        const current = await page.locator('#process-title, .process-intro').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
        heading ??= current;
        current.forEach((top, i) => assert(Math.abs(top - heading[i]) < .1, 'Heading/intro moved during pin'));
        assert(await page.locator('[data-process-stage]').evaluate(stage => stage.getBoundingClientRect().top >= document.querySelector('[data-header]').getBoundingClientRect().bottom && stage.getBoundingClientRect().bottom <= innerHeight - 12));
      }
      await page.waitForTimeout(220);
      assert.deepEqual(await styles(page), middle, 'Animation continued with scroll stopped');
      await at((index + .25) / duration);
      const reversed = await styles(page);
      assert(reversed[index].y > middle[index].y && reversed[index].opacity < middle[index].opacity, 'Upward scroll must reverse the step');
      await at((index + .5) / duration);
      const resumed = await styles(page);
      assert(Math.abs(resumed[index].y - middle[index].y) < .01);
      if (width === 1440 && height === 900) await page.screenshot({ path: `test-results/process-pin-step-${index + 1}.png` });
    }
    await at(extent.pinned ? .98 : 1.01);
    await final(page);
    if (extent.pinned) {
      const before = await styles(page);
      const titleTop = await page.locator('#process-title').evaluate(el => el.getBoundingClientRect().top);
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await page.waitForTimeout(300);
      const refreshed = await styles(page);
      assert.deepEqual(refreshed, before, 'Refresh changed final step positions');
      assert(Math.abs(await page.locator('#process-title').evaluate(el => el.getBoundingClientRect().top) - titleTop) < 2);
      if (width === 1440 && height === 900) await page.screenshot({ path: 'test-results/process-pin-final.png' });
      await scroll(page, extent.end + 20);
      await expect(section).not.toHaveCSS('position', 'fixed');
      const gap = await page.evaluate(() => document.querySelector('#proyectos').getBoundingClientRect().top - document.querySelector('#como-trabajamos').getBoundingClientRect().bottom);
      assert(Math.abs(gap) < 3, `Gap after pin release: ${gap}`);
      await at(.98);
      await final(page);
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    results.push({ width, height, mode, scrollDistance: extent.end - extent.start, sequential: true, stopsWithScroll: true, reversible: true, finalVisible: true, accessibilityViolations: 0, overflow: false });
    await context.close();
  }

  const resize = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  watch(resize);
  await resize.goto(`${base}/#inicio`, { waitUntil: 'networkidle' });
  const extent = await range(resize);
  await scroll(resize, extent.start + (extent.end - extent.start) * .12);
  for (const viewport of [{width:390,height:844},{width:768,height:1200},{width:1440,height:900}]) {
    await resize.setViewportSize(viewport);
    await resize.waitForTimeout(300);
    assert.equal(await resize.locator('.pin-spacer:has(> #como-trabajamos)').count(), viewport.width < 600 ? 0 : 1);
    assert(await resize.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await resize.emulateMedia({ reducedMotion: 'reduce' });
  await final(resize);
  await expect(resize.locator('.pin-spacer:has(> #como-trabajamos)')).toHaveCount(0);
  await resize.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(resize.locator('.pin-spacer:has(> #como-trabajamos)')).toHaveCount(1);
  for (let i=0;i<3;i++) {
    await resize.evaluate(() => { document.dispatchEvent(new Event('astro:before-swap')); document.dispatchEvent(new Event('astro:page-load')); });
    await expect(resize.locator('.pin-spacer:has(> #como-trabajamos)')).toHaveCount(1);
  }
  await resize.evaluate(() => window.dispatchEvent(new Event('error')));
  await final(resize);
  await expect(resize.locator('.pin-spacer:has(> #como-trabajamos)')).toHaveCount(0);
  await resize.close();

  for (const hash of ['proyectos','contacto','consulta']) {
    const page = await browser.newPage({ viewport: { width:1440, height:900 }, reducedMotion: 'no-preference' });
    watch(page);
    await page.goto(`${base}/#${hash}`, { waitUntil: 'networkidle' });
    await expect.poll(() => page.locator(`#${hash}`).evaluate(el => Math.abs(el.getBoundingClientRect().top - 100))).toBeLessThan(5);
    await page.close();
  }
  for (const options of [{javaScriptEnabled:false}, {reducedMotion:'reduce'}]) {
    const page = await browser.newPage({ viewport:{width:390,height:844}, ...options });
    watch(page);
    await page.goto(`${base}/#como-trabajamos`, { waitUntil:'networkidle' });
    await final(page);
    await expect(page.locator('.pin-spacer:has(> #como-trabajamos)')).toHaveCount(0);
    await page.close();
  }
  const failed = await browser.newPage();
  await failed.route('**/_astro/*.js', route => route.abort());
  await failed.goto(`${base}/#como-trabajamos`);
  await final(failed);
  await failed.close();
  assert.deepEqual(errors, []);
  const report={results,resize:'passed',refresh:'passed',directAnchors:'passed',reducedMotion:'passed',noJavaScript:'passed',failedBundle:'passed',runtimeFailure:'passed',lifecycle:'passed',errors};
  await writeFile('test-results/process-verification.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }
