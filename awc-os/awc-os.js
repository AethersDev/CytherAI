/* AWC-OS gateway — the language toggle, moved out of an inline script so the page runs
   under script-src 'self'. Arabic is the default; the callout carries markup. */
(function () {
"use strict";
function setLang(l) {
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  for (const b of ["ar", "en"]) {   // the pressed state is said, not only shown
    const button = document.getElementById("btn-" + b);
    button.classList.toggle("on", l === b);
    button.setAttribute("aria-pressed", String(l === b));
  }
  document.querySelectorAll("[data-ar]").forEach(e => {
    if (e.classList.contains("callout")) e.innerHTML = e.dataset[l];
    else e.textContent = e.dataset[l];
  });
}
document.getElementById("btn-ar").addEventListener("click", () => setLang("ar"));
document.getElementById("btn-en").addEventListener("click", () => setLang("en"));
setLang("ar");
/* a missing film hides the grid instead of showing two broken players */
document.getElementById("vidgrid").addEventListener("error", e => {
  if (e.target.tagName === "VIDEO") document.getElementById("vidgrid").style.display = "none";
}, true);
})();
