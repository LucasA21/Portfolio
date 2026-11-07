"""Poses = joint angles in degrees (positive = clockwise on screen), relative to the rest pose (`typing`).
`hand-*` picks the hand variant; `eyes` picks open or closed."""
POSES = {
    'typing': dict(),
    # Underhand toss: grab the plane at the laptop, swing the arm back and down (windup), then forward and up over the laptop (release).
    # The elbow keeps its rest bend (the original sleeve is one L-shaped piece, so its lines never break). Head turns need the neck redrawn: phase 4.
    'throw-windup': {'waist': -4, 'shoulder-front': 50, 'wrist-front': 12, 'hand-front': 'grip'},
    'throw-release': {'waist': 4, 'shoulder-front': -80, 'wrist-front': -8, 'hand-front': 'open'},
}
DEFAULTS = {'waist': 0, 'head': 0, 'shoulder-front': 0, 'elbow-front': 0, 'wrist-front': 0, 'hand-front': 'type'}
# Limits per joint (min, max) in degrees, exported to rig.json.
LIMITS = {'waist': (-12, 12), 'head': (-25, 25), 'shoulder-front': (-160, 160), 'elbow-front': (-10, 170), 'wrist-front': (-45, 45)}
