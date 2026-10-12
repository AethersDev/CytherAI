/* The front door: a twelve-second film, offline-rendered (tools/render-film.py), with its sentences as HTML over
   it, then three systems, each a six-second sequence (tools/render-systems.py). The film plays once, muted; reduced
   motion, a refused or failed play, or a film not started within GUARD show the final composition and the complete
   statement at once. Nothing restarts on its own. DOM wiring only: under jsc (verify.sh) it parses and returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;
document.documentElement.classList.remove("no-js");

const v = document.getElementById("film"), replay = document.getElementById("replay"), body = document.body;
const lines = [...document.querySelectorAll(".line")], landing = document.querySelector(".landing");
const portrait = matchMedia("(orientation: portrait)"), stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GUARD = 3000;  // ms the film may take to start before the still composition stands in
let timer = 0, guard = 0;

function source() {
  const p = portrait.matches;
  v.poster = p ? "film/final-portrait.jpg" : "film/final-landscape.jpg";
  v.src = p ? "film/film-portrait.mp4" : "film/film-landscape.mp4";
}
function cue(t) {
  for (const l of lines) l.classList.toggle("on", t >= +l.dataset.from && t < +l.dataset.to);
  landing.classList.toggle("on", t >= +landing.dataset.from);
}
function still() {
  clearInterval(timer); clearTimeout(guard); v.pause();
  body.dataset.state = "still"; cue(Infinity); replay.hidden = false;
}
function film() {
  body.dataset.state = "film"; replay.hidden = true; cue(0);
  clearInterval(timer); timer = setInterval(() => cue(v.currentTime), 80);
  clearTimeout(guard); guard = setTimeout(still, GUARD);
  v.play().then(() => clearTimeout(guard), still);
}
source();
v.addEventListener("ended", still);
v.addEventListener("error", still);
replay.addEventListener("click", () => { v.currentTime = 0; film(); });
portrait.addEventListener("change", () => { if (body.dataset.state === "still") source(); });
if (stillMotion) { replay.textContent = "Play the film"; still(); } else film();

/* Each system's sequence plays once, from its first frame, whenever it comes into view; its poster is its final frame,
   so a refused play or reduced motion shows the consequence at once. */
const io = new IntersectionObserver(es => es.forEach(e => {
  const s = e.target;
  if (!e.isIntersecting) { s.pause(); return; }
  if (!s.src) s.src = s.dataset.src;
  s.currentTime = 0; s.play().catch(() => s.load());   // refused: back to the poster
}), { threshold: 0.5 });
if (!stillMotion) document.querySelectorAll(".seq").forEach(s => io.observe(s));

/* the worker. A new build's worker waits (sw.js): it may not take over a page still loading. This page's script has run,
   so it asks a waiting worker in, now or once it has installed; the next load is the new build */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(reg => {
  const letIn = w => w && w.postMessage("take-over");
  letIn(reg.waiting);
  reg.addEventListener("updatefound", () => { const w = reg.installing; w.addEventListener("statechange", () => { if (w.state === "installed") letIn(w); }); });
}).catch(() => {});   /* insecure context — run online-only */
})();
