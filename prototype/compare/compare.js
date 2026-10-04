/* prototype/compare/compare.js — two versions, one scroll position.
   Keys 1 and 2 flip between them in place; S shows them side by side. */
(function () {
"use strict";
const frames = [...document.querySelectorAll("iframe")], btns = [...document.querySelectorAll("[data-show]")], split = document.getElementById("split");
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
