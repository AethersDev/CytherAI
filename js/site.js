/* ============================================================================
   js/site.js  —  the glue (no exports)
   Owns the one shared rAF loop that sleeps; the Filament weight-field and weight
   waves; the scroll → CytherSubstrate.observe driver and the gauge/stratum readout;
   the serial strip; hold-to-cross; the floor renders (manifest · provenance · not
   claimed · epochal record + commitment); and the CL-03 async admission verifier.

   Composed from newC3/synthesis-rev5.html (content mechanisms) and substrate-demo
   (the world). Browser-only — returns immediately under jsc.
   ============================================================================ */
(function () {
"use strict";
if (typeof document === "undefined") return;   /* glue runs only in a browser */

const CM = window.CytherManifest, S = window.CytherSubstrate,
      Claims = window.CytherClaims, Ledger = window.CytherLedger, Inst = window.CytherInstrument;
const $ = id => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= one shared frame loop — sleeps at rest ================= */
let running = false, idleFrames = 0;
const steps = [];
function registerStep(fn) { if (fn) steps.push(fn); }
function wake() { if (!running) { running = true; idleFrames = 0; requestAnimationFrame(loop); } }
function loop() {
  let busy = 0;
  for (const s of steps) busy |= (s() ? 1 : 0);
  idleFrames = busy ? 0 : idleFrames + 1;
  if (idleFrames < 40) requestAnimationFrame(loop); else running = false;
}

/* ================= scroll → observation + gauge ================= */
const gauge = $("gauge");
const ZDEFS = [
  ["surface", "CLAIM · PUBLIC SURFACE", "EXPLORE"],
  ["definition", "DEFINITION", "EXPLORE"],
  ["architecture", "ARCHITECTURE", "INSPECT"],
  ["measurement", "MEASUREMENT", "VERIFY"],
  ["sealed", "CONTROLLED", "REQUEST"],
  ["clearance", "CLEARANCE", "REQUEST"],
  ["floor", "FLOOR · MANIFEST", "AUDIT"]
];
let zones = [];
function computeZones() {
  const max = document.documentElement.scrollHeight - innerHeight;
  zones = ZDEFS.map(([id, name, mode]) => {
    const el = $(id);
    const f = (el && max > 0) ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY) / max)) : 0;
    return { f, name, mode };
  });
}
function progress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
}
/* ================= reading exposure — phase machine + rest state (P9) ================= */
/* Ink is bistable with hysteresis; panels phase-change with it. The world holds full
   amplitude while the reader navigates and yields when they stop to read. */
let inkState = "dark";
function readingUpdate(d) {
  const R = S.READING;
  if (inkState === "dark" && d >= R.SW_DOWN) inkState = "light";
  else if (inkState === "light" && d <= R.SW_UP) inkState = "dark";
  const phase = inkState === "dark" ? "surface" : d < R.FLIP_END ? "flip" : d < 2.7 ? "depth" : "core";
  const b = document.body;
  if (b.dataset.ink !== inkState) b.dataset.ink = inkState;
  if (b.dataset.phase !== phase) b.dataset.phase = phase;
}
let restT = null;
function restArm() {
  document.body.classList.remove("at-rest");
  clearTimeout(restT);
  restT = setTimeout(() => { document.body.classList.add("at-rest"); conditionEnvelopes(); }, 180);
}
/* at rest, each envelope's strength follows the actual plate density beneath it */
function conditionEnvelopes() {
  document.querySelectorAll(".env").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
    const e = S.fieldEnergy(r);
    if (e !== null) el.style.setProperty("--envK", (0.45 + 0.55 * Math.min(1, e * 1.6)).toFixed(2));
  });
}
/* content follows the negative-space atlas: each stratum reads from its plate's quiet third */
let corridorsKey = "";
function applyCorridors() {
  if (innerWidth < 1100 || S.isDeveloping()) return;
  const key = S.serial() + "×" + innerWidth;
  if (key === corridorsKey) return;
  const c = S.corridors(); if (!c) return;
  corridorsKey = key;
  ZDEFS.forEach(([id], i) => {
    if (id === "surface" || id === "floor") return;   /* statement + floor hold their composition */
    const el = $(id); if (!el) return;
    const z = zones[i] ? zones[i].f : i / 6;
    const plate = Math.max(0, Math.min(3, Math.round(z * 3)));
    el.classList.remove("corridor-l", "corridor-c", "corridor-r");
    el.classList.add("corridor-" + c[plate]);
  });
}
function wireOptics() {
  const box = $("optics"); if (!box) return;
  const apply = m => {
    document.body.dataset.optics = m;
    box.querySelectorAll("[data-o]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.o === m)));
  };
  let m = "balanced";
  try { m = sessionStorage.getItem("cy-optics") || m; } catch (e) { /* SecurityError — session default only */ }
  apply(m);
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-o]"); if (!b) return;
    apply(b.dataset.o);
    try { sessionStorage.setItem("cy-optics", b.dataset.o); } catch (e) { /* SecurityError — preference lives this page only */ }
  });
}

function envUpdate() {
  const p = progress();
  const zoom = S.observe(p);
  readingUpdate(p * 3);
  let zoneName = zones.length ? zones[0].name : "CLAIM · PUBLIC SURFACE", mode = "EXPLORE";
  zones.forEach(z => { if (p >= z.f - 0.02) { zoneName = z.name; mode = z.mode; } });
  const pct = String(Math.round(p * 100)).padStart(2, "0");
  if (gauge) gauge.innerHTML = `OBS <b>${mode}</b> · ×${zoom.toFixed(2)}<br>DEPTH ${pct}% · ${zoneName}`;
  const oz = $("obsZoom"); if (oz) oz.textContent = "×" + zoom.toFixed(2);
}
let envTick = false;
addEventListener("scroll", () => {
  restArm();
  if (!envTick) { envTick = true; requestAnimationFrame(() => { envUpdate(); envTick = false; }); }
}, { passive: true });

/* ================= thesis under tension (Filament) ================= */
const thesis = $("thesis");
const glyphs = [];
function splitThesis() {
  if (!thesis) return;
  const words = thesis.textContent.split(" ");
  thesis.textContent = "";
  thesis.setAttribute("aria-label", "Built for environments where failure has consequence.");
  const wrap = document.createElement("span");
  wrap.setAttribute("aria-hidden", "true");
  words.forEach((word, i) => {
    const w = document.createElement("span"); w.className = "wd";
    [...word].forEach(ch => {
      const s = document.createElement("span"); s.className = "g"; s.textContent = ch;
      w.appendChild(s);
      glyphs.push({ el: s, x: 0, y: 0, w: 250, tw: 250, c: 0, tc: 0 });
    });
    wrap.appendChild(w);
    if (i < words.length - 1) wrap.appendChild(document.createTextNode(" "));
  });
  thesis.appendChild(wrap);
}
function cachePositions() {
  glyphs.forEach(g => { const r = g.el.getBoundingClientRect(); g.x = r.left + r.width/2 + scrollX; g.y = r.top + r.height/2 + scrollY; });
}
let px = -9e3, py = -9e3;
addEventListener("pointermove", e => { px = e.pageX; py = e.pageY; wake(); }, { passive: true });
function fieldStep() {
  if (reduced || document.body.dataset.optics === "read") return false;
  const R = 190, BASE = 250, PEAK = 740;
  let active = false;
  for (const g of glyphs) {
    const d = Math.hypot(g.x - px, g.y - py);
    let f = 0;
    if (d < R) f = 0.5 * (1 + Math.cos(Math.PI * d / R));
    g.tw = BASE + (PEAK - BASE) * f; g.tc = f;
    g.w += (g.tw - g.w) * 0.18; g.c += (g.tc - g.c) * 0.18;
    if (Math.abs(g.tw - g.w) > 0.5 || g.c > 0.01) {
      g.el.style.fontWeight = Math.round(g.w);
      g.el.style.color = g.c > 0.04 ? `color-mix(in srgb, var(--accent) ${(g.c*70)|0}%, var(--ink))` : "";
      active = true;
    }
  }
  return active;
}

/* ================= weight waves on system titles (Filament) ================= */
const waves = [];
function wireWaves() {
  document.querySelectorAll("[data-wave]").forEach(h => {
    const text = h.textContent; h.textContent = "";
    h.setAttribute("aria-label", text);
    const spans = [...text].map(ch => {
      const s = document.createElement("span"); s.className = "g";
      s.textContent = ch === " " ? " " : ch;
      s.setAttribute("aria-hidden", "true");
      h.appendChild(s); return s;
    });
    const send = () => { if (!reduced && document.body.dataset.optics !== "read") { waves.push({ spans, t: 0 }); wake(); } };
    h.addEventListener("pointerenter", send);
    h.addEventListener("click", send);
  });
}
function waveStep() {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += 0.9;
    const n = w.spans.length;
    for (let j = 0; j < n; j++) {
      const d = j - w.t, f = Math.exp(-(d*d) / 6);
      w.spans[j].style.fontWeight = Math.round(300 + 520 * f);
      w.spans[j].style.color = f > 0.3 ? "var(--accent)" : "";
    }
    if (w.t > n + 6) { w.spans.forEach(s => { s.style.fontWeight = ""; s.style.color = ""; }); waves.splice(i, 1); }
  }
  return waves.length > 0;
}

/* ================= the serial strip — the mark's record, always present ================= */
let admissionState = "PENDING";
function stripUpdate() {
  const ms = $("markSerial"); if (ms) ms.textContent = S.serial();
  const canonical = S.isCanonical();
  const st = $("forkStatus");
  if (st) { let s = S.status(); if (canonical) s += " · ADMISSION " + admissionState; st.textContent = s; }
  const rb = $("resetBtn"); if (rb) rb.hidden = canonical;
  const fb = $("forkBtn");
  if (fb) { fb.classList.toggle("on", S.isForking()); fb.textContent = S.isForking() ? "FORKING — DRAG" : "FORK"; }
  if (!canonical) Ledger.recordAct("MARK_FORKED");
  applyCorridors();   /* the atlas settles with the exposure */
  if (document.body.classList.contains("at-rest")) conditionEnvelopes();
}
/* the streamed exposure narrates itself — true observables only */
function exposureStep() {
  if (!S.isDeveloping()) return false;
  const e = S.exposure(), st = $("forkStatus");
  if (e && st) st.textContent = "EXPOSING PLATE " + e.plate + "/4 · n = " + e.n.toExponential(1).replace("+", "") + " DEPOSITIONS";
  return false;
}
function buildHash(full) {
  const parts = [], P = S.params();
  if (full) { parts.push("d=" + progress().toFixed(3)); if (crossed) parts.push("x=1"); }
  if (!S.isCanonical()) parts.push("m=" + P.map(v => v.toFixed(3)).join(","));
  return parts.length ? ("#" + parts.join("&")) : "#";
}
async function copyState(hash, msg) {
  try { history.replaceState(null, "", hash); } catch (e) { location.hash = hash; }   /* Safari file:// throws SecurityError */
  try { await navigator.clipboard.writeText(location.href); } catch (e) {}
  const c = $("captured"); if (c) { c.textContent = msg; setTimeout(() => { c.textContent = ""; }, 2200); }
}
function wireStrip() {
  const fb = $("forkBtn"); if (fb) fb.addEventListener("click", () => S.setFork(!S.isForking()));
  const rb = $("resetBtn"); if (rb) rb.addEventListener("click", () => S.resetToCanonical());
  const cap = $("captureBtn"); if (cap) cap.addEventListener("click", () => { copyState(buildHash(true), "✓ briefing state captured to link"); Ledger.recordAct("STATE_CAPTURED"); });
  const cr = $("claimsRecompute"); if (cr) cr.addEventListener("click", () => {
    Claims.recomputeClaims(); Ledger.recordAct("CLAIMS_RECOMPUTED");
    const stmp = $("claimsStamp"); if (stmp) stmp.textContent = "recomputed";
  });
}

/* ================= the boundary — passage is free; disclosure is governed ================= */
let crossed = false;
function cross() {
  if (crossed) return;
  crossed = true;
  document.body.classList.add("crossed");
  const bs = $("bState"); if (bs) bs.textContent = "BOUNDARY — CROSSED · CONTROLLED INDEX LEGIBLE";
  const hl = $("holdLabel"); if (hl) hl.textContent = "BOUNDARY CROSSED";
  const hc = $("holdCross"); if (hc) hc.disabled = true;
  const hf = $("holdFill"); if (hf) hf.style.width = "100%";
  const cta = $("featCta"); if (cta) cta.textContent = "Request Controlled Disclosure";
  Ledger.upgradeCta();   /* refine href/note, crossed-aware */
}
function wireHold() {
  const holdBtn = $("holdCross"), holdFill = $("holdFill"); if (!holdBtn) return;
  let holdTimer = null;
  function startHold() {
    if (crossed) return;
    holdFill.style.transition = reduced ? "none" : "width .9s linear";
    holdFill.style.width = "100%";
    holdTimer = setTimeout(cross, 900);
  }
  function cancelHold() {
    if (crossed) return;
    clearTimeout(holdTimer);
    holdFill.style.transition = reduced ? "none" : "width .25s ease-out";
    holdFill.style.width = "0%";
  }
  holdBtn.addEventListener("pointerdown", e => { holdBtn.setPointerCapture(e.pointerId); startHold(); });
  holdBtn.addEventListener("pointerup", cancelHold);
  holdBtn.addEventListener("pointercancel", cancelHold);
  holdBtn.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); startHold(); } });
  holdBtn.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") cancelHold(); });
  holdBtn.addEventListener("blur", cancelHold);
  /* AT firing a synthetic click cannot hold: two deliberate activations within 4s cross */
  let armed = false, armT = null;
  holdBtn.addEventListener("click", () => {
    if (crossed) return;
    if (armed) { cross(); return; }
    armed = true;
    const hl = $("holdLabel"); if (hl) hl.textContent = "PRESS AGAIN TO CROSS — OR HOLD";
    clearTimeout(armT);
    armT = setTimeout(() => { armed = false; if (!crossed) { const h = $("holdLabel"); if (h) h.textContent = "HOLD TO CROSS BOUNDARY"; } }, 4000);
  });
}

/* ================= the floor — manifest · provenance · not claimed · epochs ================= */
function row(k, v, vClass) {
  const r = document.createElement("div"); r.className = "m-row";
  const kk = document.createElement("span"); kk.className = "m-k"; kk.textContent = k;
  const vv = document.createElement("span"); vv.className = "m-v" + (vClass ? " " + vClass : ""); vv.textContent = v;
  r.appendChild(kk); r.appendChild(vv); return r;
}
function renderManifest() {
  const el = $("manifestRows"); if (!el) return;
  const M = CM.MANIFEST;
  const ext = (typeof performance !== "undefined" && performance.getEntriesByType)
    ? performance.getEntriesByType("resource").filter(r => r.name.indexOf(location.origin + "/") !== 0).length
    : M.external_runtime_calls;
  const extStr = String(ext).padStart(2, "0") + (ext === M.external_runtime_calls ? "" : " ≠ CLAIMED 0" + M.external_runtime_calls);
  const rows = [
    ["PUBLIC DISCLOSURE EPOCH", "0" + M.epoch], ["DERIVED", M.derived],
    ["REVISION", M.revision], ["PATENT", M.patent],
    ["SYSTEMS INDEXED", "0" + M.systems_indexed], ["SYSTEMS DISCLOSED", "0" + M.systems_disclosed.length],
    ["PUBLIC RECORDS", "" + M.public_records], ["CONTROLLED REFERENCES", "0" + M.controlled_references],
    ["EXTERNAL RUNTIME CALLS", extStr], ["NOT CLAIMED ENTRIES", "0" + M.not_claimed.length],
    ["ADMISSION NONCE", "0" + CM.ADMISSION_NONCE], ["CANONICAL STATE", CM.CHECKSUM]
  ];
  rows.forEach(([k, v]) => el.appendChild(row(k, v, k === "CANONICAL STATE" ? "acc" : "")));
}
function renderProvenance() {
  const el = $("provenanceRows"); if (!el) return;
  CM.MANIFEST.provenance.forEach(p => el.appendChild(row(p.date + " · " + p.event, p.desc)));
}
function renderAnti() {
  const el = $("antiRows"); if (!el) return;
  CM.MANIFEST.not_claimed.forEach(x => el.appendChild(row(x, "NOT CLAIMED", "anti-v")));
}
function miniMark(canvas, p, curr) {
  const s = 76, DPR = Math.min(devicePixelRatio || 1, 2);
  canvas.width = s*DPR; canvas.height = s*DPR; canvas.style.width = s + "px"; canvas.style.height = s + "px";
  const g = canvas.getContext("2d"); g.setTransform(DPR,0,0,DPR,0,0);
  let a = p[0], b = p[1], c = p[2], d = p[3], x = 0.08, y = 0.12;
  for (let i = 0; i < 40; i++) { const nx = Math.sin(a*y)+c*Math.cos(a*x), ny = Math.sin(b*x)+d*Math.cos(b*y); x=nx; y=ny; }
  g.fillStyle = curr ? "rgba(127,160,255,.5)" : "rgba(120,135,160,.4)";
  const cx = s/2, cy = s/2, sc = s*0.2;
  for (let i = 0; i < 16000; i++) { const nx = Math.sin(a*y)+c*Math.cos(a*x), ny = Math.sin(b*x)+d*Math.cos(b*y); x=nx; y=ny; g.fillRect(cx+x*sc, cy+y*sc, 1, 1); }
}
function renderEpochs() {
  const rowEl = $("epochRow"); if (!rowEl) return;
  const eps = CM.EPOCHS.map(m => Object.assign({}, m, { current: false }));
  eps.push(Object.assign(CM.normalizeManifest(CM.MANIFEST), { current: true }));
  eps.forEach((m, i) => {
    const n = m.current ? CM.ADMISSION_NONCE : CM.PUBLISHED_NONCES.epochs[m.epoch - 1];
    const p = m.current ? CM.CANON : CM.paramsFor(m, n);
    const ck = CM.stateChecksum(m);
    const div = document.createElement("div"); div.className = "ep" + (m.current ? " current" : "");
    const cnv = document.createElement("canvas"); div.appendChild(cnv);
    div.insertAdjacentHTML("beforeend",
      "EPOCH 0" + m.epoch + " · " + (m.current ? '<span class="st">CANONICAL</span>' : "SUPERSEDED") + "<br>" + ck + "<br>" + m.derived + " · N0" + n);
    rowEl.appendChild(div);
    miniMark(cnv, p, m.current);
    if (i < eps.length - 1) { const ar = document.createElement("span"); ar.className = "ep-arrow"; ar.textContent = "→"; rowEl.appendChild(ar); }
  });
  const cm = CM.COMMITMENTS[0];
  const car = document.createElement("span"); car.className = "ep-arrow"; car.textContent = "→"; rowEl.appendChild(car);
  const cd = document.createElement("div"); cd.className = "ep";
  /* the chip prints the status the manifest DECLARES — it does not assert one.
     "PREIMAGE SEALED" was hardcoded here while the preimage sat in the repository,
     so the page stated as sealed a commitment anyone could open. Sealing is a fact
     about the owner's custody of the preimage, which only the manifest can know. */
  cd.innerHTML = "EPOCH 0" + cm.epoch + " · <span class=\"st\">COMMITTED</span><br>sha256 " + cm.digest.slice(0, 16) + "…<br>" + cm.committed + " · " + cm.status;
  rowEl.appendChild(cd);
}

/* ================= CL-03 async admission verifier ================= */
function verifyAdmissions() {
  const checks = [[CM.NORM, CM.PUBLISHED_NONCES.current], [CM.EPOCHS[0], CM.PUBLISHED_NONCES.epochs[0]], [CM.EPOCHS[1], CM.PUBLISHED_NONCES.epochs[1]]];
  let i = 0, ok = true;
  (function stepv() {
    if (i >= checks.length) {
      admissionState = ok ? "VERIFIED" : "MISMATCH — CACHE ≠ MANIFEST";
      Claims.setClaim("CL-03", ok, ok ? "3 admissions re-derived · published nonces match" : "published nonce ≠ derivation");
      stripUpdate(); return;
    }
    const pair = checks[i++];
    const adm = CM.admit(pair[0]);
    if (!adm) { admissionState = "FAILED — MANIFEST REQUIRES REVISION"; Claims.setClaim("CL-03", false, "no admissible orbit within 64 nonces"); stripUpdate(); return; }
    if (adm.n !== pair[1]) ok = false;
    setTimeout(stepv, 80);   /* yield the main thread between admissions */
  })();
}

/* ================= boot ================= */
(function boot() {
  const h = location.hash;
  let forkParams = null, fromLink = false;
  const m = h.match(/m=([-\d.,]+)/);
  if (m) { const ps = m[1].split(",").map(Number); if (ps.length === 4 && ps.every(isFinite)) { forkParams = ps; fromLink = true; } }

  S.boot({ onChange: stripUpdate, wake, initialParams: forkParams, fromLink });
  registerStep(fieldStep);
  registerStep(waveStep);
  registerStep(S.step);
  registerStep(exposureStep);
  registerStep(Inst.step);

  Inst.wire({ wake });
  Ledger.wire();
  wireStrip();
  wireHold();
  wireOptics();
  restArm();   /* the page opens navigating; rest (and the reading exposure) follows */
  splitThesis();
  wireWaves();
  renderManifest();
  renderProvenance();
  renderEpochs();
  renderAnti();
  computeZones();

  if (/(^|[#&])x=1(&|$)/.test(h)) cross();

  envUpdate();
  stripUpdate();
  Claims.renderClaims();
  Ledger.recordAct("PAGE_OPENED");

  addEventListener("load", () => {
    setTimeout(() => Claims.recomputeClaims(), 150);
    setTimeout(verifyAdmissions, 500);
    setTimeout(cachePositions, 60);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});   /* insecure context — run online-only */
    computeZones(); envUpdate();
    const dm = h.match(/d=([\d.]+)/);
    if (dm) {
      const d = Math.min(1, Math.max(0, parseFloat(dm[1])));
      setTimeout(() => { const max = document.documentElement.scrollHeight - innerHeight; scrollTo({ top: d * max, behavior: "auto" }); envUpdate(); }, 80);
    }
  });
  addEventListener("resize", () => { computeZones(); envUpdate(); setTimeout(cachePositions, 80); wake(); });
  wake();   /* settle the first frame */
})();

})();
