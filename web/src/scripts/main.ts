import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initServicePreviews } from './services';
import { initSignatureIntro } from './intro';
import { initProcessSteps } from './process';
import { initIdentity } from './identity';
import { initProjectIdentity } from './project-identity';

gsap.registerPlugin(ScrollTrigger);

// The signature owns the entrance. The hero receives only typography; its SVG stays assembled.
function initHeroMotion(media: ReturnType<typeof gsap.matchMedia>) {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return { reveal: () => {}, finish: () => {} };
  const waiting = Boolean(document.querySelector('#signature-intro:not([hidden])'));
  hero.dataset.heroIntroduced = 'true';
  hero.dataset.heroPhase = waiting ? 'pending' : 'complete';
  let introComplete = !waiting;
  let typography: gsap.core.Timeline | undefined;
  let enableParallax: (() => void) | undefined;

  media.add('(prefers-reduced-motion: no-preference)', () => {
    if (!waiting || introComplete) return;
    const targets = [...hero.querySelectorAll<HTMLElement>('[data-hero-line], .hero-description p, .hero-discover, .contact-link')];
    const originals = targets.map(node => ({ node, style: node.getAttribute('style') }));
    typography = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: () => { hero.dataset.heroPhase = 'complete'; } });
    typography.fromTo(hero.querySelectorAll('[data-hero-line]'),
      { clipPath: 'inset(0 -0.08em 100% -0.08em)', y: 12 },
      { clipPath: 'inset(-0.12em -0.08em -0.12em -0.08em)', y: 0,
        duration: .5, stagger: .045, clearProps: 'clipPath,transform' }, 0);
    typography.fromTo(hero.querySelector('.hero-description p'), { opacity: .9, y: 6 },
      { opacity: 1, y: 0, duration: .32, clearProps: 'opacity,transform' }, .11);
    typography.fromTo(hero.querySelector('.hero-discover'), { opacity: .85, y: 4 },
      { opacity: 1, y: 0, duration: .3, clearProps: 'opacity,transform' }, .2);
    typography.fromTo(hero.querySelector('.contact-link'), { opacity: .85, y: 4 },
      { opacity: 1, y: 0, duration: .34, clearProps: 'opacity,transform' }, .26);
    return () => {
      typography = undefined;
      gsap.set(targets, { clearProps: 'clipPath,opacity,transform' });
      for (const { node, style } of originals) {
        if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style);
      }
    };
  });

  media.add({ desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    if (!context.conditions?.desktop || !context.conditions?.motion) return;
    const parallax = gsap.fromTo(hero.querySelector('.hero-mark'), { y: 0 }, {
      y: -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .45 },
    });
    const trigger = parallax.scrollTrigger;
    const enable = () => { trigger?.enable(false, true); };
    enableParallax = enable;
    if (!introComplete) trigger?.disable(false);
    return () => { if (enableParallax === enable) enableParallax = undefined; };
  });

  return {
    reveal: () => {
      if (introComplete) return;
      hero.dataset.heroPhase = 'reveal';
      typography?.play(0);
    },
    finish: () => {
      introComplete = true;
      typography?.progress(1).pause();
      hero.dataset.heroPhase = 'complete';
      enableParallax?.();
    },
  };
}

function initSite() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const dialog = document.querySelector<HTMLDialogElement>('#mobile-menu');
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const media = gsap.matchMedia();

  const syncMenu = () => {
    const open = Boolean(dialog?.open);
    toggle?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  };
  const closeMenu = () => { dialog?.close(); syncMenu(); };
  toggle?.addEventListener('click', () => { dialog?.showModal(); syncMenu(); }, options);
  dialog?.querySelector('.menu-close')?.addEventListener('click', closeMenu, options);
  dialog?.addEventListener('close', syncMenu, options);
  dialog?.addEventListener('cancel', () => requestAnimationFrame(syncMenu), options);
  dialog?.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
      if (link.hash) {
        const target = document.getElementById(link.hash.slice(1));
        if (target) {
          target.setAttribute('tabindex', '-1');
          requestAnimationFrame(() => target.focus({ preventScroll: true }));
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
      }
    }, options);
  });
  const resizeMenu = () => { if (window.innerWidth >= 900 && dialog?.open) closeMenu(); };
  window.addEventListener('resize', resizeMenu, { ...options, passive: true });

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { ...options, passive: true });

  const heroMotion = initHeroMotion(media);
  const disposeIntro = initSignatureIntro({ onReveal: heroMotion.reveal, onFinish: heroMotion.finish });
  initServicePreviews(media);
  initProcessSteps(media);
  const disposeIdentity = initIdentity(media);
  const disposeProjectIdentity = initProjectIdentity(media);

  // All content is visible in the base HTML. Enhancement never gates access to it.
  media.add('(prefers-reduced-motion: no-preference)', context => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
      // Animate only after the element enters the viewport; unreached content stays readable.
      ScrollTrigger.create({ trigger: element, start: 'top 91%', once: true, onEnter: () => {
        context.add(() => {
          gsap.fromTo(element, { y: 22 }, { y: 0, duration: .7, ease: 'power3.out', clearProps: 'transform' });
        });
      } });
    });
  });

  media.add({ desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    if (!context.conditions?.desktop || !context.conditions?.motion) return;
    if (document.querySelector('[data-project-stage]')) gsap.fromTo('.project-stage__grid', { y: -14, scale: 1.12 }, { y: 14, scale: 1.03, ease: 'none', scrollTrigger: { trigger: '[data-project-stage]', start: 'top bottom', end: 'bottom top', scrub: .8 } });
  });

  const refresh = () => { if (!abort.signal.aborted) ScrollTrigger.refresh(); };
  document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh, { ...options, once: true });

  return () => { disposeIntro(); disposeIdentity(); disposeProjectIdentity(); abort.abort(); media.revert(); closeMenu(); };
}

let dispose: (() => void) | undefined;
const boot = () => { dispose?.(); dispose = initSite(); };
boot();
document.addEventListener('astro:before-swap', () => { dispose?.(); dispose = undefined; });
document.addEventListener('astro:page-load', () => { if (!dispose) boot(); });
