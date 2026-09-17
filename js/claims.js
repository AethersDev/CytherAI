/* ============================================================================
   js/claims.js  →  window.CytherClaims
   Standing claims as predicates the page executes against itself. The footer
   reads CLAIMS n/N HOLDING and any failure prints ✕ INVALID in place.

   The CANONICAL predicates — CL-01, CL-02, CL-03, CL-05, CL-06b, CL-07 — are claims
   of the record and bind on any page that prints it. An identifier is part of a
   claim: the world predicates CL-04, CL-06, CL-06c and CL-08 (serial, colour model,
   camera) left with the world they were propositions about (backup/instrument-v1/
   js/claims.js), and no page carries a row claiming to have checked them. A page
   adds its own predicates by pushing onto CLAIMS before the first render
   (js/drawing-set.js adds DS-01..05).

   Ported from newC3/synthesis-rev5.html; CL-06b — text-lane legibility ≤ cap (§5.3).
   Predicates are pure/logic; renderClaims + DOM reads are guarded.
   CL-03 and CL-05 are set by the page module (the async admissions verifier, the run).
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;
const hasDoc = typeof document !== "undefined";

/* ================= pure predicates ================= */
function wcagRatio(a, b) {
  const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
  const la = lum(a), lb = lum(b); return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}
/* CL-06b: the canonical mark does not flood the reading column — its text-lane
   metric stays under the admission cap (3× headroom). */
function legibilityClaim() {
  const m = CM.legibility(CM.CANON), cap = CM.LEGIBILITY_CAP;
  return { ok: m <= cap, detail: "text-lane " + m.toFixed(3) + " ≤ cap " + cap.toFixed(2) };
}

/* CL-07: the admission core is deterministic to < 1e-6 of native sine. */
function dsinClaim() {
  let m = 0;
  for (let i = -500; i <= 500; i++) { const v = i * 0.01, e = Math.abs(CM.dsin(v) - Math.sin(v)); if (e > m) m = e; }
  return { ok: m < 1e-6, detail: "max |dsin−sin| " + m.toExponential(1) };
}

/* CL-02: what is RENDERED equals what the manifest derives — the checksum at every
   site that prints it ([data-checksum]) equals the one derived here, AND every
   projected fact the page prints (data-m; tools/project-manifest.py wrote the static
   ones from CytherManifest.project, and this reads them back against the same
   function). A page with no checksum site or no projected facts does not pass
   vacuously. DOM read. */
function checkRenderManifest() {
  const recomputed = CM.stateChecksum(CM.normalizeManifest(CM.MANIFEST));
  if (!hasDoc) return { ok: true, detail: recomputed + " (no DOM · derivation only)" };
  const sites = Array.from(document.querySelectorAll("[data-checksum]"));
  const marks = Array.from(document.querySelectorAll("[data-m]"));
  const wrong = marks.filter(el => el.textContent.trim() !== CM.project(el.dataset.m)).map(el => el.dataset.m);
  const checksumOk = sites.length > 0 && sites.every(el => el.textContent.trim() === recomputed);
  const ok = checksumOk && marks.length > 0 && wrong.length === 0;
  return { ok, detail: ok ? recomputed + " printed at " + sites.length + " sites · derived once · " + marks.length + " projected facts equal the manifest"
    : !sites.length ? "no checksum printed on the page" : !checksumOk ? "render ≠ manifest" : !marks.length ? "no projected facts on the page" : wrong.length + " projected fact(s) ≠ manifest: " + wrong.slice(0, 3).join(", ") };
}

/* ================= the registry =================
   `m` is the claim's METHOD — one sentence describing the predicate exactly as
   implemented above. It renders in the row's evidence expansion; if a predicate
   changes, its sentence changes in the same edit. */
const CLAIMS = [
  { id: "CL-01", text: "ZERO EXTERNAL REQUESTS",
    m: "Counts Resource Timing entries whose URL leaves this origin; the claim holds only at exactly zero.",
    run: () => {
    /* same-origin module/manifest fetches are the page's own body; the claim is about leaving the origin */
    const n = (typeof performance !== "undefined" && performance.getEntriesByType) ? performance.getEntriesByType("resource").filter(r => r.name.indexOf(location.origin + "/") !== 0).length : -1;
    return { ok: n === 0, detail: n === 0 ? "0 external requests" : (n < 0 ? "no timing api" : n + " external requests") }; } },
  { id: "CL-02", text: "RENDER ≡ MANIFEST",
    m: "Re-derives the state checksum from the manifest tuple and compares it to every site the page prints it at; then reads every projected fact (data-m — counts and validation figures) back against CytherManifest.project. Any printed fact that is not the manifest's fails it.",
    run: checkRenderManifest },
  { id: "CL-03", text: "PUBLISHED ADMISSION ≡ DERIVATION",
    m: "The async verifier re-runs the published admission — nonce, richness and legibility screens — from the manifest, off the boot path.",
    run: null },   /* set by the page module's async verifier */
  { id: "CL-05", text: "BOUNDARY EMITS NO INVALID PROGRAM",
    m: "Reads the boundary engine's last audit — the seed-02 run at boot, AUDIT 10,000 on request; admitted must be positive and the invalid count exactly zero.",
    run: () => {
    const a = root.CytherInstrument && root.CytherInstrument.lastAudit();
    return a ? { ok: a.inv === 0 && a.adm > 0, detail: a.prop + " proposals · " + a.adm + " admitted · " + a.inv + " invalid" }
             : { ok: false, detail: "not yet run" }; } },
  { id: "CL-06b", text: "MARK DOES NOT FLOOD THE READING LANE",
    m: "Recomputes the canonical mark's text-lane density metric and compares it against the admission cap.",
    run: legibilityClaim },
  { id: "CL-07", text: "DETERMINISTIC ADMISSION CORE",
    m: "Compares dsin to native sine at 1001 points across ±5; the admission core must agree within 1e-6.",
    run: dsinClaim }
];
const CLAIMSTATE = {};
const OPEN = {};                       /* per-claim evidence expansion, survives re-render */
const stamp = () => (typeof performance !== "undefined" && performance.now)
  ? "T+" + (performance.now() / 1000).toFixed(1) + "S" : "T+0.0S";

/* The suite summary is PURE and counts every claim from stored state — never
   only the ones a given recompute touched. That is the property the jsc
   regression (tools/test-claims.js) locks: one claim re-run can never mask a
   standing INVALID elsewhere. */
function summary() {
  let hold = 0, bad = false, pending = 0;
  CLAIMS.forEach(c => {
    const s = CLAIMSTATE[c.id];
    if (!s) { pending++; return; }
    if (s.ok) hold++; else bad = true;
  });
  return { hold, total: CLAIMS.length, bad, pending };
}

function renderClaims() {
  if (!hasDoc) return;
  const el = document.getElementById("claimRows"); if (!el) return;
  el.textContent = "";
  CLAIMS.forEach(c => {
    const s = CLAIMSTATE[c.id];
    const open = !!OPEN[c.id];
    const r = document.createElement("div"); r.className = "m-row" + (open ? " open" : "");
    const k = document.createElement("button"); k.className = "m-k m-kbtn";
    k.textContent = c.id + " · " + c.text;
    k.setAttribute("aria-expanded", String(open));
    k.addEventListener("click", () => { OPEN[c.id] = !OPEN[c.id]; renderClaims(); });
    const v = document.createElement("span");
    if (!s) { v.className = "m-v wait"; v.textContent = "CHECKING"; }
    else if (s.ok) { v.className = "m-v ok"; v.textContent = "● HOLDING · " + s.detail; }
    else { v.className = "m-v bad"; v.textContent = "✕ INVALID · " + s.detail; }
    r.appendChild(k); r.appendChild(v); el.appendChild(r);
    if (open) {
      const e = document.createElement("div"); e.className = "m-evidence";
      const line = (kk, vv) => { const d = document.createElement("div");
        const a = document.createElement("span"); a.className = "e-k"; a.textContent = kk + " — ";
        d.appendChild(a); d.appendChild(document.createTextNode(vv)); return d; };
      e.appendChild(line("METHOD", c.m));
      e.appendChild(line("VALUE", s ? s.detail : "not yet computed"));
      e.appendChild(line("COMPUTED", s ? (s.t || "at load") : "pending" ));
      if (c.run) {
        const b = document.createElement("button"); b.className = "i-btn";
        b.textContent = "RE-RUN THIS CLAIM";
        b.addEventListener("click", () => recomputeOne(c.id));
        e.appendChild(b);
      } else {
        e.appendChild(line("RE-RUN", "computed by the async verifier · RECOMPUTE ALL re-renders its stored result"));
      }
      el.appendChild(e);
    }
  });
  const sm = summary();
  const f = document.getElementById("claimsFooter");
  if (f) f.textContent = "CLAIMS " + sm.hold + "/" + sm.total + " HOLDING" + (sm.bad ? " · INVALID PRESENT" : "");
  document.querySelectorAll("[data-claims-count]").forEach(c => { c.textContent = sm.hold + "/" + sm.total; });
}
function setClaim(id, ok, detail) { CLAIMSTATE[id] = { ok, detail, t: stamp() }; renderClaims(); }
function recomputeClaims() {
  CLAIMS.forEach(c => { if (c.run) { const r = c.run(); CLAIMSTATE[c.id] = { ok: r.ok, detail: r.detail, t: stamp() }; } });
  renderClaims();
}
/* one claim, in isolation — updates only its own stored state */
function recomputeOne(id) {
  const c = CLAIMS.find(x => x.id === id);
  if (!c || !c.run) return;
  const r = c.run();
  CLAIMSTATE[id] = { ok: r.ok, detail: r.detail, t: stamp() };
  renderClaims();
}

/* predicates are reached through the registry (CLAIMS[i].run); checkRenderManifest is
   also the projection verifier's entry (tools/test-projection.js); wcagRatio is the one
   contrast function, shared with the drawing-set predicates */
const API = { CLAIMS, CLAIMSTATE, setClaim, recomputeClaims, recomputeOne, summary, renderClaims, checkRenderManifest, wcagRatio };
root.CytherClaims = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
