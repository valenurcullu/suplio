import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import sharp from 'sharp';

const base = process.env.QA_URL ?? 'http://127.0.0.1:4322';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = { widths: [], assets: [], errors: [] };
await mkdir('test-results', { recursive: true });
try {
  for (const entry of await readdir('public/projects/naves-del-sur', { withFileTypes: true })) {
    if (!entry.isFile()) continue; // Motion delivery lives in its own subdirectory.
    const file = entry.name;
    const path = `public/projects/naves-del-sur/${file}`;
    const { width, height } = await sharp(path).metadata();
    const { size } = await stat(path);
    assert(size < 150_000, `${file} unexpectedly large`);
    results.assets.push({ file, width, height, bytes: size });
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => results.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) results.errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#proyectos');
    await expect(section.locator('article')).toHaveCount(1);
    await expect(section.locator('h3')).toHaveText('Naves del Sur S.A.');
    await expect(section).not.toContainText(/pendiente|próximamente|Pyme Protegida|en preparación/i);
    const images = section.locator('img');
    await expect(images).toHaveCount(4);
    const measurements = [];
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img => img.decode());
      const before = await image.boundingBox();
      await page.waitForTimeout(100);
      const info = await image.evaluate(img => ({ src: img.currentSrc, width: img.width, height: img.height, declaredWidth: Number(img.getAttribute('width')), declaredHeight: Number(img.getAttribute('height')), alt: img.alt, lazy: img.loading }));
      assert(info.alt.length > 30);
      assert.equal(info.lazy, 'lazy');
      const asset = results.assets.find(asset => info.src.endsWith(asset.file));
      assert(asset, `Unknown source: ${info.src}`);
      assert(Math.abs(asset.width / asset.height - info.declaredWidth / info.declaredHeight) < .002, 'Incorrect reserved aspect ratio');
      assert(Math.abs(before.width / before.height - info.declaredWidth / info.declaredHeight) < .01, 'Image cropped or stretched');
      const after = await image.boundingBox();
      assert(Math.abs(before.height - after.height) < 1, 'Image layout changed after decoding');
      measurements.push({ ...info, bytes: asset.bytes });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    if (width <= 600) {
      const boxes = await images.evaluateAll(images => images.map(img => { const r = img.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
      for (let i = 1; i < boxes.length; i++) assert(boxes[i].top > boxes[i - 1].bottom, 'Mobile images are not stacked');
    }
    for (const link of await section.locator('a').all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      assert((await link.getAttribute('rel')).includes('noopener'));
      assert((await link.getAttribute('rel')).includes('noreferrer'));
    }
    const audit = await new AxeBuilder({ page }).include('#proyectos').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    // Capture from the document top so sticky navigation and focused audit
    // controls do not obscure the case in the review artifact.
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
    const sectionBox = await section.boundingBox();
    const screenshot = await page.screenshot({ fullPage: true });
    await sharp(screenshot).extract({ left: 0, top: Math.ceil(sectionBox.y), width, height: Math.floor(sectionBox.height) }).toFile(`test-results/portfolio-${width}.png`);
    if (width === 1440) {
      const links = await section.locator('a').all();
      await links[0].focus();
      for (const link of links.slice(1)) { await page.keyboard.press('Tab'); await expect(link).toBeFocused(); }
      const imagePopup = page.waitForEvent('popup');
      await links[0].click();
      const imagePage = await imagePopup;
      await imagePage.waitForLoadState('domcontentloaded');
      assert(imagePage.url().endsWith('inicio-desktop-1440.webp'));
      await imagePage.close();
      const sitePopup = page.waitForEvent('popup');
      await section.locator('.case-visit').click();
      const site = await sitePopup;
      await site.waitForLoadState('domcontentloaded');
      assert.equal(new URL(site.url()).hostname, 'navesdelsur.com');
      await expect(site.locator('h1')).toContainText('Bombas a Tornillo');
      await site.close();
    }
    results.widths.push({ width, images: measurements, imageBytes: measurements.reduce((sum, image) => sum + image.bytes, 0), accessibilityViolations: audit.violations.length });
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base);
  for (const image of await page.locator('#proyectos img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(img => img.decode()); }
  await expect(page.locator('.case-visit')).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  results.noJS = 'passed';
  await context.close();
  assert.deepEqual(results.errors, []);
} finally {
  await writeFile('test-results/portfolio.json', JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
