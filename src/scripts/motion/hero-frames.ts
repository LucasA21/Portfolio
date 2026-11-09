import { gsap } from 'gsap';

/** Frame-by-frame hero: every drawing is a hidden <g data-frame>; showing one hides its siblings. 10 frames per second. */
export const TICK = 0.1;

const REST = { 'arm-r': '', 'arm-l': 'typing', head: 'front', eyes: 'open' } as const;
const TYPING = ['typing', 'typing-b'] as const;

export function createHeroRig(svg: SVGSVGElement) {
  const frames = (piece: string) => [...svg.querySelectorAll<SVGGElement>(`[data-piece="${piece}"] > [data-frame]`)];
  const show = (piece: string, name: string) =>
    frames(piece).forEach((f) => f.setAttribute('visibility', f.dataset.frame === name ? 'visible' : 'hidden'));
  const look = { up: false, closed: false };
  const eyes = () => show('eyes', `${look.up ? 'look-up-' : ''}${look.closed ? 'closed' : 'open'}`);
  const setLook = (up: boolean) => {
    look.up = up;
    show('head', up ? 'look-up' : 'front');
    eyes();
  };
  const rest = () => {
    Object.entries(REST).forEach(([piece, name]) => show(piece, name));
    show('plane-in-hand', '');
    look.up = look.closed = false;
    eyes();
  };

  /** Left arm alternates its two drawings, holding each one or two ticks, with a longer pause now and then. */
  function typing() {
    const tl = gsap.timeline({ repeat: -1, paused: true });
    let t = 0, i = 0;
    for (let burst = 0; burst < 4; burst++) {
      for (let k = 0; k < 10; k++) {
        const frame = TYPING[i++ % 2];
        tl.call(show, ['arm-l', frame], t);
        t += TICK * (Math.random() < 0.4 ? 2 : 1);
      }
      tl.call(show, ['arm-l', TYPING[0]], t);
      t += TICK * Math.round(gsap.utils.random(8, 12));
    }
    return tl.to({}, { duration: TICK }, t);
  }

  /** Eyes close for one tick every 3 to 6 seconds, at random. */
  function blink() {
    const tl = gsap.timeline({ repeat: -1, repeatRefresh: true, paused: true });
    return tl
      .call(() => ((look.closed = true), eyes()))
      .to({}, { duration: TICK })
      .call(() => ((look.closed = false), eyes()))
      .to({}, { duration: () => gsap.utils.random(3, 6) });
  }

  /**
   * The throw: the right arm rises with the plane in hand (windup), releases it, and goes back down to rest.
   * With `held` the arm is already raised (see catchIt), so it releases at once. Typing stays paused until `resume`.
   * onRelease fires on the tick the plane leaves the hand.
   */
  function throwIt(onRelease: () => void, resume: () => void, held = false) {
    const tl = gsap.timeline();
    const t = held ? 0 : 4 * TICK;
    if (!held) {
      tl.call(() => {
        show('arm-r', 'windup');
        show('base-patch', 'windup');
        show('plane-in-hand', 'windup');
      }, [], 0);
    }
    tl.call(() => {
      show('arm-r', 'release');
      show('base-patch', '');
      show('plane-in-hand', '');
      setLook(true);
      onRelease();
    }, [], t);
    tl.call(() => show('arm-r', ''), [], t + 6 * TICK); // arm down: back to the rest drawing
    tl.call(() => setLook(false), [], t + 1.4);
    tl.call(resume, [], t + 1.5);
    return tl;
  }

  /** The plane is coming back: the arm rises with the hand open, waiting for it. */
  function reach() {
    show('arm-r', 'release');
    setLook(true);
  }

  /** The plane reached the open hand: the hand closes on it (windup with the plane) and holds. */
  function catchIt(done: () => void) {
    const tl = gsap.timeline();
    tl.call(() => {
      show('arm-r', 'windup');
      show('base-patch', 'windup');
      show('plane-in-hand', 'windup');
      setLook(false);
    }, [], 0);
    tl.call(done, [], TICK);
    return tl;
  }

  return { show, rest, typing, blink, throwIt, reach, catchIt, setLook };
}
