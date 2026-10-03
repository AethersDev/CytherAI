/* ============================================================================
   prototype/glass/worlds.js  →  window.CytherWorlds
   Three of the four systems on the glass, as small deterministic worlds — pure,
   DOM-free, loads under jsc. Each is its system's architecture at toy scale: a
   proposer standing in for the model, and outside it the deterministic authority
   that decides. The authorities are real code; the data and the proposers are
   toys written for this page. They illustrate ADII, AWC-OS and SijilOS — they are
   not those systems and measure nothing about them. CytherCAD is not here: it is
   the boundary engine of the record itself (prototype/crossing/sim.js).
   Money is integer halalas throughout (SAR 1 = 100); rounding is half-up.
   ============================================================================ */
(function (root) {
"use strict";
const CM = root.CytherManifest;

const lcg = seed => { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) >>> 8; };
const rq = (a, n, d) => Math.sign(a * n * d) * Math.floor((2 * Math.abs(a * n) + Math.abs(d)) / (2 * Math.abs(d)));
const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const money = h => (h < 0 ? "−" : "") + "SAR " + group(Math.floor(Math.abs(h) / 100)) + "." + String(Math.abs(h) % 100).padStart(2, "0");
const pct = bp => (bp / 100).toFixed(2) + "%";
const sum = a => a.reduce((s, x) => s + x, 0);
const hex = h => (h >>> 0).toString(16).padStart(8, "0").toUpperCase();

/* ================= AWC-OS — the model writes a program; an engine decides ================= */
const N = (v, u) => ({ k: "n", v, u }), Rf = name => ({ k: "r", name });
const add = (...a) => ({ k: "add", a }), sub = (a, b) => ({ k: "sub", a: [a, b] }), mul = (a, b) => ({ k: "mul", a: [a, b] });
const pc = (a, bp) => ({ k: "pct", a, bp }), div = (a, b) => ({ k: "div", a: [a, b] });

function ev(e, env) {
  if (e.k === "n") return e.v;
  if (e.k === "r") return env[e.name];
  if (e.k === "add") return e.a.reduce((s, x) => s + ev(x, env), 0);
  if (e.k === "sub") return ev(e.a[0], env) - ev(e.a[1], env);
  if (e.k === "mul") return ev(e.a[0], env) * ev(e.a[1], env);
  if (e.k === "pct") return rq(ev(e.a, env), e.bp, 10000);
  return rq(ev(e.a[0], env), 10, ev(e.a[1], env));            /* div: tenths */
}
const lit = e => e.u === "SAR" ? money(e.v).replace(".00", "") : e.u === "%" ? pct(e.v) : e.u === "g" ? e.v + " g" : group(e.v);
const show = e => e.k === "n" ? lit(e) : e.k === "r" ? e.name : e.k === "add" ? e.a.map(show).join(" + ")
  : e.k === "sub" ? show(e.a[0]) + " − " + show(e.a[1]) : e.k === "mul" ? show(e.a[0]) + " × " + show(e.a[1])
  : e.k === "pct" ? show(e.a) + " × " + pct(e.bp) : show(e.a[0]) + " ÷ " + show(e.a[1]);
const value = (v, u) => u === "SAR" ? money(v) : u === "%" ? pct(v) : u === "mo" ? (v / 10).toFixed(1) + " months" : group(v);

/* the constitution: a policy layer the program cannot argue with */
const CONSTITUTION = {
  NO_RIBA: inst => inst.kind !== "fixed-interest" || "a fixed return on a loan is riba",
};
function line(s) {
  if (s.op === "let") return "let " + s.name + " = " + show(s.e);
  if (s.op === "require") return "require halal(" + s.inst.label + ")";
  if (s.op === "assert") return "assert " + show(s.a) + " " + { ">=": "≥", "<=": "≤", "==": "=" }[s.cmp] + " " + show(s.b);
  return "emit " + s.name;
}
function run(prog) {
  const env = {}, units = {}, trace = [];
  for (let i = 0; i < prog.steps.length; i++) {
    const s = prog.steps[i];
    if (s.op === "let") { env[s.name] = ev(s.e, env); units[s.name] = s.unit; trace.push(value(env[s.name], s.unit)); continue; }
    if (s.op === "require") { const r = CONSTITUTION[s.pred](s.inst); if (r !== true) return { v: "REFUSED", at: i, why: r, trace }; trace.push("✓"); continue; }
    if (s.op === "assert") {
      const a = ev(s.a, env), b = ev(s.b, env), ok = s.cmp === ">=" ? a >= b : s.cmp === "<=" ? a <= b : a === b;
      const u = s.a.k === "r" ? units[s.a.name] : s.a.u;
      if (!ok) return { v: "BLOCKED", at: i, why: show(s.a) + " is " + value(a, u) + ", not " + { ">=": "≥", "<=": "≤", "==": "=" }[s.cmp] + " " + value(b, u), trace };
      trace.push("✓"); continue;
    }
    return { v: "EXECUTED", at: i, result: value(env[s.name], units[s.name]), trace };
  }
  return { v: "BLOCKED", at: prog.steps.length, why: "no result was emitted", trace };
}

const L = (name, e, unit) => ({ op: "let", name, e, unit });
function zakat(cash, grams, price, recv, debts) {
  return { q: "How much zakat do I owe?", name: "zakat", steps: [
    L("gold", mul(N(grams, "g"), N(price, "SAR")), "SAR"),
    L("assets", add(N(cash, "SAR"), Rf("gold"), N(recv, "SAR")), "SAR"),
    L("base", sub(Rf("assets"), N(debts, "SAR")), "SAR"),
    L("nisab", mul(N(85, "g"), N(price, "SAR")), "SAR"),
    { op: "assert", a: Rf("base"), cmp: ">=", b: Rf("nisab") },
    L("zakat", pc(Rf("base"), 250), "SAR"),
    { op: "emit", name: "zakat" }] };
}
const DEPOSIT = { q: "Put SAR 50,000 in a 5% fixed-interest deposit.", name: "deposit", steps: [
  L("principal", N(5000000, "SAR"), "SAR"),
  { op: "require", pred: "NO_RIBA", inst: { kind: "fixed-interest", label: "deposit · fixed 5%" } },
  L("interest", pc(Rf("principal"), 500), "SAR"),
  { op: "emit", name: "interest" }] };
const MUDARABAH = { q: "Alternative: a profit-sharing deposit.", name: "mudarabah", alt: true, steps: [
  L("principal", N(5000000, "SAR"), "SAR"),
  { op: "require", pred: "NO_RIBA", inst: { kind: "mudarabah", label: "mudarabah · profit-sharing 60/40" } },
  L("projected", pc(Rf("principal"), 420), "SAR"),
  L("share", pc(Rf("projected"), 6000), "SAR"),
  { op: "emit", name: "share" }] };
const RUNWAY = { q: "If I lose my job, how long do my savings last?", name: "runway", steps: [
  L("monthly", add(N(450000, "SAR"), N(280000, "SAR"), N(120000, "SAR"), N(290000, "SAR")), "SAR"),
  L("savings", N(8400000, "SAR"), "SAR"),
  { op: "assert", a: Rf("savings"), cmp: ">=", b: N(0, "SAR") },
  L("runway", div(Rf("savings"), Rf("monthly")), "mo"),
  { op: "emit", name: "runway" }] };
const TAKAFUL = { q: "Design a savings takaful that pays every member back double.", name: "takaful", steps: [
  L("contributions", mul(N(800, "x"), N(120000, "SAR")), "SAR"),
  L("pool", add(Rf("contributions"), pc(Rf("contributions"), 300)), "SAR"),
  L("promised", mul(N(800, "x"), N(240000, "SAR")), "SAR"),
  { op: "assert", a: Rf("promised"), cmp: "<=", b: Rf("pool") },
  { op: "emit", name: "promised" }] };
const portfolio = cash => ({ q: "Check my portfolio allocation.", name: "allocation", steps: [
  L("sukuk", N(4500, "%"), "%"), L("equity", N(4000, "%"), "%"), L("cash", N(cash, "%"), "%"),
  L("total", add(Rf("sukuk"), Rf("equity"), Rf("cash")), "%"),
  { op: "assert", a: Rf("total"), cmp: "==", b: N(10000, "%") },
  { op: "emit", name: "total" }] });
const ZAKATS = [[6400000, 85, 24500, 1250000, 930000], [2180000, 120, 24500, 400000, 1500000], [11850000, 40, 24500, 0, 2300000]];

/* the programs a reader can choose, by name (mudarabah is the alternative a refusal offers) */
const PROGRAMS = { zakat: zakat(...ZAKATS[0]), deposit: DEPOSIT, mudarabah: MUDARABAH, runway: RUNWAY, takaful: TAKAFUL, allocation: portfolio(1800) };

/* next() → { prog, lines, verdict }: the programs a model might write, in a fixed
   order; a refusal is followed by the compliant alternative it names */
function awc() {
  let i = 0, alt = null;
  function next() {
    let prog;
    if (alt) { prog = alt; alt = null; }
    else {
      const k = i++ % 6;
      prog = k === 0 ? zakat(...ZAKATS[(i / 6 | 0) % 3]) : k === 1 ? DEPOSIT : k === 2 ? RUNWAY : k === 3 ? TAKAFUL : k === 4 ? portfolio(1800) : portfolio(1500);
    }
    const verdict = run(prog);
    if (verdict.v === "REFUSED") alt = MUDARABAH;
    return { prog, lines: prog.steps.map(line), verdict };
  }
  return { next };
}

/* ================= ADII — a number looks wrong; who may change it? ================= */
const LIMIT = 100000000;                      /* SAR 1,000,000: this investigator's authority */
const ok = why => ({ ok: true, why }), no = why => ({ ok: false, why });
function split(total, next) {                 /* line items that sum exactly to total */
  const n = 3 + next() % 4, out = []; let left = total;
  for (let i = 0; i < n - 1; i++) { const p = Math.floor(left * (0.15 + (next() % 30) / 100)); out.push(p); left -= p; }
  out.push(left); return out;
}
function holds(c) {
  const s = sum(c.items);
  if (c.total !== s) return no("total " + money(c.total) + " ≠ its line items, " + money(s));
  if (c.total !== c.deposit) return no("total ≠ bank deposit " + money(c.deposit));
  return ok("total = its line items = the bank deposit");
}
function allowed(c, p, after) {
  if (p.kind === "leave") return ok("no change proposed");
  if (p.kind === "impute") return no("imputing invents a value — there is no source to restore from");
  const d = Math.abs(after.total - c.total);
  if (d > LIMIT) return no("a change of " + money(d) + " is beyond this investigator's authority");
  return ok(p.kind === "dedupe" ? "removes a batch imported twice" : "restores the value from a source of record");
}
const CASES = ["decimal", "surge", "duplicate", "gap", "naive", "large"];

/* investigate() → one case: the anomaly injected into the live table, what the
   investigator read, what it proposed, what each gate said, and the verdict */
function adii(seed) {
  const ROWS = 6, COLS = 20, next = lcg(seed), cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = 100 * (32000 + Math.round(9000 * CM.dsin(c * 0.5 + r * 1.3)) + next() % 6000 + r * 2200);
    cells.push({ r, c, total: v, items: split(v, next), deposit: v, holiday: false, state: "ok" });
  }
  let k = 0;
  function investigate(kase = CASES[k++ % CASES.length]) {
    let cell; do cell = cells[next() % cells.length]; while (cell.state !== "ok");
    const before = cell.total;
    if (kase === "decimal") cell.total *= 10;
    else if (kase === "large") { cell.total *= 100; }
    else if (kase === "surge") { cell.items = split(Math.round(cell.total * 2.6), next); cell.total = cell.deposit = sum(cell.items); cell.holiday = true; }
    else if (kase === "duplicate") { cell.items = cell.items.concat(cell.items.slice(0, 2)); cell.total = sum(cell.items); }
    else if (kase === "gap") { cell.total = 0; cell.items = []; }
    else { cell.items = cell.items.slice(0, -1); cell.total += 1000000; }
    const injected = cell.total, row = cells.filter(x => x.r === cell.r && x !== cell);
    const read = ["line items sum to " + money(sum(cell.items)), "bank deposit " + money(cell.deposit), "calendar · " + (cell.holiday ? "Eid holiday" : "ordinary day")];
    let p, after = { total: cell.total, items: cell.items, deposit: cell.deposit };
    if (kase === "surge") p = { kind: "leave", to: cell.total, text: "leave it — the sources agree" };
    else if (kase === "duplicate") { const items = cell.items.slice(0, -2); p = { kind: "dedupe", to: sum(items), text: "drop the batch imported twice" }; after = { total: sum(items), items, deposit: cell.deposit }; }
    else if (kase === "gap") { const m = Math.round(sum(row.map(x => x.total)) / row.length); p = { kind: "impute", to: m, text: "fill it with the row average, " + money(m) }; after = { total: m, items: cell.items, deposit: cell.deposit }; }
    else if (kase === "naive") { p = { kind: "correct", to: cell.deposit, text: "set total to the bank deposit, " + money(cell.deposit) }; after = { total: cell.deposit, items: cell.items, deposit: cell.deposit }; }
    else { const s = sum(cell.items); p = { kind: "correct", to: s, text: "set total to its line items, " + money(s) }; after = { total: s, items: cell.items, deposit: cell.deposit }; }
    const gates = [];
    let v;
    if (p.kind === "leave") { const h = holds(cell); gates.push(ok("no change proposed"), h); v = h.ok ? "LEAVE" : "ESCALATE"; }
    else {
      const a = allowed(cell, p, after); gates.push(a);
      if (!a.ok) v = "ESCALATE";
      else { const h = holds(after); gates.push(h); v = h.ok ? "FIX" : "ESCALATE"; }
    }
    if (v === "FIX") Object.assign(cell, after);
    cell.state = v === "ESCALATE" ? "escalated" : v === "LEAVE" ? "verified" : "fixed";
    const flag = kase === "gap" ? "a day with no total" : (injected / median(row.map(x => x.total))).toFixed(1) + "× its row median";
    return { cell, kase, before, injected, flag, read, proposal: p, gates, v, after: cell.total };
  }
  return { cells, ROWS, COLS, CASES, investigate, holds };
}
const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

/* ================= SijilOS — intent over time; history is never edited ================= */
function sijil(seed) {
  const next = lcg(seed), log = [], sales = new Map(), queue = [];
  let head = CM.fnv("sijil:genesis"), inv = 1040, revenue = 0, vat = 0;
  const vatOf = net => rq(net, 15, 100);
  function make(kind) {
    const past = [...sales.keys()], pick = () => past[next() % past.length];
    if (kind === "edit") { const id = pick(), k = log.findIndex(e => e.kind === "SALE" && e.invoice === id); return { kind: "EDIT", ref: k, text: "edit event #" + k + " in place" }; }
    if (kind === "refund" || kind === "overrefund") {
      const id = pick(), s = sales.get(id), left = s.net - s.refunded;
      if (kind === "refund" && left > 0) { const amt = Math.max(100, Math.floor(left * (0.2 + (next() % 50) / 100))); return { kind: "REFUND", invoice: id, net: amt, text: "refund " + money(amt) + " on INV-" + id }; }
      return { kind: "REFUND", invoice: id, net: left + 5000, text: "refund " + money(left + 5000) + " on INV-" + id };
    }
    const net = 2500 + next() % 87500;
    if (kind === "badvat") return { kind: "SALE", invoice: ++inv, net, vat: rq(net, 5, 100), text: "sale INV-" + inv + " · VAT at 5%" };
    if (kind === "duplicate") { const id = pick(); return { kind: "SALE", invoice: id, net, vat: vatOf(net), text: "sale INV-" + id + " again" }; }
    return { kind: "SALE", invoice: ++inv, net, vat: vatOf(net), text: "sale INV-" + inv + " · " + money(net) };
  }
  function intent() {
    if (queue.length) return queue.shift();
    const roll = next() % 100, has = sales.size > 0;
    if (roll < 8 && has) return make("edit");                 /* an assistant tries to edit the past */
    if (roll < 20 && has) return make(roll < 15 ? "refund" : "overrefund");
    if (roll < 27) return make("badvat");
    if (roll < 32 && has) return make("duplicate");
    return make("sale");
  }
  function validate(it) {
    if (it.kind === "EDIT") return no("history is append-only — a correction is a new event");
    if (it.kind === "SALE") {
      if (sales.has(it.invoice)) return no("INV-" + it.invoice + " is already recorded");
      if (it.vat !== vatOf(it.net)) return no("VAT must be 15% of net — " + money(vatOf(it.net)) + ", not " + money(it.vat));
      return ok();
    }
    if (it.kind === "REFUND") { const s = sales.get(it.invoice), left = s.net - s.refunded; return it.net <= left ? ok() : no("refund exceeds the " + money(left) + " left on INV-" + it.invoice); }
    return ok();                                            /* CORRECTION: a new event about an old one */
  }
  function propose(it = intent()) {
    const r = validate(it);
    if (it.kind === "EDIT") queue.push({ kind: "CORRECTION", ref: it.ref, net: -500, invoice: log[it.ref].invoice, text: "correction to event #" + it.ref + " · −SAR 5.00" });
    if (!r.ok) return { it, ok: false, why: r.why };
    const net = it.kind === "REFUND" ? -it.net : it.net, tax = it.kind === "SALE" ? it.vat : vatOf(net);
    if (it.kind === "SALE") sales.set(it.invoice, { net: it.net, refunded: 0 });
    else if (it.kind === "REFUND") sales.get(it.invoice).refunded += it.net;
    else sales.get(it.invoice).net += it.net;
    revenue += net; vat += tax;
    const body = [log.length, it.kind, it.invoice, net, tax, it.ref === undefined ? "" : it.ref].join("|");
    head = CM.fnv(hex(head) + "|" + body);
    const e = { n: log.length, kind: it.kind, invoice: it.invoice, ref: it.ref, net, vat: tax, body, hash: hex(head), revenue, vatDue: vat, text: it.text };
    log.push(e);
    return { it, ok: true, event: e };
  }
  return { log, propose, make, genesis: hex(CM.fnv("sijil:genesis")) };
}

const API = { awc, adii, sijil, money, hex, run, holds, line, PROGRAMS };
root.CytherWorlds = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
