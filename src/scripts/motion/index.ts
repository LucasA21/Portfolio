// Motion entry: registers GSAP plugins once and starts every scene inside a matchMedia
// context, so reduced-motion users get final states and loops never run for them.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { SplitText } from 'gsap/SplitText';
import { initReveal } from './reveal';
import { initHero } from './hero';
import { initAbout } from './about';
import { initContact } from './contact';
import { initFlight } from './flight';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin, SplitText);

export type MotionContext = { desktop: boolean; mobile: boolean; reduce: boolean };

const QUERIES = {
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
};

// Order matters: the flight drives the about sketch and the contact delivery.
const scenes = [initReveal, initHero, initAbout, initContact, initFlight];

gsap.matchMedia().add(QUERIES, (context) => {
  const ctx = context.conditions as MotionContext;
  scenes.forEach((scene) => scene(ctx));
});

// Loops stop while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) gsap.globalTimeline.pause();
  else gsap.globalTimeline.resume();
});

// Dev-only handle for scripts/check-motion.mjs and debugging.
if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ScrollTrigger: ScrollTrigger });
