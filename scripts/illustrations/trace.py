# Centerline tracer: SVG -> PNG -> skeleton -> polylines (viewBox units, with half widths) as JSON.
import sys, json, subprocess, re, numpy as np
sys.setrecursionlimit(100000)
from skimage import io, morphology, color
from scipy import ndimage as ndi
src, name = sys.argv[1], sys.argv[2]
svg = open(src).read()
vb = list(map(float, re.search(r'viewBox="([^"]+)"', svg).group(1).split()))
W = int(vb[2] * 2)
png = f'{name}.png'
subprocess.run(['magick', '-background', 'white', '-density', str(72 * W / vb[2] * 0.8), src, '-resize', f'{W}x', '-flatten', png], check=True)
img = io.imread(png)
g = color.rgb2gray(img[..., :3]) if img.ndim == 3 else img / 255
ink = g < 0.6
sc = vb[2] / ink.shape[1]
dist = ndi.distance_transform_edt(ink)
sk = morphology.skeletonize(ink)
ys, xs = np.nonzero(sk)
pts = set(zip(ys.tolist(), xs.tolist()))
nb = lambda p: [(p[0]+dy, p[1]+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (p[0]+dy, p[1]+dx) in pts]
deg = {p: len(nb(p)) for p in pts}
nodes = {p for p, d in deg.items() if d != 2}
seen = set(); lines = []
def walk(a, b):
    line = [a, b]; prev, cur = a, b
    while cur not in nodes:
        n = [q for q in nb(cur) if q != prev and (min(cur, q), max(cur, q)) not in seen]
        if not n: break
        seen.add((min(cur, n[0]), max(cur, n[0])))
        prev, cur = cur, n[0]; line.append(cur)
    return line
for a in nodes:
    for b in nb(a):
        e = (min(a, b), max(a, b))
        if e in seen: continue
        seen.add(e); lines.append(walk(a, b))
for p in [p for p in pts if deg[p] == 2]:
    if any((min(p, q), max(p, q)) in seen for q in nb(p)): continue
    q = nb(p)[0]; seen.add((min(p, q), max(p, q))); nodes.add(p); lines.append(walk(p, q))
def rdp(P, eps):
    if len(P) < 3: return P
    a, b = P[0], P[-1]; d = (b[0]-a[0], b[1]-a[1]); L = (d[0]**2+d[1]**2) ** .5 or 1
    dd = [abs(d[0]*(p[1]-a[1]) - d[1]*(p[0]-a[0])) / L for p in P[1:-1]]
    i = int(np.argmax(dd)) + 1
    return rdp(P[:i+1], eps)[:-1] + rdp(P[i:], eps) if dd[i-1] > eps else [P[0], P[-1]]
out = []
for l in lines:
    if len(l) < 3: continue
    P = [(x * sc + vb[0], y * sc + vb[1]) for y, x in l]
    hw = {P[k]: float(dist[y, x]) * sc for k, (y, x) in enumerate(l)}
    P = rdp(P, 0.9)
    out.append([[round(x, 1), round(y, 1), round(hw[(x, y)], 2)] for x, y in P])
json.dump({'viewBox': vb, 'lines': out}, open(f'{name}.json', 'w'))
print(name, 'lines', len(out))
