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
const GUARD = 3000;  // ms the film may take to start before its final frame stands in (a sequence may take as long as it needs)
const STALL = 2000;  // ms it may then stop advancing, while the page is visible, before its final frame stands in
let timer = 0, guard = 0, last = -1, moved = 0, started = false, warmed = false;

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
  warm();
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

/* Each system's sequence plays once, from its first frame, whenever it comes into view, and holds its last frame, which is
   also its poster. iOS Safari downloads a clip only once it is asked to play, and buffers the whole of it before the first
   frame moves: a sequence asked on arrival sat on its last frame for seconds, as if frozen. So once the film is still the
   three are warmed in turn: each is started muted off screen and paused the moment it plays, and arrives ready. One
   sequence downloads at a time (the slot), and one in view comes first: arriving, it takes the slot from a clip warming
   off screen, which goes back in the queue, never from another in view, which it waits behind. A slow start is never a
   failure. A sequence refused, or one that has moved and then stops for STALL while visible, rests on its poster; it
   tries again the next time it comes into view. */
const seqs = [...document.querySelectorAll(".seq")], pace = new Map(), inView = new Set(), want = new Set(), tried = new Set();
let watch = 0, slot = null;
const playing = s => pace.has(s) && !s.paused && !s.ended;
/* the watch runs only while a sequence is actually playing: it starts on the `playing` event and stops the moment the
   last one pauses or ends, so the page is settled when its media is */
function idle() { if (watch && !seqs.some(playing)) { clearInterval(watch); watch = 0; } }
function load(s) { if (!s.hasAttribute("src")) { s.preload = "auto"; s.src = s.dataset.src; } }
function rest(s) { pace.delete(s); s.pause(); s.removeAttribute("src"); s.load(); }
function look() {
  const now = performance.now();
  for (const [s, p] of pace) {
    if (s.paused || s.ended) continue;
    if (s.currentTime !== p.t || document.hidden) { p.t = s.currentTime; p.at = now; }
    else if (now - p.at > STALL) rest(s);
  }
  idle();
}
seqs.forEach(s => {
  s.addEventListener("playing", () => { pace.set(s, { t: -1, at: performance.now() }); if (!watch) watch = setInterval(look, 250); });
  s.addEventListener("pause", idle); s.addEventListener("ended", idle);
});
const full = s => { const b = s.buffered; return s.hasAttribute("src") && b.length > 0 && b.end(b.length - 1) >= s.duration - 0.05; };
/* resolves once the whole clip is buffered, or it is dropped (rest, or giving way to a sequence in view) */
const whole = s => new Promise(done => {
  const check = () => {
    if (!s.hasAttribute("src") || full(s)) { s.removeEventListener("progress", check); s.removeEventListener("emptied", check); done(); }
  };
  s.addEventListener("progress", check); s.addEventListener("emptied", check); check();
});
function begin(s) {
  s.currentTime = 0;
  s.play().catch(err => { if (err.name !== "AbortError") rest(s); });   // AbortError: scrolled away before it began, not a failure
}
/* the slot goes to s: in view it plays from its first frame; off screen it warms (refused or interrupted, it tries again on arrival) */
function give(s) {
  slot = s; load(s);
  if (inView.has(s)) begin(s);
  else { tried.add(s); s.play().then(() => { if (!inView.has(s)) s.pause(); }, () => {}); }
  whole(s).then(() => { if (slot === s) slot = null; next(); });
}
/* a free slot goes to the first sequence in view still waiting for it, else, once the film is still, the next to warm */
function next() {
  if (slot) return;
  const s = seqs.find(s => want.has(s)) || (warmed && seqs.find(s => !inView.has(s) && !tried.has(s) && !full(s)));
  if (s) { want.delete(s); give(s); }
}
function warm() {
  if (stillMotion || warmed) return;   // reduced motion plays no sequence; still() runs at load then, before the sequences exist
  warmed = true; next();
}
const io = new IntersectionObserver(es => es.forEach(e => {
  const s = e.target;
  if (!e.isIntersecting) { inView.delete(s); want.delete(s); s.pause(); return; }
  inView.add(s);
  if (full(s) || slot === s) { begin(s); return; }
  if (slot && !inView.has(slot)) {   // a clip warming off screen gives way, and goes back in the queue
    const w = slot; slot = null; tried.delete(w); w.pause(); w.removeAttribute("src"); w.load();
  }
  if (slot) want.add(s); else give(s);
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
