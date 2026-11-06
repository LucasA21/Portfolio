// Motion checks for the "hilo de tinta" animation. Starts the dev server, drives Chromium, exits 1 on failure.
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
    thread: [...document.querySelectorAll('[data-thread-seg]')].map((s) => getComputedStyle(s).strokeDasharray),
    delivered: document.querySelector('[data-scene="contact"]').dataset.delivered,
    running: document.querySelectorAll('[data-motion="running"]').length,
    cssLoops: document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length,
  }));
  assert(r.thread.every((d) => d === 'none'), `thread not complete: ${r.thread}`);
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

await test('hilo-progreso', async () => {
  const p = await page();
  const values = [];
  for (const f of [0, 0.5, 1]) {
    await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(1400);
    values.push((await drawn(p, '[data-thread-seg="a1"]')) + (await drawn(p, '[data-thread-seg="b"]')));
  }
  assert(values[0] <= values[1] && values[1] <= values[2], `not monotonic: ${values}`);
  assert(values[2] >= 1.98, `thread not complete at the end: ${values[2]}`);
  assert(await drawn(p, '[data-thread-seg="a0"]') > 0.99, 'laptop cable did not plug in');
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
    for (const seg of document.querySelectorAll('[data-thread-seg]')) {
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
    for (const seg of document.querySelectorAll('[data-thread-seg]')) {
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
  await m.evaluate(() => document.getElementById('about').scrollIntoView()); await sleep(5000);
  assert(await drawn(m, `${sketch}:last-of-type`) > 0.98, 'mobile sketch not complete');
  await m.close();
});

await test('entrega', async () => {
  const p = await page();
  await scrollTo(p, 'max'); await sleep(800);
  assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'true', 'envelope not delivered');
  await test('reversa', async () => {
    await p.evaluate(() => scrollTo(0, document.getElementById('about').offsetTop)); await sleep(2200);
    assert(await p.getAttribute('[data-scene="contact"]', 'data-delivered') === 'false', 'envelope did not come back');
  });
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
