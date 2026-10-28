import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {startServer} from './server.mjs';
const require=createRequire(new URL('../../../web/package.json',import.meta.url));
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.production/typography-portal/hero-review');
await fs.mkdir(output,{recursive:true});
await fs.mkdir(path.join(output,'zero-start'),{recursive:true});
// Reuse the installed FFmpeg, without downloading a second binary or adding a package.
const binaries=path.join(output,'playwright-tools');
const manifest=JSON.parse(await fs.readFile(path.join(path.dirname(require.resolve('playwright-core/package.json')),'browsers.json'),'utf8'));
const revision=manifest.browsers.find(b=>b.name==='ffmpeg').revision;
const executable=process.platform==='darwin'?'ffmpeg-mac':process.platform==='win32'?'ffmpeg-win64.exe':'ffmpeg-linux';
const binaryDir=path.join(binaries,`ffmpeg-${revision}`);
await fs.mkdir(binaryDir,{recursive:true});
const installed=spawnSync('which',['ffmpeg'],{encoding:'utf8'}).stdout.trim();
if(!installed)throw Error('FFmpeg must already be installed');
await fs.symlink(installed,path.join(binaryDir,executable)).catch(e=>{if(e.code!=='EEXIST')throw e});
process.env.PLAYWRIGHT_BROWSERS_PATH=binaries;
const {chromium}=require('@playwright/test');
const server=await startServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const url=`http://127.0.0.1:${server.address().port}/?intro=preview`;
// Only the review driver emits input. The portal itself never moves scroll.
async function wheelTo(page,target,seconds){
 const start=await page.evaluate(()=>scrollY),frames=Math.round(seconds*30),amount=target-start;
 for(let i=1;i<=frames;i++){
  const t=i/frames,prev=(i-1)/frames,ease=x=>x*x*(3-2*x);
  await page.mouse.wheel(0,amount*(ease(t)-ease(prev)));await page.waitForTimeout(33);
 }
 await page.waitForTimeout(150);
}
try{
 for(const[name,viewport]of[['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
  if(process.env.MOTION_VIEWPORT&&process.env.MOTION_VIEWPORT!==name)continue;
  const context=await browser.newContext({viewport,isMobile:name==='mobile',hasTouch:name==='mobile',recordVideo:{dir:output,size:viewport,fps:30}}),page=await context.newPage();
  await page.goto(url);await page.waitForFunction(()=>window.heroPortalLab);await page.waitForTimeout(1100);
  await page.mouse.move(viewport.width-12,viewport.height-12);
  const state=await page.evaluate(()=>heroPortalLab.inspect());
  // Record actual rendered landmarks from BEFORE the first event, every frame.
  await page.evaluate(()=>{
    const frames=[];window.__portalInputFrames=frames;let lastY=-1;
    const sample=()=>{const p=document.querySelector('.hero-portal-camera svg > g > g > path:last-child'),s=heroPortalLab.inspect(),r=p.getBoundingClientRect();
      if(scrollY!==lastY||!frames.length){frames.push({time:performance.now(),scrollY,progress:s.progress,overlay:s.overlay,o:{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}});lastY=scrollY;}
      window.__portalInputRaf=requestAnimationFrame(sample);
    };sample();
  });
  const cdp=name==='mobile'?await context.newCDPSession(page):null;
  async function touchTo(target,seconds){
    const from=await page.evaluate(()=>scrollY),direction=Math.sign(target-from),speed=Math.round(Math.max(80,Math.abs(target-from)/seconds));
    for(let i=0;i<30;i++){
      const current=await page.evaluate(()=>scrollY),delta=target-current;
      if(direction*delta<=1)break;
      await cdp.send('Input.synthesizeScrollGesture',{x:viewport.width*.5,y:direction>0?viewport.height*.72:viewport.height*.3,yDistance:-direction*Math.round(Math.min(240,Math.abs(delta))),speed,gestureSourceType:'touch',preventFling:true});
    }
  }
  // Slow, small first input makes the absence of pre-scroll visible in the MP4.
  if(cdp)await cdp.send('Input.synthesizeScrollGesture',{x:viewport.width*.5,y:viewport.height*.65,yDistance:-60,speed:120,gestureSourceType:'touch',preventFling:true});
  else{await page.mouse.wheel(0,12);await page.waitForTimeout(220);await page.mouse.wheel(0,12);}
  await page.waitForTimeout(500);
  if(cdp)await touchTo(state.end+24,6);else await wheelTo(page,state.end+24,6);
  await page.waitForTimeout(1000);
  if(cdp)await touchTo(0,7);else await wheelTo(page,0,7);
  await page.waitForTimeout(1100);
  const frames=await page.evaluate(()=>{cancelAnimationFrame(window.__portalInputRaf);return window.__portalInputFrames});
  await fs.writeFile(path.join(output,'zero-start',`${name}-input-frames.json`),JSON.stringify(frames,null,2));
  await cdp?.detach();
  const raw=await page.video().path();await context.close();
  await fs.rename(raw,path.join(output,`${name}-capture.webm`));
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(output,`${name}-capture.webm`),'-an','-vf',name==='desktop'?'scale=1280:800':'scale=390:844','-r','30','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,`${name}.mp4`)],{stdio:'inherit'});
  if(result.status!==0)throw Error(`FFmpeg failed: ${result.status}`);console.log(`${name}.mp4 exported`);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
