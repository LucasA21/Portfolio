// Captures of the published project sites for the cards: 1440x900 at 2x, exported to WebP in public/screenshots/.
// Reads the projects (title and link) from Sanity, so every project with a URL gets one; the rest are listed as pending.
// Run: node scripts/screenshots.mjs [slug ...]   (needs Chromium at /usr/bin/chromium or CHROMIUM_PATH, and ImageMagick)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { chromium } from 'playwright-core';

process.loadEnvFile?.('.env');
const OUT = 'public/screenshots';
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const only = process.argv.slice(2);

const sanity = createClient({ projectId: process.env.PUBLIC_SANITY_PROJECT_ID, dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production', apiVersion: '2024-01-01', useCdn: true });
const projects = await sanity.fetch('*[_type == "project"]{ title, link }');

mkdirSync(OUT, { recursive: true });
const index = JSON.parse(readFileSync(`${OUT}/index.json`, 'utf8'));
const pending = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
for (const { title, link } of projects) {
  const id = slug(title);
  if (only.length && !only.includes(id)) continue;
  if (!link || !/^https?:\/\//.test(link) || /github\.com|gitlab\.com/.test(link)) { pending.push(`${title} (${link ?? 'sin URL'})`); continue; }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    await page.goto(link, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500); // entrance animations
    const png = `${OUT}/${id}.png`;
    await page.screenshot({ path: png });
    execFileSync('magick', [png, '-resize', '2000x', '-quality', '82', `${OUT}/${id}.webp`]);
    execFileSync('rm', [png]);
    index[id] = `/screenshots/${id}.webp`;
    console.log('ok     ', title);
  } catch (e) {
    pending.push(`${title} (${link}): ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2) + '\n');
if (pending.length) console.log('pendientes:\n- ' + pending.join('\n- '));
