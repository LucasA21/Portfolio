import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { visibleScene, whileVisible } from './util';
import { launch, recall } from './flight';
import { createHeroRig } from './hero-frames';

// rest: plane not thrown yet | throwing | away: plane flying | recalling: plane flies back to the hand | held: plane in hand
type State = 'rest' | 'throwing' | 'away' | 'recalling' | 'held';
let state: State = 'rest';
let offScroll: (() => void) | null = null;

export function initHero({ reduce }: MotionContext) {
  offScroll?.();
  const scene = visibleScene('hero');
  if (!scene) return;
  if (!scene.hasAttribute('data-frames')) return; // /dibujos also shows the old static HeroScene
  const rig = createHeroRig(scene);
  rig.rest();
  scene.setAttribute('data-ready', '');
  scene.setAttribute('data-intro', 'done');
  if (reduce) {
    scene.setAttribute('data-motion', 'paused');
    return;
  }
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  if (state !== 'rest') state = wide ? 'away' : 'rest';

  // Idle: left arm types, eyes blink. Typing only runs while the right arm is down.
  const typing = rig.typing();
  const blink = rig.blink();
  const armDown = () => state === 'rest' || state === 'away';
  const idle = { pause: () => (typing.pause(), blink.pause()), resume: () => (blink.resume(), armDown() && typing.resume()) } as unknown as gsap.core.Animation;
  whileVisible(scene, [idle]);
  const set = (s: State) => {
    state = s;
    scene.setAttribute('data-throw', s);
    if (armDown() && scene.getAttribute('data-motion') === 'running') typing.resume();
    else typing.pause();
  };
  const thrown = () => (set('away'), wide && scrollY <= 8 && catchNow());

  const throwNow = (held: boolean) => {
    set('throwing');
    rig.throwIt(launch, thrown, held);
  };
  // Back at the top the plane returns to the hand, the hand catches it and holds it until the next scroll down.
  const catchNow = () => {
    set('recalling');
    rig.reach();
    recall(() => rig.catchIt(() => (set('held'), scrollY > 8 && throwNow(true))));
  };

  const onScroll = () => {
    if (scrollY > 8) {
      if (state === 'rest' && scene.getBoundingClientRect().bottom < 0) return launch(), set('away'); // loaded scrolled down
      if (state === 'rest') {
        typing.pause();
        throwNow(false);
      } else if (state === 'held') throwNow(true);
    } else if (state === 'away') catchNow();
  };

  if (wide) {
    // From 1024 px scrolling drives the throw; scrolling back to the top brings the plane back.
    addEventListener('scroll', onScroll, { passive: true });
    offScroll = () => removeEventListener('scroll', onScroll);
    onScroll();
  } else if (state === 'rest') {
    // Below 1024 px the hero throws on its own, once, after it comes on screen.
    ScrollTrigger.create({ trigger: scene, start: 'top 85%', once: true, onEnter: () => gsap.delayedCall(1.2, () => (typing.pause(), throwNow(false))) });
  }
}
