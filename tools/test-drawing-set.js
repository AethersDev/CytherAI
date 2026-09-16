/* tools/test-drawing-set.js — the drawing set's object is a fact of the engine.
   FIG. 1 inks the LARGEST program the seed-02 run admits and offers one edge of it
   for adjustment; every position of that edge is a proposal judged by the production
   boundary and kernel. This pins the object, the edge, and the limits the visitor
   finds — the same on every machine — and holds the claims split: without the world,
   CytherClaims registers the six canonical predicates and nothing claiming the world.

   Run: jsc js/manifest.js js/instrument.js js/claims.js js/drawing-set.js tools/test-drawing-set.js
   Prints PASS lines; throws — nonzero exit — on any failure. */
"use strict";
var I = globalThis.CytherInstrument, D = globalThis.CytherDrawingSet, C = globalThis.CytherClaims, fails = 0;
function ok(cond, name) { if (cond) print("PASS  " + name); else { fails++; print("FAIL  " + name); } }
var toks = function (s) { return s.split(" ").map(function (t) { return t === "Z" ? { k: "Z", s: "Z" } : { k: t[0], sg: t[1] === "+" ? 1 : -1, mg: +t.slice(2), s: t }; }); };

/* EVIDENCE: canonical-claims-without-the-world */
ok(!globalThis.CytherSubstrate && C.CLAIMS.map(function (c) { return c.id; }).join(" ") === "CL-01 CL-02 CL-03 CL-05 CL-06b CL-07",
   "without the world, the registry is the six canonical predicates: " + C.CLAIMS.map(function (c) { return c.id; }).join(" "));
ok(C.CLAIMS.every(function (c) { return c.m && c.text; }), "every canonical claim carries its method sentence");
ok(typeof C.wcagRatio === "function" && Math.abs(C.wcagRatio([0, 0, 0], [255, 255, 255]) - 21) < 1e-9, "wcagRatio is the one contrast function: black on white is 21:1");

/* EVIDENCE: the-object-is-the-largest-admission */
var e = I.biEngine(2), best = null, area = -1, n = 0;
for (var i = 0; i < 1500; i++) { var ev = e.step(); if (ev.e === "adm") { n++; var x = D.extent(ev.prog), a = (x.maxx - x.minx) * (x.maxy - x.miny); if (a > area) { area = a; best = { prog: ev.prog, n: n }; } } }
ok(best && best.n === 3 && D.progId(best.prog) === "PRG-446DF7E6" && best.prog.map(function (t) { return t.s; }).join(" ") === "H+1 V+1 H+4 V+1 H−2 V+4 H−3 Z",
   "the seed-02 run's largest admission is program 3, PRG-446DF7E6, 5 × 6 units");
ok(JSON.stringify(D.extent(best.prog)) === '{"minx":6,"maxx":11,"miny":6,"maxy":12}' && area === 30, "its extent is 6..11 × 6..12 (area 30)");
ok(JSON.stringify(D.walk(best.prog)) === "[[6,6],[7,6],[7,7],[11,7],[11,8],[9,8],[9,12],[6,12],[6,6]]", "walk returns its vertices and closes at the origin");
ok(I.judge(best.prog).ok, "the inked object is judged admitted (DS-05's premise)");

/* EVIDENCE: the-adjustable-edge-and-its-limits */
var k = D.pickEdge(best.prog);
ok(k === 2 && best.prog[k].s === "H+4", "the adjustable edge is the longest with explicit neighbours: token 3, H+4");
var verdicts = [];
for (var d = -7; d <= 5; d++) { var t = D.candidateFor(best.prog, k, d); verdicts.push(d + ":" + (t ? (I.judge(t).ok ? "ADMITTED" : I.judge(t).why) : "NO TOKEN")); }
ok(verdicts.join(" ") === "-7:ARG RANGE -6:ARG RANGE -5:ARG RANGE -4:ARG RANGE -3:ADMITTED -2:ADMITTED -1:NO TOKEN 0:ADMITTED 1:NO TOKEN 2:CROSSES 3:CROSSES 4:ARG RANGE 5:ARG RANGE",
   "moving the edge: up to −3 is admitted, beyond it ARG RANGE; down crosses the path at +2, then ARG RANGE — the limits the visitor finds");
ok(D.candidateFor(best.prog, k, -1) === null && D.candidateFor(best.prog, k, 1) === null, "a position that gives a neighbour zero length is not a token of the grammar");
var moved = D.candidateFor(best.prog, k, -3);
ok(moved.map(function (t) { return t.s; }).join(" ") === "H+1 V−2 H+4 V+4 H−2 V+4 H−3 Z" && D.progId(moved) === "PRG-F8FD3FB1" && best.prog[1].s === "V+1",
   "a move changes only the two neighbouring tokens (sign and length) and never the base program");
ok(D.pickEdge(toks("H+1 V−1 H−1 Z")) === 1 && D.pickEdge(toks("H+2 V+2 H−2 V−1 Z")) === 1 && D.pickEdge(toks("H+1 Z")) === null,
   "the smallest admissible program offers its middle token; ties keep the earlier edge; a program too short to close offers none");
if (fails) throw new Error(fails + " drawing-set regression(s) failed");
print("drawing set: all pass");
