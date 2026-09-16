/* tools/test-ledger.js — jsc regression for the reader-ledger pure surface.

   Run:
     jsc js/manifest.js js/ledger.js tools/test-ledger.js

   DOM behavior is covered by the browser matrix. This file locks the state and
   transmission semantics that must remain testable without a browser. */

"use strict";

const L = CytherLedger;
let fails = 0;

function ok(condition, label) {
  if (condition) print("PASS  " + label);
  else { print("FAIL  " + label); fails++; }
}

ok(L.ACTS.length === 0 && L.diligenceCount() === 0,
  "ledger starts empty with zero diligence");

L.recordAct("PAGE_OPENED");
L.recordAct("PAGE_OPENED");
ok(L.ACTS.length === 1 && L.diligenceCount() === 0,
  "page-open is de-duplicated and never counts as diligence");

L.recordAct("BOUNDARY_CROSSED", "NTP-2025-001");
L.recordAct("STATE_CAPTURED");
L.recordAct("CHECKSUM_VERIFIED", "MATCH " + CytherManifest.CHECKSUM);
ok(L.ACTS.length === 4 && L.diligenceCount() === 3,
  "three substantive act types reach the attachment threshold");

const body = decodeURIComponent(L.mailtoBody());
/* EVIDENCE: ledger-selfreport-prefix */
ok(body.indexOf("READING SELF-REPORT") === 0,
  "mailto payload declares itself a reading self-report");
/* EVIDENCE: ledger-authority-not-elevated */
ok(body.indexOf("NOT INDEPENDENTLY VERIFIABLE") !== -1,
  "mailto payload carries the epistemic limitation");
ok(body.indexOf("NTP-2025-001") !== -1 && body.indexOf(CytherManifest.CHECKSUM) !== -1,
  "mailto payload includes recorded references");

const beforeClear = L.conduct();
L.clear();
ok(L.ACTS.length === 1 && L.ACTS[0].act === "LEDGER_CLEARED",
  "clear erases prior acts and starts a new explicit chain");
ok(L.diligenceCount() === 0,
  "erasure does not count as diligence");
ok(L.conduct() !== "00000000" && L.conduct() !== beforeClear,
  "new chain receives a fresh demonstrative digest");

if (fails > 0) throw new Error(fails + " ledger regression(s) failed");
print("ledger regression: all pass");
