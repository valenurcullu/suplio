import gsap from 'gsap';
import type { IdentityScene } from './identity-scene';

// This controller exclusively owns Identity's original assembly trigger.
// Three.js is behind the intersection-gated dynamic import, never the hero bundle.
export function initIdentity(media: ReturnType<typeof gsap.matchMedia>) {
  const root = document.querySelector<HTMLElement>('[data-identity]');
  const art = root?.querySelector<HTMLElement>('.identity-art');
  const mark = root?.querySelector<HTMLElement>('.identity-mark');
  const paths = mark?.querySelectorAll<SVGPathElement>('path');
  if (!root || !art || !mark || paths?.length !== 2) return () => {};
  let stop = () => {};
  media.add('(prefers-reduced-motion: no-preference)', () => {
    let disposed = false, pending = false, scene: IdentityScene | undefined;
    const listeners = new AbortController();
    const timeline = gsap.timeline({
      scrollTrigger: { id: 'identity-assembly', trigger: root, start: 'top 85%', end: 'center 43%', scrub: .7 },
      onUpdate: () => {
        root.dataset.identityAssembly = timeline.progress().toFixed(4);
        scene?.setAssembled(timeline.progress() >= .9999);
      },
    });
    // Same paths, travel, timing, trigger range and scrub as the approved assembly.
    timeline.fromTo(paths[0], { x: -37, y: -12 }, { x: 0, y: 0, ease: 'none' }, 0);
    timeline.fromTo(paths[1], { x: 37, y: 12 }, { x: 0, y: 0, ease: 'none' }, 0);
    async function load() {
      if (disposed || pending || scene) return;
      pending = true; root!.dataset.identity3d = 'loading';
      try {
        const { createIdentityScene } = await import('./identity-scene');
        if (disposed) return;
        scene = createIdentityScene(root!, art!, mark!, paths!);
        scene.setAssembled(timeline.progress() >= .9999);
      } catch {
        root!.dataset.identity3d = 'fallback';
        mark!.style.removeProperty('opacity');
      }
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '300px 0px' });
    observer.observe(root);
    window.addEventListener('pagehide', e => { if (e.persisted) scene?.setPageVisible(false); else cleanup(); }, { signal: listeners.signal });
    window.addEventListener('pageshow', () => scene?.setPageVisible(true), { signal: listeners.signal });
    function cleanup() {
      if (disposed) return;
      disposed = true; observer.disconnect(); listeners.abort();
      scene?.dispose(); timeline.scrollTrigger?.kill(); timeline.kill();
      mark!.style.removeProperty('opacity');
      root!.removeAttribute('data-identity-volume');
    }
    stop = cleanup;
    return cleanup;
  });
  return () => stop();
}
