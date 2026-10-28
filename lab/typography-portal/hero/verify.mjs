import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {startServer} from './server.mjs';
const require=createRequire(new URL('../../../web/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.production/typography-portal/hero-review');
await fs.mkdir(output,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const url=`http://127.0.0.1:${server.address().port}/`;
const report={viewports:[],anchors:[],errors:[]};
async function open(options={},suffix=''){
 const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url+suffix);if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>window.heroPortalLab);return {context,page};
}
async function move(page,p){await page.evaluate(p=>{const s=heroPortalLab.inspect();scrollTo({top:s.start+(s.end-s.start)*p,behavior:'instant'})},p);await page.waitForTimeout(150);return page.evaluate(()=>heroPortalLab.inspect());}
const geometry=page=>page.evaluate(()=>[...document.querySelectorAll('.hero,.hero h1,.hero-line,.hero-solution-line,.hero-art,.hero-bottom')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height,n.textContent]}));
try{
 for(const[width,height]of[[1440,900],[1280,720],[768,1024],[390,844],[320,568]]){
  const{context,page}=await open({viewport:{width,height}});await page.waitForTimeout(250);
  const original=await context.newPage();await original.goto(url+'?baseline=1');await original.waitForFunction(()=>document.querySelector('.hero').dataset.heroPhase==='complete');await original.waitForTimeout(250);
  const before=await geometry(page),baseline=await geometry(original);
  for(let i=0;i<before.length;i++)for(let j=0;j<4;j++)assert(Math.abs(before[i][j]-baseline[i][j])<.1,`Initial layout differs ${width} ${i} ${j}`);
  await original.close();
  const initial=await page.evaluate(()=>heroPortalLab.inspect());
  assert.equal(initial.heroText,'Tu empresa tiene sus desafíos. Diseñamos la tecnología para resolverlos.');
  assert.deepEqual(initial.order,['hero shell','servicios','como-trabajamos','proyectos','identity','contacto','consulta']);
  assert.equal(await page.locator('h1').count(),1);assert.equal(initial.glyph,'o');
  const samples={};
  for(const p of[.001,.2,.4,.6,.8,1,.8,.6,.4,.2,.001]){
   const s=await move(page,p);assert(!s.overflows,`Overflow ${width} ${p}`);assert(Math.abs(s.progress-p)<.002);
   const box=await page.locator('.hero-portal-camera svg').getAttribute('viewBox');
   if(samples[p])assert.equal(box,samples[p],`Reverse mismatch ${width} ${p}`);samples[p]=box;
   if(p===.6)await page.screenshot({path:path.join(output,`${width}-portal.png`)});
   if(p===1){assert(!s.overlay);assert(!await page.locator('#servicios').evaluate(n=>n.inert));await page.screenshot({path:path.join(output,`${width}-services.png`)});}
  }
  await move(page,1);
  const demo=page.locator('[data-service-demo]').first();await demo.scrollIntoViewIfNeeded();await demo.click();
  await page.waitForFunction(()=>document.querySelector('[data-service-demo]').dataset.demoState==='playing');
  await page.locator('#como-trabajamos').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  assert(await page.locator('#como-trabajamos').isVisible());
  assert.equal(await page.locator('[data-process-step]').count(),4);
  report.viewports.push({width,height,initialLayoutUnchanged:true,originalText:true,orderUnchanged:true,reversible:true,overflow:false,serviceDemo:true,processPresent:true});
  console.log(`Viewport ${width} passed`);await context.close();
 }
 // All native navigation paths bypass the camera before the browser resolves the anchor.
 for(const width of[1440,390]){
  for(const hash of['servicios','como-trabajamos','proyectos','contacto']){
   const{context,page}=await open({viewport:{width,height:844}});
   await move(page,.4);
   if(width<700)await page.locator('.menu-toggle').click();
   const link=page.locator(`${width<700?'#mobile-menu':'.site-header'} a[href="#${hash}"]`).filter({visible:true}).first();
   await link.click();await page.waitForTimeout(1600);
   const s=await page.evaluate(()=>heroPortalLab.inspect());assert(!s.enabled&&!s.overlay);assert.equal(new URL(page.url()).hash,'#'+hash);
   const r=await page.locator('#'+hash).boundingBox();assert(r.y<150&&r.y>-80,`Native anchor position ${width}/${hash}: ${r.y}`);
   assert(!await page.locator('#servicios').evaluate(n=>n.inert));report.anchors.push({width,hash,click:true});console.log(`Anchor ${width} ${hash} passed`);await context.close();
  }
 }
 for(const width of[1440,390])for(const hash of['servicios','como-trabajamos','proyectos','contacto']){
  const{context,page}=await open({viewport:{width,height:844}},'#'+hash);await page.waitForTimeout(600);assert(!(await page.evaluate(()=>heroPortalLab.inspect())).enabled);
  const r=await page.locator('#'+hash).boundingBox();assert(r.y<150&&r.y>-80,`Direct anchor ${hash} ${r.y}`);await context.close();
 }
 {
  const{context,page}=await open();await move(page,.4);await page.locator('.desktop-nav a[href="#servicios"]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);assert(!(await page.evaluate(()=>heroPortalLab.inspect())).enabled);assert.equal(new URL(page.url()).hash,'#servicios');report.keyboardNavigation=true;await context.close();
 }
 {
  const{context,page}=await open();await move(page,.1);const action=page.locator('.hero-portal-camera a[href="#servicios"]'),href=await action.getAttribute('href');await action.click();await page.waitForTimeout(1500);assert.equal(new URL(page.url()).hash,href);assert(!(await page.evaluate(()=>heroPortalLab.inspect())).enabled);report.projectedHeroAction=true;await context.close();
 }
 {
  const{context,page}=await open({reducedMotion:'reduce'});assert(!(await page.evaluate(()=>heroPortalLab.inspect())).enabled);assert.equal(await page.locator('.hero-portal-distance').count(),0);assert(!await page.locator('#servicios').evaluate(n=>n.inert));report.reducedMotion=true;await context.close();
 }
 {
  const{context,page}=await open({javaScriptEnabled:false,viewport:{width:390,height:844}});assert(await page.locator('h1').isVisible());assert.equal(await page.locator('.hero-portal-camera').count(),0);assert.equal(await page.locator('main section').count(),7);report.noJavaScript=true;await context.close();
 }
 {
  const{context,page}=await open();await move(page,.4);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);const s=await move(page,.6);assert(!s.overflows);assert.equal(s.geometry.w,390);assert.equal(s.geometry.source.fontSize,37);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert(!(await page.evaluate(()=>heroPortalLab.inspect())).enabled);assert(!await page.locator('#servicios').evaluate(n=>n.inert));report.resizeAndPreferenceChange=true;await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
