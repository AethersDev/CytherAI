#!/usr/bin/env python3
"""render-seal.py — the Cyther Seal, computed from the company's name.

Classification: COMPUTED. SHA-256("CytherAI") is read two bits at a time (00 and 11 straight, 01 left, 10 right; when
the digest runs out it is hashed again). A walk from the top-left cell of a 6×6 grid, heading right, admits a move only
if it stays inside the grid on an unused cell, and stops when no move is possible: 77 proposals, 29 admitted, 48
refused. That path is the mark (the identity: the owner's draft cyther-seal-identity.html, "Check it", kept outside the
repository in ~/Desktop/cyther-studies/); nothing places a cell by hand.

The seal is ink with its path in ground: #ECE7DC / #07070A on the dark ground, #101620 / #ECF0F4 on cold paper. Warm is
never the seal's colour. Below 48 px every rendering is pixel-fitted (the identity's rule): an 11-unit lattice of
u = floor(size / 13) px, centred, so every edge falls on a pixel at any integer device scale.

  python3 tools/render-seal.py               writes the icons (run twice: byte-identical)
  python3 tools/render-seal.py svg SIZE INK GROUND   prints the inline seal for a page

Outputs: icon.svg (the 32-unit fitted seal, crisp at 16 and 32 px); assets/icons/icon-180.png (apple-touch),
icon-192.png, icon-512.png (`any`), icon-512-maskable.png (`maskable`: the path inside the central 80% circle). The
rasters are pixel-aligned at the vector seal's proportions (stroke : spacing ≈ 0.44), so no pixel is anti-aliased.
"""
import hashlib, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 6
PUBLISHED = "00 01 11 21 20 30 40 50 51 52 53 54 44 43 33 32 22 12 02 03 04 05 15 25 35 34 24 14 13 23"
INK, GROUND = "#ECE7DC", "#07070A"


def proposals(seed):
    h = hashlib.sha256(seed.encode()).digest()
    while True:
        for byte in h:
            for k in (6, 4, 2, 0):
                yield (byte >> k) & 3
        h = hashlib.sha256(h).digest()


def walk(seed="CytherAI"):
    """(path, proposals read): the constrained walk the identity publishes"""
    dirs = [(1, 0), (0, 1), (-1, 0), (0, -1)]
    path, seen, d, p, proposed = [(0, 0)], {(0, 0)}, 0, proposals(seed), 0
    free = lambda x, y: 0 <= x < N and 0 <= y < N and (x, y) not in seen
    while any(free(path[-1][0] + dx, path[-1][1] + dy) for dx, dy in dirs):
        while True:
            t = next(p); proposed += 1
            nd = {1: (d - 1) % 4, 2: (d + 1) % 4}.get(t, d)
            x, y = path[-1][0] + dirs[nd][0], path[-1][1] + dirs[nd][1]
            if free(x, y):
                d = nd; seen.add((x, y)); path.append((x, y)); break
    return path, proposed


PATH, PROPOSED = walk()
if (PROPOSED, len(PATH) - 1) != (77, 29) or " ".join(f"{x}{y}" for x, y in PATH) != PUBLISHED:
    raise SystemExit("the computed seal no longer equals the published one")


def lattice():
    """the path on an 11-unit lattice: each cell at (2x, 2y), each step's midpoint between its cells"""
    cells = {(2 * x, 2 * y) for x, y in PATH}
    cells |= {(x + a, y + b) for (x, y), (a, b) in zip(PATH, PATH[1:])}
    return sorted(cells)


def fitted_svg(size, ink=INK, ground=GROUND, attrs=""):
    """the identity's pixel-fitted seal, `size` px square: ink square, path in ground"""
    u = max(1, size // 13); off = (size - 11 * u) // 2
    d = "".join(f"M{off + a * u} {off + b * u}h{u}v{u}h-{u}z" for a, b in lattice())
    return (f'<svg{attrs} viewBox="0 0 {size} {size}" width="{size}" height="{size}" shape-rendering="crispEdges" aria-hidden="true">'
            f'<rect width="{size}" height="{size}" fill="{ink}"/><path fill="{ground}" d="{d}"/></svg>')


def raster(size, spacing, stroke):
    """RGB rows: the seal full-bleed, its path a square-capped, mitred polyline `stroke` px wide on cells `spacing` apart"""
    rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    ink, ground = rgb(INK), rgb(GROUND)
    span = (N - 1) * spacing + stroke; m = (size - span) // 2
    px = [[ink] * size for _ in range(size)]
    for (x, y), (a, b) in zip(PATH, PATH[1:]):
        for yy in range(m + min(y, b) * spacing, m + max(y, b) * spacing + stroke):
            for xx in range(m + min(x, a) * spacing, m + max(x, a) * spacing + stroke):
                px[yy][xx] = ground
    return [bytes(c for p in row for c in p) for row in px], span


def main():
    from pngout import write_png
    os.makedirs(os.path.join(ROOT, "assets/icons"), exist_ok=True)
    with open(os.path.join(ROOT, "icon.svg"), "w") as f:
        f.write(fitted_svg(32).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1).replace(' width="32" height="32"', "", 1)
                .replace(' aria-hidden="true"', "", 1) + "\n")
    for name, size, spacing, stroke in (("icon-180.png", 180, 22, 10), ("icon-192.png", 192, 24, 11), ("icon-512.png", 512, 64, 28),
                                        ("icon-512-maskable.png", 512, 53, 23)):
        rows, span = raster(size, spacing, stroke)
        if "maskable" in name and span / 2 * 2 ** 0.5 > 0.4 * size:
            raise SystemExit("the maskable seal leaves the central 80% circle")
        write_png(os.path.join(ROOT, "assets/icons", name), size, size, rows)
    for rel in ("icon.svg", "assets/icons/icon-180.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png",
                "assets/icons/icon-512-maskable.png"):
        data = open(os.path.join(ROOT, rel), "rb").read()
        print(f"{rel:36} {len(data):>8,} bytes  sha256 {hashlib.sha256(data).hexdigest()}")


if __name__ == "__main__":
    if sys.argv[1:2] == ["svg"]:
        print(fitted_svg(int(sys.argv[2]), sys.argv[3], sys.argv[4], ' class="seal"'))
    else:
        main()
