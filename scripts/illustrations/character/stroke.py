"""Centre lines -> filled outlines with variable width (thin tips, thicker middle). No dependencies."""
import math, random

from style import W_TIP, WOBBLE


def spline(pts, closed=False, step=3.0):
    """Catmull-Rom curve through pts, sampled about every `step` units."""
    n = len(pts)
    P = (lambda i: pts[i % n]) if closed else (lambda i: pts[max(0, min(n - 1, i))])
    out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        k = max(2, int(math.dist(p1, p2) / step))
        for s in range(k):
            t = s / k
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    if not closed: out.append(tuple(pts[-1]))
    return out


def wobble(pts, rng, amt=WOBBLE):
    return [(x + rng.uniform(-amt, amt), y + rng.uniform(-amt, amt)) for x, y in pts]


def d_of(P, closed=True):
    return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in P) + ('Z' if closed else '')


def ribbon(C, widths, closed=False):
    """Outline around the centre samples C with half-widths `widths`: one polygon, or two rings (a loop) when closed."""
    L, R = [], []
    n = len(C)
    for i, (x, y) in enumerate(C):
        a, b = (C[(i - 1) % n], C[(i + 1) % n]) if closed else (C[max(0, i - 1)], C[min(n - 1, i + 1)])
        dx, dy = b[0] - a[0], b[1] - a[1]
        m = math.hypot(dx, dy) or 1
        nx, ny = -dy / m, dx / m
        L.append((x + nx * widths[i], y + ny * widths[i]))
        R.append((x - nx * widths[i], y - ny * widths[i]))
    return (L, R[::-1]) if closed else L + R[::-1]


def line(pts, w, rng, tip=W_TIP, tip_end=None, closed=False, wob=WOBBLE):
    """One brush line. Returns (ink polygon path, centre-line path for the draw-in mask).
    The width swells from `tip` at the start to w in the middle and back to `tip_end` at the end."""
    C = spline(wobble(pts, rng, wob), closed)
    n = len(C)
    te = tip if tip_end is None else tip_end
    W = []
    for i in range(n):
        t = i / (n - 1) if n > 1 else 0
        if closed:
            W.append(w * (1 + 0.22 * math.sin(t * math.tau * 2 + 1.0)) / 2)
        else:
            e = math.sin(math.pi * t) ** 0.55
            lo = tip + (te - tip) * t
            W.append(max(lo, lo + (w - lo) * e) / 2)
    r = ribbon(C, W, closed)
    return (d_of(r[0]) + d_of(r[1]) if closed else d_of(r)), d_of(C, closed)


def fill(pts, closed=True):
    return d_of(spline(pts, closed, 6.0))
