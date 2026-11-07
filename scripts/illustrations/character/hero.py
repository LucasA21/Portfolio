#!/usr/bin/env python3
"""Pilot: the hero as a layered rig built from the ORIGINAL art (public/hero-illustration.svg).

The look is the original's exactly: every moving part is a clipped copy of the same filled art, with a skin-coloured
silhouette underneath so it hides what it passes over. What the original never drew (the torso flank under the arm,
the grip and open hands) is generated with the measured style (style.py, stroke.py).
Run (no dependencies):  python3 -I scripts/illustrations/character/hero.py
Writes src/components/character/hero-<pose>.svg and rig.json.
"""
import json, math, os, random, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style import INK, BG, VB, W_TYPICAL, W_THIN
from stroke import line, spline
from poses import POSES, DEFAULTS, LIMITS

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, 'src/components/character')
K = 1 / 1.478  # region coordinates below were read off the hero rendered 1500 px wide


def V(pts): return [(round(x * K, 1), round(y * K, 1)) for x, y in pts]
def d_of(P): return 'M' + 'L'.join(f'{x} {y}' for x, y in P) + 'Z'


def inset(P, d=1.2):
    cx = sum(p[0] for p in P) / len(P); cy = sum(p[1] for p in P) / len(P)
    return [(x - (x - cx) / (math.hypot(x - cx, y - cy) or 1) * d, y - (y - cy) / (math.hypot(x - cx, y - cy) or 1) * d) for x, y in P]


# ---- cut regions (partition of the original ink) and silhouettes (skin fill under each moving part), in 1500 px space ----
R = {
    'head': [(380, 150), (700, 150), (700, 445), (660, 490), (640, 498), (470, 498), (380, 498)],
    'torso': [(446, 491), (570, 491), (690, 540), (742, 652), (590, 646), (547, 828), (396, 828), (396, 515)],
    # Upper arm owns the shoulder outline, the crease and the outer curve of the elbow (down to its bottom).
    'upper': [(446, 490), (396, 515), (397, 690), (372, 786), (300, 786), (300, 872), (222, 872), (222, 768), (255, 645), (300, 575), (362, 522)],
    'fore': [(300, 750), (436, 750), (436, 872), (300, 872)],
    'hand': [(436, 750), (574, 750), (571, 769), (544, 862), (436, 862)],
    'laptop': [(590, 646), (884, 645), (890, 668), (836, 874), (536, 874), (543, 845), (577, 700)],
}
SIL = {
    'torso': [(430, 509), (560, 512), (690, 545), (740, 648), (610, 648), (556, 858), (392, 858), (385, 650), (396, 540)],
    'upper': [(436, 519), (370, 540), (325, 563), (295, 590), (270, 640), (250, 700), (238, 760), (232, 812), (245, 850), (280, 868), (300, 869), (300, 790), (398, 790), (398, 546)],
    'fore': [(300, 790), (372, 790), (380, 772), (442, 780), (444, 842), (420, 853), (330, 869), (300, 869)],
    'hand': [(440, 782), (480, 786), (520, 774), (548, 802), (543, 856), (440, 860)],
    'laptop': [(606, 650), (880, 648), (884, 668), (834, 872), (556, 872), (560, 845), (592, 702)],
}
# Joints (1500 px space): pivots where each part turns.
PIV_PX = {'waist': (500, 860), 'head': (515, 500), 'shoulder-front': (396, 527.5), 'elbow-front': (300, 822), 'wrist-front': (446, 822)}
PIV = {k: tuple(round(c, 1) for c in V([p])[0]) for k, p in PIV_PX.items()}


_INK = None


def _raster():
    """The original art as a 2 px/unit ink mask (needs rsvg-convert and ImageMagick, like the other scene scripts)."""
    global _INK
    if _INK is None:
        png = os.path.join(tempfile.mkdtemp(), 'hero.png')
        subprocess.run(['rsvg-convert', '-w', str(VB[0] * 2), '-b', 'white', os.path.join(ROOT, 'public/hero-illustration.svg'), '-o', png], check=True)
        raw = subprocess.run(['magick', png, '-colorspace', 'Gray', '-depth', '8', 'gray:-'], check=True, capture_output=True).stdout
        _INK = (raw, len(raw) // (VB[0] * 2))
    return _INK


# Edges of each cut region (index = edge from vertex i to i+1) that separate it from a moving neighbour; only these get round caps.
CUT_EDGES = {'head': {4: None, 5: None}, 'torso': {0: None, 6: (340, 370)}, 'upper': {1: (340, 370)}, 'fore': {1: (530, 540)}, 'hand': {}, 'laptop': {}}


def seam_caps(name):
    """Round caps where the cut edges of a piece slice through a stroke, so a separated piece ends in a rounded tip, not a blunt cut."""
    raw, H = _raster()
    W = VB[0] * 2
    P = V(R[name])
    out = []
    for ei, (a, b) in enumerate(zip(P, P[1:] + P[:1])):
        if ei not in CUT_EDGES[name]: continue
        yr = CUT_EDGES[name][ei]
        n = max(2, int(math.dist(a, b) * 4))
        run = []
        for i in range(n + 1):
            x, y = a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n
            px, py = int(x * 2), int(y * 2)
            hit = 0 <= px < W and 0 <= py < H and raw[py * W + px] < 128
            if hit: run.append((x, y))
            if (not hit or i == n) and run:
                length = len(run) / 4
                if 1.2 <= length <= 9 and (yr is None or yr[0] <= sum(p[1] for p in run) / len(run) <= yr[1]):
                    cx = sum(p[0] for p in run) / len(run); cy = sum(p[1] for p in run) / len(run)
                    r = min(length, 7.0) / 2
                    out.append(d_of([(round(cx + r * math.cos(t), 1), round(cy + r * math.sin(t), 1)) for t in [i * math.tau / 10 for i in range(10)]]))
                run = []
    return f'<path data-part="seam-caps" fill="{INK}" d="{"".join(out)}"/>' if out else ''


def elbow_bridge(e):
    """Arc along the outer edge of the elbow that closes the gap the cut leaves when the forearm turns."""
    if abs(e) < 3: return ''
    cx, cy = PIV['elbow-front']
    r = 47 * K
    lo, hi = (90 - e - 4, 90) if e > 0 else (90, 90 + abs(e) + 4)
    pts = [(cx + r * math.cos(math.radians(t)), cy + r * math.sin(math.radians(t))) for t in [lo + (hi - lo) * i / 6 for i in range(7)]]
    return f'<path data-part="elbow-bridge" fill="{INK}" d="{ink(pts, 6.6, 41, tip=6.6)}"/>'


def art():
    t = open(os.path.join(ROOT, 'public/hero-illustration.svg')).read()
    tr = re.search(r'<g transform="([^"]+)"', t).group(1)
    ps = ''.join(re.findall(r'<path d="[^"]+"\s*/>', t)).replace('\n', ' ')
    return tr, ps


def ink(P, w, seed, closed=False, wob=None, **kw):
    return line(P, w, random.Random(seed), closed=closed, **({'wob': wob} if wob is not None else {}), **kw)[0]


def laptop_edge_fix():
    """Fingertips merge into the laptop's left edge in the original; once the hand leaves, replace that stretch with a clean stroke."""
    ex = lambda y: 389.7 - 0.28 * (y - 520)
    ys = [530 + 8 * i for i in range(8)]
    patch = [(ex(y) - 6.5, y) for y in ys] + [(ex(y) + 6.5, y) for y in ys[::-1]]
    edge = [(ex(y), y) for y in (528, 545, 562, 579, 587)]
    return f'<path fill="{BG}" d="{d_of(patch)}"/><path fill="{INK}" d="{ink(edge, 5.8, 51, tip=5.8)}"/>'


def armpit():
    """Inner edge of the upper arm from the armpit down to the start of the crease the original draws."""
    return ink(V([(399, 596), (400, 640), (396, 690), (394, 704)]), W_TYPICAL, 6, tip=2.0, tip_end=1.6)


def elbow_cap():
    """Rounded elbow for when the arm is bent: the original sleeve only has its outline at rest."""
    cx, cy = PIV['elbow-front']
    ring = [(cx + 31 * math.cos(t), cy + 31 * math.sin(t)) for t in [i * math.tau / 14 for i in range(14)]]
    return d_of(ring), ink(ring, W_TYPICAL, 9, closed=True)


def torso_flank():
    """The side of the torso the arm normally hides: shoulder underside down to the desk."""
    return ink(V([(392, 640), (386, 720), (392, 840)]), W_TYPICAL, 5, tip=2.0)


def finger(A, B, ang, L):
    """One finger between two notch points A and B on the palm edge, pointing at `ang` degrees (local frame)."""
    mx, my = (A[0] + B[0]) / 2, (A[1] + B[1]) / 2
    w = math.dist(A, B)
    r = w / 2 * 0.92
    c, s_ = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    nx, ny = -s_, c
    tc = (mx + c * L, my + s_ * L)
    tl, tr = (tc[0] + nx * r, tc[1] + ny * r), (tc[0] - nx * r, tc[1] - ny * r)
    tip = (tc[0] + c * r * 0.9, tc[1] + s_ * r * 0.9)
    mid = lambda P, Q: ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
    return [A, mid(A, tl), tl, tip, tr, mid(B, tr), B]


def open_hand():
    """One continuous outline: wrist, thumb, four fingers that share notches, back to the wrist."""
    N = [(27, -12), (37, -6), (40, 4), (38, 13), (32, 20)]
    pts = [(0, -14)]
    pts += finger((12, -17), N[0], -62, 24)                        # thumb
    for i, (ang, L) in enumerate([(-17, 36), (-4, 42), (9, 39), (22, 29)]):
        pts += finger(N[i], N[i + 1], ang, L)[1:]
    pts += [(22, 21), (8, 19), (0, 15)]
    return pts


HANDS = {
    # Fist: back of the hand, four knuckle bumps and the thumb across the front.
    'grip': dict(scale=1.15, loop=[(0, -13), (18, -19), (38, -22), (54, -18), (63, -8), (64, 5), (58, 17), (46, 25), (28, 27), (12, 22), (0, 15)],
                 strokes=[[(63, -8), (54, -6), (47, -8)], [(64, 4), (55, 5), (48, 3)], [(59, 16), (51, 16), (45, 13)], [(14, -9), (30, -5), (46, -3)]]),
    # Open hand in the same language as the original's typing hand: a mitten with a thumb lobe and a few finger strokes.
    'open': dict(loop=[(0, -14), (12, -17), (24, -18), (29, -30), (38, -37), (45, -32), (39, -22), (36, -18), (48, -19), (62, -21), (75, -17), (82, -8), (84, 2), (80, 12), (70, 19), (56, 21), (40, 21), (24, 21), (8, 19), (0, 15)],
                 strokes=[[(81, -9), (67, -8), (56, -9)], [(83, 1), (69, 1), (58, 1)], [(79, 11), (66, 11), (56, 10)], [(30, -17), (37, -10), (46, -6)]]),
}


def hand_variant(name, wrist, ang):
    h = HANDS[name]
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    sc = h.get('scale', 1.0)
    T = lambda q: (wrist[0] + sc * (q[0] * c - q[1] * s), wrist[1] + sc * (q[0] * s + q[1] * c))
    loop = [T(q) for q in h['loop']]
    out = f'<path fill="{BG}" d="{d_of(spline(loop, True, 3.0))}"/><path fill="{INK}" d="{ink(loop, 5.9, 7, closed=True)}"/>'
    for i, st in enumerate(h['strokes']):
        out += f'<path fill="{INK}" d="{ink([T(q) for q in st], W_THIN + 0.4, 8 + i, tip=0.9)}"/>'
    return out


def elbow_ring(pz):
    if abs(pz['elbow-front']) <= 60: return ''
    fill, ring = elbow_cap()
    return f'<g data-part="elbow-cap"><path fill="{BG}" d="{fill}"/><path fill="{INK}" d="{ring}"/></g>'


def build(pose, sid=None, live=False):
    """live=True keeps every optional piece in the SVG, hidden and tagged data-when="arm-away", so rig.ts can toggle them."""
    sid = sid or f'hero-{pose}'
    pz = {**DEFAULTS, **POSES[pose]}
    tr, ps = art()
    u = f'{sid}-art'
    cut = lambda names: ''.join(d_of(V(R[n])) for n in names)  # no inset: every piece sits on a skin silhouette, so seams stay invisible
    clip = lambda name, d: f'<clipPath id="{sid}-c-{name}"><path clip-rule="evenodd" d="{d}"/></clipPath>'
    defs = f'<g id="{u}" transform="{tr}" fill="{INK}" stroke="none">{ps}</g>'
    full = f'M-50 -50H{VB[0] + 50}V{VB[1] + 50}H-50Z'
    # Holes are painted black in a mask (not evenodd), so neighbouring pieces that overlap never bring the ink back.
    mask = lambda name, names: (f'<mask id="{sid}-m-{name}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="{VB[0] + 100}" height="{VB[1] + 100}">'
                                f'<rect x="-50" y="-50" width="{VB[0] + 100}" height="{VB[1] + 100}" fill="white"/>'
                                + ''.join(f'<path fill="black" d="{d_of(V(R[n]))}"/>' for n in names) + '</mask>')
    defs += mask('body', ['head', 'torso', 'upper', 'fore', 'hand', 'laptop'])
    defs += mask('not-arm', ['upper', 'fore', 'hand'])
    defs += mask('not-upper-hand', ['upper', 'hand'])
    defs += mask('not-hand', ['hand'])
    for n in ('head', 'torso', 'fore', 'upper', 'hand', 'laptop'): defs += clip(n, d_of(V(R[n])))
    twice = {'torso': 'not-arm', 'fore': 'not-upper-hand', 'laptop': 'not-hand'}
    use = lambda n: (f'<g clip-path="url(#{sid}-c-{n})"><use href="#{u}" mask="url(#{sid}-m-{twice[n]})"/></g>' if n in twice
                     else f'<use href="#{u}" mask="url(#{sid}-m-body)"/>' if n == 'body'
                     else f'<use href="#{u}" clip-path="url(#{sid}-c-{n})"/>')
    sil = lambda n: f'<path fill="{BG}" d="{d_of(V(SIL[n]))}"/>'

    def rot(name, a):
        x, y = PIV[name]
        return f' data-joint="{name}" data-pivot="{x} {y}" transform="rotate({a} {x} {y})"'

    hv = pz['hand-front']
    hands = f'<g data-part="hand-front-type"{"" if hv == "type" else " style=\"display:none\""}>{sil("hand")}{use("hand")}{seam_caps("hand")}</g>'
    for v in HANDS:
        # Wrist at the cuff, fingers pointing along the forearm (about 6 degrees below horizontal at rest).
        hands += f'<g data-part="hand-front-{v}"{"" if hv == v else " style=\"display:none\""}>{hand_variant(v, V([PIV_PX["wrist-front"]])[0], 6)}</g>'
    front = (f'<g{rot("shoulder-front", pz["shoulder-front"])}><g data-part="upper-front">{sil("upper")}{use("upper")}{seam_caps("upper")}<path fill="{INK}" d="{armpit()}"{"" if abs(pz["shoulder-front"]) > 15 else " style=\"display:none\""} data-part="armpit"/></g>'
             f'{elbow_ring(pz)}<g{rot("elbow-front", pz["elbow-front"])}><g data-part="fore-front">{sil("fore")}{use("fore")}{seam_caps("fore")}{elbow_bridge(pz["elbow-front"])}</g>'
             f'<g{rot("wrist-front", pz["wrist-front"])}>{hands}</g></g></g>')
    head = f'<g{rot("head", pz["head"])}><g data-part="head">{use("head")}{seam_caps("head")}</g></g>'
    # The desk line under the resting arm is the same stroke as the arm's underside: redraw it when the arm leaves.
    desk_fill = '' if hv == 'type' else f'<path data-part="desk-fill" fill="{INK}" d="{ink(V([(200, 878.4), (330, 878.4), (456, 878.4)]), 6.4, 31, tip=6.4, wob=0)}"/>'
    lip = ''
    torso = f'<g data-part="torso">{lip}{sil("torso")}<path fill="{INK}" d="{torso_flank()}"/>{use("torso")}{seam_caps("torso")}</g>'
    waist = f'<g{rot("waist", pz["waist"])}>'
    laptop = f'<g data-part="laptop">{sil("laptop")}{use("laptop")}{"" if hv == "type" else laptop_edge_fix()}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB[0]} {VB[1]}" fill="none" data-character="hero" data-pose="{pose}">'
            f'<defs>{defs}</defs><g data-part="body">{use("body")}{desk_fill}</g>'
            f'{waist}{torso}{head}</g>{laptop}{waist}{front}</g></svg>\n')


def rig():
    return {'viewBox': list(VB), 'pivots': {k: list(v) for k, v in PIV.items()}, 'limits': {k: list(v) for k, v in LIMITS.items() if k in PIV},
            'hands': ['type'] + list(HANDS), 'poses': POSES,
            'note': 'Parts are clipped copies of public/hero-illustration.svg. "waist" appears twice (torso+head and front arm): rotate both with [data-joint="waist"]. Back arm and eyes-closed come in phase 3.'}


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    for pose in POSES:
        svg = build(pose)
        assert 'nan' not in svg
        open(os.path.join(OUT, f'hero-{pose}.svg'), 'w').write(svg)
        print(pose, round(len(svg.encode()) / 1024, 1), 'KB')
    json.dump(rig(), open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
