import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

  // All content is visible in the base HTML. Enhancement never gates access to it.
  media.add('(prefers-reduced-motion: no-preference)', context => {
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro.from('[data-hero-line]', { clipPath: 'inset(0 0 100% 0)', y: 18, duration: .9, stagger: .1 });
    intro.from('.hero-description, .hero-discover', { opacity: 0, y: 12, duration: .55, stagger: .08 }, '-=.45');
    const heroPaths = document.querySelectorAll('.hero-mark path');
    if (heroPaths.length === 2) {
      intro.from(heroPaths[0], { x: -14, y: -5, duration: 1.1 }, 0);
      intro.from(heroPaths[1], { x: 14, y: 5, duration: 1.1 }, .08);
    }
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
    const identity = document.querySelector<HTMLElement>('[data-identity]');
    const paths = identity?.querySelectorAll('.identity-mark path');
    if (identity && paths?.length === 2) {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: identity, start: 'top 85%', end: 'center 43%', scrub: .7 } });
      timeline.fromTo(paths[0], { x: -37, y: -12 }, { x: 0, y: 0, ease: 'none' }, 0);
      timeline.fromTo(paths[1], { x: 37, y: 12 }, { x: 0, y: 0, ease: 'none' }, 0);
    }
    gsap.fromTo('.project-stage__grid', { y: -14, scale: 1.12 }, { y: 14, scale: 1.03, ease: 'none', scrollTrigger: { trigger: '[data-project-stage]', start: 'top bottom', end: 'bottom top', scrub: .8 } });
  });

  const refresh = () => { if (!abort.signal.aborted) ScrollTrigger.refresh(); };
  document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh, { ...options, once: true });

  return () => { abort.abort(); media.revert(); closeMenu(); };
}

let dispose: (() => void) | undefined;
const boot = () => { dispose?.(); dispose = initSite(); };
boot();
document.addEventListener('astro:before-swap', () => { dispose?.(); dispose = undefined; });
document.addEventListener('astro:page-load', () => { if (!dispose) boot(); });
