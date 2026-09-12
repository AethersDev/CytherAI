/* tools/test-develop.js — the development law under jsc.
   For one manifest state, plate, and raster frame there is exactly one ordered
   development sequence D_0..D_N; D_N is the finished plate; how the steps are
   grouped (frame cadence) never changes any D_k; a different world has a
   different sequence; the terminal step is a batch boundary. The kernel it runs
   on is one object: the deterministic angle agrees with the native one, the
   minimap orbit IS the camera orbit, every deposit lands in the lobes it is
   split across, and the raster frame is the one the promotion decision assumed.

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

/* ---- the kernel is one object (§8.1) ---- */
/* EVIDENCE: deterministic-angle-agrees */
var orbit = CM.dsinOrbit(CM.CANON, 220000), angErr = 0, angMax = 0;
for (var i = 0; i < orbit.length; i += 2) {
  var v = CM.datan2(orbit[i + 1], orbit[i]), e = Math.abs(v - Math.atan2(orbit[i + 1], orbit[i]));
  if (e > angErr) angErr = e; if (Math.abs(v) > angMax) angMax = Math.abs(v);
}
ok(angErr < 1e-10, "datan2 agrees with Math.atan2 over the canonical orbit (max " + angErr.toExponential(1) + " rad)");
ok(angMax <= Math.PI, "datan2 stays within [-pi, pi], so every lobe weight is non-negative");
ok(CM.datan2(0, 0) === 0 && CM.datan2(0, 1) === 0 && CM.datan2(0, -1) === Math.PI
   && CM.datan2(1, 0) === Math.PI / 2 && CM.datan2(-1, 0) === -Math.PI / 2 && CM.datan2(-0.3, 0.7) === -CM.datan2(0.3, 0.7),
   "datan2 is exact on the axes and odd in y");
/* EVIDENCE: one-orbit-minimap-and-camera */
var pts = S.computeOrbit(CM.CANON).pts, oneOrbit = pts.length === orbit.length;
for (var i = 0; oneOrbit && i < pts.length; i++) if (pts[i] !== orbit[i]) oneOrbit = false;
ok(oneOrbit, "the minimap orbit is bit-identical to the camera's dsin orbit — one object, one world");
/* EVIDENCE: lobe-conservation */
var st0 = S.plateState(CM.CANON, 0, cam.ANCH[0], frame);
while (!st0.done) S.developStep(st0, CM.CANON);
var worst = 0, negative = 0, mass = 0;
for (var i = 0; i < st0.total.length; i++) {
  var lobes = st0.c0[i] + st0.c1[i] + st0.c2[i] + st0.c3[i];
  worst = Math.max(worst, Math.abs(lobes - st0.total[i])); mass += lobes;
  if (st0.c0[i] < 0 || st0.c1[i] < 0 || st0.c2[i] < 0 || st0.c3[i] < 0) negative++;
}
ok(worst < 1e-3 && negative === 0, "every deposit is split across two lobes and nothing else: per-cell lobe mass equals density (worst " + worst.toExponential(1) + ")");
ok(Math.abs(mass - st0.dep) < 1, "total lobe mass equals the deposit count (" + st0.dep + ")");
/* EVIDENCE: raster-frame-premises */
var ref = S.frameFor(cam.bounds, 1200, 600), wide = S.frameFor(cam.bounds, 2560, 1440), tiny = S.frameFor(cam.bounds, 200, 100);
ok(ref.sc === 1 && ref.bw === 1200 && ref.bh === 600, "the promotion frame 1200x600 bins at exactly BIN_TGT cells, unscaled");
ok(wide.bw * wide.bh <= S.binTargetFor(2560) && wide.bw * wide.bh > 0.99 * S.binTargetFor(2560), "a large viewport is capped at the bin target, not resolved at full size");
ok(tiny.bw === 320 && tiny.bh === 240, "a tiny viewport keeps the 320x240 raster floor");

/* ---- the fuse is not the terminal condition ----
   PLATE_DEP terminates a plate; PLATE_CAP only bounds abnormal computation. At the
   frames the record names — the legibility sweep's desktop (docs/audit/07), the
   promotion frame, the browser matrix's phone — every plate must reach its target
   with a fifth of its ceiling to spare, or a ladder change has silently made the
   safeguard the picture, as the ×1.44 rescale did to plate 3 until 2026-09-11. */
/* EVIDENCE: target-before-cap */
[[1440, 900], [1200, 600], [390, 844]].forEach(function (wh) {
  var fr = S.frameFor(cam.bounds, wh[0], wh[1]), all = true, report = [];
  for (var i = 0; i < 4; i++) {
    var st = S.plateState(CM.CANON, i, cam.ANCH[i], fr);
    while (!st.done) S.developStep(st, CM.CANON);
    all = all && st.dep >= st.target && st.it <= 0.8 * st.cap;
    report.push("p" + i + " " + (st.it / 1e6).toFixed(1) + "M/" + (st.cap / 1e6) + "M" + (st.dep < st.target ? " FUSED" : ""));
  }
  ok(all, wh.join("x") + ": every plate reaches its target before its fuse, with headroom (" + report.join(" · ") + ")");
});

/* ---- the development server: execution location, never trajectory ----
   The Worker and the inline fallback both run developServer; here it is driven
   under jsc against the direct kernel in lockstep. Every reply names a prefix k;
   the direct state is advanced to that k and its counters must agree, every
   raster the server presents must equal tonemapInto of that same state, byte for
   byte, and the terminal reply carries the checkpoint hash — the name the page
   prints in its development receipt — which must equal stateHash of the direct
   terminal state. Goals and budgets vary so the chunking differs from any cadence above. */
/* EVIDENCE: server-equals-kernel */
function fnvBytes(u8) { var h = 0x811c9dc5; for (var i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h; }
function viaServer(params, i, schedule) {
  var serve = S.developServer(), direct = S.plateState(params, i, cam.ANCH[i], frame);
  var sent = params.slice();
  serve({ type: "plate", gen: 7, params: sent, plate: i, anchor: cam.ANCH[i], frame: frame });
  sent[0] += 1;                                          /* a nudge after open must not reach the job */
  var replies = 0, agree = true, rasters = 0, r = null, n = 0;
  while (!r || !r.done) {
    var g = schedule[n % schedule.length]; n++;
    r = serve({ type: "advance", gen: 7, goal: g.goal(direct.target), budgetMs: g.budgetMs, present: g.present });
    replies++;
    while (direct.k < r.k) S.developStep(direct, params);
    if (r.k !== direct.k || r.dep !== direct.dep || r.it !== direct.it) agree = false;
    if (!r.done && "hash" in r) agree = false;             /* the name is given once, to the terminal state */
    if (r.rgba) { var mine = new Uint8ClampedArray(direct.total.length * 4); S.tonemapInto(direct, mine); rasters++;
      if (r.rgba.length !== mine.length || fnvBytes(r.rgba) !== fnvBytes(mine)) agree = false; }
    if (n > 10000) break;
  }
  var field = S.summarizeField(direct), sameField = r.field && r.field.total.length === field.total.length && r.field.maxT === field.maxT && r.field.expLog === field.expLog;
  var sameHash = r.hash === S.stateHash(direct) && /^[0-9a-f]{8}$/.test(r.hash);
  for (var j = 0; sameField && j < field.total.length; j++) if (r.field.total[j] !== field.total[j]) sameField = false;
  return { agree: agree, replies: replies, rasters: rasters, sameField: sameField, sameHash: sameHash, stale: serve({ type: "advance", gen: 6, goal: Infinity, budgetMs: 1, present: true }) };
}
var eased = [{ goal: T => T * 0.05, budgetMs: 1000, present: true }, { goal: T => T * 0.3, budgetMs: 1000, present: false },
             { goal: T => T * 0.31, budgetMs: 1000, present: true }, { goal: T => Infinity, budgetMs: 2, present: true }];
var s0 = viaServer(CM.CANON, 0, eased), s1 = viaServer(forked, 1, [{ goal: T => Infinity, budgetMs: 3, present: false }]);
ok(s0.agree && s0.replies > 3 && s0.rasters > 1, "plate 0 via the server: every reported prefix is the direct kernel's D_k (k, dep, it agree) and every presented raster is byte-identical (" + s0.replies + " replies, " + s0.rasters + " rasters)");
ok(s0.sameField, "plate 0 via the server: the terminal density summary equals the kernel's");
ok(s0.sameHash && s1.sameHash, "the terminal reply names the checkpoint: its hash equals stateHash of the direct terminal state (plate 0 and forked plate 1)");
/* the receipt's comparison law: the same world in the same frame reproduces the name; a different world does not */
ok(s0.sameHash && viaServer(CM.CANON, 0, eased).sameHash && a0.hashes[a0.hashes.length - 1] !== f0.hashes[f0.hashes.length - 1],
   "two developments of one world and frame print one terminal name; a fork prints another");
ok(s1.agree && s1.replies > 3 && s1.rasters === 1, "forked plate 1 via the server, budget-chunked: same checkpoints; the raster arrives once, at the terminal state");
ok(s0.stale === null && s1.stale === null, "a superseded generation is answered with nothing");

/* ---- the map is a slider over the descent: the camera path and its inverse ----
   EVIDENCE: camera-path-inverse */
(function () {
  var A = cam.ANCH, tol = 0.03 * cam.bounds.span, worst = 0, one = true;
  for (var k = 0; k <= 1000; k++) {
    var p = k / 1000, q = S.pathPoint(p, A), c = S.cameraAt(p, A, 1, 100, 100);
    if (c.cx !== q[0] || c.cy !== q[1]) one = false;                       /* one definition of where the camera looks */
    var e = Math.abs(S.depthFor(A, q[0], q[1], p, tol) - p); if (e > worst) worst = e;
  }
  ok(one, "cameraAt looks where pathPoint says, bit for bit");
  ok(worst <= 2e-3, "round trip p -> pathPoint -> depthFor -> p' from the current depth: worst |p-p'| " + worst.toExponential(1) + " <= 2e-3 over 1001 depths");
  var c0 = S.pathPoint(0.95, A), fromSurface = S.depthFor(A, c0[0], c0[1], 0, tol), fromFloor = S.depthFor(A, c0[0], c0[1], 1, tol);
  var folded = Math.hypot(S.pathPoint(fromSurface, A)[0] - c0[0], S.pathPoint(fromSurface, A)[1] - c0[1]) <= tol;
  ok(folded && fromSurface < 0.2 && fromFloor > 0.8, "the canonical path folds back to its start; the inverse is continuous from the current depth (centre from the surface -> " + fromSurface.toFixed(2) + ", from the floor -> " + fromFloor.toFixed(2) + ")");
  var Z = [[0, 0], [0, 0], [0, 0], [0, 0]], z = S.depthFor(Z, 0.3, 0.3, 0.4, tol);
  ok(isFinite(z) && z >= 0 && z <= 1 && Math.abs(z - 0.4) < 0.01, "a collapsed fork terminates at the current depth, no NaN, no hang");
})();

if (fails > 0) throw new Error(fails + " development-law regression(s) failed");
print("development trajectory law: all pass");
