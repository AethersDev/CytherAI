/* The theme: light or dark, for the sections below the film (the film is dark in both; css/film.css). The device's
   setting decides unless the visitor has chosen with the switch (#theme), and that choice is remembered. It runs in the
   head, before the page paints, so a remembered choice never flashes the other theme. Choosing the device's own theme
   forgets the choice: the page follows the device again. DOM wiring only: under jsc it parses and returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;
const root = document.documentElement, light = matchMedia("(prefers-color-scheme: light)");
let chosen = null;
try { chosen = localStorage.getItem("theme"); } catch (e) {}   // SecurityError (storage blocked): the device decides
function apply() {
  root.dataset.theme = chosen === "light" || chosen === "dark" ? chosen : light.matches ? "light" : "dark";
  const toggle = document.getElementById("theme");
  if (toggle) toggle.setAttribute("aria-pressed", String(root.dataset.theme === "light"));
}
light.addEventListener("change", apply);
document.addEventListener("DOMContentLoaded", apply);
document.addEventListener("click", e => {
  if (!e.target.closest("#theme")) return;
  const next = root.dataset.theme === "light" ? "dark" : "light";
  chosen = next === (light.matches ? "light" : "dark") ? null : next;
  try { if (chosen) localStorage.setItem("theme", chosen); else localStorage.removeItem("theme"); } catch (e) {}   // SecurityError: this page only
  apply();
});
apply();
})();
