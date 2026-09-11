/* tools/test-exposure.js — the exposure and reading laws under jsc.
   The tone map is exercised as SHIPPED (tonemapInto on synthetic fields), not
   through a mirrored formula: the threshold, the saturation percentile, the
   ink identity and monotonicity are properties of the function the page runs.
   The reading law is EXECUTED — CL-06/CL-06c as predicates, the ambient's
   monotone brightening, the membrane's scope and its necessity — and the camera
   ladder is checked at its plate depths.

   Run: jsc js/manifest.js js/substrate.js js/claims.js tools/test-exposure.js
   Prints PASS lines; throws — nonzero exit — on any failure. */
"use strict";
var S = globalThis.CytherSubstrate, CM = globalThis.CytherManifest, C = globalThis.CytherClaims;
var fails = 0;
function ok(cond, name) {
  if (cond) { print("PASS  " + name); }
  else { fails++; print("FAIL  " + name); }
}

/* ---- a synthetic field on a SHIPPED plate: the plate's own exposure parameters
   (plateState), its density replaced by a ramp 1..n, every deposit in lobe 0,
   optionally one outlier cell. Plate 3 is ink on paper, plate 0 is luminous. ---- */
var cam = S.deriveAnchors(CM.CANON), frame = S.frameFor(cam.bounds, 320, 240);
function field(plate, n, outlier) {
  var st = S.plateState(CM.CANON, plate, cam.ANCH[plate], frame);
  st.total = new Float32Array(n); st.c0 = new Float32Array(n); st.c1 = st.c2 = st.c3 = new Float32Array(n);
  for (var i = 0; i < n; i++) st.total[i] = st.c0[i] = i + 1;
  if (outlier) st.total[n - 1] = st.c0[n - 1] = outlier;
  st.maxT = outlier || n;
  return st;
}
function tone(st) { var d = new Uint8ClampedArray(st.total.length * 4); S.tonemapInto(st, d); return d; }
var alpha = (d, cell) => d[cell * 4 + 3], rgb = (d, cell) => [d[cell * 4], d[cell * 4 + 1], d[cell * 4 + 2]];
var monotone = (d, n) => { for (var i = 1; i < n; i++) if (alpha(d, i) < alpha(d, i - 1)) return false; return true; };
var N = 1000, INK = field(3, N), LUM = field(0, N), ink = tone(INK), lum = tone(LUM);
ok(INK.floor === 0 && INK.gain === 1 && INK.satQ === 1 && LUM.floor > 0 && LUM.gain < 1 && LUM.satQ < 1,
   "plate 3 declares the identity exposure (ink); plate 0 declares threshold, gain and saturation (luminous)");

/* EVIDENCE: exposure-threshold */
ok(alpha(ink, 0) > 0, "ink: paper records every grain — a single deposit prints (alpha " + alpha(ink, 0) + ")");
ok(alpha(lum, 0) === 0 && alpha(lum, 1) === 0 && alpha(lum, 2) > 0,
   "luminous: counts under the exposure threshold are noise — one- and two-hit cells emit nothing");
/* EVIDENCE: exposure-normalization */
ok(alpha(ink, N - 1) === Math.round(INK.amax * 255) && alpha(ink, 31) === Math.round(Math.log1p(32) / Math.log1p(N) * INK.amax * 255),
   "ink normalizes at its own maximum: the densest cell prints at amax, a mid cell at its log-density share of amax");
ok(String(rgb(ink, 31)) === String(INK.anchors[0]), "hue is owned by region: a cell wholly in lobe 0 prints anchor 0 exactly");
ok(rgb(ink, N - 1).every((v, i) => v <= INK.anchors[0][i] && v >= INK.core[i]), "the densest ink cell moves toward the core, never past it");
ok(monotone(ink, N) && monotone(lum, N), "alpha is monotone in density on both plate kinds");
ok(alpha(lum, N - 1) === 255, "luminous: the densest cell reaches the white core at full amax");
/* EVIDENCE: exposure-saturation */
var inkO = tone(field(3, N, 1e5)), lumO = tone(field(0, N, 1e5)), lumMax = field(0, N, 1e5); lumMax.satQ = 1; lumMax = tone(lumMax);
ok(alpha(lumO, N - 2) === 255 && alpha(lumO, N - 1) === 255,
   "luminous: one outlier cannot set the range — the 99.7th percentile clips, and the structure below it saturates");
ok(alpha(lumMax, N - 2) < 180, "control: the same field normalized at its maximum leaves that structure under 180/255");
ok(alpha(inkO, N - 2) < alpha(inkO, N - 1) && alpha(inkO, N - 1) === Math.round(INK.amax * 255),
   "ink does not clip: the densest deposit IS the densest deposit");

/* ---- the reading law, executed ---- */
function lumin(c) { var f = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; }
function wcag(a, b) { var la = lumin(a), lb = lumin(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
var R = S.READING, hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
var lay = (inkRgb, g) => inkRgb.map((v, i) => v * 0.66 + g[i] * 0.34);
/* EVIDENCE: reading-claims-hold */
var cl6 = C.contrastClaim(), cl6c = C.secondaryContrastClaim();
ok(cl6.ok, "CL-06 holds when executed: " + cl6.detail);
ok(cl6c.ok, "CL-06c holds when executed: " + cl6c.detail);
ok(0 < R.FLIP_START && R.FLIP_START < R.SW_UP && R.SW_UP < R.SW_DOWN && R.SW_DOWN <= 3, "phases are ordered: surface, flip, switch band, depth");
/* EVIDENCE: ambient-brightens */
var brighter = true, prev = -1;
for (var i = 0; i <= 300; i++) { var L = lumin(S.bgRgbAt(i / 100)); if (L < prev) brighter = false; prev = L; }
ok(brighter && lumin(S.bgRgbAt(0)) < 0.01 && lumin(S.bgRgbAt(3)) > 0.8,
   "the turned ladder brightens monotonically: unexposed field at the surface, paper at the floor");
/* EVIDENCE: membrane-scope */
var scope = true, needed = false;
for (var i = 0; i <= 300; i++) {
  var d = i / 100, raw = S.bgRgbAt(d), light = S.readingGroundAt(d, "light");
  if (String(S.readingGroundAt(d, "dark")) !== String(raw)) scope = false;              /* dark ink: always the raw ambient */
  if (d <= R.FLIP_START ? String(light) !== String(raw) : lumin(light) >= lumin(raw)) scope = false;  /* light: raw, then darker membrane */
  if (d > R.FLIP_START && d <= R.SW_DOWN && wcag(lay(hex(R.LIGHT), raw), raw) < 4.5 && wcag(lay(hex(R.LIGHT), light), light) >= 4.5) needed = true;
}
ok(scope, "the membrane grounds light ink past FLIP_START and nothing else");
ok(needed, "the membrane is load-bearing: inside the flip phase 66% light ink fails AA on the raw ambient and holds on the membrane");
ok(wcag(lay(hex(R.DARK), S.bgRgbAt(R.SW_UP)), S.bgRgbAt(R.SW_UP)) >= 4.5 && wcag(lay(hex(R.DARK), S.bgRgbAt(R.SW_UP - 0.2)), S.bgRgbAt(R.SW_UP - 0.2)) < 4.5,
   "dark ink is admitted only once the ground is paper: 66% dark holds at SW_UP and fails 0.2 shallower");

/* ---- the ambient ladder and the camera at its plate depths ---- */
var toRgb = h => "rgb(" + hex(h).join(",") + ")";
var a0 = S.ambientAt(0), a1 = S.ambientAt(1);
ok(a0.bg === toRgb(S.BGS[0][0]) && a0.ink === toRgb(S.BGS[0][1]) && a0.accent === toRgb(S.ACCENTS[0]), "depth 0 is exposure 0's ambient exactly");
ok(a1.bg === toRgb(S.BGS[3][0]) && a1.ink === toRgb(S.BGS[3][1]) && a1.accent === toRgb(S.ACCENTS[3]) && S.ACCENTS[3] === "#2036C7", "depth 1 is exposure 3's ambient exactly; the floor's accent is the state mark");
var cam = S.deriveAnchors(CM.CANON), ladder = true, crossfade = true;
for (var k = 0; k < 4; k++) {
  var c = S.cameraAt(k / 3, cam.ANCH, 1, 1440, 900);
  if (c.z !== S.ZOOMS[k] || c.tiles[k].o !== 1 || c.tiles[k].A !== 1 || c.tiles.filter(t => t.o > 0).length !== 1) ladder = false;
}
for (var p = 0; p <= 1; p += 1 / 997) {
  var sum = S.cameraAt(p, cam.ANCH, 1, 1440, 900).tiles.reduce((s, t) => s + t.o, 0);
  if (Math.abs(sum - 1) > 1e-12) crossfade = false;
}
ok(ladder && S.ZOOMS.every((z, i) => i === 0 || z > S.ZOOMS[i - 1]), "at depth k/3 plate k is at unit scale, alone, at zoom ZOOMS[k]; the ladder ascends");
ok(crossfade, "tile opacities sum to one at every depth — the crossfade neither double-exposes nor drops the world");

if (fails > 0) throw new Error(fails + " exposure/reading-law regression(s) failed");
print("exposure and reading laws: all pass");
