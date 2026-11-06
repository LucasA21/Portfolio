# Scenes built from the ORIGINAL filled art: moving parts are clipped copies, the reveal is a centerline mask.
import json, re, math
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'src/components/scenes/') + '/'
INK = '#531F1F'
PUB = os.path.join(ROOT, 'public') + '/'

def original(src):
    t = open(PUB + src).read()
    tr = re.search(r'<g transform="([^"]+)"', t).group(1)
    ps = ''.join(re.findall(r'<path d="[^"]+"\s*/>', t)).replace('\n', ' ')
    return tr, ps

def poly(pts): return 'M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z'

def mask_paths(trace_json, extra_fill=()):
    d = json.load(open(os.path.join(HERE, trace_json)))
    out = []
    for l in d['lines']:
        if len(l) < 2: continue
        w = max(p[2] for p in l) * 2 + 9
        pd = 'M' + 'L'.join(f'{p[0]} {p[1]}' for p in l)
        out.append(f'<path data-reveal="" d="{pd}" stroke-width="{w:.1f}"/>')
    for pts in extra_fill:
        out.append(f'<path data-reveal-fill="" d="{poly(pts)}" fill="white" stroke="none"/>')
    return ''.join(out)

def scene(key, src, vb, label, parts, trace_json, extra_fill=(), additions=''):
    W, H = vb
    tr, ps = original(src)
    ref = lambda n: f'{{`{n}-{key}-${{uid}}`}}'
    url = lambda n: f'{{`url(#{n}-{key}-${{uid}})`}}'
    use = f'<use href={{`#art-{key}-${{uid}}`}}'
    holes = {}
    for name, pts, origin, parent in parts:
        holes.setdefault(parent or 'body', []).append(inset(pts))
    defs = f'<g id={ref("art")} transform="{tr}" fill="{INK}" stroke="none">{ps}</g>'
    def clip(name, base):
        d = base + ''.join(poly(h) for h in holes.get(name, []))
        return f'<clipPath id={ref("c-" + name)}><path clip-rule="evenodd" d="{d}"/></clipPath>'
    defs += clip('body', f'M-50 -50H{W + 50}V{H + 50}H-50Z')
    for name, pts, origin, parent in parts:
        defs += clip(name, poly(pts))
    defs += (f'<mask id={ref("m")} maskUnits="userSpaceOnUse" x="-50" y="-50" width="{W + 100}" height="{H + 100}">'
             f'<g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">{mask_paths(trace_json, extra_fill)}</g></mask>')
    def render(name):
        kids = ''.join(render(n) for n, p, o, par in parts if par == name)
        o = next(o for n, p, o, par in parts if n == name)
        return f'<g data-part="{name}" data-origin="{o}">{use} clip-path={url("c-" + name)}/>{kids}</g>'
    top = ''.join(render(n) for n, p, o, par in parts if par is None)
    body = (f'<defs>{defs}</defs><g data-ink="" mask={url("m")}>'
            f'<g data-part="body">{use} clip-path={url("c-body")}/></g>{top}</g>{additions}')
    return (f'<svg data-scene="{key}" viewBox="0 0 {W} {H}" class={{className}} role="img" aria-label="{label}" '
            f'fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

def inset(pts, d=1.5):
    # Body holes are slightly smaller than the moving part, so the clip seam never leaves a hairline gap.
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    out = []
    for x, y in pts:
        m = math.hypot(x - cx, y - cy) or 1
        out.append((round(x - (x - cx) / m * d, 1), round(y - (y - cy) / m * d, 1)))
    return out

def box(cx, cy, rx, ry): return [(cx - rx, cy - ry), (cx + rx, cy - ry), (cx + rx, cy + ry), (cx - rx, cy + ry)]

HEADER = '''---
// Built from the original illustration (public/*.svg). Moving parts are clipped copies of the same art;
// data-origin is each part's pivot in viewBox units. The mask holds the traced centerlines for the draw-in.
const uid = Math.random().toString(36).slice(2, 8);
interface Props {{ class?: string{extra} }}
const {{ class: className = ''{extra2} }} = Astro.props;
---
'''

def taper(P, w=5.6, tip=0.45, ramp=14):
    # Filled stroke whose ends thin out like the hand-drawn originals.
    L = [0]
    for a, b in zip(P, P[1:]): L.append(L[-1] + math.dist(a, b))
    tot = L[-1]; left = []; right = []
    for k, p in enumerate(P):
        a = P[max(k - 1, 0)]; b = P[min(k + 1, len(P) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; m = math.hypot(dx, dy) or 1
        s = min(1, tip + (1 - tip) * min(L[k], tot - L[k]) / ramp)
        hw = w / 2 * s
        left.append((p[0] - dy / m * hw, p[1] + dx / m * hw)); right.append((p[0] + dy / m * hw, p[1] - dx / m * hw))
    cap = lambda c, a, b: f'A{w * tip / 2:.2f} {w * tip / 2:.2f} 0 0 1 {b[0]:.1f} {b[1]:.1f}'
    d = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in left)
    d += cap(P[-1], left[-1], right[-1]) + 'L' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in right[::-1][1:])
    return d + cap(P[0], right[0], left[0]) + 'Z'

def line_pts(x0, y0, x1, y1, n=16): return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n + 1)]

# ---------- HERO ----------
# The thread leaves the laptop's port, crosses the desk's top edge, runs along its front and hangs off the right end.
HERO_CABLE = ('<path data-thread-path="hero" stroke="none" d="M566 568C580 572 592 580 600 596C606 606 618 609 640 609L922 609'
              'C928 612 931 622 930 640C930 740 920 820 926 900L924 1009"/>')
hero = scene('hero', 'hero-illustration.svg', (1015, 1009), 'Lucas programando en su escritorio con una laptop y un monitor', [
    ('head', [(255, 100), (475, 100), (475, 338), (255, 338)], '348 340', None),
    ('eyeL', box(365.2, 247.8, 7, 10), '365.2 247.8', 'head'),
    ('eyeR', box(413.9, 247.5, 7, 10), '413.9 247.5', 'head'),
    ('handBack', [(266, 554), (320, 554), (320, 590), (266, 590)], '292 562', None),
    ('handFront', [(320, 536), (376, 536), (372, 590), (320, 590)], '346 546', None),
], 'hero-illustration.json', additions=HERO_CABLE)
open(OUT + 'HeroScene.astro', 'w').write(HEADER.format(extra='', extra2='') + hero)

# ---------- CONTACT ----------
BG = '#F6F5F1'
def envelope(cx, top, slot_y, flag, w=140, h=88):
    # Drawn by the thread (desktop) or on its own (small screens), then it slides into the slot.
    x0, x1, y1 = cx - w / 2, cx + w / 2, top + h
    body = f'M{x0} {top}H{x1}V{y1}H{x0}Z'
    outline = f'M{cx} {top}H{x0}V{y1}H{x1}V{top}H{cx}'
    flap = f'M{x0 + 3} {top + 3}L{cx} {top + h * 0.58}L{x1 - 3} {top + 3}'
    return (f'<g data-envelope="" data-slide="{slot_y - y1 + 6}" data-origin="{cx} {y1}">'
            f'<path data-envelope-body="" d="{body}" fill="{BG}" stroke="none"/>'
            f'<path data-envelope-outline="" d="{outline}" stroke-width="5"/>'
            f'<path data-envelope-flap="" d="{flap}" stroke-width="5"/></g>'
            f'<path data-thread-path="contact" d="M{cx} 0V{top}" stroke="none"/>'
            # Mailbox flag: pole and pennant, up by default (rotated down by the motion script until the delivery).
            f'<g data-flag="" data-origin="{flag[0]} {flag[1]}"><path d="M{flag[0]} {flag[1]}V{flag[1] - 84}" stroke-width="5"/>'
            f'<path d="M{flag[0]} {flag[1] - 84}L{flag[0] + 46} {flag[1] - 68}L{flag[0]} {flag[1] - 50}Z" fill="#a8433a" stroke="#531F1F" stroke-width="3"/></g>')

sen_shadow = [(598, 430), (700, 430), (800, 470), (848, 600), (848, 998), (768, 998), (768, 910), (760, 600), (733, 500), (660, 454), (598, 454)]
apo_shadow = [(740, 455), (830, 455), (920, 500), (966, 620), (966, 1000), (888, 1000), (886, 940), (878, 640), (848, 540), (790, 480), (740, 478)]
desk = scene('contact', 'contact-señalar.svg', (967, 1135), 'Lucas apoyado en un buzón señalando el email de contacto', [
    ('head', [(340, 125), (525, 125), (525, 318), (340, 318)], '441 320', None),
    ('eyeL', box(392, 245.3, 5, 7), '392 245.3', 'head'),
    ('eyeR', box(432.8, 244.7, 5, 7), '432.8 244.7', 'head'),
    ('forearm', [(150, 318), (252, 330), (306, 428), (316, 508), (248, 474), (196, 432), (150, 424)], '306 466', None),
    ('slotLid', [(532, 552), (722, 552), (722, 612), (532, 612)], '541 588', None),
], 'contact-señalar.json', extra_fill=[sen_shadow, [(532, 552), (722, 552), (722, 612), (532, 612)]], additions=envelope(627, 290, 552, (864, 600)))
mob = scene('contactm', 'contact-apoyado.svg', (1073, 1162), 'Lucas apoyado en un buzón junto a su escritorio', [
    ('head', [(488, 150), (672, 150), (672, 340), (488, 340)], '590 345', None),
    ('eyeL', box(539.9, 271.9, 5, 7), '539.9 271.9', 'head'),
    ('eyeR', box(580.1, 270.8, 5, 7), '580.1 270.8', 'head'),
    ('hand', [(584, 492), (652, 492), (668, 520), (660, 545), (638, 552), (636, 584), (600, 584), (584, 562)], '628 500', None),
    ('slotLid', [(676, 578), (870, 578), (870, 636), (676, 636)], '690 600', None),
], 'contact-apoyado.json', extra_fill=[apo_shadow, [(676, 578), (870, 578), (870, 636), (676, 636)]], additions=envelope(773, 450, 578, (976, 640))).replace('data-scene="contactm"', 'data-scene="contact"')
open(OUT + 'ContactScene.astro', 'w').write(HEADER.format(extra="; variant: 'desktop' | 'mobile'", extra2=', variant')
    + "{variant === 'desktop' ? (\n" + desk + "\n) : (\n" + mob + "\n)}\n")
if __name__ == '__main__':
    print('ok')
