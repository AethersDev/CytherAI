/* ============================================================================
   js/instrument.js  →  window.CytherInstrument
   The boundary, working. A hostile proposer streams arbitrary tokens at a
   constraint boundary over a toy rectilinear-profile DSL; admission is incremental
   (grammar, then geometry) and an INDEPENDENT kernel re-verifies every program
   before emission. Demonstrated invariant: nothing inadmissible is ever emitted.
   Deterministic: seeded LCG, high bits only (low LCG bits are correlated) — same
   seed, same stream, on every machine.

   Ported from newC3/synthesis-rev5.html. Pure and DOM-free: FIG. 1 of the drawing
   set (js/drawing-set.js) streams biEngine and judges proposals with judge; the
   world's canvas/log wiring left with the world (backup/instrument-v1/js/instrument.js).
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
    /* every event names the position it was judged from, so a consumer of this engine
       can draw what happened without reaching into the state (FIG. 1 draws each refusal
       where it was judged, with its witness) */
    const from = { x: at.x, y: at.y };
    if (!r.ok) { st.rej++; const discarded = --at.budget <= 0; if (discarded) { st.disc++; at = fresh(); } return { e: "rej", tk, why: r.why, from, discarded }; }
    if (r.close) {
      at.toks.push(tk);
      const okK = biKernel(at.toks);
      if (okK) st.adm++; else st.inv++;
      const prog = at.toks; at = fresh();
      return { e: okK ? "adm" : "inv", tk, prog, from };
    }
    r.pts.forEach(p => at.cov.add(p));
    at.x = r.nx; at.y = r.ny; at.axis = at.axis === "H" ? "V" : "H"; at.nseg++; at.toks.push(tk);
    return { e: "ok", tk, from, to: { x: r.nx, y: r.ny }, toks: at.toks };
  }
  return { step, st };
}
/* judge — the boundary and the kernel applied to a PROPOSED program, token by token:
   the same biAdmit the proposer meets and the same biKernel every closed program
   meets, so a surface that lets a visitor propose geometry (FIG. 1's adjustable edge)
   is judged by the production mechanism and nothing else. Returns the first refused relation and the
   token it was refused at, or the kernel's verdict on the whole closed program. */
function judge(toks) {
  const at = { x: BI_O, y: BI_O, axis: "H", nseg: 0, cov: new Set([BI_O+","+BI_O]) };
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i], r = biAdmit(at, tk);
    if (!r.ok) return { ok: false, at: i, why: r.why, x: at.x, y: at.y };
    if (r.close) return biKernel(toks.slice(0, i + 1)) ? { ok: true, at: i, why: null, kernel: true } : { ok: false, at: i, why: "KERNEL", x: at.x, y: at.y };
    r.pts.forEach(p => at.cov.add(p)); at.x = r.nx; at.y = r.ny; at.axis = at.axis === "H" ? "V" : "H"; at.nseg++;
  }
  return { ok: false, at: toks.length, why: "CLOSURE", x: at.x, y: at.y };   /* never closed */
}
/* pure audit — runs `count` proposals at `seed`, returns the invariant stats. Feeds CL-05. */
function audit(count, seed) { const e = biEngine(seed); for (let i = 0; i < count; i++) e.step(); return e.st; }

const last = audit(1500, 2);   /* the seed-02 audit, so CL-05 has evidence at boot */
function lastAudit() { return last; }

/* biEngine is the one boundary engine: FIG. 1 streams it, the audit runs it, and any
   surface that demonstrates the boundary consumes this export rather than a copy — a
   copy is a silent drift path from the mechanism it claims to show. tools/test-boundary.js
   pins the stream. */
const API = { audit, lastAudit, biEngine, judge };

root.CytherInstrument = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
