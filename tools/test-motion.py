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
check('inkState === "light" && d >= R.SW_DOWN' in site
      and 'inkState === "dark" && d <= R.SW_UP' in site,
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
# Two kinds of exposure, two directions, and they are laws in OPPOSITE senses.
# The mirror must name the plates by what they are, not by index: an index pinned
# to the wrong kind passes without testing anything, which is what happened when
# the exposure order was turned over and these checks kept reporting PASS
# against plates that had become luminous.
FIELD = (7, 10, 16)                 # BGS[0][0] — the unexposed ground
INK_PLATES = {  # js/substrate.js PLATE[2..3] — printed on paper
    2: {"anchors": [(36,52,110),(22,32,72),(42,72,214),(16,22,48)], "core": (8,12,32), "amax": 0.95},
    3: {"anchors": [(16,22,32),(30,44,96),(10,13,20),(32,54,199)], "core": (6,9,18), "amax": 0.95},
}
LUM_PLATES = {  # js/substrate.js PLATE[0..1] — emitted onto the field
    0: {"anchors": [(167,184,222),(127,160,255),(196,205,222),(83,107,222)], "core": (255,255,255),
        "amax": 1.00, "floor": 0.16, "gain": 0.65},
    1: {"anchors": [(137,159,214),(95,123,255),(173,187,223),(109,132,205)], "core": (240,246,255),
        "amax": 0.97, "floor": 0.16, "gain": 0.65},
}
import math
def composited(anchor, core, amax, t, maxT, ground, floor=0.0, gain=1.0):
    L0 = min(1.0, math.log1p(t) / math.log1p(maxT))
    if L0 <= floor: return list(ground)          # below threshold nothing is deposited
    L = ((L0 - floor) / (1 - floor)) ** gain
    cw = (L - 0.68) / 0.32 if L > 0.68 else 0.0
    cw = cw * cw * 0.9
    px = [a + (c - a) * cw for a, c in zip(anchor, core)]
    al = min(1.0, L * amax)
    return [p * (1 - al) + v * al for p, v in zip(ground, px)]

mono_ok = emit_ok = True
for pi, P in INK_PLATES.items():
    for anchor in P["anchors"]:
        for maxT in (10, 100, 1000):
            prev = 1e9
            for t in range(1, maxT + 1):
                L = lum(*composited(anchor, P["core"], P["amax"], t, maxT, PAPER))
                if L > prev + 1e-9: mono_ok = False
                if L > lum(*PAPER) + 1e-9: emit_ok = False
                prev = L
check(mono_ok, "B1 ink plates darken monotonically with density (plates 2-3, all anchors)")
check(emit_ok, "B2 ink plates never exceed paper luminance (no emission)")

rise_ok = black_ok = bound_ok = True
white = lum(255, 255, 255)
for pi, P in LUM_PLATES.items():
    for anchor in P["anchors"]:
        for maxT in (10, 100, 1000):
            prev = -1e9
            for t in range(1, maxT + 1):
                px = composited(anchor, P["core"], P["amax"], t, maxT, FIELD, P["floor"], P["gain"])
                L = lum(*px)
                if L < prev - 1e-9: rise_ok = False
                if L > white + 1e-9: bound_ok = False
                if math.log1p(t) / math.log1p(maxT) <= P["floor"] and px != list(FIELD): black_ok = False
                prev = L
check(rise_ok, "B1e luminous plates brighten monotonically with density (plates 0-1, all anchors)")
check(black_ok, "B1f below the exposure threshold a luminous plate deposits nothing at all")
check(bound_ok, "B2e luminous emission is bounded by its own white core")
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
# The tone map's ONLY transformation beyond the log is the exposure, and the
# exposure is three declared per-plate numbers rather than a curve anyone may
# add. The ink plates must declare the identity exposure, which is what keeps
# docs/audit/07's result — no gamma on a printed plate — a law and not a memory.
plate_rows = re.findall(r"\{ anchors:.*?\}", sub, re.S)
declared = [dict(re.findall(r"(floor|gain|satQ):([\d.]+)", row)) for row in plate_rows]
tone = sub[sub.index("function tonemapInto"):sub.index("const API =")]
check("Math.sqrt(" not in tone and tone.count("Math.pow(") == 1
      and "const L = gain === 1 ? Lf : Math.pow(Lf, gain);" in tone
      and len(declared) == 4 and all(set(d) == {"floor", "gain", "satQ"} for d in declared)
      and all(float(declared[i]["floor"]) == 0 and float(declared[i]["gain"]) == 1
              and float(declared[i]["satQ"]) == 1 for i in (2, 3)),
      "B1b the only transformation beyond the log is the declared exposure; the ink plates declare the identity")
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
# The slice starts at the deposition kernel (plateState / depositBatch), not at
# computeOrbit below it: sliced from computeOrbit this check passed a plate whose
# recurrence ran on Math.sin. The pattern also catches an alias (`const sin = Math.sin`).
kernel = sub[sub.index("function plateState"):sub.index("function tonemapInto")]
check(not re.search(r"Math\.(sin|cos|atan2)\b", kernel) and "CM.datan2" in sub and "CM.dsin" in sub,
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
