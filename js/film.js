/* The front door: a twelve-second film, offline-rendered (tools/render-film.py), with its sentences as HTML over
   it; then the passage, which the scroll moves through the three systems' scenes and back into the film's world
   (tools/render-passage.py). The film plays once, muted; reduced motion, a refused or failed play, a film not started
   within GUARD, a film that falls STALL behind real time while the page is visible, or a visitor who scrolls on past it
   show the final composition and the complete statement, and stay: nothing restarts on its own, and a late download
   cannot pull the visitor back into the film. Replay is theirs. DOM wiring only: under jsc (verify.sh) it parses and
   returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;

const v = document.getElementById("film"), replay = document.getElementById("replay"), body = document.body;
const lines = [...document.querySelectorAll(".line")], landing = document.querySelector(".landing");
const portrait = matchMedia("(orientation: portrait)"), stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = new URL("../", document.currentScript.src);   // the site's root: the films and the worker are the same from ar/
const GUARD = 6000;  // ms the film may take to start before its final frame stands in: Safari starts it only once it expects to play
                     // through, about 4 s in on a 2.4–3.2 Mbit/s link
const STALL = 2000;  // ms the film may then fall behind real time, in all, while the page is visible, before its final frame stands
                     // in: short pauses count together (on Slow 4G they stretched its 12 s to 21)
let timer = 0, guard = 0, last = 0, at = 0, behind = 0, started = false, enlisted = false;

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
  whole(v).then(passage);   // the film whole, the passage downloads while it plays: ready by its end, not a beat after
}
v.addEventListener("ended", still);
v.addEventListener("error", still);
replay.addEventListener("click", film);
portrait.addEventListener("change", () => {
  if (body.dataset.state === "still") source(false);
  if (wanted) { rest(); if (body.dataset.state === "still") passage(); }   // the other orientation's
  scrolled();   // the moment's still, turned, until the other clip is whole
});

/* The passage: under the scroll, the film's final composition opens into ADII's scene, then AWC-OS's and CytherCAD's,
   and returns to the film's world. The scroll names a moment and the passage shows its frame; it is never played. The
   scroll moves it evenly (each stretch, .passage, is as tall as its seconds, data-t), and its words, fixed where the
   film's sentences stand, are each shown in their window of its seconds, faded in and out over FADE of them by the scroll
   itself, not by a timed transition. Past its end the scene holds its last frame, under the close. It downloads once the
   film is whole (or still), and shows once it is whole: its first frame is the film's last, so nothing changes where it
   takes over. Until then, under reduced motion, or after a failed download, the film's final frame stands, and past it
   each system's part stands on one still of its moment (STILLS), and the return on the passage's last frame. */
const pv = document.getElementById("passage"), parts = [...document.querySelectorAll(".passage")], says = [...document.querySelectorAll(".say")];
const span = e => e.dataset.t.split(" ").map(Number), FADE = 0.25;
const ADII = span(document.getElementById("adii"))[0];
let marks = [], ready = false, pending = -1, frame = 0, now = 0;   // now: the moment the scroll last named
/* scroll position ↔ the passage's seconds: from the top through each stretch, [its top, its first], [its foot, its last] */
function measure() {
  marks = [[0, 0]];
  for (const p of parts) {
    const [from, to] = span(p), top = p.getBoundingClientRect().top + scrollY;
    marks.push([top, from], [top + p.offsetHeight, to]);
  }
}
function moment(y) {   // past the last stretch, on at its pace
  let i = 1;
  while (i < marks.length - 1 && y >= marks[i][0]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  return t0 + (t1 - t0) * Math.max(0, y - y0) / ((y1 - y0) || 1);
}
function place(t) {   // moment's inverse: the scroll that names t, past the last stretch on at its pace
  let i = 1;
  while (i < marks.length - 1 && t > marks[i][1]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  return y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1);
}
/* one seek at a time: a scroll that outruns the decoder leaves only its latest moment waiting */
function seek(t) {
  if (pv.seeking) { pending = t; return; }
  pending = -1;
  if (Math.abs(pv.currentTime - t) > 0.02) pv.currentTime = t;
}
pv.addEventListener("seeked", () => { if (pending >= 0) seek(pending); });
/* the still that stands until each second, by orientation: each changes between two systems' words, never under them */
const STILLS = [[ADII - 0.6, "film/final-landscape.jpg", "film/final-portrait.jpg"],
  [12.9, "film/passage-adii-landscape.jpg", "film/passage-adii-portrait.jpg"],
  [15.75, "film/passage-awcos-landscape.jpg", "film/passage-awcos-portrait.jpg"],
  [21.5, "film/passage-cad-landscape.jpg", "film/passage-cad-portrait.jpg"],
  [Infinity, "film/passage-close-landscape.jpg", "film/passage-close-portrait.jpg"]];
function stand(t) {   // no passage: the film's element shows the still of the moment
  const [, l, p] = STILLS.find(s => t < s[0]), want = new URL(portrait.matches ? p : l, root).href;
  if (v.poster === want) return;
  if (v.hasAttribute("src")) { v.removeAttribute("src"); v.load(); }
  v.poster = want;
}
function scrolled() {
  frame = 0;
  const y = scrollY, t = now = moment(y);
  if (body.dataset.state === "film" && y > innerHeight / 4) { still(); return; }   // scrolling on is past the film
  for (const s of says) {
    const [a, b] = span(s), o = Math.max(0, Math.min(1, (t - a) / FADE, (b - t) / FADE));
    s.style.opacity = o; s.classList.toggle("on", o > 0);
  }
  if (body.dataset.state === "still") { if (ready) seek(Math.min(t, marks[marks.length - 1][1])); else stand(t); }
}
addEventListener("scroll", () => { frame = frame || requestAnimationFrame(scrolled); }, { passive: true });
/* a new viewport (a phone turned, a window resized) gives every stretch a new height, and the same offset names another
   moment: the visitor keeps their moment, not their offset (until 2026-10-22 a turned window landed past the passage).
   A change that moves no stretch (svh: a phone's bars coming and going as it scrolls) moves nothing */
addEventListener("resize", () => { const was = String(marks); measure(); if (String(marks) !== was) scrollTo(0, place(now)); scrolled(); });
/* words bring their moment with them, the scroll to the middle of their window: when a link among them is reached by the
   keyboard, and when an anchor names them (a room's way back, ../#adii-evidence: the words that led to it) */
const bring = s => { const [a, b] = span(s); scrollTo(0, place((a + b) / 2)); };
says.forEach(s => s.addEventListener("focusin", () => bring(s)));
/* the passage downloads whole by a request of its own, and the video plays it from memory. Asked of the video element, a
   paused clip's download is the browser's to defer: Chrome left one at 17.7 of its 25 s (2026-10-22), it never became
   whole, and the stills stood for good. Asked to play and paused at once, as iOS shows a clip's frames only then */
let wanted = "";   // the clip asked for, until it is dropped
function passage() {
  if (stillMotion || wanted) return;
  const file = wanted = new URL(portrait.matches ? "film/passage-portrait.mp4" : "film/passage-landscape.mp4", root).href;
  const mine = () => wanted === file;
  fetch(file).then(r => r.ok ? r.blob() : Promise.reject(r.status)).then(clip => {
    if (!mine()) return;
    pv.preload = "auto"; pv.src = URL.createObjectURL(clip);
    pv.addEventListener("loadeddata", () => { if (mine()) { ready = true; body.classList.add("scrub"); scrolled(); } }, { once: true });
    pv.play().then(() => { if (mine()) pv.pause(); },
                   err => { if (mine() && err.name !== "AbortError") { rest(); scrolled(); } });   // refused: the stills stand
  }, () => { if (mine()) { rest(); scrolled(); } });   // not downloaded: the stills stand
}
pv.addEventListener("error", () => { rest(); scrolled(); });
function rest() {
  const src = pv.src;
  ready = false; wanted = ""; body.classList.remove("scrub"); pv.pause(); pv.removeAttribute("src"); pv.load();
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
}

const full = s => { const b = s.buffered; return s.hasAttribute("src") && b.length > 0 && b.end(b.length - 1) >= s.duration - 0.05; };
/* resolves once the whole film is buffered, or it is dropped (stopped short of its end): the passage then downloads. A
   film plays, so the browser buffers it on; this is not asked of a paused clip. A clip that arrives in one piece may
   report its progress before it is parsed, buffered still empty, and never again; its canplaythrough comes after the parse */
const WHOLE = ["progress", "canplaythrough", "emptied"];
const whole = s => new Promise(done => {
  const check = () => { if (!s.hasAttribute("src") || full(s)) { WHOLE.forEach(t => s.removeEventListener(t, check)); done(); } };
  WHOLE.forEach(t => s.addEventListener(t, check)); check();
});
/* the worker, once the film is still: its install fetches the precache past the HTTP cache (1.3 MB), which on a first
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
/* the film, unless the page opens past it (an anchor, a scroll the browser restored, or a return through the history,
   which restores even the top: Chrome without its back-forward cache replayed the film to a visitor back from the
   contact page): that is not the visitor's moment. A reload or a return keeps the scroll the browser restores */
const how = (performance.getEntriesByType("navigation")[0] || {}).type, named = says.find(s => "#" + s.id === location.hash);
measure();
if (named && how !== "reload" && how !== "back_forward") bring(named);
if (stillMotion) { replay.textContent = replay.dataset.play; still(); }
else if (location.hash.length > 1 || scrollY > innerHeight / 4 || how === "back_forward") still();
else { film(); scrolled(); }

/* last: an engine that throws above keeps .no-js, and its CSS unveils the statement on its own */
document.documentElement.classList.remove("no-js");
})();
