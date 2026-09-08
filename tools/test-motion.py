#!/usr/bin/env python3
"""test-motion.py — the ink-flip and plate-development visual laws, enforced.

MOT-001 and MOT-002 are verification references, not designs. This harness
checks the SHIPPED implementation against the laws the accepted studies
document, and fails loudly if any future edit breaks one:

MOT-001 — the ink flip:
  A1 ink is bistable with a hysteresis gap (READING, read from js/substrate.js
     by executing it under jsc — never hand-copied);
  A2 the hysteresis state machine is authoritative in js/site.js (a retained
     state with asymmetric thresholds — not a threshold function);
  A3 membrane and page geometry carry zero border-radius;
  A4 membrane softness comes from mask attenuation (mask-image on .env::before);
  A5 no body[data-ink] / body[data-phase] rule moves anything — colour and
     background only, no transform/translate/inset;
  A6 the flip is a 0.25s controlled crossfade (body transition), never a flash.

MOT-002 — plate development:
  B1 the plate-0/1 tonemap monotonically darkens with density (per-cell law,
     every anchor, several exposure ceilings);
  B2 light plates never emit: no composited pixel exceeds paper luminance;
  B3 cobalt is hue, not luminance (the accent anchor sits far below paper);
  B4 the shipped plate render (assets/og/og-card.png — the same grammar) has
     no bloom: the radial profile out of the darkest core rises monotonically;
  B5 reduced motion develops whole plates (single large batch, tonemap at
     completion only) — asserted on js/substrate.js source;
  B6 the camera is not touched by development (anchors assigned once).

Run: python3 tools/test-motion.py   ·   exit nonzero on any failure.
"""
import json, os, re, subprocess, sys, zlib, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
PAPER = (236, 240, 244)
fails = []

def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)

def lum(r, g, b): return 0.2126*r + 0.7152*g + 0.0722*b

# ---------------- MOT-001 ----------------
drv = os.path.join(ROOT, "tools", ".reading-driver.js")
with open(drv, "w") as f:
    f.write('print(JSON.stringify(CytherSubstrate.READING))')
try:
    out = subprocess.run([JSC, os.path.join(ROOT, "js/manifest.js"),
                          os.path.join(ROOT, "js/substrate.js"), drv],
                         check=True, capture_output=True, text=True).stdout
finally:
    os.remove(drv)
R = json.loads(out)
check(R["SW_DOWN"] > R["SW_UP"], "A1 bistable: SW_DOWN %.2f > SW_UP %.2f" % (R["SW_DOWN"], R["SW_UP"]))
check(abs((R["SW_DOWN"] - R["SW_UP"]) - 0.09) < 1e-9, "A1 hysteresis gap is 0.09")

site = open(os.path.join(ROOT, "js/site.js")).read()
check('inkState === "dark" && d >= R.SW_DOWN' in site
      and 'inkState === "light" && d <= R.SW_UP' in site,
      "A2 retained-state hysteresis machine present in site.js")

html = open(os.path.join(ROOT, "index.html")).read()
check("border-radius" not in html, "A3 zero border-radius in index.html")
env = re.search(r'\.env::before\{[^}]*\}', html, re.S)
check(env and "mask-image" in env.group(0), "A4 membrane softness is mask attenuation")

moving = []
for m in re.finditer(r'body\[data-(?:ink|phase)[^{]*\{([^}]*)\}', html):
    body = m.group(1)
    if re.search(r'transform|translate\(|(?<![-\w])top:|(?<![-\w])left:|margin', body):
        moving.append(m.group(0)[:60])
check(not moving, "A5 no data-ink/data-phase rule moves layout (%d rules scanned)"
      % len(re.findall(r'body\[data-(?:ink|phase)', html)))
check(re.search(r'body\{transition:color \.25s', html) is not None,
      "A6 flip is a 0.25s controlled crossfade")

# ---------------- MOT-002 ----------------
PLATES = {  # js/substrate.js PLATE[0..1] — the light plates
    0: {"anchors": [(16,22,32),(30,44,96),(10,13,20),(32,54,199)], "core": (6,9,18), "amax": 0.95},
    1: {"anchors": [(36,52,110),(22,32,72),(42,72,214),(16,22,48)], "core": (8,12,32), "amax": 0.95},
}
import math
def composited(anchor, core, amax, t, maxT):
    L = math.log1p(t) / math.log1p(maxT)
    L = math.sqrt(L) * L
    cw = (L - 0.68) / 0.32 if L > 0.68 else 0.0
    cw = cw * cw * 0.9
    px = [a + (c - a) * cw for a, c in zip(anchor, core)]
    al = min(1.0, L * amax)
    return [p * (1 - al) + v * al for p, v in zip(PAPER, px)]

mono_ok = emit_ok = True
for pi, P in PLATES.items():
    for anchor in P["anchors"]:
        for maxT in (10, 100, 1000):
            prev = 1e9
            for t in range(1, maxT + 1):
                L = lum(*composited(anchor, P["core"], P["amax"], t, maxT))
                if L > prev + 1e-9: mono_ok = False
                if L > lum(*PAPER) + 1e-9: emit_ok = False
                prev = L
check(mono_ok, "B1 tonemap monotonically darkens with density (plates 0-1, all anchors)")
check(emit_ok, "B2 light plates never exceed paper luminance (no emission)")
cob = lum(32, 54, 199)
check(cob < 0.35 * lum(*PAPER), "B3 cobalt anchor is hue, not luminance (L %.0f vs paper %.0f)" % (cob, lum(*PAPER)))

def load_png_f0(path):
    """minimal reader for the filter-0 RGB PNGs tools/pngout.py writes"""
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    pos, idat, w, h = 8, [], 0, 0
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        if typ == b"IHDR": w, h = struct.unpack(">II", d[pos+8:pos+16])
        elif typ == b"IDAT": idat.append(d[pos+8:pos+8+ln])
        elif typ == b"IEND": break
        pos += 12 + ln
    raw = zlib.decompress(b"".join(idat))
    stride = w * 3 + 1
    rows = []
    for y in range(h):
        assert raw[y*stride] == 0, "non-zero filter — not a pngout file"
        rows.append(raw[y*stride+1:(y+1)*stride])
    return w, h, rows

og = os.path.join(ROOT, "assets/og/og-card.png")
w, h, rows = load_png_f0(og)
best, cx, cy = 1e9, 0, 0
for by in range(0, h - 24, 8):
    for bx in range(int(0.45*w), w - 24, 8):
        s = 0.0
        for yy in range(by, by + 24, 4):
            r = rows[yy]
            for xx in range(bx, bx + 24, 4):
                s += lum(r[xx*3], r[xx*3+1], r[xx*3+2])
        if s < best: best, cx, cy = s, bx + 12, by + 12
bands = []
for (r0, r1) in ((0, 20), (20, 45), (45, 80), (80, 130), (130, 200)):
    s = n = 0
    for yy in range(max(0, cy-200), min(h, cy+200)):
        r = rows[yy]
        for xx in range(max(0, cx-200), min(w, cx+200), 2):
            d2 = (xx-cx)**2 + (yy-cy)**2
            if r0*r0 <= d2 < r1*r1:
                s += lum(r[xx*3], r[xx*3+1], r[xx*3+2]); n += 1
    bands.append(s/n if n else 0)
check(all(bands[i] < bands[i+1] + 1e-9 for i in range(len(bands)-1)),
      "B4 shipped plate: radial profile rises from the core, no bloom ring (%s)"
      % " -> ".join("%.0f" % b for b in bands))

sub = open(os.path.join(ROOT, "js/substrate.js")).read()
check("reduced ? Infinity" in sub
      and "const toneNow = done || (streaming && !reduced" in sub
      and "if (toneNow)" in sub,
      "B5 reduced motion: whole-plate development, tonemap only at completion")
check(sub.count("ANCH = cam.ANCH") == 1 and "ANCH" not in sub[sub.index("function depositBatch"):sub.index("function stateHash")],
      "B6 development never touches the camera anchors")
# EVIDENCE: retained-field-and-tonemap-bounds
check("const FIELD_TGT = 90000" in sub and "function summarizeField" in sub
      and "fields[i] = summarizeField(plateDev)" in sub,
      "B7 completed plates retain bounded density summaries, not full grids")
check("const TONEMAP_MS = 80" in sub and "t - plateDev.lastTone >= TONEMAP_MS" in sub,
      "B8 progressive tonemapping is cadence-bounded and completion-forced")
# EVIDENCE: poster-swaps-at-equivalence
check("let streaming = false;" in sub and "if (i === 0 && posterEl) { posterEl.remove(); posterEl = null; }" in sub
      and "if (!streaming || devPlateN !== 1) return Infinity;" in sub,
      "B11 the promoted exposure is replaced at the terminal state and never restored")
# EVIDENCE: engine-invariant-world
kernel = sub[sub.index("function computeOrbit"):sub.index("function tonemapInto")]
check(not re.search(r"Math\.(sin|cos|atan2)\(", kernel) and "CM.datan2" in sub and "CM.dsin" in sub,
      "B10 the world's recurrence uses no engine-defined transcendental")
check("datan2" in open(os.path.join(ROOT, "js/manifest.js")).read(),
      "B10 the derivation core exports the deterministic angle")
# EVIDENCE: fixed-step-development
check("const DEV_BATCH = 60000" in sub and "developStep(plateDev, P)" in sub
      and "batch * 0.88" not in sub and "performance.now" not in sub[sub.index("function depositBatch"):sub.index("function stateHash")],
      "B9 development is a fixed-step sequence; cadence never sizes a batch")

print()
if fails:
    print("MOTION LAWS: %d FAILURE(S)" % len(fails))
    sys.exit(1)
print("MOTION LAWS: all enforced laws pass")
