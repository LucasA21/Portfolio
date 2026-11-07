import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { $, $$, drawIn, pivot, visibleScene } from './util';

let sketch: gsap.core.Timeline | null = null;
/** Draws the board (0 to 1) in the order the pen "writes" it. */
export const setSketch = (p: number) => sketch?.progress(p);

export function initAbout({ reduce }: MotionContext) {
  const scene = visibleScene('about');
  sketch = null;
  if (!scene) return;
  if (reduce) {
    scene.setAttribute('data-intro', 'done');
    return;
  }

  // The man, the board frame and the floor line draw in once; the diagram on the board is written by the pen.
  const intro = drawIn(scene, { duration: 1.5, skip: '[data-content]' });
  const strokes = $$<SVGPathElement>(scene, 'mask [data-content]');
  strokes.sort((a, b) => +a.dataset.content! - +b.dataset.content!);
  gsap.set(strokes, { drawSVG: '0%' });
  const total = strokes.reduce((n, s) => n + s.getTotalLength(), 0);
  const hand = pivot($(scene, '[data-part="hand"]'));
  const write = (p: number) => hand && gsap.set(hand, { rotation: Math.sin(p * 90) * 3.2, x: Math.sin(p * 55) * 3, y: Math.cos(p * 70) * 2 });

  // One tween per stroke, lengths proportional to its share of the drawing, so the pen never speeds up or stalls.
  sketch = gsap.timeline({ paused: true, onUpdate: () => write(sketch!.progress()) });
  strokes.forEach((s) => sketch!.to(s, { drawSVG: '100%', duration: s.getTotalLength() / total, ease: 'none' }));
  sketch.eventCallback('onComplete', () => hand && gsap.to(hand, { rotation: 0, x: 0, y: 0, duration: 0.4 }));

  // The base figure is drawn right away, long before the section scrolls into view; only the board writing is scroll-driven.
  intro.play();
  // Below 1024 px there is no page-long thread: the board writes itself when the scene comes into view.
  if (!window.matchMedia('(min-width: 1024px)').matches) {
    ScrollTrigger.create({ trigger: scene, start: 'clamp(top 75%)', once: true, onEnter: () => sketch?.duration(3).play() });
  }
}
