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
const TILE_N  = [38000, 80000, 140000, 220000];
const TILE_STYLE = [
  { col:[16,22,32],   a:0.32, acc:0 },
  { col:[36,52,110],  a:0.30, acc:0 },
  { col:[150,175,235],a:0.30, acc:9 },
  { col:[192,212,255],a:0.28, acc:6 }
];

/* ================= small math ================= */
const clamp  = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp   = (a,b,t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const mixHex = (a,b,t) => { const A=hex2rgb(a), B=hex2rgb(b);
  return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(",")})`; };

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

/* pure surface — always available (used by CL-08, the compositing harness, ambient tests) */
const API = { ZOOMS, BGS, PANELS, ACCENTS, computeOrbit, deriveAnchors, cameraAt, ambientAt };

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
  let canonAnch = null;                  /* canonical camera snapshot for CL-08 — fork-independent */
  let W = 0, H = 0, U = 0, DPR = 1;
  let lastP = 0, developing = false;
  let forking = false;
  let hooks = { onChange: () => {}, wake: () => {} };

  const tiles = ["t0","t1","t2","t3"].map(id => $(id));
  const coreCv = $("coreMap");

  function layout() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, W > 800 ? 2 : 1.6);
    U = Math.min(W, H) / bounds.span * 0.92;
  }

  function renderTile(i) {
    const cv = tiles[i], z = ZOOMS[i], c = ANCH[i];
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    const st = TILE_STYLE[i], n = TILE_N[i];
    const zu = z * U, ox = W/2 - c[0]*zu, oy = H/2 - c[1]*zu;
    g.fillStyle = `rgba(${st.col[0]},${st.col[1]},${st.col[2]},${st.a})`;
    for (let k = 0; k < n; k++) {
      const sx = pts[k*2]*zu + ox, sy = pts[k*2+1]*zu + oy;
      if (sx < -2 || sy < -2 || sx > W+2 || sy > H+2) continue;
      g.fillRect(sx, sy, 1, 1);
    }
    if (st.acc) {
      g.fillStyle = "rgba(127,160,255,.5)";
      for (let k = 0; k < n; k += st.acc) {
        const sx = pts[k*2]*zu + ox, sy = pts[k*2+1]*zu + oy;
        if (sx < -2 || sy < -2 || sx > W+2 || sy > H+2) continue;
        g.fillRect(sx, sy, 1, 1);
      }
    }
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
    r.style.width = (hw*2).toFixed(1) + "px"; r.style.height = (hh*2).toFixed(1) + "px";
    r.style.transform = `translate(${(cx*s+ox-hw).toFixed(1)}px,${(cy*s+oy-hh).toFixed(1)}px)`;
  }

  /* observe — transform + opacity + ambient, driven by scroll progress p (site owns scroll) */
  function observe(p) {
    lastP = p;
    const cam = cameraAt(p, ANCH, U, W, H);
    for (let k = 0; k < 4; k++) {
      const t = cam.tiles[k], cv = tiles[k];
      if (t.o <= 0) { cv.style.opacity = 0; cv.style.visibility = "hidden"; continue; }
      cv.style.visibility = "visible"; cv.style.opacity = t.o.toFixed(3);
      cv.style.transform = `translate(${t.tx.toFixed(2)}px,${t.ty.toFixed(2)}px) scale(${t.A.toFixed(5)})`;
    }
    const amb = ambientAt(p);
    root_el.style.setProperty("--bg", amb.bg);
    root_el.style.setProperty("--ink", amb.ink);
    root_el.style.setProperty("--panel", amb.panel);
    root_el.style.setProperty("--accent", amb.accent);
    drawCoreRect(cam.cx, cam.cy, cam.z);
    return cam.z;
  }

  /* ================= develop the exposures (boot + fork) ================= */
  let renderQueue = [];
  function developAll() {
    const g = computeOrbit(P); pts = g.pts;                  /* native — tiles */
    const cam = deriveAnchors(P); ANCH = cam.ANCH; bounds = cam.bounds;  /* dsin — camera */
    layout();
    renderQueue = [0,1,2,3];
    hooks.wake();
  }
  /* step() — registered with site's shared rAF loop; renders one queued tile per frame,
     then the core + a settling observe. Returns busy so the loop stays awake until drained. */
  function step() {
    if (!renderQueue.length) return false;
    const i = renderQueue.shift();
    renderTile(i);
    if (!renderQueue.length) { renderCore(); observe(lastP); developing = false; hooks.onChange(); }
    return true;
  }
  /* redevelop from the (possibly forked) params — async via the render queue */
  function redevelop() {
    developing = true; hooks.onChange();
    developAll();
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
    const g = computeOrbit(P); pts = g.pts;
    const cam = deriveAnchors(P); ANCH = cam.ANCH; bounds = cam.bounds;
    canonAnch = deriveAnchors(CM.CANON).ANCH;   /* canonical camera — the derivation CL-08 re-checks */
    layout();
    for (let k = 0; k < 4; k++) renderTile(k);
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
    const heightOnly = innerWidth === W && Math.abs(innerHeight - H) < 160;
    clearTimeout(rzT);
    rzT = setTimeout(() => { layout(); for (let k = 0; k < 4; k++) renderTile(k); renderCore(); observe(lastP); },
      heightOnly ? 450 : 160);
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
}

root.CytherSubstrate = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
