/* ============================================================================
   js/substrate.js  →  window.CytherSubstrate
   The mark is the world. Four pre-rendered exposures of one derived object form
   the background; scroll moves a derived camera from far-field observation into
   the filament core — transform + opacity only, zero substrate rasters per frame.

   Ported from newC3/substrate-demo.html. Amendment (§5.2): the camera ANCHORS are
   derived from CytherManifest.dsinOrbit(params, 220000) — the engine-invariant
   orbit. Amendment (§8.1): the PLATES are too. The deposition recurrence and the
   minimap point cloud ran on native Math.sin/Math.cos, so the rendered world was
   engine-dependent: measured 2026-09-08, jsc and Chrome agree on Math.sin at a
   probe point yet diverge by ~1e-10 after the 40-step warmup, and a chaotic map
   amplifies that into a different plate (terminal state 18188a0b vs b31403ff).
   One object, one world means one recurrence: dsin/dcos everywhere — also FASTER
   than native in Chrome (0.45x, measured). The camera derivation CL-08 re-checks
   and the plates the reader sees are now the same arithmetic.

   Pure geometry (deriveAnchors / cameraAt / ambientAt) is DOM-free and testable
   under jsc; all canvas + gesture + boot wiring is guarded behind `document`.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;

/* ================= locked constants (§4.1) ================= */
/* The zoom ladder. Far-field was 0.9, which framed the whole orbit as one soft ball:
   the mark had structure the reader could not see. 1.3 shows the filament arcs and
   caustics while the object still reads as a periphery observed from far, with paper
   around it — 1.8 fills the frame with the dense interior and stops being a periphery
   at all. The ladder is scaled whole, so the descent keeps its log-spaced ratios
   (2.11, 1.89, 1.89) exactly. Measured sweep: docs/audit/07. */
const ZOOMS   = [1.3, 2.75, 5.2, 9.8];
const BGS     = [["#070A10","#C7D2E4"],["#3A4658","#DDE6F2"],["#B9C3D2","#131A26"],["#ECF0F4","#101620"]];
const PANELS  = [[10,15,23,.55],[14,20,29,.50],[240,245,251,.55],[255,255,255,.60]];
const ACCENTS = ["#7FA0FF","#5F7BFF","#2A48D6","#2036C7"];
const ORBIT_N = 220000;
/* ================= the plate grammar (P8 — plate replaces scatter) =================
   aion-v2 deposition per exposure: four anchor inks per plate, hue owned by the
   ANGULAR REGION of the orbit (not by time or density); one lobe of every plate
   carries its depth's accent. rot re-indexes lobe ownership per exposure, so the
   crossfade reads as another exposure of the same state, not a resolution level.
   Luminous plates emit (core = white emission, earned only where density
   saturates); ink plates deposit (core = densest ink). The observation end of
   the descent is luminous and the record end is printed: at the surface the
   mark is a live accumulation on an unexposed field, and at the floor it is
   dry ink on paper. The exposure order therefore runs emission -> ink, and the
   ambient ramp above runs with it. */
/* `floor` is the exposure threshold, and it is the one place the two kinds of
   plate genuinely differ in physics rather than in palette. Paper records every
   grain: a single deposit is ink, so the ink plates threshold at zero. An
   unexposed field does not: counts below threshold are noise, not signal, and a
   sensor that renders them produces fog instead of black. Without it the whole
   orbit disc lifts off the ground as a uniform haze and the mark loses its
   figure — 0.14 is just above a two-hit cell (0.137 of full log density at a
   typical maxT), so the field between filaments is black and everything the
   plate actually resolved keeps the range that haze was spending.

   `gain` is the exponent applied AFTER the threshold, and it is not a return of
   the tone gamma docs/audit/07 removed — that was 1.5, a DARKENING curve on a
   printed exposure, and it is still 1.0 here for both ink plates. On paper the
   ground is the brightest thing in the frame and the plate can only subtract
   from it; on an unexposed field the plate is the only source of light, and a
   filament left at 19% of range is not dim ink, it is an underexposed frame.
   0.65 spends the range the threshold recovered on the structure the plate
   actually resolved, and it is what lets the core onset (0.68) ever be reached
   at the far field, where nothing else in the frame is bright.

   `satQ` is where the exposure saturates, and it is the last of the three. A
   plate normalized to its own maxT lets ONE outlier cell set the range for the
   whole raster: with a long-tailed density field the hottest cell is far above
   the structure the plate resolved, so the core onset is never reached and the
   mark has no highlight anywhere. Measured on the shipped frame the object's
   brightest pixel was L=0.45 against L=0.82 for the headline — the statement
   was 1.8x brighter than the mark it was supposed to sit inside. An emissive
   sensor has a full-well capacity and clips; exposing at the 99.7th percentile
   of ink-bearing cells is that clip, and the 0.3% above it are the cores. Ink
   does not clip — the densest deposit IS the densest deposit — so the printed
   plates keep maxT normalization exactly as docs/audit/07 left it. */
const PLATE = [
  { anchors:[[167,184,222],[127,160,255],[196,205,222],[83,107,222]], rot:0.12, core:[255,255,255], amax:1.00, floor:0.16, gain:0.65, satQ:0.997 },
  { anchors:[[137,159,214],[95,123,255],[173,187,223],[109,132,205]], rot:0.35, core:[240,246,255], amax:0.97, floor:0.16, gain:0.65, satQ:0.997 },
  { anchors:[[36,52,110],[22,32,72],[42,72,214],[16,22,48]],          rot:0.62, core:[8,12,32],     amax:0.95, floor:0,    gain:1.00, satQ:1     },
  { anchors:[[16,22,32],[30,44,96],[10,13,20],[32,54,199]],           rot:0.85, core:[6,9,18],      amax:0.95, floor:0,    gain:1.00, satQ:1     }
];
const PLATE_DEP = [900000, 1200000, 1800000, 2400000];   /* in-view deposit targets */
const PLATE_CAP = [6e6, 9e6, 22e6, 34e6];                /* recurrence iteration ceilings */
const BIN_TGT   = 720000;                                /* accumulation cells — v2's cap */
const FIELD_TGT = 90000;                                 /* retained reading-field summary cells */
const TONEMAP_MS = 80;                                   /* progressive exposure cadence */
const TAU = Math.PI * 2;

/* ================= small math ================= */
const clamp  = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp   = (a,b,t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const mixRgb = (a,b,t) => { const A=hex2rgb(a), B=hex2rgb(b); return A.map((v,i)=>v+(B[i]-v)*t); };
const mixHex = (a,b,t) => `rgb(${mixRgb(a,b,t).map(Math.round).join(",")})`;
const dprCapFor = w => w <= 640 ? 1.25 : w <= 800 ? 1.5 : 2;
const binTargetFor = w => w <= 640 ? 360000 : w <= 900 ? 520000 : BIN_TGT;
const nowMs = () => (typeof performance !== "undefined" && performance.now) ? performance.now() : 0;

/* ================= the development law — one trajectory per world =================
   Development is a SEQUENCE, not a schedule: fixed batches of DEV_BATCH iterations,
   the terminal step the first batch boundary at which the plate meets its deposit
   target (or its iteration cap). For one manifest state, plate, and raster frame
   there is exactly one ordered sequence D_0..D_N, and D_N is the finished plate.
   Wall time, frame cadence, and CPU load choose which D_k is on screen; they never
   choose what D_k contains. Every streamed tonemap is a genuine prefix of the same
   accumulation — a canvas frozen mid-develop is a real half-developed plate.
   tools/test-develop.js verifies this under jsc; test-motion.py B9 pins the form. */
const DEV_BATCH = 60000;
function frameFor(bounds, W, H) {
  const U = Math.min(W, H) / bounds.span * 0.92;
  const sc = Math.min(1, Math.sqrt(binTargetFor(W) / (W * H)));   /* v2's capped internal resolution */
  return { W, H, U, sc, bw: Math.max(320, Math.round(W * sc)), bh: Math.max(240, Math.round(H * sc)) };
}
function plateState(params, i, anchor, frame) {
  const z = ZOOMS[i], sp = PLATE[i], { W, H, U, sc, bw, bh } = frame, n = bw * bh;
  const st = { i, bw, bh, sc, rw: W, rh: H,
    total: new Float32Array(n), c0: new Float32Array(n), c1: new Float32Array(n), c2: new Float32Array(n), c3: new Float32Array(n),
    zu: z * U * sc, ox: (W / 2) * sc - anchor[0] * z * U * sc, oy: (H / 2) * sc - anchor[1] * z * U * sc,
    x: 0.08, y: 0.12, dep: 0, it: 0, k: 0, done: false, maxT: 1e-6,
    target: PLATE_DEP[i], cap: PLATE_CAP[i],
    anchors: sp.anchors, rot: sp.rot, core: sp.core, amax: sp.amax, floor: sp.floor, gain: sp.gain, satQ: sp.satQ };
  const [a, b, c, d] = params, dsin = CM.dsin, dcos = CM.dcos;
  for (let w = 0; w < 40; w++) { const nx = dsin(a*st.y) + c*dcos(a*st.x), ny = dsin(b*st.x) + d*dcos(b*st.y); st.x = nx; st.y = ny; }
  return st;
}
/* v2 deposition, verbatim grammar: angular lobe coloring — hue owned by region */
function depositBatch(st, params, n) {
  const a = params[0], b = params[1], c = params[2], d = params[3];
  const bw = st.bw, bh = st.bh, zu = st.zu, ox = st.ox, oy = st.oy, rot = st.rot;
  const total = st.total, c0 = st.c0, c1 = st.c1, c2 = st.c2, c3 = st.c3;
  const sin = CM.dsin, cos = CM.dcos, atan2 = CM.datan2;
  let x = st.x, y = st.y, mt = st.maxT, dep = st.dep, it = st.it;
  for (let i = 0; i < n && it < st.cap; i++) {
    const nx = sin(a*y) + c*cos(a*x), ny = sin(b*x) + d*cos(b*y);
    x = nx; y = ny; it++;
    const fx = x*zu + ox, fy = y*zu + oy;
    if (fx < 0 || fy < 0 || fx >= bw || fy >= bh) continue;
    const idx = (fy|0)*bw + (fx|0);
    let u = (atan2(y, x)/TAU + 0.5)*4 + rot*4;
    u -= ((u/4)|0)*4;
    const i0 = u|0, f = u - i0, w0 = 1 - f;
    if (i0 === 0) { c0[idx] += w0; c1[idx] += f; }
    else if (i0 === 1) { c1[idx] += w0; c2[idx] += f; }
    else if (i0 === 2) { c2[idx] += w0; c3[idx] += f; }
    else { c3[idx] += w0; c0[idx] += f; }
    const t = (total[idx] += 1);
    if (t > mt) mt = t;
    dep++;
  }
  st.x = x; st.y = y; st.maxT = mt; st.dep = dep; st.it = it;
}
/* one development step, D_k → D_k+1; true once the plate is finished */
function developStep(st, params) {
  depositBatch(st, params, DEV_BATCH); st.k++;
  st.done = st.dep >= st.target || st.it >= st.cap;
  return st.done;
}
/* FNV-1a over the deposited field plus its counters — a checkpoint's identity */
function stateHash(st) {
  const bytes = new Uint8Array(st.total.buffer, st.total.byteOffset, st.total.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= st.dep; h = Math.imul(h, 0x01000193) >>> 0;
  h ^= st.it;  h = Math.imul(h, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/* ================= the derived object — native orbit for the tiles ================= */
function computeOrbit(params) {
  const [a,b,c,d] = params;
  const dsin = CM.dsin, dcos = CM.dcos;   /* the engine-invariant core — the whole world runs on it */
  let x = 0.08, y = 0.12;
  for (let i = 0; i < 40; i++) { const nx = dsin(a*y)+c*dcos(a*x), ny = dsin(b*x)+d*dcos(b*y); x=nx; y=ny; }
  const pts = new Float32Array(ORBIT_N * 2);
  let minx=1e9, maxx=-1e9, miny=1e9, maxy=-1e9;
  for (let i = 0; i < ORBIT_N; i++) {
    const nx = dsin(a*y)+c*dcos(a*x), ny = dsin(b*x)+d*dcos(b*y);
    x = nx; y = ny; pts[i*2] = x; pts[i*2+1] = y;
    if (x<minx) minx=x; if (x>maxx) maxx=x; if (y<miny) miny=y; if (y>maxy) maxy=y;
  }
  return { pts, bounds: { minx, maxx, miny, maxy, cx:(minx+maxx)/2, cy:(miny+maxy)/2,
    span: Math.max(maxx-minx, maxy-miny, 1e-3) } };
}

/* ================= the derived camera — anchors from the dsin orbit (§5.2) =================
   Anchors = densest cells of the ENGINE-INVARIANT orbit, chosen by digest, spaced
   apart so the journey travels. Bounds come from the same dsin orbit so the whole
   transform frame is coherent with the derivation CL-08 re-checks. */
function deriveAnchors(params) {
  const N = ORBIT_N, G = 96;
  const orbit = CM.dsinOrbit(params, N);          /* Float32Array(N*2), bit-identical across engines */
  let minx=1e9, maxx=-1e9, miny=1e9, maxy=-1e9;
  for (let i = 0; i < N; i++) {
    const x = orbit[i*2], y = orbit[i*2+1];
    if (x<minx) minx=x; if (x>maxx) maxx=x; if (y<miny) miny=y; if (y>maxy) maxy=y;
  }
  const span = Math.max(maxx-minx, maxy-miny, 1e-3);   /* floor: a collapsed fork must not divide by zero */
  const cx = (minx+maxx)/2, cy = (miny+maxy)/2;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < N; i++) {
    const gx = clamp(((orbit[i*2]-minx)/span*G)|0, 0, G-1);
    const gy = clamp(((orbit[i*2+1]-miny)/span*G)|0, 0, G-1);
    grid[gy*G+gx]++;
  }
  const cells = [];
  for (let i = 0; i < G*G; i++) if (grid[i] > 0) cells.push([grid[i], i]);
  cells.sort((u,v) => v[0] - u[0]);
  const top = cells.slice(0, 48);
  const h = CM.fnv("camera:" + params.map(v => v.toFixed(3)).join(","));
  const chosen = []; let k = top.length ? h % top.length : 0;
  /* bounded walk — a collapsed fork can make the spacing test unsatisfiable; after
     256 tries the center fallback takes over instead of hanging */
  for (let tries = 0; tries < 256 && chosen.length < 3 && top.length; tries++) {
    const idx = top[k % top.length][1];
    const ax = minx + ((idx % G) + 0.5) / G * span, ay = miny + (((idx / G) | 0) + 0.5) / G * span;
    if (chosen.every(c => Math.hypot(c[0]-ax, c[1]-ay) > span * 0.16)) chosen.push([ax, ay]);
    k = (k * 31 + 7) % 9973;
  }
  while (chosen.length < 3) chosen.push([cx, cy]);
  return { ANCH: [[cx, cy], ...chosen], bounds: { minx, maxx, miny, maxy, cx, cy, span } };
}

/* ================= the observation transform — pure, testable ================= */
function cameraAt(p, ANCH, U, W, H) {
  const d = p * 3;
  const i = clamp(d | 0, 0, 2), f = d - i;
  const z = ZOOMS[i] * Math.pow(ZOOMS[i+1] / ZOOMS[i], f);   /* log-space zoom */
  const sf = smooth(f);
  const cx = lerp(ANCH[i][0], ANCH[i+1][0], sf);
  const cy = lerp(ANCH[i][1], ANCH[i+1][1], sf);
  const tiles = [];
  for (let k = 0; k < 4; k++) {
    const o = clamp(1 - Math.abs(d - k), 0, 1);
    const A = z / ZOOMS[k];
    const tx = (1 - A) * W / 2 + (ANCH[k][0] - cx) * z * U;
    const ty = (1 - A) * H / 2 + (ANCH[k][1] - cy) * z * U;
    tiles.push({ o, A, tx, ty });
  }
  return { z, cx, cy, tiles };
}

/* A plate's backing is rasterized in one viewport frame and may be composed in a
   later one: browser chrome changes the viewport far more often than the exposure
   can be re-rendered. Referencing the composition to the frame the backing was
   rasterized in keeps the tile geometrically true across any viewport change —
   a plate may be stale in COVERAGE, never in GEOMETRY. Redevelopment restores
   coverage and resolution; it never restores correctness. Identity frame in,
   identical tile out, so a settled viewport composes exactly as cameraAt states. */
function composeTile(t, W, H, U, r) {
  if (!r || (r.W === W && r.H === H && r.U === U)) return t;
  const A = t.A * U / r.U;
  return { o: t.o, A, tx: t.tx + t.A * W / 2 - A * r.W / 2, ty: t.ty + t.A * H / 2 - A * r.H / 2 };
}

/* ================= ambient — bg / ink / panel / accent interpolate with depth ================= */
function ambientAt(p) {
  const d = p * 3, bi = clamp(d | 0, 0, 2), bf = d - bi;
  const PA = PANELS[bi], PB = PANELS[bi+1];
  const pn = PA.map((v,j) => v + (PB[j]-v) * bf);
  return {
    bg:     mixHex(BGS[bi][0], BGS[bi+1][0], bf),
    ink:    mixHex(BGS[bi][1], BGS[bi+1][1], bf),
    panel:  `rgba(${pn[0]|0},${pn[1]|0},${pn[2]|0},${pn[3].toFixed(2)})`,
    accent: mixHex(ACCENTS[bi], ACCENTS[bi+1], bf)
  };
}

/* ================= reading exposure — the record's own law (P9) =================
   Physics may be continuous; legibility is admitted or refused. Reading ink is
   bistable with hysteresis. On the turned ladder the ambient BRIGHTENS
   monotonically with depth: light ink holds on the raw ambient while the field
   is unexposed, grounds on the absorptive membrane from FLIP_START through the
   flip phase, and dark ink is admitted at the switch, on the raw ambient, once
   the ground is genuinely paper. SW_DOWN/SW_UP are the two edges of one
   hysteresis band (gap 0.09).

   The switch is derived from the QUIETEST meaningful layer, not the loudest —
   calibrating on alpha 1.0 is what once let a 55% label sit at 2.58:1. 66% is
   the stylesheet's ink floor, and the law is that 66% ink holds AA on its
   phase-locked ground at every depth. The constants sit inside that admissible
   range with margin (measured 2026-09-11: 66% dark ink first holds on the raw
   ambient at d=2.00, below SW_UP; 66% light ink last holds on the raw ambient
   at d=0.94, past FLIP_START). Exact ratios are verifier-derived — CL-06,
   CL-06c, tools/test-exposure.js — not normative constants. */
const READING = {
  SW_DOWN: 2.15, SW_UP: 2.06, FLIP_START: 0.90,
  DARK: "#101620", LIGHT: "#DCE6F5",
  MEMBRANE: [16, 22, 31], MEMBRANE_A: 0.82
};
function bgRgbAt(d) { const bi = clamp(d|0, 0, 2), bf = d - bi; return mixRgb(BGS[bi][0], BGS[bi+1][0], bf); }
function readingGroundAt(d, state) {
  /* light ink past FLIP_START sits on the membrane (every flip-phase reading block carries it) */
  if (state === "light" && d > READING.FLIP_START) {
    const bg = bgRgbAt(d), m = READING.MEMBRANE, a = READING.MEMBRANE_A;
    return m.map((v, i) => v*a + bg[i]*(1-a));
  }
  return bgRgbAt(d);
}

/* pure surface — always available (used by CL-06/CL-08, the compositing harness, ambient tests) */
/* the exposure: v2 tone map — log density → luminance (γ1.5 on log), quadratic core
   (onset .68). v2 baked an opaque ground; here the ambient is the page, so luminance
   drives alpha. `data` must have Uint8ClampedArray assignment semantics (round-half-even,
   clamped): the browser's ImageData and the offline poster producer round identically,
   which is what makes a promoted raster comparable to a rendered one. */
/* The exposure point in LOG space: the log-density at which the plate saturates.
   Returned as a log so nothing has to be exponentiated back — expm1 would put a
   second engine-defined transcendental in the raster path for no gain, and the
   promoted poster's cross-engine equality depends on that path staying narrow. */
const SAT_BINS = 1024;
function exposureLog(st) {
  const lm = Math.log1p(st.maxT);
  if (st.satQ >= 1 || lm <= 0) return lm;
  const total = st.total, hist = new Int32Array(SAT_BINS);
  let nz = 0;
  for (let i = 0; i < total.length; i++) {
    const t = total[i];
    if (t < 0.5) continue;
    let b = (Math.log1p(t) / lm * SAT_BINS) | 0;
    if (b >= SAT_BINS) b = SAT_BINS - 1;
    hist[b]++; nz++;
  }
  if (nz === 0) return lm;
  const want = nz - Math.floor(nz * st.satQ);
  let acc = 0, b = SAT_BINS - 1;
  for (; b > 0; b--) { acc += hist[b]; if (acc >= want) break; }
  return (b + 1) / SAT_BINS * lm;
}

function tonemapInto(st, data) {
  const d = data;
  const A = st.anchors, core = st.core, amax = st.amax;
  const invLog = 1 / exposureLog(st);
  const flr = st.floor, invFlr = 1 / (1 - flr), gain = st.gain;
  const a0r=A[0][0],a0g=A[0][1],a0b=A[0][2],a1r=A[1][0],a1g=A[1][1],a1b=A[1][2],
        a2r=A[2][0],a2g=A[2][1],a2b=A[2][2],a3r=A[3][0],a3g=A[3][1],a3b=A[3][2];
  const total = st.total, c0 = st.c0, c1 = st.c1, c2 = st.c2, c3 = st.c3;
  for (let i = 0, j = 0; i < total.length; i++, j += 4) {
    const t = total[i];
    if (t < 0.5) { d[j+3] = 0; continue; }
    /* normalized log density, no gamma. The 1.5 curve here spent the mark's presence
       for nothing: it put a typical filament at 16% alpha, so the density field was
       computed and then thrown away at the last step. At 1.0 the same filament reads
       at 29% and the cores are earned at the same 0.68 onset. */
    const L0 = Math.min(1, Math.log1p(t) * invLog);
    if (L0 <= flr) { d[j+3] = 0; continue; }
    const Lf = (L0 - flr) * invFlr;
    const L = gain === 1 ? Lf : Math.pow(Lf, gain);
    const inv = 1 / t;
    let r = (c0[i]*a0r + c1[i]*a1r + c2[i]*a2r + c3[i]*a3r) * inv;
    let g = (c0[i]*a0g + c1[i]*a1g + c2[i]*a2g + c3[i]*a3g) * inv;
    let b = (c0[i]*a0b + c1[i]*a1b + c2[i]*a2b + c3[i]*a3b) * inv;
    let cw = L > 0.68 ? (L - 0.68) / 0.32 : 0; cw *= cw * 0.9;
    r += (core[0]-r)*cw; g += (core[1]-g)*cw; b += (core[2]-b)*cw;
    d[j] = r; d[j+1] = g; d[j+2] = b;
    d[j+3] = Math.min(255, L * amax * 255);
  }
}

/* Reading envelopes need representative density and the quietest third, not
   a second full-resolution render. Retain a bounded stratified summary so
   the four completed plates occupy <= FIELD_TGT Float32 cells each instead
   of four more BIN_TGT-sized grids. */
function summarizeField(st) {
  const fs = Math.min(1, Math.sqrt(FIELD_TGT / (st.bw * st.bh)));
  const fw = Math.max(96, Math.round(st.bw * fs)), fh = Math.max(72, Math.round(st.bh * fs));
  const total = new Float32Array(fw * fh);
  /* A stratified centre sample preserves the spatial field needed by the 8×6
     envelope probe and quiet-third atlas without another full-grid scan. */
  for (let gy = 0; gy < fh; gy++) {
    const sy = Math.min(st.bh - 1, (((gy + 0.5) * st.bh / fh) | 0)), src = sy * st.bw;
    for (let gx = 0; gx < fw; gx++) {
      const sx = Math.min(st.bw - 1, (((gx + 0.5) * st.bw / fw) | 0));
      total[gy * fw + gx] = st.total[src + sx];
    }
  }
  let maxT = 1e-6;
  for (let i = 0; i < total.length; i++) {
    if (total[i] > maxT) maxT = total[i];
  }
  const field = { total, bw: fw, bh: fh, satQ: st.satQ, scx: st.sc * fw / st.bw, scy: st.sc * fh / st.bh, maxT };
  field.expLog = exposureLog(field);   /* the summary is immutable: its exposure point is derived once, here */
  return field;
}

/* ================= the development server — one job, one world =================
   The kernel's protocol, engine- and thread-agnostic. `plate` opens a job: the
   deterministic state, its params COPIED at open, so a fork nudged mid-develop
   cannot bend a trajectory already running. `advance` runs the fixed-step sequence
   toward a deposit goal under a time budget and reports the prefix reached — with
   the raster when asked and always at the terminal state, where the bounded density
   summary comes with it. `hash` names the checkpoint. The Worker and the inline
   fallback run this same closure; the main thread's presentation law owns goal,
   cadence and budget, so execution location changes and the trajectory does not
   (tools/test-develop.js drives both against each other). A superseded generation
   is answered with nothing. */
function developServer() {
  let job = null, params = null;
  return function serve(m) {
    if (m.type === "plate") { params = m.params.slice(); job = plateState(params, m.plate, m.anchor, m.frame); job.gen = m.gen; return null; }
    if (!job || m.gen !== job.gen) return null;
    if (m.type === "hash") return stateHash(job);
    const end = nowMs() + m.budgetMs;
    while (!job.done && job.dep < m.goal && nowMs() < end) developStep(job, params);
    const r = { type: "frame", gen: job.gen, plate: job.i, k: job.k, dep: job.dep, it: job.it, done: job.done };
    if (m.present || job.done) { r.rgba = new Uint8ClampedArray(job.total.length * 4); tonemapInto(job, r.rgba); }
    if (job.done) r.field = summarizeField(job);
    return r;
  };
}

const API = { ZOOMS, BGS, PANELS, ACCENTS, READING, computeOrbit, deriveAnchors, cameraAt, composeTile,
  ambientAt, bgRgbAt, readingGroundAt, dprCapFor, binTargetFor,
  DEV_BATCH, frameFor, plateState, developStep, stateHash, exposureLog, tonemapInto, summarizeField, developServer };

/* ============================================================================
   DOM wiring — canvases, gestures, boot. Guarded so jsc loads the pure surface.
   ============================================================================ */
if (typeof document !== "undefined") {
  const root_el = document.documentElement;
  const $ = id => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let P = CM.CANON.slice();
  let linkParams = null;                 /* set from #m= at boot → REPRODUCED FROM LINK */
  let pts = null, bounds = null, ANCH = null;
  const rasters = [null, null, null, null];   /* the viewport frame each plate was rasterized in */
  let canonAnch = null, canonCam = null; /* canonical camera snapshot for CL-08 — fork-independent */
  let W = 0, H = 0, U = 0, DPR = 1;
  let lastP = 0, developing = false;
  let forking = false;
  let hooks = { onChange: () => {}, wake: () => {} };

  const tiles = ["t0","t1","t2","t3"].map(id => $(id));
  const coreCv = $("coreMap");
  let posterEl = $("poster");     /* the promoted terminal exposure, until plate 0 lands */
  /* The first development is a SWAP: the poster already shows the terminal plate, so
     streaming partial exposures over it would run the reader backwards from a finished
     image to a sparse one. Every later development is a REVEAL. */
  let streaming = false;

  function layout() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, dprCapFor(W));
    U = Math.min(W, H) / bounds.span * 0.92;
  }

  function beginPlate(i) {
    const cv = tiles[i];
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    /* the frame this backing is rasterized in — composition references it until
       this plate is rasterized again; it is never stretched to a later frame */
    rasters[i] = { W, H, U };
    const g = cv.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* the deterministic state opens in the server; this is the presentation record.
       The drawImage upscale from the capped bin resolution is the plate grain. */
    const frame = frameFor(bounds, W, H), open = { type: "plate", gen, params: P.slice(), plate: i, anchor: ANCH[i], frame };
    const off = document.createElement("canvas"); off.width = frame.bw; off.height = frame.bh;
    channel.post(open);
    return { i, open, g, off, octx: off.getContext("2d"), bw: frame.bw, bh: frame.bh, rw: W, rh: H,
      dep: 0, target: PLATE_DEP[i], tones: 0, lastTone: 0, t0: nowMs() };
  }

  /* a raster from the server onto the plate's backing */
  function presentPlate(pd, rgba) {
    pd.octx.putImageData(new ImageData(rgba, pd.bw, pd.bh), 0, 0);
    /* the plate's own raster frame, not the live viewport: a resize mid-develop
       must not clip or stretch the exposure already committed to this backing */
    pd.g.clearRect(0, 0, pd.rw, pd.rh);
    pd.g.imageSmoothingEnabled = true; pd.g.imageSmoothingQuality = "high";
    pd.g.drawImage(pd.off, 0, 0, pd.bw, pd.bh, 0, 0, pd.rw, pd.rh);
  }

  function renderCore() {
    if (!coreCv) return;
    const cw = 56, ch = Math.round(56 * (H / W) * 1.4);
    coreCv.width = cw*2; coreCv.height = ch*2; coreCv.style.height = ch + "px";
    const g = coreCv.getContext("2d"); g.setTransform(2,0,0,2,0,0);
    g.clearRect(0, 0, cw, ch);
    const s = Math.min(cw, ch) * 0.86 / bounds.span;
    const ox = cw/2 - bounds.cx*s, oy = ch/2 - bounds.cy*s;
    g.fillStyle = "rgba(120,135,160,.5)";
    for (let k = 0; k < ORBIT_N; k += 11) g.fillRect(pts[k*2]*s + ox, pts[k*2+1]*s + oy, .7, .7);
    coreCv.dataset.s = s; coreCv.dataset.ox = ox; coreCv.dataset.oy = oy;
  }
  function drawCoreRect(cx, cy, z) {
    /* the reticle is a styled overlay — the minimap canvas never re-rasters on scroll */
    const r = $("coreRect"); if (!r || !coreCv) return;
    const s = +coreCv.dataset.s, ox = +coreCv.dataset.ox, oy = +coreCv.dataset.oy;
    const hw = (W / (2*z*U)) * s, hh = (H / (2*z*U)) * s;
    const width = (hw*2).toFixed(1) + "px", height = (hh*2).toFixed(1) + "px";
    const transform = `translate(${(cx*s+ox-hw).toFixed(1)}px,${(cy*s+oy-hh).toFixed(1)}px)`;
    if (r.style.width !== width) r.style.width = width;
    if (r.style.height !== height) r.style.height = height;
    if (r.style.transform !== transform) r.style.transform = transform;
  }

  /* observe — transform + opacity + ambient, driven by scroll progress p (site owns scroll) */
  const tilePaint = [{}, {}, {}, {}], ambientPaint = {};
  function observe(p) {
    lastP = p;
    const cam = cameraAt(p, ANCH, U, W, H);
    for (let k = 0; k < 4; k++) {
      const t = composeTile(cam.tiles[k], W, H, U, rasters[k]), cv = tiles[k], paint = tilePaint[k];
      const visible = t.o > 0, visibility = visible ? "visible" : "hidden";
      const opacity = visible ? t.o.toFixed(3) : "0";
      const willChange = visible ? "transform, opacity" : "auto";
      if (paint.visibility !== visibility) { cv.style.visibility = visibility; paint.visibility = visibility; }
      if (paint.opacity !== opacity) { cv.style.opacity = opacity; paint.opacity = opacity; }
      if (paint.willChange !== willChange) { cv.style.willChange = willChange; paint.willChange = willChange; }
      if (!visible) continue;
      const transform = `translate(${t.tx.toFixed(2)}px,${t.ty.toFixed(2)}px) scale(${t.A.toFixed(5)})`;
      if (paint.transform !== transform) { cv.style.transform = transform; paint.transform = transform; }
    }
    const amb = ambientAt(p);
    const props = { "--bg": amb.bg, "--inkA": amb.ink, "--panel": amb.panel, "--accent": amb.accent };
    Object.keys(props).forEach(name => {
      if (ambientPaint[name] !== props[name]) { root_el.style.setProperty(name, props[name]); ambientPaint[name] = props[name]; }
    });
    if (posterEl) {
      /* the promoted exposure rides tile 0's frame, so scrolling or resizing before
         the plate lands moves it exactly as the plate it stands in for */
      const t = composeTile(cam.tiles[0], W, H, U, rasters[0]);
      posterEl.style.opacity = t.o.toFixed(3);
      posterEl.style.transform = `translate(${t.tx.toFixed(2)}px,${t.ty.toFixed(2)}px) scale(${t.A.toFixed(5)})`;
    }
    drawCoreRect(cam.cx, cam.cy, cam.z);
    return cam.z;
  }

  /* ================= develop the exposures (boot + fork) ================= */
  let plateQueue = [], plateDev = null, gen = 0, inFlight = false;
  const fields = [null, null, null, null];   /* retained density per plate — envelopes + corridors read it */
  let devSum = 0, devPlateN = 0;
  function developAll(preparedCam) {
    const g = computeOrbit(P); pts = g.pts;                  /* native — minimap, the measurement view */
    const cam = preparedCam || deriveAnchors(P); ANCH = cam.ANCH; bounds = cam.bounds;  /* dsin — camera */
    layout();
    const d = lastP * 3;
    plateQueue = [0,1,2,3].sort((a,b) => Math.abs(d-a) - Math.abs(d-b));  /* most-visible plate first */
    fields[0] = fields[1] = fields[2] = fields[3] = null;
    plateDev = null; inFlight = false; gen++; devSum = 0; devPlateN = 0;   /* a new generation supersedes any job in flight */
    developing = true;
    hooks.wake();
  }
  /* The kernel runs in a Worker: execution location, never trajectory. Where one
     cannot be constructed — Chromium refuses a Worker under file:// — the same
     server runs inline under the per-frame budget; a worker that fails to load
     hands its current plate to the inline server rather than leaving the world
     undeveloped. Replies arrive at onFrame either way. */
  const DEV_MS = 2600, FRAME_BUDGET_MS = 12, WORKER_BUDGET_MS = 50;
  let channel = null;
  function inlineChannel() {
    const serve = developServer();
    return { post: m => { const r = serve(m); if (r) onFrame(r); }, budgetMs: FRAME_BUDGET_MS };
  }
  function openChannel() {
    if (typeof Worker === "undefined") return inlineChannel();
    let w;
    try { w = new Worker("js/develop-worker.js"); }
    catch (e) { if (e.name !== "SecurityError") throw e; return inlineChannel(); }
    w.onmessage = e => onFrame(e.data);
    w.onerror = () => { w.terminate(); channel = inlineChannel(); inFlight = false; if (plateDev) channel.post(plateDev.open); };
    return { post: m => w.postMessage(m), budgetMs: WORKER_BUDGET_MS };
  }
  /* step() — registered with site's shared rAF loop. The development law fixes the
     sequence D_0..D_N; this is the PRESENTATION law: for the plate on screen, elapsed
     time chooses the target deposit (DEV_MS, ease-out) and the server is asked for
     that prefix, one request in flight at a time — a slow machine shows fewer prefixes
     of the same sequence, never a different one. Off-screen plates run to the terminal
     state under the server's budget alone. Reduced motion: whole-plate development,
     the raster only at completion; the terminal state is identical by construction. */
  function depositGoal(st, t) {
    if (!streaming || devPlateN !== 1) return Infinity;
    const u = Math.min(1, (t - st.t0) / DEV_MS);
    return st.target * (1 - (1 - u) * (1 - u));
  }
  function step() {
    if (!plateDev) {
      if (!plateQueue.length) return false;
      plateDev = beginPlate(plateQueue.shift());
      devPlateN++;
    }
    if (inFlight) return true;
    const t = nowMs(), goal = reduced ? Infinity : depositGoal(plateDev, t);
    if (goal <= plateDev.dep) return true;                   /* the prefix on screen is the one asked for */
    /* The density changes with every advance; the 720k-pixel raster does not need to.
       Progressive exposure at a bounded 12.5 Hz, and only while the tile contributes
       pixels (observe() keeps its visibility): a plate developing off-screen advances
       without a raster and is rasterized once when it comes into view. The completed
       state always arrives — the server sends it with `done`, gated by nothing. */
    const present = streaming && !reduced && tilePaint[plateDev.i].visibility === "visible"
      && (plateDev.tones === 0 || t - plateDev.lastTone >= TONEMAP_MS);
    inFlight = true;
    channel.post({ type: "advance", gen, goal, budgetMs: channel.budgetMs, present });
    return true;
  }
  function onFrame(r) {
    if (r.gen !== gen || !plateDev) return;                  /* a superseded generation */
    inFlight = false;
    plateDev.dep = r.dep;
    if (r.rgba) { presentPlate(plateDev, r.rgba); plateDev.lastTone = nowMs(); plateDev.tones++; }
    if (!r.done) return;
    const i = plateDev.i;
    fields[i] = r.field;                    /* compact density outlives the develop; the full grid stays in the server */
    devSum += r.dep;
    plateDev = null;
    /* the same image, now the reader's own: swap at equivalence, never restore.
       A fork or a redevelopment is a different world and the poster cannot speak
       for it, so removal is permanent. */
    if (i === 0 && posterEl) { posterEl.remove(); posterEl = null; }
    if (!plateQueue.length) {
      streaming = true;
      renderCore(); observe(lastP); developing = false; hooks.onChange();
    }
  }

  /* ================= the density field, read back (P9 reading exposure) ================= */
  /* mean tone (0..1) of the dominant plate under a viewport rect — conditions envelopes at rest */
  function fieldEnergy(rect) {
    const cam = cameraAt(lastP, ANCH, U, W, H);
    let k = 0, bo = -1;
    for (let i = 0; i < 4; i++) if (cam.tiles[i].o > bo) { bo = cam.tiles[i].o; k = i; }
    const f = fields[k]; if (!f) return null;
    const t = composeTile(cam.tiles[k], W, H, U, rasters[k]), invLog = 1 / f.expLog;
    let sum = 0, n = 0;
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 8; gx++) {
      const vx = rect.left + (gx + .5) / 8 * rect.width, vy = rect.top + (gy + .5) / 6 * rect.height;
      const bx = ((vx - t.tx) / t.A * f.scx) | 0, by = ((vy - t.ty) / t.A * f.scy) | 0;
      if (bx < 0 || by < 0 || bx >= f.bw || by >= f.bh) continue;
      const dep = f.total[by * f.bw + bx];
      /* the envelope reads the same tone the plate deposits, threshold included */
      if (dep > 0) { const L = Math.log1p(dep) * invLog, p = PLATE[k];
        if (L > p.floor) sum += Math.pow((L - p.floor) / (1 - p.floor), p.gain); }
      n++;
    }
    return n ? sum / n : null;
  }
  /* quietest column third per plate — the negative-space atlas the corridors read */
  function corridorsFor() {
    const out = [];
    for (let k = 0; k < 4; k++) {
      const f = fields[k]; if (!f) return null;
      const y0 = (f.bh * 0.25) | 0, y1 = (f.bh * 0.75) | 0;
      const c1 = (f.bw / 3) | 0, c2 = (f.bw * 2 / 3) | 0;
      const e = [0, 0, 0];
      for (let y = y0; y < y1; y += 2) for (let x = 0; x < f.bw; x += 2) {
        const dep = f.total[y * f.bw + x];
        if (dep) e[x < c1 ? 0 : x < c2 ? 1 : 2] += Math.log1p(dep);
      }
      out.push(e[0] <= e[1] && e[0] <= e[2] ? "l" : e[2] <= e[1] ? "r" : "c");
    }
    return out;
  }
  /* redevelop from the (possibly forked) params — async via the render queue */
  function redevelop() {
    developing = true; hooks.onChange();
    developAll(near(P, CM.CANON) ? canonCam : null);
  }

  /* ================= status / serial ================= */
  const fmt = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(3);
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.0015);
  function serial() { return P.map(fmt).join(" "); }
  function status() {
    if (developing) return "DEVELOPING…";
    if (near(P, CM.CANON)) return `CANONICAL STATE · EPOCH 0${CM.MANIFEST.epoch} · ${CM.CHECKSUM}`;
    if (linkParams && near(P, linkParams)) return "REPRODUCED FROM LINK · IDENTICAL BY CONSTRUCTION";
    return "LOCAL FORK — VISITOR FORK OF THE PUBLIC CHECKSUM";
  }
  function isCanonical() { return near(P, CM.CANON); }

  /* ================= fork — long-press on touch, toggle on desktop ================= */
  function setFork(on) {
    forking = on;
    document.body.classList.toggle("forking", on);
    document.body.style.overflow = on ? "hidden" : "";
    hooks.onChange();
    if (!on) redevelop();
  }
  function resetToCanonical() { P = CM.CANON.slice(); redevelop(); }
  /* one drag step in screen px → the four orbit parameters; pointer and keyboard share it */
  function nudge(dx, dy) {
    P[0] = clamp(P[0] + dx * 0.0014, -2.2, 2.2);
    P[1] = clamp(P[1] + dy * 0.0014, -2.2, 2.2);
    P[2] = clamp(P[2] + dx * 0.0005, -2.2, 2.2);
    P[3] = clamp(P[3] - dy * 0.0005, -2.2, 2.2);
    hooks.onChange();
  }

  function wireGestures() {
    const sub = $("substrate"); if (!sub) return;
    let lastX = 0, lastY = 0, pressTimer = null;
    sub.style.pointerEvents = "auto";
    sub.addEventListener("pointerdown", e => {
      lastX = e.clientX; lastY = e.clientY;
      if (e.pointerType === "touch" && !forking) pressTimer = setTimeout(() => setFork(true), 550);
    });
    sub.addEventListener("pointermove", e => {
      if (pressTimer && Math.hypot(e.clientX-lastX, e.clientY-lastY) > 12) { clearTimeout(pressTimer); pressTimer = null; }
      if (!forking) return;
      nudge(e.clientX-lastX, e.clientY-lastY);
      lastX = e.clientX; lastY = e.clientY;
    });
    sub.addEventListener("pointerup", e => {
      clearTimeout(pressTimer); pressTimer = null;
      if (forking && e.pointerType === "touch") setFork(false);
    });
    sub.addEventListener("pointercancel", () => {
      clearTimeout(pressTimer); pressTimer = null;
      if (forking) setFork(false);   /* a browser-cancelled gesture must never strand the fork lock */
    });
    /* keyboard parity: while forking, arrows apply the same step a 24px drag would;
       Escape ends the fork exactly like toggling FORK off (redevelop, keep the variant) */
    addEventListener("keydown", e => {
      if (!forking || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") { e.preventDefault(); setFork(false); return; }
      const dx = { ArrowLeft: -24, ArrowRight: 24 }[e.key] || 0, dy = { ArrowUp: -24, ArrowDown: 24 }[e.key] || 0;
      if (dx || dy) { e.preventDefault(); nudge(dx, dy); }
    });
  }

  /* ================= boot + resize ================= */
  function boot(opts) {
    opts = opts || {};
    hooks.onChange = opts.onChange || hooks.onChange;
    hooks.wake = opts.wake || hooks.wake;
    if (opts.initialParams && opts.initialParams.length === 4 && opts.initialParams.every(isFinite)) {
      P = opts.initialParams.slice();
      if (opts.fromLink) linkParams = P.slice();
    }
    canonCam = deriveAnchors(CM.CANON);         /* one canonical derivation, reused by the initial canonical develop */
    canonAnch = canonCam.ANCH;                   /* canonical camera — the derivation CL-08 re-checks */
    channel = openChannel();
    developAll(near(P, CM.CANON) ? canonCam : null); /* the site loop streams the exposure */
    renderCore();
    wireGestures();
    observe(0);
    hooks.onChange();
  }

  let rzT = null;
  addEventListener("resize", () => {
    if (!bounds) return;                 /* no camera yet — boot installs one */
    /* Camera geometry follows the viewport on the event itself, and every tile is
       composed against the frame its own backing was rasterized in, so there is no
       interval in which the page displays a geometrically false world. A redevelop
       is scheduled only when the BACKING is wrong — width, device pixel ratio, or
       world scale — so the height-only changes browser chrome produces re-expose
       nothing, and what they do lose (coverage past the old edge) is a plate that
       is transparent there. */
    const pw = W, pu = U, pd = DPR;
    layout();
    if (W !== pw || U !== pu || DPR !== pd) {
      clearTimeout(rzT);
      rzT = setTimeout(() => { developAll(near(P, CM.CANON) ? canonCam : null); renderCore(); observe(lastP); }, 160);
    }
    renderCore(); observe(lastP);
  }, { passive: true });

  /* DOM-facing API */
  API.boot = boot;
  API.observe = observe;
  API.redevelop = redevelop;
  API.step = step;
  API.setFork = setFork;
  API.resetToCanonical = resetToCanonical;
  API.isForking = () => forking;
  API.isCanonical = isCanonical;
  API.anchors = () => ANCH;
  API.canonicalAnchors = () => canonAnch;
  API.params = () => P.slice();
  API.serial = serial;
  API.status = status;
  API.isDeveloping = () => developing;
  API.exposure = () => developing ? { plate: devPlateN, n: devSum + (plateDev ? plateDev.dep : 0) } : null;
  API.fieldCells = () => fields.reduce((n, f) => n + (f ? f.total.length : 0), 0);
  API.fieldEnergy = fieldEnergy;
  API.corridors = corridorsFor;
}

root.CytherSubstrate = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
