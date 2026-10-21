import gsap from 'gsap';

type IntroHooks = { onReveal: () => void; onFinish: () => void };

export function initSignatureIntro({ onReveal, onFinish }: IntroHooks) {
  const root = document.querySelector<HTMLElement>('#signature-intro');
  if (!root || root.hidden) { onFinish(); return () => {}; }
  const listeners = new AbortController();
  let context: gsap.Context | undefined;
  let finished = false;
  const release = (reason: string) => root.dispatchEvent(new CustomEvent('suplio:intro-release', { detail: { reason } }));
  const finish = () => {
    if (finished) return;
    finished = true;
    listeners.abort();
    context?.revert();
    onFinish();
  };
  root.addEventListener('suplio:intro-end', finish, { signal: listeners.signal });

  try {
    const visual = root.querySelector<HTMLElement>('.signature-intro__visual');
    const center = root.querySelector<HTMLElement>('.signature-intro__center');
    const group = root.querySelector<SVGGElement>('svg > g');
    const paths = group?.querySelectorAll<SVGPathElement>('path');
    if (!visual || !center || !group || paths?.length !== 2) throw new Error('Missing signature SVG');
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const size = center.getBoundingClientRect().width;
    const travel = (width / 2 + size + 32) / (size / 96);
    const aperture = { progress: 0 };

    context = gsap.context(() => {
      gsap.set(group, { rotation: 0, scale: 1, svgOrigin: '48 48' });
      const timeline = gsap.timeline({ paused: true, onComplete: () => release('complete') });
      timeline.fromTo(paths[0], { x: -travel }, { x: 0, duration: .62, ease: 'power3.inOut' }, 0);
      timeline.fromTo(paths[1], { x: travel }, { x: 0, duration: .62, ease: 'power3.inOut' }, 0);
      timeline.call(() => { root.dataset.introPhase = 'assembled'; }, [], .62);
      timeline.call(() => { root.dataset.introPhase = 'turn'; }, [], .78);
      timeline.to(group, { rotation: 360, svgOrigin: '48 48', duration: .98, ease: 'power2.inOut' }, .78);
      // 360 and 0 are visually identical: normalize before scaling, without a second turn.
      timeline.set(group, { rotation: 0 }, 1.76);
      timeline.call(() => { root.dataset.introPhase = 'oriented'; }, [], 1.76);
      timeline.call(() => { root.dataset.introPhase = 'reveal'; onReveal(); }, [], 1.86);
      timeline.to(group, { scale: 3.6, svgOrigin: '48 48', duration: .74, ease: 'power3.inOut' }, 1.86);
      timeline.to(aperture, { progress: 1, duration: .74, ease: 'power3.inOut', onUpdate: () => {
        const p = aperture.progress;
        // Wide and shallow first: the opening starts inside the official 26/96 gap.
        const openingWidth = (width + 4) * Math.min(1, p * 8);
        const openingHeight = (height + 4) * Math.pow(p, 1.45);
        const left = (width - openingWidth) / 2;
        const right = (width + openingWidth) / 2;
        const top = (height - openingHeight) / 2;
        const bottom = (height + openingHeight) / 2;
        visual.style.clipPath = `polygon(evenodd, 0px 0px, ${width}px 0px, ${width}px ${height}px, 0px ${height}px, 0px 0px, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
      } }, 1.86);
      root.dataset.introState = 'playing';
      root.dataset.introPhase = 'entry';
      timeline.play(0);
    }, root);
  } catch {
    release('error');
  }

  return () => { if (!finished) release('dispose'); finish(); };
}
