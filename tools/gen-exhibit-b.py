#!/usr/bin/env python3
"""gen-exhibit-b.py — the event-strata figure (brief, Exhibit B).

Classification: ILLUSTRATIVE. The ledger engine's record spoken as geology:
nine horizontal strata of stippled point-density spanning edge to edge,
oldest and densest at the bottom, monotonically sparser upward, exactly one
thin cobalt stratum in the lower third. Stipple is per-pixel Bernoulli under
a fixed integer hash — accumulation, not gradient: every pixel is exactly
one of four palette colours, which the receipt verifies. The caption in
brief.html supplies the semantics: FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT.

Receipts (exit nonzero on failure): nine strata; strictly increasing ink
coverage top to bottom; accent confined to stratum 8-of-9 in the lower
third; every stratum present at both horizontal edges (no truncation);
palette exactly {ground, slate, ink, accent}.
"""
import hashlib, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngout import write_png

W, H = 2560, 800
SEED = 5
GROUND = (224, 230, 239)   # #E0E6EF
SLATE = (58, 70, 88)       # #3A4658 — the sparse upper strata
INK = (16, 22, 32)         # #101620 — the dense lower strata
ACCENT = (32, 54, 199)     # #2036C7 — the certified stratum
# top -> bottom: (nominal height, ink coverage, colour); index 7 is the
# thin certified stratum, inside the lower third, on the monotonic curve
BANDS = [(92, 0.015, SLATE), (92, 0.04, SLATE), (92, 0.09, SLATE),
         (92, 0.16, SLATE), (92, 0.26, INK), (92, 0.40, INK),
         (100, 0.55, INK), (48, 0.70, ACCENT), (100, 0.92, INK)]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets/brief/exhibit-b-strata.png")

def h32(x, y, s):
    v = (x * 73856093 ^ y * 19349663 ^ s * 83492791) & 0xFFFFFFFF
    v = (v ^ (v >> 16)) * 2654435761 & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1103515245 & 0xFFFFFFFF
    return (v ^ (v >> 16)) / 4294967296.0

def boundaries():
    """10 boundary curves over x — slightly irregular deposition lines,
    piecewise linear between seeded control points every 160px."""
    bounds = [[0.0] * (W + 1)]
    base = 0
    for bi, (bh, _, _) in enumerate(BANDS[:-1]):
        base += bh
        ctrl = []
        for cx in range(0, W + 160, 160):
            ctrl.append(base + (h32(cx, bi * 977 + 71, SEED) - 0.5) * 18)
        row = []
        for x in range(W + 1):
            i, f = divmod(x, 160)
            f /= 160.0
            row.append(ctrl[i] * (1 - f) + ctrl[min(i + 1, len(ctrl) - 1)] * f)
        bounds.append(row)
    bounds.append([float(H)] * (W + 1))
    return bounds

def main():
    bnd = boundaries()
    rows = []
    for y in range(H):
        row = bytearray(W * 3)
        for x in range(W):
            k = 0
            while k < 9 and not (bnd[k][x] <= y < bnd[k + 1][x]):
                k += 1
            if k == 9: k = 8 if y >= bnd[9][x] else 0
            _, cov, col = BANDS[k]
            c = col if h32(x, y, SEED + 7 * k) < cov else GROUND
            row[x*3:x*3+3] = bytes(c)
        rows.append(bytes(row))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    write_png(OUT, W, H, rows)
    sha = hashlib.sha256(open(OUT, "rb").read()).hexdigest()

    # ---- receipts, measured from the written rows ----
    fails = []
    pal = set()
    for y in range(H):
        r = rows[y]
        for x in range(W):
            pal.add(bytes(r[x*3:x*3+3]))
    allowed = {bytes(GROUND), bytes(SLATE), bytes(INK), bytes(ACCENT)}
    if not pal <= allowed:
        fails.append("off-palette pixels: %r" % [p.hex() for p in pal - allowed])

    covs, edgefails = [], []
    for k, (bh, cov, col) in enumerate(BANDS):
        y0 = int(max(bnd[k][xx] for xx in range(0, W, 64))) + 12
        y1 = int(min(bnd[k + 1][xx] for xx in range(0, W, 64))) - 12
        n = ink = 0
        for y in range(max(0, y0), min(H, y1)):
            r = rows[y]
            for x in range(W):
                n += 1
                if bytes(r[x*3:x*3+3]) != bytes(GROUND): ink += 1
        covs.append(ink / n if n else 0.0)
        for (ex0, ex1, side) in ((0, 64, "left"), (W - 64, W, "right")):
            en = eink = 0
            for y in range(max(0, y0), min(H, y1)):
                r = rows[y]
                for x in range(ex0, ex1):
                    en += 1
                    if bytes(r[x*3:x*3+3]) != bytes(GROUND): eink += 1
            if en and eink / en < 0.4 * covs[k]:
                edgefails.append("stratum %d truncated at %s edge" % (k + 1, side))
    if len(covs) != 9: fails.append("stratum count %d" % len(covs))
    if any(covs[i] >= covs[i + 1] for i in range(8)):
        fails.append("coverage not strictly increasing downward: %r" % [round(c, 3) for c in covs])
    fails.extend(edgefails)

    acc_out = acc_in = 0
    third = 2 * H // 3
    for y in range(H):
        r = rows[y]
        for x in range(W):
            if bytes(r[x*3:x*3+3]) == bytes(ACCENT):
                if y >= third: acc_in += 1
                else: acc_out += 1
    if acc_in == 0: fails.append("no accent stratum in the lower third")
    if acc_out > acc_in * 0.02:
        fails.append("accent outside the lower third: %d px" % acc_out)

    print("RECEIPT — assets/brief/exhibit-b-strata.png")
    print("  algorithm            gen-exhibit-b.py · integer-hash stipple · seed %d" % SEED)
    print("  size                 %dx%d (16:5) · %d bytes" % (W, H, os.path.getsize(OUT)))
    print("  strata               9 · coverage top->bottom %s" % " ".join("%.3f" % c for c in covs))
    print("  accent stratum       #8 of 9 · %d px in lower third, %d above" % (acc_in, acc_out))
    print("  palette              %d colours, closed over ground/slate/ink/accent" % len(pal))
    print("  sha256               %s" % sha)
    if fails:
        print("FAIL")
        for f in fails: print("  ✕ " + f)
        return 1
    print("  receipts             all pass")
    return 0

if __name__ == "__main__":
    sys.exit(main())
