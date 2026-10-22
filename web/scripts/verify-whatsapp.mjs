import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.QA_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const errors = [];
await mkdir('test-results', { recursive: true });
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${base}/#inicio`, { waitUntil: 'networkidle' });
    await page.mouse.move(1, 1);
    const link = page.locator('[data-whatsapp-floating]');
    await expect(link).toBeVisible();
    const initial = await link.boundingBox();
    assert(initial);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    let visible = 0;
    let protectedControls = 0;
    for (let position = 0; position <= max; position += 120) {
      await page.evaluate(top => { window.scrollTo({ top, behavior: 'instant' }); }, position);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (await link.isVisible()) {
        visible++;
        const rect = await link.boundingBox();
        for (const axis of ['x', 'y', 'width', 'height']) assert(Math.abs(rect[axis] - initial[axis]) < 1, `Fixed ${axis} changed at ${width}px / ${position}`);
        // Verify that the visible shortcut does not cover a real field, CTA or link.
        const covered = await page.evaluate(({ x, y }) => document.elementsFromPoint(x, y)
          .filter(el => !el.closest('[data-whatsapp-floating]'))
          .some(el => el.closest('main a, main button, main input, main select, main textarea, footer a')), { x: rect.x + 24, y: rect.y + 24 });
        assert(!covered, `Shortcut covers an interactive control at ${width}px / ${position}`);
      } else {
        protectedControls++;
        const reason = await page.evaluate(() => {
          const link = document.querySelector('[data-whatsapp-floating]');
          const style = getComputedStyle(link);
          const right = innerWidth - parseFloat(style.right), bottom = innerHeight - parseFloat(style.bottom);
          return [...document.querySelectorAll('main a, main button, main input:not([type="hidden"]), main select, main textarea, footer a')].some(el => {
            const rect = el.getBoundingClientRect();
            return el.getClientRects().length && rect.width && rect.height && rect.right > right - 48 && rect.left < right && rect.bottom > bottom - 48 && rect.top < bottom;
          });
        });
        assert(reason, `Unexpected section/text-based hiding at ${width}px / ${position}`);
      }
    }
    assert(visible > protectedControls, 'Shortcut should be available for most of the page');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(link).toBeVisible();
    // Regression: the original code hid WhatsApp here because a heading crossed its area.
    if (width === 1440) await expect(link).toBeVisible();
    if (width < 900) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(link).toBeHidden();
      await page.keyboard.press('Escape');
      await expect(link).toBeVisible();
    }
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeVisible();
    await page.screenshot({ path: `test-results/whatsapp-stable-${width}.png` });
    results.push({ width, visibleSamples: visible, controlInterferenceSamples: protectedControls, fixedGeometry: true });
    await page.close();
  }
  const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  motion.on('pageerror', error => errors.push(error.message));
  await motion.goto(`${base}/?intro=preview`, { waitUntil: 'networkidle' });
  await expect(motion.locator('[data-whatsapp-floating]')).toBeHidden();
  await motion.getByRole('button', { name: /Omitir intro/ }).click();
  await expect(motion.locator('[data-whatsapp-floating]')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await motion.evaluate(() => { document.dispatchEvent(new Event('astro:before-swap')); document.dispatchEvent(new Event('astro:page-load')); });
    await expect(motion.locator('[data-whatsapp-floating]')).toHaveCount(1);
    await expect(motion.locator('[data-whatsapp-floating]')).toBeVisible();
  }
  await motion.close();
  const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await nojs.goto(base);
  await expect(nojs.locator('[data-whatsapp-floating]')).toBeVisible();
  await nojs.close();
  assert.deepEqual(errors, []);
  await writeFile('test-results/whatsapp-stability.json', JSON.stringify({ results, intro: 'passed', lifecycle: 'passed', noJavaScript: 'passed', errors }, null, 2));
  console.log(JSON.stringify({ results, intro: 'passed', lifecycle: 'passed', noJavaScript: 'passed', errors }, null, 2));
} finally { await browser.close(); }
