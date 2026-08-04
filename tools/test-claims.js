/* tools/test-claims.js — jsc regression for the claims suite summary.
   Locks the property UI-001 introduced per-claim recomputation against:
   re-running ONE claim can never mask a standing INVALID elsewhere, and the
   footer count is always over every stored state, never only the last pass.

   Run: jsc js/manifest.js js/substrate.js js/claims.js tools/test-claims.js
   (the system jsc; all three modules load their pure surface without a DOM).
   Prints PASS lines; throws — nonzero exit — on any failure. */
"use strict";
var C = globalThis.CytherClaims;
var fails = 0;
function ok(cond, name) {
  if (cond) { print("PASS  " + name); }
  else { fails++; print("FAIL  " + name); }
}

/* 1 — every claim holding: 10/10, no bad */
C.CLAIMS.forEach(function (c) { C.setClaim(c.id, true, "test"); });
var s = C.summary();
ok(s.total === 10, "suite has exactly ten claims");
ok(s.hold === 10 && !s.bad && s.pending === 0, "all holding -> 10/10, no invalid");

/* 2 — one claim invalid */
C.setClaim("CL-05", false, "forced invalid");
s = C.summary();
ok(s.hold === 9 && s.bad === true, "one invalid -> 9/10 and INVALID PRESENT");

/* 3 — re-running a DIFFERENT single claim must not mask the invalid */
C.recomputeOne("CL-07");                     /* dsin core — passes for real */
s = C.summary();
ok(C.CLAIMSTATE["CL-07"].ok === true, "re-run claim computed for real");
ok(C.CLAIMSTATE["CL-05"].ok === false, "re-run touched only its own state");
ok(s.hold === 9 && s.bad === true, "single re-run cannot mask a standing INVALID");

/* 4 — recomputeOne on a run-less claim (CL-03, async-verifier-owned) is a no-op */
var before = C.CLAIMSTATE["CL-03"].ok;
C.recomputeOne("CL-03");
ok(C.CLAIMSTATE["CL-03"].ok === before, "run-less claim state untouched by recomputeOne");

/* 5 — the summary never counts a claim twice or forgets a pending one */
delete C.CLAIMSTATE["CL-01"];
s = C.summary();
ok(s.hold === 8 && s.pending === 1 && s.bad === true, "pending claim counted as pending, not holding");

if (fails > 0) throw new Error(fails + " claims-suite regression(s) failed");
print("claims-suite regression: all pass");
