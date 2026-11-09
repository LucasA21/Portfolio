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

// What is on screen at load starts right away; the rest starts in later tasks, one scene per task, so measuring the
// page and building the flight route never block input as one long task. Order matters: contact sets the hooks the
// flight uses, and the flight picks up a throw that happened before it was ready.
const first = [initReveal, initHero];
const later = [initAbout, initContact, initFlight];

gsap.matchMedia().add(QUERIES, (context) => {
  const ctx = context.conditions as MotionContext;
  let alive = true;
  first.forEach((scene) => scene(ctx));
  const queue = later.map((scene) => context.add(() => scene(ctx)) as unknown as () => void);
  const next = () => {
    if (!alive) return;
    queue.shift()?.();
    if (queue.length) setTimeout(next, 0);
  };
  setTimeout(next, 0);
  return () => {
    alive = false;
  };
});

// Loops stop while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) gsap.globalTimeline.pause();
  else gsap.globalTimeline.resume();
});

// Dev-only handle for scripts/check-motion.mjs and debugging.
if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ScrollTrigger: ScrollTrigger });
