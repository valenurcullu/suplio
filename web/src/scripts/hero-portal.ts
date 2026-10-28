import type gsapType from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';
import glyph from '../data/hero-portal-glyph.json';

type Gsap = typeof gsapType;
type ScrollTriggerStatic = typeof ScrollTriggerType;

const NS = 'http://www.w3.org/2000/svg';
const waitFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const smooth = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}, parent?: Element) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
}

// Remove the old 6% dead zone. A monotone Hermite lead-in has nonzero zoom
// velocity at scroll zero, and meets the existing curve/value/speed at 35%.
function zoomProgress(progress: number) {
  const join = .35;
  if (progress >= join) return smooth((progress - .06) / .86);
  const t = progress / join, u = (join - .06) / .86, value = smooth(u);
  const slope = 30 * u * u * (1 - u) * (1 - u) / .86;
  return (t * t * t - 2 * t * t + t) * join * .6 + (-2 * t * t * t + 3 * t * t) * value + (t * t * t - t * t) * join * slope;
}

interface Snapshot { w: number; h: number; x: number; y: number; maxScale: number; }

/**
 * Hero → Servicios: the camera flies into the "o" of "desafíos" and reveals Services through its counter.
 * The h1 stays a single DOM node; during the move a decorative SVG projection of the hero is shown instead.
 */
export function initHeroPortal(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic) {
  const hero = document.querySelector<HTMLElement>('.hero');
  const services = document.querySelector<HTMLElement>('#servicios');
  const header = document.querySelector<HTMLElement>('[data-header]');
  const intro = document.querySelector<HTMLElement>('#signature-intro');
  if (!hero || !services || !header) return () => {};

  const abort = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let layer: HTMLDivElement | undefined;
  let teardown = () => {};

  void (async () => {
    for (let i = 0; i < 600 && !abort.signal.aborted && ((intro && !intro.hidden) || hero.dataset.heroPhase !== 'complete'); i++) await waitFrame();
    if (abort.signal.aborted) return;
    await document.fonts.ready;
    if (abort.signal.aborted) return;
    teardown = start();
  })();

  function start() {
    const h1 = hero!.querySelector('h1');
    if (!h1) return () => {};
    const options = { signal: abort.signal };

    layer = document.createElement('div');
    layer.className = 'hero-portal-camera';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    const svg = el('svg', { focusable: 'false' }, layer);
    const defs = el('defs', {}, svg);
    const mask = el('mask', { id: 'hero-o-counter', maskUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: 12000, height: 12000, style: 'mask-type:luminance' }, defs);
    el('rect', { x: -4000, y: -4000, width: 12000, height: 12000, fill: 'white' }, mask);
    const hole = el('path', { d: glyph.counter, fill: 'black' }, mask);
    const scene = el('g', { mask: 'url(#hero-o-counter)' }, svg);
    const paper = el('rect', { x: -4000, y: -4000, width: 12000, height: 12000, fill: '#f5f4f0' }, scene);
    let art = el('g', {}, scene);
    document.body.append(layer);

    const spacer = document.createElement('div');
    spacer.className = 'hero-portal-distance';
    spacer.setAttribute('aria-hidden', 'true');
    const originalServicesStyle = services!.getAttribute('style');
    const ctx = document.createElement('canvas').getContext('2d')!;
    const state = { enabled: false, progress: 0, start: 0, end: 0, distance: 0 };
    let trigger: ScrollTriggerType | null = null;
    let snapshot: Snapshot | null = null;
    let interacted = false, resizeTimer: number | undefined, painting = false, previousScrollY = scrollY;

    const top = (node: Element) => node.getBoundingClientRect().top + scrollY;
    const distance = () => Math.round(Math.min(1000, innerHeight * (innerWidth < 700 ? .68 : .95)));

    function localGlyph() {
      const walker = document.createTreeWalker(h1!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        const at = n.data.indexOf('desafíos');
        if (at < 0) continue;
        const offset = at + 'desafí'.length, range = document.createRange();
        range.setStart(n, offset);
        range.setEnd(n, offset + 1);
        return { node: n, range, style: getComputedStyle(n.parentElement!) };
      }
      return null;
    }
    function baseline(rect: DOMRect, style: CSSStyleDeclaration) {
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const m = ctx.measureText('Hg');
      const a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
      return rect.top + (rect.height - a - d) / 2 + a;
    }
    function stripIds(node: Node) {
      if (!(node instanceof Element)) return;
      node.removeAttribute('id');
      node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    }

    function capture() {
      const source = localGlyph();
      if (!source) return false;
      art.remove();
      art = el('g', {}, scene);
      // Normalize live DOM measurements to the activation frame. This is not a
      // camera translation; it keeps the origin identical across wheel sizes/reversal.
      const delta = scrollY - state.start;
      // The camera is prepared at scroll zero; its paper ends at the real hero edge
      // so Services below stays identical at rest.
      paper.setAttribute('height', String(4000 + hero!.getBoundingClientRect().bottom + delta));
      for (const node of hero!.querySelectorAll<HTMLElement>('.contact-link,.contact-link__icon,.round-arrow,.status-dot')) {
        const r = node.getBoundingClientRect(), s = getComputedStyle(node);
        el('rect', {
          x: r.left, y: r.top + delta, width: r.width, height: r.height,
          rx: node.matches('.round-arrow,.status-dot') ? r.width / 2 : 0,
          fill: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'none' : s.backgroundColor,
          stroke: parseFloat(s.borderTopWidth) ? s.borderTopColor : 'none',
          'stroke-width': parseFloat(s.borderTopWidth) || 0,
        }, art);
      }
      // Decorative SVGs only; screen matrices retain authored rotations.
      for (const original of hero!.querySelectorAll<SVGSVGElement>('svg')) {
        const m = original.getScreenCTM();
        if (!m) continue;
        const style = getComputedStyle(original);
        const group = el('g', { transform: `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f + delta})`, color: style.color, fill: style.fill, stroke: style.stroke, 'stroke-width': style.strokeWidth }, art);
        for (const child of original.children) {
          const copy = child.cloneNode(true);
          stripIds(copy);
          group.append(copy);
        }
      }
      const walker = document.createTreeWalker(hero!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const parent = node.parentElement!;
        if (parent.closest('svg,script,style,noscript')) continue;
        const style = getComputedStyle(parent);
        if (style.display === 'none') continue;
        let run: { y: number; chars: string; xs: number[]; text: SVGTextElement } | null = null, offset = 0;
        for (const char of node.data) {
          const range = document.createRange(), at = offset;
          range.setStart(node, offset);
          range.setEnd(node, offset + char.length);
          offset += char.length;
          // The portal glyph is a true outline: it stays smooth at extreme magnification.
          if (node === source.node && at === source.range.startOffset) { run = null; continue; }
          const r = range.getBoundingClientRect();
          if (r.width < .01 || !r.height) continue;
          const y = baseline(r, style) + delta;
          if (!run || Math.abs(run.y - y) > .6) {
            run = { y, chars: '', xs: [], text: el('text', { 'font-family': style.fontFamily, 'font-size': style.fontSize, 'font-weight': style.fontWeight, 'font-style': style.fontStyle, 'letter-spacing': 0, fill: style.color, 'xml:space': 'preserve' }, art) };
          }
          run.chars += style.textTransform === 'uppercase' ? char.toLocaleUpperCase('es-AR') : char;
          run.xs.push(r.left);
          run.text.textContent = run.chars;
          run.text.setAttribute('x', run.xs.join(' '));
          run.text.setAttribute('y', String(run.y));
        }
      }
      // Pointer access to the hero actions is kept in the projection; native href handling navigates.
      for (const a of hero!.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const r = a.getBoundingClientRect(), link = el('a', { href: a.getAttribute('href') ?? '', tabindex: -1 }, art);
        el('rect', { x: r.left, y: r.top + delta, width: r.width, height: r.height, fill: 'transparent', 'pointer-events': 'all' }, link);
      }
      const r = source.range.getBoundingClientRect(), size = parseFloat(source.style.fontSize), k = size / 1000, y = baseline(r, source.style) + delta;
      const transform = `translate(${r.left} ${y}) scale(${k} ${-k})`;
      hole.setAttribute('transform', transform);
      el('path', { d: glyph.outline, transform, fill: source.style.color, 'fill-rule': 'evenodd' }, art);
      const endWidth = Math.min(305 * k * .40, 337 * k * .40 * innerWidth / innerHeight);
      snapshot = { w: innerWidth, h: innerHeight, x: r.left + 307.5 * k, y: y - 246.5 * k, maxScale: innerWidth / endWidth };
      return true;
    }

    function paint(progress: number) {
      if (painting || !state.enabled) return;
      painting = true;
      state.progress = progress;
      const active = progress >= 0 && progress < 1 && scrollY >= state.start && scrollY <= state.end;
      gsap.set(services, { y: -state.distance * (1 - progress), force3D: true });
      services!.inert = active && progress > 0 && progress < .75;
      if (active && (snapshot || capture()) && snapshot) {
        layer!.hidden = false;
        hero!.setAttribute('data-portal-camera-active', '');
        const p = zoomProgress(progress), scale = Math.exp(Math.log(snapshot.maxScale) * p);
        // Zoom about the measured o first, then rejoin the camera path once the zoom is established.
        const anchoredAim = 1 - 1 / scale, reframe = smooth((p - .12) / .20);
        const aim = anchoredAim + ((1 - Math.pow(1 - p, 8)) - anchoredAim) * reframe;
        const x = snapshot.w / 2 + (snapshot.x - snapshot.w / 2) * aim, y = snapshot.h / 2 + (snapshot.y - snapshot.h / 2) * aim;
        const w = snapshot.w / scale, h = snapshot.h / scale;
        svg.setAttribute('viewBox', `${x - w / 2} ${y - h / 2} ${w} ${h}`);
      } else {
        layer!.hidden = true;
        hero!.removeAttribute('data-portal-camera-active');
      }
      painting = false;
    }

    function restoreServices() {
      services!.inert = false;
      if (originalServicesStyle === null) services!.removeAttribute('style'); else services!.setAttribute('style', originalServicesStyle);
      // GSAP caches the inline transform; getCache is internal API missing from its typings.
      (gsap.core as unknown as { getCache(target: Element): { uncache?: number } }).getCache(services!).uncache = 1;
    }
    function disarm() {
      state.enabled = false;
      trigger?.kill();
      trigger = null;
      layer!.hidden = true;
      hero!.removeAttribute('data-portal-camera-active');
      spacer.remove();
      restoreServices();
      snapshot = null;
      ScrollTrigger.refresh();
    }
    function arm() {
      if (state.enabled || reduced.matches || innerHeight < 480 || !localGlyph()) return;
      state.enabled = true;
      state.distance = distance();
      hero!.after(spacer);
      spacer.style.height = `${state.distance}px`;
      gsap.set(services, { y: -state.distance, force3D: true });
      state.start = 0;
      const end = () => top(services!) - Number(gsap.getProperty(services!, 'y')) - header!.offsetHeight;
      trigger = ScrollTrigger.create({
        id: 'hero-typography-portal', trigger: hero, start: () => state.start, end,
        onUpdate: self => paint(self.progress),
        onRefresh: self => { state.end = self.end; snapshot = null; paint(self.progress); },
      });
      ScrollTrigger.refresh();
      state.end = trigger.end;
      paint(trigger.progress);
    }

    // Anchor links disable the portal before the browser resolves them; events are never cancelled.
    document.addEventListener('click', event => {
      const a = (event.target as Element | null)?.closest?.('a[href]');
      if (!a) return;
      const url = new URL(a.getAttribute('href') ?? '', location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash && state.enabled) disarm();
    }, { ...options, capture: true });
    document.addEventListener('focusin', event => {
      const target = event.target as Node;
      if (state.enabled && state.progress < 1 && (hero!.contains(target) || services!.contains(target))) disarm();
    }, { ...options, capture: true });
    hero!.addEventListener('selectstart', () => { if (state.enabled && state.progress === 0) disarm(); }, options);
    for (const type of ['wheel', 'touchstart', 'keydown']) window.addEventListener(type, () => { interacted = true; }, { ...options, passive: true });
    window.addEventListener('scroll', () => {
      if (!state.enabled && !reduced.matches && scrollY < 4 && previousScrollY > 4 && (location.hash === '#inicio' || !location.hash || interacted)) arm();
      previousScrollY = scrollY;
    }, { ...options, passive: true });
    reduced.addEventListener('change', () => { if (reduced.matches) disarm(); else if (scrollY < 4) arm(); }, options);
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!state.enabled) return;
        if (innerHeight < 480) { disarm(); return; }
        state.distance = distance();
        spacer.style.height = `${state.distance}px`;
        state.start = 0;
        snapshot = null;
        ScrollTrigger.refresh();
      }, 160);
    }, { ...options, passive: true });

    if (!location.hash || location.hash === '#inicio') arm();

    return () => {
      clearTimeout(resizeTimer);
      if (state.enabled) disarm();
      layer?.remove();
    };
  }

  return () => { abort.abort(); teardown(); layer?.remove(); };
}
