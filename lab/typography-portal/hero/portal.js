// Local experiment only. No scrollTo/scrollBy, URL writes, section clones or copied home modules.
const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const hero = document.querySelector('.hero'), services = document.querySelector('#servicios');
const intro = document.querySelector('#signature-intro'), header = document.querySelector('[data-header]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const glyph = await (await fetch('/__portal/glyph.json')).json();
for (let i = 0; i < 600 && (!window.__suplioPortalRuntime || !intro.hidden || hero.dataset.heroPhase !== 'complete'); i++) await waitFrame();
await document.fonts.ready;
const { gsap, ScrollTrigger } = window.__suplioPortalRuntime ?? {};
if (!gsap || !ScrollTrigger || !hero || !services) throw Error('Original home runtime unavailable; original page remains usable');
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attributes = {}, parent) { const node = document.createElementNS(NS, tag); for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value)); parent?.append(node); return node; }
const layer = document.createElement('div'); layer.className = 'hero-portal-camera'; layer.hidden = true; layer.setAttribute('aria-hidden','true');
const svg = el('svg',{xmlns:NS,focusable:'false'},layer);
const defs = el('defs',{},svg), mask = el('mask',{id:'hero-o-counter',maskUnits:'userSpaceOnUse',x:-4000,y:-4000,width:12000,height:12000,style:'mask-type:luminance'},defs);
el('rect',{x:-4000,y:-4000,width:12000,height:12000,fill:'white'},mask);
const hole = el('path',{d:glyph.counter,fill:'black'},mask);
const scene = el('g',{mask:'url(#hero-o-counter)'},svg);
const paper=el('rect',{x:-4000,y:-4000,width:12000,height:12000,fill:'#f5f4f0'},scene);
let art = el('g',{},scene);
document.body.append(layer);
const spacer = document.createElement('div'); spacer.className = 'hero-portal-distance'; spacer.setAttribute('aria-hidden','true');
const originalServicesStyle = services.getAttribute('style');
const ctx = document.createElement('canvas').getContext('2d');
const state = { enabled:false, progress:0, start:0, end:0, distance:0, geometry:null, mode:'waiting' };
let trigger, snapshot, interacted = false, resizeTimer, painting = false, previousScrollY = scrollY;
const smooth = x => { x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10); };
const top = node => node.getBoundingClientRect().top + scrollY;
// Remove the old 6% dead zone. A monotone Hermite lead-in has nonzero zoom
// velocity at scroll zero, and meets the existing curve/value/speed at 35%.
function zoomProgress(progress){
  const join=.35;
  if(progress>=join)return smooth((progress-.06)/.86);
  const t=progress/join,u=(join-.06)/.86,value=smooth(u);
  const slope=30*u*u*(1-u)*(1-u)/.86;
  return (t*t*t-2*t*t+t)*join*.6+(-2*t*t*t+3*t*t)*value+(t*t*t-t*t)*join*slope;
}
const localGlyph = () => {
  const walker=document.createTreeWalker(hero.querySelector('h1'),NodeFilter.SHOW_TEXT);
  for(let n=walker.nextNode();n;n=walker.nextNode()) {
    const at=n.data.indexOf('desafíos'); if(at<0)continue;
    const offset=at+'desafí'.length,range=document.createRange();range.setStart(n,offset);range.setEnd(n,offset+1);
    return {node:n,range,style:getComputedStyle(n.parentElement)};
  }
  throw Error('The actual o of desafíos could not be located');
};
function baseline(rect,style){ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const m=ctx.measureText('Hg');const a=m.fontBoundingBoxAscent,d=m.fontBoundingBoxDescent;return rect.top+(rect.height-a-d)/2+a;}
function stripIds(node){node.removeAttribute?.('id');node.querySelectorAll?.('[id]').forEach(n=>n.removeAttribute('id'));}
function capture(){
  art.remove();art=el('g',{},scene);
  // Normalize live DOM measurements to the activation frame. This is not a
  // camera translation; it keeps the origin identical across wheel sizes/reversal.
  const delta=scrollY-state.start,source=localGlyph();
  // The fixed camera is prepared at scroll zero, before the first input. Its
  // paper ends at the real hero edge so Services below remains identical at rest.
  paper.setAttribute('height',4000+hero.getBoundingClientRect().bottom+delta);
  // Rectangles and circles of the original hero, measured live.
  for(const node of hero.querySelectorAll('.contact-link,.contact-link__icon,.round-arrow,.status-dot')){
    const r=node.getBoundingClientRect(),s=getComputedStyle(node);
    el('rect',{x:r.left,y:r.top+delta,width:r.width,height:r.height,rx:node.matches('.round-arrow,.status-dot')?r.width/2:0,fill:s.backgroundColor==='rgba(0, 0, 0, 0)'?'none':s.backgroundColor,stroke:parseFloat(s.borderTopWidth)?s.borderTopColor:'none','stroke-width':parseFloat(s.borderTopWidth)||0},art);
  }
  // Decorational SVGs only: the hero itself, its headings and all site sections
  // remain single original DOM nodes. Screen matrices retain authored arrow rotations.
  for(const original of hero.querySelectorAll('svg')){
    const m=original.getScreenCTM(),style=getComputedStyle(original);
    const group=el('g',{transform:`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f+delta})`,color:style.color,fill:style.fill,stroke:style.stroke,'stroke-width':style.strokeWidth},art);
    for(const child of original.children){const copy=child.cloneNode(true);stripIds(copy);group.append(copy);}
  }
  const walker=document.createTreeWalker(hero,NodeFilter.SHOW_TEXT);
  let runs=0;
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(node.parentElement.closest('svg,script,style,noscript'))continue;
    const style=getComputedStyle(node.parentElement);if(style.display==='none')continue;
    let run=null,offset=0;
    for(const char of node.data){
      const range=document.createRange(),at=offset;range.setStart(node,offset);range.setEnd(node,offset+char.length);offset+=char.length;
      // The portal glyph is a true outline: it stays smooth at extreme magnification.
      if(node===source.node&&at===source.range.startOffset){run=null;continue;}
      const r=range.getBoundingClientRect();if(r.width<.01||!r.height)continue;
      const y=baseline(r,style)+delta;
      if(!run||Math.abs(run.y-y)>.6){run={y,chars:'',xs:[],text:el('text',{'font-family':style.fontFamily,'font-size':style.fontSize,'font-weight':style.fontWeight,'font-style':style.fontStyle,'letter-spacing':0,fill:style.color,'xml:space':'preserve'},art)};runs++;}
      run.chars+=style.textTransform==='uppercase'?char.toLocaleUpperCase('es-AR'):char;run.xs.push(r.left);run.text.textContent=run.chars;run.text.setAttribute('x',run.xs.join(' '));run.text.setAttribute('y',run.y);
    }
  }
  // Pointer access to the original hero actions is retained in the projection;
  // native href handling does the navigation. No programmatic scrolling is used.
  for(const a of hero.querySelectorAll('a[href]')){
    const r=a.getBoundingClientRect(),link=el('a',{href:a.getAttribute('href'),tabindex:-1},art);
    el('rect',{x:r.left,y:r.top+delta,width:r.width,height:r.height,fill:'transparent','pointer-events':'all'},link);
  }
  const r=source.range.getBoundingClientRect(),size=parseFloat(source.style.fontSize),k=size/1000,y=baseline(r,source.style)+delta;
  const transform=`translate(${r.left} ${y}) scale(${k} ${-k})`;
  hole.setAttribute('transform',transform);
  el('path',{d:glyph.outline,transform,fill:source.style.color,'fill-rule':'evenodd'},art);
  const counterCenter={x:r.left+307.5*k,y:y-246.5*k};
  const endWidth=Math.min(305*k*.40,337*k*.40*innerWidth/innerHeight);
  snapshot={w:innerWidth,h:innerHeight,x:counterCenter.x,y:counterCenter.y,maxScale:innerWidth/endWidth,runs,source:{letter:source.range.toString(),rect:{x:r.left,y:r.top+delta,width:r.width,height:r.height},fontSize:size,fontWeight:source.style.fontWeight}};
  state.geometry=snapshot;
}
function paint(progress){
  if(painting||!state.enabled)return;painting=true;
  state.progress=progress;
  const active=progress>=0&&progress<1&&scrollY>=state.start&&scrollY<=state.end;
  gsap.set(services,{y:-state.distance*(1-progress),force3D:true});
  services.inert=active&&progress>0&&progress<.75;
  if(active){
    if(!snapshot)capture();
    layer.hidden=false;hero.setAttribute('data-portal-camera-active','');
    const p=zoomProgress(progress),scale=Math.exp(Math.log(snapshot.maxScale)*p);
    // Zoom about the measured o first: independent early panning moved the hero
    // downward before magnification became visible. Rejoin the approved camera
    // only after the zoom is established; its later path remains unchanged.
    const anchoredAim=1-1/scale,reframe=smooth((p-.12)/.20);
    const aim=anchoredAim+((1-Math.pow(1-p,8))-anchoredAim)*reframe;
    const x=snapshot.w/2+(snapshot.x-snapshot.w/2)*aim,y=snapshot.h/2+(snapshot.y-snapshot.h/2)*aim;
    const w=snapshot.w/scale,h=snapshot.h/scale;
    svg.setAttribute('viewBox',`${x-w/2} ${y-h/2} ${w} ${h}`);
  }else{layer.hidden=true;hero.removeAttribute('data-portal-camera-active');}
  painting=false;
}
function restoreServices(){services.inert=false;if(originalServicesStyle===null)services.removeAttribute('style');else services.setAttribute('style',originalServicesStyle);gsap.core.getCache(services).uncache=1;}
function disarm(mode){
  state.enabled=false;state.mode=mode;trigger?.kill();trigger=null;layer.hidden=true;hero.removeAttribute('data-portal-camera-active');spacer.remove();restoreServices();snapshot=null;ScrollTrigger.refresh();
}
function arm(){
  if(state.enabled||reduced.matches||innerHeight<480||!intro.hidden)return;
  state.enabled=true;state.mode='portal';state.distance=Math.round(Math.min(1000,innerHeight*(innerWidth<700?.68:.95)));
  hero.after(spacer);spacer.style.height=`${state.distance}px`;gsap.set(services,{y:-state.distance,force3D:true});
  state.start=0;
  const end=()=>top(services)-Number(gsap.getProperty(services,'y'))-header.offsetHeight;
  trigger=ScrollTrigger.create({id:'hero-typography-portal',trigger:hero,start:()=>state.start,end,
    onUpdate:self=>paint(self.progress),onRefresh:self=>{state.end=self.end;snapshot=null;paint(self.progress);},
  });
  ScrollTrigger.refresh();state.end=trigger.end;paint(trigger.progress);
}
function navigation(event){
 const a=event.target.closest?.('a[href]');if(!a)return;
 const href=a.getAttribute('href'),url=new URL(href,location.href);
 if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash&&state.enabled){disarm('native-navigation');}
 // Do not cancel the event, write the URL or move the scroll position.
}
document.addEventListener('click',navigation,true);
document.addEventListener('focusin',event=>{
  if(state.enabled&&state.progress<1&&(hero.contains(event.target)||services.contains(event.target)))disarm('keyboard-flow');
},true);
hero.addEventListener('selectstart',()=>{if(state.enabled&&state.progress===0)disarm('text-selection');});
for(const event of ['wheel','touchstart','keydown'])window.addEventListener(event,()=>interacted=true,{passive:true});
window.addEventListener('scroll',()=>{
 if(!state.enabled&&!reduced.matches&&scrollY<4&&previousScrollY>4&&(location.hash==='#inicio'||!location.hash||interacted))arm();
 previousScrollY=scrollY;
},{passive:true});
reduced.addEventListener('change',()=>{if(reduced.matches)disarm('reduced-motion');else if(scrollY<4)arm();});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
 if(!state.enabled)return;if(innerHeight<480){disarm('short-viewport');return;}
 state.distance=Math.round(Math.min(1000,innerHeight*(innerWidth<700?.68:.95)));spacer.style.height=`${state.distance}px`;
 state.start=0;snapshot=null;ScrollTrigger.refresh();
},160)},{passive:true});
window.addEventListener('pagehide',()=>{trigger?.kill();layer.hidden=true;},{once:true});
if(!location.hash||location.hash==='#inicio')arm();else state.mode='native-anchor';
window.heroPortalLab={inspect:()=>({...state,geometry:snapshot,order:[...document.querySelectorAll('main section')].map(n=>n.id||n.className),glyph:localGlyph().range.toString(),heroText:hero.querySelector('h1').textContent,servicesTop:services.getBoundingClientRect().top,overflows:document.documentElement.scrollWidth>innerWidth,overlay:!layer.hidden}),disable:()=>disarm('inspection')};
document.documentElement.dataset.heroPortalReady='true';
