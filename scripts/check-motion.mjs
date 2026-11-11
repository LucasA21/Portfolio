// Motion checks for the paper plane flight and the scene animations. Starts the dev server, drives Chromium, exits 1 on failure.
// Run: pnpm check:motion  (needs Chromium at /usr/bin/chromium or CHROMIUM_PATH)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4400;
const URL = `http://localhost:${PORT}/`;
const server = spawn('pnpm', ['astro', 'dev', '--port', String(PORT)], { stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-server.pid); } catch {} };
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(URL)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

const results = [];
async function test(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return; // ONLY=entrega runs just the matching tests
  try { await fn(); results.push([name, 'ok']); }
  catch (e) { results.push([name, `FAIL: ${e.message}`]); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await waitForServer();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = async (opts = {}) => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle' });
  return p;
};
const scrollTo = async (p, y) => { await p.evaluate((y) => scrollTo(0, y === 'max' ? document.documentElement.scrollHeight : y), y); await sleep(1400); };
const drawn = (p, sel) => p.evaluate((sel) => {
  const el = document.querySelector(sel); const dash = getComputedStyle(el).strokeDasharray;
  return dash === 'none' ? 1 : parseFloat(dash) / el.getTotalLength();
}, sel);

// Warm up Vite's dependency optimizer so the first real test does not hit a reload.
await (await page()).close();

await test('sin-js', async () => {
  const p = await page({ javaScriptEnabled: false });
  const hidden = await p.evaluate(() => [...document.querySelectorAll('.fade-up, .fade-up-bottom, h1, [data-ink]')]
    .filter((e) => getComputedStyle(e).opacity !== '1' || getComputedStyle(e).visibility !== 'visible').length);
  assert(hidden === 0, `${hidden} elements hidden without JS`);
  await p.close();
});

await test('reduced-motion', async () => {
  const p = await page({ reducedMotion: 'reduce' });
  await scrollTo(p, 'max');
  const r = await p.evaluate(() => ({
    plane: (() => { const g = document.querySelector('[data-plane]'); const f = g.querySelector('[data-frame]:not([style*="none"])'); return { frame: f?.dataset.frame, opacity: g.style.opacity }; })(),
    flag: document.querySelector('[data-scene="contact"] [data-flag]')?.getAttribute('transform') ?? 'none',
    delivered: document.querySelector('[data-scene="contact"]').dataset.delivered,
    running: document.querySelectorAll('[data-motion="running"]').length,
    cssLoops: document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length,
  }));
  assert(r.plane.opacity === '0', `plane visible under reduced motion: ${JSON.stringify(r.plane)}`);
  assert(!/rotate\(9|matrix\(0/.test(r.flag), `flag not up: ${r.flag}`);
  assert(r.delivered === 'true', 'envelope not delivered');
  assert(r.running === 0 && r.cssLoops === 0, `loops running: ${r.running} gsap scenes, ${r.cssLoops} css`);
  await p.close();
});

// Hero by frames: which drawing of each piece is visible right now.
const heroFrames = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-scene="hero"] [data-piece]')].map((g) => [
  g.dataset.piece, [...g.querySelectorAll(':scope > [data-frame]')].filter((f) => f.getAttribute('visibility') !== 'hidden').map((f) => f.dataset.frame),
])));
const REST_POSE = { base: ['base'], 'base-patch': [], 'arm-r': [], 'plane-in-hand': [], 'arm-l': ['typing'], head: ['front'], eyes: ['open'] };
const sameFrames = (a, b) => JSON.stringify(Object.keys(b).map((k) => a[k]?.slice().sort())) === JSON.stringify(Object.keys(b).map((k) => b[k]));

await test('hero-fotogramas', async () => {
  const p = await page();
  const f = await heroFrames(p);
  assert(Object.values(f).every((v) => v.length <= 1), `more than one frame visible in a piece: ${JSON.stringify(f)}`);
  assert(f['arm-r'].length === 0 && f['plane-in-hand'].length === 0, 'right arm visible at rest');
  await p.close();
});

await test('hero-tipeo', async () => {
  const p = await page();
  let changes = 0, last = '';
  for (let t = 0; t < 2000; t += 50) {
    const cur = (await heroFrames(p))['arm-l'][0];
    if (cur !== last) changes++;
    last = cur;
    await sleep(50);
  }
  assert(changes >= 4 && changes <= 26, `left arm changed frame ${changes} times in 2 s`);
  await p.close();
});

await test('hero-parpadeo', async () => {
  const p = await page();
  const closed = [];
  const t0 = Date.now();
  let was = false;
  while (Date.now() - t0 < 14000) {
    const now = (await heroFrames(p)).eyes[0] === 'closed';
    if (now && !was) closed.push(Date.now() - t0);
    was = now;
    await sleep(30);
  }
  const gaps = closed.slice(1).map((t, i) => t - closed[i]);
  assert(closed.length >= 2 && gaps.every((g) => g > 2700 && g < 6500), `blink gaps (ms): ${gaps}`);
  await p.close();
});

await test('hero-sin-avion-en-reposo', async () => {
  const p = await page();
  await sleep(1500);
  assert(Number(await p.evaluate(() => document.querySelector('[data-plane]').style.opacity || 0)) === 0, 'plane visible before the throw');
  assert(await p.getAttribute('[data-scene="hero"]', 'data-throw') === null, 'throw started without scroll');
  await p.close();
});

await test('hero-lanzamiento', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40);
  const seen = [];
  for (let t = 0; t < 2600; t += 50) {
    const f = await heroFrames(p);
    const key = `${f['arm-r'][0] ?? '-'}|${f['plane-in-hand'][0] ?? '-'}|${f.head[0]}|${f['arm-l'][0]}`;
    if (!seen.length || seen.at(-1).split('|').slice(0, 3).join() !== key.split('|').slice(0, 3).join()) seen.push(key);
    await sleep(50);
  }
  const arm = seen.map((k) => k.split('|')[0]);
  assert(JSON.stringify(arm) === JSON.stringify(['windup', 'release', '-']) || JSON.stringify(arm.filter((a, i) => a !== arm[i - 1])) === JSON.stringify(['-', 'windup', 'release', '-']),
    `arm sequence: ${arm}`);
  assert(seen.some((k) => k.startsWith('windup|windup')), 'plane not in hand during the windup');
  assert(seen.every((k) => !k.startsWith('release|windup')), 'plane still in hand after the release');
  assert(seen.some((k) => k.split('|')[2] === 'look-up') && seen.at(-1).split('|')[2] === 'front', 'head did not look up and come back');
  assert(await p.evaluate(() => getComputedStyle(document.querySelector('[data-plane]')).opacity) !== '0', 'plane did not take off');
  const typingWhile = seen.filter((k) => k.split('|')[0] !== '-' ).length;
  assert(typingWhile > 0, 'no throw frames');
  await p.close();
});

await test('hero-despega-de-la-mano', async () => {
  const p = await page();
  // Keep scrolling through the windup, like a real wheel: the plane must still leave from the hand.
  await p.mouse.wheel(0, 40);
  await p.evaluate(async () => { for (let k = 0; k < 6; k++) { scrollBy(0, 30); await new Promise((r) => setTimeout(r, 60)); } });
  await p.waitForFunction(() => +document.querySelector('[data-plane]').style.opacity > 0.5, null, { timeout: 4000 });
  const d = await p.evaluate(() => {
    const g = document.querySelector('[data-plane]').getBoundingClientRect();
    // The open hand of the release frame: its top right corner, where the fingers are.
    const hand = document.querySelector('[data-scene="hero"] [data-piece="arm-r"] [data-frame="release"]').getBoundingClientRect();
    return { px: g.x + g.width / 2, py: g.y + g.height / 2, hx: hand.right - hand.width * 0.12, hy: hand.top + hand.height * 0.08, release: document.querySelector('[data-scene="hero"] [data-piece="arm-r"] [data-frame="release"]').getAttribute('visibility') };
  });
  const dist = Math.round(Math.hypot(d.px - d.hx, d.py - d.hy));
  assert(d.release === 'visible', 'the plane showed up before the release frame');
  assert(dist < 60, `plane appears ${dist} px from the open hand`);
  await p.close();
});

await test('hero-vuelve-a-agarrar', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40);
  await sleep(3000);
  await p.evaluate(() => scrollTo(0, 0));
  // The plane flies back (about 1.1 s) and the hand catches it: windup with the plane, typing paused.
  let held = false;
  for (let t = 0; t < 3000 && !held; t += 100) {
    const f = await heroFrames(p);
    held = f['arm-r'][0] === 'windup' && f['plane-in-hand'][0] === 'windup';
    await sleep(100);
  }
  assert(held, 'hand did not catch the plane after scrolling back up');
  assert(await p.getAttribute('[data-scene="hero"]', 'data-throw') === 'held', 'not in the held state');
  const a = (await heroFrames(p))['arm-l'][0];
  await sleep(600);
  assert((await heroFrames(p))['arm-l'][0] === a, 'typing while the arm is raised');
  assert(Number(await p.evaluate(() => document.querySelector('[data-plane]').style.opacity)) === 0, 'flying plane visible while held');
  // Scroll down again: the same throw repeats.
  await p.mouse.wheel(0, 40);
  let released = false, flying = false;
  for (let t = 0; t < 3000 && !(released && flying); t += 100) {
    released ||= (await heroFrames(p))['arm-r'][0] === 'release';
    flying ||= Number(await p.evaluate(() => document.querySelector('[data-plane]').style.opacity)) > 0.5;
    await sleep(100);
  }
  assert(released && flying, `second throw: released=${released} flying=${flying}`);
  await sleep(1800);
  assert((await heroFrames(p))['arm-r'].length === 0, 'arm did not go back down');
  await p.close();
});

await test('hero-pausa', async () => {
  const p = await page();
  await scrollTo(p, 'max');
  assert(await p.getAttribute('[data-scene="hero"]', 'data-motion') === 'paused', 'hero loop still running off screen');
  await p.close();
});

await test('hero-reduced', async () => {
  const p = await page({ reducedMotion: 'reduce' });
  const a = await heroFrames(p);
  await sleep(3000);
  await p.mouse.wheel(0, 40);
  await sleep(500);
  const b = await heroFrames(p);
  assert(JSON.stringify(a) === JSON.stringify(b), 'frames changed under reduced motion');
  assert(sameFrames(b, REST_POSE), `not the rest pose: ${JSON.stringify(b)}`);
  await p.close();
});

for (const w of [390, 820]) await test(`hero-mobile-${w}`, async () => {
  const p = await page({ viewport: { width: w, height: 800 } });
  await p.waitForFunction(() => document.querySelector('[data-scene="hero"]').dataset.throw === 'away', null, { timeout: 8000 });
  const f = await heroFrames(p);
  assert(sameFrames(f, { ...REST_POSE, 'arm-l': f['arm-l'] }) , `did not return to rest: ${JSON.stringify(f)}`);
  await p.close();
});

const plane = (p) => p.evaluate(() => {
  const g = document.querySelector('[data-plane]');
  return { x: +g.dataset.x, y: +g.dataset.y, rot: +g.dataset.rot, opacity: +g.style.opacity, phase: g.dataset.phase };
});
const atFrac = async (p, f) => { await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(1600); };

await test('vuelo-progreso', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40);
  await sleep(3200); // the throw starts with the first scroll; the plane leaves the hand
  const ys = [];
  for (const f of [0, 0.3, 0.6, 1]) { await atFrac(p, f); ys.push((await plane(p)).y); }
  assert(ys.every((y, i) => i === 0 || y >= ys[i - 1] - 1), `plane does not advance with the scroll: ${ys}`);
  const mail = await p.evaluate(() => { const b = document.querySelector('[data-scene="contact"] [data-envelope-body]').getBoundingClientRect(); return b.top + b.height / 2 + scrollY - document.querySelector('main').getBoundingClientRect().top - scrollY; });
  assert(ys.at(-1) > 0, 'plane never took off');
  await p.close();
});

await test('avion-orientacion', async () => {
  const p = await page();
  await sleep(2500);
  for (const f of [0.15, 0.3, 0.45]) {
    await atFrac(p, f);
    const r = await p.evaluate(() => {
      const g = document.querySelector('[data-plane]');
      if (g.dataset.phase !== 'flying') return null;
      const route = document.querySelector('[data-flight-route="a"]'); const L = route.getTotalLength();
      const x = +g.dataset.x, y = +g.dataset.y; let best = 0, bd = 1e9;
      for (let s = 0; s <= L; s += 2) { const q = route.getPointAtLength(s); const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = s; } }
      const a = route.getPointAtLength(Math.max(0, best - 6)), b = route.getPointAtLength(Math.min(L, best + 6));
      const tan = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      // The flight reads the heading over 1 % of the route (the lookahead the nose follows), so at a corner that tangent is the right one too.
      const w = L * 0.01, a2 = route.getPointAtLength(Math.max(0, best - w)), b2 = route.getPointAtLength(Math.min(L, best + w));
      const tan2 = Math.atan2(b2.y - a2.y, b2.x - a2.x) * 180 / Math.PI;
      const off = (t) => Math.abs(((+g.dataset.heading - t + 540) % 360) - 180);
      return { off: bd, diff: Math.min(off(tan), off(tan2)) };
    });
    if (!r) continue;
    assert(r.off < 4, `plane is ${r.off}px off the route`);
    assert(r.diff < 25, `nose points ${r.diff} degrees away from the heading at ${f} (${JSON.stringify(r)})`);
    // The drawn plane must sit on the route too, with its trail behind it (not beside it).
    const seen = await p.evaluate(() => {
      const g = document.querySelector('[data-plane]'); const box = g.getBoundingClientRect(); const svg = document.querySelector('[data-thread]').getBoundingClientRect();
      return { dx: box.left + box.width / 2 - svg.left - +g.dataset.x, dy: box.top + box.height / 2 - svg.top - +g.dataset.y };
    });
    assert(Math.hypot(seen.dx, seen.dy) < 14, `drawn plane is ${Math.round(Math.hypot(seen.dx, seen.dy))}px away from its position on the route`);
  }
  await p.close();
});

await test('estela-acotada', async () => {
  const p = await page();
  await sleep(2500);
  for (const f of [0.1, 0.35, 0.55, 0.8]) {
    await atFrac(p, f);
    const share = await p.evaluate(() => [...document.querySelectorAll('[data-trail]')].reduce((n, t) => {
      const d = getComputedStyle(t).strokeDasharray; if (d === 'none') return n;
      return n + parseFloat(d) / t.getTotalLength();
    }, 0));
    assert(share <= 0.125, `trail covers ${(share * 100).toFixed(1)}% of the route at ${f}`);
  }
  await p.close();
});

await test('estela-en-la-carga', async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  // Sample from the first frames until the takeoff: the trail must never show as a full line.
  let worst = 0;
  for (let t = 0; t < 3500; t += 100) {
    worst = Math.max(worst, await p.evaluate(() => [...document.querySelectorAll('[data-trail]')].reduce((n, e) => {
      if (!e.getAttribute('d')) return n;
      const d = getComputedStyle(e).strokeDasharray;
      return n + (d === 'none' ? 1 : parseFloat(d) / e.getTotalLength());
    }, 0)));
    await sleep(100);
  }
  assert(worst <= 0.125, `trail showed ${(worst * 100).toFixed(0)}% of the route while loading`);
  await p.close();
});

await test('cards-elevacion', async () => {
  const p = await page();
  await sleep(2500);
  const lifted = new Set(); let max = 0;
  const total = await p.evaluate(() => document.querySelectorAll('.project-card, .project-featured').length);
  for (let f = 0.05; f < 0.7; f += 0.025) {
    await atFrac(p, f);
    const n = await p.evaluate(() => [...document.querySelectorAll('.project-card, .project-featured')].map((c, i) => c.classList.contains('plane-pass') ? i : -1).filter((i) => i >= 0));
    n.forEach((i) => lifted.add(i)); max = Math.max(max, n.length);
  }
  assert(lifted.size >= 1, 'no card was lifted by the plane');
  assert(max <= 1, `${max} cards lifted at once`);
  assert(lifted.size >= Math.min(total, 4), `only ${lifted.size} of ${total} cards lifted in turn`);
  await atFrac(p, 1);
  const stuck = await p.evaluate(() => document.querySelectorAll('.plane-pass').length);
  assert(stuck === 0, `${stuck} cards stayed lifted after the plane left`);
  const top = await p.evaluate(() => { const c = [...document.querySelectorAll('.project-card')].find((e) => e.offsetParent); return getComputedStyle(c).top; });
  assert(top === '0px', `card did not settle: top ${top}`);
  await p.close();
});

for (const w of [1440, 1920]) await test(`ruta-sin-verticales-${w}`, async () => {
  const p = await page({ viewport: { width: w, height: 900 } });
  const worst = await p.evaluate(() => {
    let worst = 0;
    for (const seg of document.querySelectorAll('[data-flight-route]')) {
      const L = seg.getTotalLength(); let run = 0, prev = seg.getPointAtLength(0);
      for (let s = 4; s <= L; s += 4) {
        const q = seg.getPointAtLength(s);
        const steep = Math.abs(q.y - prev.y) > 0 && Math.abs(q.x - prev.x) / Math.abs(q.y - prev.y) < 0.2; // within ~11 degrees of vertical
        run = steep ? run + Math.abs(q.y - prev.y) : 0; worst = Math.max(worst, run); prev = q;
      }
    }
    return Math.round(worst);
  });
  assert(worst <= 80, `route drops straight down for ${worst}px`);
  await p.close();
});

await test('avion-tamano', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40);
  await sleep(3200);
  const wpx = await p.evaluate(() => document.querySelector('[data-plane] [data-frame="plane"]').getBoundingClientRect().width);
  assert(wpx >= 56 && wpx <= 90, `plane is ${Math.round(wpx)}px wide`);
  await p.close();
});

await test('avion-sin-pin', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40);
  await sleep(3200);
  const top = await p.evaluate(() => document.getElementById('about').getBoundingClientRect().top + scrollY - 500);
  for (let y = top; y < top + 1400; y += 100) {
    await p.evaluate((y) => scrollTo(0, y), y); await sleep(500);
    const r = await plane(p);
    assert(r.phase !== 'pinned', `plane stopped on the board at ${y}`);
  }
  await p.close();
});

for (const w of [1024, 1440, 1920]) await test(`hilo-sin-texto-${w}`, async () => {
  const p = await page({ viewport: { width: w, height: 900 } });
  const hits = await p.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect();
    // Rectangles of the rendered text itself (a block heading is wider than its words).
    const texts = [...document.querySelectorAll('h1, h2, h3, p, a, button')]
      .filter((e) => !e.closest('.project-card') && e.offsetParent)
      .flatMap((e) => { const r = document.createRange(); r.selectNodeContents(e); return [...r.getClientRects()]; });
    const out = [];
    for (const seg of document.querySelectorAll('[data-flight-route]')) {
      const L = seg.getTotalLength();
      for (let s = 0; s <= L; s += 6) {
        const pt = seg.getPointAtLength(s); const x = pt.x + main.left, y = pt.y + main.top;
        const hit = texts.find((r) => x > r.left && x < r.right && y > r.top && y < r.bottom);
        if (hit) out.push([Math.round(x), Math.round(y + scrollY)]);
      }
    }
    return out;
  });
  assert(hits.length === 0, `thread crosses text at ${JSON.stringify(hits.slice(0, 5))}`);
  await p.close();
});

for (const w of [1024, 1440, 1920]) await test(`hilo-entre-cards-${w}`, async () => {
  const p = await page({ viewport: { width: w, height: 900 } });
  await scrollTo(p, 'max'); await scrollTo(p, 0);
  const hits = await p.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect();
    const rects = [...document.querySelectorAll('.project-card')].filter((c) => c.offsetParent).map((c) => c.getBoundingClientRect());
    const out = [];
    for (const seg of document.querySelectorAll('[data-flight-route]')) {
      const L = seg.getTotalLength();
      for (let s = 0; s <= L; s += 4) {
        const pt = seg.getPointAtLength(s); const x = pt.x + main.left, y = pt.y + main.top;
        if (rects.some((r) => x > r.left - 3 && x < r.right + 3 && y > r.top - 3 && y < r.bottom + 3)) out.push([Math.round(x), Math.round(y + scrollY)]);
      }
    }
    return out;
  });
  assert(hits.length === 0, `thread touches a card at ${JSON.stringify(hits.slice(0, 4))}`);
  await p.close();
});

await test('about-boceto', async () => {
  const p = await page();
  const sketch = '[data-scene="about"] mask [data-content]';
  // Right before the scene comes into view the diagram is still blank.
  await p.evaluate(() => scrollTo(0, document.querySelector('[data-scene="about"]').getBoundingClientRect().top + scrollY - innerHeight * 1.05));
  await sleep(1400);
  assert(await drawn(p, sketch) < 0.05, 'sketch drawn too early');
  await scrollTo(p, 'max'); await sleep(3000); // the board writes itself once it enters the view
  assert(await drawn(p, `${sketch}:last-of-type`) > 0.98, 'sketch not complete after Sobre mí');
  await p.close();
  const m = await page({ viewport: { width: 390, height: 844 }, isMobile: true });
  await m.evaluate(() => document.querySelector('[data-scene="about"]').scrollIntoView({ block: 'center' })); await sleep(5000);
  assert(await drawn(m, `${sketch}:last-of-type`) > 0.98, 'mobile sketch not complete');
  await m.close();
});

await test('about-boceto-repite', async () => {
  const p = await page();
  const sketch = '[data-scene="about"] mask [data-content]:last-of-type';
  await scrollTo(p, 'max'); await sleep(3500);
  assert(await drawn(p, sketch) > 0.98, 'sketch not drawn the first time');
  // Back to the top and down again: the board is written again from the start.
  await scrollTo(p, 0);
  await p.evaluate(() => document.querySelector('[data-scene="about"]').scrollIntoView({ block: 'center' }));
  await sleep(600);
  assert(await drawn(p, sketch) < 0.9, 'sketch did not restart when coming back');
  await sleep(3500);
  assert(await drawn(p, sketch) > 0.98, 'sketch not complete after the replay');
  await p.close();
});

await test('about-base-visible', async () => {
  const p = await page();
  await sleep(2500); // still at the top: the section is far below the viewport
  const open = await p.evaluate(() => [...document.querySelectorAll('[data-scene="about"] mask [data-reveal]')]
    .filter((m) => !m.matches('[data-content]') && (() => { const d = getComputedStyle(m).strokeDasharray; return d !== 'none' && parseFloat(d) < m.getTotalLength() * 0.98; })()).length);
  assert(open === 0, `${open} strokes of the base figure are not drawn before the section is visible`);
  await p.close();
});

await test('entrega', async () => {
  const p = await page();
  await scrollTo(p, 'max'); await sleep(3200); // landing, unfold (0.75 s) and the envelope's slide
  assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'true', 'envelope not delivered');
  await test('reversa', async () => {
    await p.evaluate(() => scrollTo(0, document.getElementById('about').offsetTop)); await sleep(2200);
    assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'false', 'envelope did not come back');
  });
  await p.close();
});

// Coming back up from the mailbox: the envelope leaves the slot, folds back into the plane (the six frames in reverse) and the plane flies on.
const REFOLD = ['fold-2', 'fold-1', 'sheet', 'unfold-2', 'unfold-1', 'plane'];
async function refoldRun(p) {
  await p.evaluate(() => {
    const g = document.querySelector('[data-plane]');
    const env = [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0).querySelector('[data-envelope]');
    window.__rec = [];
    setInterval(() => window.__rec.push({
      env: +env.style.opacity > 0, plane: g.style.opacity === '1',
      frame: [...g.querySelectorAll('[data-frame]')].find((f) => f.style.display !== 'none')?.dataset.frame,
      x: +g.dataset.x, y: +g.dataset.y, phase: g.dataset.phase,
    }), 50);
  });
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = max, i = 0; i < 25; i++, y -= 90) { await p.evaluate((y) => scrollTo(0, y), y); await sleep(120); }
  await sleep(2500);
  const rec = await p.evaluate(() => window.__rec);
  const after = rec.slice(rec.findIndex((s) => s.env || s.plane)); // from the first sign of life on the way back
  return { rec: after, last: rec.at(-1) };
}
const refoldChecks = (rec, tail, glideEnd = Infinity) => {
  assert(!rec.some((s) => s.env && s.plane), 'envelope and plane visible at the same time');
  const seq = rec.filter((s) => s.plane).map((s) => s.frame).filter((f, i, a) => f !== a[i - 1]);
  const from = seq.indexOf('fold-2');
  assert(from >= 0 && REFOLD.every((f, i) => seq[from + i] === f), `frames out of order: ${seq.join(' > ')}`);
  // The hand-over itself (the fold plus `tail` samples of easing or gliding out) must be continuous; after that the scroll drives the plane at its own pace.
  const start = rec.findIndex((s) => s.plane && s.frame === 'plane');
  const exit = rec.findIndex((s, i) => i > start && s.x >= glideEnd); // small screens: the plane leaves through the right edge, then the next crossing owns it
  rec = rec.slice(0, exit >= 0 ? exit + 1 : start + tail);
  const gap = (i) => (rec[i].plane && rec[i - 1].plane ? Math.hypot(rec[i].x - rec[i - 1].x, rec[i].y - rec[i - 1].y) : 0);
  const at = rec.map((_, i) => (i ? gap(i) : 0)).reduce((b, d, i, a) => (d > a[b] ? i : b), 0);
  if (process.env.DEBUG) console.log(rec.map((s) => `${s.env ? 'E' : '-'}${s.plane ? 'P' : '-'} ${s.frame} ${Math.round(s.x)},${Math.round(s.y)}`).join('\n'));
  assert(gap(at) <= 200, `plane jumped ${gap(at).toFixed(0)} px between samples (50 ms): ${JSON.stringify(rec.slice(Math.max(0, at - 2), at + 2))}`);
};
await test('entrega-reversa', async () => {
  const p = await page();
  await scrollTo(p, 'max'); await sleep(3200);
  const { rec, last } = await refoldRun(p);
  refoldChecks(rec, 10);
  assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'false', 'still delivered');
  assert(last.plane && (last.phase === 'flying' || last.phase === 'landing'), `plane not flying at the end: ${JSON.stringify(last)}`);
  await p.close();
});
await test('entrega-reversa-mobile', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.waitForFunction(() => document.querySelector('[data-scene="hero"]').dataset.throw === 'away', null, { timeout: 8000 });
  await scrollTo(p, 'max'); await sleep(4500);
  const { rec, last } = await refoldRun(p);
  refoldChecks(rec, 24, 440);
  const scene = await p.evaluate(() => [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0).dataset.delivered);
  assert(scene === 'false', 'still delivered');
  assert(!last.plane || last.phase === 'crossing', `plane stuck on screen: ${JSON.stringify(last)}`);
  await p.close();
});

await test('contacto-cierre', async () => {
  const p = await page();
  const cls = () => p.evaluate(() => ({ done: document.getElementById('contact').classList.contains('is-delivered'), wait: document.getElementById('contact').classList.contains('mail-wait'), line: getComputedStyle(document.querySelector('#contact .mail-link'), '::after').transform }));
  assert((await cls()).wait, 'underline not waiting before the delivery');
  await scrollTo(p, 'max'); await sleep(3500);
  const on = await cls();
  assert(on.done && !on.wait && !/matrix\(0,/.test(on.line), `closing beat did not run: ${JSON.stringify(on)}`);
  await p.evaluate(() => scrollTo(0, document.getElementById('about').offsetTop)); await sleep(2200);
  assert(!(await cls()).done, 'is-delivered stayed after scrolling up');
  await p.close();
  const r = await page({ reducedMotion: 'reduce' });
  await scrollTo(r, 'max');
  assert(await r.evaluate(() => document.getElementById('contact').classList.contains('is-delivered') && getComputedStyle(document.querySelector('#contact .mail-link'), '::after').transform === 'none'), 'reduced motion: underline not drawn');
  await r.close();
});
await test('desdoble-una-vez', async () => {
  const p = await page();
  await p.evaluate(() => { window.__unfolds = 0; const g = document.querySelector('[data-plane]'); new MutationObserver((ms) => ms.forEach((m) => { if (m.target.dataset?.frame === 'sheet' && m.target.style.display !== 'none') window.__unfolds++; })).observe(g, { subtree: true, attributes: true, attributeFilter: ['style'] }); });
  await scrollTo(p, 'max'); await sleep(2500);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight - innerHeight - 40)); await sleep(1500);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(1500);
  const n = await p.evaluate(() => window.__unfolds);
  assert(n === 1, `unfold ran ${n} times without leaving the mailbox`);
  assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'true', 'not delivered');
  const left = await p.evaluate(() => [...document.querySelectorAll('[data-trail]')].reduce((n, e) => {
    const d = getComputedStyle(e).strokeDasharray;
    return n + (d === 'none' ? (e.getAttribute('d') ? 1 : 0) : parseFloat(d) / e.getTotalLength());
  }, 0));
  assert(left < 0.001, `trail still visible after the delivery: ${(left * 100).toFixed(1)}%`);
  await p.close();
});

await test('contacto-sobre-opaco', async () => {
  const p = await page();
  const r = await p.evaluate(() => [...document.querySelectorAll('[data-scene="contact"]')].map((sc) => {
    const env = sc.querySelector('[data-envelope]');
    const ink = sc.querySelector('[data-ink]');
    const body = env.querySelector('[data-envelope-body]');
    return {
      // drawn after the ink, so the character never shows through it
      onTop: !!(ink.compareDocumentPosition(env) & Node.DOCUMENT_POSITION_FOLLOWING),
      opaque: getComputedStyle(body).fill !== 'none' && getComputedStyle(body).fillOpacity === '1',
      // clipped at the slot, so it vanishes into the mailbox instead of sliding over it
      clipped: /url\(/.test(env.parentElement.getAttribute('clip-path') ?? ''),
    };
  }));
  assert(r.every((x) => x.onTop && x.opaque && x.clipped), JSON.stringify(r));
  await p.close();
});

await test('mobile-cruces', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const plane = () => p.evaluate(() => { const g = document.querySelector('[data-plane]'); const r = g.getBoundingClientRect(); return { on: g.style.opacity === '1', x: r.x + r.width / 2, y: r.y + r.height / 2, lit: [...document.querySelectorAll('.plane-pass')].length }; });
  // Before the throw nothing flies.
  assert(!(await plane()).on || await p.getAttribute('[data-scene="hero"]', 'data-throw') !== null, 'plane visible before the throw');
  await p.waitForFunction(() => document.querySelector('[data-scene="hero"]').dataset.throw === 'away', null, { timeout: 8000 });
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let crossings = 0, was = false, lit = 0, offRoute = 0;
  for (let y = 0; y <= max; y += 50) {
    await p.evaluate((y) => scrollTo(0, y), y); await sleep(160);
    const s = await plane();
    if (s.on && !was) crossings++;
    if (s.on && (s.y < 0 || s.y > 844)) offRoute++;
    lit = Math.max(lit, s.lit);
    was = s.on;
  }
  assert(crossings >= 4, `only ${crossings} crossings below 1024 px`);
  assert(lit === 1, `cards lit at once while crossing: ${lit}`);
  assert(offRoute === 0, 'plane shown outside the viewport');
  await sleep(3000);
  assert(await p.evaluate(() => [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0).dataset.delivered) === 'true', 'no delivery at the end');
  await p.close();
});

await test('mobile-sin-estela', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true });
  await sleep(3200);
  const r = await p.evaluate(() => ({ trail: [...document.querySelectorAll('[data-trail="a"], [data-trail="b"]')].every((t) => !t.getAttribute('d')), y: scrollY }));
  assert(r.trail, `long trail present below 1024px: ${JSON.stringify(r)}`);
  await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await sleep(4500);
  assert(await p.evaluate(() => [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0).dataset.delivered) === 'true', 'plane did not deliver on mobile');
  await p.close();
});

await test('mobile-estela', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.waitForFunction(() => document.querySelector('[data-scene="hero"]').dataset.throw === 'away', null, { timeout: 8000 });
  await sleep(1800); // the throw leaves the plane off the right edge
  const sample = () => p.evaluate(() => {
    const g = document.querySelector('[data-plane]');
    const parts = [...document.querySelectorAll('[data-trail="m"]')].filter((t) => t.getAttribute('d'));
    const last = parts.at(-1);
    const end = last?.getPointAtLength(last.getTotalLength());
    return {
      crossing: g.style.opacity === '1' && g.dataset.phase === 'crossing', x: +g.dataset.x, y: +g.dataset.y,
      len: parts.reduce((n, t) => n + t.getTotalLength(), 0), end: end ? { x: end.x, y: end.y } : null,
    };
  });
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight - 900); // stop before the delivery
  const seen = { crossing: 0, trail: 0, longest: 0, far: 0, ghost: 0 };
  for (const dir of [1, -1]) {
    for (let k = 0; k <= max / 50; k++) {
      await p.evaluate((y) => scrollTo(0, y), dir > 0 ? k * 50 : max - k * 50); await sleep(160);
      const s = await sample();
      if (s.crossing) {
        seen.crossing++;
        if (s.len > 0) { seen.trail++; seen.longest = Math.max(seen.longest, s.len); if (Math.hypot(s.end.x - s.x, s.end.y - s.y) > 30) seen.far++; }
      } else if (s.len > 0) seen.ghost++;
    }
  }
  assert(seen.crossing > 10, `too few crossings sampled: ${JSON.stringify(seen)}`);
  assert(seen.trail >= seen.crossing * 0.7, `crossings without trail: ${JSON.stringify(seen)}`);
  assert(seen.longest <= 160, `trail too long: ${JSON.stringify(seen)}`);
  assert(seen.far === 0, `trail end away from the plane: ${JSON.stringify(seen)}`);
  assert(seen.ghost === 0, `trail left without a crossing: ${JSON.stringify(seen)}`);
  await p.close();
});

await test('contacto-mobile', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true });
  await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await sleep(4500);
  const r = await p.evaluate(() => {
    const s = [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0);
    return { motion: s.dataset.motion, delivered: s.dataset.delivered, hand: !!s.querySelector('[data-part="hand"]') };
  });
  assert(r.hand && r.motion === 'running' && r.delivered === 'true', JSON.stringify(r));
  await p.close();
});

await test('overflow', async () => {
  // 320x256 is 400 % zoom on a 1280 px screen, 720x450 is 200 % on 1440 px.
  for (const [w, h] of [[320, 256], [360, 900], [390, 900], [720, 450], [768, 900], [1024, 900], [1280, 900], [1440, 900], [1920, 900]]) {
    const p = await page({ viewport: { width: w, height: h } });
    const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(o === 0, `${w}px overflows by ${o}px`);
    assert(p.errors.length === 0, `${w}px errors: ${p.errors}`);
    await p.close();
  }
});

await test('ruta-recalculo', async () => {
  const p = await page();
  await p.mouse.wheel(0, 40); await sleep(3000);
  await p.setViewportSize({ width: 1100, height: 800 }); await sleep(1500); // the flight rebuilds its routes 200 ms after a resize
  for (const f of [0.1, 0.2, 0.3]) {
    await atFrac(p, f);
    const off = await p.evaluate(() => {
      const g = document.querySelector('[data-plane]'); const route = document.querySelector('[data-flight-route="a"]');
      if (g.dataset.phase !== 'flying') return 0;
      const L = route.getTotalLength(); let bd = 1e9;
      for (let s = 0; s <= L; s += 2) { const q = route.getPointAtLength(s); bd = Math.min(bd, Math.hypot(q.x - +g.dataset.x, q.y - +g.dataset.y)); }
      return bd;
    });
    assert(off < 4, `plane ${off.toFixed(1)}px off the route after resizing`);
  }
  assert(p.errors.length === 0, `errors: ${p.errors}`);
  await p.close();
});

await browser.close();
stop();
for (const [n, r] of results) console.log(`${r === 'ok' ? 'ok  ' : 'FAIL'} ${n}${r === 'ok' ? '' : ` - ${r.slice(6)}`}`);
process.exit(results.some(([, r]) => r !== 'ok') ? 1 : 0);
