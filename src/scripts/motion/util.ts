import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const $ = <T extends Element = SVGElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
export const $$ = <T extends Element = SVGElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];

/** Visible scene of a kind (the contact scene has a hidden desktop or mobile twin). */
export function visibleScene(name: string) {
  return $$<SVGSVGElement>(document, `[data-scene="${name}"]`).find((s) => s.getBoundingClientRect().width > 0) ?? null;
}

/** Pivot each articulated part around its data-origin (viewBox units). */
export function pivot(el: Element | null) {
  if (el instanceof SVGElement && el.dataset.origin) gsap.set(el, { svgOrigin: el.dataset.origin });
  return el;
}

/** Ink draw-in: mask strokes are drawn in reading order, solid fills fade in last. */
export function drawIn(scene: SVGSVGElement, opts: { duration?: number; skip?: string } = {}) {
  const strokes = $$<SVGPathElement>(scene, 'mask [data-reveal]').filter((p) => !(opts.skip && p.matches(opts.skip)));
  const fills = $$(scene, 'mask [data-reveal-fill]');
  const box = (p: SVGPathElement) => p.getBBox();
  strokes.sort((a, b) => box(a).y + box(a).x * 0.25 - (box(b).y + box(b).x * 0.25));
  const total = opts.duration ?? 1.4;
  const tl = gsap.timeline({ paused: true, onComplete: () => scene.setAttribute('data-intro', 'done') });
  tl.fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', duration: total * 0.45, ease: 'power2.inOut', stagger: { amount: total * 0.55 } }, 0);
  tl.fromTo(fills, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, total * 0.75);
  tl.progress(0).pause();
  return tl;
}

/** Loops that only run while their scene is on screen; data-motion mirrors the state. */
export function whileVisible(scene: SVGSVGElement, loops: gsap.core.Animation[]) {
  const set = (on: boolean) => {
    scene.setAttribute('data-motion', on ? 'running' : 'paused');
    loops.forEach((l) => (on ? l.resume() : l.pause()));
  };
  set(false);
  ScrollTrigger.create({ trigger: scene, start: 'top bottom', end: 'bottom top', onToggle: (self) => set(self.isActive) });
}

/** Blink both eyes at random intervals. */
export function blink(scene: SVGSVGElement) {
  const eyes = $$(scene, '[data-part="eyeL"], [data-part="eyeR"]');
  eyes.forEach(pivot);
  const tl = gsap.timeline({ repeat: -1, repeatRefresh: true, paused: true });
  tl.to(eyes, { scaleY: 0.1, duration: 0.06, ease: 'power1.in' })
    .to(eyes, { scaleY: 1, duration: 0.09, ease: 'power1.out' })
    .to({}, { duration: () => gsap.utils.random(3.5, 6) });
  return tl;
}
