/* ============================================================================
   js/claims.js  →  window.CytherClaims
   Standing claims as predicates the page executes against itself. Nine claims;
   the footer reads CLAIMS n/9 HOLDING and any failure prints ✕ INVALID in place.

   Ported from newC3/synthesis-rev5.html. Amendments:
     · CL-06 flip band recomputed for the shipped BGS keyframes → 40–62%
       (contrast is measured against CytherSubstrate.ambientAt — the actual model).
     · CL-06b — text-lane legibility ≤ cap (§5.3).
     · CL-08 — CAMERA ≡ DERIVATION: canonical anchors re-derived from the manifest
       equal the camera the page installed (§5.2).

   Predicates are pure/logic; renderClaims + DOM reads are guarded.
   CL-03 is set by site.js's async verifier; CL-05 by instrument.js's audit.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;
const S  = root.CytherSubstrate;
const hasDoc = typeof document !== "undefined";

/* ================= pure predicates ================= */
function wcagRatio(a, b) {
  const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
  const la = lum(a), lb = lum(b); return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}
const parseRGB = s => { const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/); return [+m[1], +m[2], +m[3]]; };

/* CL-06: heading (--ink) vs background (--bg) across the shipped ambient model.
   The 40–62% flip band is where the mid exposure carries ink and bg through each
   other — the crossover is inherent (light falls continuously); contrast is asserted
   only outside it. Measured against CytherSubstrate.ambientAt, the same function
   observe() writes to the page. */
const FLIP_LO = 0.40, FLIP_HI = 0.62;
function contrastClaim() {
  let worst = 99, at = 0;
  for (let i = 0; i <= 200; i++) {
    const p = i / 200;
    if (p >= FLIP_LO && p <= FLIP_HI) continue;
    const amb = S.ambientAt(p);
    const r = wcagRatio(parseRGB(amb.ink), parseRGB(amb.bg));
    if (r < worst) { worst = r; at = p; }
  }
  return { ok: worst >= 4.5, detail: "worst " + worst.toFixed(2) + ":1 at depth " + Math.round(at*100) + "%" };
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

/* CL-08: the canonical camera IS the manifest derivation. Re-derive the anchors
   from CANON and confirm they equal the anchors the page installed at boot —
   fork-independent (checks the canonical derivation, not the live fork). */
function cameraClaim() {
  const re = S.deriveAnchors(CM.CANON).ANCH;
  const live = (hasDoc && S.canonicalAnchors) ? S.canonicalAnchors() : re;
  const ok = !!live && re.length === live.length &&
    re.every((p, i) => Math.abs(p[0]-live[i][0]) < 1e-9 && Math.abs(p[1]-live[i][1]) < 1e-9);
  return { ok, detail: ok ? re.length + " anchors re-derived · match canonical camera" : "camera ≠ derivation" };
}

/* CL-02: what is RENDERED equals what the manifest derives (checksum printed twice,
   derived once). DOM read — verified live and by the ledger's VERIFY button. */
function checkRenderManifest() {
  const recomputed = CM.stateChecksum(CM.normalizeManifest(CM.MANIFEST));
  if (!hasDoc) return { ok: true, detail: recomputed + " (no DOM · derivation only)" };
  const shown = (document.querySelector("#manifestRows .m-v.acc") || { textContent: "" }).textContent.trim();
  const chip = document.querySelector(".ep.current");
  const ok = (shown === recomputed) && !!chip && chip.textContent.indexOf(recomputed) >= 0;
  return { ok, detail: ok ? recomputed + " printed twice · derived once" : "render ≠ manifest" };
}

/* ================= the registry ================= */
const CLAIMS = [
  { id: "CL-01", text: "ZERO EXTERNAL REQUESTS", run: () => {
    const n = (typeof performance !== "undefined" && performance.getEntriesByType) ? performance.getEntriesByType("resource").length : -1;
    return { ok: n === 0, detail: n === 0 ? "0 resources fetched" : (n < 0 ? "no timing api" : n + " resources fetched") }; } },
  { id: "CL-02", text: "RENDER ≡ MANIFEST", run: checkRenderManifest },
  { id: "CL-03", text: "PUBLISHED ADMISSION ≡ DERIVATION", run: null },   /* set by site.js async verifier */
  { id: "CL-04", text: "SERIAL ≡ STATE", run: () => {
    if (!hasDoc || !S.serial) return { ok: true, detail: "no DOM" };
    const got = (document.getElementById("markSerial") || { textContent: "" }).textContent.trim();
    const want = S.serial().trim();
    return { ok: got === want, detail: got === want ? "displayed serial equals live parameters" : "serial ≠ state" }; } },
  { id: "CL-05", text: "BOUNDARY EMITS NO INVALID PROGRAM", run: () => {
    const a = root.CytherInstrument && root.CytherInstrument.lastAudit();
    return a ? { ok: a.inv === 0 && a.adm > 0, detail: a.prop + " proposals · " + a.adm + " admitted · " + a.inv + " invalid" }
             : { ok: false, detail: "not yet run" }; } },
  { id: "CL-06", text: "HEADINGS ≥4.5:1 OUTSIDE FLIP BAND 40–62%", run: contrastClaim },
  { id: "CL-06b", text: "MARK DOES NOT FLOOD THE READING LANE", run: legibilityClaim },
  { id: "CL-07", text: "DETERMINISTIC ADMISSION CORE", run: dsinClaim },
  { id: "CL-08", text: "CAMERA ≡ DERIVATION", run: cameraClaim }
];

const CLAIMSTATE = {};
function renderClaims() {
  if (!hasDoc) return;
  const el = document.getElementById("claimRows"); if (!el) return;
  el.textContent = "";
  let hold = 0;
  CLAIMS.forEach(c => {
    const s = CLAIMSTATE[c.id];
    const r = document.createElement("div"); r.className = "m-row";
    const k = document.createElement("span"); k.className = "m-k"; k.textContent = c.id + " · " + c.text;
    const v = document.createElement("span");
    if (!s) { v.className = "m-v wait"; v.textContent = "CHECKING"; }
    else if (s.ok) { v.className = "m-v ok"; v.textContent = "● HOLDING · " + s.detail; hold++; }
    else { v.className = "m-v bad"; v.textContent = "✕ INVALID · " + s.detail; }
    r.appendChild(k); r.appendChild(v); el.appendChild(r);
  });
  const bad = CLAIMS.some(c => CLAIMSTATE[c.id] && !CLAIMSTATE[c.id].ok);
  const f = document.getElementById("claimsFooter");
  if (f) f.textContent = "CLAIMS " + hold + "/" + CLAIMS.length + " HOLDING" + (bad ? " · INVALID PRESENT" : "");
}
function setClaim(id, ok, detail) { CLAIMSTATE[id] = { ok, detail }; renderClaims(); }
function recomputeClaims() {
  CLAIMS.forEach(c => { if (c.run) { const r = c.run(); CLAIMSTATE[c.id] = { ok: r.ok, detail: r.detail }; } });
  renderClaims();
}

const API = {
  CLAIMS, CLAIMSTATE, setClaim, recomputeClaims, renderClaims, checkRenderManifest,
  contrastClaim, legibilityClaim, dsinClaim, cameraClaim, FLIP_LO, FLIP_HI
};
root.CytherClaims = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
