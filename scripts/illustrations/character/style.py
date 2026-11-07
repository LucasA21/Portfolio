"""Ink style measured from the current scenes (public/hero-illustration.svg, contact-*.svg).

Method: render at 2030 px, Euclidean distance transform, keep ridge pixels (stroke centre lines), read the
radius there. Numbers are in hero viewBox units (1015 wide), stroke width = 2 x radius:
    p5 (thin)   ~5.0     typical (median) ~6.0     p75 ~6.8     p95 ~7.0     max (heavy edge / filled areas) ~14
The tips of the drawn lines taper to a point, and each line wobbles a little; strokes are filled outlines
(potrace), never uniform `stroke`.
"""
INK = '#531F1F'
BG = '#F6F5F1'
VB = (1015, 1009)  # same canvas as the hero scene, so a pilot can be laid over the original

W_TYPICAL = 6.0   # width of a normal line
W_HEAVY = 9.0     # silhouette lines of the big shapes (torso, arms)
W_THIN = 3.6      # details: creases, fingers, hair curls
W_TIP = 1.4       # width where a line ends (points, not blunt caps)
WOBBLE = 0.9      # random offset of the control points, in units
