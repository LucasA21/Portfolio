import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { visibleScene, whileVisible } from './util';
import { launch } from './flight';
import { createHeroRig } from './hero-frames';

let thrown = false; // the throw happens once per page load
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

  // Idle: left arm types, eyes blink. Both stop while the throw plays or the scene is off screen.
  const typing = rig.typing();
  const blink = rig.blink();
  let busy = false;
  const idle = { pause: () => (typing.pause(), blink.pause()), resume: () => (blink.resume(), busy || typing.resume()) } as unknown as gsap.core.Animation;
  whileVisible(scene, [idle]);

  const go = () => {
    if (thrown) return;
    thrown = busy = true;
    if (scene.getBoundingClientRect().bottom < 0) return launch(); // loaded scrolled down: skip the show
    typing.pause();
    scene.setAttribute('data-throw', 'running');
    rig.throwIt(launch, () => {
      busy = false;
      scene.setAttribute('data-throw', 'done');
      if (scene.getAttribute('data-motion') === 'running') typing.resume();
    });
  };
  if (thrown) return;

  if (window.matchMedia('(min-width: 1024px)').matches) {
    // From 1024 px the scroll starts the throw.
    const onScroll = () => scrollY > 8 && go();
    addEventListener('scroll', onScroll, { passive: true });
    offScroll = () => removeEventListener('scroll', onScroll);
    onScroll();
  } else {
    // Below 1024 px the hero throws on its own once it is on screen.
    ScrollTrigger.create({ trigger: scene, start: 'top 85%', once: true, onEnter: () => gsap.delayedCall(1.2, go) });
  }
}
