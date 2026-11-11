// Paper plane flight. From 1024 px: thrown from Lucas's hand, it weaves between the project cards, glides past the
// board in Sobre mí and lands on the mailbox, where contact.ts folds it into the envelope, all in step with the scroll.
// Below 1024 px: thrown off the right edge, it crosses the screen through the gaps between sections and cards, then
// glides onto the mailbox.
// The plane is positioned from the route path (getPointAtLength), so no MotionPath plugin is needed.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { hooks, setDelivered } from './contact';
import { $, $$, visibleScene } from './util';

type P = [number, number];
type W = [number, number, number?]; // waypoint with an optional corner radius

const TRAIL = 0.1; // visible trail: share of the route behind the plane
const SCALE = 0.58; // plane drawing is 124 units wide: about 72 px on screen
const SCALE_SMALL = 0.42; // about 52 px below 1024 px, small enough to fit the gaps between stacked cards
const FRAMES = ['unfold-1', 'unfold-2', 'sheet', 'fold-1', 'fold-2'];

let launchFn: (() => void) | null = null;
let launched = false;
let recallFn: ((done: () => void) => void) | null = null;
/** Scroll back to the top: the plane flies back to the hand and `done` runs when it arrives. */
export const recall = (done: () => void) => (recallFn ? recallFn(done) : done());
/** The plane takes off from Lucas's hand at the second release of the hero throw. */
export const launch = () => {
  launched = true;
  launchFn?.();
};

const dstr = (pts: P[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');
const plen = (pts: P[]) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

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

/**
 * Breaks up straight drops: every run of the route within ~11 degrees of vertical and longer than 70 px swings
 * sideways in S curves (zero offset at both ends). Runs inside `keep` (the card gutters) stay as they are.
 */
function unvertical(sparse: P[], keep?: [number, number]): P[] {
  const pts: P[] = [sparse[0]];
  for (const p of sparse.slice(1)) {
    const q = pts.at(-1)!, n = Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / 10);
    for (let s = 1; s <= n; s++) pts.push([q[0] + ((p[0] - q[0]) * s) / n, q[1] + ((p[1] - q[1]) * s) / n]);
  }
  const out = pts.map((p) => [...p] as P);
  const steep = (i: number) => {
    const dy = pts[i + 1][1] - pts[i][1];
    return dy > 0 && Math.abs(pts[i + 1][0] - pts[i][0]) < 0.2 * dy;
  };
  for (let i = 0; i < pts.length - 1; ) {
    if (!steep(i)) { i++; continue; }
    let j = i;
    while (j < pts.length - 1 && steep(j)) j++;
    const len = pts[j][1] - pts[i][1];
    const inKeep = keep && pts[i][1] < keep[1] && pts[j][1] > keep[0];
    if (len > 70 && !inKeep) {
      const amp = Math.min(40, len / 4), waves = Math.max(1, Math.round(len / 200));
      for (let k = i; k <= j; k++) out[k][0] += amp * Math.sin((2 * Math.PI * waves * (pts[k][1] - pts[i][1])) / len);
    }
    i = j + 1;
  }
  return out;
}

export function initFlight({ reduce }: MotionContext) {
  const svg = document.querySelector<SVGSVGElement>('[data-thread]');
  launchFn = null;
  recallFn = null;
  hooks.unfold = hooks.refold = hooks.reset = null;
  if (!svg) return;
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  const main = svg.parentElement!;
  const planeG = $<SVGGElement>(svg, '[data-plane]')!;
  const frames = Object.fromEntries($$<SVGGElement>(svg, '[data-frame]').map((f) => [f.dataset.frame!, f]));
  const show = (name: string) => Object.entries(frames).forEach(([k, f]) => (f.style.display = k === name ? '' : 'none'));
  const routes = Object.fromEntries($$<SVGPathElement>(svg, '[data-flight-route]').map((p) => [p.dataset.flightRoute!, p]));
  const trails = (k: string) => $$<SVGPathElement>(svg, `[data-trail="${k}"]`);
  const ringBox = $(svg, '[data-ring]')!;

  // Layout positions that ignore transforms (cards and scenes fade in with a translate), relative to <main>.
  const layout = (el: HTMLElement) => {
    let x = 0, y = 0, n: HTMLElement | null = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight, r: x + el.offsetWidth, b: y + el.offsetHeight };
  };
  const sceneScale = (scene: SVGSVGElement) => layout(scene.parentElement as HTMLElement).w / scene.viewBox.baseVal.width;
  /** Points of a route path hidden inside a scene, mapped to <main> through the viewBox (about `n` samples). */
  const route = (scene: SVGSVGElement | null, name: string, n = 160): P[] => {
    const path = scene?.querySelector<SVGPathElement>(`[data-thread-path="${name}"]`);
    if (!scene || !path) return [];
    const box = layout(scene.parentElement as HTMLElement);
    const vb = scene.viewBox.baseVal;
    const k = box.w / vb.width;
    const L = path.getTotalLength();
    const out: P[] = [];
    for (let s = 0; s < L; s += Math.max(4, L / n)) {
      const p = path.getPointAtLength(s);
      out.push([box.l + (p.x - vb.x) * k, box.t + (p.y - vb.y) * k]);
    }
    const e = path.getPointAtLength(L);
    out.push([box.l + (e.x - vb.x) * k, box.t + (e.y - vb.y) * k]);
    return out;
  };

  let pin: P = [0, 0], envStart: P = [0, 0], mail = { x: 0, y: 0, w: 0 };
  let heroFrac = 1;
  let cards: { el: HTMLElement; ring: SVGRectElement; l: number; r: number; t: number; b: number }[] = [];
  let reach = 60; // how close the plane must be to a card (px from its edge) to light it
  let lit = -1; // index of the one card lit right now
  /** Below 1024 px the plane does not follow one long route: it crosses the screen through the gaps (waves between
   *  sections, gaps between stacked cards, above the board) in step with the scroll, then lands on the mailbox. */
  let crossings: { y: number; h: number; dir: number; row: number[] }[] = [];

  /** Card rings sit just outside each card (the cards cover everything inside them). */
  const makeCards = (els: HTMLElement[]) =>
    els.map((el) => {
      const r = layout(el);
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      ring.setAttribute('x', String(r.l - 4)); ring.setAttribute('y', String(r.t - 4));
      ring.setAttribute('width', String(r.w + 8)); ring.setAttribute('height', String(r.h + 8));
      ring.setAttribute('rx', '36');
      ringBox.appendChild(ring);
      gsap.set(ring, { drawSVG: '0%' });
      return { el, ring, l: r.l, r: r.r, t: r.t, b: r.b };
    });

  const buildCrossings = () => {
    const els = $$<HTMLElement>(document, '.project-card, .project-featured').filter((c) => c.offsetParent);
    cards = makeCards(els);
    const gaps: { y: number; h: number; row: number[] }[] = [];
    const projects = document.getElementById('projects');
    const aboutSec = document.getElementById('about');
    const board = visibleScene('about');
    if (projects) gaps.push({ y: layout(projects).t - 30, h: 70, row: [] }); // the wave under the hero
    // Gaps between rows of cards (one card per row on phones, two on tablets); crossing one lights the row below.
    const rows: number[][] = [];
    cards.forEach((c, i) => {
      const r = rows.find((k) => Math.abs(cards[k[0]].t - c.t) < 6);
      r ? r.push(i) : rows.push([i]);
    });
    const bottomOf = (r: number[]) => Math.max(...r.map((i) => cards[i].b));
    rows.forEach((r, i) => i && gaps.push({ y: (bottomOf(rows[i - 1]) + cards[r[0]].t) / 2, h: cards[r[0]].t - bottomOf(rows[i - 1]), row: r }));
    if (aboutSec) gaps.push({ y: layout(aboutSec).t - 20, h: 70, row: [] }); // the wave above Sobre mí
    if (board) gaps.push({ y: layout(board.parentElement as HTMLElement).t - 16, h: 40, row: [] }); // right before the board
    // Only one crossing on screen at a time: keep them further apart than the scroll each one takes.
    const range = innerHeight * 0.55;
    crossings = [];
    for (const g of gaps) if (!crossings.length || g.y - crossings.at(-1)!.y > range) crossings.push({ ...g, dir: crossings.length % 2 ? 1 : -1 });
  };

  const build = () => {
    // Below 1024 px only the ends of these routes are used (the throw starts at the hand, the landing is the envelope).
    const samples = wide && !reduce ? 160 : 1;
    const hero = route(visibleScene('hero'), 'hero', samples);
    // Sobre mí: the plane skirts the board along its left margin (never crossing the drawing).
    const about = visibleScene('about');
    const ab = about ? layout(about.parentElement as HTMLElement) : null;
    const edge = ab ? Math.max(28, ab.l - 44) : 0;
    const ain: P[] = ab ? [[edge, ab.t - 40], [edge, ab.t + ab.h * 0.3]] : [];
    const aout: P[] = ab ? [[edge, ab.t + ab.h * 0.65], [edge, ab.t + ab.h + 30]] : [];
    const cin = route(visibleScene('contact'), 'contact', samples);
    const contact = visibleScene('contact');
    if (!hero.length || !ain.length || !aout.length || !cin.length || !contact) return;
    svg.setAttribute('viewBox', `0 0 ${main.clientWidth} ${main.scrollHeight}`);
    svg.style.height = `${main.scrollHeight}px`;

    // Mailbox landing spot: centre of the envelope drawn in the contact scene.
    const k = sceneScale(contact);
    const bb = $<SVGGraphicsElement>(contact, '[data-envelope-body]')!.getBBox();
    const end = cin.at(-1)!;
    mail = { x: end[0], y: end[1] + (bb.height * k) / 2, w: bb.width * k };
    pin = aout[0];
    envStart = aout[0];

    cards.forEach((c) => {
      c.ring.remove();
      c.el.classList.remove('plane-pass');
    });
    cards = [];
    lit = -1;
    if (!wide || reduce) {
      // The throw: up and out of the right edge of the screen; the first crossing brings it back from there.
      const h0 = hero[0], W = main.clientWidth;
      routes.a.setAttribute('d', dstr(rounded([[h0[0], h0[1]], [Math.min(W - 24, h0[0] + 90), h0[1] - 40, 70], [W + 90, h0[1] + 70]])));
      heroFrac = 1;
      if (!reduce) buildCrossings();
      return;
    }

    // Projects: weave through the gutters, never touching a card. Rows alternate right and left gutters.
    const els = $$<HTMLElement>(document, '.project-card, .project-featured').filter((c) => c.offsetParent);
    const rects = els.map(layout);
    const rows: (typeof rects)[] = [];
    for (const c of rects) {
      const row = rows.find((r) => Math.abs(r[0].t - c.t) < 6);
      row ? row.push(c) : rows.push([c]);
    }
    rows.forEach((r) => r.sort((a, b) => a.l - b.l));
    const gutterX = (row: typeof rects, right: boolean) => {
      const mids = row.slice(1).map((c, i) => (row[i].r + c.l) / 2);
      return mids.length ? (right ? mids.at(-1)! : mids[0]) : right ? row[0].r + 16 : row[0].l - 16;
    };
    // With wide side margins the plane glides down them in S curves; otherwise it threads the gutters.
    const left = Math.min(...rects.map((c) => c.l)), right = Math.max(...rects.map((c) => c.r));
    const room = Math.min(left, main.clientWidth - right);
    const roomy = room >= 120;
    const amp = roomy ? Math.min(55, room / 2 - 22) : 0;
    reach = roomy ? room / 2 + 36 : 60;
    const hd = hero.at(-1)!;
    const lane = (row: typeof rects, rightSide: boolean) => (roomy ? (rightSide ? right + (main.clientWidth - right) / 2 : left / 2) : gutterX(row, rightSide));
    const xs = rows.map((r, i) => lane(r, i % 2 === 0));
    const top = rows[0][0].t;
    const w: W[] = [[hd[0], hd[1]], [(hd[0] + xs[0]) / 2, hd[1] + (top - 44 - hd[1]) * 0.5, 120], [xs[0], top - 44, 60]];
    // One S-shaped descent along a lane: x swings out and back in, so no stretch of the route is a straight drop.
    const descend = (x: number, y0: number, y1: number, dir: number) => {
      const n = Math.max(1, Math.round((y1 - y0) / 30));
      for (let s = 1; s < n; s++) w.push([x + dir * amp * Math.sin((2 * Math.PI * s) / n), y0 + ((y1 - y0) * s) / n, 14]);
    };
    rows.forEach((r, i) => {
      const bottom = Math.max(...r.map((c) => c.b));
      const from = i === 0 ? top - 44 : (Math.max(...rows[i - 1].map((c) => c.b)) + r[0].t) / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      if (i < rows.length - 1) {
        const gap = (bottom + rows[i + 1][0].t) / 2; // through the middle of the gap, never over a card
        descend(xs[i], from, gap, dir);
        const rad = roomy ? 60 : 16;
        w.push([xs[i], gap, rad], [xs[i + 1], gap, rad]);
      } else {
        descend(xs[i], from, bottom + 40, dir);
        w.push([xs[i], bottom + 40, 60]);
      }
    });
    const a0 = ain[0];
    w.push([a0[0], a0[1] - 60, 90], [a0[0], a0[1]]);
    const toPen = [...hero, ...rounded(w).slice(1), ...ain.slice(1)];
    // Over the board while the diagram is written, to the spot where the plane pins.
    const keep: [number, number] | undefined = roomy ? undefined : [top - 44, Math.max(...rects.map((c) => c.b)) + 40];
    const a = unvertical([...toPen, pin], keep);
    // Where along the smoothed route the hero stretch ends and the board begins.
    const lenTo = (pts: P[], at: P) => plen(pts.slice(0, 1 + pts.reduce((best, p, i) => (Math.hypot(p[0] - at[0], p[1] - at[1]) < Math.hypot(pts[best][0] - at[0], pts[best][1] - at[1]) ? i : best), 0)));
    heroFrac = lenTo(a, hd) / plen(a);

    // From the board, down past the easel, along the gap and onto the mailbox.
    const wy = layout(document.getElementById('contact') as HTMLElement).t - 70;
    const c0 = cin[0];
    const b = unvertical([pin, ...aout.slice(1), ...rounded([[envStart[0], envStart[1]], [envStart[0], wy, 90], [c0[0], wy, 90], [c0[0], c0[1]]]).slice(1), ...cin.slice(1), [mail.x, mail.y] as P]);

    routes.a.setAttribute('d', dstr(a));
    routes.b.setAttribute('d', dstr(b));
    // Trails stay undrawn until the plane is flying: a path with a fresh `d` would otherwise show in full.
    ['a', 'b'].forEach((id) => trails(id).forEach((t) => {
      t.setAttribute('d', routes[id].getAttribute('d')!);
      gsap.set(t, { drawSVG: '0% 0%' });
    }));

    cards = makeCards(els);
  };
  build();

  // The plane's transform is written by hand (the drawing is centred on its own 0,0); gsap only tweens these numbers.
  // flip = -1 mirrors the drawing when the plane travels left, so it never flies tail first or upside down.
  const pl = { x: 0, y: 0, rot: 0, scale: 1, flip: 1, heading: 0 };
  const apply = () => {
    planeG.setAttribute('transform', `translate(${pl.x.toFixed(1)} ${pl.y.toFixed(1)}) rotate(${pl.rot.toFixed(1)}) scale(${(pl.scale * pl.flip).toFixed(3)} ${pl.scale.toFixed(3)})`);
    Object.assign(planeG.dataset, { x: pl.x.toFixed(1), y: pl.y.toFixed(1), rot: pl.rot.toFixed(1), heading: pl.heading.toFixed(1) });
  };
  const place = (x: number, y: number, rot: number, scale: number, flip = 1, heading = rot) => {
    Object.assign(pl, { x, y, rot, scale, flip, heading });
    apply();
    planeG.style.opacity = '1';
  };

  // Reduced motion: final states only. Nothing flies; the envelope is already in the mailbox.
  if (reduce) {
    planeG.style.opacity = '0';
    return;
  }

  // ---- Flight state: intro (takeoff on load), scroll progress per stretch, trail lengths ----
  const st = { live: false, intro: 0, p: 0, s: 0, wa: TRAIL, wb: TRAIL, lock: false, blend: 1 };
  const pointAt = (path: SVGPathElement, frac: number) => {
    const L = path.getTotalLength();
    const f = Math.min(1, Math.max(0, frac));
    const p = path.getPointAtLength(L * f);
    const [lo, hi] = f > 0.99 ? [f - 0.01, f] : [f, f + 0.01];
    const q0 = path.getPointAtLength(L * Math.max(0, lo)), q1 = path.getPointAtLength(L * Math.min(1, hi));
    return { x: p.x, y: p.y, angle: (Math.atan2(q1.y - q0.y, q1.x - q0.x) * 180) / Math.PI };
  };
  const TAIL_PX = 16; // the trail starts at the plane's tail, not at its centre
  /** Trail behind the plane: the stretch it just flew, so it lies ahead on the route when the plane flies back. */
  const setTrail = (id: string, frac: number, width: number, back = false) => {
    const parts = trails(id);
    const tail = TAIL_PX / routes[id].getTotalLength();
    if (back) {
      const s = Math.min(1, frac + tail), e = Math.min(1, s + width), step = (e - s) / 3;
      // the strongest part (last in the list) stays next to the plane
      parts.forEach((t, i) => gsap.set(t, { drawSVG: step <= 0 ? '0% 0%' : `${(e - step * (i + 1)) * 100}% ${(e - step * i) * 100}%` }));
      return;
    }
    frac -= tail;
    const s = Math.max(0, frac - width), step = (frac - s) / 3;
    parts.forEach((t, i) => gsap.set(t, { drawSVG: frac <= 0.0005 || step <= 0 ? '0% 0%' : `${(s + step * i) * 100}% ${(s + step * (i + 1)) * 100}%` }));
  };
  // Direction of travel along the route: scrolling up (or the plane flying back to the hand) turns it around,
  // so it always flies nose first. Changes under half a pixel are ignored, so it never flickers.
  let back = false, lastTravel = -1;
  const travelling = (travel: number) => {
    if (lastTravel >= 0 && Math.abs(travel - lastTravel) > 0.5) back = travel < lastTravel;
    lastTravel = travel;
    return back;
  };
  const flightScale = () => (wide ? SCALE : SCALE_SMALL);
  const wrap = (a: number) => ((a + 540) % 360) - 180;
  let spin = 0; // smoothed heading so the nose does not snap at corners
  /** Glide look: the nose is shown between 25 degrees up and 45 down, mirrored for leftward travel, plus a small bank into turns. */
  const glide = (heading: number) => {
    const flip = Math.cos((heading * Math.PI) / 180) < -0.05 ? -1 : 1;
    const local = flip < 0 ? wrap(heading - 180) : wrap(heading);
    return { flip, rot: Math.min(45, Math.max(-25, local)) };
  };
  /** Nearest card within reach of the plane (edge distance, with a small bias to stay on the current one). */
  const nearest = (x: number, y: number) => {
    let best = -1, bd = reach;
    cards.forEach((c, i) => {
      // Cards still ahead of the plane (below it) win ties: crossing the gap, the row below takes over from the one above.
      const d = Math.hypot(Math.max(c.l - x, 0, x - c.r), Math.max(c.t - y, 0, y - c.b)) - (i === lit ? 3 : 0) - (c.t > y ? 6 : 0);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const setCard = (i: number, on: boolean) => {
    const c = cards[i];
    c.el.classList.toggle('plane-pass', on);
    gsap.to(c.ring, { drawSVG: on ? '100%' : '0%', duration: 0.5, ease: 'power2.out', overwrite: true });
  };
  const from = { x: 0, y: 0, rot: 0, scale: 1 }, target = { x: 0, y: 0 };
  const render = () => {
    if (!st.live || st.lock) return;
    // One continuous run: scroll progress maps linearly onto the arc length of route a followed by route b, so the plane
    // keeps the same speed from the hand to the mailbox (no change of pace between stretches).
    let aFrac = st.intro, pbFrac = 0;
    if (wide) {
      const la = routes.a.getTotalLength(), lb = routes.b.getTotalLength(), start = heroFrac * la;
      // intro blends from the hand (0) into the scroll-driven position (1), so scrolling during the windup never makes
      // the plane appear further down the route: it always leaves from the hand and catches up with the scroll.
      const dist = st.intro * (start + st.p * (la - start + lb));
      if (dist > la) [aFrac, pbFrac] = [1, (dist - la) / lb];
      else aFrac = dist / la;
    }
    const onB = pbFrac > 0.0001;
    const path = onB ? routes.b : routes.a;
    const pos = pointAt(path, onB ? pbFrac : aFrac);
    show('plane');
    planeG.setAttribute('data-phase', onB ? 'landing' : 'flying');
    const la = routes.a.getTotalLength();
    const rev = travelling(onB ? la + pbFrac * routes.b.getTotalLength() : aFrac * la);
    const turn = wrap((rev ? pos.angle + 180 : pos.angle) - spin);
    spin = wrap(spin + turn * 0.18);
    const g = glide(spin);
    const bank = Math.max(-10, Math.min(10, turn * 0.4)) * g.flip;
    // After the refold the plane eases from the mailbox pose (`from`) into its scroll position (blend 0 to 1).
    const m = st.blend;
    Object.assign(target, { x: pos.x, y: pos.y });
    place(from.x + (pos.x - from.x) * m, from.y + (pos.y - from.y) * m, from.rot + (g.rot + bank - from.rot) * m, from.scale + (flightScale() - from.scale) * m, g.flip, spin);
    if (!wide) return;
    if (m < 1) { setTrail('a', 0, 0); setTrail('b', 0, 0); return; }
    setTrail('a', onB ? 0 : aFrac, st.wa, rev && !onB);
    setTrail('b', onB ? pbFrac : 0, st.wb, rev && onB);
    // One card at a time: the one nearest the plane lifts 4 px and draws its border; it settles when the plane moves on.
    const next = onB ? -1 : nearest(pos.x, pos.y);
    if (next !== lit) {
      if (lit >= 0) setCard(lit, false);
      if (next >= 0) setCard(next, true);
      lit = next;
    }
  };

  // ---- Takeoff from the hand: the plane is live on the release tick, already in the open hand, and leaves fast ----
  const takeoff = () => {
    st.intro = 0;
    st.live = true;
    back = false;
    lastTravel = -1;
    spin = pointAt(routes.a, 0).angle; // already pointing where it will fly: no turn on the first frame
    render();
    gsap.to(st, {
      intro: 1,
      duration: wide ? 1.8 : 1.4,
      ease: 'power1.out', // thrown: fastest when it leaves the hand, then it settles into the glide
      overwrite: 'auto',
      onUpdate: render,
      onComplete: () => {
        if (!wide) {
          st.live = false; // off screen to the right: from here on the crossings own the plane
          renderSmall();
        }
      },
    });
  };
  launchFn = () => takeoff();
  recallFn = (done) => {
    launched = false;
    gsap.to(st, {
      intro: 0, duration: 1.1, ease: 'power1.inOut', overwrite: 'auto', onUpdate: render,
      onComplete: () => {
        st.live = false;
        planeG.style.opacity = '0';
        if (wide) { setTrail('a', 0, 0); setTrail('b', 0, 0); }
        done();
      },
    });
  };
  if (launched) takeoff(); // the scene was rebuilt (resize) after the throw

  // ---- Delivery: the plane unfolds into a sheet and refolds as the envelope (the envelope itself is contact.ts) ----
  const envScale = () => mail.w / 100; // the envelope fills 100 of the 124 drawing units
  let unfolding: gsap.core.Animation | null = null;
  hooks.unfold = (go) => {
    unfolding?.kill();
    st.lock = true;
    st.blend = 1;
    show('plane');
    const tl = (unfolding = gsap.timeline());
    if (!wide) {
      clearTrail();
      // Small screens: the last crossing. The plane glides in from the right edge and lands on the mailbox.
      const x0 = main.clientWidth + 60, y0 = mail.y - 150;
      const g = glide((Math.atan2(mail.y - y0, mail.x - x0) * 180) / Math.PI);
      Object.assign(pl, { x: x0, y: y0, rot: g.rot, scale: SCALE_SMALL, flip: g.flip, heading: 0 });
      apply();
      gsap.set(planeG, { opacity: 1 });
      tl.to(pl, { x: mail.x, y: mail.y, duration: 0.9, ease: 'sine.inOut', onUpdate: apply });
    }
    tl.to(pl, { rot: 0, scale: envScale(), flip: 1, x: mail.x, y: mail.y, duration: 0.2, ease: 'power2.out', onUpdate: apply });
    FRAMES.forEach((f, i) => tl.add(() => show(f), `>${i ? 0.11 : 0}`));
    tl.to({}, { duration: 0.11 })
      .add(() => {
        gsap.set(planeG, { opacity: 0 });
        go();
      });
    // No trail survives the delivery: render() is locked now, so clear every trail here.
    if (wide) {
      setTrail('a', 0, 0);
      setTrail('b', 0, 0);
    }
  };
  // Back up from the mailbox: the envelope has left the slot; it folds back into the plane (the frames in reverse) and the
  // plane flies on: desktop eases into its scroll position, small screens glide out through the right edge.
  hooks.refold = () => {
    unfolding?.kill();
    st.lock = true;
    st.wb = TRAIL;
    Object.assign(pl, { x: mail.x, y: mail.y, rot: 0, scale: envScale(), flip: 1, heading: 0 });
    apply();
    show('fold-2');
    gsap.set(planeG, { opacity: 1 });
    const tl = (unfolding = gsap.timeline());
    [...FRAMES].reverse().slice(1).forEach((f) => tl.add(() => show(f), '>0.07'));
    tl.add(() => show('plane'), '>0.07');
    if (wide) {
      tl.add(() => {
        Object.assign(from, { x: pl.x, y: pl.y, rot: pl.rot, scale: pl.scale });
        st.blend = 0;
        st.lock = false;
        render();
        // the farther the scroll position, the longer the catch-up, so the plane never darts across the page
        const duration = Math.min(0.8, Math.max(0.25, Math.hypot(target.x - from.x, target.y - from.y) / 1600));
        unfolding = gsap.to(st, { blend: 1, duration, ease: 'power2.inOut', onUpdate: render });
      });
    } else {
      clearTrail();
      const x0 = main.clientWidth + 60, y0 = mail.y - 150;
      const g = glide((Math.atan2(y0 - mail.y, x0 - mail.x) * 180) / Math.PI);
      tl.to(pl, { rot: g.rot, scale: SCALE_SMALL, flip: g.flip, duration: 0.12, ease: 'power2.out', onUpdate: apply });
      tl.to(pl, { x: x0, y: y0, duration: 0.6, ease: 'sine.inOut', onUpdate: apply });
      tl.add(() => {
        gsap.set(planeG, { opacity: 0 });
        st.lock = false;
        renderSmall();
      });
    }
  };
  hooks.reset = () => {
    unfolding?.kill();
    st.lock = false;
    st.blend = 1;
    st.wb = TRAIL;
    show('plane'); // the unfold may have been cut mid-frame
    if (wide) render();
    else gsap.set(planeG, { opacity: 0 });
  };

  const mainTop = () => main.getBoundingClientRect().top + window.scrollY;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

  // ---- Crossings (below 1024 px): each one flies the plane edge to edge while its gap scrolls from 85 % to 30 % ----
  let crossBack = false, lastKey = -1;
  // Short trail of a crossing: the last ~120 px the plane flew, sampled every 4 px, in three strokes (the strongest at the plane).
  const TRAIL_SMALL = 120;
  let hist: P[] = [], histCross: (typeof crossings)[number] | undefined;
  const writeTrail = () => {
    const parts = trails('m'), n = hist.length;
    parts.forEach((t, i) => t.setAttribute('d', n < 2 ? '' : dstr(hist.slice(Math.floor(((n - 1) * i) / 3), Math.floor(((n - 1) * (i + 1)) / 3) + 1))));
  };
  const clearTrail = () => {
    hist = [];
    writeTrail();
  };
  function renderSmall() {
    if (wide || st.lock || st.live) return; // the throw or the delivery own the plane
    const vh = innerHeight, sy = st.s * maxScroll(), W = main.clientWidth;
    // A gap already on screen at the top of the page starts its crossing at scroll 0, from the edge, not halfway.
    const qOf = (k: (typeof crossings)[number]) => (sy - Math.max(0, mainTop() + k.y - vh * 0.85)) / (vh * 0.55);
    // Nothing crosses before Lucas throws the plane.
    const c = launched ? crossings.find((k) => qOf(k) > 0 && qOf(k) < 1) : undefined;
    const lightNext = (n: number) => {
      if (n === lit) return;
      if (lit >= 0) setCard(lit, false);
      if (n >= 0) setCard(n, true);
      lit = n;
    };
    if (!c) {
      planeG.style.opacity = '0';
      lightNext(-1);
      lastKey = -1;
      if (hist.length) clearTrail();
      return;
    }
    const q = qOf(c);
    const x0 = c.dir < 0 ? W + 50 : -50, x1 = c.dir < 0 ? -50 : W + 50;
    const drop = Math.max(10, Math.min(56, c.h - 22)); // gentle descent, never more than the gap allows
    const x = x0 + (x1 - x0) * q, y = c.y - drop / 2 + drop * q + Math.sin(Math.PI * q) * Math.min(14, c.h / 5) * -1;
    const dy = drop - Math.cos(Math.PI * q) * Math.PI * Math.min(14, c.h / 5);
    // Scrolling up runs the crossing backwards: the plane turns around and flies nose first the other way.
    const key = crossings.indexOf(c) + q;
    const wasBack = crossBack;
    if (lastKey >= 0 && Math.abs(key - lastKey) > 0.002) crossBack = key < lastKey;
    lastKey = key;
    // A new crossing or a turn-around starts a fresh trail: it only shows ground the plane just covered.
    if (c !== histCross || crossBack !== wasBack) hist = [];
    histCross = c;
    const tip = hist.at(-1);
    if (!tip || Math.hypot(x - tip[0], y - tip[1]) >= 4) hist.push([x, y]);
    while (hist.length > 2 && plen(hist) > TRAIL_SMALL) hist.shift();
    writeTrail();
    const g = glide((Math.atan2(crossBack ? -dy : dy, crossBack ? x0 - x1 : x1 - x0) * 180) / Math.PI);
    place(x, y, g.rot, SCALE_SMALL, g.flip, g.rot);
    planeG.setAttribute('data-phase', 'crossing');
    // The card of the row below that the plane is passing over lights up.
    const below = c.row.reduce((best, i) => (best < 0 || Math.abs((cards[i].l + cards[i].r) / 2 - x) < Math.abs((cards[best].l + cards[best].r) / 2 - x) ? i : best), -1);
    lightNext(q > 0.08 && q < 0.95 ? below : -1);
  }
  if (!wide) {
    gsap.to(st, { s: 1, ease: 'none', onUpdate: renderSmall, scrollTrigger: { start: 0, end: 'max', scrub: 0.5, invalidateOnRefresh: true } });
  }

  // Rebuild on layout changes (fonts, images, resize) on every screen size.
  let t: number | undefined;
  const rebuild = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      build();
      ScrollTrigger.refresh();
      wide ? render() : renderSmall();
    }, 200);
  };
  new ResizeObserver(rebuild).observe(main);
  document.fonts?.ready.then(rebuild);
  window.addEventListener('load', rebuild, { once: true });

  if (!wide) return;

  // ---- Scroll-driven stretches (wide screens) ----
  const at = (p: P, frac: number) => Math.min(maxScroll(), Math.max(0, mainTop() + p[1] - innerHeight * frac));
  const s2 = () => at(envStart, 0.45);
  const s3 = () => Math.max(s2() + 320, at([mail.x, mail.y], 0.5));
  let delivered = false;
  gsap.to(st, {
    p: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: {
      start: 0,
      end: s3,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress > 0.995 && !delivered) setDelivered((delivered = true));
        else if (self.progress < 0.97 && delivered) setDelivered((delivered = false));
      },
    },
  });

}
