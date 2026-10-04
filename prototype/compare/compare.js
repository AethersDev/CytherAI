/* prototype/compare/compare.js — two versions, one scroll position.
   Keys 1 and 2 flip between them in place; S shows them side by side. */
(function () {
"use strict";
/* which two: ?2,4 compares version 2 with version 4; no query, 1 with 2 */
const PAGES = { 1: "../unhappened/", 2: "../unhappened-2/", 3: "v3.html", 4: "../unhappened-4/" }, pair = (location.search.match(/^\?([1-4]),([1-4])$/) || [0, "1", "2"]).slice(1);
const frames = [...document.querySelectorAll("iframe")], btns = [...document.querySelectorAll(".bar [data-show]")], split = document.getElementById("split");
frames.forEach((f, i) => { f.src = PAGES[pair[i]]; f.title = "THE UNHAPPENED, version " + pair[i]; });
btns.forEach((b, i) => { b.lastChild.textContent = "Version " + pair[i]; });
function show(k) { document.body.dataset.show = k; btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.show === k))); }
btns.forEach(b => b.addEventListener("click", () => show(b.dataset.show)));
split.addEventListener("click", () => split.setAttribute("aria-pressed", String(document.body.classList.toggle("split"))));
const key = e => { if (e.key === "1" || e.key === "2") show(e.key); else if (e.key === "s" || e.key === "S") split.click(); };
addEventListener("keydown", key);
/* whichever page you scroll leads; the other follows to the same place until the leader rests */
let leader = -1, rest = 0;
function bind(f, i) {
  const w = f.contentWindow;
  w.addEventListener("keydown", key);
  w.addEventListener("scroll", () => {
    if (leader !== -1 && leader !== i) return;
    leader = i; frames[1 - i].contentWindow.scrollTo({ top: w.scrollY, behavior: "instant" });
    clearTimeout(rest); rest = setTimeout(() => { leader = -1; }, 150);
  }, { passive: true });
}
/* a frame may finish loading before this script runs */
frames.forEach((f, i) => f.contentDocument && f.contentDocument.readyState === "complete" && f.contentWindow.location.href !== "about:blank" ? bind(f, i) : f.addEventListener("load", () => bind(f, i), { once: true }));
})();
