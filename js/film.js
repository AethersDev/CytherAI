/* The front door: a twelve-second film, offline-rendered (tools/render-film.py), with its sentences as HTML over
   it; then the passage, which the scroll moves through into ADII's scene (tools/render-passage.py); then two systems,
   each a six-second sequence (tools/render-systems.py). The film plays once, muted; reduced motion, a refused or failed
   play, a film not started within GUARD, a film that falls STALL behind real time while the page is visible, or a
   visitor who scrolls on past it show the final composition and the complete statement, and stay: nothing restarts on
   its own, and a late download cannot pull the visitor back into the film. Replay is theirs. DOM wiring only: under jsc
   (verify.sh) it parses and returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;

const v = document.getElementById("film"), replay = document.getElementById("replay"), body = document.body;
const lines = [...document.querySelectorAll(".line")], landing = document.querySelector(".landing");
const portrait = matchMedia("(orientation: portrait)"), stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = new URL("../", document.currentScript.src);   // the site's root: the films and the worker are the same from ar/
const GUARD = 6000;  // ms the film may take to start before its final frame stands in: Safari starts it only once it expects to play
                     // through, about 4 s in on a 2.4–3.2 Mbit/s link (a sequence may take as long as it needs)
const STALL = 2000;  // ms the film may then fall behind real time, in all, while the page is visible, before its final frame stands
                     // in: short pauses count together (on Slow 4G they stretched its 12 s to 21). A sequence may stop this long
let timer = 0, guard = 0, last = 0, at = 0, behind = 0, started = false, warmed = false, enlisted = false;

/* the poster is the film's final frame. Without a film (load false) it stands, and nothing downloads */
function source(load) {
  const p = portrait.matches;
  v.poster = new URL(p ? "film/final-portrait.jpg" : "film/final-landscape.jpg", root).href;
  if (load) v.src = new URL(p ? "film/film-portrait.mp4" : "film/film-landscape.mp4", root).href;
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
  passage(); enlist(); scrolled();
}
function tick() {
  const t = v.currentTime, now = performance.now();
  if (started && !document.hidden) behind = Math.max(0, behind + (now - at) - (t - last) * 1000);   // a hidden page's time does not count
  last = t; at = now;
  if (behind > STALL) { still(); return; }
  cue(t);
}
function film() {
  if (v.hasAttribute("src")) v.currentTime = 0; else source(true);
  body.dataset.state = "film"; replay.hidden = true; started = false; behind = 0; last = v.currentTime; at = performance.now(); cue(0);
  clearInterval(timer); timer = setInterval(tick, 80);
  clearTimeout(guard); guard = setTimeout(still, GUARD);
  v.play().then(() => { clearTimeout(guard); started = true; }, still);
}
v.addEventListener("ended", still);
v.addEventListener("error", still);
replay.addEventListener("click", film);
portrait.addEventListener("change", () => {
  if (body.dataset.state === "still") source(false);
  if (pv.hasAttribute("src")) { rest(pv); if (body.dataset.state === "still") passage(); }   // the other orientation's
});

/* The passage: under the scroll, the film's final composition opens into ADII's scene. The scroll names a moment and the
   passage shows its frame; it is never played. Each beat holds its words where the film's sentences stood, and its moment
   while they are read (data-t: the passage's seconds when they arrive and when they leave); between beats the scene
   moves. It downloads once the film is still, ahead of the sequences, and shows once it is whole: its first frame is the
   film's last, so nothing changes where it takes over. Until then, under reduced motion, or after a failed download, the
   film's final frame stands, and past it ADII's part stands on one still of its moment, the correction waiting. */
const pv = document.getElementById("passage"), beats = [...document.querySelectorAll(".beat")];
const ADII = +document.querySelector("#adii .beat").dataset.t.split(" ")[0];
let marks = [], ready = false, pending = -1, frame = 0;
/* scroll position → the passage's seconds: from the top through each beat's hold, [its top, arrives], [it leaves, last] */
function measure() {
  marks = [[0, 0]];
  for (const b of beats) {
    const [from, to] = b.dataset.t.split(" ").map(Number), top = b.getBoundingClientRect().top + scrollY;
    marks.push([top, from], [top + b.offsetHeight - b.firstElementChild.offsetHeight, to]);
  }
}
function moment(y) {
  for (let i = 1; i < marks.length; i++) {
    const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
    if (y < y1) return t0 + (t1 - t0) * Math.max(0, y - y0) / (y1 - y0);
  }
  return marks[marks.length - 1][1];
}
/* one seek at a time: a scroll that outruns the decoder leaves only its latest moment waiting */
function seek(t) {
  if (pv.seeking) { pending = t; return; }
  pending = -1;
  if (Math.abs(pv.currentTime - t) > 0.02) pv.currentTime = t;
}
pv.addEventListener("seeked", () => { if (pending >= 0) seek(pending); });
function stand(t) {   // no passage: the film's element shows the final frame, or past it the still of ADII's moment
  const p = portrait.matches, want = new URL(t >= ADII - 0.6 ? (p ? "film/passage-portrait.jpg" : "film/passage-landscape.jpg")
    : (p ? "film/final-portrait.jpg" : "film/final-landscape.jpg"), root).href;
  if (v.poster === want) return;
  if (v.hasAttribute("src")) { v.removeAttribute("src"); v.load(); }
  v.poster = want;
}
function scrolled() {
  frame = 0;
  const y = scrollY, t = moment(y);
  if (body.dataset.state === "film" && y > innerHeight / 4) { still(); return; }   // scrolling on is past the film
  beats.forEach((b, i) => b.querySelector(".say").classList.toggle("on", y >= marks[2 * i + 1][0] - innerHeight / 10 && y <= marks[2 * i + 2][0]));
  if (body.dataset.state === "still") { if (ready) seek(t); else stand(t); }
}
addEventListener("scroll", () => { frame = frame || requestAnimationFrame(scrolled); }, { passive: true });
addEventListener("resize", () => { measure(); scrolled(); });
/* the passage downloads (asked to play and paused at once: iOS fetches a clip only then); the sequences warm after it */
function passage() {
  if (stillMotion || pv.hasAttribute("src")) return;
  const src = new URL(portrait.matches ? "film/passage-portrait.mp4" : "film/passage-landscape.mp4", root).href;
  pv.preload = "auto"; pv.src = src;
  pv.play().then(() => { if (pv.src === src) pv.pause(); },
                 err => { if (pv.src === src && err.name !== "AbortError") rest(pv); });   // refused: ADII's still stands
  whole(pv).then(() => {
    if (pv.src === src) { ready = true; body.classList.add("scrub"); scrolled(); }
    warm();
  });
}
pv.addEventListener("error", () => { rest(pv); scrolled(); });

/* Each system's sequence plays once, from its first frame, whenever it comes into view, and holds its last frame, which is
   also its poster. iOS Safari downloads a clip only once it is asked to play, and buffers the whole of it before the first
   frame moves: a sequence asked on arrival sat on its last frame for seconds, as if frozen. So once the passage is whole
   the two are warmed in turn: each is started muted off screen and paused the moment it plays, and arrives ready. One
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
function rest(s) {
  if (s === pv) { ready = false; body.classList.remove("scrub"); }
  pace.delete(s); s.pause(); s.removeAttribute("src"); s.load();
}
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
  s.addEventListener("error", () => rest(s));   // a failed download rests on its poster, and its emptied frees the slot
});
const full = s => { const b = s.buffered; return s.hasAttribute("src") && b.length > 0 && b.end(b.length - 1) >= s.duration - 0.05; };
/* resolves once the whole clip is buffered, or it is dropped (rest, or giving way to a sequence in view). A clip that
   arrives in one piece may report its progress before it is parsed, buffered still empty, and never again; its
   canplaythrough comes after the parse */
const WHOLE = ["progress", "canplaythrough", "emptied"];
const whole = s => new Promise(done => {
  const check = () => { if (!s.hasAttribute("src") || full(s)) { WHOLE.forEach(t => s.removeEventListener(t, check)); done(); } };
  WHOLE.forEach(t => s.addEventListener(t, check)); check();
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
/* a free slot goes to the first sequence in view still waiting for it, else, once the passage is whole, the next to warm */
function next() {
  if (slot) return;
  const s = seqs.find(s => want.has(s)) || (warmed && seqs.find(s => !inView.has(s) && !tried.has(s) && !full(s)));
  if (s) { want.delete(s); give(s); }
}
function warm() {
  if (stillMotion || warmed) return;   // reduced motion plays no sequence
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

/* the worker, once the film is still: its install fetches the precache past the HTTP cache (0.7 MB), which on a first
   visit would take the link from the film as it starts. A new build's worker waits (sw.js): it may not take over a page
   still loading. This page's script has run, so it asks a waiting worker in, now or once it has installed; the next load
   is the new build */
function enlist() {
  if (enlisted || !("serviceWorker" in navigator)) return;
  enlisted = true;
  navigator.serviceWorker.register(new URL("sw.js", root)).then(reg => {
    const letIn = w => w && w.postMessage("take-over");
    letIn(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; w.addEventListener("statechange", () => { if (w.state === "installed") letIn(w); }); });
  }).catch(() => {});   /* insecure context — run online-only */
}
/* the film, unless the page opens past it (an anchor, or a scroll the browser restored): that is not the visitor's moment */
measure();
if (stillMotion) { replay.textContent = replay.dataset.play; still(); }
else if (location.hash.length > 1 || scrollY > innerHeight / 4) still();
else { film(); scrolled(); }
document.fonts.ready.then(() => { measure(); scrolled(); });   // the type sets the beats' places

/* last: an engine that throws above keeps .no-js, and its CSS unveils the statement on its own */
document.documentElement.classList.remove("no-js");
})();
