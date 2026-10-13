#!/usr/bin/env python3
"""derive-icon.py — the canonical icon, derived from the mark's deepest ink.

Classification: DERIVED. The silhouette is the densest filament of the
canonical orbit: accumulate the dsin orbit's density field, keep the cells
above the 95th percentile of occupied density, take the largest connected
component — the orbit's right rim caustic, a sweeping band with a dense knot —
then regularize it with Euclidean-disk morphology (close 3, dilate 16,
open 18). The opening radius CONSTRUCTS the minimum stroke width; placement
scales the silhouette into the central 76% of a 512 viewBox with >= 12%
margins and full clearance under a centered circular mask.

Outputs: icon.svg (paper ground + ink path, no accent) and deterministic
raster derivatives assets/icons/icon-{180,192,512}.png rasterized from the
same polygon by an even-odd scanline fill with 4x4 supersampling.

Receipts (exit nonzero on any failure): single connected component at 16x16
single-bit reduction (the round-2 study's failed test), minimum stroke width
via disk opening at the final scale, margins, circular-mask clearance,
monochrome paper-ink axis, output sizes and SHA-256s. Run twice; all four
outputs must be byte-identical.
"""
import hashlib, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngout import write_png
from canon import ROOT, dsin, dcos, canon_from_source, warmed_orbit

REV = 1
GRID = 384              # density-field resolution over the orbit bounds
PAD = 48                # morphology clearance around the field
W = GRID + 2*PAD        # workspace canvas
N_BOUNDS = 220000
N_ITERS = 4000000
PCT = 95                # density percentile that defines "deepest ink"
R_CLOSE, R_DILATE, R_OPEN = 3, 16, 18
VB = 512                # viewBox
CENTRAL = 0.76
MARGIN = 0.12
PAPER, INK = (236, 240, 244), (16, 22, 32)
SVG_OUT = os.path.join(ROOT, "icon.svg")
RASTERS = {180: "icon-180.png", 192: "icon-192.png", 512: "icon-512.png"}
INF = 1e18

# ---------------- mask machinery (workspace W x W) ----------------
def edt_sq(mask, w):
    def dt1d(f):
        n = len(f); d = [0.0]*n; v = [0]*n; z = [0.0]*(n+1)
        k = 0; z[0] = -INF; z[1] = INF
        for q in range(1, n):
            while True:
                s = ((f[q] + q*q) - (f[v[k]] + v[k]*v[k])) / (2*q - 2*v[k])
                if s <= z[k]: k -= 1
                else: break
            k += 1; v[k] = q; z[k] = s; z[k+1] = INF
        k = 0
        for q in range(n):
            while z[k+1] < q: k += 1
            d[q] = (q - v[k])**2 + f[v[k]]
        return d
    g = []
    for y in range(w):
        row = [0.0 if mask[y*w+x] else INF for x in range(w)]
        g.append(dt1d(row) if any(v < INF for v in row) else [INF]*w)
    out = [0.0]*(w*w)
    for x in range(w):
        col = [g[y][x] for y in range(w)]
        d = dt1d(col) if any(v < INF for v in col) else [INF]*w
        for y in range(w): out[y*w+x] = d[y]
    return out

def dilate(mask, w, r):
    d = edt_sq(mask, w); r2 = r*r
    return [1 if d[i] <= r2 else 0 for i in range(w*w)]

def erode(mask, w, r):
    d = edt_sq([1-v for v in mask], w); r2 = r*r
    return [1 if (mask[i] and d[i] > r2) else 0 for i in range(w*w)]

def largest_cc(mask, w, conn8=True):
    dirs = ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)) if conn8 \
        else ((1,0),(-1,0),(0,1),(0,-1))
    lab = [0]*(w*w); cur = 0; sizes = {}
    for i in range(w*w):
        if mask[i] and not lab[i]:
            cur += 1; stack = [i]; lab[i] = cur; sz = 0
            while stack:
                j = stack.pop(); sz += 1
                jx, jy = j % w, j // w
                for (dx, dy) in dirs:
                    nx, ny = jx+dx, jy+dy
                    if 0 <= nx < w and 0 <= ny < w:
                        k = ny*w+nx
                        if mask[k] and not lab[k]: lab[k] = cur; stack.append(k)
            sizes[cur] = sz
    best = max(sizes, key=lambda k: sizes[k])
    return [1 if lab[i] == best else 0 for i in range(w*w)], len(sizes)

def cc_count(mask, w, h, conn8=False):
    dirs = ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)) if conn8 \
        else ((1,0),(-1,0),(0,1),(0,-1))
    lab = [0]*(w*h); cur = 0
    for i in range(w*h):
        if mask[i] and not lab[i]:
            cur += 1; stack = [i]; lab[i] = cur
            while stack:
                j = stack.pop()
                jx, jy = j % w, j // w
                for (dx, dy) in dirs:
                    nx, ny = jx+dx, jy+dy
                    if 0 <= nx < w and 0 <= ny < h:
                        k = ny*w+nx
                        if mask[k] and not lab[k]: lab[k] = cur; stack.append(k)
    return cur

def fill_holes(mask, w):
    seen = [0]*(w*w); stack = []
    for i in (list(range(w)) + [(w-1)*w+x for x in range(w)]
              + [y*w for y in range(w)] + [y*w+w-1 for y in range(w)]):
        if not mask[i] and not seen[i]: seen[i] = 1; stack.append(i)
    while stack:
        j = stack.pop()
        jx, jy = j % w, j // w
        for (dx, dy) in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = jx+dx, jy+dy
            if 0 <= nx < w and 0 <= ny < w:
                k = ny*w+nx
                if not mask[k] and not seen[k]: seen[k] = 1; stack.append(k)
    return [1 if (mask[i] or not seen[i]) else 0 for i in range(w*w)]

# ---------------- contour: Moore trace -> DP -> Chaikin ----------------
def trace_contour(mask, w):
    start = next(i for i in range(w*w) if mask[i])
    sx, sy = start % w, start // w
    nbr = ((-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0))
    def at(x, y): return 0 <= x < w and 0 <= y < w and mask[y*w+x]
    pts = [(sx, sy)]
    bx, by = sx - 1, sy
    cx, cy = sx, sy
    while True:
        try: k0 = nbr.index((bx - cx, by - cy))
        except ValueError: k0 = 0
        found = False
        for t in range(1, 9):
            k = (k0 + t) % 8
            nx, ny = cx + nbr[k][0], cy + nbr[k][1]
            if at(nx, ny):
                bx, by = cx + nbr[(k - 1) % 8][0], cy + nbr[(k - 1) % 8][1]
                cx, cy = nx, ny
                found = True
                break
        if not found: break                      # isolated pixel
        if (cx, cy) == (sx, sy) and len(pts) > 2: break
        pts.append((cx, cy))
    return pts

def dp(points, eps):
    if len(points) < 3: return points
    def simplify(pts):
        if len(pts) < 3: return pts
        (x1, y1), (x2, y2) = pts[0], pts[-1]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-12
        dmax, idx = -1.0, 0
        for i in range(1, len(pts) - 1):
            d = abs(dy*(pts[i][0]-x1) - dx*(pts[i][1]-y1)) / norm
            if d > dmax: dmax, idx = d, i
        if dmax <= eps: return [pts[0], pts[-1]]
        left = simplify(pts[:idx+1]); right = simplify(pts[idx:])
        return left[:-1] + right
    n = len(points)
    half = n // 2
    a = simplify(points[:half+1]); b = simplify(points[half:] + points[:1])
    return a[:-1] + b[:-1]

def chaikin(points, passes=2):
    for _ in range(passes):
        out = []
        n = len(points)
        for i in range(n):
            (x1, y1), (x2, y2) = points[i], points[(i+1) % n]
            out.append((0.75*x1 + 0.25*x2, 0.75*y1 + 0.25*y2))
            out.append((0.25*x1 + 0.75*x2, 0.25*y1 + 0.75*y2))
        points = out
    return points

# ---------------- polygon raster: even-odd scanline, supersampled ----------------
def raster_coverage(poly, size, ss=4):
    """poly in VB space -> per-pixel coverage [0..1] at size x size."""
    sc = size / VB
    edges = []
    n = len(poly)
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i+1) % n]
        if y1 != y2: edges.append((x1*sc, y1*sc, x2*sc, y2*sc))
    cov = [0.0]*(size*size)
    inv = 1.0/(ss*ss)
    for j in range(size*ss):
        y = (j + 0.5)/ss
        xs = []
        for (x1, y1, x2, y2) in edges:
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1)*(x2 - x1)/(y2 - y1))
        xs.sort()
        py = j // ss
        for k in range(0, len(xs) - 1, 2):
            a, b = xs[k]*ss, xs[k+1]*ss
            ia, ib = max(0, int(math.ceil(a - 0.5))), min(size*ss - 1, int(math.floor(b - 0.5)))
            for s in range(ia, ib + 1):
                cov[py*size + s//ss] += inv
    return cov

def raster_png(poly, size, path):
    cov = raster_coverage(poly, size)
    rows = []
    for y in range(size):
        row = bytearray(size*3)
        for x in range(size):
            t = min(1.0, cov[y*size + x])
            for c in range(3):
                row[x*3+c] = int(PAPER[c] + (INK[c] - PAPER[c])*t + 0.5)
        rows.append(bytes(row))
    write_png(path, size, size, rows)
    return cov

def main():
    P, nonce, checksum = canon_from_source()
    a, b, c, d = P
    x, y = warmed_orbit(P)
    bx, by = x, y
    minx = miny = 1e9; maxx = maxy = -1e9
    for _ in range(N_BOUNDS):
        nx = dsin(a*by) + c*dcos(a*bx); ny = dsin(b*bx) + d*dcos(b*by); bx, by = nx, ny
        if bx < minx: minx = bx
        if bx > maxx: maxx = bx
        if by < miny: miny = by
        if by > maxy: maxy = by
    span = max(maxx - minx, maxy - miny)
    zu = (GRID - 1) / span
    grid = [0]*(W*W)
    for _ in range(N_ITERS):
        nx = dsin(a*y) + c*dcos(a*x); ny = dsin(b*x) + d*dcos(b*y); x, y = nx, ny
        gx = int((x - minx)*zu) + PAD; gy = int((y - miny)*zu) + PAD
        if 0 <= gx < W and 0 <= gy < W: grid[gy*W+gx] += 1
    vals = sorted(v for v in grid if v > 0)
    T = vals[len(vals)*PCT//100]
    mask = [1 if v >= T else 0 for v in grid]
    mask, _ = largest_cc(mask, W)
    mask = erode(dilate(mask, W, R_CLOSE), W, R_CLOSE)
    mask = dilate(mask, W, R_DILATE)
    mask = dilate(erode(mask, W, R_OPEN), W, R_OPEN)
    mask, _ = largest_cc(mask, W)
    mask = fill_holes(mask, W)

    ring = trace_contour(mask, W)
    ring = dp(ring, 2.0)
    ring = chaikin(ring, 2)
    ring = dp(ring, 0.6)

    xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    scale = CENTRAL * VB / max(bw, bh)
    cx0, cy0 = (max(xs) + min(xs))/2, (max(ys) + min(ys))/2
    poly = [((px - cx0)*scale + VB/2, (py - cy0)*scale + VB/2) for (px, py) in ring]
    rmax = max(math.hypot(px - VB/2, py - VB/2) for (px, py) in poly)
    if rmax > VB/2 - 2:                          # circular-mask clearance
        s2 = (VB/2 - 2)/rmax
        poly = [((px - VB/2)*s2 + VB/2, (py - VB/2)*s2 + VB/2) for (px, py) in poly]
        rmax = max(math.hypot(px - VB/2, py - VB/2) for (px, py) in poly)

    dstr = "M" + "L".join("%.1f %.1f" % p for p in poly) + "Z"
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n'
           '  <!-- DERIVED: the densest filament of the canonical mark. tools/derive-icon.py -->\n'
           '  <rect width="%d" height="%d" fill="#ECF0F4"/>\n'
           '  <path d="%s" fill="#101620"/>\n'
           '</svg>\n') % (VB, VB, VB, VB, dstr)
    with open(SVG_OUT, "w") as f:
        f.write(svg)

    outdir = os.path.join(ROOT, "assets/icons")
    os.makedirs(outdir, exist_ok=True)
    shas = {"icon.svg": hashlib.sha256(svg.encode()).hexdigest()}
    for size, name in sorted(RASTERS.items()):
        raster_png(poly, size, os.path.join(outdir, name))
        shas[name] = hashlib.sha256(open(os.path.join(outdir, name), "rb").read()).hexdigest()

    # ---------------- receipts ----------------
    fails = []
    pxs = [p[0] for p in poly]; pys = [p[1] for p in poly]
    m0 = min(min(pxs), min(pys)); m1 = max(max(pxs), max(pys))
    if m0 < MARGIN*VB - 0.5 or m1 > (1 - MARGIN)*VB + 0.5:
        fails.append("margins: bbox [%.1f..%.1f] outside the %.0f%% frame" % (m0, m1, 100*MARGIN))
    if rmax > VB/2:
        fails.append("circular mask clips: rmax %.1f > %.1f" % (rmax, VB/2))

    cov512 = raster_coverage(poly, VB)
    bin512 = [1 if v >= 0.5 else 0 for v in cov512]
    opened = dilate(erode(bin512, VB, int(0.05*VB)), VB, int(0.05*VB))
    n_open = cc_count(opened, VB, VB, conn8=True)
    keep = sum(opened) / (sum(bin512) or 1)
    if n_open != 1: fails.append("min-width opening (r=%d) splits: %d components" % (int(0.05*VB), n_open))
    if keep < 0.97: fails.append("min-width opening keeps %.1f%% < 97%%" % (100*keep))

    topo = {}
    for size in (16, 32):
        covN = raster_coverage(poly, size, ss=16)
        for thr in (0.25, 0.5, 0.75):
            bN = [1 if v >= thr else 0 for v in covN]
            topo[(size, thr)] = cc_count(bN, size, size, conn8=False)
    if topo[(16, 0.5)] != 1:
        fails.append("16x16 midpoint mask: %d components (must be 1)" % topo[(16, 0.5)])

    if "#2036C7" in svg or "2036C7" in svg.upper().replace("#", ""):
        fails.append("accent present in SVG")
    for size, name in sorted(RASTERS.items()):
        import struct
        head = open(os.path.join(outdir, name), "rb").read(33)
        wpx, hpx = struct.unpack(">II", head[16:24])
        if (wpx, hpx) != (size, size): fails.append("%s is %dx%d" % (name, wpx, hpx))

    minw = 2*int(0.05*VB)
    print("RECEIPT — icon.svg + assets/icons/{180,192,512}")
    print("  derivation           densest filament: p%d density cells, largest CC," % PCT)
    print("                       disk close %d / dilate %d / open %d at %d-grid" % (R_CLOSE, R_DILATE, R_OPEN, GRID))
    print("  state checksum       %s · admission nonce %d · CANON %r" % (checksum, nonce, P))
    print("  placement            central %.0f%% of %d viewBox · margins >= %.0f%% · rmax %.1f (<= %d)"
          % (100*CENTRAL, VB, 100*MARGIN, rmax, VB//2))
    print("  min stroke width     opening r=%d keeps %.1f%% in %d component(s) — floor %dpx = %.1f%%"
          % (int(0.05*VB), 100*keep, n_open, minw, 100*minw/VB))
    print("  16x16 components     thr .25/.50/.75 -> %d / %d / %d (4-connected)"
          % (topo[(16, .25)], topo[(16, .5)], topo[(16, .75)]))
    print("  32x32 components     thr .25/.50/.75 -> %d / %d / %d"
          % (topo[(32, .25)], topo[(32, .5)], topo[(32, .75)]))
    print("  coverage             %.1f%% of viewBox ink" % (100*sum(bin512)/(VB*VB)))
    print("  path                 %d points · monochrome, no accent" % len(poly))
    for k in ("icon.svg",) + tuple(RASTERS[s] for s in sorted(RASTERS)):
        print("  sha256 %-14s %s" % (k, shas[k]))
    if fails:
        print("FAIL")
        for f in fails: print("  ✕ " + f)
        return 1
    print("  receipts             all pass")
    return 0

if __name__ == "__main__":
    sys.exit(main())
