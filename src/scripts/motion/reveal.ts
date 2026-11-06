import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { MotionContext } from './index';

const REVEAL = '.fade-up, .fade-up-bottom';

export function initReveal({ reduce }: MotionContext) {
  if (reduce) {
    document.querySelectorAll(REVEAL).forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // CSS owns the transition; GSAP only decides when each block enters.
  ScrollTrigger.batch(REVEAL, {
    start: 'top 88%',
    once: true,
    onEnter: (els) => els.forEach((el) => el.classList.add('is-visible')),
  });

  document.querySelectorAll<HTMLElement>('h1[data-split]').forEach((title) => {
    SplitText.create(title, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, { yPercent: 105, duration: 0.8, ease: 'expo.out', stagger: 0.09, delay: 0.15 }),
    });
  });
}
