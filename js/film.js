/* Nightfall plays once behind the statement, at the head of the page. The rest of the page is the page's own: nothing here moves it. */
(function () {
"use strict";
if (typeof document === "undefined") return;

const v = document.getElementById("film"), replay = document.getElementById("replay"), body = document.body, stage = v.parentElement;
const portrait = matchMedia("(orientation: portrait)");
/* a visitor who asks to save data, whom the browser calls 2G or whose link it estimates under 1 Mbit/s gets the still and no
   worker: under 1 MB, not 4 (Chromium alone reports these). Never "3g" by itself: Chrome reported it, rtt 400, on a loopback
   server with nothing to estimate from, and to the audit of 2026-11-05 on a link that played the film, but it reported it
   at 50 kbit/s too. The estimate tells them apart: loopback 1.5, Slow 4G 1.3, Fast 3G 1.65; Slow 3G 0.4, 2G 0.05 (2026-11-06,
   throttled). Above it the film's own GUARD and STALL measure what the link does */
const link = navigator.connection || {}, lean = link.saveData || /2g/.test(link.effectiveType) || link.downlink < 1;
const stillMotion = lean || matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = new URL("../", document.currentScript.src);   // the site's root: the films and the worker are the same from ar/
const GUARD = 6000;  // ms the film may take to start before its final frame stands in: Safari starts it only once it expects to play
                     // through, about 4 s in on a 2.4–3.2 Mbit/s link
const STALL = 2000;  // ms the film may then fall behind real time, in all, while the page is visible, before its final frame stands
                     // in: short pauses count together (on Slow 4G they stretched its 12 s to 21)
let timer = 0, guard = 0, last = 0, at = 0, behind = 0, started = false, enlisted = false;

/* the poster is the frame the visitor is about to see: the film's first until it plays (until 2026-11-25 its last, so the
   film's ending showed for a moment before its opening), its last when it will not play, and then nothing downloads */
function source(load) {
  const p = portrait.matches;
  v.poster = new URL(load ? (p ? "film/nightfall-portrait-open.jpg" : "film/nightfall-landscape-open.jpg")
                          : (p ? "film/nightfall-portrait.jpg" : "film/nightfall-landscape.jpg"), root).href;
  if (load) v.src = new URL(p ? "film/nightfall-portrait.mp4" : "film/nightfall-landscape.mp4", root).href;
  else if (v.hasAttribute("src")) { v.removeAttribute("src"); v.load(); }
}
/* an ended film keeps its last frame; one stopped short of its end gives way to the poster, the same composition */
function still(e) {
  clearInterval(timer); clearTimeout(guard); v.pause();
  if (!(e && e.type === "ended")) source(false);
  body.dataset.state = "still"; replay.hidden = false;
  enlist();
}
function tick() {
  const t = v.currentTime, now = performance.now();
  if (started && !document.hidden) behind = Math.max(0, behind + (now - at) - (t - last) * 1000);   // a hidden page's time does not count
  last = t; at = now;
  if (behind > STALL) still();
}
function film() {
  if (v.hasAttribute("src")) v.currentTime = 0; else source(true);
  body.dataset.state = "film"; replay.hidden = true; started = false; behind = 0; last = v.currentTime; at = performance.now();
  clearInterval(timer); timer = setInterval(tick, 80);
  clearTimeout(guard); guard = setTimeout(still, GUARD);
  v.play().then(() => { clearTimeout(guard); started = true; }, still);
}
v.addEventListener("ended", still);
v.addEventListener("error", still);
replay.addEventListener("click", film);
portrait.addEventListener("change", () => { if (body.dataset.state === "still") source(false); });
/* a visitor who has read past it is done with it: it plays on while any of it shows under the header, and never out of view */
new IntersectionObserver(([e]) => { if (!e.isIntersecting && body.dataset.state === "film") still(); },
                         { rootMargin: -document.querySelector(".bar").offsetHeight + "px 0px 0px" }).observe(stage);

/* the worker, once the film is still: its install fetches the precache past the HTTP cache (0.7 MB), which on a first
   visit would take the link from the film as it starts. A new build's worker waits (sw.js): it may not take over a page
   still loading. This page's script has run, so it asks a waiting worker in, now or once it has installed; the next load
   is the new build */
function enlist() {
  if (enlisted || lean || !("serviceWorker" in navigator)) return;
  enlisted = true;
  navigator.serviceWorker.register(new URL("sw.js", root)).then(reg => {
    const letIn = w => w && w.postMessage("take-over");
    letIn(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; w.addEventListener("statechange", () => { if (w.state === "installed") letIn(w); }); });
  }).catch(() => {});   /* insecure context — run online-only */
}
/* the film, unless the page opens past it (an anchor, a scroll the browser restored, or a return through the history,
   which restores even the top: Chrome without its back-forward cache replayed the film to a visitor back from the
   contact page): that is not the visitor's moment */
const how = (performance.getEntriesByType("navigation")[0] || {}).type;
if (stillMotion) { replay.textContent = replay.dataset.play; still(); }
else if (location.hash.length > 1 || scrollY > innerHeight / 4 || how === "back_forward") still();
else film();

/* last: an engine that throws above keeps .no-js, and its CSS shows the film's last frame */
document.documentElement.classList.remove("no-js");
})();
