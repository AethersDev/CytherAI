/* ============================================================================
   js/ledger.js  →  window.CytherLedger
   The reader ledger. Owner-erasable, local, in full view of its owner. FNV-chained
   (demonstrative — the production artifact would chain with WebCrypto). Clearing
   starts a new chain whose genesis records the clearing.

   Epistemics: this record SELF-REPORTS — it attests the reading to its owner, not
   to the recipient; anyone can compose the email body. The manifest ledger derives;
   this one testifies. The two are not symmetric and the page never claims they are.
   Transmitted only by the reader's explicit act (Path 2).

   Ported from newC3/synthesis-rev5.html. Receipts-on-prose dropped in v1 (§7.2) —
   it returns with the real claims ledger. Pure record + mailto/diligence logic is
   testable under jsc; render + CTA + dwell wiring is guarded.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;

const ACTS = [];
let conduct = "00000000";
let bootT = 0;
const ACT_LABEL = {
  PAGE_OPENED: "page opened", BOUNDARY_CROSSED: "boundary crossed", MARK_FORKED: "mark forked",
  DWELL_MEASUREMENT: "measurement read", FLOOR_REACHED: "floor reached", CHECKSUM_VERIFIED: "checksum verified",
  STATE_CAPTURED: "state captured", LEDGER_CLEARED: "ledger cleared — new chain", PROPOSER_RUN: "proposer run",
  BOUNDARY_AUDIT: "boundary audited", CLAIMS_RECOMPUTED: "claims recomputed"
};
let hooks = { onRender: () => {}, onCta: () => {} };
function nowT() { return (typeof performance !== "undefined" && performance.now) ? (performance.now() - bootT) / 1000 : 0; }

function recordAct(act, ref) {
  if (ACTS.some(a => a.act === act)) return;   /* once per act type */
  const t = nowT();
  conduct = (CM.fnv(conduct + "|" + act + "|" + (ref || "") + "|" + t.toFixed(0)) >>> 0).toString(16).padStart(8, "0");
  ACTS.push({ t, act, ref });
  hooks.onRender(); hooks.onCta();
}
/* opening the page is recorded but is not diligence; nor is erasing */
function diligenceCount() { return ACTS.filter(a => a.act !== "PAGE_OPENED" && a.act !== "LEDGER_CLEARED").length; }
function mailtoBody() {
  const lines = ACTS.map(a => "t%2B" + a.t.toFixed(0) + "s%20" + a.act + (a.ref ? ("%20" + encodeURIComponent(a.ref)) : "")).join("%0A");
  return "READING%20SELF-REPORT%20" + conduct
    + "%0ASELF-REPORTED%20%E2%80%94%20NOT%20INDEPENDENTLY%20VERIFIABLE%0A" + lines + "%0A%0A";
}
function clear() { ACTS.length = 0; conduct = "00000000"; recordAct("LEDGER_CLEARED"); }   /* erasure is itself recorded */

const API = { recordAct, ACTS, ACT_LABEL, diligenceCount, mailtoBody, clear, conduct: () => conduct };

/* ============================================================================
   DOM wiring — ledger panel, intent-adaptive CTA, dwell sensors. Guarded.
   ============================================================================ */
if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  bootT = (typeof performance !== "undefined" && performance.now) ? performance.now() : 0;

  function renderLedger() {
    const c = $("rlCount"), dg = $("rlDigest"), log = $("rlLog");
    if (c) c.textContent = ACTS.length;
    if (dg) dg.textContent = conduct;
    if (log) log.innerHTML = ACTS.map(a =>
      "t+" + a.t.toFixed(0) + "s <b>" + (ACT_LABEL[a.act] || a.act) + "</b>" + (a.ref ? (" · " + a.ref) : "")).join("<br>");
  }
  /* the receipt attaches only at the diligence threshold — same bar as the note */
  function upgradeCta() {
    const cta = $("featCta"); if (!cta) return;
    const crossed = document.body.classList.contains("crossed");
    const subject = crossed ? "Controlled%20Disclosure%20Request%20NTP-2025-001" : "NDA%20Briefing%20Request";
    const baseNote = crossed ? "NDA · IDENTITY CONFIRMATION · REF NTP-2025-001" : "NDA · IDENTITY CONFIRMATION";
    const note = $("featNote");
    if (diligenceCount() < 3) {
      cta.href = "mailto:nda@cytherai.com?subject=" + subject;
      if (note) note.textContent = baseNote;
      return;
    }
    cta.href = "mailto:nda@cytherai.com?subject=" + subject + "&body=" + mailtoBody();
    if (note) note.textContent = baseNote + " · READING SELF-REPORT ATTACHED";
  }
  hooks.onRender = renderLedger;
  hooks.onCta = upgradeCta;

  function wire() {
    const head = $("rlHead"), body = $("rlBody"), clr = $("rlClear"), vfy = $("rlVerify");
    if (head && body) head.addEventListener("click", () => {
      body.hidden = !body.hidden; head.setAttribute("aria-expanded", String(!body.hidden));
    });
    if (clr) clr.addEventListener("click", clear);
    if (vfy) vfy.addEventListener("click", () => {
      const r = root.CytherClaims.checkRenderManifest();
      root.CytherClaims.setClaim("CL-02", r.ok, r.detail);
      recordAct("CHECKSUM_VERIFIED", r.ok ? ("MATCH " + CM.CHECKSUM) : "MISMATCH — RENDER ≠ MANIFEST");
    });
    /* boundary cross sourced from the existing instrument — no instrument modified */
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(() => { if (document.body.classList.contains("crossed")) recordAct("BOUNDARY_CROSSED", "NTP-2025-001"); })
        .observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
    dwell("measurement", 6000, "DWELL_MEASUREMENT");
    dwell("floor", 1600, "FLOOR_REACHED");
    renderLedger();
  }
  function dwell(id, ms, act) {
    const el = $(id); if (!el || !("IntersectionObserver" in window)) return;
    let timer = null;
    const io = new IntersectionObserver(es => { es.forEach(en => {
      if (en.isIntersecting) { if (!timer) timer = setTimeout(() => { recordAct(act); io.disconnect(); }, ms); }
      else { clearTimeout(timer); timer = null; }
    }); }, { threshold: .35 });
    io.observe(el);
  }

  API.wire = wire;
  API.renderLedger = renderLedger;
  API.upgradeCta = upgradeCta;
}

root.CytherLedger = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
