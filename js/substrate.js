/* ============================================================================
   js/substrate.js  →  window.CytherSubstrate
   The mark is the world. Four pre-rendered exposures of one derived object form
   the background; scroll moves a derived camera from far-field observation into
   the filament core — transform + opacity only, zero substrate rasters per frame.

   Ported from newC3/substrate-demo.html. Amendment (§5.2): the camera ANCHORS are
   derived from CytherManifest.dsinOrbit(params, 220000) — the engine-invariant
   orbit — not the native-sin tiles. The tiles are drawn from the native orbit
   (fast, visual); the journey through the mark is derivation, verified by CL-08.

   Pure geometry (deriveAnchors / cameraAt / ambientAt) is DOM-free and testable
   under jsc; all canvas + gesture + boot wiring is guarded behind `document`.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;

/* ================= locked constants (§4.1) ================= */
const ZOOMS   = [0.9, 1.9, 3.6, 6.8];
const BGS     = [["#ECF0F4","#101620"],["#B9C3D2","#131A26"],["#3A4658","#DDE6F2"],["#070A10","#C7D2E4"]];
const PANELS  = [[255,255,255,.60],[240,245,251,.55],[14,20,29,.50],[10,15,23,.55]];
const ACCENTS = ["#2036C7","#2A48D6","#5F7BFF","#7FA0FF"];
const ORBIT_N = 220000;
/* ================= the plate grammar (P8 — plate replaces scatter) =================
   aion-v2 deposition per exposure: four anchor inks per plate, hue owned by the
   ANGULAR REGION of the orbit (not by time or density); one lobe of every plate
   carries its depth's accent. rot re-indexes lobe ownership per exposure, so the
   crossfade reads as another exposure of the same state, not a resolution level.
   Light plates deposit ink (core = densest ink); dark plates are luminous
   (core = white emission, earned only where density saturates). */
const PLATE = [
  { anchors:[[16,22,32],[30,44,96],[10,13,20],[32,54,199]],           rot:0.12, core:[6,9,18],      amax:0.95 },
  { anchors:[[36,52,110],[22,32,72],[42,72,214],[16,22,48]],          rot:0.35, core:[8,12,32],     amax:0.95 },
  { anchors:[[137,159,214],[95,123,255],[173,187,223],[109,132,205]], rot:0.62, core:[240,246,255], amax:0.97 },
  { anchors:[[167,184,222],[127,160,255],[196,205,222],[83,107,222]], rot:0.85, core:[255,255,255], amax:1.00 }
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

/* ================= the derived object — native orbit for the tiles ================= */
function computeOrbit(params) {
  const [a,b,c,d] = params;
  let x = 0.08, y = 0.12;
  for (let i = 0; i < 40; i++) { const nx = Math.sin(a*y)+c*Math.cos(a*x), ny = Math.sin(b*x)+d*Math.cos(b*y); x=nx; y=ny; }
  const pts = new Float32Array(ORBIT_N * 2);
  let minx=1e9, maxx=-1e9, miny=1e9, maxy=-1e9;
  for (let i = 0; i < ORBIT_N; i++) {
    const nx = Math.sin(a*y)+c*Math.cos(a*x), ny = Math.sin(b*x)+d*Math.cos(b*y);
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
   bistable with hysteresis. Constants calibrated against the ambient keyframes
   (WCAG): dark ink holds on raw ambient up to SW_DOWN; past the switch, light
   ink grounds on the absorptive membrane (≥9:1 at any depth) until the raw
   ambient alone carries ≥8:1. CL-06 and CL-06c re-derive this.

   SW_DOWN was 1.44 — the last depth at which PRIMARY ink (alpha 1.0) still held
   5.3:1. That criterion ignored every quieter layer: at 1.44 the raw ambient is
   rgb(134,145,161), where even 80% body ink reads 4.03:1 and a 55% label reads
   2.58:1. Because the ambient darkens monotonically, holding the switch that
   late forces EVERY text layer to ≥86% ink — one flat tone, no hierarchy at all.
   The switch is therefore derived from the quietest meaningful layer instead of
   the loudest: at d=1.00 the ambient is rgb(185,195,210) and 66% ink reads
   4.5:1, so 66% is the stylesheet's ink floor and 1.00 is the switch. The
   0.09 hysteresis gap is unchanged. */
const READING = {
  SW_DOWN: 1.00, SW_UP: 0.91, FLIP_END: 2.05,
  DARK: "#101620", LIGHT: "#E3EAF4",
  MEMBRANE: [16, 22, 31], MEMBRANE_A: 0.82
};
function bgRgbAt(d) { const bi = clamp(d|0, 0, 2), bf = d - bi; return mixRgb(BGS[bi][0], BGS[bi+1][0], bf); }
function readingGroundAt(d, state) {
  /* light ink before FLIP_END sits on the membrane (every flip-phase reading block carries it) */
  if (state === "light" && d < READING.FLIP_END) {
    const bg = bgRgbAt(d), m = READING.MEMBRANE, a = READING.MEMBRANE_A;
    return m.map((v, i) => v*a + bg[i]*(1-a));
  }
  return bgRgbAt(d);
}

/* pure surface — always available (used by CL-06/CL-08, the compositing harness, ambient tests) */
const API = { ZOOMS, BGS, PANELS, ACCENTS, READING, computeOrbit, deriveAnchors, cameraAt, ambientAt,
  bgRgbAt, readingGroundAt, dprCapFor, binTargetFor };

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
  let canonAnch = null, canonCam = null; /* canonical camera snapshot for CL-08 — fork-independent */
  let W = 0, H = 0, U = 0, DPR = 1;
  let lastP = 0, developing = false;
  let forking = false;
  let hooks = { onChange: () => {}, wake: () => {} };

  const tiles = ["t0","t1","t2","t3"].map(id => $(id));
  const coreCv = $("coreMap");

  function layout() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, dprCapFor(W));
    U = Math.min(W, H) / bounds.span * 0.92;
  }

  function beginPlate(i) {
    const z = ZOOMS[i], c = ANCH[i], cv = tiles[i];
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* accumulate at v2's capped internal resolution — the drawImage upscale is the plate grain */
    const sc = Math.min(1, Math.sqrt(binTargetFor(W) / (W * H)));
    const bw = Math.max(320, Math.round(W * sc)), bh = Math.max(240, Math.round(H * sc));
    const off = document.createElement("canvas"); off.width = bw; off.height = bh;
    const sp = PLATE[i];
    const st = { i, g, bw, bh, sc, off, octx: off.getContext("2d"),
      total: new Float32Array(bw * bh),
      c0: new Float32Array(bw * bh), c1: new Float32Array(bw * bh),
      c2: new Float32Array(bw * bh), c3: new Float32Array(bw * bh),
      zu: z * U * sc, ox: (W / 2) * sc - c[0] * z * U * sc, oy: (H / 2) * sc - c[1] * z * U * sc,
      x: 0.08, y: 0.12, dep: 0, it: 0, maxT: 1e-6, lastTone: 0, tones: 0,
      target: PLATE_DEP[i], cap: PLATE_CAP[i],
      anchors: sp.anchors, rot: sp.rot, core: sp.core, amax: sp.amax };
    st.img = st.octx.createImageData(bw, bh);
    const a = P[0], b = P[1], cc = P[2], d = P[3];
    for (let k = 0; k < 40; k++) { const nx = Math.sin(a*st.y) + cc*Math.cos(a*st.x), ny = Math.sin(b*st.x) + d*Math.cos(b*st.y); st.x = nx; st.y = ny; }
    return st;
  }

  /* v2 deposition, verbatim grammar: angular lobe coloring — hue owned by region */
  function depositBatch(st, n) {
    const a = P[0], b = P[1], c = P[2], d = P[3];
    const bw = st.bw, bh = st.bh, zu = st.zu, ox = st.ox, oy = st.oy, rot = st.rot;
    const total = st.total, c0 = st.c0, c1 = st.c1, c2 = st.c2, c3 = st.c3;
    const sin = Math.sin, cos = Math.cos, atan2 = Math.atan2;
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

  /* v2 tone map: log density → luminance (γ1.5 on log), quadratic core (onset .68).
     v2 bakes an opaque ground; here the ambient is the page, so luminance drives alpha. */
  function tonemapPlate(st) {
    const A = st.anchors, core = st.core, amax = st.amax, d = st.img.data;
    const invLog = 1 / Math.log1p(st.maxT);
    const a0r=A[0][0],a0g=A[0][1],a0b=A[0][2],a1r=A[1][0],a1g=A[1][1],a1b=A[1][2],
          a2r=A[2][0],a2g=A[2][1],a2b=A[2][2],a3r=A[3][0],a3g=A[3][1],a3b=A[3][2];
    const total = st.total, c0 = st.c0, c1 = st.c1, c2 = st.c2, c3 = st.c3;
    for (let i = 0, j = 0; i < total.length; i++, j += 4) {
      const t = total[i];
      if (t < 0.5) { d[j+3] = 0; continue; }
      let L = Math.log1p(t) * invLog;
      L = Math.sqrt(L) * L;                       /* ≈ gamma 1.5 on log density */
      const inv = 1 / t;
      let r = (c0[i]*a0r + c1[i]*a1r + c2[i]*a2r + c3[i]*a3r) * inv;
      let g = (c0[i]*a0g + c1[i]*a1g + c2[i]*a2g + c3[i]*a3g) * inv;
      let b = (c0[i]*a0b + c1[i]*a1b + c2[i]*a2b + c3[i]*a3b) * inv;
      let cw = L > 0.68 ? (L - 0.68) / 0.32 : 0; cw *= cw * 0.9;
      r += (core[0]-r)*cw; g += (core[1]-g)*cw; b += (core[2]-b)*cw;
      d[j] = r; d[j+1] = g; d[j+2] = b;
      d[j+3] = Math.min(255, L * amax * 255);
    }
    st.octx.putImageData(st.img, 0, 0);
    st.g.clearRect(0, 0, W, H);
    st.g.imageSmoothingEnabled = true; st.g.imageSmoothingQuality = "high";
    st.g.drawImage(st.off, 0, 0, st.bw, st.bh, 0, 0, W, H);
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
    return { total, bw: fw, bh: fh,
      scx: st.sc * fw / st.bw, scy: st.sc * fh / st.bh, maxT };
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
      const t = cam.tiles[k], cv = tiles[k], paint = tilePaint[k];
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
    drawCoreRect(cam.cx, cam.cy, cam.z);
    return cam.z;
  }

  /* ================= develop the exposures (boot + fork) ================= */
  let plateQueue = [], plateDev = null;
  const fields = [null, null, null, null];   /* retained density per plate — envelopes + corridors read it */
  let batch = 110000, lastT = 0, devSum = 0, devPlateN = 0;
  const nowMs = () => (typeof performance !== "undefined" && performance.now) ? performance.now() : 0;
  function developAll(preparedCam) {
    const g = computeOrbit(P); pts = g.pts;                  /* native — minimap, the measurement view */
    const cam = preparedCam || deriveAnchors(P); ANCH = cam.ANCH; bounds = cam.bounds;  /* dsin — camera */
    layout();
    const d = lastP * 3;
    plateQueue = [0,1,2,3].sort((a,b) => Math.abs(d-a) - Math.abs(d-b));  /* most-visible plate first */
    fields[0] = fields[1] = fields[2] = fields[3] = null;
    plateDev = null; batch = 110000; lastT = nowMs(); devSum = 0; devPlateN = 0;
    developing = true;
    hooks.wake();
  }
  /* step() — registered with site's shared rAF loop. Each frame deposits one adaptive batch
     into the developing plate and tonemaps it — the streamed exposure — then the loop sleeps
     once all four settle. Reduced motion: no progressive development; plates appear whole. */
  function step() {
    if (!plateDev) {
      if (!plateQueue.length) return false;
      plateDev = beginPlate(plateQueue.shift());
      devPlateN++;
    }
    const t = nowMs(), dt = t - lastT; lastT = t;
    if (!reduced) {
      if (dt > 34) batch = Math.max(40000, batch * 0.88);
      else if (dt < 22) batch = Math.min(240000, batch * 1.04);
    }
    depositBatch(plateDev, reduced ? 600000 : batch | 0);
    const done = plateDev.dep >= plateDev.target || plateDev.it >= plateDev.cap;
    /* The density arrays change every frame; the 720k-pixel tone map does not
       need to. Preserve progressive exposure at a bounded 12.5 Hz and always
       render the completed state. Reduced motion still renders once, at done. */
    const toneNow = done || (!reduced && (plateDev.tones === 0 || t - plateDev.lastTone >= TONEMAP_MS));
    if (toneNow) { tonemapPlate(plateDev); plateDev.lastTone = t; plateDev.tones++; }
    if (done) {
      fields[plateDev.i] = summarizeField(plateDev);   /* compact density outlives the develop; full grids are freed */
      devSum += plateDev.dep;
      plateDev = null;
      if (!plateQueue.length) { renderCore(); observe(lastP); developing = false; hooks.onChange(); }
    }
    return true;
  }

  /* ================= the density field, read back (P9 reading exposure) ================= */
  /* mean tone (0..1) of the dominant plate under a viewport rect — conditions envelopes at rest */
  function fieldEnergy(rect) {
    const cam = cameraAt(lastP, ANCH, U, W, H);
    let k = 0, bo = -1;
    for (let i = 0; i < 4; i++) if (cam.tiles[i].o > bo) { bo = cam.tiles[i].o; k = i; }
    const f = fields[k]; if (!f) return null;
    const t = cam.tiles[k], invLog = 1 / Math.log1p(f.maxT);
    let sum = 0, n = 0;
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 8; gx++) {
      const vx = rect.left + (gx + .5) / 8 * rect.width, vy = rect.top + (gy + .5) / 6 * rect.height;
      const bx = ((vx - t.tx) / t.A * f.scx) | 0, by = ((vy - t.ty) / t.A * f.scy) | 0;
      if (bx < 0 || by < 0 || bx >= f.bw || by >= f.bh) continue;
      const dep = f.total[by * f.bw + bx];
      if (dep > 0) { let L = Math.log1p(dep) * invLog; sum += Math.sqrt(L) * L; }
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
      P[0] = clamp(P[0] + (e.clientX-lastX) * 0.0014, -2.2, 2.2);
      P[1] = clamp(P[1] + (e.clientY-lastY) * 0.0014, -2.2, 2.2);
      P[2] = clamp(P[2] + (e.clientX-lastX) * 0.0005, -2.2, 2.2);
      P[3] = clamp(P[3] - (e.clientY-lastY) * 0.0005, -2.2, 2.2);
      lastX = e.clientX; lastY = e.clientY; hooks.onChange();
    });
    sub.addEventListener("pointerup", e => {
      clearTimeout(pressTimer); pressTimer = null;
      if (forking && e.pointerType === "touch") setFork(false);
    });
    sub.addEventListener("pointercancel", () => {
      clearTimeout(pressTimer); pressTimer = null;
      if (forking) setFork(false);   /* a browser-cancelled gesture must never strand the fork lock */
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
    developAll(near(P, CM.CANON) ? canonCam : null); /* the site loop streams the exposure */
    renderCore();
    wireGestures();
    observe(0);
    hooks.onChange();
  }

  let rzT = null;
  addEventListener("resize", () => {
    /* mobile URL-bar show/hide fires height-only resizes mid-scroll — never re-develop
       four tiles for that; geometry stays at last-rendered W/H so the compositing identity
       holds; the debounced pass heals coverage once the gesture settles */
    const nextDpr = Math.min(devicePixelRatio || 1, dprCapFor(innerWidth));
    const heightOnly = innerWidth === W && nextDpr === DPR;
    clearTimeout(rzT);
    if (heightOnly) {
      /* Browser chrome changes viewport height repeatedly on mobile. Stretch
         the already-developed exposure to the new coverage and update camera
         geometry; width/DPR changes still take the full deterministic path. */
      H = innerHeight; U = Math.min(W, H) / bounds.span * 0.92;
      tiles.forEach(cv => { cv.style.height = H + "px"; });
      renderCore(); observe(lastP);
      return;
    }
    rzT = setTimeout(() => { developAll(near(P, CM.CANON) ? canonCam : null); renderCore(); observe(lastP); }, 160);
    observe(lastP);
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
