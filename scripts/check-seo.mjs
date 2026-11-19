// SEO, JSON-LD, CSP nonce, security headers, and basic accessibility checks.
// Run: pnpm check:seo (needs Chromium at /usr/bin/chromium or CHROMIUM_PATH)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
  buildPortfolioGraph,
  generateLlmsTxt,
  generateRobotsTxt,
  isStagingEnvironment,
  safeJsonLdStringify,
} from '../src/utils/seo.ts';

const PORT = 4401;
const BASE_URL = `http://localhost:${PORT}`;

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([name, 'ok']);
  } catch (e) {
    results.push([name, `FAIL: ${e instanceof Error ? e.message : String(e)}`]);
  }
}

// 1. Unit tests for pure SEO helpers.
await test('unit-jsonld-sanitize', async () => {
  const payload = { text: '</script><script>alert(1)</script> & \'test\'\u2028\u2029' };
  const serialized = safeJsonLdStringify(payload);
  assert.equal(serialized.includes('<'), false, 'must escape <');
  assert.equal(serialized.includes('>'), false, 'must escape >');
  assert.equal(serialized.includes('&'), false, 'must escape &');
  assert.equal(serialized.includes("'"), false, 'must escape single quote');
  assert.equal(serialized.includes('\u2028'), false, 'must escape U+2028');
  assert.equal(serialized.includes('\u2029'), false, 'must escape U+2029');
  assert.deepEqual(JSON.parse(serialized), payload);
});

await test('unit-staging-env', async () => {
  assert.equal(isStagingEnvironment({ VERCEL_ENV: 'preview' }), true);
  assert.equal(isStagingEnvironment({ APP_ENV: 'staging' }), true);
  assert.equal(isStagingEnvironment({ PUBLIC_SANITY_DATASET: 'staging' }), true);
  assert.equal(isStagingEnvironment({ VERCEL_ENV: 'production', PUBLIC_SANITY_DATASET: 'production' }), false);
});

await test('unit-robots-txt', async () => {
  const staging = generateRobotsTxt('https://lucasaraya.com.ar', true);
  assert.ok(staging.includes('Disallow: /'));
  assert.equal(staging.includes('Allow: /'), false);

  const prod = generateRobotsTxt('https://lucasaraya.com.ar', false);
  assert.ok(prod.includes('Allow: /'));
  assert.ok(prod.includes('Disallow: /admin/'));
  assert.ok(prod.includes('Sitemap: https://lucasaraya.com.ar/sitemap-index.xml'));
  assert.ok(prod.includes('llms.txt'));
});

await test('unit-llms-txt-and-graph', async () => {
  const settings = {
    hero: { lead: 'Frontend desde Ushuaia.' },
    about: { text: 'Cuido la jerarquía y el ritmo.', cvUrl: '/cv.pdf' },
    contact: { email: 'hola@lucasaraya.com.ar' },
    socialLinks: [{ _key: 'gh', platform: 'github', url: 'https://github.com/LucasA21' }],
  };
  const projects = [
    { _id: '1', title: 'Demo UI', description: 'Interfaz rápida.', tags: ['Astro', 'TypeScript'], link: 'https://example.com' },
  ];

  const llms = generateLlmsTxt('https://lucasaraya.com.ar', settings, projects);
  assert.ok(llms.includes('# Lucas Araya'));
  assert.ok(llms.includes('Fullstack Developer'));
  assert.ok(llms.includes('UI/UX'));
  assert.ok(llms.includes('Demo UI'));
  assert.ok(llms.includes('https://lucasaraya.com.ar/'));

  const graph = buildPortfolioGraph(settings, projects, 'https://lucasaraya.com.ar');
  assert.equal(graph['@context'], 'https://schema.org');
  const types = (graph['@graph'] ?? []).map((n) => n['@type']);
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('Person'));
  assert.ok(types.includes('ProfilePage'));
  assert.ok(types.includes('ItemList'));
});

// 2. Integration & browser tests against local server.
const server = spawn('pnpm', ['astro', 'dev', '--port', String(PORT)], {
  stdio: 'ignore',
  detached: true,
});
const stop = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(1);
});

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });

  // Warm up Vite dependency optimizer.
  const warm = await browser.newPage();
  await warm.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await warm.close();

  await test('http-security-headers', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy') || '';
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
    assert.ok(scriptSrc.includes("'nonce-"), `missing nonce in script-src: ${scriptSrc}`);
    assert.ok(scriptSrc.includes("'strict-dynamic'"), `missing strict-dynamic: ${scriptSrc}`);
    assert.equal(scriptSrc.includes("'unsafe-inline'"), false, 'script-src must not allow unsafe-inline');
    assert.equal(scriptSrc.includes("'unsafe-eval'"), false, 'script-src must not allow unsafe-eval');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.ok(res.headers.get('permissions-policy'));
  });

  await test('http-endpoints-robots-llms-security-sitemap', async () => {
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.ok((robotsRes.headers.get('content-type') || '').includes('text/plain'));
    const robotsTxt = await robotsRes.text();
    assert.ok(
      robotsTxt.includes('Sitemap: https://lucasaraya.com.ar/sitemap-index.xml') ||
        robotsTxt.includes('Disallow: /'),
    );

    const llmsRes = await fetch(`${BASE_URL}/llms.txt`);
    assert.equal(llmsRes.status, 200);
    assert.ok((llmsRes.headers.get('content-type') || '').includes('text/plain'));
    const llmsTxt = await llmsRes.text();
    assert.ok(llmsTxt.includes('# Lucas Araya'));

    const secRes = await fetch(`${BASE_URL}/.well-known/security.txt`);
    assert.equal(secRes.status, 200);
    const secTxt = await secRes.text();
    assert.ok(secTxt.includes('Contact:'));
    assert.ok(secTxt.includes('Canonical: https://lucasaraya.com.ar/.well-known/security.txt'));

    const sitemapCandidates = [
      path.resolve('.vercel/output/static/sitemap-0.xml'),
      path.resolve('dist/client/sitemap-0.xml'),
    ];
    const sitemapPath = sitemapCandidates.find((p) => fs.existsSync(p));
    assert.ok(sitemapPath, 'built sitemap-0.xml must exist');
    const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
    assert.ok(sitemapXml.includes('https://lucasaraya.com.ar/'));
    assert.equal(sitemapXml.includes('/dibujos'), false, 'sitemap must exclude /dibujos');
    assert.equal(sitemapXml.includes('/admin'), false, 'sitemap must exclude /admin');
  });

  await test('http-404-noindex-no-canonical', async () => {
    for (const missingPath of ['/404', '/ruta-que-no-existe-123']) {
      const res = await fetch(`${BASE_URL}${missingPath}`);
      assert.equal(res.status, 404, `${missingPath} must return 404`);
      const html = await res.text();
      assert.ok(/<meta[^>]+name="robots"[^>]+content="noindex,\s*nofollow"/i.test(html));
      assert.equal(/<link[^>]+rel="canonical"/i.test(html), false, `${missingPath} must omit canonical`);
    }
  });

  await test('e2e-csp-zero-violations-and-seo-a11y', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const cspViolations = [];
    const pageErrors = [];

    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.exposeFunction('onCspViolation', (v) => cspViolations.push(v));
    await page.addInitScript(() => {
      window.addEventListener('securitypolicyviolation', (e) => {
        window.onCspViolation({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          effectiveDirective: e.effectiveDirective,
        });
      });
    });

    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200);

    // SEO metadata & JSON-LD checks.
    const meta = await page.evaluate(() => {
      const canonicals = [...document.querySelectorAll('link[rel="canonical"]')].map((e) => e.getAttribute('href'));
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
      const ldScripts = [...document.querySelectorAll('script[type="application/ld+json"]')].map((e) => e.textContent);
      const h1s = [...document.querySelectorAll('h1')].filter((e) => getComputedStyle(e).display !== 'none');
      const imgsMissingAlt = [...document.querySelectorAll('img')].filter((img) => img.getAttribute('alt') === null).length;
      const unlabeledButtons = [...document.querySelectorAll('button')].filter((btn) => {
        if (btn.getAttribute('aria-hidden') === 'true') return false;
        const text = (btn.textContent || '').trim();
        const label = (btn.getAttribute('aria-label') || '').trim();
        return !text && !label;
      }).length;
      return { canonicals, robots, ldScripts, h1Count: h1s.length, imgsMissingAlt, unlabeledButtons };
    });

    assert.deepEqual(meta.canonicals, ['https://lucasaraya.com.ar/']);
    assert.ok(meta.robots.includes('max-image-preview:large'));
    assert.equal(meta.ldScripts.length, 1);
    const parsedGraph = JSON.parse(meta.ldScripts[0] || '{}');
    assert.equal(parsedGraph['@context'], 'https://schema.org');
    const types = (parsedGraph['@graph'] ?? []).map((n) => n['@type']);
    assert.ok(types.includes('WebSite'));
    assert.ok(types.includes('Person'));
    assert.ok(types.includes('ProfilePage'));

    assert.equal(meta.h1Count, 1, 'must have exactly 1 visible h1');
    assert.equal(meta.imgsMissingAlt, 0, 'all images must have alt attribute');
    assert.equal(meta.unlabeledButtons, 0, 'all buttons must have accessible name');

    // Interact with scroll, modal, and lightbox to ensure CSP does not block runtime JS.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const cardBtn = page.locator('.project-card button').first();
    if ((await cardBtn.count()) > 0) {
      await cardBtn.click();
      await page.waitForTimeout(200);
      const imgBtn = page.locator('#modal-image-container');
      if ((await imgBtn.count()) > 0 && (await imgBtn.isVisible())) {
        await imgBtn.click();
        await page.waitForTimeout(150);
      }
    }

    assert.deepEqual(cspViolations, [], `CSP violations detected: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(pageErrors, [], `Page errors detected: ${JSON.stringify(pageErrors)}`);
    await page.close();
  });

  await test('e2e-admin-csp-and-render', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const cspViolations = [];
    const pageErrors = [];

    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.exposeFunction('onAdminCspViolation', (v) => cspViolations.push(v));
    await page.addInitScript(() => {
      window.addEventListener('securitypolicyviolation', (e) => {
        window.onAdminCspViolation({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          effectiveDirective: e.effectiveDirective,
        });
      });
    });

    const response = await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    assert.equal(response?.headers()['x-robots-tag'], 'noindex, nofollow, noarchive');
    assert.ok((response?.headers()['content-security-policy'] || '').includes("script-src 'self'"));

    // Wait briefly for Sanity Studio client bundle to hydrate/render without blocking CSP.
    await page.waitForSelector('astro-island, #sanity, [data-ui]', { timeout: 25000 });
    await page.waitForTimeout(1500);

    assert.deepEqual(cspViolations, [], `Admin CSP violations detected: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(pageErrors, [], `Admin page errors detected: ${JSON.stringify(pageErrors)}`);
    await page.close();
  });
} finally {
  if (browser) await browser.close();
  stop();
}

for (const [name, status] of results) console.log(`${status === 'ok' ? 'ok  ' : 'FAIL'} ${name}${status === 'ok' ? '' : ` (${status.slice(6)})`}`);
const failed = results.filter(([, s]) => s !== 'ok').length;
if (failed) process.exit(1);
