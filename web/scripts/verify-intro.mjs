import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = (process.env.QA_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const preview = `${base}/?intro=preview`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = { geometry: [], behavior: [], realtime: null };
const errors = [];
await mkdir('test-results', { recursive: true });
const svgSource = await readFile('public/brand/suplio-simbolo-color.svg', 'utf8');
const originalPaths = [...svgSource.matchAll(/<path[^>]*d="([^"]+)"[^>]*fill="([^"]+)"/g)].map(match => ({ d: match[1], fill: match[2] }));
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
const create = async (options = {}) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage(); watch(page); return page;
};
const resolved = page => expect.poll(() => page.locator('.hero [data-hero-line], .hero-mark path, .hero .contact-link').evaluateAll(elements => elements.every(el => {
  const s = getComputedStyle(el);
  return s.clipPath === 'none' && +s.opacity === 1 && (s.transform === 'none' || new DOMMatrix(s.transform).isIdentity);
}))).toBe(true);
const sample = page => page.evaluate(() => {
  const root = document.querySelector('#signature-intro');
  const group = root.querySelector('svg > g');
  const m = new DOMMatrix(getComputedStyle(group).transform);
  const center = new DOMPoint(48,48).matrixTransform(group.getScreenCTM());
  return { hidden: root.hidden, state: root.dataset.introState, phase: root.dataset.introPhase,
    reason: root.dataset.introReason, angle: Math.atan2(m.b,m.a)*180/Math.PI, scale: Math.hypot(m.a,m.b),
    center: { x: center.x, y: center.y }, expectedCenter: { x: document.documentElement.clientWidth/2, y: innerHeight/2 },
    clip: getComputedStyle(root.querySelector('.signature-intro__visual')).clipPath,
    background: getComputedStyle(root.querySelector('.signature-intro__visual')).backgroundColor,
    logoOpacity: getComputedStyle(group).opacity,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    pathTranslations: [...group.querySelectorAll('path')].map(path => {
      const t = new DOMMatrix(getComputedStyle(path).transform); return { x: t.e, y: t.f };
    }),
    paths: [...group.querySelectorAll('path')].map(path => ({d:path.getAttribute('d'),fill:path.getAttribute('fill')})),
    heroMoved: [...document.querySelectorAll('.hero-mark path')].some(path => {
      const t = getComputedStyle(path).transform; return t !== 'none' && !new DOMMatrix(t).isIdentity;
    }),
  };
});

try {
  for (const [width,height] of [[320,844],[390,844],[768,1024],[1024,768],[1440,900]]) {
    const page = await create({ viewport: { width,height } });
    const time = new Date('2026-10-21T15:00:00Z');
    await page.clock.install({time}); await page.clock.pauseAt(time);
    await page.goto(preview,{waitUntil:'load'});
    const overlay = page.locator('#signature-intro');
    await expect(overlay).toHaveAttribute('data-intro-state','playing');
    const initial = await page.locator('#signature-intro svg path').evaluateAll(paths=>paths.map(path=>{
      const r=path.getBoundingClientRect();return {left:r.left,right:r.right};
    }));
    assert(initial[0].right < -20,'Black piece must start fully offscreen left');
    assert(initial[1].left > width+20,'Orange piece must start fully offscreen right');
    let previous=0;let previousAngle=0;let rotation=0;const frames=[];
    const times=[...new Set([0,180,420,700,1840,2090,2210,2330,2460,2780,...Array.from({length:27},(_,i)=>780+i*40)])].sort((a,b)=>a-b);
    for (const elapsed of times) {
      await page.clock.runFor(elapsed-previous);previous=elapsed;
      const frame=await sample(page);frames.push({elapsed,...frame});
      assert(!frame.overflow,`Overflow at ${width}/${elapsed}`);
      assert(!frame.heroMoved,'Hero isotipo must not assemble a second time');
      assert.deepEqual(frame.paths,originalPaths);
      if(!frame.hidden) {
        assert.equal(frame.background,'rgb(245, 244, 240)');
        assert.equal(frame.logoOpacity,'1','Logo must leave by clipping, never fading');
        assert(Math.abs(frame.center.x-frame.expectedCenter.x)<.25);
        assert(Math.abs(frame.center.y-frame.expectedCenter.y)<.25);
      }
      if(elapsed>=700&&elapsed<=1840) {
        for(const path of frame.pathTranslations)assert(Math.abs(path.x)<.001&&Math.abs(path.y)<.001,'Pieces must stay assembled during turn');
        assert(Math.abs(frame.scale-1)<.0001,'No scaling during the turn');
        let delta=frame.angle-previousAngle;
        if(delta>180)delta-=360;if(delta< -180)delta+=360;
        rotation+=delta;previousAngle=frame.angle;
      }
      if(elapsed===2210) assert(await page.evaluate(()=>!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#signature-intro')), 'Revealed area must pass pointer hits to the page');
      if([390,1440].includes(width)&&[180,700,1300,2090,2210,2330,2780].includes(elapsed)) {
        await page.screenshot({path:`test-results/intro-${width}-${elapsed}.png`});
      }
    }
    assert(Math.abs(rotation-360)<1,`Expected exactly one turn, got ${rotation}`);
    const oriented=frames.find(f=>f.elapsed===1840);
    assert(Math.abs(oriented.angle)<.001);
    const opening=frames.find(f=>f.elapsed===2210);
    assert(opening.clip.startsWith('polygon(evenodd'));
    assert(opening.scale>1.5);
    const middle=frames.find(f=>f.elapsed===1300);
    assert(Math.abs(middle.angle)>130,'Turn should have a readable intermediate orientation');
    await expect(overlay).toBeHidden();
    await expect(overlay).toHaveAttribute('data-intro-reason','complete');
    await resolved(page);
    assert(await page.evaluate(()=>!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#signature-intro')));
    await writeFile(`test-results/intro-frames-${width}.json`,JSON.stringify(frames,null,2));
    results.geometry.push({width,height,turnDegrees:rotation,centered:true,originalPaths:true,overflow:false});
    await page.context().close();
  }
  console.log('Geometry: offscreen entry, centered assembly, exactly 360°, scale and clipping passed at 5 sizes.');

  const session=await create();
  const time=new Date('2026-10-21T15:00:00Z');
  await session.clock.install({time});await session.clock.pauseAt(time);
  await session.goto(base,{waitUntil:'load'});
  await expect(session.locator('#signature-intro')).toBeVisible();
  await session.clock.runFor(2800);
  await expect(session.locator('#signature-intro')).toBeHidden();
  assert.equal(await session.evaluate(()=>sessionStorage.getItem('suplio:intro:v1')),'seen');
  await session.reload({waitUntil:'load'});
  await expect(session.locator('#signature-intro')).toBeHidden();await resolved(session);
  await session.goto(preview,{waitUntil:'load'});
  await expect(session.locator('#signature-intro')).toBeVisible();
  await session.clock.runFor(2800);
  await session.goto(`${base}/#servicios`,{waitUntil:'load'});
  await expect(session.locator('#signature-intro')).toBeHidden();
  await session.locator('.site-logo').click();
  await expect(session.locator('#signature-intro')).toBeHidden();
  results.behavior.push('One intro per session; preview overrides seen flag; internal anchors never replay');
  await session.context().close();

  for(const reason of ['skip','escape','tab','focus','wheel','resize','reduced-motion','navigation']) {
    const page=await create();
    await page.clock.install({time});await page.clock.pauseAt(time);
    await page.goto(preview,{waitUntil:'load'});
    await page.clock.runFor(250);
    if(reason==='skip')await page.getByRole('button',{name:'Omitir intro'}).click();
    if(reason==='escape')await page.keyboard.press('Escape');
    if(reason==='tab')await page.keyboard.press('Tab');
    if(reason==='focus')await page.locator('.hero .contact-link').focus();
    if(reason==='wheel')await page.mouse.wheel(0,250);
    if(reason==='resize')await page.setViewportSize({width:390,height:844});
    if(reason==='reduced-motion')await page.emulateMedia({reducedMotion:'reduce'});
    if(reason==='navigation')await page.evaluate(()=>document.dispatchEvent(new Event('astro:before-swap')));
    await expect(page.locator('#signature-intro')).toBeHidden();
    await resolved(page);
    if(reason==='skip')await expect(page.locator('#contenido')).toBeFocused();
    if(reason==='tab')assert(await page.evaluate(()=>!document.activeElement.closest('#signature-intro')));
    results.behavior.push(`Interruption ${reason}: overlay released and hero resolved`);
    await page.context().close();
  }

  for(const mode of ['nojs','reduce','storage','unsupported','anchor']) {
    const page=await create({javaScriptEnabled:mode!=='nojs',reducedMotion:mode==='reduce'?'reduce':'no-preference'});
    if(mode==='storage')await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage unavailable');};});
    if(mode==='unsupported')await page.addInitScript(()=>{CSS.supports=()=>false;});
    await page.goto(mode==='anchor'?`${preview}#servicios`:preview,{waitUntil:'load'});
    await expect(page.locator('#signature-intro')).toBeHidden();
    await expect(page.locator('.hero h1')).toBeVisible();await resolved(page);
    assert(await page.evaluate(()=>!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#signature-intro')));
    results.behavior.push(`Direct access with ${mode}: visible content, no blocking overlay`);
    await page.context().close();
  }

  const failure=await create();
  await failure.route('**/*.js*',route=>route.abort());
  await failure.clock.install({time});await failure.clock.pauseAt(time);
  await failure.goto(preview,{waitUntil:'load'});
  await expect(failure.locator('#signature-intro')).toHaveAttribute('data-intro-state','pending');
  await failure.clock.runFor(4600);
  await expect(failure.locator('#signature-intro')).toBeHidden();
  await expect(failure.locator('#signature-intro')).toHaveAttribute('data-intro-reason','timeout');
  await expect(failure.locator('.hero h1')).toBeVisible();
  await resolved(failure);
  results.behavior.push('Failed animation bundle: independent watchdog releases page within 4.5 s');
  await failure.context().close();

  const realtime=await create({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await realtime.addInitScript(()=>{
    const audit={cls:0,frames:0,heroMoved:false};window.__introAudit=audit;
    new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)audit.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
    function frame(){
      const root=document.querySelector('#signature-intro');
      if(root&&!root.hidden){audit.frames++;audit.heroMoved ||= [...document.querySelectorAll('.hero-mark path')].some(p=>{const t=getComputedStyle(p).transform;return t!=='none'&&!new DOMMatrix(t).isIdentity;});}
      if(root?.dataset.introState==='done'){audit.done=true;return;}requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
  });
  await realtime.goto(preview,{waitUntil:'load'});
  await expect(realtime.locator('#signature-intro')).toBeHidden({timeout:6000});
  await resolved(realtime);
  await expect(realtime.locator('#signature-intro')).toHaveAttribute('data-intro-reason','complete');
  const audit=await realtime.evaluate(()=>window.__introAudit);
  assert(audit.cls<.01);assert(!audit.heroMoved);assert(audit.frames>30);
  const accessibility=await new AxeBuilder({page:realtime}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  assert.deepEqual(accessibility.violations.map(v=>v.id),[]);
  results.realtime={...audit,axeViolations:0};
  await realtime.context().close();
  assert.deepEqual(errors,[]);
  await writeFile('test-results/intro-verification.json',JSON.stringify({base,...results,errors},null,2));
  console.log(JSON.stringify({base,...results,errors},null,2));
} finally { await browser.close(); }
