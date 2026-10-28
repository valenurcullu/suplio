// Regression from scroll ZERO: never seek past a delayed activation point.
import{createRequire}from'node:module';
import fs from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
import assert from'node:assert/strict';
import{startServer}from'./server.mjs';
const require=createRequire(new URL('../../../web/package.json',import.meta.url)),{chromium}=require('@playwright/test'),sharp=require('sharp');
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.production/typography-portal/hero-review/zero-start');
await fs.mkdir(output,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({channel:'chrome',headless:true}),url=`http://127.0.0.1:${server.address().port}/`;
const report={viewports:[],errors:[]};
async function move(page,p){await page.evaluate(p=>{const s=heroPortalLab.inspect();scrollTo({top:s.end*p,behavior:'instant'})},p);await page.waitForTimeout(100);}
async function opening(page){return page.locator('.hero-portal-camera svg > g > g > path:last-child').evaluate(p=>{const r=p.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}});}
async function inkOverlap(a,b){const aa=await sharp(a).removeAlpha().raw().toBuffer(),bb=await sharp(b).removeAlpha().raw().toBuffer();let common=0,total=0;for(let i=0;i<aa.length;i+=3){const x=aa[i]<70,y=bb[i]<70;if(x&&y)common++;if(x||y)total++;}return common/total;}
try{
 for(const[width,height]of[[1440,900],[1280,720],[768,1024],[390,844],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.heroPortalLab);
  const initial=await page.evaluate(()=>({...heroPortalLab.inspect(),y:scrollY,pin:Boolean(__suplioPortalRuntime.ScrollTrigger.getById('hero-typography-portal').pin)}));
  assert.equal(initial.y,0);assert.equal(initial.start,0);assert(initial.overlay,'The fixed camera must be ready BEFORE the first scroll');assert(!initial.pin,'No activation-time pin spacer/layout mutation');assert.equal(await page.locator('.hero-baseline').count(),0);
  // Actual native HTML at zero versus the prepared, visually identical camera.
  const nativePage=await context.newPage();await nativePage.goto(url+'?baseline=1');await nativePage.waitForFunction(()=>document.querySelector('.hero').dataset.heroPhase==='complete');
  const box=await page.locator('h1').boundingBox(),clip={x:Math.floor(box.x),y:Math.floor(box.y),width:Math.ceil(box.width),height:Math.ceil(box.height)};
  const native=await nativePage.screenshot({clip,path:path.join(output,`${width}-native-zero.png`)}),projected=await page.screenshot({clip,path:path.join(output,`${width}-camera-zero.png`)}),overlap=await inkOverlap(native,projected);assert(overlap>.985,`Zero frame mismatch ${width}: ${overlap}`);await nativePage.close();
  const origin=await opening(page);
  // A literal ONE pixel of scroll must already magnify, without translation.
  await page.evaluate(()=>scrollTo({top:1,behavior:'instant'}));await page.waitForTimeout(100);const firstPixel=await opening(page);assert(firstPixel.width>origin.width*1.0005,`Dead zoom zone at ${width}/1px`);assert(Math.hypot(firstPixel.x-origin.x,firstPixel.y-origin.y)<.05);
  await move(page,0);
  // First real input, rather than programmatic seeking to the animation range.
  if(width<600){const cdp=await context.newCDPSession(page);await cdp.send('Input.synthesizeScrollGesture',{x:width*.5,y:height*.65,yDistance:-60,speed:150,gestureSourceType:'touch',preventFling:true});await cdp.detach();}
  else await page.mouse.wheel(0,24);
  await page.waitForTimeout(160);const firstGesture=await page.evaluate(()=>({y:scrollY,state:heroPortalLab.inspect()})),first=await opening(page);assert(firstGesture.y>0);assert(first.width>origin.width*1.015,`First gesture did not visibly zoom ${width}`);assert(Math.hypot(first.x-origin.x,first.y-origin.y)<.05,`First gesture translated the hero ${width}`);
  await page.screenshot({path:path.join(output,`${width}-first-gesture.png`)});
  const frames=new Map();let largestDrift=0,previousWidth=origin.width;
  // Inspect every early pixel: no dead zone, reverse zoom, or independent pan.
  await move(page,0);
  for(let y=1;y<=100;y+=3){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(25);const o=await opening(page);assert(o.width>previousWidth,`Non-monotone initial zoom ${width}/${y}`);previousWidth=o.width;largestDrift=Math.max(largestDrift,Math.hypot(o.x-origin.x,o.y-origin.y));assert(largestDrift<.05,`Pre-zoom translation ${width}/${y}`);}
  for(const p of[0,.08,.16,.24,.28,.4,.6,1,.6,.4,.28,.24,.16,.08,0]){
   await move(page,p);const s=await page.evaluate(()=>heroPortalLab.inspect());assert(!s.overflows);
   if(p===1){assert(!s.overlay);continue;}
   const viewBox=await page.locator('.hero-portal-camera svg').getAttribute('viewBox');if(frames.has(p))assert.equal(viewBox,frames.get(p),`Reverse camera mismatch ${width}/${p}`);frames.set(p,viewBox);
  }
  const returned=await page.screenshot({clip});assert(await inkOverlap(projected,returned)>.995,`Zero return changed ${width}`);
  report.viewports.push({width,height,start:0,preparedBeforeInput:true,noHeroPin:true,zeroFrameInkOverlap:overlap,firstPixelMagnification:firstPixel.width/origin.width,firstGesture:width<600?'touch':'wheel',firstGestureScrollPx:firstGesture.y,firstGestureMagnification:first.width/origin.width,earlyOpeningDriftPx:largestDrift,reverse:true,returnToZero:true,overflow:false});await context.close();console.log(`Zero start ${width} passed`);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
