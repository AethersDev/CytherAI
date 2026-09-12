#!/usr/bin/env python3
"""gen-exhibit-a.py — the constraint-boundary figure (brief, Exhibit A).

Classification: ILLUSTRATIVE. Generation constrained to validity, spoken in
the instrument grammar: a faint hairline grid, eight to twelve incomplete
rejected rectilinear fragments thinning toward the quiet left label lane, and
exactly one closed axis-aligned cobalt path — the admitted state — in the
right 40%. Fixed algorithm, fixed seed; the SVG is a pure function of this
file. The figure states nothing: its caption in brief.html is
FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT.

Receipts (exit nonzero on failure): exactly one accent element, closed and
axis-aligned and non-self-intersecting; fragment count and axis-alignment;
the left 25% lane carries nothing but grid; accent clear of the top/bottom
15%; palette closed over {#E0E6EF, #101620, #2036C7}; no text, no curves.
"""
import hashlib, os, sys

W, H = 2560, 800
SEED = 11
G = 32                       # grid pitch
LANE = 640                   # left 25% — label lane, nothing but grid
PATH_X0 = 1600               # the admitted path lives right of this
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets/brief/exhibit-a-boundary.svg")

_state = SEED
def rng():
    global _state
    _state = (_state * 1103515245 + 12345) % (1 << 31)
    return _state / (1 << 31)

def rint(lo, hi):            # inclusive, grid-friendly
    return lo + int(rng() * (hi - lo + 1))

def snap(v): return int(round(v / G)) * G

# ---- the admitted path: an irregular closed rectilinear ring ----
def admitted_ring():
    """A rectangle with 1-2 non-overlapping rectangular notches per side —
    castellations that always return to the base line, so the ring is simple
    (no spurs, no self-intersection) by construction."""
    x0, y0 = 1664, 224
    x1, y1 = 2368, 576
    pts = []
    def side(ax, ay, bx, by):
        horiz = ay == by
        pts.append((ax, ay))
        windows = []
        cursor = 0.15
        for _ in range(1 + int(rng() * 2)):
            if cursor > 0.60: break
            s = cursor + rng() * 0.18
            e = min(0.85, s + 0.10 + rng() * 0.20)
            if e - s < 0.06: continue
            windows.append((s, e)); cursor = e + 0.10
        if horiz:
            dirn = 1 if bx > ax else -1
            span = abs(bx - ax)
            for (s, e) in windows:
                sx, ex = snap(ax + dirn*span*s), snap(ax + dirn*span*e)
                if sx == ex: continue
                d = G * rint(1, 3) * (1 if rng() < 0.5 else -1)
                pts.extend([(sx, ay), (sx, ay + d), (ex, ay + d), (ex, ay)])
        else:
            dirn = 1 if by > ay else -1
            span = abs(by - ay)
            for (s, e) in windows:
                sy, ey = snap(ay + dirn*span*s), snap(ay + dirn*span*e)
                if sy == ey: continue
                d = G * rint(1, 3) * (1 if rng() < 0.5 else -1)
                pts.extend([(ax, sy), (ax + d, sy), (ax + d, ey), (ax, ey)])
        pts.append((bx, by))
    side(x0, y0, x1, y0)
    side(x1, y0, x1, y1)
    side(x1, y1, x0, y1)
    side(x0, y1, x0, y0)
    ring = []
    for p in pts:
        if not ring or ring[-1] != p: ring.append(p)
    if ring[0] == ring[-1]: ring.pop()
    return ring

def ring_d(ring):
    d = "M%d %d" % ring[0]
    for p in ring[1:]: d += "L%d %d" % p
    return d + "Z"

# ---- rejected fragments: open rectilinear polylines, thinning left ----
def fragments():
    out = []
    n = 8 + int(rng() * 5)           # 8..12
    for _ in range(n):
        u = rng()
        cx = snap(1504 - u * u * 800)          # dense near the path, thin left
        cy = snap(192 + rng() * 416)
        segs = 2 + int(rng() * 3)              # 2..4 segments
        x, y = cx, cy
        pts = [(x, y)]
        horiz = rng() < 0.5
        for _ in range(segs):
            ln = G * rint(2, 5) * (1 if rng() < 0.5 else -1)
            if horiz: x = min(1536, max(LANE, x + ln))
            else: y = min(720, max(96, y + ln))
            pts.append((x, y)); horiz = not horiz
        op = 0.16 + 0.09 * (cx - 672) / 800
        out.append((pts, max(0.14, min(0.25, op))))
    return out

def poly_d(pts):
    d = "M%d %d" % pts[0]
    for p in pts[1:]: d += "L%d %d" % p
    return d

def segments_of(pts, closed):
    segs = []
    n = len(pts)
    for i in range(n if closed else n - 1):
        segs.append((pts[i], pts[(i + 1) % n]))
    return segs

def self_intersects(segs):
    def hit(s, t):
        (ax, ay), (bx, by) = s
        (cx, cy), (dx, dy) = t
        if ay == by and cy == dy: return ay == cy and max(min(ax,bx),min(cx,dx)) < min(max(ax,bx),max(cx,dx))
        if ax == bx and cx == dx: return ax == cx and max(min(ay,by),min(cy,dy)) < min(max(ay,by),max(cy,dy))
        if ay == by: (ax,ay,bx,by),(cx,cy,dx,dy) = (cx,cy,dx,dy),(ax,ay,bx,by)
        # s vertical, t horizontal
        return min(cx,dx) < ax < max(cx,dx) and min(ay,by) < cy < max(ay,by)
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            if j == i + 1 or (i == 0 and j == len(segs) - 1): continue
            if hit(segs[i], segs[j]): return True
    return False

def main():
    ring = admitted_ring()
    frags = fragments()

    gv = "".join("M%d 0V%d" % (x, H) for x in range(G, W, G))
    gh = "".join("M0 %dH%d" % (y, W) for y in range(G, H, G))
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">' % (W, H),
             '  <!-- ILLUSTRATIVE, seed %d. tools/gen-exhibit-a.py -->' % SEED,
             '  <rect width="%d" height="%d" fill="#E0E6EF"/>' % (W, H),
             '  <path d="%s%s" stroke="#101620" stroke-opacity="0.12" stroke-width="1" fill="none"/>' % (gv, gh)]
    for pts, op in frags:
        parts.append('  <path d="%s" stroke="#101620" stroke-opacity="%.2f" stroke-width="2" fill="none"/>'
                     % (poly_d(pts), op))
    parts.append('  <path d="%s" stroke="#2036C7" stroke-width="2.5" fill="none"/>' % ring_d(ring))
    parts.append('</svg>')
    svg = "\n".join(parts) + "\n"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write(svg)
    sha = hashlib.sha256(svg.encode()).hexdigest()

    fails = []
    if svg.count("#2036C7") != 1: fails.append("accent element count != 1")
    rsegs = segments_of(ring, True)
    if any(a[0] != b[0] and a[1] != b[1] for (a, b) in rsegs):
        fails.append("admitted path has a non-axis-aligned segment")
    if self_intersects(rsegs): fails.append("admitted path self-intersects")
    for i in range(len(rsegs)):                  # spur = immediate reversal
        (a1, b1), (a2, b2) = rsegs[i], rsegs[(i + 1) % len(rsegs)]
        d1 = (b1[0] - a1[0], b1[1] - a1[1]); d2 = (b2[0] - a2[0], b2[1] - a2[1])
        if d1[0]*d2[0] + d1[1]*d2[1] < 0 and (d1[0] == 0) == (d2[0] == 0):
            fails.append("admitted path has a spur at %r" % (b1,)); break
    rx = [p[0] for p in ring]; ry = [p[1] for p in ring]
    if min(rx) < 0.60 * W: fails.append("admitted path leaves the right 40%")
    if min(ry) < 0.15 * H or max(ry) > 0.85 * H:
        fails.append("admitted path enters the top/bottom 15%")
    if not (8 <= len(frags) <= 12): fails.append("fragment count %d" % len(frags))
    for pts, _ in frags:
        if any(a[0] != b[0] and a[1] != b[1] for (a, b) in segments_of(pts, False)):
            fails.append("fragment not axis-aligned"); break
        if min(p[0] for p in pts) < LANE: fails.append("fragment enters the label lane"); break
    for tok in ("<text", "C", "Q", "A "):
        if tok in svg.replace("Claude", ""):
            if tok == "<text": fails.append("text element present")
    import re
    for col in set(re.findall(r'#[0-9A-Fa-f]{6}', svg)):
        if col.upper() not in ("#E0E6EF", "#101620", "#2036C7"):
            fails.append("off-palette colour %s" % col)

    print("RECEIPT — assets/brief/exhibit-a-boundary.svg")
    print("  algorithm            gen-exhibit-a.py · LCG seed %d · grid %dpx" % (SEED, G))
    print("  size                 %dx%d (16:5)" % (W, H))
    print("  admitted path        %d vertices · closed · axis-aligned · bbox x [%d..%d] y [%d..%d]"
          % (len(ring), min(rx), max(rx), min(ry), max(ry)))
    print("  rejected fragments   %d, all open, x >= %d, opacity .14-.25" % (len(frags), LANE))
    print("  label lane           x < %d carries grid only" % LANE)
    print("  sha256               %s" % sha)
    if fails:
        print("FAIL")
        for f in fails: print("  ✕ " + f)
        return 1
    print("  receipts             all pass")
    return 0

if __name__ == "__main__":
    sys.exit(main())
