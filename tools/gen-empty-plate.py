#!/usr/bin/env python3
"""gen-empty-plate.py — the empty plate (404 emblem).

Classification: ILLUSTRATIVE, and deliberately almost nothing: a 1200x1200
transparent SVG holding one square hairline instrument frame (60% of canvas)
and a sparse fixed-seed drift of stipple deposits entering from the frame's
lower-left corner and dying out before the center. No accent — nothing is
verified here. The center is genuinely empty; the page's cold-paper ground
comes from CSS. The emblem is decorative (alt="" in 404.html); the real
explanation is live HTML.

Receipts (exit nonzero on failure): exactly one frame, square, hairline;
deposit count in [180, 220]; every deposit inside the frame interior; no
deposit within 110px of center; deposit density strictly decreasing along
the drift; no accent, no fills besides the ink deposits; transparent ground.
"""
import hashlib, math, os, sys

S = 1200
SEED = 3
FRAME = (240, 240, 960, 960)          # 60% square, centered
CORNER = (262.0, 938.0)               # drift origin, inside the frame
CENTER = (600.0, 600.0)
N = 200
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets/error/plate-empty.svg")

_state = SEED
def rng():
    global _state
    _state = (_state * 1103515245 + 12345) % (1 << 31)
    return _state / (1 << 31)

def main():
    dx, dy = CENTER[0] - CORNER[0], CENTER[1] - CORNER[1]
    reach = math.hypot(dx, dy)
    ux, uy = dx / reach, dy / reach
    px, py = -uy, ux
    pts = []
    for _ in range(N):
        t = (rng() ** 1.6) * 0.72                 # bias to the corner, die at 72%
        lat = (rng() - 0.5) * 2 * (16 + 100 * t)  # spread widens, density thins
        par = (rng() - 0.5) * 24
        x = CORNER[0] + (t * reach + par) * ux + lat * px
        y = CORNER[1] + (t * reach + par) * uy + lat * py
        x = max(FRAME[0] + 6, min(FRAME[2] - 6, x))
        y = max(FRAME[1] + 6, min(FRAME[3] - 6, y))
        r = 2.6 - 1.4 * t
        op = 0.40 - 0.30 * t
        pts.append((x, y, r, op))

    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (S, S, S, S),
             '  <!-- ILLUSTRATIVE, seed %d. tools/gen-empty-plate.py. Transparent: the page supplies the ground. -->' % SEED,
             '  <rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="#101620" stroke-opacity="0.16" stroke-width="2"/>'
             % (FRAME[0], FRAME[1], FRAME[2] - FRAME[0], FRAME[3] - FRAME[1])]
    for (x, y, r, op) in pts:
        parts.append('  <rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#101620" fill-opacity="%.2f"/>'
                     % (x - r/2, y - r/2, r, r, op))
    parts.append('</svg>')
    svg = "\n".join(parts) + "\n"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write(svg)
    sha = hashlib.sha256(svg.encode()).hexdigest()

    fails = []
    if not (180 <= len(pts) <= 220): fails.append("deposit count %d" % len(pts))
    mind = min(math.hypot(x - CENTER[0], y - CENTER[1]) for (x, y, _, _) in pts)
    if mind < 110: fails.append("deposit within %.0fpx of center" % mind)
    if any(not (FRAME[0] < x < FRAME[2] and FRAME[1] < y < FRAME[3]) for (x, y, _, _) in pts):
        fails.append("deposit outside the frame")
    bands = [0, 0, 0]
    for (x, y, _, _) in pts:
        d = math.hypot(x - CORNER[0], y - CORNER[1])
        bands[min(2, int(d / (reach * 0.72 / 3 + 1e-9)))] += 1
    if not (bands[0] > bands[1] > bands[2] > 0):
        fails.append("density not strictly decreasing along the drift: %r" % (bands,))
    if "2036C7" in svg.upper(): fails.append("accent present")
    if svg.count("stroke=") != 1: fails.append("more than one stroked element")
    if '<rect x="0"' in svg or 'width="%d" height="%d" fill="#' % (S, S) in svg:
        fails.append("opaque ground present — must stay transparent")

    print("RECEIPT — assets/error/plate-empty.svg")
    print("  algorithm            gen-empty-plate.py · LCG seed %d" % SEED)
    print("  canvas               %dx%d · transparent · frame %dx%d (60%%) hairline" % (S, S, FRAME[2]-FRAME[0], FRAME[3]-FRAME[1]))
    print("  deposits             %d · drift bands %d/%d/%d · nearest to center %.0fpx" % (len(pts), bands[0], bands[1], bands[2], mind))
    print("  sha256               %s" % sha)
    if fails:
        print("FAIL")
        for f in fails: print("  ✕ " + f)
        return 1
    print("  receipts             all pass")
    return 0

if __name__ == "__main__":
    sys.exit(main())
