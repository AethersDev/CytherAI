/* THE EXCEPTION — prototype. temptation → decision → interruption → evidence.

   Draw (CytherCAD) is judged by this site's real boundary engine, js/instrument.js, loaded unchanged: a toy grammar of
   rectilinear profiles, not CytherCAD itself, and the page says so. Its two programs were found through the engine before
   the scene was made: the picture is refused at operation 6 (CROSSES), the alternative is admitted and kernel-verified.

   Correct (ADII) is an ILLUSTRATION: every figure is constructed, and the page says so. Its claims are internal to those
   figures and checked where they are made. */
(function () {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, CALM ? 0 : ms));
const fmt = n => n.toLocaleString("en-US"), money = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const put = (k, v, root = document) => $$(`[data-n="${k}"]`, root).forEach(e => (e.textContent = v));
const state = { draw: { refusedAt: -1, admitted: false }, correct: { tried: false, left: false } };

/* ================= Draw ================= */
const CI = window.CytherInstrument, CM = window.CytherManifest, D = $("#draw");
const tok = s => s === "Z" ? { k: "Z", s: "Z" } : { k: s[0], sg: s[1] === "+" ? 1 : -1, mg: +s.slice(2), s: s[0] + (s[1] === "+" ? "+" : "−") + s.slice(2) };
const PICTURE = { toks: "H+3 V+3 H+3 V+3 H-3 V-3 H-3 Z".split(" ").map(tok), caption: "Proposed drawing.",
  because: "The two squares would meet at a single point: a part held together by nothing." };
const VALID = { toks: "H+3 V+2 H+2 V+3 H-3 V-2 H-2 Z".split(" ").map(tok), caption: "A valid alternative: the same idea, joined by material." };
const RULE = { CROSSES: "no move may touch the outline already drawn" };
const corners = toks => { let x = 6, y = 6; const v = [[x, y]]; for (const t of toks) { if (t.k === "Z") { v.push([6, 6]); break; } if (t.k === "H") x += t.sg * t.mg; else y += t.sg * t.mg; v.push([x, y]); } return v; };
const at = ([x, y]) => `${x} ${12 - y}`, where = ([x, y]) => `(${x}, ${y})`;
const line = (a, b, cls) => `<line class="${cls}" x1="${a[0]}" y1="${12 - a[1]}" x2="${b[0]}" y2="${12 - b[1]}"/>`;
const sheet = $(".sheet", D);
let dots = ""; for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) dots += `<circle class="dot" cx="${x}" cy="${y}" r=".05"/>`;
const sheetOf = layer => (sheet.innerHTML = `<g>${dots}</g><g>${layer}</g>`);
/* the lattice points the accepted moves cover: the relation the engine's CROSSES rule reads, used here only to show where */
function covered(v, n) {
  const c = new Set(["6,6"]);
  for (let i = 0; i < n; i++) { const a = v[i], b = v[i + 1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]); let [x, y] = a;
    while (x !== b[0] || y !== b[1]) { x += dx; y += dy; c.add(x + "," + y); } }
  return c;
}
/* what each mark is: the engine's output and a preview are never drawn alike, and never left unlabelled */
const legend = html => { const l = $(".legend", D); l.innerHTML = html; l.hidden = false; };
function propose(p) {
  $(".legend", D).hidden = true;
  sheetOf(`<path class="proposed" d="M${corners(p.toks).map(at).join(" L")} Z"/>`);
  put("caption", p.caption, D);
}
function chips(p) {
  $(".ops-title", D).hidden = false;
  $(".ops", D).innerHTML = p.toks.map((t, i) => `<li><button type="button" data-i="${i}">${t.s}</button></li>`).join("");
  $$(".ops button", D).forEach(b => b.addEventListener("click", () => detail(p, +b.dataset.i)));
}
function detail(p, i) {
  const t = p.toks[i], v = corners(p.toks), st = $(`.ops button[data-i="${i}"]`, D).dataset.state, n = `Operation ${i + 1} · ${t.s}`;
  $$(".ops button", D).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
  const box = $(".op-detail", D);
  if (st === "ok") box.innerHTML = t.k === "Z" ? `<b>${n} · accepted</b>It closes the outline. The kernel then rebuilt the whole program on its own and agreed.`
                                               : `<b>${n} · accepted</b>From ${where(v[i])} to ${where(v[i + 1])}.`;
  else if (st === "refused") box.innerHTML = `<b class="ev">${n} · refused · ${p.why}</b>It returns to ${where(p.touch)}, a corner the outline already passed. ${p.because}<br><span class="label">Rule: ${RULE[p.why] || p.why}.</span>`;
  else box.innerHTML = `<b>${n} · never judged</b>The engine stops at the first operation it cannot admit; this one was never reached.`;
}
async function judgeAndDraw(p) {
  const r = CI.judge(p.toks), v = corners(p.toks);   /* the engine's verdict, not the picture's */
  chips(p); let layer = "";
  for (let i = 0; i < (r.ok ? p.toks.length : r.at); i++) {
    layer += line(v[i], v[i + 1], "seg"); sheetOf(layer);
    $(`.ops button[data-i="${i}"]`, D).dataset.state = "ok"; await wait(330);
  }
  if (!r.ok) {
    const c = covered(v, r.at), a = v[r.at], b = v[r.at + 1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]); let [x, y] = a;
    do { x += dx; y += dy; } while (!c.has(x + "," + y) && (x !== b[0] || y !== b[1]));
    p.why = r.why; p.touch = [x, y];
    layer += line(a, b, "refused") + `<circle class="touch" cx="${x}" cy="${12 - y}" r=".42"/>` +
             (v.length > r.at + 2 ? `<path class="unjudged" d="M${v.slice(r.at + 1).map(at).join(" L")}"/>` : "") +
             "";
    sheetOf(layer);
    $(`.ops button[data-i="${r.at}"]`, D).dataset.state = "refused";
    $$(".ops button", D).filter(b2 => +b2.dataset.i > r.at).forEach(b2 => (b2.dataset.state = "unjudged"));
    detail(p, r.at);
    $(".status", D).textContent = `Refused at operation ${r.at + 1} of ${p.toks.length} · ${r.why}`;
    legend(`<span><i class="k-seg"></i>accepted by the engine</span><span class="ev"><i class="k-ref"></i>refused</span><span><i class="k-un"></i>preview, never judged</span>`);
    return r;
  }
  /* admitted: the closed program, rebuilt by the kernel, becomes something that exists */
  sheetOf(`<path class="admitted" d="M${v.map(at).join(" L")} Z"/>` + layer);
  const id = "PRG-" + (CM.fnv(p.toks.map(t => t.s).join("")) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  $(".status", D).textContent = `Admitted · kernel verified · ${id}`;
  legend(`<span><i class="k-adm"></i>admitted: rebuilt by the kernel</span>`);
  detail(p, p.toks.length - 1);
  return r;
}
async function release() {
  $(".decide", D).hidden = true;
  const r = await judgeAndDraw(PICTURE);
  if (!r.ok) state.draw.refusedAt = r.at;
  await wait(500);
  $(".verdict2", D).textContent = "The picture was convincing. The instruction was invalid."; $(".verdict2", D).classList.add("in"); $(".why2", D).classList.add("in");
}
async function alternative() {   /* judged on its own; it completes only if the engine and the kernel admit it */
  $('[data-act="alt"]', D).hidden = true; $(".op-detail", D).textContent = ""; $(".status", D).textContent = "";
  propose(VALID); await wait(900);
  const r = await judgeAndDraw(VALID);
  state.draw.admitted = r.ok && r.kernel;
  if (state.draw.admitted) $(".verdict2", D).textContent = "Joined by material, not by a point. Admitted.";
}
propose(PICTURE);
$('[data-act="release"]', D).addEventListener("click", release);
$('[data-act="alt"]', D).addEventListener("click", alternative);

/* ================= Correct (an illustration) ================= */
const C = $("#correct");
/* an online store's daily sales through Ramadan, in SAR (constructed): steady, rising in the last week, then the eve of Eid */
const DAYS = [38200, 39650, 37980, 40420, 41110, 39870, 38760, 40980, 42230, 41560, 40310, 39940, 41870, 42650, 43120,
              41980, 42540, 43890, 44210, 43670, 45120, 46380, 47040, 47800, 48920, 49610, 51270, 52440, 214630];
const SPIKE = DAYS[DAYS.length - 1], BEFORE = DAYS.slice(-8, -1);
const MEDIAN = BEFORE.slice().sort((a, b) => a - b)[3];
const LINES = [["#4012 · ma'amoul gift tray ×2", 29000], ["#1877 · Sukkari dates, 3 kg", 16500], ["#2650 · children's Eid outfit ×3", 44700],
               ["#3871 · gahwa set", 22000]];                                           /* in halalas */
const ORDERS = 4182, LAST_YEAR = 187560, LAST_YEAR_MEDIAN = 40780;
if (SPIKE <= 4 * Math.max(...DAYS.slice(0, -1))) throw new Error("the headline says four times any other day");

function chart(svg) {   /* drawn at its own width, so a phone's labels stay legible */
  const W = Math.round(Math.min(1000, Math.max(320, svg.getBoundingClientRect().width || 1000))), H = Math.round(W > 600 ? 220 : 170), top = 14, bottom = H - 34;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x = i => 8 + i * (W - 16) / (DAYS.length - 1), y = v => bottom - (v / SPIKE) * (bottom - top);
  const pts = DAYS.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" "), last = DAYS.length - 1;
  svg.innerHTML = `<line class="base" x1="0" x2="${W}" y1="${bottom}" y2="${bottom}"/>
    <polyline class="line" points="${pts}"/>
    <circle class="spike" cx="${x(last)}" cy="${y(SPIKE)}" r="7"/>
    <text class="tick" x="8" y="${H - 6}">1 Ramadan</text><text class="tick" x="${W - 8}" y="${H - 6}" text-anchor="end">the last day</text>`;
}
function fill() {
  put("value", fmt(SPIKE), C); put("day", "the last day of Ramadan", C); put("proposal", fmt(MEDIAN), C);
  put("orders", fmt(ORDERS), C); put("deposit", money(SPIKE), C); put("lastyear", fmt(LAST_YEAR), C); put("lastratio", (LAST_YEAR / LAST_YEAR_MEDIAN).toFixed(1) + " times", C);
  const shown = LINES.reduce((s, l) => s + l[1], 0), rest = SPIKE * 100 - shown;
  $('[data-n="lines"]', C).innerHTML = LINES.map(([t, h]) => `<li><span>${t}</span><span>${money(h / 100)}</span></li>`).join("") +
    `<li><span>${fmt(ORDERS - LINES.length)} more orders</span><span>${money(rest / 100)}</span></li>` +
    `<li class="sum"><span>Σ ${fmt(ORDERS)} orders</span><span>${money(SPIKE)}</span></li>`;
}
let busy = false;
const status = $(".status", C), number = $(".number", C), proposal = $(".proposal", C), cursor = $(".cursor", C), stage = $(".stage", C);
const verdict = $(".verdict", C), why = $(".why", C), again = $('[data-act="again"]', C);
async function evidence() { for (const c of $$(".card", C)) if (!c.classList.contains("in")) { c.classList.add("in"); wires(); await wait(480); } }
function wires() {
  const svg = $(".wires", C), ev = $(".evidence", C).getBoundingClientRect(), n = number.getBoundingClientRect();
  const ax = n.left + n.width / 2 - ev.left, ay = n.bottom - ev.top;
  svg.innerHTML = $$(".card.in", C).map(c => { const r = c.getBoundingClientRect(); return `<line x1="${ax}" y1="${ay}" x2="${r.left + r.width / 2 - ev.left}" y2="${r.top - ev.top}"/>`; }).join("");
}
addEventListener("resize", () => { chart($(".chart", C)); if ($(".card.in", C)) wires(); });
async function correct() {
  if (busy) return; busy = true; state.correct.tried = true;
  $(".decide", C).hidden = true; again.hidden = true;
  proposal.hidden = false; proposal.classList.remove("absent");
  put("plabel", "your correction: the median of the seven days before", C); status.textContent = "";
  await wait(700);
  const s = stage.getBoundingClientRect(), from = $(".v", proposal).getBoundingClientRect(), to = $(".v", number).getBoundingClientRect();   /* the cursor carries the correction to the number */
  cursor.hidden = false; cursor.style.transition = "none";
  cursor.style.transform = `translate(${from.left - s.left + from.width * .55}px,${from.top - s.top + from.height * .6}px)`;
  cursor.getBoundingClientRect(); cursor.style.transition = "";
  cursor.style.transform = `translate(${to.left - s.left + to.width * .55}px,${to.top - s.top + to.height * .55}px)`;
  await wait(1150);
  status.textContent = "The number did not change."; number.classList.add("held");   /* the number does not change */
  await wait(900);
  cursor.hidden = true; proposal.classList.add("absent"); put("plabel", "your correction · not applied", C);
  await wait(500); await evidence(); await wait(300);
  verdict.textContent = "You almost erased a real day."; verdict.classList.add("in"); why.classList.add("in");
  busy = false;
}
async function leave() {
  if (busy) return; busy = true; state.correct.left = true;
  $(".decide", C).hidden = true; status.textContent = "You left it.";
  await wait(500); await evidence(); await wait(300);
  verdict.textContent = "You kept a real day."; verdict.classList.add("in"); why.classList.add("in");
  again.hidden = false; busy = false;
}
chart($(".chart", C)); fill();
$('[data-act="correct"]', C).addEventListener("click", correct);
$('[data-act="leave"]', C).addEventListener("click", leave);
again.addEventListener("click", correct);   /* "Test my correction": the same decision, put to the same evidence; never a way around it */

/* ================= the question, and what you left on it ================= */
function show(id) {
  for (const s of ["ask", "draw", "correct"]) $("#" + s).hidden = s !== id;
  scrollTo(0, 0);
  const h = $(`#${id} h1, #${id} h2`); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
  if (id === "correct") requestAnimationFrame(() => { chart($(".chart", C)); if ($(".card.in", C)) wires(); });
}
function back() {
  const c = state.correct, d = state.draw;
  if (c.tried) { $('[data-meta="correct"]').innerHTML = "ADII · <b>held the number</b>"; const g = $(".ghost"); g.textContent = fmt(MEDIAN); g.hidden = false; }   /* the correction that never happened */
  else if (c.left) $('[data-meta="correct"]').innerHTML = "ADII · <b>left it</b>";
  if (d.refusedAt >= 0) {
    $('[data-meta="draw"]').innerHTML = "CytherCAD · <b>" + (d.admitted ? "refused one, admitted one" : "refused operation " + (d.refusedAt + 1)) + "</b>";
    const g = $(".ghost-draw");   /* the drawing that was never released: its outline, and where it would have touched itself */
    g.innerHTML = `<path class="h" d="M${corners(PICTURE.toks).map(at).join(" L")} Z"/><circle class="ev" cx="${PICTURE.touch[0]}" cy="${12 - PICTURE.touch[1]}" r=".5"/>`;
    g.removeAttribute("hidden");   /* an SVG element has no .hidden property: the attribute itself must go */
  }
  if (c.tried || c.left || d.refusedAt >= 0) $(".close").hidden = false;
  show("ask");
}
$$("[data-go]").forEach(b => b.addEventListener("click", () => show(b.dataset.go)));
$$('[data-act="back"]').forEach(b => b.addEventListener("click", back));
$$('.choice[aria-disabled="true"]').forEach(b => b.addEventListener("click", e => e.preventDefault()));
$("#describe").addEventListener("submit", e => {
  e.preventDefault();
  const text = $("#mistake").value.trim(); if (!text) return;
  location.href = "mailto:contact@cytherai.com?subject=" + encodeURIComponent("The mistake we cannot afford") + "&body=" + encodeURIComponent(text);
});
})();
