// Vectorizes the hand-drawn hero layers (public/hero-capas/*.PNG) into one SVG fragment.
// One <g data-piece> per piece and one <g data-frame> per drawing; ink and fill are traced as filled outlines
// (potrace), so the variable stroke width is kept. Run: node scripts/illustrations/hero-frames/trace.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import potrace from 'potrace';

const SRC = 'public/hero-capas';
const OUT = 'src/components/scenes/hero-frames.svg';
const INK = '#531F1F';
const VIEWBOX = [270, 280, 2560, 2520]; // content spans x 306..2795, y 316..2771 of the 3000 canvas

// Bottom to top (the head sits under the base so the torso collar covers the neck). `erase` cleans stray marks the artist left outside the drawing: as `-draw` shapes on the 3000 canvas.
// `fill` paints closed shapes with the site background so pieces hide what is behind them.
// `close` is the morphology radius that seals small gaps before finding the inside of a shape.
const PIECES = [
  { id: 'head', fill: true, close: 8, frames: [['front', 'head/head-01-front.PNG'], ['look-up', 'head/head-02-look-up.PNG']] },
  { id: 'eyes', fill: false, close: 0, frames: [['open', 'eyes/eyes-01-open.PNG'], ['closed', 'eyes/eyes-02-closed.PNG'], ['look-up-open', 'eyes/eyes-03-look-up-open.PNG'], ['look-up-closed', 'eyes/eyes-04-look-up-closed.PNG']] },
  { id: 'base', fill: true, close: 10, frames: [['base', 'base.PNG', { erase: [['rectangle 590,1000 705,1330']] }]] },
  { id: 'arm-r', fill: true, close: 8, frames: [['windup', 'arm-r/arm-r-01-windup.PNG', { erase: [['polygon 1150,955 1200,985 1255,1030 1290,1090 1312,1140 1312,1180 1150,1180', true], ['rectangle 1270,1215 1300,1235']] }], ['release', 'arm-r/arm-r-02-release.PNG']] },
  { id: 'plane-in-hand', fill: true, close: 4, frames: [['windup', 'plane-in-hand/plane-in-hand-01-windup.PNG', { erase: [['rectangle 640,825 700,880']] }]] },
  { id: 'arm-l', fill: true, close: 8, frames: [['typing', 'arm-l/arm-l-01-typing.PNG'], ['typing-b', 'arm-l/arm-l-02-typing-b.PNG']] },
];
const REST = { base: 'base', 'arm-r': 'release', 'arm-l': 'typing', head: 'front', eyes: 'open' };

const tmp = mkdtempSync(join(tmpdir(), 'hero-frames-'));
const mg = (...a) => execFileSync('magick', a, { encoding: 'utf8' });

// Pipeline shared by ink and fill: build a 1-bit mask, crop to its box, trace, shift back to canvas coordinates.
function trace(mask, params) {
  const box = mg(mask, '-negate', '-format', '%@', 'info:').trim(); // WxH+X+Y of the black pixels
  const m = box.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!m) return '';
  const [, w, h, x, y] = m.map(Number);
  const crop = join(tmp, 'crop.png');
  mg(mask, '-crop', `${w}x${h}+${x}+${y}`, '+repage', '-depth', '8', '-type', 'TrueColor', `PNG24:${crop}`);
  const t = new potrace.Potrace(params);
  return new Promise((res, rej) => {
    t.loadImage(crop, (err) => {
      if (err) return rej(err);
      const tag = t.getPathTag('#000');
      const dd = tag.match(/ d="([^"]+)"/)?.[1] ?? '';
      let i = 0;
      // All commands are absolute (M, L, C, Z): coordinates come in x,y pairs.
      const d = dd.replace(/-?\d+(?:\.\d+)?/g, (n) => {
        const v = Math.round(parseFloat(n)) + ((i++ % 2) ? y : x);
        return String(v);
      });
      res(d);
    });
  });
}

async function frame(file, opts, piece) {
  const src = join(SRC, file);
  const clean = join(tmp, 'clean.png');
  if (opts?.erase) {
    // Each entry is a magick -draw shape; `light` limits it to paint (not ink) so a stroke next to a spill survives.
    const a = join(tmp, 'alpha.png');
    mg(src, '-alpha', 'extract', a);
    for (const [shape, light] of opts.erase) {
      const m = join(tmp, 'erase.png');
      mg('-size', '3000x3000', 'xc:black', '-fill', 'white', '-draw', shape, m);
      if (light) mg(m, '(', src, '-background', 'black', '-alpha', 'remove', '-colorspace', 'Gray', '-threshold', '50%', ')', '-compose', 'Multiply', '-composite', m);
      mg(a, m, '-compose', 'Minus_Src', '-composite', a);
    }
    mg(src, a, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', clean);
  } else mg(src, clean);

  const inkMask = join(tmp, 'ink.png');
  mg(clean, '-background', 'white', '-flatten', '-colorspace', 'Gray', '-threshold', '55%', inkMask);
  const ink = await trace(inkMask, { turdSize: 40, alphaMax: 1, optTolerance: 0.4, blackOnWhite: true });

  let fill = '';
  if (piece.fill) {
    // Opaque silhouette, sealed, then every pixel not reachable from outside is the inside of a shape.
    const sil = join(tmp, 'sil.png');
    mg(clean, '-alpha', 'extract', '-threshold', '50%', '-morphology', 'Close', `Disk:${piece.close}`, '-bordercolor', 'black', '-border', '1',
      '-fill', 'gray50', '-draw', 'color 0,0 floodfill', '-shave', '1x1', '-fill', 'white', '-fuzz', '1%', '+opaque', 'gray50', '-fill', 'black', '-opaque', 'gray50', '-negate', sil);
    fill = await trace(sil, { turdSize: 200, alphaMax: 1, optTolerance: 0.6, blackOnWhite: true });
  }
  return { fill, ink };
}

const parts = [];
const report = [];
for (const piece of PIECES) {
  const frames = [];
  for (const [name, file, opts] of piece.frames) {
    const { fill, ink } = await frame(file, opts, piece);
    const rest = REST[piece.id] === name;
    const art = `${fill ? `<path d="${fill}" fill="var(--color-main-bg)" fill-rule="evenodd"/>` : ''}<path d="${ink}" fill="${INK}" fill-rule="evenodd"/>`;
    frames.push(`<g data-frame="${name}"${rest ? '' : ' visibility="hidden"'}>${art}</g>`);
    report.push(`${piece.id}/${name}: ${((fill.length + ink.length) / 1024).toFixed(1)} KB`);
  }
  parts.push(`<g data-piece="${piece.id}">${frames.join('')}</g>`);
}
// While the right arm is raised, the monitor edge lines would hang beside the sleeve: a patch of
// background colour (the monitor's own fill) hides it. Shown only during the windup, above base and below arm-r.
const patch = '<g data-piece="base-patch"><g data-frame="windup" visibility="hidden"><rect x="1550" y="780" width="90" height="440" fill="var(--color-main-bg)"/></g></g>';
parts.splice(parts.findIndex((p) => p.startsWith('<g data-piece="arm-r"')), 0, patch);
const svg = parts.join('\n');
writeFileSync(OUT, `<!-- Generated by scripts/illustrations/hero-frames/trace.mjs; viewBox ${VIEWBOX.join(' ')} -->\n${svg}\n`);
console.log(report.join('\n'));
console.log(`total ${(svg.length / 1024).toFixed(1)} KB -> ${OUT}`);
