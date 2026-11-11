import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { $, blink, drawIn, pivot, visibleScene, whileVisible } from './util';

let deliver: ((on: boolean) => void) | null = null;
/** Called by the flight when the plane lands (or no longer). */
export const setDelivered = (on: boolean) => deliver?.(on);
/** The flight plays the plane-to-envelope unfold before `go`; `refold` turns the envelope back into the plane once it left the slot; `reset` puts the plane back when the envelope never came out. */
export const hooks: { unfold: ((go: () => void) => void) | null; refold: (() => void) | null; reset: (() => void) | null } = { unfold: null, refold: null, reset: null };

export function initContact({ reduce }: MotionContext) {
  const scene = visibleScene('contact');
  deliver = null;
  if (!scene) return;
  const envelope = $(scene, '[data-envelope]')!;
  // The closing beat: once the mail is delivered the address draws its underline and "Copiar mail" pulses once (global.css).
  const section = scene.closest<HTMLElement>('#contact');
  const closing = (on: boolean) => {
    section?.classList.toggle('is-delivered', on);
    section?.classList.toggle('mail-wait', !on);
  };
  if (reduce) {
    section?.classList.add('is-delivered');
    envelope.style.display = 'none'; // already inside the mailbox
    scene.setAttribute('data-delivered', 'true');
    scene.setAttribute('data-intro', 'done');
    return;
  }
  scene.setAttribute('data-delivered', 'false');
  closing(false);
  const withThread = window.matchMedia('(min-width: 1024px)').matches;

  // The envelope is the plane's last form: it appears when the unfold ends, with its outline already complete.
  gsap.set(envelope, { opacity: 0 });
  const flag = pivot($(scene, '[data-flag]'));
  if (flag) gsap.set(flag, { rotation: 90 }); // lowered until the mail arrives

  // Delivery: the envelope slips into the slot, the flag goes up, he nods. The slot lid never moves: it is a clipped
  // copy of the drawing, so rotating it would leave a blank hole where it was.
  const post = gsap.timeline({ paused: true, onComplete: () => {
      scene.setAttribute('data-delivered', 'true');
      closing(true);
    }, onReverseComplete: () => {
      scene.setAttribute('data-delivered', 'false');
      hooks.refold?.();
    },
  });
  post
    .set(envelope, { opacity: 1 })
    .to(envelope, { y: +(envelope as SVGElement).dataset.slide!, duration: 0.7, ease: 'power2.in' }, '+=0.15')
    .set(envelope, { opacity: 0 });
  if (flag) post.to(flag, { rotation: 0, duration: 0.6, ease: 'back.out(3)' }, '+=0.05');
  const head = $(scene, '[data-part="head"]');
  if (head) post.to(head, { rotation: 2, svgOrigin: (head as SVGElement).dataset.origin, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<');
  deliver = (on) => {
    if (on) {
      post.timeScale(1);
      // Envelope still on its way out: let it slide back in. Otherwise the plane unfolds again first.
      if (post.progress() > 0 || !hooks.unfold) post.play();
      else hooks.unfold(() => post.play());
    } else if (post.progress() > 0) {
      closing(false);
      // The envelope leaves the slot (four times as fast: the plane must not lag behind the scroll), then the flight folds it back into the plane.
      post.timeScale(4).reverse();
    } else hooks.reset?.(); // delivery had not reached the slot yet: just put the plane back
  };

  // The draw-in is built when the scene is one screen away: DrawSVG measures every stroke, which is not free.
  let intro: gsap.core.Timeline | null = null;
  const prepare = () => (intro ??= drawIn(scene, { duration: 1.2 }));
  ScrollTrigger.create({ trigger: scene, start: 'top bottom+=100%', once: true, onEnter: prepare });
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
      prepare().play();
      whileVisible(scene, loops);
    },
  });
  if (!withThread) {
    ScrollTrigger.create({ trigger: scene, start: 'clamp(top 85%)', onEnter: () => deliver?.(true), onLeaveBack: () => deliver?.(false) });
  }
}
