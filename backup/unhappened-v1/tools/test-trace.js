/* tools/test-trace.js — TRACE-1 pins.
   $JSC js/manifest.js js/instrument.js js/trace.js tools/test-trace.js */
(function () {
"use strict";
const T = CytherTrace, CI = CytherInstrument;
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; print("FAIL " + m); } };

/* the encoding, pinned by hand */
ok(T.code("ARG RANGE", 0, 0x02F320C9, false) === 5 + 64 * 9, "ARG RANGE, nothing accepted, h mod 64 = 9");
ok(T.code("KERNEL", 9, 63, true) === 8 + 16 * 3 + 64 * 63 + 4096, "KERNEL, deep, discarded");

/* a reason the boundary does not have cannot be drawn */
let threw = false; try { T.code("TASTE", 0, 0, false); } catch (e) { threw = true; }
ok(threw, "an unknown reason is refused, not drawn as another");

/* every reason the engine emits is drawable (KERNEL is pinned above: the kernel refused nothing in this run) */
const seen = new Set();
for (const seed of [2, 3, 7]) {
  const e = CI.biEngine(seed); let acc = 0;
  for (let i = 0; i < 20000; i++) {
    const ev = e.step();
    if (ev.e === "ok") acc = ev.toks.length;
    else if (ev.e === "rej") { seen.add(ev.why); T.code(ev.why, acc, i, ev.discarded); if (ev.discarded) acc = 0; }
    else { if (ev.e === "inv") { seen.add("KERNEL"); T.code("KERNEL", acc, i, false); } acc = 0; }
  }
}
ok(seen.size >= 8, "the eight boundary relations are met: " + [...seen].join(", "));

/* the drawing is the receipt: rings × breaks arcs, a spoke iff an operation was refused, a dot iff abandoned */
const arcs = s => (s.match(/A[\d.-]/g) || []).length, spoke = s => /L[\d.-]/.test(s), dot = s => /<circle/.test(s);
const cross = T.svg(T.code("CROSSES", 6, 5, false));           /* r 7: 4 breaks · depth class 2: 3 rings */
ok(arcs(cross) === 12 && spoke(cross) && !dot(cross), "CROSSES: 12 arcs, a spoke, no dot");
const kern = T.svg(T.code("KERNEL", 0, 5, true));              /* unbroken ring (2 half-arcs), no spoke, abandoned */
ok(arcs(kern) === 2 && !spoke(kern) && dot(kern), "KERNEL: one unbroken ring, no spoke, a dot");
const clos = T.svg(T.code("CLOSURE", 3, 77, false));           /* r 1: 2 breaks · depth class 1: 2 rings */
ok(arcs(clos) === 4 && !spoke(clos) && clos === T.svg(T.code("CLOSURE", 3, 77, false)), "CLOSURE: 4 arcs, deterministic");
ok(T.VERSION === "TRACE-1" && T.GLSL.indexOf("float sig(vec2 q, float code, float grow, float px)") >= 0
   && T.GLSL.indexOf("float sig(vec2 q, float code, float grow){ return sig(q, code, grow, 0.); }") >= 0, "version; the GLSL renderer, with and without a pixel floor");

print(fails ? fails + " of " + n + " TRACE-1 checks failed" : "TRACE-1: " + n + " checks pass");
if (fails) throw new Error("trace.test");
})();
