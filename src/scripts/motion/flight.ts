// Paper plane flight: leaves the laptop, weaves between the project cards, pins to the board while the diagram is
// written, takes off again and lands on the mailbox, where contact.ts folds it into the envelope.
// The plane is positioned from the route path (getPointAtLength), so no MotionPath plugin is needed.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionContext } from './index';
import { setSketch } from './about';
import { hooks, setDelivered } from './contact';
import { $, $$, visibleScene } from './util';

type P = [number, number];
type W = [number, number, number?]; // waypoint with an optional corner radius

const TRAIL = 0.1; // visible trail: share of the route behind the plane
const SCALE = 0.58; // plane drawing is 124 units wide: about 72 px on screen
const SCALE_SMALL = 0.5; // about 62 px below 1024 px
const PIN_SCALE = 0.6;
const FRAMES = ['unfold-1', 'unfold-2', 'sheet', 'fold-1', 'fold-2'];

let launchFn: (() => void) | null = null;
let launched = false;
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
  hooks.unfold = hooks.reset = null;
  if (!svg) return;
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  const main = svg.parentElement!;
  const planeG = $<SVGGElement>(svg, '[data-plane]')!;
  const frames = Object.fromEntries($$<SVGGElement>(svg, '[data-frame]').map((f) => [f.dataset.frame!, f]));
  const show = (name: string) => Object.entries(frames).forEach(([k, f]) => (f.style.display = k === name ? '' : 'none'));
  const routes = Object.fromEntries($$<SVGPathElement>(svg, '[data-flight-route]').map((p) => [p.dataset.flightRoute!, p]));
  const trails = (k: string) => $$<SVGPathElement>(svg, `[data-trail="${k}"]`);
  const flash = $(svg, '[data-flash]')!;
  const ringBox = $(svg, '[data-ring]')!;

  // Layout positions that ignore transforms (cards and scenes fade in with a translate), relative to <main>.
  const layout = (el: HTMLElement) => {
    let x = 0, y = 0, n: HTMLElement | null = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight, r: x + el.offsetWidth, b: y + el.offsetHeight };
  };
  const sceneScale = (scene: SVGSVGElement) => layout(scene.parentElement as HTMLElement).w / scene.viewBox.baseVal.width;
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

  let pin: P = [0, 0], penAt: P = [0, 0], envStart: P = [0, 0], mail = { x: 0, y: 0, w: 0 };
  let heroFrac = 1, penFrac = 0.5;
  let cards: { el: HTMLElement; ring: SVGRectElement; l: number; r: number; t: number; b: number }[] = [];
  let reach = 60; // how close the plane must be to a card (px from its edge) to light it
  let lit = -1; // index of the one card lit right now

  const build = () => {
    const hero = route(visibleScene('hero'), 'hero');
    const ain = route(visibleScene('about'), 'about-in');
    const aout = route(visibleScene('about'), 'about-out');
    const cin = route(visibleScene('contact'), 'contact');
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
    penAt = ain.at(-1)!;
    envStart = aout[0];

    cards.forEach((c) => {
      c.ring.remove();
      c.el.classList.remove('plane-pass');
    });
    cards = [];
    lit = -1;
    if (!wide || reduce) {
      routes.a.setAttribute('d', dstr(hero));
      heroFrac = 1;
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
      const from = i === 0 ? top - 44 : r[0].t - 5;
      const dir = i % 2 === 0 ? 1 : -1;
      if (i < rows.length - 1) {
        const gap = rows[i + 1][0].t - 5; // hugs the next row so its cards light one after another as the plane crosses
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
    penFrac = lenTo(a, ain.at(-1)!) / plen(a);

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

    // Card rings sit just outside each card (the cards cover everything inside them).
    cards = els.map((el, i) => {
      const r = rects[i];
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      ring.setAttribute('x', String(r.l - 4)); ring.setAttribute('y', String(r.t - 4));
      ring.setAttribute('width', String(r.w + 8)); ring.setAttribute('height', String(r.h + 8));
      ring.setAttribute('rx', '36');
      ringBox.appendChild(ring);
      gsap.set(ring, { drawSVG: '0%' });
      return { el, ring, l: r.l, r: r.r, t: r.t, b: r.b };
    });
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

  // Reduced motion: final states only. The plane stays pinned to the board and nothing flies.
  if (reduce) {
    show('pinned');
    place(pin[0], pin[1], 0, PIN_SCALE);
    return;
  }

  // ---- Flight state: intro (takeoff on load), scroll progress per stretch, trail lengths ----
  const st = { live: false, intro: 0, p1: 0, p2: 0, pb: 0, wa: TRAIL, wb: TRAIL, lock: false, pinned: false };
  const pointAt = (path: SVGPathElement, frac: number) => {
    const L = path.getTotalLength();
    const f = Math.min(1, Math.max(0, frac));
    const p = path.getPointAtLength(L * f);
    const [lo, hi] = f > 0.99 ? [f - 0.01, f] : [f, f + 0.01];
    const q0 = path.getPointAtLength(L * Math.max(0, lo)), q1 = path.getPointAtLength(L * Math.min(1, hi));
    return { x: p.x, y: p.y, angle: (Math.atan2(q1.y - q0.y, q1.x - q0.x) * 180) / Math.PI };
  };
  const TAIL_PX = 16; // the trail starts at the plane's tail, not at its centre
  const setTrail = (id: string, frac: number, width: number) => {
    const parts = trails(id);
    frac -= TAIL_PX / routes[id].getTotalLength();
    const s = Math.max(0, frac - width), step = (frac - s) / 3;
    parts.forEach((t, i) => gsap.set(t, { drawSVG: frac <= 0.0005 || step <= 0 ? '0% 0%' : `${(s + step * i) * 100}% ${(s + step * (i + 1)) * 100}%` }));
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
      const d = Math.hypot(Math.max(c.l - x, 0, x - c.r), Math.max(c.t - y, 0, y - c.b)) - (i === lit ? 3 : 0);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const setCard = (i: number, on: boolean) => {
    const c = cards[i];
    c.el.classList.toggle('plane-pass', on);
    gsap.to(c.ring, { drawSVG: on ? '100%' : '0%', duration: 0.5, ease: 'power2.out', overwrite: true });
  };
  const render = () => {
    if (!st.live || st.lock) return;
    const aFrac = !wide ? st.intro : st.p2 > 0 ? penFrac + (1 - penFrac) * st.p2 : Math.max(st.intro, penFrac * st.p1);
    const onB = st.pb > 0.0001;
    const path = onB ? routes.b : routes.a;
    const pos = pointAt(path, onB ? st.pb : aFrac);
    const pinned = !onB && wide && st.p2 >= 0.995;
    if (pinned !== st.pinned) {
      st.pinned = pinned;
      gsap.to(st, { wa: pinned ? 0 : TRAIL, duration: pinned ? 0.8 : 0.2, onUpdate: render });
      if (pinned) gsap.fromTo(frames.pinned, { scale: 1.18, svgOrigin: '64 14' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    }
    show(pinned ? 'pinned' : 'plane');
    planeG.setAttribute('data-phase', pinned ? 'pinned' : onB ? 'landing' : 'flying');
    const turn = wrap(pos.angle - spin);
    spin = wrap(spin + turn * 0.18);
    if (pinned) place(pin[0], pin[1], 0, PIN_SCALE);
    else {
      const g = glide(spin);
      const bank = Math.max(-10, Math.min(10, turn * 0.4)) * g.flip;
      place(pos.x, pos.y, g.rot + bank, flightScale(), g.flip, spin);
    }
    if (!wide) return;
    setTrail('a', onB ? 0 : aFrac, st.wa);
    setTrail('b', onB ? st.pb : 0, st.wb);
    // One card at a time: the one nearest the plane lifts 4 px and draws its border; it settles when the plane moves on.
    const next = onB || pinned ? -1 : nearest(pos.x, pos.y);
    if (next !== lit) {
      if (lit >= 0) setCard(lit, false);
      if (next >= 0) setCard(next, true);
      lit = next;
    }
  };

  // ---- Takeoff from the hand (flash, then fly the hero stretch) ----
  const takeoff = () => {
    const hero = routes.a.getPointAtLength(0);
    gsap.set(flash, { x: hero.x, y: hero.y, transformOrigin: '0 0' });
    gsap.timeline()
      .fromTo(flash, { opacity: 1, scale: 0.4 }, { opacity: 0, scale: 1.6, duration: 0.55, ease: 'power2.out' })
      .add(() => {
        st.live = true;
        render();
      }, 0.25)
      .to(st, {
        intro: heroFrac,
        duration: 1.5,
        ease: 'power1.inOut',
        onUpdate: render,
        onComplete: () => {
          if (!wide) gsap.to(planeG, { opacity: 0, duration: 0.4 }); // off frame; the contact scene brings it back
        },
      }, 0.3);
  };
  launchFn = () => takeoff();
  if (launched) takeoff(); // the scene was rebuilt (resize) after the throw

  // ---- Delivery: the plane unfolds into a sheet and refolds as the envelope (the envelope itself is contact.ts) ----
  const envScale = () => mail.w / 100; // the envelope fills 100 of the 124 drawing units
  let unfolding: gsap.core.Timeline | null = null;
  hooks.unfold = (go) => {
    unfolding?.kill();
    st.lock = true;
    show('plane');
    const tl = (unfolding = gsap.timeline());
    if (!wide) {
      // Small screens: no long flight; the plane glides in above the mailbox and drops onto it.
      Object.assign(pl, { x: mail.x, y: mail.y - mail.w * 1.4, rot: 45, scale: SCALE_SMALL, flip: 1, heading: 45 });
      apply();
      gsap.set(planeG, { opacity: 0 });
      tl.to(planeG, { opacity: 1, duration: 0.2 }).to(pl, { y: mail.y, duration: 0.5, ease: 'power2.inOut', onUpdate: apply }, '<');
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
  hooks.reset = () => {
    unfolding?.kill();
    st.lock = false;
    st.wb = TRAIL;
    if (wide) render();
    else gsap.set(planeG, { opacity: 0 });
  };

  if (!wide) return;

  // ---- Scroll-driven stretches (wide screens) ----
  const mainTop = () => main.getBoundingClientRect().top + window.scrollY;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const at = (p: P, frac: number) => Math.min(maxScroll(), Math.max(0, mainTop() + p[1] - innerHeight * frac));
  const s1 = () => at(penAt, 0.55);
  const s2 = () => Math.max(s1() + 120, at(envStart, 0.45));
  const s2d = () => s2() + 140; // the plane stays pinned for this much scroll
  const s3 = () => Math.max(s2d() + 160, at([mail.x, mail.y], 0.5));
  const scrub = { scrub: 0.6, invalidateOnRefresh: true };
  gsap.to(st, { p1: 1, ease: 'none', onUpdate: render, scrollTrigger: { start: 0, end: s1, ...scrub } });
  gsap.fromTo(st, { p2: 0 }, { p2: 1, ease: 'none', immediateRender: false, onUpdate: render, scrollTrigger: { start: s1, end: s2, ...scrub } });
  // The board writes itself between s1 and s2, the same stretch the plane glides over it.
  ScrollTrigger.create({ start: s1, end: s2, scrub: 0.6, invalidateOnRefresh: true, onUpdate: (self) => setSketch(self.progress) });
  let delivered = false;
  gsap.fromTo(st, { pb: 0 }, {
    pb: 1,
    ease: 'none',
    immediateRender: false,
    onUpdate: render,
    scrollTrigger: {
      start: s2d,
      end: s3,
      ...scrub,
      onUpdate: (self) => {
        if (self.progress > 0.995 && !delivered) setDelivered((delivered = true));
        else if (self.progress < 0.97 && delivered) setDelivered((delivered = false));
      },
    },
  });

  let t: number | undefined;
  const rebuild = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      build();
      ScrollTrigger.refresh();
      render();
    }, 200);
  };
  new ResizeObserver(rebuild).observe(main);
  document.fonts?.ready.then(rebuild);
  window.addEventListener('load', rebuild, { once: true });
}
