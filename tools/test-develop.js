/* tools/test-develop.js — the development law under jsc.
   For one manifest state, plate, and raster frame there is exactly one ordered
   development sequence D_0..D_N; D_N is the finished plate; how the steps are
   grouped (frame cadence) never changes any D_k; a different world has a
   different sequence; the terminal step is a batch boundary.

   Run: jsc js/manifest.js js/substrate.js tools/test-develop.js
   Prints PASS lines; throws — nonzero exit — on any failure. */
"use strict";
var S = globalThis.CytherSubstrate, CM = globalThis.CytherManifest;
var fails = 0;
function ok(cond, name) {
  if (cond) { print("PASS  " + name); }
  else { fails++; print("FAIL  " + name); }
}
var cam = S.deriveAnchors(CM.CANON), frame = S.frameFor(cam.bounds, 1280, 720);
/* every checkpoint hash, developing `chunk` steps per call — the cadence */
function trajectory(params, i, chunk) {
  var st = S.plateState(params, i, cam.ANCH[i], frame), hashes = [];
  while (!st.done) {
    for (var c = 0; c < chunk && !st.done; c++) { S.developStep(st, params); hashes.push(S.stateHash(st)); }
  }
  return { hashes: hashes, dep: st.dep, it: st.it, k: st.k, target: st.target, cap: st.cap };
}
function same(a, b) { return a.length === b.length && a.every(function (h, j) { return h === b[j]; }); }

/* EVIDENCE: one-trajectory-per-world */
var a0 = trajectory(CM.CANON, 0, 1), b0 = trajectory(CM.CANON, 0, 1);
ok(same(a0.hashes, b0.hashes), "plate 0: same world -> same ordered checkpoints (" + a0.k + " steps)");
ok(a0.dep >= a0.target || a0.it >= a0.cap, "plate 0: terminal state meets the deposit target or the cap");
ok(a0.it % S.DEV_BATCH === 0 || a0.it === a0.cap, "plate 0: terminal step is a batch boundary");
var c0 = trajectory(CM.CANON, 0, 7);
ok(same(a0.hashes, c0.hashes), "plate 0: grouping steps 7 per call changes no checkpoint (cadence is not an authority)");

/* a fork is a different world: its sequence differs from the first step */
var forked = CM.CANON.slice(); forked[0] += 0.0336;                 /* one 24px keyboard nudge */
var f0 = trajectory(forked, 0, 1), g0 = trajectory(forked, 0, 1);
ok(same(f0.hashes, g0.hashes), "plate 0: same fork -> same sequence");
ok(f0.hashes[0] !== a0.hashes[0] && f0.hashes[f0.hashes.length - 1] !== a0.hashes[a0.hashes.length - 1],
   "plate 0: a changed fork changes the sequence from its first step and its terminal state");

/* the mid plate, same law */
var a1 = trajectory(CM.CANON, 1, 1), b1 = trajectory(CM.CANON, 1, 3);
ok(same(a1.hashes, b1.hashes), "plate 1: same world, different cadence -> same checkpoints (" + a1.k + " steps)");
ok(a1.it % S.DEV_BATCH === 0 || a1.it === a1.cap, "plate 1: terminal step is a batch boundary");

if (fails > 0) throw new Error(fails + " development-law regression(s) failed");
print("development trajectory law: all pass");
