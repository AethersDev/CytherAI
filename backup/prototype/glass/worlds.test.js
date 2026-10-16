/* prototype/glass/worlds.test.js — the three toy authorities decide what they claim to.
   Run: jsc js/manifest.js prototype/glass/worlds.js prototype/glass/worlds.test.js */
(function () {
"use strict";
const W = CytherWorlds, CM = CytherManifest;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; print("FAIL " + m); } };

/* AWC-OS: exact money, and each verdict for its stated reason */
const a = W.awc(), runs = [];
for (let i = 0; i < 14; i++) runs.push(a.next());
const by = q => runs.find(r => r.prog.name === q);
ok(by("zakat").verdict.v === "EXECUTED" && by("zakat").verdict.result === "SAR 2,200.63", "zakat: (97,325 − 9,300) × 2.5% = SAR 2,200.63, half-up");
ok(by("zakat").verdict.trace[0] === "SAR 20,825.00", "zakat: 85 g × SAR 245 = SAR 20,825.00");
ok(by("deposit").verdict.v === "REFUSED" && /riba/.test(by("deposit").verdict.why), "a fixed-interest deposit is refused by the constitution");
ok(runs[runs.indexOf(by("deposit")) + 1].prog.name === "mudarabah", "a refusal is followed by its compliant alternative");
ok(by("mudarabah").verdict.result === "SAR 1,260.00", "mudarabah: 50,000 × 4.2% × 60% = SAR 1,260.00");
ok(by("runway").verdict.result === "7.4 months", "runway: 84,000 ÷ 11,400 = 7.4 months");
ok(by("takaful").verdict.v === "BLOCKED", "an over-promising takaful is blocked by its own assertion");
const alloc = runs.filter(r => r.prog.name === "allocation");
ok(alloc[0].verdict.v === "BLOCKED" && /103\.00%/.test(alloc[0].verdict.why) && alloc[1].verdict.v === "EXECUTED", "weights must sum to 100%");
ok(runs.every(r => r.lines.length === r.prog.steps.length), "every step is printed as the program the engine runs");

/* ADII: the proposer never decides — the gates do */
const d = W.adii(5), cases = [];
for (let i = 0; i < 24; i++) cases.push(d.investigate());
const expect = { decimal: "FIX", surge: "LEAVE", duplicate: "FIX", gap: "ESCALATE", naive: "ESCALATE", large: "ESCALATE" };
ok(cases.every(c => c.v === expect[c.kase]), "each case reaches its verdict: " + cases.map(c => c.kase + "→" + c.v).filter((x, i) => cases[i].v !== expect[cases[i].kase]).join(", "));
ok(cases.filter(c => c.kase === "naive").every(c => c.gates[0].ok && !c.gates[1].ok), "a plausible fix that does not hold is stopped by the second gate");
ok(cases.filter(c => c.kase === "large").every(c => !c.gates[0].ok && c.gates.length === 1), "a change beyond authority never reaches the second gate");
ok(cases.filter(c => c.v !== "ESCALATE").every(c => d.holds(c.cell).ok), "every fixed or left value holds");
ok(cases.filter(c => c.v === "ESCALATE").every(c => c.cell.total === c.injected), "an escalated value is left exactly as found");
ok(new Set(cases.map(c => c.cell)).size === cases.length, "a cell under review is never picked twice");

/* SijilOS: append-only, chained, and the state is the fold of the log */
const s = W.sijil(9), out = [];
for (let i = 0; i < 400; i++) out.push(s.propose());
let h = CM.fnv("sijil:genesis"), rev = 0, vat = 0;
const chain = s.log.every((e, i) => { h = CM.fnv(W.hex(h) + "|" + e.body); rev += e.net; vat += e.vat; return e.n === i && e.hash === W.hex(h) && e.revenue === rev && e.vatDue === vat; });
ok(chain, "the chain re-derives from the log, and every state is the fold of the events before it");
const why = new Set(out.filter(o => !o.ok).map(o => o.why.replace(/[\d,.]+|INV-\d+|SAR/g, "").trim()));
ok(out.some(o => !o.ok && /append-only/.test(o.why)) && out.some(o => o.ok && o.event.kind === "CORRECTION"), "an edit is refused and arrives as a correction");
ok(out.some(o => !o.ok && /VAT/.test(o.why)) && out.some(o => !o.ok && /exceeds/.test(o.why)) && out.some(o => !o.ok && /already recorded/.test(o.why)), "wrong VAT, over-refund and a duplicate invoice are refused (" + why.size + " reasons)");
ok(s.log.length > 250, "most intents are appended (" + s.log.length + " of 400)");

/* a reader's choices reach the same authorities */
ok(W.run(W.PROGRAMS.takaful).v === "BLOCKED" && W.run(W.PROGRAMS.deposit).v === "REFUSED" && W.run(W.PROGRAMS.zakat).result === "SAR 2,200.63", "a chosen program meets the same engine");
ok(W.line(W.PROGRAMS.zakat.steps[4]) === "assert base ≥ nisab", "a step prints as the engine runs it");
const d2 = W.adii(5);
ok(d2.CASES.every(kind => d2.investigate(kind).v === expect[kind]), "a chosen case reaches its verdict");
const s2 = W.sijil(9); for (let i = 0; i < 20; i++) s2.propose();
const e1 = s2.propose(s2.make("edit")), c1 = s2.propose();
ok(!e1.ok && c1.ok && c1.event.kind === "CORRECTION" && c1.event.ref === e1.it.ref, "an edit is refused and its correction is the next event");
ok(!s2.propose(s2.make("badvat")).ok && !s2.propose(s2.make("overrefund")).ok && !s2.propose(s2.make("duplicate")).ok && s2.propose(s2.make("sale")).ok, "chosen intents meet the same rules");

print(fails ? fails + " failed" : "worlds: all pass");
})();
