const { gsap } = window;
const $ = selector => document.querySelector(selector);
const webFrame = $('#web-frame'), catalogFrame = $('#catalog-frame');
await Promise.all([webFrame, catalogFrame].map(async frame => {
  if (!frame.contentDocument?.querySelector('main') || frame.contentDocument.readyState !== 'complete') await new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
  await frame.contentDocument.fonts.ready;
  await Promise.all([...frame.contentDocument.images].map(img => img.decode()));
}));
await Promise.all([...$('#identity').querySelectorAll('img')].map(img => img.decode()));
const home = webFrame.contentDocument, catalog = catalogFrame.contentDocument;
const q = (doc, selector) => doc.querySelector(selector), qa = (doc, selector) => [...doc.querySelectorAll(selector)];
const nativeLogo = q(home, '.logo-img'), cta = q(home, '.hero-section .btn-primary');
const title = q(home, 'h1'), announcement = q(home, '.hero-announcement'), lead = q(home, '.lead'), buttons = qa(home, '.hero-section .btn');
const cards = qa(catalog, 'article'), product = q(catalog, '.product-img-wrapper');
// Original text remains in ordinary flow: no precomputed lines or screenshot stretching.
const state = { width: 1440, height: 900, visibleHeight: 845, logoMix: 0, opening: 0, transfer: 0, catalogHeight: 1050, ready: false };
const route = {};
let tl;
function project(plane, x, y) {
  const marker = $(`#${plane}-projector`);
  marker.style.left = `${x}px`; marker.style.top = `${y}px`;
  const r = marker.getBoundingClientRect(), film = $('#film').getBoundingClientRect(), scale = film.width / 1280;
  return { x: (r.x - film.x) / scale, y: (r.y - film.y) / scale };
}
function centerInFrame(element, plane, xf = .5, yf = .5) { const r = element.getBoundingClientRect(); return project(plane, r.x + r.width * xf, r.y + r.height * yf); }
function edge() { return project('web', state.width + 1, state.visibleHeight * .52); }
function cubic(a, b, c, d, t) { const u = 1 - t; return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x, y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y }; }
const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => { t = clamp(t); return t*t*t*(t*(t*6 - 15) + 10); };
// Arc-length sampling separates the speed profile from the curvature of each gesture.
// This avoids acceleration caused merely by long Bezier control handles.
function gesture(a, b, c, d, progress) {
  const samples = [{ t: 0, length: 0 }]; let previous = a, length = 0;
  for (let i = 1; i <= 48; i++) { const t = i / 48, p = cubic(a, b, c, d, t); length += Math.hypot(p.x - previous.x, p.y - previous.y); samples.push({ t, length }); previous = p; }
  const target = smooth(progress) * length;
  const next = samples.findIndex(s => s.length >= target);
  if (next <= 0) return a;
  const low = samples[next - 1], high = samples[next];
  return cubic(a, b, c, d, low.t + (high.t - low.t) * (target - low.length) / Math.max(.0001, high.length - low.length));
}
function pointer(time) {
  if (!state.ready) return;
  let p, mode = 'arrow', opacity = 1, press = 1;
  if (time < 1.96) { p = { x: 1150, y: 650 }; opacity = 0; }
  else if (time < 2.6) {
    const destination = centerInFrame(cta, 'web');
    p = gesture({ x: 1150, y: 650 }, { x: 1025, y: 520 }, { x: destination.x + 185, y: destination.y + 65 }, destination, (time - 1.96) / .64);
    opacity = clamp((time - 1.96) / .14);
  } else if (time < 3.08) { p = centerInFrame(cta, 'web'); if (time >= 2.70 && time < 2.86) press = .84 + .16 * Math.abs((time - 2.78) / .08); }
  else if (time < 4.18) {
    const destination = centerInFrame(product, 'catalog', .56, .52);
    p = gesture(route.afterClick, { x: route.afterClick.x + 210, y: route.afterClick.y - 95 }, { x: destination.x + 150, y: destination.y + 35 }, destination, (time - 3.08) / 1.1);
  } else if (time < 5.35) p = centerInFrame(product, 'catalog', .56, .52);
  else if (time < 6.43) {
    p = gesture(route.afterDetail, { x: route.afterDetail.x + 190, y: route.afterDetail.y - 90 }, { x: route.beforeGrip.x - 130, y: route.beforeGrip.y - 50 }, route.beforeGrip, (time - 5.35) / 1.08);
    if (time > 6.36) mode = 'resize';
  } else if (time <= 9.17) {
    p = edge(); mode = 'resize';
    // The hand pauses on the edge, visibly presses it, then keeps its contact point.
    press = 1 - .13 * smooth((time - 6.51) / .13) + .13 * smooth((time - 9.1) / .07);
  } else {
    const destination = { x: route.afterDrag.x + 122, y: route.afterDrag.y + 94 };
    p = gesture(route.afterDrag, { x: route.afterDrag.x + 27, y: route.afterDrag.y + 9 }, { x: destination.x - 20, y: destination.y - 42 }, destination, (time - 9.17) / .62);
    opacity = 1 - smooth((time - 9.49) / .32);
  }
  gsap.set('#cursor', { x: p.x, y: p.y, opacity, force3D: true });
  gsap.set('#cursor-arrow', { opacity: mode === 'arrow' ? 1 : 0, scale: press });
  gsap.set('#cursor-resize', { opacity: mode === 'resize' ? 1 : 0, scale: press });
  let pulse = -1;
  if (time >= 2.72 && time < 3.03) pulse = (time - 2.72) / .31;
  if (time >= 6.54 && time < 6.85) pulse = (time - 6.54) / .31;
  if (time >= 9.1 && time < 9.32) pulse = (time - 9.1) / .22;
  gsap.set('#click-ring', { opacity: pulse < 0 ? 0 : .55 * (1 - pulse), scale: .38 + Math.max(0, pulse) * 1.15 });
  // A restrained contact halo persists only while the edge is actually being held.
  const hold = smooth((time - 6.54) / .12) * (1 - smooth((time - 9.1) / .13));
  gsap.set('#drag-contact', { opacity: .23 * hold, scale: .82 + .18 * hold });
  window.cursorState = { x: p.x, y: p.y, mode, visible: opacity > .01, dragging: time >= 6.65 && time <= 9.1 };
}
function sync() {
  const width = state.width, height = state.height;
  $('#web-plane').style.width = `${width}px`; $('#web-plane').style.height = `${state.visibleHeight}px`;
  $('#web-viewport').style.width = `${width}px`; $('#web-viewport').style.height = `${state.visibleHeight}px`;
  webFrame.style.width = `${width}px`; webFrame.style.height = `${height}px`;
  const time = tl?.time() ?? 0;
  // Both real UI planes share one camera during the spatial handoff. The moving
  // seam is expressed in the same native pixels, so it never exposes a gap.
  const exchange = time >= 5.3;
  $('#web-viewport').style.clipPath = exchange ? `inset(${845 * (1 - state.transfer)}px 0 0 0 round 12px)` : `inset(0 ${100 * (1 - state.opening)}% 0 0 round 12px)`;
  $('#catalog-viewport').style.height = `${state.catalogHeight}px`;
  $('#catalog-viewport').style.clipPath = `inset(0 0 ${845 * state.transfer}px 0 round 12px)`;
  webFrame.style.transform = `translateY(${exchange ? 52 * (1 - state.transfer) : 0}px)`;
  catalogFrame.style.transform = `translateY(${-64 * state.transfer}px)`;
  const handoff = time >= 1.92 && time < 11.1;
  nativeLogo.style.opacity = handoff ? '1' : '0';
  const logoRect = nativeLogo.getBoundingClientRect();
  const a = project('web', logoRect.x, logoRect.y), b = project('web', logoRect.right, logoRect.y);
  const scale = Math.hypot(b.x - a.x, b.y - a.y) / 410;
  gsap.set('#identity', { x: 435 + (a.x - 435) * state.logoMix, y: (720 - 410 * 317 / 1206) / 2 + (a.y - (720 - 410 * 317 / 1206) / 2) * state.logoMix, scale: 1 + (scale - 1) * state.logoMix, opacity: handoff ? 0 : 1, force3D: true });
  pointer(time);
}
gsap.set('#web-plane', { x: 115, y: 54, scale: .73, rotationY: -5, rotationX: 3, rotationZ: -.8, z: -30 });
gsap.set('#web-viewport', { clipPath: 'inset(0 100% 0 0 round 12px)' });
gsap.set('#catalog-plane', { x: 2100, y: 210, scale: .62, rotationY: 20, rotationX: -5, rotationZ: 4, z: -440 });
gsap.set('#white-return', { y: -720 });
gsap.set('#identity', { rotationY: 0, rotationX: 0 });
gsap.set(q(home, '.custom-navbar'), { clipPath: 'inset(0 100% 0 0 round 50px)' });
gsap.set(qa(home, '.custom-nav-links > li'), { opacity: 0, y: 12 });
gsap.set([title, announcement], { clipPath: 'inset(0 0 100% 0)', y: 24 });
gsap.set([lead, ...buttons], { opacity: 0, y: 16 });
gsap.set(q(home, '.hero-photo'), { scale: 1.035 });
gsap.set(q(catalog, 'main > .row:first-child'), { y: 35, opacity: 0 });
const row = q(catalog, '.row.row-cols-1'); row.style.perspective = '1500px'; row.style.transformStyle = 'preserve-3d';
for (const column of row.children) column.style.transformStyle = 'preserve-3d';
gsap.set(cards, { y: 80, z: 90, rotationX: -6, opacity: 0 });
gsap.set(qa(catalog, '.product-img-wrapper img'), { clipPath: 'inset(100% 0 0 0)', scale: 1.04 });
gsap.set(qa(catalog, '.card-body > *'), { y: 18, opacity: 0 });
gsap.set(q(catalog, '.badge-floating'), { opacity: 0, scale: .9 });

tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onUpdate: sync });
tl.to('#identity', { rotationY: -12, rotationX: 3, duration: .22, ease: 'power2.inOut' }, .15)
  .to('.logo-depth', { opacity: .55, duration: .15 }, .18)
  .to('#identity', { rotationY: 0, rotationX: 0, duration: .3, ease: 'power2.inOut' }, .37)
  .to('.logo-depth', { opacity: 0, duration: .2 }, .43)
  .to('#atmosphere', { opacity: 1, duration: .9 }, .65)
  .to(state, { opening: 1, duration: 1.05, ease: 'power3.inOut' }, .65)
  .to('#web-plane', { x: 85.6, y: 34.7, scale: .77, rotationY: 0, rotationX: 0, rotationZ: 0, z: 0, duration: 1.25, ease: 'power3.inOut' }, .65)
  .to(state, { logoMix: 1, duration: 1.05, ease: 'power3.inOut' }, .70)
  .to(q(home, '.custom-navbar'), { clipPath: 'inset(0 0 0 0 round 50px)', duration: .85, ease: 'power3.inOut' }, .9)
  .to(qa(home, '.custom-nav-links > li'), { opacity: 1, y: 0, duration: .45, stagger: .035 }, 1.22)
  .to(announcement, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: .55 }, 1.12)
  .to(title, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: .7 }, 1.24)
  .to(lead, { opacity: 1, y: 0, duration: .55 }, 1.52)
  .to(buttons, { opacity: 1, y: 0, duration: .5, stagger: .08 }, 1.7)
  .to(q(home, '.hero-photo'), { scale: 1, duration: 1.9 }, 1.1)
  // Pointer arrives before hover and click. The click starts the camera move.
  .to(cta, { backgroundColor: '#002a50', borderColor: '#002a50', scale: 1.025, duration: .18 }, 2.57)
  .to(cta, { scale: .965, duration: .075, ease: 'power2.in' }, 2.72)
  .to(cta, { scale: 1, duration: .18 }, 2.795)
  .to(cta, { backgroundColor: '#004481', borderColor: '#004481', duration: .18 }, 3.08)
  .to('#web-plane', { x: -50, y: -112, scale: .97, rotationY: -7, rotationX: 5, rotationZ: -2, z: 60, duration: .55, ease: 'power3.inOut' }, 2.76)
  .to('#web-plane', { x: -1270, y: -40, scale: .83, rotationY: -15, rotationX: 3, rotationZ: -3, z: -240, duration: .75, ease: 'power3.inOut' }, 3.17)
  .to('#catalog-plane', { x: 179, y: 26, scale: .64, rotationY: -2, rotationX: 1, rotationZ: 0, z: 0, duration: 1.02, ease: 'power3.inOut' }, 3.04)
  .to(q(catalog, 'main > .row:first-child'), { y: 0, opacity: 1, duration: .55 }, 3.35)
  .to(cards, { y: 0, z: 0, rotationX: 0, opacity: 1, duration: .7, stagger: .10 }, 3.45)
  .to(qa(catalog, '.product-img-wrapper img'), { clipPath: 'inset(0% 0 0 0)', scale: 1, duration: .7, stagger: .10 }, 3.57)
  .to(qa(catalog, '.card-body > *'), { y: 0, opacity: 1, duration: .5, stagger: .035 }, 3.72)
  .to(q(catalog, '.badge-floating'), { opacity: 1, scale: 1, duration: .4 }, 3.92)
  // Hover lifts the selected real card; the camera follows that detail.
  .to(cards[0], { z: 55, rotationY: -3, y: -6, duration: .4 }, 4.18)
  .to(q(catalog, '.product-img-wrapper img'), { scale: 1.07, duration: .75 }, 4.18)
  .to('#catalog-plane', { x: 128, y: -85, scale: .91, rotationY: -7.5, rotationX: 4.5, rotationZ: -2.1, z: 45, duration: .9, ease: 'power3.inOut' }, 4.22)
  .to(cards[1], { z: -12, y: 4, duration: .55 }, 4.22)
  .to(qa(catalog, '.card-body'), { y: -3, duration: .75 }, 4.22)
  // Pull back from the lifted product into the SAME desktop frame. The catalog
  // then travels up inside that frame, passing its momentum to the arriving hero.
  .to(cards[0], { z: 0, rotationY: 0, y: 0, duration: .48, ease: 'sine.inOut' }, 5.3)
  .to(cards[1], { z: 0, y: 0, duration: .48, ease: 'sine.inOut' }, 5.3)
  .to(qa(catalog, '.card-body'), { y: 0, duration: .48, ease: 'sine.inOut' }, 5.3)
  .to(q(catalog, '.product-img-wrapper img'), { scale: 1, duration: .48, ease: 'sine.inOut' }, 5.3)
  .set('#web-plane', { x: 128, y: -85, scale: .91, rotationY: -7.5, rotationX: 4.5, rotationZ: -2.1, z: 45 }, 5.3)
  .to('#catalog-viewport', { boxShadow: '0 22px 60px #002a5000', duration: .25 }, 5.3)
  .to(state, { catalogHeight: 845, duration: .3, ease: 'sine.inOut' }, 5.3)
  .to('#catalog-plane, #web-plane', { x: 85, y: 38, scale: .75, rotationX: 0, rotationY: 0, rotationZ: 0, z: 0, duration: 1.22, ease: 'sine.inOut' }, 5.3)
  .to(state, { transfer: 1, duration: .87, ease: 'power2.inOut' }, 5.56)
  .to('#edge-light, #grip', { opacity: 1, duration: .20 }, 6.32)
  .to('#grip', { scaleX: 1.45, scaleY: .84, backgroundColor: '#38bdf8', duration: .11, ease: 'power2.inOut' }, 6.54)
  .to('#grip', { scaleX: 1.15, scaleY: .94, duration: .2, ease: 'power2.out' }, 6.65)
  // A genuine viewport resize: the CSS media queries run at every width.
  .to(state, { width: 390, height: 844, visibleHeight: 844, duration: 2.45, ease: 'power2.inOut' }, 6.65)
  .to('#grip', { backgroundColor: '#fff', scaleX: 1, scaleY: 1, duration: .16, ease: 'power2.out' }, 9.1)
  .to('#edge-light, #grip', { opacity: 0, duration: .28 }, 9.24)
  .to('#web-plane', { x: 480.1, y: 13.96, scale: .82, duration: 1.08, ease: 'power2.inOut' }, 9.25)
  // The white sweep first clears the native header. Only then can its official
  // mark leave the mobile window and grow to its opening position, over white.
  .to('#white-return', { y: 0, duration: 1.14, ease: 'sine.inOut' }, 10.78)
  .to(state, { logoMix: 0, duration: .85, ease: 'power2.inOut' }, 11.1)
  .to('#web-plane', { y: 30, rotationY: -3, rotationX: 1.5, rotationZ: .3, z: -55, duration: .95, ease: 'sine.inOut' }, 10.9)
  .to('#atmosphere', { opacity: 0, duration: .5 }, 11.55)
  .to({}, { duration: .5 }, 12.1);
tl.addLabel('heroCtaClick', 2.72).addLabel('productHover', 4.18).addLabel('resizeGrab', 6.65).addLabel('resizeRelease', 9.1);

// Cache departure points on their actual projected planes, rather than guessing.
tl.totalTime(3.08, false); sync(); route.afterClick = centerInFrame(cta, 'web');
tl.totalTime(5.35, false); sync(); route.afterDetail = centerInFrame(product, 'catalog', .56, .52);
tl.totalTime(6.52, false); sync(); route.beforeGrip = edge();
tl.totalTime(9.17, false); sync(); route.afterDrag = edge();
state.ready = true;
function fit() { const scale = Math.min(innerWidth / 1280, innerHeight / 720); $('#film').style.transform = `scale(${scale})`; $('#film').style.left = `${(innerWidth - 1280 * scale) / 2}px`; $('#film').style.top = `${(innerHeight - 720 * scale) / 2}px`; sync(); }
fit(); addEventListener('resize', fit);
tl.totalTime(0, false); sync();
window.motion = {
  duration: 12.6, fps: 30, timeline: tl,
  seek(time) { tl.totalTime(Math.max(0, Math.min(time, 12.6)), false); sync(); },
  settle: sync,
  inspect() { const p = edge(), r = $('#cursor').getBoundingClientRect(), film = $('#film').getBoundingClientRect(), fit = film.width / 1280; const actual = { x: (r.x - film.x) / fit, y: (r.y - film.y) / fit }; return { time: tl.time(), viewportWidth: webFrame.contentWindow.innerWidth, viewportHeight: webFrame.contentWindow.innerHeight, cssWidth: state.width, navbarMobile: home.defaultView.getComputedStyle(q(home, '.custom-menu-btn')).display !== 'none', titleHeight: title.getBoundingClientRect().height, titleText: title.innerText, cursor: window.cursorState, actualCursor: actual, edge: p, transfer: state.transfer, logo: (() => { const r = $('#identity').getBoundingClientRect(); return { top: (r.top - film.top) / fit, bottom: (r.bottom - film.top) / fit, visible: getComputedStyle($('#identity')).opacity === '1' }; })(), whiteBottom: ($('#white-return').getBoundingClientRect().bottom - film.top) / fit, cursorEdgeError: window.cursorState?.dragging ? Math.hypot(p.x - actual.x, p.y - actual.y) : null }; },
  play() { tl.repeat(-1).play(0); },
};
document.documentElement.classList.add('ready'); window.motionReady = true;
if (!new URLSearchParams(location.search).has('render')) window.motion.play();
