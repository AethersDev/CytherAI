/* tools/test-boundary.js — the boundary engine is one object, and its stream is a law.
   Same seed, same stream, same admissions — on every machine: the seed-02 audit the
   homepage boots with, pinned event by event. Every event names the position it was
   judged from, so a consumer can redraw the run without reaching into the state; the
   audit() the claims consume equals the streamed engine; the kernel never disagrees
   with the boundary (INVALID EMITTED 0).

   Run: jsc js/manifest.js js/instrument.js tools/test-boundary.js
   Prints PASS lines; throws — nonzero exit — on any failure. */
"use strict";
var I = globalThis.CytherInstrument, fails = 0;
function ok(cond, name) { if (cond) print("PASS  " + name); else { fails++; print("FAIL  " + name); } }
/* EVIDENCE: boundary-stream-is-a-law */
var e = I.biEngine(2), pos = { x: 6, y: 6 }, positioned = true, why = {}, admitted = [];
for (var i = 0; i < 1500; i++) {
  var ev = e.step();
  if (!ev.from || ev.from.x !== pos.x || ev.from.y !== pos.y) positioned = false;   /* judged from where the program stood */
  if (ev.e === "rej") { why[ev.why] = (why[ev.why] || 0) + 1; if (ev.discarded) pos = { x: 6, y: 6 }; }
  else if (ev.e === "ok") { pos = { x: ev.to.x, y: ev.to.y }; if (ev.toks[ev.toks.length - 1] !== ev.tk) positioned = false; }
  else { admitted.push(ev.prog.map(function (t) { return t.s; }).join("")); pos = { x: 6, y: 6 }; }
}
var st = e.st;
ok(st.prop === 1500 && st.rej === 1209 && st.disc === 27 && st.adm === 7 && st.inv === 0,
   "seed 02, 1,500 proposals: 1,209 refused · 27 discarded · 7 admitted · 0 invalid emitted (" + JSON.stringify(st) + ")");
ok(why["AXIS ORDER"] === 566 && why["ARG RANGE"] === 200 && why["GRAMMAR"] === 167 && why["CLOSURE"] === 124 && why["CROSSES"] === 74 && why["BOUNDS"] === 59 && why["CLOSING CROSS"] === 12 && why["CLOSURE AXIS"] === 7,
   "refusals by class are the same on every machine: " + JSON.stringify(why));
ok(positioned, "every event names the position it was judged from, and an admitted token extends the program it names");
var a = I.audit(1500, 2);
ok(a.prop === st.prop && a.rej === st.rej && a.disc === st.disc && a.adm === st.adm && a.inv === st.inv, "audit() is the streamed engine: identical counts");
ok(admitted.length === 7 && new Set(admitted).size === admitted.length && admitted.every(function (p) { return p.slice(-1) === "Z"; }),
   "seven distinct admitted programs, every one closed");
/* EVIDENCE: judge-is-the-boundary — a proposed program meets the same boundary and kernel the stream meets */
var progs = [], g = I.biEngine(2); for (var k = 0; k < 1500; k++) { var gv = g.step(); if (gv.e === "adm") progs.push(gv.prog); }
ok(progs.length === 7 && progs.every(function (p) { var j = I.judge(p); return j.ok && j.kernel && j.at === p.length - 1; }),
   "judge admits every program the stream admitted, at its closing token, with the kernel's agreement");
var H = function (m) { return { k: "H", sg: 1, mg: m, s: "H+" + m }; }, V = function (m) { return { k: "V", sg: 1, mg: m, s: "V+" + m }; }, Vn = function (m) { return { k: "V", sg: -1, mg: m, s: "V−" + m }; }, Hn = function (m) { return { k: "H", sg: -1, mg: m, s: "H−" + m }; }, Z = { k: "Z", s: "Z" };
var good = [H(2), V(2), Hn(2), Z], j0 = I.judge(good);
ok(j0.ok && j0.kernel, "a square proposed by hand is admitted: H+2 V+2 H−2 Z");
ok(I.judge([H(5), V(2), Hn(5), Z]).why === "ARG RANGE" && I.judge([H(5), V(2), Hn(5), Z]).at === 0, "ARG RANGE is named at the token that exceeds 4");
ok(I.judge([H(2), H(2), V(2), Z]).why === "AXIS ORDER" && I.judge([H(2), H(2), V(2), Z]).at === 1, "AXIS ORDER is named at the second consecutive H");
ok(I.judge([H(4), V(4), Hn(3), Vn(4), H(2), V(2), Z]).why === "CROSSES", "a self-intersecting proposal is refused as CROSSES where it crosses");
ok(I.judge([H(2), V(2)]).why === "CLOSURE" && I.judge([H(2), V(2)]).at === 2, "an unclosed proposal is refused as CLOSURE after its last token");
ok(I.judge([H(4), Vn(4), H(4), Z]).why === "BOUNDS" && I.judge([H(4), Vn(4), H(4), Z]).at === 2, "BOUNDS is named at the token that leaves the grid");
var f = I.biEngine(1); for (var j = 0; j < 4000; j++) f.step();
ok(f.st.inv === 0 && f.st.adm > 0, "seed 01 (the RUN PROPOSER stream), 4,000 proposals: admitted " + f.st.adm + ", invalid emitted 0");
if (fails) throw new Error(fails + " boundary regression(s) failed");
print("boundary engine: all pass");
