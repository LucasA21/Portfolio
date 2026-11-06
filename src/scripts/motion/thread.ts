import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { setSketch } from './about';
import { setDelivered, setEnvelope } from './contact';
import { $, $$, visibleScene } from './util';

type P = [number, number];
type W = [number, number, number?]; // waypoint with an optional corner radius

let cable: gsap.core.Tween | null = null;
/** The laptop cable plugs in as soon as the hero finishes drawing. */
export const playCable = () => cable?.play();

const dstr = (pts: P[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');

/** Polyline through the waypoints with rounded corners, sampled densely. */
function rounded(w: W[], base = 24): P[] {
  const out: P[] = [[w[0][0], w[0][1]]];
  for (let i = 1; i < w.length - 1; i++) {
    const [a, b, c] = [w[i - 1], w[i], w[i + 1]];
    const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(b[2] ?? base, l1 / 2, l2 / 2);
    const p1: P = [b[0] + ((a[0] - b[0]) * r) / l1, b[1] + ((a[1] - b[1]) * r) / l1];
    const p2: P = [b[0] + ((c[0] - b[0]) * r) / l2, b[1] + ((c[1] - b[1]) * r) / l2];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      out.push([(1 - t) ** 2 * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0], (1 - t) ** 2 * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1]]);
    }
  }
  out.push([w.at(-1)![0], w.at(-1)![1]]);
  return out;
}

export function initThread({ reduce }: MotionContext) {
  const svg = document.querySelector<SVGSVGElement>('[data-thread]');
  if (!svg) return;
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  svg.style.display = wide ? '' : 'none';
  cable = null;
  if (!wide) return;

  const main = svg.parentElement!;
  const segs = (['a0', 'a1', 'b'] as const).map((k) => svg.querySelector<SVGPathElement>(`[data-thread-seg="${k}"]`)!);
  const [segA0, segA1, segB] = segs;

  // Layout positions that ignore transforms (cards and scenes fade in with a translate), relative to <main>.
  const layout = (el: HTMLElement) => {
    let x = 0, y = 0, n: HTMLElement | null = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight, r: x + el.offsetWidth, b: y + el.offsetHeight };
  };
  /** Points of a route path hidden inside a scene, mapped to <main> through the viewBox. */
  const route = (scene: SVGSVGElement | null, name: string): P[] => {
    const path = scene?.querySelector<SVGPathElement>(`[data-thread-path="${name}"]`);
    if (!scene || !path) return [];
    const box = layout(scene.parentElement as HTMLElement);
    const vb = scene.viewBox.baseVal;
    const k = box.w / vb.width;
    const L = path.getTotalLength();
    const out: P[] = [];
    for (let s = 0; s <= L; s += Math.max(4, L / 160)) {
      const p = path.getPointAtLength(s);
      out.push([box.l + (p.x - vb.x) * k, box.t + (p.y - vb.y) * k]);
    }
    const e = path.getPointAtLength(L);
    out.push([box.l + (e.x - vb.x) * k, box.t + (e.y - vb.y) * k]);
    return out;
  };

  let pen: P = [0, 0], envStart: P = [0, 0], mailEnd: P = [0, 0];
  const build = () => {
    const hero = route(visibleScene('hero'), 'hero');
    const ain = route(visibleScene('about'), 'about-in');
    const aout = route(visibleScene('about'), 'about-out');
    const cin = route(visibleScene('contact'), 'contact');
    if (!hero.length || !ain.length || !aout.length || !cin.length) return;
    svg.setAttribute('viewBox', `0 0 ${main.clientWidth} ${main.scrollHeight}`);
    svg.style.height = `${main.scrollHeight}px`;

    // Projects: weave through the gutters, never touching a card. Rows alternate right and left gutters.
    const cards = $$<HTMLElement>(document, '.project-card').filter((c) => c.offsetParent).map(layout);
    const rows: (typeof cards)[] = [];
    for (const c of cards) {
      const row = rows.find((r) => Math.abs(r[0].t - c.t) < 6);
      row ? row.push(c) : rows.push([c]);
    }
    rows.forEach((r) => r.sort((a, b) => a.l - b.l));
    const gutterX = (row: (typeof cards), right: boolean) => {
      const mids = row.slice(1).map((c, i) => (row[i].r + c.l) / 2);
      return mids.length ? (right ? mids.at(-1)! : mids[0]) : right ? row[0].r + 16 : row[0].l - 16;
    };
    const hd = hero.at(-1)!;
    const xs = rows.map((r, i) => gutterX(r, i % 2 === 0));
    const top = rows[0][0].t;
    const w: W[] = [[hd[0], hd[1]], [hd[0], hd[1] + (top - 44 - hd[1]) * 0.35, 90], [xs[0], top - 44, 90]];
    rows.forEach((r, i) => {
      const bottom = Math.max(...r.map((c) => c.b));
      if (i < rows.length - 1) {
        const gap = (bottom + rows[i + 1][0].t) / 2;
        w.push([xs[i], gap, 16], [xs[i + 1], gap, 16]);
      } else w.push([xs[i], bottom + 40, 60]);
    });
    const a0 = ain[0];
    w.push([a0[0], a0[1] - 60, 90], [a0[0], a0[1]]);
    const a1 = [...rounded(w), ...ain.slice(1)];

    // From the envelope on the board, down past the easel, along the gap and into the mailbox card.
    const contact = layout(document.getElementById('contact') as HTMLElement);
    const oe = aout.at(-1)!, c0 = cin[0];
    const wy = contact.t - 70;
    const b = [...aout, ...rounded([[oe[0], oe[1]], [oe[0], wy, 90], [c0[0], wy, 90], [c0[0], c0[1]]]).slice(1), ...cin.slice(1)];

    segA0.setAttribute('d', dstr(hero));
    segA1.setAttribute('d', dstr(a1));
    segB.setAttribute('d', dstr(b));
    pen = ain.at(-1)!; envStart = aout[0]; mailEnd = cin.at(-1)!;
  };
  build();
  if (reduce) return;

  const mainTop = () => main.getBoundingClientRect().top + window.scrollY;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const at = (p: P, frac: number) => Math.min(maxScroll(), Math.max(0, mainTop() + p[1] - innerHeight * frac));

  gsap.set(segs, { drawSVG: '0%' });
  cable = gsap.to(segA0, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', paused: true });
  // The first scroll hasn't happened yet when the hero finishes: if it already did, show the cable right away.
  if (document.querySelector('[data-scene="hero"][data-intro="done"]')) cable.play();

  const s1 = () => at(pen, 0.55);
  const s2 = () => Math.max(s1() + 120, at(envStart, 0.45));
  const s3 = () => Math.max(s2() + 160, at(mailEnd, 0.5));

  gsap.to(segA1, { drawSVG: '100%', ease: 'none', scrollTrigger: { start: 0, end: s1, scrub: 0.6, invalidateOnRefresh: true } });
  ScrollTrigger.create({ start: s1, end: s2, scrub: 0.6, invalidateOnRefresh: true, onUpdate: (self) => setSketch(self.progress) });

  // Last stretch: thread, then the envelope outline it ends in.
  const env = { p: 0 };
  let delivered = false;
  gsap
    .timeline({
      scrollTrigger: {
        start: s2,
        end: s3,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (self.progress > 0.995 && !delivered) setDelivered((delivered = true));
          else if (self.progress < 0.97 && delivered) setDelivered((delivered = false));
        },
      },
    })
    .to(segB, { drawSVG: '100%', duration: 0.86, ease: 'none' })
    .to(env, { p: 1, duration: 0.14, ease: 'none', onUpdate: () => setEnvelope(env.p) });

  let t: number | undefined;
  const rebuild = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      build();
      ScrollTrigger.refresh();
    }, 200);
  };
  new ResizeObserver(rebuild).observe(main);
  document.fonts?.ready.then(rebuild);
  window.addEventListener('load', rebuild, { once: true });
}
