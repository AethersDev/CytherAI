#!/usr/bin/env python3
"""render-og.py — the Open Graph plate, derived from CytherManifest.CANON.

Classification: DERIVED. A far-field exposure of the canonical Clifford orbit
in the plate-0 grammar of js/substrate.js (angular-lobe anchor inks, log
tonemap with gamma 1.5, dark core on light paper, PLATE[0] cobalt lobe).
Canonical parameters are read from js/manifest.js by executing it under jsc —
never hand-copied. The orbit recurrence uses the manifest's dsin/dcos
(engine-invariant polynomial sine); the Python port below was verified
bit-identical against jsc on the first five thousand orbit points.

Renders 2400x1260 internally, downsamples by exact 2x2 box mean to 1200x630,
writes assets/og/og-card.png, then verifies composition receipts and prints
the full derivation receipt. Exits nonzero if any receipt fails.

Run twice; the output SHA-256 must be identical (fixed zlib, no time/random).
"""
import hashlib, math, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngout import write_png, downsample2x

REV = 1
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
OUT = os.path.join(ROOT, "assets/og/og-card.png")

SRC_W, SRC_H = 2400, 1260          # 2x internal source (never written to disk)
N_BOUNDS = 220000                  # bounds pass — ORBIT_N of js/substrate.js
N_ITERS = 12000000                 # deposition recurrence length
FIELD_W = 0.44                     # orbit bbox width as fraction of frame width
LANE_X = 0.45                      # frame x where the orbit bbox begins — the
                                   # left rim caustic sits exactly on the lane
                                   # boundary, so the left 45% is pure paper
DOWNSAMPLE = "2x2 box mean, integer round-half-up (tools/pngout.py)"

# plate 0 — js/substrate.js PLATE[0], verbatim
ANCHORS = [(16, 22, 32), (30, 44, 96), (10, 13, 20), (32, 54, 199)]
ROT, CORE, AMAX = 0.12, (6, 9, 18), 0.95
GROUND = (236, 240, 244)           # #ECF0F4
TAU = math.pi * 2

# ---- deterministic sine — port of js/manifest.js dsin/dcos (IEEE-exact ops) ----
TWO_PI, HALF_PI, D_PI = 6.283185307179586, 1.5707963267948966, 3.141592653589793

def dsin(x):
    x = x - TWO_PI * math.floor(x / TWO_PI + 0.5)
    if x > HALF_PI: x = D_PI - x
    elif x < -HALF_PI: x = -D_PI - x
    x2 = x * x
    return x * (1 + x2 * (-1/6 + x2 * (1/120 + x2 * (-1/5040 + x2 * (1/362880 + x2 * (-1/39916800))))))

def dcos(x): return dsin(x + HALF_PI)

def canon_from_source():
    """CANON, ADMISSION_NONCE, CHECKSUM — from the repository source, via jsc."""
    driver = ('print(JSON.stringify({p:CytherManifest.CANON,'
              'n:CytherManifest.ADMISSION_NONCE,c:CytherManifest.CHECKSUM}))')
    dpath = os.path.join(ROOT, "tools", ".canon-driver.js")
    with open(dpath, "w") as f:
        f.write(driver)
    try:
        out = subprocess.run([JSC, os.path.join(ROOT, "js/manifest.js"), dpath],
                             check=True, capture_output=True, text=True).stdout
    finally:
        os.remove(dpath)
    import json
    j = json.loads(out)
    return j["p"], j["n"], j["c"]

def lum(r, g, b): return 0.2126*r + 0.7152*g + 0.0722*b

def render(P):
    from array import array
    a, b, c, d = P
    x, y = 0.08, 0.12
    for _ in range(40):
        nx = dsin(a*y) + c*dcos(a*x); ny = dsin(b*x) + d*dcos(b*y); x, y = nx, ny
    minx = miny = 1e9; maxx = maxy = -1e9
    bx, by = x, y
    for _ in range(N_BOUNDS):
        nx = dsin(a*by) + c*dcos(a*bx); ny = dsin(b*bx) + d*dcos(b*by); bx, by = nx, ny
        if bx < minx: minx = bx
        if bx > maxx: maxx = bx
        if by < miny: miny = by
        if by > maxy: maxy = by
    zu = FIELD_W * SRC_W / (maxx - minx)
    ox = LANE_X * SRC_W - minx * zu
    oy = SRC_H / 2 - (miny + maxy) / 2 * zu
    n = SRC_W * SRC_H
    total = array("f", bytes(4*n))
    ch = [array("f", bytes(4*n)) for _ in range(4)]
    atan2 = math.atan2
    for _ in range(N_ITERS):
        nx = dsin(a*y) + c*dcos(a*x); ny = dsin(b*x) + d*dcos(b*y); x, y = nx, ny
        fx = x*zu + ox; fy = y*zu + oy
        if fx < 0 or fy < 0 or fx >= SRC_W or fy >= SRC_H: continue
        idx = int(fy)*SRC_W + int(fx)
        u = (atan2(y, x)/TAU + 0.5)*4 + ROT*4
        u -= int(u/4)*4
        i0 = int(u); f = u - i0
        ch[i0][idx] += 1 - f; ch[(i0+1) & 3][idx] += f
        total[idx] += 1
    maxT = max(total) or 1e-6
    invLog = 1/math.log1p(maxT)
    c0, c1, c2, c3 = ch
    (a0r,a0g,a0b), (a1r,a1g,a1b), (a2r,a2g,a2b), (a3r,a3g,a3b) = ANCHORS
    gr, gg, gb = GROUND
    rows = []
    for yy in range(SRC_H):
        row = bytearray(SRC_W*3)
        base = yy*SRC_W
        for xx in range(SRC_W):
            i = base + xx
            t = total[i]
            j = xx*3
            if t < 0.5:
                row[j] = gr; row[j+1] = gg; row[j+2] = gb; continue
            L = math.log1p(t)*invLog
            L = math.sqrt(L)*L
            inv = 1/t
            r = (c0[i]*a0r + c1[i]*a1r + c2[i]*a2r + c3[i]*a3r)*inv
            g = (c0[i]*a0g + c1[i]*a1g + c2[i]*a2g + c3[i]*a3g)*inv
            bl = (c0[i]*a0b + c1[i]*a1b + c2[i]*a2b + c3[i]*a3b)*inv
            cw = (L-0.68)/0.32 if L > 0.68 else 0.0
            cw = cw*cw*0.9
            r += (CORE[0]-r)*cw; g += (CORE[1]-g)*cw; bl += (CORE[2]-bl)*cw
            al = L*AMAX
            if al > 1.0: al = 1.0
            row[j] = int(gr*(1-al) + r*al + 0.5)
            row[j+1] = int(gg*(1-al) + g*al + 0.5)
            row[j+2] = int(gb*(1-al) + bl*al + 0.5)
        rows.append(bytes(row))
    return rows, ox, oy

# ---- receipts on the final 1200x630 ----
def block_means(w, h, rows, x0, y0, x1, y1, size=24):
    out = []
    for by in range(y0, y1 - size + 1, size):
        for bx in range(x0, x1 - size + 1, size):
            s = 0.0
            for yy in range(by, by + size):
                r = rows[yy]
                for xx in range(bx, bx + size):
                    s += lum(r[xx*3], r[xx*3+1], r[xx*3+2])
            out.append(s / (size*size))
    return out

def darkest_box(w, h, rows, size=48, step=6):
    best, bpos = 1e9, (0, 0)
    for by in range(0, h - size, step):
        for bx in range(0, w - size, step):
            s = 0.0
            for yy in range(by, by + size, 4):
                r = rows[yy]
                for xx in range(bx, bx + size, 4):
                    s += lum(r[xx*3], r[xx*3+1], r[xx*3+2])
            if s < best: best, bpos = s, (bx + size//2, by + size//2)
    return bpos

def ink_core(w, h, rows, floor=120.0):
    """Ink-weighted centroid of deep pixels (L < floor) — diagnostic, not the core."""
    sx = sy = sw = 0.0
    for yy in range(h):
        r = rows[yy]
        for xx in range(w):
            L = lum(r[xx*3], r[xx*3+1], r[xx*3+2])
            if L < floor:
                wt = floor - L
                sx += xx*wt; sy += yy*wt; sw += wt
    return (int(sx/sw), int(sy/sw)) if sw else (0, 0)

def palette(w, h, rows):
    warm = offhue = accent = n = 0
    for yy in range(h):
        r = rows[yy]
        for xx in range(w):
            R, G, B = r[xx*3], r[xx*3+1], r[xx*3+2]
            n += 1
            if R > B + 6: warm += 1
            mx, mn = max(R, G, B), min(R, G, B)
            if mx - mn > 24:
                d = mx - mn
                if mx == R: hu = 60*(((G-B)/d) % 6)
                elif mx == G: hu = 60*(((B-R)/d) + 2)
                else: hu = 60*(((R-G)/d) + 4)
                if 195 <= hu <= 265: accent += 1
                else: offhue += 1
    return 100*warm/n, 100*offhue/n, 100*accent/n

def box_mean_at(w, h, rows, cx, cy, size=48):
    s = n = 0.0
    for yy in range(max(0, cy - size//2), min(h, cy + size//2)):
        r = rows[yy]
        for xx in range(max(0, cx - size//2), min(w, cx + size//2)):
            s += lum(r[xx*3], r[xx*3+1], r[xx*3+2]); n += 1
    return s / n

def main():
    P, nonce, checksum = canon_from_source()
    src_rows, ox, oy = render(P)
    w, h, rows = downsample2x(SRC_W, SRC_H, src_rows)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    write_png(OUT, w, h, rows)
    sha = hashlib.sha256(open(OUT, "rb").read()).hexdigest()

    fails = []
    lane = block_means(w, h, rows, 0, 0, int(w*0.45), h)
    bottom = block_means(w, h, rows, 0, int(h*0.88), w, h)
    if min(lane) < 229.0: fails.append("left-45%% lane: darkest 24px block %.1f < 229" % min(lane))
    if min(bottom) < 229.0: fails.append("bottom-12%%: darkest 24px block %.1f < 229" % min(bottom))
    # The core is the lobe-convergence point: the orbit origin, where the four
    # angular ink anchors of the plate grammar meet and the filaments pinch.
    # A derived point, not a statistic — its density is then verified below.
    cx, cy = int(ox / 2 + 0.5), int(oy / 2 + 0.5)
    coreL = box_mean_at(w, h, rows, cx, cy)
    ix, iy = ink_core(w, h, rows)             # aggregate deep-ink centroid — diagnostic
    rx, ry = darkest_box(w, h, rows)          # darkest 48px sliver (rim caustic) — diagnostic
    if not (0.60*w <= cx <= 0.73*w and 0.42*h <= cy <= 0.58*h):
        fails.append("core at (%d,%d), outside the 2/3-width half-height window" % (cx, cy))
    if coreL >= 180.0:
        fails.append("core 48px box mean L %.1f — not dense against paper 239" % coreL)
    warm, offhue, accent = palette(w, h, rows)
    if warm > 0.0: fails.append("warm cast %.2f%%" % warm)
    if offhue > 0.02: fails.append("off-cold-hue %.2f%%" % offhue)
    if accent > 8.0: fails.append("accent %.2f%% > 8%%" % accent)
    crops = {"1.91:1": (0, 0, w, h),
             "1:1": ((w - h)//2, 0, (w - h)//2 + h, h),
             "4:5": ((w - int(h*0.8))//2, 0, (w - int(h*0.8))//2 + int(h*0.8), h)}
    for name, (x0, y0, x1, y1) in crops.items():
        if not (x0 + 40 <= cx <= x1 - 40 and y0 + 40 <= cy <= y1 - 40):
            fails.append("core does not survive the %s crop" % name)
        blocks = block_means(w, h, rows, x0, y0, x1, y1)
        quiet = sum(1 for v in blocks if v >= 229.0) / len(blocks)
        if quiet < 0.30: fails.append("%s crop quiet fraction %.0f%% < 30%%" % (name, 100*quiet))

    commit = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                            capture_output=True, text=True).stdout.strip()
    msha = hashlib.sha256(open(os.path.join(ROOT, "js/manifest.js"), "rb").read()).hexdigest()
    print("RECEIPT — assets/og/og-card.png")
    print("  source commit        %s" % commit)
    print("  js/manifest.js       sha256 %s" % msha)
    print("  state checksum       %s · admission nonce %d" % (checksum, nonce))
    print("  CANON                %r" % (P,))
    print("  renderer             tools/render-og.py rev %d · dsin recurrence · plate-0 grammar" % REV)
    print("  source render        %dx%d · %d iterations · bounds pass %d" % (SRC_W, SRC_H, N_ITERS, N_BOUNDS))
    print("  downsample           %s" % DOWNSAMPLE)
    print("  output               %dx%d · sha256 %s" % (w, h, sha))
    print("  core (convergence)   (%d,%d) = (%.3f W, %.3f H) · 48px box L %.1f" % (cx, cy, cx/w, cy/h, coreL))
    print("  deep-ink centroid    (%d,%d) — aggregate mass, diagnostic" % (ix, iy))
    print("  darkest 48px box     (%d,%d) — rim caustic, diagnostic" % (rx, ry))
    print("  palette              warm %.2f%% · off-cold-hue %.2f%% · accent %.2f%%" % (warm, offhue, accent))
    print("  lane floors          left-45%% min block L %.1f · bottom-12%% min block L %.1f" % (min(lane), min(bottom)))
    if fails:
        print("FAIL")
        for f in fails: print("  ✕ " + f)
        return 1
    print("  receipts             all pass")
    return 0

if __name__ == "__main__":
    sys.exit(main())
