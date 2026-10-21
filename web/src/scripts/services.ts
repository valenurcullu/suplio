import gsap from 'gsap';

function createDemo(svg: SVGSVGElement, kind: string) {
  const part = (name: string) => svg.querySelectorAll<SVGElement>(`[data-part="${name}"]`);
  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const draw = (name: string, at: number, duration = .35) => {
    timeline.fromTo(part(name), { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration, ease: 'power2.inOut' }, at);
  };
  const packet = (name: string, at: number, duration: number) => {
    timeline.set(part(name), { strokeDasharray: '.14 1', strokeDashoffset: .14, opacity: 0 }, 0);
    timeline.set(part(name), { opacity: 1 }, at);
    timeline.to(part(name), { strokeDashoffset: -1, duration, ease: 'none' }, at);
    timeline.set(part(name), { opacity: 0 }, at + duration);
  };
  const grow = (name: string, at: number, duration = .32, stagger = 0) => {
    timeline.fromTo(part(name), { scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration, stagger }, at);
  };

  if (kind === 'web') {
    draw('web-frame', 0, .43);
    draw('web-rule', .18, .25);
    grow('web-nav', .24);
    grow('web-line', .44, .34, .1);
    timeline.fromTo(part('web-image'), { scaleY: 0, transformOrigin: '50% 100%' },
      { scaleY: 1, duration: .48 }, .6);
    grow('web-action', .91, .3);
  } else if (kind === 'app') {
    draw('app-frame', 0, .38);
    draw('app-divider', .16, .3);
    grow('app-navigation', .22);
    const offsets = [{ x: -13, y: -16 }, { x: 0, y: 18 }, { x: 15, y: -12 }];
    part('app-module').forEach((module, index) => {
      timeline.fromTo(module, { ...offsets[index], scale: .78, transformOrigin: '50% 50%' },
        { x: 0, y: 0, scale: 1, duration: .55 }, .32 + index * .17);
    });
    timeline.fromTo(part('app-extension'), { y: -10, scale: .65, transformOrigin: '50% 50%' },
      { y: 0, scale: 1, duration: .4 }, 1.05);
  } else if (kind === 'flow') {
    timeline.fromTo(part('flow-pulse'), { opacity: .85, scale: .82, transformOrigin: '50% 50%' },
      { opacity: 0, scale: 1.12, duration: .42 }, 0);
    packet('flow-packet-a', .15, .52);
    timeline.to(part('flow-middle'), { stroke: '#ff5a1f', duration: .18 }, .65);
    draw('flow-process', .7, .22);
    packet('flow-packet-b', .84, .52);
    timeline.to(part('flow-middle'), { stroke: '#16140f', duration: .2 }, 1.22);
    timeline.fromTo(part('flow-end'), { fill: '#f5f4f0', stroke: '#16140f' },
      { fill: '#ff5a1f', stroke: '#ff5a1f', duration: .24 }, 1.33);
    draw('flow-check', 1.44, .23);
  } else if (kind === 'agent') {
    packet('agent-incoming', 0, .3);
    timeline.to(part('agent-core'), { stroke: '#ff5a1f', duration: .18 }, .22);
    part('agent-interpret').forEach((line, index) => {
      timeline.fromTo(line, { x: index % 2 ? 6 : -5, scaleX: .35, fill: '#ff5a1f', transformOrigin: '0% 50%' },
        { x: 0, scaleX: 1, fill: '#16140f', duration: .36 }, .28 + index * .07);
    });
    packet('agent-call', .79, .36);
    timeline.to(part('agent-tool'), { stroke: '#ff5a1f', duration: .15 }, 1.06);
    grow('agent-tool-data', 1.08, .22);
    packet('agent-return', 1.25, .38);
    timeline.to(part('agent-tool'), { stroke: '#16140f', duration: .2 }, 1.6);
    timeline.to(part('agent-core'), { stroke: '#16140f', duration: .2 }, 1.66);
    packet('agent-outgoing', 1.6, .22);
    draw('agent-result', 1.74, .28);
    grow('agent-result-line', 1.88, .22, .07);
    grow('agent-result-accent', 2.01, .22);
  }
  // Base SVG is the final composition. Reuse four bounded timelines, never accumulate replays.
  timeline.set(svg.querySelectorAll('[data-part]'), { clearProps: 'all' }, '+=.12');
  timeline.progress(1, true).pause();
  return timeline;
}

export function initServicePreviews(media: ReturnType<typeof gsap.matchMedia>) {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-service-demo]')];
  if (!buttons.length) return;
  const discovered = new WeakSet<HTMLButtonElement>();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const listeners = new AbortController();
    // A replay's fromTo start states can be cached by GSAP. Restore the authored SVG
    // explicitly on teardown, including its transform cache, even mid-sequence.
    const originals = buttons.flatMap(button => [...button.querySelectorAll<SVGElement>('[data-part]')].map(node => ({
      node, attributes: ['style', 'transform', 'data-svg-origin'].map(name => [name, node.getAttribute(name)] as const),
    })));
    const visible = new Set<HTMLButtonElement>();
    type Demo = { button: HTMLButtonElement; timeline: gsap.core.Timeline };
    const demos = new Map<HTMLButtonElement, Demo>();
    let pending: Demo[] = [];
    let active: Demo | undefined;

    function pump() {
      if (active || document.hidden) return;
      while (pending.length) {
        const next = pending.shift()!;
        const rect = next.button.getBoundingClientRect();
        if (!visible.has(next.button) || rect.bottom <= 100 || rect.top >= innerHeight - 24) continue;
        active = next;
        discovered.add(next.button);
        next.button.dataset.demoState = 'playing';
        next.timeline.restart();
        break;
      }
    }

    function request(button: HTMLButtonElement, manual = false) {
      const demo = demos.get(button);
      if (!demo || active === demo) return;
      pending = pending.filter(item => item !== demo);
      if (manual) {
        const rect = button.getBoundingClientRect();
        if (rect.bottom > 100 && rect.top < innerHeight - 24) visible.add(button);
        pending.unshift(demo);
        if (active) { active.timeline.progress(1); return; }
      } else pending.push(demo);
      pump();
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const button = entry.target as HTMLButtonElement;
        if (entry.isIntersecting && entry.intersectionRatio >= .6) {
          visible.add(button);
          if (!discovered.has(button)) request(button);
        } else {
          visible.delete(button);
          pending = pending.filter(demo => demo.button !== button);
          if (active?.button === button) active.timeline.progress(1);
        }
      }
    }, { rootMargin: '-100px 0px -24px 0px', threshold: .6 });

    for (const button of buttons) {
      const svg = button.querySelector<SVGSVGElement>('.service-demo-art');
      if (!svg) continue;
      const demo = { button, timeline: createDemo(svg, button.dataset.serviceDemo ?? '') };
      demos.set(button, demo);
      demo.timeline.eventCallback('onComplete', () => {
        button.dataset.demoState = 'idle';
        if (active === demo) active = undefined;
        pump();
      });
      button.disabled = false;
      const options = { signal: listeners.signal };
      button.closest('.service-row')?.addEventListener('pointerenter', event => {
        if ((event as PointerEvent).pointerType !== 'touch') request(button, true);
      }, options);
      button.addEventListener('focus', () => request(button, true), options);
      button.addEventListener('click', () => request(button, true), options);
      observer.observe(button);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) active?.timeline.progress(1);
      else {
        for (const button of visible) if (!discovered.has(button)) request(button);
        pump();
      }
    }, { signal: listeners.signal });

    return () => {
      observer.disconnect();
      listeners.abort();
      pending = [];
      active?.timeline.pause();
      active = undefined;
      gsap.set(originals.map(({ node }) => node), { clearProps: 'all' });
      for (const { node, attributes } of originals) {
        for (const [name, value] of attributes) {
          if (value === null) node.removeAttribute(name);
          else node.setAttribute(name, value);
        }

      }
      for (const button of buttons) {
        button.disabled = true;
        button.dataset.demoState = 'idle';
      }
    };
  });
}
