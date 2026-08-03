/* ============================================================================
   js/instrument.js  →  window.CytherInstrument
   The boundary, working, in the visitor's hands. A hostile proposer streams
   arbitrary tokens at a constraint boundary over a toy rectilinear-profile DSL;
   admission is incremental (grammar, then geometry) and an INDEPENDENT kernel
   re-verifies every program before emission. Demonstrated invariant: nothing
   inadmissible is ever emitted. Deterministic: seeded LCG, high bits only (low
   LCG bits are correlated) — same seed, same stream, on every machine.

   Ported from newC3/synthesis-rev5.html. Pure boundary logic (audit) is DOM-free
   and feeds CL-05; canvas/log/stream wiring is guarded behind document.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;

/* ================= the constraint boundary — pure ================= */
const BI_G = 12, BI_O = 6;
function biRas(x1, y1, x2, y2) {
  const p = []; const dx = Math.sign(x2-x1), dy = Math.sign(y2-y1); let x = x1, y = y1;
  while (x !== x2 || y !== y2) { x += dx; y += dy; p.push(x + "," + y); } return p;
}
function biAdmit(at, tk) {
  if (tk.k === "J") return { ok: false, why: "GRAMMAR" };
  if (tk.k === "Z") {
    if (at.nseg < 3) return { ok: false, why: "CLOSURE" };
    if ((at.x === BI_O) === (at.y === BI_O)) return { ok: false, why: "CLOSURE" };
    if (((at.x !== BI_O) ? "H" : "V") !== at.axis) return { ok: false, why: "CLOSURE AXIS" };
    const pts = biRas(at.x, at.y, BI_O, BI_O);
    for (const p of pts) { if (p !== BI_O+","+BI_O && at.cov.has(p)) return { ok: false, why: "CLOSING CROSS" }; }
    return { ok: true, close: true };
  }
  if (tk.k !== at.axis) return { ok: false, why: "AXIS ORDER" };
  if (tk.mg > 4) return { ok: false, why: "ARG RANGE" };
  const nx = tk.k === "H" ? at.x + tk.sg*tk.mg : at.x, ny = tk.k === "V" ? at.y + tk.sg*tk.mg : at.y;
  if (nx < 0 || nx > BI_G || ny < 0 || ny > BI_G) return { ok: false, why: "BOUNDS" };
  const pts = biRas(at.x, at.y, nx, ny);
  for (const p of pts) { if (at.cov.has(p)) return { ok: false, why: "CROSSES" }; }
  return { ok: true, pts, nx, ny };
}
function biKernel(toks) {   /* independent rebuild — the second opinion every program gets */
  let x = BI_O, y = BI_O, axis = "H", nseg = 0; const cov = new Set([BI_O+","+BI_O]); let closed = false;
  for (const tk of toks) {
    if (closed) return false;
    if (tk.k === "Z") {
      if (nseg < 3 || ((x === BI_O) === (y === BI_O))) return false;
      if (((x !== BI_O) ? "H" : "V") !== axis) return false;
      const pts = biRas(x, y, BI_O, BI_O);
      for (const p of pts) { if (p !== BI_O+","+BI_O && cov.has(p)) return false; }
      closed = true; continue;
    }
    if (tk.k !== axis || tk.mg > 4) return false;
    const nx = tk.k === "H" ? x + tk.sg*tk.mg : x, ny = tk.k === "V" ? y + tk.sg*tk.mg : y;
    if (nx < 0 || nx > BI_G || ny < 0 || ny > BI_G) return false;
    const pts = biRas(x, y, nx, ny);
    for (const p of pts) { if (cov.has(p)) return false; }
    pts.forEach(p => cov.add(p)); x = nx; y = ny; axis = axis === "H" ? "V" : "H"; nseg++;
  }
  return closed;
}
function biEngine(seed) {
  let rng = seed;
  const rnd = () => { rng = (rng*1664525 + 1013904223) >>> 0; return rng >>> 16; };   /* high bits only */
  const st = { prop: 0, rej: 0, disc: 0, adm: 0, inv: 0 };
  const fresh = () => ({ x: BI_O, y: BI_O, axis: "H", toks: [], nseg: 0, cov: new Set([BI_O+","+BI_O]), budget: 40 });
  let at = fresh();
  function tok() {
    const r = rnd() % 100;
    if (r < 12) return { k: "J", s: "‹" + String.fromCharCode(33 + rnd()%14) + "›" };
    if (r < 24) return { k: "Z", s: "Z" };
    const ax = (rnd()%2) ? "H" : "V", sg = (rnd()%2) ? 1 : -1, mg = 1 + (rnd()%6);
    return { k: ax, sg, mg, s: ax + (sg > 0 ? "+" : "−") + mg };
  }
  function step() {
    st.prop++;
    const tk = tok();
    const r = biAdmit(at, tk);
    if (!r.ok) { st.rej++; if (--at.budget <= 0) { st.disc++; at = fresh(); } return { e: "rej", tk, why: r.why }; }
    if (r.close) {
      at.toks.push(tk);
      const okK = biKernel(at.toks);
      if (okK) st.adm++; else st.inv++;
      const prog = at.toks; at = fresh();
      return { e: okK ? "adm" : "inv", tk, prog };
    }
    r.pts.forEach(p => at.cov.add(p));
    at.x = r.nx; at.y = r.ny; at.axis = at.axis === "H" ? "V" : "H"; at.nseg++; at.toks.push(tk);
    return { e: "ok", tk };
  }
  return { step, st };
}
/* pure audit — runs `count` proposals at `seed`, returns the invariant stats. Feeds CL-05. */
function audit(count, seed) { const e = biEngine(seed); for (let i = 0; i < count; i++) e.step(); return e.st; }

let last = audit(1500, 2);   /* quick seeded audit so CL-05 has evidence at boot (no DOM) */
function lastAudit() { return last; }

const API = { audit, lastAudit, biEngine };

/* ============================================================================
   DOM wiring — canvas, streaming log, RUN / AUDIT. Guarded.
   ============================================================================ */
if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BI = { running: false, engine: null, log: [] };
  let wake = () => {};

  function logPush(line, adm) { BI.log.unshift(adm ? ('<span class="adm">'+line+"</span>") : line); if (BI.log.length > 8) BI.log.length = 8; }
  function logRender() { const el = $("biLog"); if (el) el.innerHTML = BI.log.join("<br>") || "— proposer idle —"; }
  function statsRender(st) { const el = $("biStats"); if (el) el.innerHTML =
    "PROPOSED " + st.prop + " · REJECTED " + st.rej + " · DISCARDED " + st.disc +
    " · <b>ADMITTED " + st.adm + "</b> · INVALID EMITTED " + st.inv; }
  function draw(prog) {
    const c = $("biCanvas"); if (!c) return;
    const s = 180, DPR = Math.min(devicePixelRatio || 1, 2);
    c.width = s*DPR; c.height = s*DPR;
    const g = c.getContext("2d"); g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,s,s);
    const cell = s / (BI_G + 2);
    g.fillStyle = "rgba(127,140,160,.35)";
    for (let i = 0; i <= BI_G; i++) for (let j = 0; j <= BI_G; j++) g.fillRect((i+1)*cell-.5, (j+1)*cell-.5, 1, 1);
    if (!prog) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2036C7";
    let x = BI_O, y = BI_O;
    g.strokeStyle = accent; g.lineWidth = 2; g.beginPath(); g.moveTo((x+1)*cell, (y+1)*cell);
    for (const tk of prog) {
      if (tk.k === "Z") { g.lineTo((BI_O+1)*cell, (BI_O+1)*cell); break; }
      x = tk.k === "H" ? x + tk.sg*tk.mg : x; y = tk.k === "V" ? y + tk.sg*tk.mg : y;
      g.lineTo((x+1)*cell, (y+1)*cell);
    }
    g.stroke();
  }
  function emit(ev) {
    const digest = (CM.fnv(ev.prog.map(t => t.s).join("")) >>> 0).toString(16).padStart(8,"0").toUpperCase();
    draw(ev.prog);
    logPush("● Z · kernel ✓ · PRG-" + digest + " (" + ev.prog.length + " tokens)", true);
    const rc = $("biReceipt"); if (rc) rc.textContent = "ADMITTED · PRG-" + digest + " · seed 01, reproducible";
  }
  function handle(ev) {
    if (ev.e === "rej") { if (ev.why !== "AXIS ORDER" || BI.engine.st.rej % 7 === 0) logPush("✗ " + ev.tk.s + " · " + ev.why); }
    else if (ev.e === "ok") { logPush("→ " + ev.tk.s); }
    else if (ev.e === "adm") { emit(ev); }
    else if (ev.e === "inv") { logPush("INVALID EMITTED — CL-05 FAILS", false); root.CytherClaims.setClaim("CL-05", false, "kernel rejected an emitted program"); }
  }
  function step() {
    if (!BI.running) return false;
    for (let i = 0; i < 48; i++) handle(BI.engine.step());
    statsRender(BI.engine.st); logRender();
    return true;
  }

  function wire(opts) {
    wake = (opts && opts.wake) || wake;
    draw(null);
    const runBtn = $("biRun"), auditBtn = $("biAudit");
    if (runBtn) runBtn.addEventListener("click", () => {
      if (BI.running) { BI.running = false; runBtn.textContent = "RUN PROPOSER"; return; }
      BI.engine = biEngine(1); BI.log = [];
      root.CytherLedger && root.CytherLedger.recordAct("PROPOSER_RUN", "seed 01");
      if (reduced) {
        let lastEv = null;
        for (let i = 0; i < 4000; i++) { const ev = BI.engine.step(); if (ev.e === "adm") lastEv = ev; }
        statsRender(BI.engine.st);
        if (lastEv) emit(lastEv);
        logPush("— ran 4,000 proposals —"); logRender();
        return;
      }
      BI.running = true; runBtn.textContent = "STOP PROPOSER"; wake();
    });
    if (auditBtn) auditBtn.addEventListener("click", () => {
      last = audit(10000, 2);
      root.CytherClaims.setClaim("CL-05", last.inv === 0 && last.adm > 0,
        last.prop + " proposals · " + last.adm + " admitted · " + last.inv + " invalid emitted · seed 02");
      const rc = $("biReceipt"); if (rc) rc.textContent =
        "AUDIT · " + last.prop + " proposals · " + last.adm + " admitted · " + last.inv + " invalid — reproducible";
      root.CytherLedger && root.CytherLedger.recordAct("BOUNDARY_AUDIT", "10000 proposals · seed 02");
    });
  }

  API.step = step;
  API.wire = wire;
}

root.CytherInstrument = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
