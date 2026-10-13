/* The front door: a twelve-second film, offline-rendered (tools/render-film.py), with its sentences as HTML over
   it, then three systems, each a six-second sequence (tools/render-systems.py). The film plays once, muted; reduced
   motion, a refused or failed play, a film not started within GUARD, or a film that stops advancing for STALL while the
   page is visible show the final composition and the complete statement, and stay: nothing restarts on its own, and a
   late download cannot pull the visitor back into the film. Replay is theirs. DOM wiring only: under jsc (verify.sh)
   it parses and returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;
document.documentElement.classList.remove("no-js");

const v = document.getElementById("film"), replay = document.getElementById("replay"), body = document.body;
const lines = [...document.querySelectorAll(".line")], landing = document.querySelector(".landing");
const portrait = matchMedia("(orientation: portrait)"), stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GUARD = 3000;  // ms a film or a sequence may take to start before its final frame stands in
const STALL = 2000;  // ms it may then stop advancing, while the page is visible, before its final frame stands in
let timer = 0, guard = 0, last = -1, moved = 0, started = false;

/* the poster is the film's final frame. Without a film (load false) it stands, and nothing downloads */
function source(load) {
  const p = portrait.matches;
  v.poster = p ? "film/final-portrait.jpg" : "film/final-landscape.jpg";
  if (load) v.src = p ? "film/film-portrait.mp4" : "film/film-landscape.mp4";
  else if (v.hasAttribute("src")) { v.removeAttribute("src"); v.load(); }
}
function cue(t) {
  for (const l of lines) l.classList.toggle("on", t >= +l.dataset.from && t < +l.dataset.to);
  landing.classList.toggle("on", t >= +landing.dataset.from);
}
/* an ended film keeps its last frame; one stopped short of its end gives way to the poster, the same composition */
function still(e) {
  clearInterval(timer); clearTimeout(guard); v.pause();
  if (!(e && e.type === "ended")) source(false);
  body.dataset.state = "still"; cue(Infinity); replay.hidden = false;
}
function tick() {
  const t = v.currentTime, now = performance.now();
  if (t !== last || !started || document.hidden) { last = t; moved = now; }   // a hidden page's time does not count
  else if (now - moved > STALL) { still(); return; }
  cue(t);
}
function film() {
  if (v.hasAttribute("src")) v.currentTime = 0; else source(true);
  body.dataset.state = "film"; replay.hidden = true; started = false; cue(0);
  clearInterval(timer); timer = setInterval(tick, 80);
  clearTimeout(guard); guard = setTimeout(still, GUARD);
  v.play().then(() => { clearTimeout(guard); started = true; }, still);
}
v.addEventListener("ended", still);
v.addEventListener("error", still);
replay.addEventListener("click", film);
portrait.addEventListener("change", () => { if (body.dataset.state === "still") source(false); });
if (stillMotion) { replay.textContent = "Play the film"; still(); } else film();

/* Each system's sequence plays once, from its first frame, whenever it comes into view; its poster is its final frame.
   A sequence refused, not started within GUARD, or stopped for STALL while visible rests on that poster for good. */
const seqs = [...document.querySelectorAll(".seq")], pace = new Map();
let watch = 0;
const playing = s => pace.has(s) && !s.paused && !s.ended;
/* the watch runs only while a sequence plays: it stops the moment the last one pauses or ends, so the page is settled
   when its media is */
function idle() { if (watch && !seqs.some(playing)) { clearInterval(watch); watch = 0; } }
function rest(s) { io.unobserve(s); pace.delete(s); s.pause(); s.removeAttribute("src"); s.load(); }
function look() {
  const now = performance.now();
  for (const [s, p] of pace) {
    if (s.paused || s.ended) continue;
    if (s.currentTime !== p.t || document.hidden) { p.t = s.currentTime; p.at = now; }
    else if (now - p.at > (p.started ? STALL : GUARD)) rest(s);
  }
  idle();
}
seqs.forEach(s => { s.addEventListener("pause", idle); s.addEventListener("ended", idle); });
const io = new IntersectionObserver(es => es.forEach(e => {
  const s = e.target;
  if (!e.isIntersecting) { s.pause(); return; }
  if (!s.src) s.src = s.dataset.src;
  const p = { t: -1, at: performance.now(), started: false };
  pace.set(s, p); s.currentTime = 0;
  s.play().then(() => { p.started = true; p.at = performance.now(); },
                err => { if (err.name !== "AbortError") rest(s); });   // AbortError: scrolled away before it began, not a failure
  if (!watch) watch = setInterval(look, 250);
}), { threshold: 0.5 });
if (!stillMotion) seqs.forEach(s => io.observe(s));

/* the worker. A new build's worker waits (sw.js): it may not take over a page still loading. This page's script has run,
   so it asks a waiting worker in, now or once it has installed; the next load is the new build */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(reg => {
  const letIn = w => w && w.postMessage("take-over");
  letIn(reg.waiting);
  reg.addEventListener("updatefound", () => { const w = reg.installing; w.addEventListener("statechange", () => { if (w.state === "installed") letIn(w); }); });
}).catch(() => {});   /* insecure context — run online-only */
})();
