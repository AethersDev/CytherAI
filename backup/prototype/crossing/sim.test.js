/* prototype/crossing/sim.test.js — the city is the engine's, and nothing else.
   Run: jsc js/manifest.js js/instrument.js prototype/crossing/sim.js prototype/crossing/sim.test.js */
(function () {
"use strict";
const CX = CytherCrossing, CI = CytherInstrument;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; print("FAIL " + m); } };

function city(steps) {
  const w = CX.world(40, 190); let inv = 0;
  for (let i = 0; i < steps; i++) { const o = w.step(); if (!o) break; if (o.ev.e === "inv") inv++; }
  return { w, inv };
}
const a = city(30000), b = city(30000);

ok(a.w.solids.length > 50, "warm start raises a city (" + a.w.solids.length + " solids)");
ok(a.w.solids.length === b.w.solids.length, "same seeds, same count");
ok(a.w.solids.every((s, i) => { const t = b.w.solids[i]; return s.id === t.id && s.plot.x === t.plot.x && s.plot.z === t.plot.z; }), "same seeds, same city in the same order");
ok(a.inv === 0, "the kernel never disagrees with the boundary");
ok(a.w.solids.every(s => { const j = CI.judge(s.toks); return j.ok && j.kernel; }), "every solid is a program judge() admits");
const keys = new Set(a.w.solids.map(s => s.plot.x + "," + s.plot.z));
ok(keys.size === a.w.solids.length, "no two solids share a plot");
ok(a.w.solids.every(s => s.mesh.tri.length > 0 && s.mesh.tri.length % 36 === 0), "every solid has a closed, triangulated mesh");

print(fails ? fails + " failed" : "crossing: all pass");
})();
