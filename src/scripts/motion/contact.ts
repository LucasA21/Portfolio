import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { $, $$, blink, drawIn, pivot, visibleScene, whileVisible } from './util';

let deliver: ((on: boolean) => void) | null = null;
let envelopeDraw: gsap.core.Timeline | null = null;
/** The thread's last stretch is the envelope outline: the page script scrubs it with the scroll. */
export const setEnvelope = (p: number) => envelopeDraw?.progress(p);
/** Called by the thread when the envelope is complete (or no longer). */
export const setDelivered = (on: boolean) => deliver?.(on);

export function initContact({ reduce }: MotionContext) {
  const scene = visibleScene('contact');
  deliver = null;
  envelopeDraw = null;
  if (!scene) return;
  const envelope = $(scene, '[data-envelope]')!;
  const body = $(scene, '[data-envelope-body]');
  const lid = pivot($(scene, '[data-part="slotLid"]'));
  if (reduce) {
    envelope.style.display = 'none'; // already inside the mailbox
    scene.setAttribute('data-delivered', 'true');
    scene.setAttribute('data-intro', 'done');
    return;
  }
  scene.setAttribute('data-delivered', 'false');
  const withThread = window.matchMedia('(min-width: 1024px)').matches;

  // Envelope outline: scrubbed by the thread on wide screens, drawn on its own otherwise.
  const strokes = $$<SVGPathElement>(scene, '[data-envelope-outline], [data-envelope-flap]');
  gsap.set(envelope, { opacity: 1 });
  gsap.set(body, { opacity: 0 });
  gsap.set(strokes, { drawSVG: '0%' });
  envelopeDraw = gsap.timeline({ paused: true });
  envelopeDraw.to(strokes[0], { drawSVG: '100%', duration: 0.75, ease: 'none' }).to(strokes[1], { drawSVG: '100%', duration: 0.25, ease: 'none' });

  // Delivery: paper fills in, the envelope slips into the slot, the lid flaps shut, he nods.
  const origin = (envelope as SVGElement).dataset.origin!;
  const post = gsap.timeline({ paused: true, onComplete: () => scene.setAttribute('data-delivered', 'true'), onReverseComplete: () => scene.setAttribute('data-delivered', 'false') });
  post
    .to(body, { opacity: 1, duration: 0.15 })
    .to(lid, { rotation: -22, duration: 0.25, ease: 'power2.out' }, '+=0.05')
    .to(envelope, { y: +(envelope as SVGElement).dataset.slide!, scaleY: 0.1, svgOrigin: origin, duration: 0.55, ease: 'power2.in' }, '<0.1')
    .set(envelope, { opacity: 0 })
    .to(lid, { rotation: 0, duration: 0.35, ease: 'back.out(2)' });
  const head = $(scene, '[data-part="head"]');
  if (head) post.to(head, { rotation: 2, svgOrigin: (head as SVGElement).dataset.origin, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<');
  deliver = (on) => {
    if (withThread) {
      if (on) post.play();
      else post.reverse();
    } else if (on) {
      envelopeDraw!.eventCallback('onComplete', () => post.play()).play();
    } else {
      envelopeDraw!.eventCallback('onComplete', null);
      post.reverse();
      envelopeDraw!.reverse();
    }
  };

  const intro = drawIn(scene, { duration: 1.2 });
  const loops: gsap.core.Animation[] = [blink(scene)];
  const arm = pivot($(scene, '[data-part="forearm"]'));
  if (arm) loops.push(gsap.to(arm, { rotation: -3, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }));
  const hand = pivot($(scene, '[data-part="hand"]'));
  if (hand) {
    const tap = gsap.timeline({ repeat: -1, repeatDelay: 2.4, paused: true });
    for (let k = 0; k < 3; k++) tap.to(hand, { rotation: -5, duration: 0.08 }).to(hand, { rotation: 0, duration: 0.1 });
    loops.push(tap);
  }
  ScrollTrigger.create({
    trigger: scene,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      intro.play();
      whileVisible(scene, loops);
    },
  });
  if (!withThread) {
    ScrollTrigger.create({ trigger: scene, start: 'clamp(top 70%)', onEnter: () => deliver?.(true), onLeaveBack: () => deliver?.(false) });
  }
}
