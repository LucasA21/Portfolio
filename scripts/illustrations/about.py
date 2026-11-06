# "Sobre mí" scene from the user's drawing (source/sobre-mi.png, transparent PNG with brown ink).
# The raster is the visible art; a skeleton of its strokes becomes a mask so the ink can be drawn in,
# and the pen hand is a clipped copy that jiggles while the scroll draws the board.
# Needs: python3 with scikit-image + scipy + numpy, and ImageMagick. Run from the repo root:
#   python3 scripts/illustrations/about.py
import json, math, os, subprocess, sys
import numpy as np
from skimage import io, measure, morphology
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scenes import OUT, ROOT, HEADER, poly

SRC = os.path.join(ROOT, 'scripts/illustrations/source/sobre-mi.png')
WEBP = os.path.join(ROOT, 'public/sobre-mi.webp')
sys.setrecursionlimit(100000)

im = io.imread(SRC)
ink = im[..., 3] > 110
ys, xs = np.nonzero(ink)
M = 30
X0, Y0, X1, Y1 = xs.min() - M, ys.min() - M, xs.max() + M, ys.max() + M
W, H = X1 - X0, Y1 - Y0
SCALE = 0.75
subprocess.run(['magick', SRC, '-crop', f'{W}x{H}+{X0}+{Y0}', '+repage', '-resize', f'{round(W * SCALE)}x', '-quality', '88', '-define', 'webp:alpha-quality=95', WEBP], check=True)

# ---- skeleton -> polylines (px of the source canvas) ----
dist = __import__('scipy.ndimage', fromlist=['x']).distance_transform_edt(ink)
sk = morphology.skeletonize(ink)
pts = set(zip(*[a.tolist() for a in np.nonzero(sk)]))
nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
deg = {p: len(nb(p)) for p in pts}
nodes = {p for p, d in deg.items() if d != 2}
seen, raw = set(), []
def walk(a, b):
    line = [a, b]; prev, cur = a, b
    while cur not in nodes:
        n = [q for q in nb(cur) if q != prev and (min(cur, q), max(cur, q)) not in seen]
        if not n: break
        seen.add((min(cur, n[0]), max(cur, n[0]))); prev, cur = cur, n[0]; line.append(cur)
    return line
for a in nodes:
    for b in nb(a):
        e = (min(a, b), max(a, b))
        if e not in seen: seen.add(e); raw.append(walk(a, b))
for p in [p for p in pts if deg[p] == 2]:
    if any((min(p, q), max(p, q)) in seen for q in nb(p)): continue
    q = nb(p)[0]; seen.add((min(p, q), max(p, q))); nodes.add(p); raw.append(walk(p, q))

def rdp(P, eps):
    if len(P) < 3: return P
    a, b = P[0], P[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
    dd = [abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / L for p in P[1:-1]]
    i = int(np.argmax(dd)) + 1
    return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps) if dd[i - 1] > eps else [a, b]

lab = measure.label(__import__('skimage.morphology', fromlist=['x']).dilation(ink, morphology.disk(3)), connectivity=2)
props = {r.label: r for r in measure.regionprops(lab)}
big = max(props.values(), key=lambda r: r.area).label

def rank(cx, cy):
    # Order in which the pen "writes" the board, in the 1000-wide view of the drawing (px / 1.792).
    if cx < 330: return 0 if cy > 440 else 1
    if cy < 260: return 2
    if 540 < cx < 640 and 260 < cy < 340: return 3
    if 730 < cx < 780 and 330 < cy < 420: return 4
    if 680 < cx < 715 and 440 < cy < 490: return 5
    if 730 < cx < 820 and 410 < cy < 470: return 99
    return 6 + cx / 1000

def classify(l):
    y, x = l[len(l) // 2]
    c = lab[int(y), int(x)]
    if c == 0 or c == big: return 'static', 0, (x, y)
    r = props[c]; cy, cx = r.centroid
    vx, vy = cx / 1.792, cy / 1.792
    if 340 < vx < 520 and 200 < vy < 420: return 'static', 0, (x, y)  # curls inside the hair
    return 'content', rank(vx, vy), (cx, cy)

lines = []
for l in raw:
    if len(l) < 4: continue
    hw = max(float(dist[y, x]) for y, x in l)
    P = rdp([(x, y) for y, x in l], 1.1)
    kind, order, centre = classify(l)
    lines.append((kind, order, centre, P, hw))
content = sorted([t for t in lines if t[0] == 'content'], key=lambda t: (t[1], t[2][0] * 0 + t[2][1]))
static = sorted([t for t in lines if t[0] == 'static'], key=lambda t: (sum(p[1] for p in t[3]) / len(t[3]) + sum(p[0] for p in t[3]) / len(t[3]) * 0.3))

def pd(P): return 'M' + 'L'.join(f'{x:.0f} {y:.0f}' for x, y in P)
mask = []
for kind, order, centre, P, hw in static:
    mask.append(f'<path data-reveal="" d="{pd(P)}" stroke-width="{hw * 2 + 10:.0f}"/>')
for k, (kind, order, centre, P, hw) in enumerate(content):
    mask.append(f'<path data-reveal="" data-content="{order}" d="{pd(P)}" stroke-width="{hw * 2 + 10:.0f}"/>')

# ---- parts: the pen hand, pivoting at the wrist ----
def inset(p, d=2.0):
    cx = sum(a for a, b in p) / len(p); cy = sum(b for a, b in p) / len(p)
    return [(round(a - (a - cx) / (math.hypot(a - cx, b - cy) or 1) * d, 1), round(b - (b - cy) / (math.hypot(a - cx, b - cy) or 1) * d, 1)) for a, b in p]
hand = [(1179, 423), (1321, 423), (1321, 566), (1268, 614), (1186, 581), (1177, 573)]
PIVOT = '1229 598'
img = f'<image href="/sobre-mi.webp" x="{X0}" y="{Y0}" width="{W}" height="{H}" preserveAspectRatio="none"/>'
clips = (f'<clipPath id={{`c-body-${{uid}}`}}><path clip-rule="evenodd" d="M{X0 - 50} {Y0 - 50}H{X1 + 50}V{Y1 + 50}H{X0 - 50}Z{poly(inset(hand))}"/></clipPath>'
         f'<clipPath id={{`c-hand-${{uid}}`}}><path d="{poly(hand)}"/></clipPath>')

# ---- thread routes inside the drawing (px): in from the top to the pen, out from the envelope to the bottom ----
route_in = 'M1262 %d C1262 330 1236 380 1189 437' % Y0
route_out = f'M1458 792 C1480 796 1498 840 1498 930 C1498 1500 1480 1700 1500 2080 L1500 {Y1}'

svg = (f'<svg data-scene="about" viewBox="{X0} {Y0} {W} {H}" class={{className}} role="img" '
       f'aria-label="Lucas de espaldas dibujando en una pizarra un esquema que termina en un sobre" fill="none" stroke="#531F1F" stroke-linecap="round" stroke-linejoin="round">'
       f'<defs>{clips}<mask id={{`m-about-${{uid}}`}} maskUnits="userSpaceOnUse" x="{X0 - 40}" y="{Y0 - 40}" width="{W + 80}" height="{H + 80}">'
       f'<g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">{"".join(mask)}</g></mask></defs>'
       f'<g data-ink="" mask={{`url(#m-about-${{uid}})`}}>'
       f'<g data-part="body"><g clip-path={{`url(#c-body-${{uid}})`}}>{img}</g></g>'
       f'<g data-part="hand" data-origin="{PIVOT}"><g clip-path={{`url(#c-hand-${{uid}})`}}>{img}</g></g></g>'
       f'<path data-thread-path="about-in" d="{route_in}" stroke="none"/>'
       f'<path data-thread-path="about-out" d="{route_out}" stroke="none"/></svg>')
open(OUT + 'AboutScene.astro', 'w').write(HEADER.format(extra='', extra2='') + svg)
print('about ok', W, H, 'static', len(static), 'content', len(content), 'webp', os.path.getsize(WEBP) // 1024, 'KB')
