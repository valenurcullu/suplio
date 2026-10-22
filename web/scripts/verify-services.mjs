import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.QA_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('test-results', { recursive: true });
const createPage = async options => (await browser.newContext(options)).newPage();
const errors = [];
const results = { widths: [], interactions: [], motion: null };
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
const allIdle = page => expect.poll(() => page.locator('[data-demo-state="playing"]').count(), { timeout: 12000 }).toBe(0);
const styles = page => page.locator('[data-service-demo] .service-demo-art [data-part]').evaluateAll(nodes => nodes.map(el => {
  const s = getComputedStyle(el);
  const transform = s.transform === 'none' || new DOMMatrix(s.transform).isIdentity ? 'none' : s.transform;
  return [el.getAttribute('data-part'), transform, s.fill, s.stroke, s.opacity, s.strokeDasharray, s.strokeDashoffset];
}));
async function center(locator) {
  await locator.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight / 2 + el.clientHeight / 2, behavior: 'instant' }));
}
async function audit(page) {
  await page.addInitScript(() => {
    const log = { starts: [], maxActive: 0, frames: {}, packets: {}, cls: 0 };
    window.__servicesAudit = log;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) log.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new MutationObserver(records => {
      for (const record of records) if (record.target.dataset.demoState === 'playing') {
        log.starts.push({ kind: record.target.dataset.serviceDemo, time: performance.now() });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-demo-state'] });
    function frame() {
      const active = [...document.querySelectorAll('[data-demo-state="playing"]')];
      log.maxActive = Math.max(log.maxActive, active.length);
      for (const button of active) {
        const kind = button.dataset.serviceDemo;
        log.frames[kind] = (log.frames[kind] ?? 0) + 1;
        for (const packet of button.querySelectorAll('.demo-packet')) {
          const s = getComputedStyle(packet);
          if (+s.opacity > .5 && parseFloat(s.strokeDashoffset) < .1 && parseFloat(s.strokeDashoffset) > -.95) {
            log.packets[packet.dataset.part] ??= performance.now();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
let finalStyles;
try {
  for (const width of [320, 390, 768, 899, 900, 1024, 1440]) {
    const page = await createPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    watch(page);
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.service-row')).toHaveCount(4);
    await expect(page.locator('[data-service-demo]')).toHaveCount(4);
    await expect(page.locator('.service-row').last().locator('h3')).toHaveText('IA y agentes', { useInnerText: true });
    await expect(page.locator('.service-row').last().locator('.service-copy > p')).toHaveText('Integramos inteligencia artificial a procesos y herramientas para que tu empresa pueda aprovecharla de manera concreta.');
    await expect(page.locator('.service-row').last().locator('.service-examples')).toHaveText('Asistentes inteligentes · Agentes conectados a herramientas · Integración de IA');
    const boxes = await page.locator('[data-service-demo]').evaluateAll(buttons => buttons.map(button => {
      const b = button.getBoundingClientRect(); const text = button.closest('.service-row').querySelector('.service-copy').getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height, disabled: button.disabled, belowText: b.y >= text.bottom };
    }));
    for (const b of boxes) {
      assert(b.disabled, 'Reduced motion must not offer an animated replay');
      assert(b.width >= 124 && b.height >= 110);
      assert(b.x >= 0 && b.x + b.width <= width);
      if (width < 900) assert(b.belowText, 'Mobile/tablet preview must follow the service text');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    if ([320, 390, 768, 1440].includes(width)) await page.locator('#servicios').screenshot({ path: `test-results/services-${width}.png` });
    if (width === 1440) finalStyles = await styles(page);
    results.widths.push({ width, previewsVisible: true, overflow: false, axeViolations: 0 });
    await page.context().close();
  }
  console.log('Static layout and axe: passed at 7 widths.');

  const page = await createPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  watch(page);
  await audit(page);
  await page.goto(base, { waitUntil: 'networkidle' });
  const buttons = page.locator('[data-service-demo]');
  for (const button of await buttons.all()) await expect(button).toBeEnabled();
  await page.mouse.move(1, 1);
  await allIdle(page);
  assert.equal(await page.evaluate(() => window.__servicesAudit.starts.length), 0, 'Offscreen previews must stay at rest');
  const kinds = ['web', 'app', 'flow', 'agent'];
  for (const kind of kinds) {
    const button = page.locator(`[data-service-demo="${kind}"]`);
    await center(button);
    await expect.poll(() => page.evaluate(kind => window.__servicesAudit.starts.some(s => s.kind === kind), kind), { timeout: 10000 }).toBe(true);
    await allIdle(page);
  }
  const automatic = await page.evaluate(() => window.__servicesAudit);
  for (const kind of kinds) assert(automatic.frames[kind] >= 15, `Animation not perceptible: ${kind}`);
  assert.equal(automatic.maxActive, 1, 'Only one preview may animate at a time');
  assert(automatic.packets['flow-packet-a'] < automatic.packets['flow-packet-b']);
  assert(automatic.packets['agent-incoming'] < automatic.packets['agent-call']);
  assert(automatic.packets['agent-call'] < automatic.packets['agent-return']);
  assert(automatic.packets['agent-return'] < automatic.packets['agent-outgoing']);
  results.interactions.push('All four discovered automatically; one active at a time; flow and tool round-trip ordered');

  for (const kind of kinds) {
    const button = page.locator(`[data-service-demo="${kind}"]`);
    await center(button);
    await allIdle(page);
    await page.waitForTimeout(750); // Existing row entrance must settle before comparing text geometry.
    const text = button.locator('..').locator('.service-name, .service-copy');
    const before = await text.evaluateAll(elements => elements.map(el => { const {x,y,width,height}=el.getBoundingClientRect();return {x,y,width,height}; }));
    await page.mouse.move(1, 1);
    await button.locator('..').locator('h3').hover();
    await expect(button).toHaveAttribute('data-demo-state', 'playing');
    await page.waitForTimeout(180);
    await button.screenshot({ path: `test-results/services-${kind}-early.png` });
    await page.waitForTimeout(kind === 'agent' ? 700 : 300);
    await button.screenshot({ path: `test-results/services-${kind}-middle.png` });
    const during = await text.evaluateAll(elements => elements.map(el => { const {x,y,width,height}=el.getBoundingClientRect();return {x,y,width,height}; }));
    assert.deepEqual(during, before, `Text moved during ${kind} replay`);
    await allIdle(page);
    await button.screenshot({ path: `test-results/services-${kind}-final.png` });
  }
  results.interactions.push('Hover replays all four SVG scenes while text stays stable');

  const web = page.locator('[data-service-demo="web"]');
  await center(web);
  await page.mouse.move(1, 1);
  await web.focus();
  await expect(web).toHaveAttribute('data-demo-state', 'playing');
  await expect(web).toBeFocused();
  await allIdle(page);
  await page.keyboard.press('Enter');
  await expect(web).toHaveAttribute('data-demo-state', 'playing');
  await allIdle(page);
  await page.keyboard.press('Space');
  await expect(web).toHaveAttribute('data-demo-state', 'playing');
  await allIdle(page);
  const activeAxe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  assert.deepEqual(activeAxe.violations.map(v => v.id), []);
  results.interactions.push('Focus, Enter and Space replay; enabled controls pass axe');

  // Measure normal demo use before preference changes, resizes and the synthetic
  // page teardown below intentionally remove/recreate layout (including the pin).
  results.interactionCLS = await page.evaluate(() => window.__servicesAudit.cls);
  assert(results.interactionCLS < .01, `Layout shifts during demo use: ${results.interactionCLS}`);

  const agent = page.locator('[data-service-demo="agent"]');
  await center(agent);
  await agent.focus();
  await expect(agent).toHaveAttribute('data-demo-state', 'playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
  await expect.poll(() => styles(page), { message: 'Reduced motion must restore complete SVG geometry and colors' }).toEqual(finalStyles);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await allIdle(page);
  await expect(agent).toBeEnabled();
  const count = await page.evaluate(() => window.__servicesAudit.starts.length);
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => window.__servicesAudit.starts.length), count, 'Preference change must not replay discovered scenes');
  results.interactions.push('Reduced motion cancels active scene and restores static SVGs without replay');

  await agent.click();
  await expect(agent).toHaveAttribute('data-demo-state', 'playing');
  await page.setViewportSize({ width: 320, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 900, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await allIdle(page);
  assert.deepEqual(await styles(page), finalStyles, 'Leaving viewport must stop scene in final state');
  results.interactions.push('Resize is bounded; leaving viewport stops work and restores final SVGs');

  await page.evaluate(() => document.dispatchEvent(new Event('astro:before-swap')));
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
  assert.deepEqual(await styles(page), finalStyles);
  await page.evaluate(() => document.dispatchEvent(new Event('astro:page-load')));
  for (const button of await buttons.all()) await expect(button).toBeEnabled();
  results.interactions.push('Astro teardown and reinitialization dispose observers, controls and timelines');
  results.motion = await page.evaluate(() => window.__servicesAudit);
  assert.equal(results.motion.maxActive, 1);
  await page.context().close();

  const touch = await createPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  watch(touch);
  await audit(touch);
  await touch.goto(base, { waitUntil: 'networkidle' });
  for (const kind of kinds) {
    const button = touch.locator(`[data-service-demo="${kind}"]`);
    await center(button);
    await expect.poll(() => touch.evaluate(kind => window.__servicesAudit.starts.some(s => s.kind === kind), kind), { timeout: 10000 }).toBe(true);
    await allIdle(touch);
    const before = await touch.evaluate(() => window.__servicesAudit.starts.length);
    await button.tap();
    await expect(button).toHaveAttribute('data-demo-state', 'playing');
    await allIdle(touch);
    assert.equal(await touch.evaluate(() => window.__servicesAudit.starts.length), before + 1, 'A tap must produce exactly one replay');
  }
  results.interactions.push('Touch: all four autoplay on entry and replay once per tap');
  await touch.context().close();

  const nojs = await createPage({ viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  watch(nojs);
  await nojs.goto(base);
  await expect(nojs.locator('.service-row')).toHaveCount(4);
  for (const button of await nojs.locator('[data-service-demo]').all()) {
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  }
  await expect(nojs.locator('.service-row').last().locator('.service-copy')).toBeVisible();
  assert(await nojs.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  results.interactions.push('No JavaScript: all copy and final SVG compositions visible, inactive controls disabled');
  await nojs.context().close();
  assert.deepEqual(errors, []);
  await writeFile('test-results/services-verification.json', JSON.stringify({ base, ...results, errors }, null, 2));
  console.log(JSON.stringify({ base, ...results, errors }, null, 2));
} finally { await browser.close(); }
