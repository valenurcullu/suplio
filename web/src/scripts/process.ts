import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initProcessSteps(media: ReturnType<typeof gsap.matchMedia>) {
  const section = document.querySelector<HTMLElement>('#como-trabajamos');
  const stage = section?.querySelector<HTMLElement>('[data-process-stage]');
  const grid = section?.querySelector<HTMLElement>('.process-grid');
  const steps = [...(section?.querySelectorAll<HTMLElement>('[data-process-step]') ?? [])];
  if (!section || !stage || !grid || steps.length !== 4) return;

  // The baseline HTML has no hidden steps or pin. Reverting this context restores it.
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    let scene: gsap.Context | undefined;
    let trigger: ScrollTrigger | undefined;
    let mode: 'pinned' | 'flow';
    let resizeFrame = 0;
    let failed = false;
    const headerHeight = () => document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 0;
    const availableHeight = () => innerHeight - headerHeight() - 32;
    const chooseMode = () => innerWidth >= 600 && stage.offsetHeight <= availableHeight() ? 'pinned' : 'flow';
    const restore = () => {
      scene?.revert();
      scene = undefined;
      trigger = undefined;
      delete section.dataset.processMode;
    };

    const build = () => {
      const previous = trigger;
      const wasActive = previous?.isActive;
      const progress = previous?.progress ?? 0;
      const after = document.getElementById('proyectos');
      const below = previous && scrollY > previous.end;
      const afterTop = after?.getBoundingClientRect().top ?? 0;
      restore();
      mode = chooseMode();
      section.dataset.processMode = mode;
      scene = gsap.context(() => {
        const distance = (step: HTMLElement) => {
          if (mode === 'flow') return Math.min(innerHeight * .18, step.offsetHeight * .75);
          // Remove the step's own translation when measuring during a refresh.
          const y = Number(gsap.getProperty(step, 'y')) || 0;
          return grid.getBoundingClientRect().bottom - (step.getBoundingClientRect().top - y) + 32;
        };
        const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
        steps.forEach((step, index) => {
          timeline.fromTo(step, { y: () => distance(step), opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, immediateRender: true,
          }, index);
        });
        // A short final scroll segment holds the complete composition before release.
        if (mode === 'pinned') timeline.to({}, { duration: .2 });
        trigger = ScrollTrigger.create({
          id: 'process-sequence',
          animation: timeline,
          trigger: mode === 'pinned' ? section : grid,
          pin: mode === 'pinned' ? section : false,
          pinSpacing: true,
          scrub: true,
          invalidateOnRefresh: true,
          start: () => mode === 'pinned'
            ? `top ${headerHeight() + 16 - parseFloat(getComputedStyle(section).paddingTop)}px`
            : 'top 92%',
          end: () => mode === 'pinned'
            ? `+=${Math.round(gsap.utils.clamp(1200, 2400, availableHeight() * 2.4))}`
            : 'bottom 82%',
        });
      });
      ScrollTrigger.refresh();
      // Keep the user's place when a responsive layout switches pin strategy.
      if (below && after) window.scrollBy({ top: after.getBoundingClientRect().top - afterTop, behavior: 'instant' });
      else if (wasActive && trigger) window.scrollTo({ top: trigger.start + progress * (trigger.end - trigger.start), behavior: 'instant' });
      ScrollTrigger.update();
    };

    const refreshSize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (failed) return;
        if (chooseMode() !== mode) build();
        else ScrollTrigger.refresh();
      });
    };
    const showAll = () => {
      failed = true;
      restore();
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', refreshSize, { ...options, passive: true });
    window.addEventListener('error', showAll, options);
    window.addEventListener('unhandledrejection', showAll, options);
    build();

    // Pin spacing may be created after the browser has already resolved its hash.
    const initialHash = location.hash;
    const target = document.getElementById(initialHash.slice(1));
    let interacted = false;
    const interactedWithPage = () => { interacted = true; };
    window.addEventListener('wheel', interactedWithPage, { ...options, passive: true });
    window.addEventListener('touchmove', interactedWithPage, { ...options, passive: true });
    window.addEventListener('keydown', interactedWithPage, options);
    document.fonts.ready.then(() => {
      if (listeners.signal.aborted || failed) return;
      refreshSize();
      requestAnimationFrame(() => {
        if (!listeners.signal.aborted && !interacted && location.hash === initialHash && target && !section.contains(target)
          && (section.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          target.scrollIntoView({ block: 'start', behavior: 'instant' });
          ScrollTrigger.update();
        }
      });
    });
    return () => { listeners.abort(); cancelAnimationFrame(resizeFrame); restore(); };
  });
}
