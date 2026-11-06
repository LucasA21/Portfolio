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
  assert(r.plane.frame === 'pinned' && r.plane.opacity === '1', `plane not pinned to the board: ${JSON.stringify(r.plane)}`);
  assert(!/rotate\(9|matrix\(0/.test(r.flag), `flag not up: ${r.flag}`);
  assert(r.delivered === 'true', 'envelope not delivered');
  assert(r.running === 0 && r.cssLoops === 0, `loops running: ${r.running} gsap scenes, ${r.cssLoops} css`);
  await p.close();
});

await test('hero-intro', async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('[data-scene="hero"][data-ready]');
  await sleep(250);
  const partial = await p.evaluate(() => [...document.querySelectorAll('[data-scene="hero"] mask [data-reveal]')]
    .some((m) => { const d = getComputedStyle(m).strokeDasharray; return d !== 'none' && parseFloat(d) < m.getTotalLength() * 0.9; }));
  assert(partial, 'hero strokes were not drawing in');
  await p.waitForSelector('[data-scene="hero"][data-intro="done"]', { timeout: 2500 });
  await p.close();
});

await test('hero-loop', async () => {
  const p = await page();
  await p.waitForSelector('[data-scene="hero"][data-motion="running"]', { timeout: 4000 });
  let blinked = false;
  for (let t = 0; t < 7000 && !blinked; t += 40) {
    blinked = await p.evaluate(() => /scale|matrix\(1,? ?0,? ?0,? ?0\.[0-8]/.test(
      (document.querySelector('[data-scene="hero"] [data-part="eyeL"]').getAttribute('transform') ?? '') +
      getComputedStyle(document.querySelector('[data-scene="hero"] [data-part="eyeL"]')).transform));
    await sleep(40);
  }
  assert(blinked, 'eyes did not blink within 7 s');
  await p.close();
});

await test('hero-pausa', async () => {
  const p = await page();
  await scrollTo(p, 'max');
  assert(await p.getAttribute('[data-scene="hero"]', 'data-motion') === 'paused', 'hero loop still running off screen');
  await p.close();
});

const plane = (p) => p.evaluate(() => {
  const g = document.querySelector('[data-plane]');
  return { x: +g.dataset.x, y: +g.dataset.y, rot: +g.dataset.rot, opacity: +g.style.opacity, phase: g.dataset.phase };
});
const atFrac = async (p, f) => { await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(1600); };

await test('vuelo-progreso', async () => {
  const p = await page();
  await sleep(2500); // takeoff from the laptop
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
      return { off: bd, diff: Math.abs(((+g.dataset.rot - tan + 540) % 360) - 180) };
    });
    if (!r) continue;
    assert(r.off < 4, `plane is ${r.off}px off the route`);
    assert(r.diff < 25, `nose points ${r.diff} degrees away from the heading`);
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
  assert(max < total, 'all cards lifted at once');
  await atFrac(p, 1);
  const stuck = await p.evaluate(() => document.querySelectorAll('.plane-pass').length);
  assert(stuck === 0, `${stuck} cards stayed lifted after the plane left`);
  const top = await p.evaluate(() => { const c = [...document.querySelectorAll('.project-card')].find((e) => e.offsetParent); return getComputedStyle(c).top; });
  assert(top === '0px', `card did not settle: top ${top}`);
  await p.close();
});

await test('avion-pinchado', async () => {
  const p = await page();
  await sleep(2500);
  let r = null;
  const top = await p.evaluate(() => document.getElementById('about').getBoundingClientRect().top + scrollY - 500);
  for (let y = top; y < top + 1000 && r?.phase !== 'pinned'; y += 50) {
    await p.evaluate((y) => scrollTo(0, y), y); await sleep(900);
    r = await plane(p);
  }
  assert(r.phase === 'pinned', `plane never pinned on the board: ${JSON.stringify(r)}`);
  await p.evaluate(() => scrollTo(0, 0)); await sleep(1800);
  assert((await plane(p)).phase !== 'pinned', 'plane stayed pinned after scrolling back up');
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
  await scrollTo(p, 400);
  assert(await drawn(p, sketch) < 0.05, 'sketch drawn too early');
  await scrollTo(p, 'max');
  assert(await drawn(p, `${sketch}:last-of-type`) > 0.98, 'sketch not complete after Sobre mí');
  await p.close();
  const m = await page({ viewport: { width: 390, height: 844 }, isMobile: true });
  await m.evaluate(() => document.querySelector('[data-scene="about"]').scrollIntoView({ block: 'center' })); await sleep(5000);
  assert(await drawn(m, `${sketch}:last-of-type`) > 0.98, 'mobile sketch not complete');
  await m.close();
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

await test('mobile-sin-estela', async () => {
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true });
  await sleep(3200);
  const r = await p.evaluate(() => ({ trail: [...document.querySelectorAll('[data-trail]')].every((t) => !t.getAttribute('d')) , y: scrollY }));
  assert(r.trail, `long trail present below 1024px: ${JSON.stringify(r)}`);
  await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await sleep(4500);
  assert(await p.evaluate(() => [...document.querySelectorAll('[data-scene="contact"]')].find((e) => e.getBoundingClientRect().width > 0).dataset.delivered) === 'true', 'plane did not deliver on mobile');
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
  for (const w of [360, 390, 768, 1024, 1280, 1440, 1920]) {
    const p = await page({ viewport: { width: w, height: 900 } });
    const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(o === 0, `${w}px overflows by ${o}px`);
    assert(p.errors.length === 0, `${w}px errors: ${p.errors}`);
    await p.close();
  }
});

await browser.close();
stop();
for (const [n, r] of results) console.log(`${r === 'ok' ? 'ok  ' : 'FAIL'} ${n}${r === 'ok' ? '' : ` - ${r.slice(6)}`}`);
process.exit(results.some(([, r]) => r !== 'ok') ? 1 : 0);
