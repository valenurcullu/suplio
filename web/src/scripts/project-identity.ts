import gsap from 'gsap';
import type { IdentityScene } from './identity-scene';

export function initProjectIdentity(media: ReturnType<typeof gsap.matchMedia>) {
  const root = document.querySelector<HTMLElement>('[data-project-identity]');
  const mark = root?.querySelector<HTMLElement>('.projects-brand__mark');
  const paths = mark?.querySelectorAll<SVGPathElement>('path');
  if (!root || !mark || paths?.length !== 2) return () => {};
  let stop = () => {};
  media.add('(prefers-reduced-motion: no-preference)', () => {
    let disposed = false, pending = false, scene: IdentityScene | undefined;
    const listeners = new AbortController();
    async function load() {
      if (disposed || pending) return;
      pending = true;
      root!.dataset.identity3d = 'loading';
      try {
        const { createIdentityScene } = await import('./identity-scene');
        if (disposed) return;
        scene = createIdentityScene(root!, root!, mark!, paths!);
        scene.setAssembled(true);
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
      disposed = true; observer.disconnect(); listeners.abort(); scene?.dispose();
      mark!.style.removeProperty('opacity');
    }
    stop = cleanup;
    return cleanup;
  });
  return () => stop();
}
