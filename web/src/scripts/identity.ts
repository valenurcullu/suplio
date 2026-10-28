import gsap from 'gsap';

// Keep the approved two-piece assembly independent of the project showcase.
export function initIdentity(media: ReturnType<typeof gsap.matchMedia>) {
  const root = document.querySelector<HTMLElement>('[data-identity]');
  const paths = root?.querySelectorAll<SVGPathElement>('.identity-mark path');
  if (!root || paths?.length !== 2) return () => {};
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const timeline = gsap.timeline({
      scrollTrigger: { id: 'identity-assembly', trigger: root, start: 'top 85%', end: 'center 43%', scrub: .7 },
      onUpdate: () => { root.dataset.identityAssembly = timeline.progress().toFixed(4); },
    });
    timeline.fromTo(paths[0], { x: -37, y: -12 }, { x: 0, y: 0, ease: 'none' }, 0);
    timeline.fromTo(paths[1], { x: 37, y: 12 }, { x: 0, y: 0, ease: 'none' }, 0);
    return () => { timeline.scrollTrigger?.kill(); timeline.kill(); };
  });
  return () => {};
}
