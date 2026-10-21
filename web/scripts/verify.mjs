import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.QA_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const errors = [];
await mkdir('test-results', { recursive: true });

try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert(dimensions.content <= dimensions.viewport, `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('html').getAttribute('lang'), 'es-AR');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://suplio.ar/');
    const missingAnchors = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.getAttribute('href')));
    assert.deepEqual(missingAnchors, []);
    if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), [], `Accessibility violations at ${width}px`);
    if (width < 900) {
      const toggle = page.getByRole('button', { name: 'Abrir menú' });
      await toggle.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const menuAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      assert.deepEqual(menuAudit.violations.map(v => v.id), []);
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').getByRole('link', { name: /Servicios/ }).click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#servicios')).toBeFocused();
      await page.goto(base, { waitUntil: 'networkidle' });
    }
    results.push({ width, overflow: false, accessibilityViolations: audit.violations.length, menu: width < 900 ? 'passed' : 'desktop' });
    await context.close();
  }
  const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  motion.on('pageerror', error => errors.push(error.message));
  await motion.goto(base, { waitUntil: 'networkidle' });
  await motion.waitForTimeout(1300);
  await motion.locator('[data-identity]').scrollIntoViewIfNeeded();
  await motion.waitForTimeout(1000);
  assert.equal(await motion.locator('.identity-mark path').count(), 2);
  await motion.setViewportSize({ width: 390, height: 844 });
  await motion.waitForTimeout(150);
  const mobileTransformReset = await motion.locator('.identity-mark path').first().evaluate(el => {
    const transform = getComputedStyle(el).transform;
    return transform === 'none' || new DOMMatrix(transform).isIdentity;
  });
  assert(mobileTransformReset, 'Desktop animation should revert to the original geometry on mobile');
  await motion.close();
  const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await nojs.goto(base);
  assert(await nojs.locator('h1').isVisible());
  assert(await nojs.locator('.fallback-nav').isVisible());
  assert(await nojs.locator('main a[href="mailto:hola@suplio.ar"]').first().isVisible());
  assert(!(await nojs.locator('.menu-toggle').isVisible()));
  await nojs.setViewportSize({ width: 768, height: 1024 });
  assert(await nojs.locator('.fallback-nav').isVisible());
  await nojs.close();
  for (const path of ['/og.png', '/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml']) {
    const resource = await fetch(`${base}${path}`);
    assert.equal(resource.status, 200, `${path} should exist`);
  }
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  await writeFile('test-results/verification.json', JSON.stringify({ results, motion: 'passed', noJavaScript: 'passed', errors }, null, 2));
  console.log(JSON.stringify({ results, motion: 'passed', noJavaScript: 'passed', errors }, null, 2));
} finally { await browser.close(); }
