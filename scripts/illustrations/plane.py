#!/usr/bin/env python3
"""Paper plane pieces in three variants (A, B, C): filled outlines with variable width.

Each stroke is a tapered filled polygon (thin tips, thick middle), like the potrace scenes.
Pieces per variant: plane, plane-pinned, sheet, unfold-1, unfold-2, fold-1, fold-2.
Run: python3 -I scripts/illustrations/plane.py   (no dependencies, fixed seeds)
"""
import math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'src/components/planes')
INK, BG = '#531F1F', '#F6F5F1'
VB = (124, 72)  # nose points to +x so MotionPath autoRotate works


def lerp(a, b, t): return a + (b - a) * t
def lerp2(p, q, t): return (lerp(p[0], q[0], t), lerp(p[1], q[1], t))
def d(P): return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in P) + 'Z'


class Pen:
    def __init__(self, seed, w, jitter, bow, noise):
        self.r, self.w, self.jitter, self.bow, self.noise = random.Random(seed), w, jitter, bow, noise
        self.faces, self.ink = [], []

    def j(self, p):
        return (p[0] + self.r.uniform(-1, 1) * self.jitter, p[1] + self.r.uniform(-1, 1) * self.jitter)

    def face(self, pts, fill=BG): self.faces.append((d(pts), fill))

    def stroke(self, a, b, k=1.0, over=0.0, tp=0.3):
        """One tapered stroke a to b; k scales width; over lets the stroke overshoot b (hand feel)."""
        (x0, y0), (x1, y1) = a, b
        L = math.hypot(x1 - x0, y1 - y0) or 1
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        x1, y1 = x1 + ux * over, y1 + uy * over
        nx, ny = -uy, ux
        bow = self.r.uniform(-1, 1) * self.bow
        w = self.w * k * (1 + self.r.uniform(-1, 1) * self.noise)
        n = max(8, int(L / 3))
        left, right = [], []
        for i in range(n + 1):
            t = i / n
            off = bow * math.sin(math.pi * t)
            cx, cy = lerp(x0, x1, t) + nx * off, lerp(y0, y1, t) + ny * off
            hw = max(0.45, w * (tp + (1 - tp) * math.sin(math.pi * t) ** 0.6)) / 2
            left.append((cx + nx * hw, cy + ny * hw))
            right.append((cx - nx * hw, cy - ny * hw))
        self.ink.append(d(left + right[::-1]))

    def loop(self, c, rad, k=1.0):
        pts = [(c[0] + rad * math.cos(a), c[1] + rad * math.sin(a)) for a in [i * math.tau / 10 for i in range(11)]]
        for a, b in zip(pts, pts[1:]): self.stroke(a, b, k)

    def svg(self):
        body = ''.join(f'<path fill="{c}" d="{f}"/>' for f, c in self.faces) + f'<path fill="{INK}" d="{"".join(self.ink)}"/>'
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB[0]} {VB[1]}" fill="none">{body}</svg>\n'


# Dart geometry per variant (before jitter): nose, far wing tip, near wing tip, tail on the ridge, keel tail.
DART = {
    'A': dict(N=(118, 36), W1=(8, 14), W2=(6, 66), F=(30, 37), K=(22, 52), pen=(1, 4.6, 0.7, 0.6, 0.08), crease=True, shade='#E6E1D4'),
    'B': dict(N=(120, 33), W1=(4, 4), W2=(13, 66), F=(28, 37), K=(19, 52), pen=(2, 5.5, 2.4, 2.6, 0.35), crease=True, over=3.0),
    'C': dict(N=(98, 36), W1=(24, 4), W2=(26, 68), F=(46, 36), K=(40, 54), pen=(3, 5.6, 0.3, 0.0, 0.1), crease=True, flap=True),
}
SHEET = dict(tl=(10, 12), tr=(112, 8), br=(116, 60), bl=(8, 64))
ENV = dict(x0=12, x1=112, y0=5, y1=68)  # same 140:88 proportion as the mailbox envelope, scaled


def pen_for(v): return Pen(*DART[v]['pen'])


def draw_plane(v, pen=None, rot=0, shift=(0, 0), scale=1.0):
    g = DART[v]
    pen = pen or pen_for(v)
    cx, cy = 62, 36

    def T(p):
        x, y = pen.j(p)
        x, y = (x - cx) * scale, (y - cy) * scale
        c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        return (cx + shift[0] + x * c - y * s, cy + shift[1] + x * s + y * c)

    N, W1, W2, F, K = (T(g[k]) for k in ('N', 'W1', 'W2', 'F', 'K'))
    shade = g.get('shade', BG)  # 3/4 look: the far wing and the keel read darker than the near wing face
    pen.face([W1, N, F], shade)
    pen.face([N, W2, F])
    pen.face([N, F, K], shade)
    ov = g.get('over', 0)
    pen.stroke(W1, N, 1.0, ov)
    pen.stroke(N, W2, 1.0)
    pen.stroke(W2, F, 0.9)
    pen.stroke(F, W1, 0.9)
    pen.stroke(N, F, 1.35, ov)        # ridge: the central fold, heaviest line
    pen.stroke(F, K, 1.1)
    pen.stroke(N, K, 1.1)             # keel
    if g['crease']:
        mid = lerp2(W1, N, 0.52)
        pen.stroke(mid, lerp2(F, W1, 0.15), 0.5)  # wing crease, thinner
    if g.get('flap'):
        pen.stroke(lerp2(W2, F, 0.45), lerp2(N, W2, 0.5), 0.5)
    return pen


def pinned(v):
    pen = pen_for(v)
    draw_plane(v, pen, rot=-9, shift=(0, 0), scale=0.82)
    x = 64
    pen.stroke((x - 7, 9), (x + 7, 9), 1.5, tp=0.6)        # cap
    pen.stroke((x - 4, 10), (x - 2, 17), 0.8, tp=0.6)      # body
    pen.stroke((x + 4, 10), (x + 2, 17), 0.8, tp=0.6)
    pen.stroke((x - 2, 17), (x + 2, 17), 0.8, tp=0.6)
    pen.stroke((x, 17), (x - 0.5, 25), 0.5)                # needle into the paper
    return pen


# Dart silhouette as 6 points that map one-to-one onto the sheet corners (+ two on the left edge).
def silhouette(v):
    g = DART[v]
    return [g['W1'], g['N'], g['N'], g['W2'], g['K'], g['F']]


def sheet_pts():
    s = SHEET
    left = lambda t: lerp2(s['bl'], s['tl'], t)
    return [s['tl'], s['tr'], s['br'], s['bl'], left(0.33), left(0.66)]


def morph(v, t, pen):
    """Frame t in 0..1 from the dart silhouette (0) to the open sheet (1)."""
    P = [lerp2(a, b, t) for a, b in zip(silhouette(v), sheet_pts())]
    pen.face([pen.j(p) for p in P])
    P = [pen.j(p) for p in P]
    for i, (a, b) in enumerate(zip(P, P[1:] + P[:1])):
        if a != b and math.dist(a, b) > 2: pen.stroke(a, b, 1.0, tp=1.0 if i >= 4 or i == 3 else 0.3)
    g = DART[v]
    ridge_a = lerp2(g['N'], lerp2(SHEET['tr'], SHEET['br'], 0.5), t)
    ridge_b = lerp2(g['F'], lerp2(SHEET['tl'], SHEET['bl'], 0.5), t)
    pen.stroke(ridge_a, ridge_b, 0.7)
    if t > 0.5:  # diagonal folds of the old wings fade in
        k = ((t - 0.5) * 2) * 0.55
        top, bot = lerp2(P[0], P[1], 0.5), lerp2(P[3], P[2], 0.5)
        pen.stroke(top, ridge_a, k)
        pen.stroke(bot, ridge_a, k)
    return pen


def sheet(v):
    pen = pen_for(v)
    morph(v, 1.0, pen)
    return pen


def fold(v, t):
    """Sheet (t=0) folding into the envelope rectangle (t=1, flap drawn)."""
    pen = pen_for(v)
    s, e = SHEET, ENV
    tgt = dict(tl=(e['x0'], e['y0']), tr=(e['x1'], e['y0']), br=(e['x1'], e['y1']), bl=(e['x0'], e['y1']))
    P = [pen.j(lerp2(s[k], tgt[k], t)) for k in ('tl', 'tr', 'br', 'bl')]
    pen.face(P)
    for a, b in zip(P, P[1:] + P[:1]): pen.stroke(a, b, 1.0)
    for f in (0.34, 0.67):  # horizontal folds that stack the sheet into a letter
        pen.stroke(lerp2(P[0], P[3], f), lerp2(P[1], P[2], f), 0.55 * (1 - 0.4 * t))
    if t > 0.5:  # flap V grows in
        k = (t - 0.5) * 2
        apex = lerp2(lerp2(P[0], P[1], 0.5), lerp2(P[3], P[2], 0.5), 0.55 * k)
        pen.stroke(P[0], apex, 0.9)
        pen.stroke(apex, P[1], 0.9)
    return pen


PIECES = {
    'plane': lambda v: draw_plane(v),
    'plane-pinned': pinned,
    'sheet': sheet,
    'unfold-1': lambda v: morph(v, 0.4, pen_for(v)),
    'unfold-2': lambda v: morph(v, 0.75, pen_for(v)),
    'fold-1': lambda v: fold(v, 0.4),
    'fold-2': lambda v: fold(v, 0.8),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for v in DART:
        for name, make in PIECES.items():
            svg = make(v).svg()
            assert svg.count('<path') >= 2 and 'nan' not in svg
            with open(os.path.join(OUT, f'{v.lower()}-{name}.svg'), 'w') as f: f.write(svg)
    print('ok', len(os.listdir(OUT)), 'files in', OUT)
