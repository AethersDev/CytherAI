/* ============================================================================
   js/drawing-set.js  →  window.CytherDrawingSet
   The drawing set: the homepage as an engineering drawing set. Seven sheets share
   one frame (zone strips, title block, notes, seal); FIG. 1 streams the boundary
   engine — CytherInstrument.biEngine, the one on the record, not a copy — and lets
   the visitor move one edge of the admitted drawing, each position judged by
   CytherInstrument.judge; the admitted object is carried through sheets 2–6.
   Standing claims are CytherClaims' canonical predicates; the five drawing-set
   predicates (DS) are registered here, because they are predicates over this set.

   Pure geometry of a program (walk, extent, progId, pickEdge, candidateFor) loads
   under jsc and is pinned by tools/test-drawing-set.js; DOM wiring is guarded.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest, Inst = root.CytherInstrument, Claims = root.CytherClaims;
const BI_G = 12, BI_O = 6;

/* ================= geometry of a program — pure ================= */
function walk(toks) {   /* vertices in grid units, stopping at Z */
  let x = BI_O, y = BI_O; const v = [[x, y]];
  for (const tk of toks) { if (tk.k === "Z") { v.push([BI_O, BI_O]); break; } if (tk.k === "H") x += tk.sg * tk.mg; else y += tk.sg * tk.mg; v.push([x, y]); }
  return v;
}
function extent(toks) { const v = walk(toks).slice(0, -1); const xs = v.map(p => p[0]), ys = v.map(p => p[1]); return { minx: Math.min(...xs), maxx: Math.max(...xs), miny: Math.min(...ys), maxy: Math.max(...ys) }; }
const progId = toks => "PRG-" + (CM.fnv(toks.map(t => t.s).join("")) >>> 0).toString(16).padStart(8, "0").toUpperCase();
function pickEdge(toks) {   /* the longest segment whose neighbours are both explicit tokens, or null */
  let best = null; const n = toks.length - 1;   /* tokens before Z */
  for (let k = 1; k < n - 1; k++) if (best === null || toks[k].mg > toks[best].mg) best = k;
  return best;
}
/* the base program with edge k moved d units along its normal: the two neighbouring
   tokens change length. A zero-length neighbour is not a token of the grammar → null. */
function candidateFor(base, k, d) {
  const t = base.map(x => Object.assign({}, x)), pre = t[k - 1], post = t[k + 1];
  const shift = (tk, delta) => { const m = tk.sg * tk.mg + delta; if (m === 0) return false; tk.sg = m > 0 ? 1 : -1; tk.mg = Math.abs(m); tk.s = tk.k + (tk.sg > 0 ? "+" : "−") + tk.mg; return true; };
  return shift(pre, d) && shift(post, -d) ? t : null;
}
const API = { walk, extent, progId, pickEdge, candidateFor };
root.CytherDrawingSet = API;

/* ============================================================================
   DOM wiring — the frame, the projections, FIG. 1, the claims. Guarded.
   ============================================================================ */
if (typeof document === "undefined") return;
const $ = s => document.querySelector(s), reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MONO = "'SF Mono',Menlo,monospace";

/* ── the frame every sheet carries: zone strips, title block, notes, seal ── */
const seal = document.createElement("canvas"); seal.width = seal.height = 120;
function drawSeal(canvas, p) {
  const g = canvas.getContext("2d"), s = 120, sc = s * 0.17, pts = CM.dsinOrbit(p, 16000);
  g.fillStyle = "rgba(16,22,32,.28)";
  for (let i = 0; i < pts.length; i += 2) g.fillRect(s / 2 + pts[i] * sc, s / 2 + pts[i + 1] * sc, 1, 1);
}
drawSeal(seal, CM.CANON);
const fmt = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(3), serial = CM.CANON.map(fmt).join(" ");
const sheets = [...document.querySelectorAll(".sheet")];
sheets.forEach((sh, i) => {
  const zx = n => `<div class="zx ${n}">${[1, 2, 3, 4, 5, 6, 7, 8].map(k => `<span>${k}</span>`).join("")}</div>`;
  const zy = n => `<div class="zy ${n}">${["A", "B", "C", "D"].map(k => `<span>${k}</span>`).join("")}</div>`;
  sh.insertAdjacentHTML("afterbegin", zx("top") + zx("bot") + zy("left") + zy("right"));
  sh.querySelector(".frame").insertAdjacentHTML("beforeend", `
    <div class="tb" aria-label="Title block">
      <div class="c" style="width:150px"><div class="brand">CYTHERAI</div><div class="k">RIYADH · KSA</div></div>
      <div class="c" style="width:196px"><div class="k">TITLE</div><div class="v">${sh.dataset.title}</div></div>
      <div class="c" style="width:186px"><div class="k">DRAWN FROM</div><div class="v">PUBLIC MANIFEST <span class="acc" data-checksum>${CM.CHECKSUM}</span></div></div>
      <div class="c" style="width:176px"><div class="k">CHECKED BY</div><div class="v">6 CL · 5 DS · <span data-claims-count>—</span></div></div>
      <div class="c" style="width:142px"><div class="k">REV · EPOCH · DATE</div><div class="v">${CM.MANIFEST.revision} · 0${CM.MANIFEST.epoch} · ${CM.MANIFEST.derived}</div></div>
      <div class="c" style="width:80px"><div class="k">SHEET</div><div class="v" style="font-size:15px">${i + 1} / ${sheets.length}</div></div>
      <div class="c" style="width:72px"><div class="k" style="font-size:7px">APPROVED</div><canvas class="seal" width="120" height="120"></canvas></div>
    </div>
    <div class="notes"><b>${i === 0 ? "GENERAL NOTES" : "NOTES, SHEET " + (i + 1)}</b><br>${sh.dataset.notes.split("|").join("<br>")}</div>`);
});
document.querySelectorAll("canvas.seal").forEach(c => c.getContext("2d").drawImage(seal, 0, 0));
$("#serial").textContent = serial; $("#nonce").textContent = "0" + CM.ADMISSION_NONCE; $("#ck2").textContent = CM.CHECKSUM;

/* ── schedule 1, revisions, not claimed, chain of record — projections of the manifest ── */
const cell = (id, f, cls) => { const v = CM.project(`validation:${id}:${f}`); return v ? `<div class="${cls}" data-m="validation:${id}:${f}">${v}</div>` : `<div class="na">—</div>`; };
$("#sched").innerHTML = `<div class="tr h"><div>METRIC</div><div class="cy">CYTHER</div><div>DEEPCAD</div><div>T2CAD</div></div>` +
  CM.VALIDATION.map(r => `<div class="tr"><div>${r.mark === "ext" ? "◌" : "●"} <span data-m="validation:${r.id}:metric">${CM.project("validation:" + r.id + ":metric")}</span></div>${cell(r.id, "cyther", "cy")}${cell(r.id, "deepcad", "")}${cell(r.id, "t2cad", "")}</div>`).join("");
const nLog = CM.VALIDATION.filter(r => r.mark === "log").length;
$("#nLog").textContent = ["zero", "one", "two", "three", "four", "five", "six", "seven"][nLog] || nLog;
$("#sysId").textContent = CM.MANIFEST.systems_disclosed[0]; $("#patent").textContent = CM.MANIFEST.patent;
const eps = CM.EPOCHS.map(m => ({ n: m.epoch, d: m.derived, ck: CM.stateChecksum(m), cur: false })).concat([{ n: CM.MANIFEST.epoch, d: CM.MANIFEST.derived, ck: CM.CHECKSUM, cur: true }]);
$("#revs").innerHTML = eps.map(e => `<div class="row rev"><div>0${e.n}</div><div class="d">${e.d}</div><div>${e.cur ? `<span class="acc" data-checksum>${e.ck}</span> · canonical` : e.ck + " · superseded"}</div></div>`).join("") +
  CM.COMMITMENTS.map(c => `<div class="row rev"><div>0${c.epoch}</div><div class="d">${c.committed}</div><div>committed · sha256 ${c.digest.slice(0, 8)}… · ${c.status.toLowerCase()}</div></div>`).join("");
$("#nc").innerHTML = CM.MANIFEST.not_claimed.map((t, i) => `<div class="row nc"><div>${i + 1}. ${t}</div><span>NOT CLAIMED</span></div>`).join("");
$("#prov").innerHTML = CM.MANIFEST.provenance.map(r => `<div class="row rev"><div>${r.date.replace(".", "·")}</div><div class="d">${r.event}</div><div>${r.desc}</div></div>`).join("");
$("#patent2").textContent = CM.MANIFEST.patent; $("#oblCount").textContent = document.querySelectorAll("details.ob").length + " OBLIGATIONS";

/* ── FIG. 1 — a drawing that earns its ink ──
   Two realities in one figure: a faint field of proposals — each construction stroke
   appears from the position the boundary judged it at, carries a small witness at the
   offending relation, and fades — and one crisp admitted object, inked only when the
   independent kernel accepts a closed program. After the run settles, one edge of the
   admitted drawing becomes adjustable: every position the visitor drags it to is a
   proposal, judged by CytherInstrument.judge (the production boundary and kernel), and
   only an admitted candidate can be accepted. */
const NS = "http://www.w3.org/2000/svg", svg = $("#fig1"), S = 560, STEP = S / (BI_G + 2);
const P = (gx, gy) => [(gx + 1) * STEP, (gy + 1) * STEP];
const el = (n, a, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (parent || svg).appendChild(e); return e; };
const clear = g => { while (g.firstChild) g.removeChild(g.firstChild); };
const layers = {};
(function buildFig() {
  const dots = el("g", { fill: "rgba(16,22,32,.3)" });
  for (let i = 0; i <= BI_G; i++) for (let j = 0; j <= BI_G; j++) { const [x, y] = P(i, j); el("rect", { x: x - .5, y: y - .5, width: 1, height: 1 }, dots); }
  const [cx, cy] = P(BI_O, BI_O);
  el("line", { x1: cx, y1: P(0, 0)[1], x2: cx, y2: P(0, 12)[1], stroke: "#586376", "stroke-width": .6, "stroke-dasharray": "10 3 2 3" });
  el("line", { x1: P(0, 0)[0], y1: cy, x2: P(12, 0)[0], y2: cy, stroke: "#586376", "stroke-width": .6, "stroke-dasharray": "10 3 2 3" });
  layers.field = el("g", {}); layers.done = el("g", {}); layers.dims = el("g", {}); layers.ident = el("g", {}); layers.live = el("g", {}); layers.cand = el("g", {}); layers.flash = el("g", {});
  el("circle", { cx, cy, r: 2.4, fill: "#2036C7" });
})();
const pathOf = toks => walk(toks).map(([x, y]) => P(x, y));
const stroke = (a, b, attrs, parent) => el("line", Object.assign({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, attrs), parent);
const text = (x, y, t, attrs, parent) => { const e = el("text", Object.assign({ x, y, "font-family": MONO, "font-size": 8.5, fill: "#586376" }, attrs), parent); e.textContent = t; return e; };

/* the construction field: a proposal appears from where it was judged, with its witness, and fades */
const field = [];
const CONS = "#6E82AE";   /* the construction register: cool, luminous against paper; witnesses stay ink */
let liveToks = [];
function propose(ev, now) {
  const f = ev.from, tk = ev.tk, g = el("g", { opacity: 0 }, layers.field), why = ev.why;
  const [x0, y0] = P(f.x, f.y);
  let life = 1300;
  if (tk.k === "J") { stroke([x0 - 4, y0 - 4], [x0 + 4, y0 + 4], { stroke: "#586376", "stroke-width": .8 }, g); stroke([x0 - 4, y0 + 4], [x0 + 4, y0 - 4], { stroke: "#586376", "stroke-width": .8 }, g); life = 500; }
  else if (tk.k === "Z") { stroke([x0, y0], P(BI_O, BI_O), { stroke: "#586376", "stroke-width": .7, "stroke-dasharray": "2 3" }, g); el("circle", { cx: x0, cy: y0, r: 4, fill: "none", stroke: "#586376", "stroke-width": .8 }, g); life = 700; }
  else {
    const nx = tk.k === "H" ? f.x + tk.sg * tk.mg : f.x, ny = tk.k === "V" ? f.y + tk.sg * tk.mg : f.y;
    const cx = Math.max(-0.6, Math.min(12.6, nx)), cy = Math.max(-0.6, Math.min(12.6, ny)), [x1, y1] = P(cx, cy);
    if (why === "AXIS ORDER") { stroke([x0, y0], [x1, y1], { stroke: CONS, "stroke-width": .5, opacity: .6 }, g); const px = tk.k === "H" ? 0 : 5, py = tk.k === "H" ? 5 : 0; stroke([x0 - px, y0 - py], [x0 + px, y0 + py], { stroke: "#586376", "stroke-width": 1 }, g); life = 700; }
    else if (why === "ARG RANGE") { const [x4, y4] = P(tk.k === "H" ? f.x + tk.sg * 4 : f.x, tk.k === "V" ? f.y + tk.sg * 4 : f.y); stroke([x0, y0], [x4, y4], { stroke: CONS, "stroke-width": .9 }, g); stroke([x4, y4], [x1, y1], { stroke: CONS, "stroke-width": .9, "stroke-dasharray": "1.5 3" }, g); const bx = tk.k === "H" ? 0 : 6, by = tk.k === "H" ? 6 : 0; stroke([x4 - bx, y4 - by], [x4 + bx, y4 + by], { stroke: "#101620", "stroke-width": 1.2 }, g); text(x4 + 6, y4 - 6, "4 < " + tk.mg, {}, g); }
    else if (why === "BOUNDS") { const ex = Math.max(0, Math.min(12, nx)), ey = Math.max(0, Math.min(12, ny)), [xe, ye] = P(ex, ey); stroke([x0, y0], [xe, ye], { stroke: CONS, "stroke-width": .9 }, g); stroke([xe, ye], [x1, y1], { stroke: CONS, "stroke-width": .9, "stroke-dasharray": "1.5 3" }, g); const bx = tk.k === "H" ? 0 : 7, by = tk.k === "H" ? 7 : 0; stroke([xe - bx, ye - by], [xe + bx, ye + by], { stroke: "#101620", "stroke-width": 1.4 }, g); }
    else if (why === "CROSSES") { const hit = firstCrossing(f, tk, ev.toks || liveToks); stroke([x0, y0], [x1, y1], { stroke: CONS, "stroke-width": .9, "stroke-dasharray": "2 2" }, g); if (hit) el("circle", { cx: hit[0], cy: hit[1], r: 4.5, fill: "none", stroke: "#101620", "stroke-width": 1.1 }, g); }
    else { stroke([x0, y0], [x1, y1], { stroke: CONS, "stroke-width": .9 }, g); }
    if (why !== "AXIS ORDER") text(x1 + 6, y1 - 6, "✗ " + tk.s + " · " + why, {}, g);
  }
  field.push({ g, t0: now, life });
  while (field.length > 24) { const o = field.shift(); o.g.remove(); }
}
function firstCrossing(f, tk, toks) {   /* the first cell of the proposed stroke already covered by the program */
  const cov = new Set(); const v = walk(toks || []);
  for (let i = 1; i < v.length; i++) { const [ax, ay] = v[i - 1], [bx, by] = v[i]; const dx = Math.sign(bx - ax), dy = Math.sign(by - ay); let x = ax, y = ay; cov.add(x + "," + y); while (x !== bx || y !== by) { x += dx; y += dy; cov.add(x + "," + y); } }
  cov.add(BI_O + "," + BI_O);
  let x = f.x, y = f.y; const dx = tk.k === "H" ? tk.sg : 0, dy = tk.k === "V" ? tk.sg : 0;
  for (let i = 0; i < tk.mg; i++) { x += dx; y += dy; if (cov.has(x + "," + y)) return P(x, y); }
  return null;
}
function ageField(now) {
  for (let i = field.length - 1; i >= 0; i--) { const o = field[i], a = 1 - (now - o.t0) / o.life; if (a <= 0) { o.g.remove(); field.splice(i, 1); } else o.g.setAttribute("opacity", (Math.min(1, (now - o.t0) / 60) * 0.7 * a).toFixed(3)); }
  return field.length > 0;
}
function drawLive(toks) {
  liveToks = toks; clear(layers.live);
  const pts = pathOf(toks); if (pts.length < 2) return;
  el("polyline", { points: pts.slice(0, -1).map(p => p.join(",")).join(" "), fill: "none", stroke: "#414A5B", "stroke-width": 1, "stroke-dasharray": "2 2" }, layers.live);
  stroke(pts[pts.length - 2], pts[pts.length - 1], { stroke: "#2036C7", "stroke-width": 2 }, layers.live);
}
/* the admitted object: ink, dimensions, callout, identity — and its adjustable edge */
let drawing = null;   /* { toks, id, label } — what is inked now */
function drawDone(toks, label, resolve) {
  clear(layers.done); clear(layers.dims); clear(layers.ident); clear(layers.cand);
  const pts = pathOf(toks), ink = el("polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: "#101620", "stroke-width": 1.5, "stroke-linejoin": "miter", opacity: resolve ? 0 : 1 }, layers.done);
  const e = extent(toks), dims = layers.dims; if (resolve) dims.setAttribute("opacity", 0);
  const dy = P(0, e.maxy + 1.6 <= 12 ? e.maxy + 1.6 : e.miny - 1.6)[1], [x0] = P(e.minx, 0), [x1] = P(e.maxx, 0);
  const dim = (a, b, c, d) => stroke([a, b], [c, d], { stroke: "#101620", "stroke-width": .7 }, dims);
  dim(x0, dy, x1, dy); dim(x0, dy - 5, x0, dy + 5); dim(x1, dy - 5, x1, dy + 5);
  text((x0 + x1) / 2, dy - 6, (e.maxx - e.minx) + (e.maxx - e.minx === 1 ? " UNIT" : " UNITS") + " · ADMITTED", { "text-anchor": "middle", "font-size": 9, fill: "#101620" }, dims);
  const right = e.maxx + 1.4 <= 12, dx = P(right ? e.maxx + 1.4 : e.minx - 1.4, 0)[0], [, y0] = P(0, e.miny), [, y1] = P(0, e.maxy);
  dim(dx, y0, dx, y1); dim(dx - 5, y0, dx + 5, y0); dim(dx - 5, y1, dx + 5, y1);
  text(dx + (right ? 8 : -14), (y0 + y1) / 2 + 3, String(e.maxy - e.miny), { "font-size": 9, fill: "#101620" }, dims);
  const [bx, by] = P(e.maxx, e.miny), [lx, ly] = P(Math.min(11.4, e.maxx + 1.4), Math.max(0.3, e.miny - 1.1));
  stroke([bx, by], [lx, ly], { stroke: "#101620", "stroke-width": .7 }, dims);
  el("circle", { cx: lx + 9, cy: ly - 9, r: 11, fill: "#ECF0F4", stroke: "#101620", "stroke-width": 1 }, dims);
  text(lx + 9, ly - 5.5, "1", { "text-anchor": "middle", "font-size": 10, fill: "#101620" }, dims);
  /* the identity is stated the instant authority changes — the kernel has already spoken; the ink that follows is its consequence */
  text(P(0, 12.55)[0], P(0, 12.55)[1], progId(toks) + (label ? " · " + label : ""), { "font-size": 8.5, fill: "#414A5B" }, layers.ident);
  drawing = { toks, id: progId(toks), label };
  if (resolve && !reduced) {   /* the resolution moment: guides recede, ink and dimensions arrive, ~500 ms */
    const t0 = performance.now();
    (function fade(now) { const u = Math.min(1, (now - t0) / 500); ink.setAttribute("opacity", u); dims.setAttribute("opacity", u); layers.field.setAttribute("opacity", 1 - u); if (u < 1) requestAnimationFrame(fade); else { for (const o of field) o.g.remove(); field.length = 0; layers.field.setAttribute("opacity", 1); } })(t0);
  }
  placeHandle();
}
/* ── the admitted object, carried through the set. One program, one identifier, five framings; each says
   what it is — a demonstration admitted in this browser — and never mixes with a manifest fact. ── */
const OBJ = [...document.querySelectorAll(".obj")];
let lastVerdict = null;   /* the receipt the current drawing earned: the run's admission, or the visitor's proposal */
function miniPath(svgEl, toks, dim) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  const st = 140 / 14, Q = (x, y) => [(x + 1) * st, (y + 1) * st], mk = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); svgEl.appendChild(e); return e; };
  const dots = mk("g", { fill: "rgba(16,22,32,.22)" }); for (let i = 0; i <= 12; i += 2) for (let j = 0; j <= 12; j += 2) { const [x, y] = Q(i, j); const r = document.createElementNS(NS, "rect"); r.setAttribute("x", x - .5); r.setAttribute("y", y - .5); r.setAttribute("width", 1); r.setAttribute("height", 1); dots.appendChild(r); }
  if (!toks) return;
  const pts = walk(toks).map(([x, y]) => Q(x, y));
  mk("polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: "#101620", "stroke-width": 1.3, "stroke-linejoin": "miter" });
  const [cx, cy] = Q(BI_O, BI_O); mk("circle", { cx, cy, r: 1.6, fill: "#2036C7" });
  if (dim) { const e = extent(toks), [x0] = Q(e.minx, 0), [x1] = Q(e.maxx, 0), yy = Q(0, Math.min(12.8, e.maxy + 1.2))[1]; mk("line", { x1: x0, y1: yy, x2: x1, y2: yy, stroke: "#101620", "stroke-width": .6 }); const t = mk("text", { x: (x0 + x1) / 2, y: yy - 3, "text-anchor": "middle", "font-family": MONO, "font-size": 7, fill: "#101620" }); t.textContent = (e.maxx - e.minx) + " × " + (e.maxy - e.miny); }
}
function renderObject() {
  const d = drawing;
  OBJ.forEach(box => {
    const svgEl = box.querySelector("svg"), body = box.querySelector(".body"), kind = box.dataset.obj;
    box.classList.toggle("has", !!d);
    if (!d) { miniPath(svgEl, null); body.textContent = "The drawing from sheet 1 will appear here once the run settles."; return; }
    const e = extent(d.toks), n = d.toks.length, id = `<span class="id">${d.id}</span>`, how = lastVerdict && lastVerdict.proposal ? `proposal ${String(lastVerdict.proposal).padStart(3, "0")}, accepted by you` : `program ${lastVerdict ? lastVerdict.n : "—"} of the seed-02 run`;
    miniPath(svgEl, d.toks, kind === "measure" || kind === "record");
    if (kind === "system") body.innerHTML = `${id} — ${n} tokens: <b>${d.toks.map(t => t.s).join(" ")}</b><br>each token admitted by the boundary in this order; the closed program verified by the kernel; ${how}.`;
    else if (kind === "measure") body.innerHTML = `${id} · width <b>${e.maxx - e.minx}</b> · height <b>${e.maxy - e.miny}</b> · ${n} tokens · grid units of a toy grammar.<br>Measured in your browser as an illustration of the mechanism. It is not one of the published figures above and enters no evaluation.`;
    else if (kind === "wall") body.innerHTML = `${id} — proposed, judged and inked on this page, on this machine. Its verification never crossed the wall either: <b>0</b> external requests.`;
    else if (kind === "access") body.innerHTML = `${id} · a review can start from the object you admitted.`;
    else if (kind === "record") body.innerHTML = `${id} · ${n} tokens · ${e.maxx - e.minx} × ${e.maxy - e.miny}<br>${how}<br>GRAMMAR <b>PASS</b> · AXIS ORDER <b>PASS</b> · ARG RANGE <b>PASS</b> · BOUNDS <b>PASS</b> · CROSSES <b>PASS</b> · CLOSURE <b>PASS</b> · KERNEL <b>PASS</b><br><span style="color:var(--quiet)">a local derivation receipt — this browser's, not the manifest's; the seal above is the manifest's</span>`;
  });
}
function flashAdmission(toks) {   /* a later, smaller admission: acknowledged once in the construction register — never a second inked object */
  const pts = pathOf(toks), g = el("polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: "#2036C7", "stroke-width": 1, opacity: .45 }, layers.flash);
  if (reduced) { g.remove(); return; }
  const t0 = performance.now(); (function fade(now) { const u = Math.min(1, (now - t0) / 500); g.setAttribute("opacity", (0.45 * (1 - u)).toFixed(3)); if (u < 1) requestAnimationFrame(fade); else g.remove(); })(t0);
}

/* ── the adjustable edge: one segment with explicit neighbours, moved along its normal ── */
const handle = $("#handle"), proposalUI = $("#proposal"), receiptEl = $("#receipt"), acceptBtn = $("#accept"), resetBtn = $("#resetEdge");
const ctr = $("#ctr"), log = $("#figlog"), state = $("#figState");
let edge = null, cand = null, proposals = 0, running = false;
function placeHandle() {
  edge = null; cand = null; clear(layers.cand); receiptEl.textContent = ""; acceptBtn.disabled = true; resetBtn.disabled = true;
  if (running || !drawing) { handle.hidden = true; proposalUI.hidden = true; return; }
  const k = pickEdge(drawing.toks); if (k === null) { handle.hidden = true; proposalUI.hidden = true; return; }
  const v = walk(drawing.toks), a = v[k], b = v[k + 1], [px, py] = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  edge = { k, axis: drawing.toks[k].k, d: 0, base: drawing.toks };
  handle.style.left = (px / S * 100) + "%"; handle.style.top = (py / S * 100) + "%"; handle.hidden = false; proposalUI.hidden = false;
  handle.dataset.axis = edge.axis;
  handle.setAttribute("aria-label", `Edge ${k + 1} of the admitted drawing, ${edge.axis === "V" ? "vertical — Left and Right arrows move it" : "horizontal — Up and Down arrows move it"} one unit; Enter accepts an admitted candidate; Escape resets`);
  receiptEl.innerHTML = `<span class="k">MOVE ONE EDGE. FIND THE LIMIT.</span><br>drag the handle ${edge.axis === "V" ? "left or right" : "up or down"}, or focus it and use the arrow keys — every position is a proposal, judged by the boundary and the kernel`;
}
function judgeCandidate(d) {
  if (!edge || d === edge.d) return;
  /* the edge stays on the sheet: its moved coordinate is clamped to the grid; the strokes it drags may still leave it (BOUNDS).
     A position that would give a neighbouring edge zero length is not a token of the grammar — step past it in the direction of travel. */
  const v0 = walk(edge.base), c0 = edge.axis === "V" ? v0[edge.k][0] : v0[edge.k][1];
  d = Math.max(-c0, Math.min(12 - c0, d)); if (d === edge.d) return;
  const dir = Math.sign(d - edge.d) || 1; let toks = candidateFor(edge.base, edge.k, d);
  while (!toks && d + dir >= -c0 && d + dir <= 12 - c0) { d += dir; toks = candidateFor(edge.base, edge.k, d); }
  if (!toks) return;
  edge.d = d; cand = { toks, d, verdict: Inst.judge(toks) }; proposals++;
  clear(layers.cand);
  const pts = pathOf(toks), v = cand.verdict, at = v.ok ? pts.length : v.at + 1;   /* vertices judged: up to the start of the refused token */
  const seg = (arr, attrs) => { if (arr.length > 1) el("polyline", Object.assign({ points: arr.map(p => p.join(",")).join(" "), fill: "none", stroke: "#2036C7", "stroke-width": 1.6 }, attrs), layers.cand); };
  seg(pts.slice(0, at), v.ok ? {} : { "stroke-dasharray": "4 3", opacity: .9 });                         /* PASS — admitted so far */
  if (!v.ok) { seg(pts.slice(at - 1, at + 1), { "stroke-dasharray": "1.5 3", "stroke-width": 1.2, opacity: .8 });   /* FAIL — the refused stroke */
    seg(pts.slice(at), { "stroke-dasharray": "1 4", "stroke-width": 1, opacity: .35 }); }                      /* — not judged */
  if (!v.ok && v.why !== "KERNEL" && v.at < toks.length) {   /* the witness: where the boundary said no */
    const tk = toks[v.at], g = el("g", {}, layers.cand), [x0, y0] = P(v.x, v.y);
    if (tk.k === "Z") el("circle", { cx: x0, cy: y0, r: 5, fill: "none", stroke: "#101620", "stroke-width": 1.2 }, g);
    else { const nx = tk.k === "H" ? v.x + tk.sg * tk.mg : v.x, ny = tk.k === "V" ? v.y + tk.sg * tk.mg : v.y;
      if (v.why === "BOUNDS") { const ex = Math.max(0, Math.min(12, nx)), ey = Math.max(0, Math.min(12, ny)), [xe, ye] = P(ex, ey); const bx = tk.k === "H" ? 0 : 8, by = tk.k === "H" ? 8 : 0; stroke([xe - bx, ye - by], [xe + bx, ye + by], { stroke: "#101620", "stroke-width": 1.6 }, g); text(xe + (tk.k === "H" ? (tk.sg > 0 ? -70 : 8) : 8), ye + (tk.k === "V" ? (tk.sg > 0 ? -8 : 14) : -8), "✗ BOUNDS · the wall", { fill: "#101620" }, g); }
      else if (v.why === "ARG RANGE") { const [x4, y4] = P(tk.k === "H" ? v.x + tk.sg * 4 : v.x, tk.k === "V" ? v.y + tk.sg * 4 : v.y); const bx = tk.k === "H" ? 0 : 7, by = tk.k === "H" ? 7 : 0; stroke([x4 - bx, y4 - by], [x4 + bx, y4 + by], { stroke: "#101620", "stroke-width": 1.4 }, g); text(x4 + 8, y4 - 8, "✗ ARG RANGE · 4 < " + tk.mg, { fill: "#101620" }, g); }
      else if (v.why === "CROSSES") { const hit = firstCrossing({ x: v.x, y: v.y }, tk, toks.slice(0, v.at)); if (hit) { el("circle", { cx: hit[0], cy: hit[1], r: 9, fill: "none", stroke: "#101620", "stroke-width": 1.3 }, g); text(hit[0] + 12, hit[1] - 10, "✗ CROSSES · the path already covers this cell", { fill: "#101620" }, g); } }
      else { el("circle", { cx: x0, cy: y0, r: 5, fill: "none", stroke: "#101620", "stroke-width": 1.2 }, g); text(x0 + 9, y0 - 8, "✗ " + v.why, { fill: "#101620" }, g); }
    }
  }
  /* causal tie: the visitor moved edge k, but the first refused token may be a neighbour it dragged past its
     limit — a light leader from the handle to that stroke says so before the receipt is read. Not drawn when
     the refusal is on the manipulated edge itself; there the geometry already explains itself. */
  if (!v.ok && v.why !== "KERNEL" && v.at < toks.length && v.at !== edge.k && toks[v.at].k !== "Z") {
    const vv = walk(toks), a = vv[v.at], b = vv[v.at + 1] || a, mid = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    const ha = vv[edge.k], hb = vv[edge.k + 1], hp = P((ha[0] + hb[0]) / 2, (ha[1] + hb[1]) / 2);
    stroke(hp, mid, { stroke: "#586376", "stroke-width": .7, "stroke-dasharray": "1 3" }, layers.cand);
    el("circle", { cx: mid[0], cy: mid[1], r: 2.2, fill: "#586376" }, layers.cand);
  }
  receipt(cand);
  acceptBtn.disabled = !v.ok; resetBtn.disabled = false;
}
const RELATIONS = ["GRAMMAR", "AXIS ORDER", "ARG RANGE", "BOUNDS", "CROSSES", "CLOSURE", "KERNEL"];
function receipt(c) {
  const v = c.verdict, failAt = v.ok ? -1 : RELATIONS.indexOf(v.why.startsWith("CLOS") ? "CLOSURE" : v.why);
  const cells = RELATIONS.map((r, i) => { const st = v.ok ? "PASS" : i < failAt ? "PASS" : i === failAt ? "FAIL" : "—"; return `<span style="white-space:nowrap">${r} <b style="color:${st === "FAIL" ? "#B23A2E" : st === "PASS" ? "#101620" : "#586376"}">${st}</b></span>`; }).join(" · ");
  receiptEl.innerHTML = `<span class="k">PROPOSAL ${String(proposals).padStart(3, "0")} · EDGE ${c.d > 0 ? "+" : ""}${c.d} · ${progId(c.toks)}</span><br>${cells}` + (v.ok ? `<br><span style="color:#2036C7">admissible — ACCEPT CHANGE inks it</span>` : `<br><span style="color:#586376">refused at token ${v.at + 1} (${c.toks[v.at] ? c.toks[v.at].s : "end"}) — the candidate stays a proposal; the admitted drawing stands</span>`);
}
function acceptCandidate() {
  if (!cand || !cand.verdict.ok) return;
  const n = proposals, prev = [...layers.done.childNodes], candNodes = [...layers.cand.childNodes], prevDims = layers.dims.cloneNode(true);
  [...prevDims.querySelectorAll("text, circle")].forEach(node => node.remove());   /* only the old measure lines ghost; the identity and callout are stated once */
  layers.cand.parentNode.insertBefore(prevDims, layers.cand);   /* the old dimensions recede with the old object */
  prev.forEach(node => layers.flash.appendChild(node)); candNodes.forEach(node => layers.flash.appendChild(node));
  drawDone(cand.toks, `PROPOSAL ${String(n).padStart(3, "0")} · ACCEPTED`, !reduced);
  const ghosts = prev.concat(candNodes);
  if (!reduced) { const t0 = performance.now(); (function fade(now) { const u = Math.min(1, (now - t0) / 500); ghosts.forEach(node => node.setAttribute("opacity", (1 - u).toFixed(3))); prevDims.setAttribute("opacity", (1 - u).toFixed(3)); if (u < 1) requestAnimationFrame(fade); else { ghosts.forEach(node => node.remove()); prevDims.remove(); } })(t0); }
  else { ghosts.forEach(node => node.remove()); prevDims.remove(); }
  lastVerdict = { proposal: n }; renderObject();
  log.textContent = `● proposal ${String(n).padStart(3, "0")} admitted by the boundary and verified by the kernel — ${drawing.id} is now the drawing.`;
  Claims.setClaim("DS-05", true, "drawing " + drawing.id + " judged admitted");
}
function positionHandle(d) {
  const v = walk(edge.base), a = v[edge.k], b = v[edge.k + 1], [px, py] = P((a[0] + b[0]) / 2 + (edge.axis === "V" ? d : 0), (a[1] + b[1]) / 2 + (edge.axis === "H" ? d : 0));
  handle.style.left = (px / S * 100) + "%"; handle.style.top = (py / S * 100) + "%";
}
/* pointer: drag along the normal; keyboard: arrows, Enter, Escape */
(function wireHandle() {
  let drag = null;
  handle.addEventListener("pointerdown", e => { if (!edge) return; handle.setPointerCapture(e.pointerId); const r = svg.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, scale: r.width / S, d0: edge.d }; e.preventDefault(); });
  handle.addEventListener("pointermove", e => { if (!drag || !edge) return; const px = (e.clientX - drag.x) / drag.scale, py = (e.clientY - drag.y) / drag.scale; const d = drag.d0 + Math.round((edge.axis === "V" ? px : py) / STEP); if (d !== edge.d) { judgeCandidate(d); positionHandle(edge.d); } });
  const end = () => { drag = null; }; handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
  handle.addEventListener("keydown", e => {
    if (!edge) return;
    const along = edge.axis === "V" ? { ArrowRight: 1, ArrowLeft: -1 } : { ArrowDown: 1, ArrowUp: -1 };
    if (e.key in along) { e.preventDefault(); judgeCandidate(edge.d + along[e.key]); positionHandle(edge.d); }
    else if (e.key === "Enter") { e.preventDefault(); acceptCandidate(); }
    else if (e.key === "Escape") { e.preventDefault(); placeHandle(); }
  });
  acceptBtn.addEventListener("click", acceptCandidate); resetBtn.addEventListener("click", placeHandle);
})();

/* ── the run: 1,500 proposals at seed 02, streamed ── */
const N = 1500, SEED = 2, PER_FRAME = 5;
let eng, why, best = null, bestArea = -1, raf = 0;
function counters() { const s = eng.st; ctr.innerHTML = `PROPOSED ${s.prop.toLocaleString()} · REFUSED ${s.rej.toLocaleString()} · DISCARDED ${s.disc} · <b>ADMITTED ${s.adm}</b> · INVALID EMITTED <b>${s.inv}</b>`; }
function handleEv(ev, now) {
  if (ev.e === "rej") { why[ev.why] = (why[ev.why] || 0) + 1; if (!reduced) propose(ev, now); if (ev.discarded) { clear(layers.live); liveToks = []; } }
  else if (ev.e === "ok") drawLive(ev.toks);
  else if (ev.e === "adm") {
    clear(layers.live); liveToks = [];
    const e = extent(ev.prog), area = (e.maxx - e.minx) * (e.maxy - e.miny), id = progId(ev.prog);
    if (area > bestArea) { bestArea = area; best = { prog: ev.prog, id, n: eng.st.adm }; drawDone(ev.prog, `PROGRAM ${eng.st.adm} OF THE RUN`, true); }
    else flashAdmission(ev.prog);
    log.textContent = `● Z · kernel ✓ · ${id} (${ev.prog.length} tokens) — admitted · program ${eng.st.adm}` + (best.id === id ? " · inked" : ` · the figure keeps ${best.id}, the largest so far`);
  }
  else if (ev.e === "inv") { log.textContent = "INVALID EMITTED — the kernel refused a program the boundary admitted. CL-05 fails."; Claims.setClaim("CL-05", false, "kernel rejected an emitted program"); }
}
function finish() {
  running = false; state.textContent = "SETTLED"; counters(); bars();
  $("#refusedBox").textContent = `Returned to the proposer. ${eng.st.rej.toLocaleString()} of ${eng.st.prop.toLocaleString()} in the seed-0${SEED} run.`;
  Claims.setClaim("CL-05", eng.st.inv === 0 && eng.st.adm > 0, `${eng.st.prop.toLocaleString()} proposals · ${eng.st.adm} admitted · ${eng.st.inv} invalid · seed 0${SEED}`);
  if (best) { drawDone(best.prog, `PROGRAM ${best.n} OF ${eng.st.adm} · LARGEST ADMITTED`, false); lastVerdict = { n: best.n }; renderObject(); log.textContent = `Settled. ${eng.st.adm} programs admitted, ${eng.st.inv} invalid emitted. FIG. 1 keeps ${best.id}. Move its edge to propose a change; RUN AGAIN reproduces every stroke.`; }
  Claims.setClaim("DS-05", !!drawing && Inst.judge(drawing.toks).ok, drawing ? "drawing " + drawing.id + " judged admitted" : "no drawing");
}
function run() {
  cancelAnimationFrame(raf); eng = Inst.biEngine(SEED); why = {}; best = null; bestArea = -1; running = true; state.textContent = "LIVE"; drawing = null; proposals = 0; liveToks = [];
  clear(layers.done); clear(layers.dims); clear(layers.ident); clear(layers.live); clear(layers.cand); clear(layers.flash); for (const o of field) o.g.remove(); field.length = 0; placeHandle(); lastVerdict = null; renderObject();
  if (reduced) { for (let i = 0; i < N; i++) handleEv(eng.step(), 0); finish(); return; }
  (function frame(now) {
    for (let i = 0; i < PER_FRAME && eng.st.prop < N; i++) handleEv(eng.step(), now);
    ageField(now); counters();
    if (eng.st.prop < N) raf = requestAnimationFrame(frame);
    else { finish(); (function settle(t) { if (ageField(t)) requestAnimationFrame(settle); })(performance.now()); }
  })(performance.now());
}
function bars() {
  const rows = Object.entries(why).sort((a, b) => b[1] - a[1]), mx = rows.length ? rows[0][1] : 1;
  $("#bars").innerHTML = rows.map(([k, v]) => `<div class="bar"><div class="n">${k}</div><div class="t"><i style="width:${(v / mx * 100).toFixed(1)}%"></i></div><div class="c">${v}</div></div>`).join("");
  $("#barsHead").textContent = `SEED 0${SEED} · ${eng.st.prop.toLocaleString()} PROPOSALS · ${eng.st.rej.toLocaleString()} REFUSED`;
}
$("#runAgain").addEventListener("click", run);
$("#audit").addEventListener("click", () => {
  const a = Inst.audit(10000, SEED);
  log.textContent = `AUDIT · ${a.prop.toLocaleString()} proposals · ${a.adm} admitted · ${a.inv} invalid emitted · seed 0${SEED} — reproducible on every machine.`;
  Claims.setClaim("CL-05", a.inv === 0 && a.adm > 0, `${a.prop.toLocaleString()} proposals · ${a.adm} admitted · ${a.inv} invalid emitted · seed 0${SEED}`);
});

/* ── the drawing-set predicates (DS) — registered beside the canonical claims (CL).
   An identifier is part of a claim: a canonical CL number is used only where the
   predicate is the canonical one; a predicate over this set is a DS. ── */
const token = name => { const h = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); };
const inkClaim = (name, label) => () => { const paper = token("--paper"), ink = token(name); const r = Claims.wcagRatio(ink, paper); return { ok: r >= 4.5, detail: r.toFixed(2) + ":1 · " + label + " on paper" }; };
function sealClaim() {   /* the seal on every title block is the derivation: re-derive the parameters, redraw, compare pixels with a stamped copy */
  const again = document.createElement("canvas"); again.width = again.height = 120;
  drawSeal(again, CM.paramsFor(CM.normalizeManifest(CM.MANIFEST), CM.ADMISSION_NONCE));
  const stamped = [...document.querySelectorAll(".tb canvas.seal")], px = c => c.getContext("2d").getImageData(0, 0, 120, 120).data;
  const a = px(stamped[0]), b = px(again);
  let same = a.length === b.length; for (let i = 0; same && i < a.length; i++) same = a[i] === b[i];
  const ok = same && stamped.length === sheets.length;
  return { ok, detail: ok ? "re-derived seal is pixel-identical to the stamped one · " + stamped.length + " title blocks" : same ? stamped.length + " seals for " + sheets.length + " sheets" : "seal ≠ derivation" };
}
Claims.CLAIMS.push(
  { id: "DS-01", text: "SEAL SERIAL ≡ STATE", m: "Compares the serial printed beside the seal on sheet 6 to the canonical parameters, formatted by the same function.",
    run: () => { const got = $("#serial").textContent.trim(); return { ok: got === serial, detail: got === serial ? "printed serial equals the canonical parameters" : "serial ≠ state" }; } },
  { id: "DS-02", text: "READING INK ≥ 4.5:1 ON PAPER", m: "Reads --ink and --paper from the stylesheet's root tokens and computes their WCAG contrast; the ground is fixed, so one ratio covers every sheet.", run: inkClaim("--ink", "ink") },
  { id: "DS-03", text: "QUIETEST INK ≥ 4.5:1 ON PAPER", m: "The same computation for --quiet, the quietest text token the stylesheet permits.", run: inkClaim("--quiet", "quiet ink") },
  { id: "DS-04", text: "SEAL ≡ DERIVATION", m: "Re-derives the four parameters from the manifest and nonce, redraws the seal, and compares it pixel for pixel with the seal every title block was stamped from.", run: sealClaim },
  { id: "DS-05", text: "THE DRAWING IS AN ADMITTED PROGRAM", m: "The program inked in FIG. 1 — the run's largest admission, or the proposal you accepted — is judged again by CytherInstrument.judge: boundary, then kernel.", run: null }
);
const wall = () => { const s = Claims.CLAIMSTATE["CL-01"]; if (!s) return; const n = parseInt(s.detail, 10); $("#ext").textContent = isNaN(n) ? "?" : n; $("#extState").textContent = s.ok ? "HOLDING" : "INVALID"; };
const recompute = () => { Claims.recomputeClaims(); wall(); };
$("#recompute").addEventListener("click", recompute);
Claims.renderClaims();
run();
addEventListener("load", () => {
  setTimeout(recompute, 150);
  /* CL-03: the three published admissions, re-derived off the boot path */
  setTimeout(() => {
    const checks = [[CM.NORM, CM.PUBLISHED_NONCES.current], [CM.EPOCHS[0], CM.PUBLISHED_NONCES.epochs[0]], [CM.EPOCHS[1], CM.PUBLISHED_NONCES.epochs[1]]];
    let i = 0, ok = true;
    (function stepv() {
      if (i >= checks.length) { Claims.setClaim("CL-03", ok, ok ? "3 admissions re-derived" : "nonce ≠ derivation"); return; }
      const [m, n] = checks[i++], a = CM.admit(m); if (!a || a.n !== n) ok = false; setTimeout(stepv, 80);
    })();
  }, 500);
});

})(typeof globalThis !== "undefined" ? globalThis : this);
