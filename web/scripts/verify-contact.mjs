import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = (process.env.QA_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const origin = 'https://suplio.example';
const builtHtml = await (await fetch(base)).text();
const whatsapp = process.env.QA_WHATSAPP_ENABLED === '1' || builtHtml.includes('data-whatsapp-floating="true"');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = { widths: [], scenarios: [], whatsapp: whatsapp ? 'configured build' : 'hidden by configuration' };
await mkdir('test-results', { recursive: true });
const fill = async page => {
  await page.getByLabel('Nombre y apellido').fill('Prueba local Suplio');
  await page.getByLabel('Email', { exact: false }).fill('prueba@example.com');
  await page.getByLabel('Mensaje', { exact: false }).fill('Consulta de prueba local, sin envío a servicios externos.');
};
// Every request to the fictitious origin is served from localhost or mocked here.
// No form data leaves the computer, including when testing native POST without JS.
const create = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(`${origin}/**`, async route => {
    assert.notEqual(route.request().method(), 'POST', 'Unexpected unmocked form submission');
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${base}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto(origin, { waitUntil: 'networkidle' });
  return { page, context, errors };
};

try {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /name="suplio-consultas"[^>]*method="POST"[^>]*action="\/consulta-recibida\/"[^>]*data-netlify="true"[^>]*netlify-honeypot="bot-field"/);
  for (const name of ['form-name', 'bot-field', 'name', 'email', 'company', 'project-type', 'message']) assert(html.includes(`name="${name}"`));
  const sitemap = await (await fetch(`${base}/sitemap-0.xml`)).text();
  assert(!sitemap.includes('consulta-recibida'));

  for (const width of [320, 390, 768, 1024, 1440]) {
    const { page, context, errors } = await create({ viewport: { width, height: 900 } });
    assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(s => s.id || s.classList[0])), ['hero', 'servicios', 'como-trabajamos', 'proyectos', 'identity', 'contacto', 'consulta']);
    const contactBottom = await page.locator('#contacto').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
    const formTop = await page.locator('#consulta').evaluate(el => el.getBoundingClientRect().top + scrollY);
    assert(Math.abs(formTop - contactBottom) < 1, 'Form immediately follows the orange section');
    await page.locator('#consulta').scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#consulta').screenshot({ path: `test-results/contact-${width}.png` });
    await page.locator('.inquiry-submit').click();
    await expect(page.locator('#inquiry-name')).toBeFocused();
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    await page.getByLabel('Nombre y apellido').fill('   ');
    await page.getByLabel('Email', { exact: false }).fill('email-invalido');
    await page.locator('.inquiry-submit').click();
    await expect(page.locator('#inquiry-email-error')).toContainText('email válido');
    await fill(page);
    await page.getByLabel('Tipo de proyecto').selectOption('No estoy seguro todavía');
    await expect(page.locator('#inquiry-name-error')).toBeHidden();
    if (!whatsapp) await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    assert.deepEqual(errors, []);
    results.widths.push({ width, overflow: false, validation: 'passed', accessibilityViolations: 0 });
    await context.close();
  }

  const { page, context, errors } = await create();
  await fill(page);
  let posts = 0;
  let pending;
  await page.route(`${origin}/`, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    const data = new URLSearchParams(route.request().postData());
    assert.equal(data.get('form-name'), 'suplio-consultas');
    assert.equal(data.get('bot-field'), '');
    assert.equal(data.get('email'), 'prueba@example.com');
    await new Promise(resolve => { pending = () => resolve(); });
    await route.fulfill({ status: 500, body: 'Rechazado en prueba local' });
  });
  await page.locator('.inquiry-submit').click();
  await expect(page.locator('.inquiry-submit')).toBeDisabled();
  await expect(page.locator('[data-submit-status]')).toContainText('enviando');
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect.poll(() => posts).toBe(1);
  pending();
  await expect(page.locator('[data-submit-error]')).toContainText('No se pudo enviar');
  assert.equal(page.url(), `${origin}/`);
  await expect(page.locator('#inquiry-message')).not.toHaveValue('');
  await expect(page.locator('.inquiry-submit')).toBeEnabled();
  results.scenarios.push('HTTP rejection preserves data; no success; duplicate POST prevented');

  await page.unroute(`${origin}/`);
  await page.route(`${origin}/`, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.abort('failed');
  });
  await page.locator('.inquiry-submit').click();
  await expect(page.locator('[data-submit-error]')).toContainText('No pudimos confirmar');
  results.scenarios.push('Network failure preserves data and permits retry');

  await page.unroute(`${origin}/`);
  await page.route(`${origin}/`, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({ status: 200, body: 'Respuesta HTTP simulada' });
  });
  await page.locator('.inquiry-submit').click();
  await expect(page).toHaveURL(`${origin}/consulta-recibida/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gracias por');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://suplio.ar/consulta-recibida/');
  await expect(page.locator('#signature-intro')).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => v.id), []);
  }
  await page.screenshot({ path: 'test-results/contact-confirmation.png', fullPage: true });
  assert.deepEqual(errors, []);
  results.scenarios.push('Mocked HTTP success opens confirmation; canonical and noindex correct');
  await context.close();

  const native = await create({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await native.page.locator('.inquiry-submit').click();
  assert.equal(native.page.url(), `${origin}/`);
  assert.equal(await native.page.locator('#inquiry-name').evaluate(el => el.validity.valueMissing), true);
  await fill(native.page);
  let nativePosted = false;
  await native.page.route(`${origin}/consulta-recibida/`, async route => {
    assert.equal(route.request().method(), 'POST');
    const data = new URLSearchParams(route.request().postData());
    assert.equal(data.get('form-name'), 'suplio-consultas');
    nativePosted = true;
    await route.fulfill({ status: 200, contentType: 'text/html', body: await (await fetch(`${base}/consulta-recibida/`)).text() });
  });
  await native.page.locator('.inquiry-submit').click();
  await expect(native.page).toHaveURL(`${origin}/consulta-recibida/`);
  assert(nativePosted);
  await native.context.close();
  results.scenarios.push('Native no-JS validation and POST to confirmation route');

  const local = await browser.newPage({ reducedMotion: 'reduce' });
  await local.goto(base);
  await fill(local);
  await local.locator('.inquiry-submit').click();
  await expect(local.locator('[data-submit-error]')).toContainText('vista local no procesa envíos');
  await local.close();
  results.scenarios.push('Localhost explicitly reports that it cannot process submissions');

  const motion = await create();
  await motion.page.emulateMedia({ reducedMotion: 'no-preference' });
  const transformY = locator => locator.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).f);
  assert.equal(await transformY(motion.page.locator('#process-title')), 0);
  assert.equal(await transformY(motion.page.locator('#projects-title')), 0);
  const grid = motion.page.locator('.project-stage__grid');
  const initialGridY = await transformY(grid);
  assert(initialGridY < 0, 'Project parallax remains at its initial position before reaching that section');
  for (const selector of ['#projects-title']) {
    await motion.page.locator(selector).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .72, behavior: 'instant' }));
    await expect.poll(() => transformY(motion.page.locator(selector))).toBeGreaterThan(0);
    await expect.poll(() => transformY(motion.page.locator(selector))).toBe(0);
  }
  await motion.page.locator('[data-project-stage]').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
  await expect.poll(() => transformY(grid)).toBeGreaterThan(initialGridY);
  await motion.page.locator('[data-identity]').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + el.clientHeight / 2 - innerHeight * .35, behavior: 'instant' }));
  await expect.poll(() => motion.page.locator('.identity-mark path').evaluateAll(paths => paths.every(path => new DOMMatrix(getComputedStyle(path).transform).isIdentity))).toBe(true);
  assert.deepEqual(motion.errors, []);
  await motion.context.close();
  results.scenarios.push('Process heading remains static; project reveal, parallax and identity assembly follow scroll');

  if (whatsapp) {
    const wa = await create({ reducedMotion: 'no-preference' });
    await wa.page.goto(`${origin}/?intro=preview`);
    await expect(wa.page.locator('[data-whatsapp-floating]')).toBeHidden();
    await wa.page.getByRole('button', { name: /Omitir intro/ }).click();
    await wa.page.setViewportSize({ width: 1440, height: 900 });
    await wa.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(wa.page.locator('[data-whatsapp-floating]')).toBeVisible();
    const href = await wa.page.locator('[data-whatsapp-floating]').getAttribute('href');
    assert.equal(new URL(href).searchParams.get('text'), 'Hola, ¿cómo están? Me gustaría consultarles por un proyecto para mi empresa.');
    for (const width of [320, 390, 1440]) {
      await wa.page.setViewportSize({ width, height: 900 });
      for (const selector of ['#servicios', '#como-trabajamos', '#proyectos', '#contacto', '#consulta', '.site-footer']) {
        await wa.page.locator(selector).scrollIntoViewIfNeeded();
        assert(await wa.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      await expect(wa.page.locator('.whatsapp-inline')).toBeVisible();
      await wa.page.locator('.whatsapp-inline').focus();
      await expect(wa.page.locator('.whatsapp-inline')).toBeFocused();
    }
    await wa.context.close();
    results.scenarios.push('Configured WhatsApp URL, intro suppression, keyboard and mobile; no visibility rules tied to sections');
  }
  await writeFile(`test-results/contact-verification${whatsapp ? '-whatsapp' : ''}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
