/* ============================================================================
   prototype/research/research.js — the executable figures of the research journal.
   Fig. 1a streams the boundary engine of the record (CytherInstrument.biEngine);
   Figs. 1b–1d put the toy worlds of ../glass/worlds.js in the reader's hands — the
   reader chooses the case, steps through it, and keeps the receipt. Table 2 is the
   canonical claim registry (CytherClaims), run against this page. Nothing advances
   on its own except the stream in 1a, which the reader can pause and step.
   ============================================================================ */
(function () {
"use strict";
if (typeof document === "undefined") return;
const CM = window.CytherManifest, CI = window.CytherInstrument, CW = window.CytherWorlds, CC = window.CytherClaims;
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const INK = "#0B0F19", INK3 = "#5F6879", GREY = "#A3AAB8", RULE = "#E2E5EB", COBALT = "#2036C7", FILL = "#EEF1F8";
const fmt = n => n.toLocaleString("en-US"), M = CW.money, short = h => M(h).replace("SAR ", "");
const ease = x => x * x * (3 - 2 * x), clamp01 = x => Math.max(0, Math.min(1, x));
document.documentElement.classList.remove("no-js");

/* ---------- the page ---------- */
const top = $(".top"); addEventListener("scroll", () => top.classList.toggle("scrolled", scrollY > 8), { passive: true });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
$$(".reveal").forEach(r => io.observe(r));
const T = {}; $$("[data-t]").forEach(e => (T[e.dataset.t] = T[e.dataset.t] || []).push(e));
const put = (k, v) => (T[k] || []).forEach(e => { if (e.textContent !== v) e.textContent = v; });

/* ---------- the seal as ink: the mark, and Plate I ---------- */
function plate(cv, n, css, gain = 1) {
  const dpr = Math.min(devicePixelRatio || 1, 2), S = Math.round(css * dpr), o = CM.dsinOrbit(CM.CANON, n + 1);
  cv.width = cv.height = S;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) { const x = o[i * 2], y = o[i * 2 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const span = Math.max(x1 - x0, y1 - y0), m = .06, acc = new Float32Array(S * S), lobe = new Float32Array(S * S);
  const ox = (span - (x1 - x0)) / 2, oy = (span - (y1 - y0)) / 2;
  for (let i = 0; i < n; i++) {
    const px = ((o[i * 2] - x0 + ox) / span * (1 - 2 * m) + m) * S | 0, py = (1 - ((o[i * 2 + 1] - y0 + oy) / span * (1 - 2 * m) + m)) * S | 0;
    if (px < 0 || py < 0 || px >= S || py >= S) continue;
    const k = py * S + px; acc[k]++; if (o[i * 2 + 2] > .35 * span) lobe[k]++;      /* one lobe, by its next iterate, in cobalt */
  }
  const sorted = Float32Array.from(acc.filter(v => v > 0)).sort(), ref = Math.log1p(sorted[Math.floor(sorted.length * .997)] || 1);
  const ctx = cv.getContext("2d"), img = ctx.createImageData(S, S), d = img.data;
  for (let k = 0; k < S * S; k++) {
    const v = acc[k] ? Math.pow(Math.min(1, Math.log1p(acc[k]) / ref), 1.35) * .92 * gain : 0, t = acc[k] ? lobe[k] / acc[k] * .55 : 0;
    const r = 11 + (32 - 11) * t, g = 15 + (54 - 15) * t, b = 25 + (199 - 25) * t;
    d[k * 4] = 255 + (r - 255) * v; d[k * 4 + 1] = 255 + (g - 255) * v; d[k * 4 + 2] = 255 + (b - 255) * v; d[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
for (const id of ["#mark", "#mark2"]) { const cv = $(id); if (cv) plate(cv, 40000, 26, 1.05); }
const plateCv = $("#plate");
if (plateCv) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => plate(plateCv, 900000, plateCv.clientWidth), 30); } }, { rootMargin: "300px" }).observe(plateCv);

/* ---------- the receipt tray: what the reader decided, kept ---------- */
const tray = $("#tray"), trayList = $("#trayList");
let kept = 0;
function keep(fig, title, verdict, cls, rows) {
  const li = el("li"), d = el("details"), s = el("summary"), dl = el("dl");
  s.append(el("span", "f", fig), el("span", "t", title), el("span", "v " + cls, verdict));
  for (const [k, v] of rows) dl.append(el("dt", "", k), el("dd", "", v));
  d.append(s, dl); li.append(d); trayList.prepend(li);
  while (trayList.children.length > 40) trayList.lastChild.remove();
  $("#trayN").textContent = String(++kept); $("#trayEmpty").hidden = true;
  if (kept === 1) tray.open = true;
}

/* ---------- Fig. 1a — Geometry: the boundary, live ---------- */
const progId = toks => "PRG-" + (CM.fnv(toks.map(t => t.s).join("")) >>> 0).toString(16).padStart(8, "0").toUpperCase();
function walk(toks) { let x = 6, y = 6; const v = [[x, y]]; for (const t of toks) { if (t.k === "Z") break; if (t.k === "H") x += t.sg * t.mg; else y += t.sg * t.mg; v.push([x, y]); } return v; }
const cad = (() => {
  const box = $("#p-cad"), cv = $("#cadCanvas"), ctx = cv.getContext("2d"), N = 40, COLS = 10, ROWS = 4, TRAY = 30, RATE = 140;
  const eng = [], paths = [], flash = new Float32Array(N).fill(-9), st = { prop: 0, rej: 0, adm: 0, inv: 0, bad: 0 }, tray = new Array(TRAY).fill(null), flying = [], marks = [];
  for (let s = 1; s <= N; s++) { eng.push(CI.biEngine(s)); paths.push([[6, 6]]); }
  let tick = 0, slot = 0, acc = 0, W = 0, H = 0, cw = 0, ch = 0, dpr = 1, yLine = 0, tray0 = 0, hover = -1, paused = CALM, active = true, seen = true;
  const top0 = 30;
  function land(item, now) {                                         /* every crossing program is judged once more as it lands */
    const j = CI.judge(item.toks); if (!(j.ok && j.kernel)) st.bad++;
    item.t = now; tray[item.slot] = item;
  }
  function step(now, live) {
    const k = tick++ % N, ev = eng[k].step(); st.prop++;
    if (ev.e === "ok") { paths[k].push([ev.to.x, ev.to.y]); return; }
    if (ev.e === "rej") { st.rej++; if (live) { flash[k] = now; marks.push({ k, t: now }); if (marks.length > 120) marks.shift(); } if (ev.discarded) paths[k] = [[6, 6]]; return; }
    paths[k] = [[6, 6]];
    if (ev.e === "inv") { st.inv++; return; }                        /* the kernel overruled the boundary: stopped, never drawn */
    st.adm++;
    const item = { toks: ev.prog, id: progId(ev.prog), seed: k + 1, at: eng[k].st.prop, k, t: now, slot };
    slot = (slot + 1) % TRAY;
    if (live && !paused && !CALM) flying.push(item); else land(item, now);
  }
  for (let i = 0; i < 9000; i++) step(0, false);
  function layout() {
    W = cv.clientWidth; if (!W) return;
    dpr = Math.min(devicePixelRatio || 1, 2); cw = W / COLS; ch = cw * .8;
    yLine = top0 + ROWS * ch + 26; tray0 = yLine + 34; H = tray0 + (TRAY / COLS) * ch + 10;
    cv.style.height = H + "px"; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const cellXY = (i, y0) => [(i % COLS) * cw, y0 + Math.floor(i / COLS) * ch];
  function crop(x, y) {                                               /* crop marks: a specimen cell, not a box */
    const a = 4, p = 5, r = x + cw - p, b = y + ch - p, l = x + p, t = y + p;
    ctx.beginPath();
    ctx.moveTo(l, t + a); ctx.lineTo(l, t); ctx.lineTo(l + a, t); ctx.moveTo(r - a, t); ctx.lineTo(r, t); ctx.lineTo(r, t + a);
    ctx.moveTo(r, b - a); ctx.lineTo(r, b); ctx.lineTo(r - a, b); ctx.moveTo(l + a, b); ctx.lineTo(l, b); ctx.lineTo(l, b - a); ctx.stroke();
  }
  function glyph(v, x, y, centred, s) {
    let ox = 6, oy = 6;
    if (centred) { let a = 99, b = -99, c = 99, e = -99; for (const [px, py] of v) { a = Math.min(a, px); b = Math.max(b, px); c = Math.min(c, py); e = Math.max(e, py); } ox = (a + b) / 2; oy = (c + e) / 2;
      s = Math.min((cw - 26) / Math.max(1, b - a), (ch - 30) / Math.max(1, e - c), s * 2.2); }
    const cx = x + cw / 2, cy = y + (ch - 10) / 2 + 2;
    ctx.beginPath(); v.forEach(([px, py], i) => { const X = cx + (px - ox) * s, Y = cy - (py - oy) * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    return [cx + (v[v.length - 1][0] - ox) * s, cy - (v[v.length - 1][1] - oy) * s];
  }
  const label = (t, x, y, c) => { ctx.fillStyle = c; ctx.fillText(t, x, y); };
  function draw(now) {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.font = "10px 'Plex Mono', ui-monospace, monospace"; ctx.textAlign = "left";
    const s = Math.min(cw - 18, ch - 18) / 12;
    label("PROPOSED · FORTY PROPOSERS, ONE TOKEN AT A TIME", 14, 20, INK3);
    ctx.lineWidth = 1; ctx.strokeStyle = RULE;
    for (let k = 0; k < N; k++) { const [x, y] = cellXY(k, top0); crop(x, y); }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (let k = 0; k < N; k++) {
      const [x, y] = cellXY(k, top0);
      ctx.strokeStyle = GREY; ctx.lineWidth = 1.3; const tip = glyph(paths[k], x, y, false, s); ctx.stroke();
      const age = now - flash[k];
      ctx.fillStyle = INK3; ctx.beginPath(); ctx.arc(tip[0], tip[1], 1.8, 0, 7); ctx.fill();
      if (age < .45) { ctx.strokeStyle = COBALT; ctx.lineWidth = 1; ctx.globalAlpha = .7 * (1 - age / .45); ctx.beginPath(); ctx.arc(tip[0], tip[1], 3 + age * 14, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.strokeStyle = COBALT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, yLine); ctx.lineTo(W, yLine); ctx.stroke();
    label("AUTHORITY · BOUNDARY, THEN AN INDEPENDENT KERNEL", 14, yLine - 9, COBALT);
    for (const m of marks) { const a = now - m.t; if (a > .6) continue; const x = (m.k % COLS + .5) * cw; ctx.globalAlpha = 1 - a / .6; ctx.beginPath(); ctx.moveTo(x - 5, yLine - 4); ctx.lineTo(x + 5, yLine + 4); ctx.moveTo(x + 5, yLine - 4); ctx.lineTo(x - 5, yLine + 4); ctx.stroke(); }
    ctx.globalAlpha = 1;
    label("CROSSED · ADMITTED BY BOTH, JUDGED AGAIN ON ARRIVAL", 14, yLine + 22, INK3);
    ctx.strokeStyle = RULE; ctx.lineWidth = 1;
    for (let i = 0; i < TRAY; i++) { const [x, y] = cellXY(i, tray0); crop(x, y); }
    ctx.font = "8.5px 'Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center";
    for (let i = 0; i < TRAY; i++) {
      const it = tray[i]; if (!it) continue;
      const [x, y] = cellXY(i, tray0), fresh = now - it.t < 1.4;
      glyph(walk(it.toks), x, y, true, s); ctx.closePath(); ctx.fillStyle = i === hover ? "#DDE3F7" : FILL; ctx.fill();
      ctx.strokeStyle = fresh || i === hover ? COBALT : INK; ctx.lineWidth = 1.3; ctx.stroke();
      if (cw > 46) label(it.id.slice(4), x + cw / 2, y + ch - 6, INK3);
    }
    for (const f of flying) {                                         /* a program crossing the authority line */
      const e = ease(clamp01((now - f.t) / .95)), [ax, ay] = cellXY(f.k, top0), [bx, by] = cellXY(f.slot, tray0);
      glyph(walk(f.toks), ax + (bx - ax) * e, ay + (by - ay) * e, true, s); ctx.closePath(); ctx.fillStyle = "rgba(32,54,199,.08)"; ctx.fill(); ctx.strokeStyle = COBALT; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  function frame(now, dt) {
    if (!active) return;
    if (!paused) { acc += RATE * dt; while (acc >= 1) { acc--; step(now, true); } }
    for (let i = flying.length - 1; i >= 0; i--) if (now - flying[i].t >= .95) land(flying.splice(i, 1)[0], now);
    if (seen) draw(now);
  }
  const bPause = $("[data-act=pause]", box), bStep = $("[data-act=step]", box);
  const sync = () => { bPause.textContent = paused ? "Resume" : "Pause"; bStep.disabled = !paused; };
  bPause.addEventListener("click", () => { paused = !paused; sync(); });
  bStep.addEventListener("click", () => { step(clock, true); draw(clock); });
  sync();
  addEventListener("resize", layout);
  new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(cv);
  const tip = $("#tip");
  const at = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const i = y > tray0 ? Math.floor((y - tray0) / ch) * COLS + Math.floor(x / cw) : -1; return i >= 0 && i < TRAY ? i : -1; };
  function receipt(it) {
    const j = CI.judge(it.toks);
    return [["Tokens", it.toks.map(k => k.s).join(" ")], ["Boundary", "admitted, " + it.toks.length + " of " + it.toks.length + " tokens"], ["Kernel", "verified by an independent rebuild"],
      ["Judged again now", j.ok && j.kernel ? "ADMITTED" : "REFUSED · " + j.why], ["Proposer", "seed " + String(it.seed).padStart(2, "0") + ", proposal " + fmt(it.at) + " of its stream"]];
  }
  cv.addEventListener("pointermove", e => {
    const i = at(e), it = i >= 0 ? tray[i] : null; hover = it ? i : -1; cv.style.cursor = it ? "pointer" : "default";
    if (!it) { tip.classList.remove("on"); return; }
    tip.textContent = ""; const h = el("div", "h"); h.append(el("span", "", it.id), el("span", "", "CROSSED")); tip.append(h);
    for (const [k, v] of receipt(it)) tip.append(el("div", k === "Tokens" ? "t" : "", k === "Tokens" ? v : k.toLowerCase() + ": " + v));
    tip.classList.add("on");
    tip.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - 316)}px,${Math.min(e.clientY + 16, innerHeight - tip.offsetHeight - 12)}px)`;
  });
  cv.addEventListener("pointerleave", () => { hover = -1; tip.classList.remove("on"); });
  cv.addEventListener("click", e => { const i = at(e), it = i >= 0 ? tray[i] : null; if (it) keep("1a", it.id, "CROSSED", "ok", receipt(it)); });
  return { frame, st, show() { active = true; layout(); draw(clock); }, hide() { active = false; } };
})();

/* ---------- Fig. 1b — Investigation: would you correct this? ---------- */
const adii = (() => {
  const box = $("#p-adii"), D = CW.adii(5), svg = $("#adiiChart"), steps = $("#adiiSteps"), ask = $("#adiiAsk");
  const ORDER = ["surge", "decimal", "gap", "naive", "duplicate", "large"];
  const NOTE = {
    surge: "A real surge: an Eid holiday, and both sources agree. Correcting it would have destroyed true data.",
    decimal: "A decimal slip: the line items and the bank deposit agree on a value ten times smaller.",
    gap: "Missing information: there is no source to restore the value from, and inventing one is not allowed.",
    naive: "Two sources disagree: setting the total to the deposit is allowed, but it does not hold against the line items.",
    duplicate: "A batch imported twice: removing it is allowed, and the result holds.",
    large: "Too large to decide: a change of this size is beyond the investigator’s authority, whatever the evidence.",
  };
  const SAY = { FIX: "Correct it", LEAVE: "Leave it", ESCALATE: "Escalate it" };
  const cases = ORDER.map((kind, i) => ({ kind, letter: "ABCDEF"[i], k: null, guess: null, shown: 0 }));
  const bar = $(".cases", box), bNext = $("[data-act=next]", box), bAll = $("[data-act=all]", box), bCase = $("[data-act=case]", box);
  cases.forEach((c, i) => { const b = el("button", "", "Case " + c.letter); b.addEventListener("click", () => open(i)); bar.append(b); });
  let cur = 0;
  const beats = k => [["Read", k.read[0]], ["Read", k.read[1]], ["Read", k.read[2]], ["Proposes", k.proposal.text],
    ["Allowed?", (k.gates[0].ok ? "yes — " : "no — ") + k.gates[0].why, !k.gates[0].ok],
    ...(k.gates[1] ? [["Holds?", (k.gates[1].ok ? "yes — " : "no — ") + k.gates[1].why, !k.gates[1].ok]] : []),
    ["Decision", { FIX: "FIX — the change is applied, and it holds", LEAVE: "LEAVE — the sources agree; the value was real", ESCALATE: "ESCALATE — not the machine’s to decide; sent to a person" }[k.v], "v"]];
  function chart(c) {
    const k = c.k, done = c.shown >= beats(k).length, W = 560, Hh = 210, L = 40, R = 10, Tp = 24, B = 28;
    const row = D.cells.filter(x => x.r === k.cell.r).sort((a, b) => a.c - b.c), val = x => x !== k.cell ? x.total : done ? k.after : k.injected;
    const med = row.filter(x => x !== k.cell).map(x => x.total).sort((a, b) => a - b)[9], top = med * 1.7;
    const X = i => L + i * (W - L - R) / 19, Y = v => Tp + (1 - Math.min(v, top) / top) * (Hh - Tp - B);
    let s = `<g font-family="Plex Mono, monospace" font-size="10" fill="${INK3}">`;
    for (const f of [0, .5, 1]) { const v = top * f, y = Y(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${RULE}"/><text x="${L - 8}" y="${y + 3}" text-anchor="end">${Math.round(v / 100000)}k</text>`; }
    s += `<text x="${L}" y="${Hh - 6}">day 1</text><text x="${W - R}" y="${Hh - 6}" text-anchor="end">day 20</text><text x="${(L + W - R) / 2}" y="${Hh - 6}" text-anchor="middle">branch ${k.cell.r + 1} · daily totals, SAR</text></g>`;
    s += `<polyline fill="none" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" points="${row.map((x, i) => X(i) + "," + Y(val(x))).join(" ")}"/>`;
    row.forEach((x, i) => {
      const v = val(x), me = x === k.cell;
      s += `<circle cx="${X(i)}" cy="${Y(v)}" r="${me ? 5 : 2.4}" fill="${me ? "#fff" : INK}" stroke="${me ? (done && k.v === "FIX" ? INK : COBALT) : INK}" stroke-width="${me ? 1.8 : 0}"/>`;
      if (v > top) s += `<text x="${X(i)}" y="${Tp - 9}" text-anchor="middle" font-family="Plex Mono, monospace" font-size="9.5" fill="${me ? COBALT : INK3}">↑ ${short(v)}</text>`;
    });
    const pi = beats(k).findIndex(b => b[0] === "Proposes");
    if (!done && c.shown > pi && k.proposal.kind !== "leave") { const i = row.indexOf(k.cell), y0 = Y(k.injected), y1 = Y(k.proposal.to);
      s += `<line x1="${X(i)}" x2="${X(i)}" y1="${y0}" y2="${y1}" stroke="${COBALT}" stroke-dasharray="3 3"/><circle cx="${X(i)}" cy="${y1}" r="4.5" fill="none" stroke="${COBALT}" stroke-dasharray="2 2"/><text x="${X(i) + 9}" y="${y1 + 3}" font-family="Plex Mono, monospace" font-size="9.5" fill="${COBALT}">proposed</text>`; }
    svg.innerHTML = s;
  }
  function render() {
    const c = cases[cur], k = c.k = c.k || D.investigate(c.kind), b = beats(k);
    $$("button", bar).forEach((x, i) => { x.setAttribute("aria-pressed", String(i === cur)); x.classList.toggle("done", !!cases[i].k && cases[i].shown >= beats(cases[i].k).length); });
    ask.textContent = "";
    ask.append(el("span", "where", "Branch " + (k.cell.r + 1) + ", day " + (k.cell.c + 1)),
      document.createTextNode(k.kase === "gap" ? " has no total. " : " reads " + M(k.injected) + ", " + k.flag + ". "), el("strong", "", "Would you correct it?"));
    $$("button", $("#adiiChoices")).forEach(x => { x.disabled = !!c.guess; x.classList.toggle("picked", c.guess === x.dataset.guess); });
    steps.textContent = "";
    for (let i = 0; i < c.shown; i++) { const [h, v, f] = b[i], li = el("li", f === "v" ? "v" : f ? "no" : ""); li.append(el("span", "", h), el("span", "", v)); steps.append(li); }
    if (c.shown >= b.length) {
      const same = c.guess === k.v, li = el("li", "cmp " + (same ? "same" : "diff"));
      li.append(el("span", "", same ? "Same call" : "Different call"), el("span", "", "You said “" + SAY[c.guess] + ".” The system: " + k.v + ". " + NOTE[k.kase]));
      steps.append(li);
    }
    bNext.disabled = bAll.disabled = !c.guess || c.shown >= b.length;
    chart(c);
  }
  function advance(all) {
    const c = cases[cur], b = beats(c.k), was = c.shown;
    c.shown = all ? b.length : Math.min(b.length, c.shown + 1);
    if (was < b.length && c.shown >= b.length) {
      const k = c.k;
      keep("1b", "Case " + c.letter + " · branch " + (k.cell.r + 1) + ", day " + (k.cell.c + 1), "You: " + SAY[c.guess] + " · System: " + k.v, c.guess === k.v ? "ok" : "no",
        [["Value", k.kase === "gap" ? "no total" : M(k.injected) + ", " + k.flag], ...b.map(([h, v]) => [h, v]), ["Why", NOTE[k.kase]]]);
    }
    render();
  }
  $$("button", $("#adiiChoices")).forEach(x => x.addEventListener("click", () => { cases[cur].guess = x.dataset.guess; advance(false); }));
  bNext.addEventListener("click", () => advance(false));
  bAll.addEventListener("click", () => advance(true));
  bCase.addEventListener("click", () => open((cur + 1) % cases.length));
  function open(i) { cur = i; render(); }
  return { show() { render(); }, hide() {} };
})();

/* ---------- Fig. 1c — Execution: a program meets the engine ---------- */
const awc = (() => {
  const box = $("#p-awc"), P = CW.PROGRAMS, list = $("#awcLines"), out = $("#awcVerdict"), bar = $(".cases", box);
  const MENU = [["zakat", "Zakat"], ["deposit", "Fixed-interest deposit"], ["runway", "Job-loss runway"], ["takaful", "Double-return takaful"], ["allocation", "Portfolio check"]];
  const bStep = $("[data-act=step]", box), bRun = $("[data-act=run]", box), bAlt = $("[data-act=alt]", box);
  let prog, v, lines, shown = 0;
  MENU.forEach(([k, t]) => { const b = el("button", "", t); b.dataset.k = k; b.addEventListener("click", () => load(k)); bar.append(b); });
  function load(k) {
    prog = P[k]; v = CW.run(prog); lines = prog.steps.map(CW.line); shown = 0;
    $$("button", bar).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === (k === "mudarabah" ? "deposit" : k))));
    $("#awcQ").textContent = (prog.alt ? "The alternative it offers · " : "") + prog.q;
    render();
  }
  function render() {
    list.textContent = "";
    const done = shown > v.at;
    lines.forEach((t, i) => {
      const failed = i === v.at && v.v !== "EXECUTED", reached = i < shown;
      const li = el("li", reached ? (failed ? "fail" : "ran") : done ? "skip" : "");
      li.append(el("span", "", t), el("b", "", !reached ? (done ? "not reached" : "") : failed ? "✗" : v.trace[i] === undefined || v.trace[i] === "✓" ? "✓" : v.trace[i]));
      list.append(li);
    });
    out.textContent = "";
    if (done) {
      const d = el("div", "verdict" + (v.v === "EXECUTED" ? "" : " no"));
      d.append(el("span", "", v.v), el("span", "", v.v === "EXECUTED" ? prog.name + " = " + v.result : v.why + (v.v === "REFUSED" ? " — the engine offers an alternative" : "")));
      out.append(d);
    }
    bStep.disabled = bRun.disabled = done;
    bAlt.hidden = !(done && v.v === "REFUSED");
  }
  function step(all) {
    if (shown > v.at) return;
    shown = all ? v.at + 1 : shown + 1;
    if (shown > v.at) keep("1c", prog.q, v.v + (v.v === "EXECUTED" ? " · " + v.result : ""), v.v === "EXECUTED" ? "ok" : "no",
      [...lines.map((t, i) => [String(i + 1).padStart(2, "0"), i > v.at ? t + "  (not reached)" : t + "  →  " + (i === v.at && v.v !== "EXECUTED" ? "✗" : v.trace[i] || "✓")]), ["Verdict", v.v === "EXECUTED" ? v.result : v.why]]);
    render();
  }
  bStep.addEventListener("click", () => step(false));
  bRun.addEventListener("click", () => step(true));
  bAlt.addEventListener("click", () => load("mudarabah"));
  load("zakat");
  return { show(preset) { if (preset) load(preset); }, hide() {} };
})();

/* ---------- Fig. 1d — Records: an append-only ledger ---------- */
const sijil = (() => {
  const box = $("#p-sijil"), L = CW.sijil(9), tb = $("#sijRows"), lane = $("#sijLane"), ROWS = 7, bCorrect = $("[data-kind=correct]", box);
  let pending = 0;
  for (let i = 0; i < 40; i++) L.propose();
  const row = (e, fresh) => {
    const tr = el("tr", e.kind + (fresh ? " new" : ""));
    const what = e.kind === "CORRECTION" ? "CORRECTION → #" + e.ref : e.kind + " · INV-" + e.invoice;
    for (const [t, c] of [[String(e.n), ""], [what, ""], [short(e.net), "num"], [short(e.vat), "num"], [e.hash, ""]]) tr.append(el("td", c, t));
    return tr;
  };
  L.log.slice(-ROWS).reverse().forEach(e => tb.append(row(e, false)));
  function say(...parts) { lane.textContent = ""; lane.append(...parts); }
  function replay() {                                               /* recompute the chain and every balance from genesis */
    let h = CM.fnv("sijil:genesis"), rev = 0, vat = 0, ok = true;
    for (const e of L.log) { h = CM.fnv(CW.hex(h) + "|" + e.body); rev += e.net; vat += e.vat; ok = ok && e.hash === CW.hex(h) && e.revenue === rev && e.vatDue === vat; }
    say(el("strong", "", ok ? "Replayed " + L.log.length + " events from genesis: every hash and balance matches." : "Replay does not match the log."),
      document.createTextNode(" Head " + CW.hex(h) + " · revenue " + M(rev) + " · VAT due " + M(vat)));
    keep("1d", "Replay from genesis", ok ? "CHAIN MATCHES" : "MISMATCH", ok ? "ok" : "no", [["Events", fmt(L.log.length)], ["Head", CW.hex(h)], ["Revenue", M(rev)], ["VAT due", M(vat)]]);
  }
  function act(kind) {
    if (kind === "replay") return replay();
    const r = kind === "correct" ? L.propose() : L.propose(L.make(kind));
    if (kind === "correct") pending--; else if (kind === "edit" && !r.ok) pending++;
    bCorrect.hidden = pending <= 0;
    if (r.ok) {
      const e = r.event; tb.prepend(row(e, true)); while (tb.children.length > ROWS) tb.lastChild.remove();
      say(el("strong", "", "Appended #" + e.n + " · " + e.kind), document.createTextNode(" · " + M(e.net) + " · chained " + e.hash + " to the event before"));
      keep("1d", r.it.text, "APPENDED #" + e.n, "ok", [["Net", M(e.net)], ["VAT", M(e.vat)], ["Chain", e.hash + " ← " + (e.n ? L.log[e.n - 1].hash : L.genesis)], ["State after", "revenue " + M(e.revenue) + " · VAT due " + M(e.vatDue)]]);
    } else {
      say(el("span", "", "Refused: "), el("s", "", r.it.text), el("em", "", " — " + r.why));
      keep("1d", r.it.text, "REFUSED", "no", [["Rule", r.why], ["Ledger", "unchanged · " + L.log.length + " events"]]);
    }
  }
  $$("[data-kind]", box).forEach(b => b.addEventListener("click", () => act(b.dataset.kind)));
  return { show() {}, hide() {} };
})();

/* ---------- Fig. 1: the reader chooses ---------- */
const EX = { cad, adii, awc, sijil };
const META = {
  cad: ["The boundary, live", "Live", "<b>Fig. 1a</b>CytherCAD’s boundary engine, the engine of the record, in your browser. Forty seeded proposers emit drawing tokens; each is judged at the authority line, grammar first and then geometry, and every closed program is rebuilt by an independent kernel. What both admit crosses, and is judged once more as it lands. The kernel has overruled the boundary <span data-t=\"inv\">0</span> times; those programs were stopped, never drawn. A toy grammar; the production mechanism."],
  adii: ["Would you correct this?", "Toy data", "<b>Fig. 1b</b>Six cases of a number that looks wrong. Decide first, then step through the evidence and the two checks: is the change allowed, and does it hold. Toy data and a scripted investigator stand in for the model; the two checks are real programs, running here. An illustration of ADII’s architecture, not ADII."],
  awc: ["A program meets the engine", "Toy programs", "<b>Fig. 1c</b>Choose a question; the program is what a model might write. A small engine written for this page runs it one line at a time: executed, refused by its constitution, or blocked by its own assertion. Exact money: integer halalas, rounded half-up. An illustration of AWC-OS, not AWCOSCore."],
  sijil: ["An append-only ledger", "Toy ledger", "<b>Fig. 1d</b>Every intent is validated before it is appended, and each event is chained to the one before. An edit is refused; a correction is a new event. Replay recomputes the chain and every balance from genesis. A toy ledger illustrating event sourcing, not SijilOS."],
};
const tabs = $$("[role=tab]"), KEYS = ["cad", "adii", "awc", "sijil"], cap = $("#figcap");
function select(key, preset) {
  tabs.forEach((t, i) => { const on = KEYS[i] === key; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; $("#p-" + KEYS[i]).hidden = !on; });
  const [name, pill, caption] = META[key];
  $("#figname").textContent = name; $("#figpill").textContent = pill; $("#figpill").classList.toggle("static", key !== "cad");
  cap.innerHTML = caption; T.inv = $$("[data-t=inv]");
  for (const k of KEYS) if (k !== key) EX[k].hide();
  EX[key].show(preset);
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(KEYS[i]));
  t.addEventListener("keydown", e => {
    const d = { ArrowRight: 1, ArrowLeft: -1, Home: -9, End: 9 }[e.key]; if (!d) return;
    e.preventDefault(); const j = d === -9 ? 0 : d === 9 ? 3 : (i + d + 4) % 4; select(KEYS[j]); tabs[j].focus();
  });
});
$$("[data-open]").forEach(b => b.addEventListener("click", () => { select(b.dataset.open, b.dataset.preset); $("#fig1").scrollIntoView({ behavior: CALM ? "auto" : "smooth", block: "start" }); }));

/* ---------- Table 2 and the revisions: the record, checked here ---------- */
const revs = $("#revs");
const epochs = CM.EPOCHS.map(e => [e.epoch, e.derived, CM.stateChecksum(e), ""]).concat([[CM.MANIFEST.epoch, CM.MANIFEST.derived, CM.CHECKSUM, "current"]]);
/* js/manifest.js marks every epoch date and the commitment date PROVISIONAL: each is labelled where it appears */
const dated = d => { const td = el("td", "", d); td.append(el("span", "prov", "Provisional date")); return td; };
for (const [n, d, ck, note] of epochs) { const tr = el("tr", note); tr.append(el("td", "", "0" + n), dated(d), el("td", "", ck + (note ? " · " + note : ""))); revs.append(tr); }
for (const c of CM.COMMITMENTS) { const tr = el("tr", "commit"); tr.append(el("td", "", "0" + c.epoch), dated(c.committed), el("td", "", "committed · sha256 " + c.digest.slice(0, 8) + "… · " + c.status)); revs.append(tr); }
const CL01 = CC.CLAIMS.find(c => c.id === "CL-01");
function claims() { CC.recomputeClaims(); put("ext", CL01.run().detail.split(" ")[0]); }
$("#recompute").addEventListener("click", claims);
CC.renderClaims();
addEventListener("load", () => {
  setTimeout(claims, 150);
  setTimeout(() => {                                                 /* CL-03: the three published admissions, re-derived off the boot path */
    const checks = [[CM.NORM, CM.PUBLISHED_NONCES.current], [CM.EPOCHS[0], CM.PUBLISHED_NONCES.epochs[0]], [CM.EPOCHS[1], CM.PUBLISHED_NONCES.epochs[1]]];
    let i = 0, ok = true;
    (function next() {
      if (i >= checks.length) { CC.setClaim("CL-03", ok, ok ? "3 admissions re-derived" : "nonce ≠ derivation"); return; }
      const [m, n] = checks[i++], a = CM.admit(m); if (!a || a.n !== n) ok = false; setTimeout(next, 80);
    })();
  }, 500);
});

/* ---------- one clock ---------- */
let last = performance.now() / 1000, clock = 0, hud = -1;
function loop(ms) {
  const dt = Math.min(ms / 1000 - last, .1); last = ms / 1000; clock += dt;
  cad.frame(clock, dt);
  if (clock - hud > .2) {
    hud = clock; const a = cad.st;
    put("prop", fmt(a.prop)); put("rej", fmt(a.rej)); put("adm", fmt(a.adm)); put("bad", fmt(a.bad)); put("inv", fmt(a.inv));
  }
  requestAnimationFrame(loop);
}
select("cad");
requestAnimationFrame(loop);
})();
