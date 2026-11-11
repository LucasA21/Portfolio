import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';

const execFileAsync = promisify(execFile);

const TARGET_URL = process.argv[2] || 'http://localhost:4402/';
const OUTPUT_PATH = path.resolve('public/og-image.png');
const HALANT_PATH = path.resolve('node_modules/@fontsource/halant/files/halant-latin-500-normal.woff2');
const KALAM_PATH = path.resolve('node_modules/@fontsource/kalam/files/kalam-latin-400-normal.woff2');

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });

  try {
    const page1 = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page1.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(1500);

    const hero = page1.locator('svg[data-scene="hero"]');
    await hero.waitFor({ state: 'visible' });
    const heroBuffer = await hero.screenshot({ omitBackground: true });
    const heroBase64 = heroBuffer.toString('base64');
    await page1.close();

    const halantExists = fs.existsSync(HALANT_PATH);
    const kalamExists = fs.existsSync(KALAM_PATH);

    let fontFaces = '';
    if (halantExists) {
      const data = fs.readFileSync(HALANT_PATH).toString('base64');
      fontFaces += `
        @font-face {
          font-family: 'Halant';
          src: url('data:font/woff2;base64,${data}') format('woff2');
          font-weight: 500;
          font-style: normal;
        }
      `;
    }
    if (kalamExists) {
      const data = fs.readFileSync(KALAM_PATH).toString('base64');
      fontFaces += `
        @font-face {
          font-family: 'Kalam';
          src: url('data:font/woff2;base64,${data}') format('woff2');
          font-weight: 400;
          font-style: normal;
        }
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    ${fontFaces}
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      background: #F6F5F1;
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
    }
    .left-col {
      padding: 80px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      min-width: 0;
    }
    .tagline {
      font-family: ${kalamExists ? "'Kalam', cursive" : "cursive"};
      font-size: 32px;
      color: #a8433a;
      margin: 0 0 16px 0;
      line-height: 1.2;
    }
    .heading {
      font-family: ${halantExists ? "'Halant', serif" : "serif"};
      font-size: 96px;
      font-weight: 500;
      color: #531F1F;
      margin: 0 0 16px 0;
      line-height: 1;
      white-space: nowrap;
    }
    .subheading {
      font-family: ${halantExists ? "'Halant', serif" : "serif"};
      font-size: 40px;
      font-weight: 500;
      color: rgba(83, 31, 31, 0.8);
      margin: 0;
      line-height: 1.2;
    }
    .right-col {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 60px;
      flex-shrink: 0;
    }
    .hero-img {
      width: 520px;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="left-col">
    <div class="tagline">Frontend Developer</div>
    <div class="heading">Lucas Araya</div>
    <div class="subheading">especializado en UI/UX</div>
  </div>
  <div class="right-col">
    <img class="hero-img" src="data:image/png;base64,${heroBase64}" alt="Lucas Araya">
  </div>
</body>
</html>`;

    const page2 = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await page2.setContent(html, { waitUntil: 'load' });
    await page2.evaluate(() => document.fonts.ready);

    const tmpPath = path.join(os.tmpdir(), `og-image-${Date.now()}.png`);
    await page2.screenshot({ path: tmpPath, omitBackground: false });
    await page2.close();

    let colors = 96;
    const MAX_BYTES = 150 * 1024;
    while (colors >= 16) {
      await execFileAsync('magick', [tmpPath, '-colors', String(colors), '-strip', `PNG8:${OUTPUT_PATH}`]);
      const stat = fs.statSync(OUTPUT_PATH);
      if (stat.size <= MAX_BYTES || colors <= 16) {
        break;
      }
      colors = Math.max(16, colors - 16);
    }

    try {
      fs.unlinkSync(tmpPath);
    } catch {}

    const finalSize = fs.statSync(OUTPUT_PATH).size;
    const kb = (finalSize / 1024).toFixed(1);
    console.log(`og-image generated: ${kb} KB (${finalSize} bytes, colors: ${colors})`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
