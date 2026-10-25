/* Both looked flat (flat/, ar/flat.html): two blocks of lapped steel tested with optical flats under sodium light, under the
   visitor's scroll. The scroll names a moment of the sequence (tools/render-flat.py: every fringe computed) and the page
   shows its frame; it is never played. Its words fade in and out with the scroll in their windows. The sequence downloads
   whole and plays from memory, as the front door's passage does (js/film.js, which found why); until then, under reduced
   motion, or after a failed download, a still of each part stands. Nothing runs while the scroll is still. DOM wiring
   only: under jsc (verify.sh) it parses and returns. */
(function () {
"use strict";
if (typeof document === "undefined") return;

const body = document.body, scene = document.getElementById("scene");
const parts = [...document.querySelectorAll(".passage")], says = [...document.querySelectorAll(".say")];
const after = [...document.querySelectorAll("#bench, .close, .notes section, body > footer")];   // what follows the film
const portrait = matchMedia("(orientation: portrait)"), stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const media = new URL("../flat/media/", document.currentScript.src);   // the same from flat/ and from ar/
const span = e => e.dataset.t.split(" ").map(Number), FADE = 0.5;    // the words fade over half a second of the sequence
const END = span(parts[parts.length - 1])[1];   // a viewport past the sequence's end, its last frame held (css/flat.css)
let marks = [], now = 0, frame = 0, ready = false, pending = -1, wanted = "", kept = null;

/* scroll position <-> the sequence's seconds, as the front door's passage: [a stretch's top, its first], [its foot, its last] */
function measure() {
  marks = [[0, 0]];
  for (const p of parts) {
    const [from, to] = span(p), top = p.getBoundingClientRect().top + scrollY;
    marks.push([top, from], [top + p.offsetHeight, to]);
  }
}
function moment(y) {
  let i = 1;
  while (i < marks.length - 1 && y >= marks[i][0]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  return Math.min(END, t0 + (t1 - t0) * Math.max(0, y - y0) / ((y1 - y0) || 1));
}
function place(t) {
  let i = 1;
  while (i < marks.length - 1 && t > marks[i][1]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  return y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1);
}
/* one seek at a time: a scroll that outruns the decoder leaves only its latest moment waiting */
function seek(t) {
  if (scene.seeking) { pending = t; return; }
  pending = -1;
  if (Math.abs(scene.currentTime - t) > 0.02) scene.currentTime = t;
}
scene.addEventListener("seeked", () => { if (pending >= 0) seek(pending); });
/* the stills that stand in for the sequence, each until a second of it: both blocks bare, the first settled, the second
   settled, both under their glass (tools/encode-flat.py takes each from its second) */
const STILLS = [[4, "open", 0], [13, "lines", 12.5], [26, "rings", 23.5], [Infinity, "both", 32]];
function stand(t) {
  const want = new URL("still-" + STILLS.find(s => t < s[0])[1] + (portrait.matches ? "-portrait.jpg" : "-landscape.jpg"), media).href;
  if (scene.poster !== want) scene.poster = want;
}
function scrolled() {
  frame = 0;
  const t = now = moment(scrollY);
  kept = keep();
  for (const s of says) {
    const [a, b] = span(s), o = Math.max(0, Math.min(1, (t - a) / FADE, (b - t) / FADE));
    s.style.opacity = o; s.classList.toggle("on", o > 0);
  }
  if (ready) seek(Math.min(t, scene.duration)); else stand(t);
}
addEventListener("scroll", () => { frame = frame || requestAnimationFrame(scrolled); }, { passive: true });
/* a new viewport gives every stretch a new height: in the film the visitor keeps their moment, not their offset (as
   js/film.js); past it, their place in what follows: the block at the top of the view and how far into it (until 2026-10-25
   every place past the film became the film's end, the instrument's top). A change that moves nothing scrolls nothing */
function keep() {
  if (scrollY < marks[marks.length - 1][0]) return null;
  const b = after.findLast(e => e.getBoundingClientRect().top <= 0) || after[0], top = b.getBoundingClientRect().top + scrollY;
  return [b, top, scrollY - top];
}
addEventListener("resize", () => {
  const was = String(marks), k = kept;
  measure();
  if (k) { const top = k[0].getBoundingClientRect().top + scrollY; if (top !== k[1]) scrollTo(0, top + k[2]); }
  else if (String(marks) !== was) scrollTo(0, place(now));
  scrolled();
});
portrait.addEventListener("change", () => { if (wanted) { rest(); download(); } scrolled(); });
/* words bring their moment with them: when the keyboard reaches a link among them, and when an anchor names them */
const bring = s => { const [a, b] = span(s); scrollTo(0, place((a + b) / 2)); };
says.forEach(s => s.addEventListener("focusin", () => bring(s)));

/* the sequence downloads whole by a request of its own and plays from memory, asked to play and paused at once (iOS shows
   a clip's frames only then); a paused clip's own download is the browser's to defer (js/film.js, 2026-10-22) */
function download() {
  if (stillMotion || wanted) return;
  const file = wanted = new URL(portrait.matches ? "flat-portrait.mp4" : "flat-landscape.mp4", media).href;
  const mine = () => wanted === file;
  fetch(file).then(r => r.ok ? r.blob() : Promise.reject(r.status)).then(clip => {
    if (!mine()) return;
    scene.preload = "auto"; scene.src = URL.createObjectURL(clip);
    scene.addEventListener("loadeddata", () => { if (mine()) { ready = true; body.classList.add("scrub"); scrolled(); } }, { once: true });
    scene.play().then(() => { if (mine()) scene.pause(); }, err => { if (mine() && err.name !== "AbortError") { rest(); scrolled(); } });
  }, () => { if (mine()) { rest(); scrolled(); } });
}
scene.addEventListener("error", () => { if (scene.hasAttribute("src")) { rest(); scrolled(); } });
function rest() {
  const src = scene.src;
  ready = false; wanted = ""; body.classList.remove("scrub"); scene.pause(); scene.removeAttribute("src"); scene.load();
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
}

/* The instrument (#press): both flats at rest, seen from above (tools/render-flat.py plates). The visitor presses either
   glass; this page traces each pixel's ray through it to the steel, computes the reflectance of glass | silver | air gap |
   steel there from the published optical constants, for the two sodium lines, and blends the five plates Blender rendered
   at constant reflectances (so Blender's own light and tone carry the fringes). It draws only when pressed. */
const N_GLASS = 1.4585, N_STEEL = [2.93, -3.00], N_SILVER = [0.052, -3.92], COAT = 15e-9, LAMBDA = 589.3e-9;
const cx = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const cdiv = (a, b) => { const q = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / q, (a[1] * b[0] - a[0] * b[1]) / q]; };
function stack(u) {   // as tools/render-flat.py: characteristic matrices, N = n - ik, at gap phase u = 2 d / lambda
  let M = [[[1, 0], [0, 0]], [[0, 0], [1, 0]]];
  for (const [n, t] of [[N_SILVER, COAT], [[1, 0], u * LAMBDA / 2]]) {
    const dl = [2 * Math.PI * n[0] * t / LAMBDA, 2 * Math.PI * n[1] * t / LAMBDA];
    const c = [Math.cos(dl[0]) * Math.cosh(dl[1]), -Math.sin(dl[0]) * Math.sinh(dl[1])];
    const s = [Math.sin(dl[0]) * Math.cosh(dl[1]), Math.cos(dl[0]) * Math.sinh(dl[1])];
    const A = [[c, cx([0, 1], cdiv(s, n))], [cx([0, 1], cx(n, s)), c]];
    M = [[cadd(cx(M[0][0], A[0][0]), cx(M[0][1], A[1][0])), cadd(cx(M[0][0], A[0][1]), cx(M[0][1], A[1][1]))],
         [cadd(cx(M[1][0], A[0][0]), cx(M[1][1], A[1][0])), cadd(cx(M[1][0], A[0][1]), cx(M[1][1], A[1][1]))]];
  }
  const B = cadd(M[0][0], cx(M[0][1], N_STEEL)), C = cadd(M[1][0], cx(M[1][1], N_STEEL));
  const r = cdiv(cadd([N_GLASS * B[0], N_GLASS * B[1]], [-C[0], -C[1]]), cadd([N_GLASS * B[0], N_GLASS * B[1]], C));
  return r[0] * r[0] + r[1] * r[1];
}
const SHADER = `#version 300 es
precision highp float;
uniform sampler2D p0, p1, p2, p3, p4, lut;
uniform vec3 eye; uniform mat3 axes; uniform float lens, sensor, aspect, nGlass, zUnder, zTop, flatR, half_;
uniform vec2 shift, centreA, centreB; uniform vec4 stateA, stateB;
in vec2 uv; out vec4 color;
float stackR(float d, float c) {
  return 2.0 / 3.0 * texture(lut, vec2(fract(2.0 * d * c / 589.0e-9), 0.5)).r + 1.0 / 3.0 * texture(lut, vec2(fract(2.0 * d * c / 589.6e-9), 0.5)).r;
}
float gap(vec2 q, vec4 st, float bump) {
  return st.x + st.y * (q.x * cos(st.z) + q.y * sin(st.z) + 0.03) + bump * (1.0 - exp(-dot(q, q) / (2.0 * 0.014 * 0.014)));
}
void main() {
  vec3 dir = normalize(axes * vec3((uv.x - 0.5) * sensor + shift.x * sensor, (uv.y - 0.5) * sensor / aspect + shift.y * sensor, -lens));
  vec3 top = eye + dir * ((zTop - eye.z) / dir.z);                       // the glass's upper face
  vec3 inside = refract(dir, vec3(0.0, 0.0, 1.0), 1.0 / nGlass);
  vec2 under = (top + inside * ((zUnder - top.z) / inside.z)).xy;        // its silvered underside, over the steel
  float r = -1.0, c = abs(dir.z);                                         // the slab returns the ray to its own angle
  vec2 qa = under - centreA, qb = under - centreB;
  if (length(qa) < flatR && max(abs(qa.x), abs(qa.y)) < half_) r = stackR(gap(qa, stateA, 0.0), c);
  if (length(qb) < flatR && max(abs(qb.x), abs(qb.y)) < half_) r = stackR(gap(qb, stateB, 1.2e-6), c);
  vec2 t = vec2(uv.x, 1.0 - uv.y);
  vec3 a = texture(p0, t).rgb;
  if (r >= 0.0) {
    float x = clamp(r, 0.0, 1.0) * 4.0, f = fract(min(x, 3.999));
    vec3 b1 = texture(p1, t).rgb, b2 = texture(p2, t).rgb, b3 = texture(p3, t).rgb, b4 = texture(p4, t).rgb;
    a = x < 1.0 ? mix(a, b1, f) : x < 2.0 ? mix(b1, b2, f) : x < 3.0 ? mix(b2, b3, f) : mix(b3, b4, f);
  }
  color = vec4(a, 1.0);
}`;
const VERTEX = `#version 300 es
in vec2 corner; out vec2 uv;
void main() { uv = corner * 0.5 + 0.5; gl_Position = vec4(corner, 0.0, 1.0); }`;
function instrument() {
  const view = document.getElementById("press"), readout = document.getElementById("reading");
  const gl = view.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false });
  if (!gl) { body.classList.add("no-press"); return; }
  const compile = (kind, src) => { const sh = gl.createShader(kind); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADER));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { body.classList.add("no-press"); return; }   // a GPU that will not take it: the film's still
  view.addEventListener("webglcontextlost", () => body.classList.add("no-press"));                // and one that takes the context back
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, "corner"); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const U = name => gl.getUniformLocation(prog, name);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  const texture = (unit, source, w, h, data) => {
    const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
    if (data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, data ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, data ? gl.NEAREST : gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
  };
  const table = new Float32Array(2048).map((_, i) => stack((i + 0.5) / 2048));   // float textures sample nearest: 2048 steps a fringe
  fetch(new URL("plate.json", media)).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(P => Promise.all(P.plates.map(n =>
    new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no;
      im.src = new URL("plate-" + String(n).padStart(3, "0") + ".jpg", media).href; }))).then(images => {
    images.forEach((im, i) => { texture(i, im); gl.uniform1i(U("p" + i), i); });
    texture(5, null, 2048, 1, table); gl.uniform1i(U("lut"), 5);
    gl.uniform3fv(U("eye"), P.location); gl.uniformMatrix3fv(U("axes"), false, P.rotation.flat());
    gl.uniform1f(U("lens"), P.lens / 1000); gl.uniform1f(U("sensor"), P.sensor / 1000); gl.uniform1f(U("aspect"), P.width / P.height);
    gl.uniform2fv(U("shift"), P.shift); gl.uniform1f(U("nGlass"), P.n_glass); gl.uniform1f(U("zUnder"), P.under); gl.uniform1f(U("zTop"), P.top);
    gl.uniform1f(U("flatR"), P.flat_r); gl.uniform1f(U("half_"), P.half);
    gl.uniform2fv(U("centreA"), P.blocks.A); gl.uniform2fv(U("centreB"), P.blocks.B);
    /* the visitor's hand: pressed, the air film thins and the wedge closes; turned, the wedge turns. Each flat as rendered
       at rest to begin with */
    const glass = { A: { press: 1, az: P.rest.A.az, tilt: P.rest.A.tilt }, B: { press: 1, az: P.rest.B.az, tilt: P.rest.B.tilt } };
    const state = g => [1.6e-6 + (0.05e-6 - 1.6e-6) * g.press, g.tilt * (2.6 - 1.6 * g.press), g.az * Math.PI / 180];
    let held = "A", drag = null, queued = 0;
    function draw() {
      queued = 0;
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(view.clientWidth * dpr), h = Math.round(view.clientHeight * dpr);
      if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform4fv(U("stateA"), [...state(glass.A), 0]); gl.uniform4fv(U("stateB"), [...state(glass.B), 0]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const [g0, tilt] = state(glass[held]);
      readout.textContent = readout.dataset[held === "A" ? "first" : "second"] + " · " + readout.dataset.gap + " " +
        (g0 * 1e6).toFixed(2) + " µm · " + readout.dataset.wedge + " " + (tilt * 1e6).toFixed(0) + " µrad";
    }
    const ask = () => { queued = queued || requestAnimationFrame(draw); };
    view.addEventListener("pointerdown", e => {
      const box = view.getBoundingClientRect();
      held = (e.clientX - box.left) / box.width < 0.5 ? "A" : "B";
      drag = { x: e.clientX, y: e.clientY, press: glass[held].press, az: glass[held].az }; view.setPointerCapture(e.pointerId); ask();
    });
    view.addEventListener("pointermove", e => {
      if (!drag) return;
      const box = view.getBoundingClientRect(), g = glass[held];
      g.press = Math.max(0, Math.min(1, drag.press + (e.clientY - drag.y) / (box.height * 0.6)));   // down presses
      g.az = drag.az + (e.clientX - drag.x) / box.width * 180; ask();
    });
    for (const end of ["pointerup", "pointercancel"]) view.addEventListener(end, () => { drag = null; });
    view.addEventListener("keydown", e => {
      const g = glass[held], step = { ArrowDown: [0.05, 0], ArrowUp: [-0.05, 0], ArrowRight: [0, 5], ArrowLeft: [0, -5] }[e.key];
      if (e.key === "Enter" || e.key === " ") { held = held === "A" ? "B" : "A"; e.preventDefault(); ask(); return; }
      if (!step) return;
      g.press = Math.max(0, Math.min(1, g.press + step[0])); g.az += step[1]; e.preventDefault(); ask();
    });
    addEventListener("resize", ask);
    body.classList.add("pressable"); draw();
  })).catch(() => body.classList.add("no-press"));
}
/* the instrument loads once it comes near: its plates are the page's only other download */
const near = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { near.disconnect(); instrument(); } },
                                      { rootMargin: "800px 0px" });
near.observe(document.getElementById("press"));

measure();
const named = says.find(s => "#" + s.id === location.hash);
if (named) bring(named);
scrolled(); download();
document.documentElement.classList.remove("no-js");
})();
