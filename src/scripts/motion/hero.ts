import { gsap } from 'gsap';
import type { MotionContext } from './index';
import { $, blink, drawIn, pivot, visibleScene, whileVisible } from './util';
import { launch } from './flight';

export function initHero({ reduce }: MotionContext) {
  const scene = visibleScene('hero');
  if (!scene) return;
  scene.setAttribute('data-ready', '');
  if (reduce) {
    scene.setAttribute('data-intro', 'done');
    scene.setAttribute('data-motion', 'paused');
    return;
  }

  const intro = drawIn(scene, { duration: 1.4 });
  const head = pivot($(scene, '[data-part="head"]'));
  const hands = [pivot($(scene, '[data-part="handBack"]')), pivot($(scene, '[data-part="handFront"]'))];

  // Typing: bursts of key presses, a nod toward the laptop in between. (The monitor faces away, nothing is written on it.)
  const typing = gsap.timeline({ repeat: -1, paused: true });
  for (let i = 0; i < 4; i++) {
    const t = typing.duration();
    for (let k = 0; k < 7; k++) {
      typing.to(hands[k % 2], { rotation: k % 2 ? 4 : -4, duration: 0.09, ease: 'power1.out' }, t + k * 0.11)
        .to(hands[k % 2], { rotation: 0, duration: 0.09, ease: 'power1.in' }, t + k * 0.11 + 0.09);
    }
    typing.to(head, { rotation: 2.5, duration: 0.4, ease: 'sine.inOut' }, t + 0.1)
      .to(head, { rotation: i % 2 ? -1 : 0, duration: 0.5, ease: 'sine.inOut' }, t + 0.95)
      .to({}, { duration: 0.8 }, t + 1.4);
  }

  const loops = [typing, blink(scene)];
  intro.eventCallback('onComplete', () => {
    scene.setAttribute('data-intro', 'done');
    launch();
    whileVisible(scene, loops);
  });
  intro.play();
}
