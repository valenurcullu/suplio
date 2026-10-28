const { gsap, ScrollTrigger } = window;
const $ = selector => document.querySelector(selector);
const portal = $('#portal'), frame = $('[data-frame]'), svg = $('.portal-svg');
const project = $('#proyecto'), video = $('#showcase'), toggle = $('.video-toggle');
const type = $('.type-scene'), camera = $('.project-camera'), header = $('[data-header]');
const lines = { first: $('[data-line=first]'), middle: $('[data-line=middle]'), last: $('[data-line=last]') };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { progress: 0, geometry: null, motion: false };
let context, trigger, timeline, near = false, userPaused = false, resizeTimer;
let destroyed = false;

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*x*(x*(x*6 - 15) + 10); };
const phase = (p, start, end) => smooth((p - start) / (end - start));
const mix = (a, b, t) => a + (b - a) * t;

// The aperture is the actual lower-case o contour from the official outlined
// Space Grotesk wordmark, including its counter. No font or logo is redrawn.
const glyph = await (await fetch('/glyph.json')).json();
await Promise.all([document.fonts.load('700 100px "Space Grotesk"'), document.fonts.ready]);
$('[data-glyph]').setAttribute('d', glyph.outline);
for (const node of document.querySelectorAll('[data-counter], [data-counter-plate]')) node.setAttribute('d', glyph.counter);
lines.middle.textContent = 'a l';

function layout() {
  const w = frame.clientWidth, h = state.motion ? frame.clientHeight : type.clientHeight;
  const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || (w < 700 ? 22 : w * .044);
  // A clamp() gutter cannot be parsed directly; use the header's actual padding.
  const inset = parseFloat(getComputedStyle(header).paddingLeft) || margin;
  for (const node of Object.values(lines)) node.setAttribute('font-size', '100');
  const widest = Math.max(lines.first.getComputedTextLength(), lines.last.getComputedTextLength()) / 100;
  const size = Math.min((w - inset * 2) / widest, Math.max(60, (h - 310) / 2.6));
  const middle = size * 1.32;
  const baseline = h / 2 - size * .6 + (w < 700 ? -12 : 4);
  lines.first.setAttribute('font-size', size);
  lines.middle.setAttribute('font-size', middle);
  lines.last.setAttribute('font-size', size);
  lines.first.setAttribute('x', inset); lines.first.setAttribute('y', baseline);
  const middleX = inset + (w > 700 ? w * .105 : 0);
  lines.middle.setAttribute('x', middleX); lines.middle.setAttribute('y', baseline + size * .96);
  lines.last.setAttribute('x', w > 700 ? w - inset - lines.last.getComputedTextLength() : inset);
  lines.last.setAttribute('y', baseline + size * 1.92);
  const x = middleX + lines.middle.getComputedTextLength() + middle * .035;
  const y = baseline + size * .96, k = middle / glyph.unitsPerEm;
  const transform = `translate(${x} ${y}) scale(${k} ${-k}) translate(${-glyph.originX} 0)`;
  for (const node of document.querySelectorAll('[data-glyph], [data-counter], [data-counter-plate]')) node.setAttribute('transform', transform);
  for (const node of document.querySelectorAll('[data-mask-field], [data-paper], #portal-aperture')) {
    node.setAttribute('x', -w); node.setAttribute('y', -h); node.setAttribute('width', w * 3); node.setAttribute('height', h * 3);
  }
  // The final viewBox lies comfortably inside the true rounded counter. Keeping
  // the viewport aspect ratio preserves every glyph instead of stretching it.
  const counterW = glyph.counterBounds.width * k, counterH = glyph.counterBounds.height * k;
  const endWidth = Math.min(counterW * .47, counterH * .47 * w / h);
  state.geometry = { w, h, x: x + glyph.counterCenter.x * k, y: y - glyph.counterCenter.y * k, maxScale: w / endWidth, size, counterW, counterH };
  if (!state.motion) { svg.setAttribute('viewBox', `0 0 ${w} ${h}`); $('[data-counter-plate]').style.opacity = '1'; }
}

function updateSurface() {
  const dark = state.motion ? scrollY >= (trigger?.start ?? Infinity) && state.progress > .68 : project.getBoundingClientRect().top <= 82;
  header.dataset.surface = dark ? 'dark' : 'light';
  portal.dataset.surface = dark ? 'dark' : 'light';
}

function render(p) {
  state.progress = p;
  const g = state.geometry;
  if (!g) return;
  const travel = phase(p, .18, .81);
  const scale = Math.exp(Math.log(g.maxScale) * travel);
  const aim = 1 - Math.pow(1 - travel, 3);
  const cx = mix(g.w / 2, g.x, aim), cy = mix(g.h / 2, g.y, aim);
  const w = g.w / scale, h = g.h / scale;
  svg.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
  // The vector viewBox changes the camera, not the raster/compositing layer size.
  // After passing through the counter the SVG is skipped entirely until reversal.
  type.style.visibility = p >= .82 ? 'hidden' : 'visible';
  gsap.set('[data-counter-plate]', { opacity: 1 - phase(p, .07, .22) });
  gsap.set('.type-meta, .type-bottom', { opacity: 1 - phase(p, .08, .25), y: -18 * phase(p, .08, .25) });
  const enter = phase(p, .4, .93), align = 1 - Math.pow(1 - enter, 2);
  gsap.set(camera, { x: mix(g.w < 700 ? 24 : 65, 0, align), y: mix(75, 0, align), z: mix(-150, 0, align), scale: mix(.82, 1, align), rotationY: mix(-18, 0, align), rotationX: mix(9, 0, align), rotationZ: mix(-4, 0, align), force3D: true });
  gsap.set('.depth-echo', { opacity: .65 * (1 - phase(p, .67, .94)) });
  const copy = phase(p, .57, .92);
  gsap.set('.project-heading, .project-label, .project-bottom', { y: 22 * (1 - copy), opacity: mix(.4, 1, copy) });
  gsap.set('[data-progress]', { scaleX: p });
  $('[data-phase-label]').textContent = p < .25 ? '01 / La idea' : p < .81 ? '02 / Atravesar' : '03 / Lo concreto';
  $('[data-phase-number]').textContent = `${p < .25 ? '01' : p < .81 ? '02' : '03'} — 03`;
  portal.dataset.phase = p >= .93 ? 'project' : p > .22 ? 'passage' : 'type';
  project.inert = p < .81;
  updateSurface();
}

function syncVideo() {
  const play = near && !document.hidden && !reduced.matches && !userPaused;
  if (play) video.play().catch(() => updateButton());
  else video.pause();
}
function updateButton() { toggle.innerHTML = `${video.paused ? 'Reproducir video' : 'Pausar video'} <span aria-hidden="true">${video.paused ? '▶' : 'Ⅱ'}</span>`; }
for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, updateButton);
toggle.addEventListener('click', () => { if (video.paused) { userPaused = false; video.play().catch(updateButton); } else { userPaused = true; video.pause(); } });
const observer = new IntersectionObserver(entries => {
  near = entries[0].isIntersecting;
  if (near && video.readyState === 0 && video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
  syncVideo();
}, { rootMargin: '350px 0px' });
observer.observe(portal);
document.addEventListener('visibilitychange', syncVideo);

function configure({ preserve = true } = {}) {
  const old = { active: trigger?.isActive, progress: state.progress };
  context?.revert(); trigger = undefined; timeline = undefined;
  // Short landscape viewports keep ordinary document flow and native controls.
  state.motion = !reduced.matches && innerHeight >= 540 && Boolean(gsap && ScrollTrigger);
  portal.classList.toggle('is-motion', state.motion);
  type.style.visibility = '';
  project.inert = false;
  video.controls = !state.motion; toggle.hidden = !state.motion;
  if (!state.motion) {
    state.progress = 0;
    portal.dataset.phase = 'static';
    gsap.set('.type-meta, .type-bottom, .project-camera, .project-heading, .project-label, .project-bottom, .depth-echo', { clearProps: 'all' });
    gsap.set('[data-counter-plate]', { opacity: 1 });
    layout(); updateSurface(); syncVideo();
    if (preserve && old.active && old.progress > .45) project.scrollIntoView({ behavior: 'instant', block: 'start' });
    return;
  }
  context = gsap.context(() => {
    layout();
    const cursor = { progress: 0 };
    timeline = gsap.timeline({ paused: true });
    timeline.to(cursor, { progress: 1, duration: 1, ease: 'none', onUpdate: () => render(cursor.progress) });
    trigger = ScrollTrigger.create({
      id: 'typography-portal-lab', trigger: portal, pin: frame, pinSpacing: true,
      animation: timeline, scrub: .5, start: 'top top',
      end: () => `+=${Math.round(frame.clientHeight * (innerWidth < 700 ? 2.6 : 3.0))}`,
      anticipatePin: 1, invalidateOnRefresh: true,
      onRefreshInit: layout,
      onRefresh: self => { timeline.progress(self.progress); render(self.progress); },
      onToggle: updateSurface,
    });
    render(0);
  }, portal);
  ScrollTrigger.refresh();
  if (preserve && old.active) {
    scrollTo({ top: trigger.start + old.progress * (trigger.end - trigger.start), behavior: 'instant' });
    ScrollTrigger.update(); trigger.getTween()?.progress(1); timeline.progress(old.progress); render(old.progress);
  }
  syncVideo();
}

function enterProject(event) {
  if (!state.motion || !trigger) return;
  event.preventDefault();
  scrollTo({ top: trigger.end, behavior: 'instant' });
  ScrollTrigger.update(); trigger.getTween()?.progress(1); timeline.progress(1); render(1);
  project.inert = false;
  history.replaceState(null, '', '#proyecto');
  $('#project-title').focus({ preventScroll: true });
}
for (const link of document.querySelectorAll('[data-enter-project]')) link.addEventListener('click', enterProject);
for (const link of document.querySelectorAll('[data-replay]')) link.addEventListener('click', event => {
  if (!state.motion || !trigger) return;
  event.preventDefault();
  scrollTo({ top: trigger.start, behavior: 'instant' });
  ScrollTrigger.update(); trigger.getTween()?.progress(1); timeline.progress(0); render(0);
  history.replaceState(null, '', '#portal');
});

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
configure({ preserve: false });
reduced.addEventListener('change', () => configure());
let dimensions = `${innerWidth}x${frame.clientHeight}`;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const next = `${innerWidth}x${frame.clientHeight}`;
    if (next === dimensions || destroyed) return;
    dimensions = next; configure();
  }, 140);
}, { passive: true });
window.addEventListener('scroll', updateSurface, { passive: true });
window.addEventListener('hashchange', () => {
  if (location.hash === '#proyecto') enterProject({ preventDefault() {} });
});
window.addEventListener('pagehide', () => { destroyed = true; video.pause(); observer.disconnect(); clearTimeout(resizeTimer); context?.revert(); }, { once: true });

if (location.hash === '#proyecto') requestAnimationFrame(() => enterProject({ preventDefault() {} }));
window.portalLab = { inspect: () => ({ motion: state.motion, progress: state.progress, start: trigger?.start ?? null, end: trigger?.end ?? null, geometry: state.geometry, viewBox: svg.getAttribute('viewBox'), phase: portal.dataset.phase, inert: project.inert, viewport: { width: innerWidth, height: innerHeight, contentWidth: document.documentElement.scrollWidth }, video: { ready: video.readyState, paused: video.paused, width: video.videoWidth, height: video.videoHeight }, triggers: ScrollTrigger.getAll().length }) };
document.documentElement.dataset.labReady = 'true';
