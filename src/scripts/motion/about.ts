import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { $, $$, pivot, visibleScene } from './util';

let sketch: gsap.core.Timeline | null = null;

export function initAbout({ reduce }: MotionContext) {
  const scene = visibleScene('about');
  sketch = null;
  if (!scene) return;
  // The man, the board frame and the floor line are drawn from the start: the section is far below the first screen,
  // so a draw-in there was never seen and only cost time on load.
  scene.setAttribute('data-intro', 'done');
  if (reduce) return;

  const hand = pivot($(scene, '[data-part="hand"]'));
  const jitter = (p: number) => hand && gsap.set(hand, { rotation: Math.sin(p * 90) * 3.2, x: Math.sin(p * 55) * 3, y: Math.cos(p * 70) * 2 });
  // The diagram on the board is written by the pen. Measuring its strokes (DrawSVG reads every path length) waits
  // until the scene is one screen away, so it does not weigh on page load.
  const prepare = () => {
    if (sketch) return sketch;
    const strokes = $$<SVGPathElement>(scene, 'mask [data-content]');
    strokes.sort((a, b) => +a.dataset.content! - +b.dataset.content!);
    gsap.set(strokes, { drawSVG: '0%' });
    const total = strokes.reduce((n, s) => n + s.getTotalLength(), 0);
    // One tween per stroke, lengths proportional to its share of the drawing, so the pen never speeds up or stalls.
    const tl = gsap.timeline({ paused: true, onUpdate: () => jitter(tl.progress()) });
    strokes.forEach((s) => tl.to(s, { drawSVG: '100%', duration: s.getTotalLength() / total, ease: 'none' }));
    tl.eventCallback('onComplete', () => hand && gsap.to(hand, { rotation: 0, x: 0, y: 0, duration: 0.4 }));
    return (sketch = tl);
  };
  ScrollTrigger.create({ trigger: scene, start: 'top bottom+=100%', once: true, onEnter: prepare });

  // The board writes itself whenever the scene comes into view, from above or below.
  const write = () => prepare().duration(3).restart();
  ScrollTrigger.create({ trigger: scene, start: 'clamp(top 75%)', end: 'bottom top', onEnter: write, onEnterBack: write, onLeaveBack: () => sketch?.pause(0) });
}
