import{createRequire}from'node:module';import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';import assert from'node:assert/strict';
const require=createRequire(new URL('../package.json',import.meta.url)),{chromium}=require('@playwright/test'),out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../.production/identity-3d');
await fs.mkdir(out,{recursive:true});const base=process.env.IDENTITY_TEST_URL??'http://127.0.0.1:4341/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={viewports:[],errors:[]};
async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text())});await page.addInitScript(()=>{window.__identityDraws=0;for(const key of['WebGLRenderingContext','WebGL2RenderingContext']){const proto=window[key]?.prototype;if(!proto)continue;for(const method of['drawArrays','drawElements']){const old=proto[method];proto[method]=function(...args){window.__identityDraws++;return old.apply(this,args)}}const names=new WeakMap(),get=proto.getUniformLocation,set=proto.uniformMatrix4fv;proto.getUniformLocation=function(program,name){const result=get.call(this,program,name);if(result)names.set(result,name);return result};proto.uniformMatrix4fv=function(location,transpose,value){if(names.get(location)==='modelViewMatrix')window.__identityMatrix=Array.from(value);return set.call(this,location,transpose,value)}}});await page.goto(base);await page.waitForFunction(()=>window.__suplioPortalRuntime);await page.waitForFunction(()=>document.querySelector('.hero').dataset.heroPhase==='complete');return{context,page};}
const state=page=>page.locator('[data-identity]').evaluate(e=>({...e.dataset,background:getComputedStyle(e).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,draws:window.__identityDraws}));
async function move(page,progress){await page.evaluate(p=>{const t=__suplioPortalRuntime.ScrollTrigger.getById('identity-assembly');scrollTo({top:t.start+(t.end-t.start)*p,behavior:'instant'})},progress);}
try{
 for(const[width,height]of[[1440,900],[1280,720],[768,1024],[390,844]]){
  const{context,page}=await open({viewport:{width,height},deviceScaleFactor:width===390?3:1,isMobile:width<600,hasTouch:width<600});
  assert(!(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('identity-scene')))),'Three loaded at hero');
  assert.equal(await page.locator('canvas').count(),0);
  assert.equal(await page.evaluate(()=>__suplioPortalRuntime.ScrollTrigger.getAll().filter(t=>t.vars.id==='identity-assembly').length),1);
  await move(page,.45);await page.waitForFunction(()=>document.querySelector('[data-identity]').dataset.identity3d==='ready');await page.waitForTimeout(800);
  let s=await state(page);assert.equal(s.background,'rgb(22, 20, 15)');assert(!s.overflow);assert.equal(s.identityPhase,'assembly');
  assert.equal(await page.locator('.identity-mark path').first().getAttribute('fill'),'#F5F4F0');assert.equal(await page.locator('.identity-mark path').nth(1).getAttribute('fill'),'#FF5A1F');
  assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.screenshot({path:path.join(out,`${width}-assembly.png`)});
  await move(page,1.01);await page.waitForFunction(()=>document.querySelector('[data-identity]').dataset.identityPhase==='3d');
  assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'0');assert.equal(await page.locator('.identity-canvas canvas').count(),1);
  const art=await page.locator('.identity-art').boundingBox(),canvas=await page.locator('.identity-canvas canvas').boundingBox();assert.deepEqual(canvas,art);
  const dpr=await page.locator('.identity-canvas canvas').evaluate(e=>e.width/e.getBoundingClientRect().width);assert(dpr<=2);
  const before=await page.locator('.identity-art').screenshot(),matrixBefore=await page.evaluate(()=>window.__identityMatrix);await page.mouse.move(art.x+art.width*.8,art.y+art.height*.3);await page.waitForTimeout(450);const after=await page.locator('.identity-art').screenshot();assert(!before.equals(after),'No rotation/interaction');if(width>=900){const matrixAfter=await page.evaluate(()=>window.__identityMatrix);assert(Math.abs(matrixBefore[5]-matrixAfter[5])>.0005,'Cursor did not change pitch independently of automatic yaw');}
  await page.screenshot({path:path.join(out,`${width}-integrated.png`)});
  // Same original trigger in reverse: flattening tracks the moving SVG pieces.
  await move(page,.6);await page.waitForTimeout(1000);s=await state(page);assert.equal(s.identityVolume,'0.0000');assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.locator('.identity-canvas').evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.screenshot({path:path.join(out,`${width}-reverse.png`)});
  await move(page,1.01);await page.waitForFunction(()=>document.querySelector('[data-identity]').dataset.identityPhase==='3d');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(250);const draws1=await page.evaluate(()=>window.__identityDraws);await page.waitForTimeout(300);const draws2=await page.evaluate(()=>window.__identityDraws);assert.equal(draws1,draws2,'WebGL continued rendering out of view');
  report.viewports.push({width,height,lazy:true,assemblyPreserved:true,volumeTransition:true,reverse:true,canvasCount:1,pixelRatio:dpr,offscreenPaused:true,overflow:false});await context.close();console.log(`Identity ${width} passed`);
 }
 {
  const{context,page}=await open({reducedMotion:'reduce',viewport:{width:390,height:844}});await page.locator('[data-identity]').scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.equal(await page.locator('canvas').count(),0);assert(!(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('identity-scene')))));assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'1');report.reducedMotion=true;await page.screenshot({path:path.join(out,'reduced-motion.png')});await context.close();
 }
 {
  const{context,page}=await open();await page.addInitScript(()=>{});
  // Force loss on a working context: the static official variant must take over.
  await move(page,1.01);await page.waitForFunction(()=>document.querySelector('[data-identity]').dataset.identityPhase==='3d');await page.locator('.identity-canvas canvas').evaluate(c=>c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());await page.waitForTimeout(200);
  assert.equal((await state(page)).identity3d,'fallback');assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'1');report.contextLossFallback=true;await context.close();
 }
 {
  const{context,page}=await open();await move(page,1.01);await page.waitForFunction(()=>document.querySelector('[data-identity]').dataset.identityPhase==='3d');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.identity-mark').evaluate(e=>getComputedStyle(e).opacity),'1');report.preferenceChangeDisposes=true;await context.close();
 }
 {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage();await page.goto(base+'#identity');assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.identity-mark path').first().getAttribute('fill'),'#F5F4F0');assert.equal(await page.locator('[data-identity]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(22, 20, 15)');report.noJavaScriptFallback=true;await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));await browser.close();}
