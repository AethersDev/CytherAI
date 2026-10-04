/* THE EXCEPTION — prototype. temptation → decision → interruption → evidence.
   The Correct encounter stands for ADII and is an ILLUSTRATION: every figure below is constructed, and the page says so.
   Its claims are internal to those figures and checked where they are made: the spike is more than four times any other day,
   the proposed correction is the median it says it is, the line items and the deposit sum to the number to the halala. */
(function () {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, CALM ? 0 : ms));
const fmt = n => n.toLocaleString("en-US"), money = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* an online store's daily sales through Ramadan, in SAR (constructed): steady, rising in the last week, then the eve of Eid */
const DAYS = [38200, 39650, 37980, 40420, 41110, 39870, 38760, 40980, 42230, 41560, 40310, 39940, 41870, 42650, 43120,
              41980, 42540, 43890, 44210, 43670, 45120, 46380, 47040, 47800, 48920, 49610, 51270, 52440, 214630];
const SPIKE = DAYS[DAYS.length - 1], BEFORE = DAYS.slice(-8, -1);
const MEDIAN = BEFORE.slice().sort((a, b) => a - b)[3];
const LINES = [["#4012 · ma'amoul gift tray ×2", 29000], ["#1877 · Sukkari dates, 3 kg", 16500], ["#2650 · children's Eid outfit ×3", 44700],
               ["#3871 · gahwa set", 22000]];                                           /* in halalas */
const ORDERS = 4182, LAST_YEAR = 187560, LAST_YEAR_MEDIAN = 40780;
if (SPIKE <= 4 * Math.max(...DAYS.slice(0, -1))) throw new Error("the headline says four times any other day");

/* ---------- the chart ---------- */
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

/* ---------- the encounter ---------- */
const put = (k, v) => $$(`[data-n="${k}"]`).forEach(e => (e.textContent = v));
function fill() {
  put("value", fmt(SPIKE)); put("day", "the last day of Ramadan"); put("proposal", fmt(MEDIAN));
  put("orders", fmt(ORDERS)); put("deposit", money(SPIKE)); put("lastyear", fmt(LAST_YEAR)); put("lastratio", (LAST_YEAR / LAST_YEAR_MEDIAN).toFixed(1) + " times");
  const shown = LINES.reduce((s, l) => s + l[1], 0), rest = SPIKE * 100 - shown;
  $('[data-n="lines"]').innerHTML = LINES.map(([t, h]) => `<li><span>${t}</span><span>${money(h / 100)}</span></li>`).join("") +
    `<li><span>${fmt(ORDERS - LINES.length)} more orders</span><span>${money(rest / 100)}</span></li>` +
    `<li class="sum"><span>Σ ${fmt(ORDERS)} orders</span><span>${money(SPIKE)}</span></li>`;
}

const state = { tried: false, left: false, busy: false };
const status = $(".status"), number = $(".number"), proposal = $(".proposal"), cursor = $(".cursor"), stage = $(".stage");
const verdict = $(".verdict"), why = $(".why"), again = $('[data-act="again"]');

async function evidence() {
  for (const c of $$(".card")) { if (!c.classList.contains("in")) { c.classList.add("in"); wires(); await wait(480); } }
}
function wires() {
  const svg = $(".wires"), ev = $(".evidence").getBoundingClientRect(), n = number.getBoundingClientRect();
  const ax = n.left + n.width / 2 - ev.left, ay = n.bottom - ev.top;
  svg.innerHTML = $$(".card.in").map(c => { const r = c.getBoundingClientRect(); return `<line x1="${ax}" y1="${ay}" x2="${r.left + r.width / 2 - ev.left}" y2="${r.top - ev.top}"/>`; }).join("");
}
addEventListener("resize", () => { chart($(".chart")); if ($(".card.in")) wires(); });

async function correct() {
  if (state.busy) return; state.busy = true; state.tried = true;
  $(".decide").hidden = true; again.hidden = true;
  proposal.hidden = false; proposal.classList.remove("absent");
  put("plabel", "your correction: the median of the seven days before");
  status.textContent = "";
  await wait(700);
  /* the cursor carries the correction to the number */
  const s = stage.getBoundingClientRect(), from = $(".v", proposal).getBoundingClientRect(), to = $(".v", number).getBoundingClientRect();
  cursor.hidden = false; cursor.style.transition = "none";
  cursor.style.transform = `translate(${from.left - s.left + from.width * .55}px,${from.top - s.top + from.height * .6}px)`;
  cursor.getBoundingClientRect(); cursor.style.transition = "";
  cursor.style.transform = `translate(${to.left - s.left + to.width * .55}px,${to.top - s.top + to.height * .55}px)`;
  await wait(1150);
  /* the number does not change */
  status.textContent = "The number did not change.";
  number.classList.add("held");
  await wait(900);
  cursor.hidden = true;
  proposal.classList.add("absent");
  put("plabel", "your correction · not applied");
  await wait(500);
  await evidence();
  await wait(300);
  verdict.textContent = "You almost erased a real day."; verdict.classList.add("in"); why.classList.add("in");
  state.busy = false;
}
async function leave() {
  if (state.busy) return; state.busy = true; state.left = true;
  $(".decide").hidden = true;
  status.textContent = "You left it.";
  await wait(500);
  await evidence();
  await wait(300);
  verdict.textContent = "You kept a real day."; verdict.classList.add("in"); why.classList.add("in");
  again.hidden = false;
  state.busy = false;
}

/* ---------- the question, and what you left on it ---------- */
function show(id) {
  $("#ask").hidden = id !== "ask"; $("#correct").hidden = id !== "correct";
  scrollTo(0, 0);
  (id === "ask" ? $("#q") : $("#ct")).setAttribute("tabindex", "-1");
  (id === "ask" ? $("#q") : $("#ct")).focus({ preventScroll: true });
  if (id === "correct") requestAnimationFrame(() => { chart($(".chart")); if ($(".card.in")) wires(); });
}
function back() {
  const meta = $('[data-meta="correct"]');
  if (state.tried) {
    meta.innerHTML = "ADII · <b>held the number</b>";
    const g = $(".ghost"); g.textContent = fmt(MEDIAN); g.hidden = false;   /* the correction that never happened becomes the page */
  } else if (state.left) meta.innerHTML = "ADII · <b>left it</b>";
  $(".close").hidden = false;
  show("ask");
}

$('[data-go="correct"]').addEventListener("click", () => show("correct"));
$('[data-act="correct"]').addEventListener("click", correct);
$('[data-act="leave"]').addEventListener("click", leave);
again.addEventListener("click", correct);   /* "Test my correction": the same decision, put to the same evidence; never a way around it */
$('[data-act="back"]').addEventListener("click", back);
$$('.choice[aria-disabled="true"]').forEach(b => b.addEventListener("click", e => e.preventDefault()));
$("#describe").addEventListener("submit", e => {
  e.preventDefault();
  const text = $("#mistake").value.trim(); if (!text) return;
  location.href = "mailto:contact@cytherai.com?subject=" + encodeURIComponent("The mistake we cannot afford") + "&body=" + encodeURIComponent(text);
});

chart($(".chart")); fill();
})();
