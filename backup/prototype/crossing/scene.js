/* ============================================================================
   prototype/crossing/scene.js — THE CROSSING, rendered.
   One WebGL2 scene behind one scrolling story. The glass is the boundary: beneath
   it the proposers' tokens rise and are judged where they strike; a program the
   boundary and the kernel both admit rises through it as a solid — blue while the
   kernel checks it, white once verified. The sky is the seal: dsinOrbit(CANON),
   lifted by its own recurrence. Every mark is an engine event or a manifest
   projection; nothing on the canvas is decoration.
   ============================================================================ */
(function () {
"use strict";
if (typeof document === "undefined") return;
const CM = window.CytherManifest, CI = window.CytherInstrument, CX = window.CytherCrossing;
const MOBILE = matchMedia("(max-width: 760px)").matches;
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SEEDS = 40, FIELD = 190, PLANE = 206, WARM = 30000, TRAVEL = 0.7, GROW = 1.6;
const RATE = CALM ? 60 : MOBILE ? 240 : 420;            /* proposals judged per second */
const FOG = [0.035, 0.047, 0.085], FOGD = 0.0012;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ================= matrices (column-major) ================= */
function persp(fov, a, n, f, sx, sy) {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
  return new Float32Array([t / a,0,0,0, 0,t,0,0, -sx,-sy,(f + n) * nf,-1, 0,0,2 * f * n * nf,0]);
}
function look(e, c) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;   /* up = +y */
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
    -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
}
function mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
  return o;
}
function inv(a) {
  const [a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33] = a;
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10, b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
        b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30, b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  const d = 1 / (b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);
  return new Float32Array([
    (a11*b11-a12*b10+a13*b09)*d, (a02*b10-a01*b11-a03*b09)*d, (a31*b05-a32*b04+a33*b03)*d, (a22*b04-a21*b05-a23*b03)*d,
    (a12*b08-a10*b11-a13*b07)*d, (a00*b11-a02*b08+a03*b07)*d, (a32*b02-a30*b05-a33*b01)*d, (a20*b05-a22*b02+a23*b01)*d,
    (a10*b10-a11*b08+a13*b06)*d, (a01*b08-a00*b10-a03*b06)*d, (a30*b04-a31*b02+a33*b00)*d, (a21*b02-a20*b04-a23*b00)*d,
    (a11*b07-a10*b09-a12*b06)*d, (a00*b09-a01*b07+a02*b06)*d, (a31*b01-a30*b03-a32*b00)*d, (a20*b03-a21*b01+a22*b00)*d]);
}
const xf = (m, x, y, z) => [m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13], m[2]*x + m[6]*y + m[10]*z + m[14], m[3]*x + m[7]*y + m[11]*z + m[15]];

/* ================= shaders ================= */
const HEAD = "#version 300 es\nprecision highp float;\n";
const VIEW = "uniform mat4 uVP; uniform vec3 uEye; uniform float uTime, uFogD, uPx; uniform vec2 uRes; uniform vec3 uFog;\n";
const HIDE = "gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.;";
const FULL = `out vec2 vUV; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

const SRC = {
  sky: [FULL, `in vec2 vUV; uniform mat4 uInvVP; uniform vec3 uEye, uFog; out vec4 o;
    void main(){
      vec4 w = uInvVP * vec4(vUV * 2. - 1., 1., 1.); vec3 d = normalize(w.xyz / w.w - uEye); float y = d.y;
      vec3 c = y > 0. ? mix(uFog, vec3(.006,.009,.02), smoothstep(0., .5, y)) : mix(uFog, vec3(.002,.003,.008), smoothstep(0., -.4, y));
      c += vec3(.3,.4,.85) * exp(-abs(y) * 120.) * .08;
      o = vec4(c, 1.);
    }`],

  seal: [VIEW + `layout(location=0) in vec4 aP; uniform mat4 uSky; uniform float uA; out vec3 vC;
    void main(){
      gl_Position = uVP * (uSky * vec4(aP.xyz, 1.)); gl_PointSize = max(1., uPx * 1.25);
      vC = mix(vec3(.13,.21,.78) * 1.7, vec3(.85,.9,1.) * 1.2, aP.w) * uA;
    }`, `in vec3 vC; out vec4 o; void main(){ o = vec4(vC, 1.); }`],

  solid: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aI; layout(location=3) in float aId;
    uniform float uGrow, uMirror;
    out vec3 vN, vW; out float vY, vH, vAge; flat out float vId;
    void main(){
      float age = uTime - aI.w, g = clamp(age / uGrow, 0., 1.); g = 1. - pow(1. - g, 3.);
      float y = aP.y * aI.z * g;
      vW = vec3(aP.x + aI.x, y * uMirror, aP.z + aI.y); vN = vec3(aN.x, aN.y * uMirror, aN.z);
      vY = y; vH = aI.z * g; vAge = age; vId = aId;
      gl_Position = uVP * vec4(vW, 1.);
    }`, `in vec3 vN, vW; in float vY, vH, vAge; flat in float vId; uniform vec3 uEye, uFog; uniform float uFogD, uGrow, uMirror, uHover; out vec4 o;
    void main(){
      vec3 N = normalize(vN), L = normalize(vec3(.62, .74, .26));
      float dif = max(dot(N, L), 0.), back = max(dot(N, normalize(vec3(-.3, .25, .9))), 0.), ao = mix(.5, 1., smoothstep(0., 5., vY));
      vec3 c = vec3(.96,.97,1.) * (.12 + .86 * dif + .3 * back + .1 * max(N.y, 0.)) * ao;
      c += vec3(.22,.34,1.) * .2 * (1. - smoothstep(0., 2.5, vY));
      float s = (vAge - uGrow) / 1.1;                       /* the kernel's pass, after the rise */
      if (s < 1.2) {
        c = mix(vec3(.16,.27,.95) * (.6 + .7 * dif), c, smoothstep(0., 1., s));
        c += vec3(.55,.66,1.) * 3. * exp(-pow((vY - clamp(s, 0., 1.) * vH) / .3, 2.)) * step(0., s) * step(s, 1.);
      }
      if (abs(vId - uHover) < .5) c = mix(c, vec3(.42,.56,1.) * 1.5, .4);
      float f = 1. - exp(-length(vW - uEye) * uFogD);
      if (uMirror < 0.) { o = vec4(mix(c * .55, uFog, f), .34 * exp(-vY * .1) * (1. - f)); return; }
      o = vec4(mix(c, uFog, f), 1.);
    }`],

  edge: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec4 aI; uniform float uGrow; out vec4 vC;
    void main(){
      float age = uTime - aI.w, g = clamp(age / uGrow, 0., 1.); g = 1. - pow(1. - g, 3.);
      vec3 w = vec3(aP.x + aI.x, aP.y * aI.z * g, aP.z + aI.y); gl_Position = uVP * vec4(w, 1.);
      vec3 c = mix(vec3(.5,.64,1.) * 2.2, vec3(.93,.95,1.), clamp((age - uGrow) / 1.1, 0., 1.));
      vC = vec4(c, .6 * exp(-length(w - uEye) * uFogD));
    }`, `in vec4 vC; out vec4 o; void main(){ o = vC; }`],

  wall: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; uniform float uTop; out vec3 vW, vN;
    void main(){ vW = vec3(aP.x, mix(-120., uTop, aP.y), aP.z); vN = aN; gl_Position = uVP * vec4(vW, 1.); }`,
    `in vec3 vW, vN; uniform vec3 uEye, uFog; uniform float uFogD, uTop; out vec4 o;
    void main(){
      vec3 N = normalize(vN); float dif = max(dot(N, normalize(vec3(.62,.74,.26))), 0.);
      vec3 c = vec3(.028,.036,.058) * (.7 + .8 * dif);
      float q = (vW.x + vW.y + vW.z) / 5., dq = abs(fract(q + .5) - .5) / fwidth(q);
      c += vec3(.06,.08,.15) * (1. - smoothstep(.5, 1.5, dq));          /* the section hatch */
      c += vec3(.5,.62,1.) * (1. - smoothstep(0., 1.2, uTop - vW.y)) * 1.4;
      o = vec4(mix(c, uFog, 1. - exp(-length(vW - uEye) * uFogD)), 1.);
    }`],

  glass: [VIEW + `layout(location=0) in vec2 aP; uniform float uSize; out vec3 vW;
    void main(){ vW = vec3(aP.x * uSize, 0., aP.y * uSize); gl_Position = uVP * vec4(vW, 1.); }`,
    `in vec3 vW; uniform vec3 uEye, uFog; uniform float uFogD, uSize; out vec4 o;
    float lines(vec2 p, float s){ vec2 d = abs(fract(p / s + .5) - .5) * s, fw = fwidth(p); vec2 m = 1. - smoothstep(fw * .5, fw * 1.5, d); return max(m.x, m.y); }
    void main(){
      vec3 V = normalize(uEye - vW); bool above = uEye.y > 0.;
      float fres = pow(1. - abs(V.y), 4.), fog = exp(-length(vW - uEye) * uFogD);
      float edge = 1. - smoothstep(.86, 1., max(abs(vW.x), abs(vW.z)) / uSize);
      float a = (above ? mix(.66, .95, fres) : mix(.16, .5, fres)) * edge;
      vec3 tint = above ? vec3(.010,.015,.030) : vec3(.04,.06,.12);
      vec3 g = vec3(.5,.62,1.) * lines(vW.xz + 7., 14.) * (above ? .028 : 0.) * fog * edge;
      o = vec4(mix(uFog, tint, fog) * a + uFog * fres * .6 * a + g, a);
    }`],

  beam: [VIEW + `layout(location=0) in vec2 aQ; layout(location=1) in vec3 aA; layout(location=2) in vec3 aB; layout(location=3) in vec4 aC; layout(location=4) in vec4 aT;
    out vec3 vC; out float vS, vL; flat out float vM;
    void main(){
      vec3 a = aA, b = aB; float k = 1., m = aT.w;
      if (m > .5) {
        float s = (uTime - aT.x) / aT.y;
        if (s < 0. || s > 1.) { ${HIDE} return; }
        if (m < 1.5) { float e = s * s, e0 = max(0., s - .2); a = mix(aA, aB, e0 * e0); b = mix(aA, aB, e); k = smoothstep(0., .15, s); }
        else { vec3 dy = vec3(0., -30. * s * s - 3. * s, 0.); a += dy; b += dy; k = (1. - s) * (1. - s); }
      }
      vec4 ca = uVP * vec4(a, 1.), cb = uVP * vec4(b, 1.);
      if (ca.w < .5 || cb.w < .5) { ${HIDE} return; }
      vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; float l = length(d);
      vec2 t = l > 1e-3 ? d / l : vec2(1., 0.), n = vec2(-t.y, t.x);
      vec4 c = mix(ca, cb, aQ.x); float w = aT.z * uPx;
      c.xy += (n * aQ.y * w + t * (aQ.x * 2. - 1.) * w * .5) / uRes * 2. * c.w;
      gl_Position = c;
      vC = aC.rgb * aC.a * k * exp(-length(mix(a, b, aQ.x) - uEye) * uFogD); vS = aQ.y; vL = aQ.x; vM = m;
    }`, `in vec3 vC; in float vS, vL; flat in float vM; out vec4 o;
    void main(){ float g = 1. - vS * vS; o = vec4(vC * g * g * (vM > .5 && vM < 1.5 ? vL : 1.), 1.); }`],

  spark: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec3 aV; layout(location=2) in vec2 aT; out vec3 vC;
    void main(){
      float age = uTime - aT.x, s = age / aT.y;
      if (s < 0. || s > 1.) { ${HIDE} return; }
      vec3 p = aP + aV * age + vec3(0., -14. * age * age, 0.); vec4 c = uVP * vec4(p, 1.);
      gl_Position = c; gl_PointSize = clamp(uPx * 70. / c.w, uPx, 5. * uPx);
      vC = vec3(.32,.46,1.) * 2.4 * (1. - s) * exp(-length(p - uEye) * uFogD);
    }`, `in vec3 vC; out vec4 o; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float g = max(0., 1. - dot(q, q)); o = vec4(vC * g * g, 1.); }`],

  ripple: [VIEW + `layout(location=0) in vec2 aQ; layout(location=1) in vec4 aR; out vec2 vQ, vP; out float vS, vF; flat out float vK;
    void main(){
      float s = (uTime - aR.z) / (aR.w > 1.5 ? 1.6 : 1.1);
      if (s < 0. || s > 1.) { ${HIDE} return; }
      float R = aR.w > 1.5 ? 10. : aR.w > .5 ? 3.4 : 1.8;
      vec3 w = vec3(aR.x + aQ.x * R, uEye.y > 0. ? .03 : -.03, aR.y + aQ.y * R);
      vQ = aQ; vP = w.xz; vS = s; vK = aR.w; vF = exp(-length(w - uEye) * uFogD); gl_Position = uVP * vec4(w, 1.);
    }`, `in vec2 vQ, vP; in float vS, vF; flat in float vK; out vec4 o;
    void main(){
      float d = length(vQ), r = exp(-pow((d - vS) / .08, 2.)) * pow(1. - vS, 2.), core = exp(-d * d * 28.) * pow(1. - vS, 5.);
      vec2 g = abs(fract(vP + .5) - .5), fw = fwidth(vP), m = 1. - smoothstep(fw * .5, fw * 1.5, g);
      float lat = max(m.x, m.y) * (1. - smoothstep(.15, 1., d)) * (1. - vS) * .55;   /* the grammar's lattice, where it was tested */
      vec3 c = vK < .5 ? vec3(.55,.62,.85) * .35 : vK < 1.5 ? vec3(.2,.34,1.) * 2.4 : vec3(.9,.94,1.) * 2.6;
      o = vec4(c * (r + core * 2. + lat) * vF, 1.);
    }`],

  bright: [FULL, `in vec2 vUV; uniform sampler2D uT; uniform vec2 uTx; uniform float uThr; out vec4 o;
    void main(){
      vec3 s = texture(uT, vUV + uTx * vec2(-1., -1.)).rgb + texture(uT, vUV + uTx * vec2(1., -1.)).rgb
             + texture(uT, vUV + uTx * vec2(-1., 1.)).rgb + texture(uT, vUV + uTx * vec2(1., 1.)).rgb;
      s *= .25; float l = max(s.r, max(s.g, s.b)); o = vec4(s * max(l - uThr, 0.) / max(l, 1e-4), 1.);
    }`],

  blur: [FULL, `in vec2 vUV; uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
    void main(){
      const float W[5] = float[](.227027, .1945946, .1216216, .054054, .016216);
      vec3 c = texture(uT, vUV).rgb * W[0];
      for (int i = 1; i < 5; i++) { vec2 d = uDir * float(i); c += (texture(uT, vUV + d).rgb + texture(uT, vUV - d).rgb) * W[i]; }
      o = vec4(c, 1.);
    }`],

  final: [FULL, `in vec2 vUV; uniform sampler2D uScene, uBloom; uniform float uTime; out vec4 o;
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    void main(){
      vec3 c = aces((texture(uScene, vUV).rgb + texture(uBloom, vUV).rgb * .95) * 1.18);
      vec2 q = vUV - .5; c *= 1. - dot(q, q) * .6;
      c += (fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 97., vec2(12.9898, 78.233))) * 43758.5453) - .5) * .012;
      o = vec4(c, 1.);
    }`],
};

/* ================= the world, as its events arrive ================= */
const world = CX.world(SEEDS, FIELD);
const tally = { prop: 0, rej: 0, adm: 0, inv: 0, why: {} };
const paths = new Map();                  /* proposer seed → world vertices of its open attempt */
const queue = []; let qi = 0;             /* events in flight: they land TRAVEL seconds after they are judged */
const at = (plot, p) => [plot.x + p.x - CX.O, plot.z + p.y - CX.O];
let jit = 7; const jitter = () => { jit = (Math.imul(jit, 1664525) + 1013904223) >>> 0; return (jit >>> 8) / 16777216; };

const canvas = $("#world");
const gl = canvas && canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
if (!gl) document.documentElement.classList.add("no-gl");

let R = null;                              /* GPU state, when there is a GPU */
if (gl) R = gpu();

function apply(o, now, live) {
  const { ev } = o; tally.prop++;
  let path = paths.get(o.seed);
  if (!path) paths.set(o.seed, path = [at(o.plot, { x: CX.O, y: CX.O })]);
  const tip = at(o.plot, ev.from);
  if (ev.e === "ok") { path.push(at(o.plot, ev.to)); if (live && R) R.ripple(tip[0], tip[1], now, 0); return; }
  if (ev.e === "rej") {
    tally.rej++; tally.why[ev.why] = (tally.why[ev.why] || 0) + 1;
    if (live && R) { R.ripple(tip[0], tip[1], now, 1); R.sparks(tip[0], tip[1], now); tag(tip[0], tip[1], ev.tk.s + " · " + ev.why, now); }
    if (ev.discarded) { if (live && R) R.fall(path, now); paths.delete(o.seed); }
    return;
  }
  paths.delete(o.seed);
  if (ev.e === "inv") { tally.inv++; return; }           /* the kernel overruled the boundary: counted, never drawn */
  tally.adm++;
  const s = o.solid; s.birth = live ? now : -1e4;
  if (R) { R.solid(s); if (live) R.ripple(s.plot.x, s.plot.z, now, 2); }
  if (live) focus.next = s;
}

let acc = 0, complete = false;
function simulate(now, dt) {
  acc += RATE * dt;
  while (acc >= 1) {
    acc--;
    const o = world.step();
    if (!o) { complete = true; acc = 0; break; }
    if (R) { const tip = at(o.plot, o.ev.from); R.streak(tip[0], tip[1], now); }
    queue.push({ t: now + TRAVEL, o });
  }
  while (qi < queue.length && queue[qi].t <= now) apply(queue[qi++].o, now, true);
  if (qi > 4096) { queue.splice(0, qi); qi = 0; }
}

/* ================= the camera, told by the story ================= */
const secs = $$("[data-ch]"), RAIL = $$(".rail a"), railBox = $(".rail");
let pivots = [], p = 0;
function measure() { pivots = secs.map(s => s.offsetTop + s.offsetHeight / 2); }
function progress() {
  const mid = scrollY + innerHeight / 2;
  if (mid <= pivots[0]) return 0;
  for (let i = 0; i < pivots.length - 1; i++) if (mid < pivots[i + 1]) return i + (mid - pivots[i]) / (pivots[i + 1] - pivots[i]);
  return pivots.length - 1;
}
const focus = { next: null, cur: null, pos: [0, 0, 0] };
function keys() {
  const rf = 14 * Math.sqrt((world.solids.length + SEEDS) / Math.PI), c = Math.cos(.72), s = Math.sin(.72);
  const ring = (r, y) => [r * c, y, r * s];
  const fp = focus.pos;
  return [
    { e: [rf * .8 + 78, 24 + rf * .12, rf + 104], t: [0, 14, 0], f: 36 },                /* the crossing — low, at the glass */
    { e: ring(rf + 58, -50), t: ring(rf - 6, -6), f: 54 },                                  /* 01 propose — under the frontier */
    { e: ring(rf + 26, -6), t: ring(rf - 18, -.5), f: 48 },                                 /* 02 judge — grazing the glass */
    { e: [fp[0] + 30, 15, fp[2] + 42], t: [fp[0], 5, fp[2]], f: 40 },                      /* 03 verify — one program crossing */
    { e: [0, rf * 2.7 + 140, 36], t: [0, 0, 0], f: 34 },                                    /* 04 measure — the plan */
    { e: [290, 330, 370], t: [0, -16, 0], f: 38 },                                         /* 05 contain — into the vessel */
    { e: [0, 14, 150], t: [0, 168, -110], f: 58 },                                          /* 06 record — the sky */
    { e: [-Math.min(rf + 60, 170), 30, Math.min(rf + 70, 180)], t: [10, 14, 0], f: 40 },    /* 07 access — inside the walls */
  ];
}
const cam = { e: [90, -70, 160], t: [0, -10, 0], f: 56 };     /* first frame: under the glass, rising out */
const ptr = { x: 0, y: 0, sx: 0, sy: 0, mx: -1, my: -1, moved: false };
const ease = x => x * x * (3 - 2 * x);
const MOB = [[1.25, 6], [1.3, 8], [1.3, 8], [1.35, 8], [1.2, 10], [1.15, 8], [1, 20], [1, 12]];   /* per chapter: distance × fov + */
function story(dt) {
  p = progress();
  const K = keys(), i = Math.min(Math.floor(p), K.length - 2), f = ease(Math.min(1, p - i)), a = K[i], b = K[i + 1];
  const lerp = (u, v) => u.map((x, k) => x + (v[k] - x) * f);
  const goal = { e: lerp(a.e, b.e), t: lerp(a.t, b.t), f: a.f + (b.f - a.f) * f };
  if (MOBILE) {   /* portrait: step back where there is room to, widen where there is not */
    const m0 = MOB[i], m1 = MOB[i + 1], sc = m0[0] + (m1[0] - m0[0]) * f;
    goal.e = goal.e.map((x, k) => goal.t[k] + (x - goal.t[k]) * sc); goal.f += m0[1] + (m1[1] - m0[1]) * f;
  }
  const k = CALM ? 1 : 1 - Math.exp(-dt * 2.1);
  for (let j = 0; j < 3; j++) { cam.e[j] += (goal.e[j] - cam.e[j]) * k; cam.t[j] += (goal.t[j] - cam.t[j]) * k; }
  cam.f += (goal.f - cam.f) * k;
  /* the verify chapter watches one program cross; a new one only after it has settled */
  if (focus.next && (!focus.cur || performance.now() / 1000 - focus.since > 3.2)) { focus.cur = focus.next; focus.since = performance.now() / 1000; }
  if (focus.cur) { const kf = 1 - Math.exp(-dt * 1.4); focus.pos[0] += (focus.cur.plot.x - focus.pos[0]) * kf; focus.pos[2] += (focus.cur.plot.z - focus.pos[2]) * kf; }
  if (!CALM) { const kp = 1 - Math.exp(-dt * 3); ptr.sx += (ptr.x - ptr.sx) * kp; ptr.sy += (ptr.y - ptr.sy) * kp; }
  /* chapters fade as the story leaves them */
  secs.forEach((s, j) => { const v = Math.max(0, Math.min(1, 1 - (Math.abs(p - j) - .28) * 2.4)).toFixed(2); if (s.dataset.vis !== v) { s.dataset.vis = v; s.style.setProperty("--vis", v); } });
  const cur = Math.round(p);
  RAIL.forEach((a, j) => a.toggleAttribute("aria-current", j + 1 === cur));
  railBox.classList.toggle("off", p < .5);
}
addEventListener("pointermove", e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; if (e.pointerType === "mouse") { ptr.mx = e.clientX; ptr.my = e.clientY; ptr.moved = true; } }, { passive: true });

/* ================= the view this frame ================= */
let VP = new Float32Array(16), IVP = VP, EYE = [0, 0, 0];
function view(aspect) {
  const r = [cam.t[2] - cam.e[2], cam.e[0] - cam.t[0]], d = Math.hypot(cam.e[0] - cam.t[0], cam.e[1] - cam.t[1], cam.e[2] - cam.t[2]);
  const rl = Math.hypot(r[0], r[1]) || 1, sway = d * .035;
  EYE = [cam.e[0] + r[0] / rl * ptr.sx * sway, cam.e[1] - ptr.sy * sway * .6, cam.e[2] + r[1] / rl * ptr.sx * sway];
  const P = persp(cam.f * Math.PI / 180, aspect, .5, 4000, MOBILE ? 0 : .36, MOBILE ? .4 : 0);
  VP = mul(P, look(EYE, cam.t)); IVP = inv(VP);
}

/* ================= refusal tags: the rule a token broke, where it broke it ================= */
const tagLayer = $("#tags"), TAGS = [];
for (let i = 0; i < (MOBILE ? 5 : 10); i++) { const el = document.createElement("span"); tagLayer.appendChild(el); TAGS.push({ el, on: false, t0: 0, x: 0, z: 0 }); }
let lastTag = 0;
function tag(x, z, text, now) {
  if (!R || now - lastTag < .05) return;
  const dx = x - EYE[0], dy = EYE[1], dz = z - EYE[2]; if (dx * dx + dy * dy + dz * dz > 125 * 125) return;
  const c = xf(VP, x, 0, z); if (c[3] <= 0 || Math.abs(c[0] / c[3]) > .9 || Math.abs(c[1] / c[3]) > .85) return;
  if (MOBILE ? c[1] / c[3] < -.1 || c[0] / c[3] > .45 : c[0] / c[3] < .02 || c[0] / c[3] > .66) return;            /* never over the copy */
  const t = TAGS.find(t => t.on && Math.abs(t.x - x) + Math.abs(t.z - z) < 5) || TAGS.find(t => !t.on) || TAGS.reduce((a, b) => a.t0 < b.t0 ? a : b);
  t.el.textContent = text; t.x = x; t.z = z; t.t0 = now; t.on = true; lastTag = now;
}
function tags(now) {
  for (const t of TAGS) {
    if (!t.on) continue;
    const age = now - t.t0, c = xf(VP, t.x, -age * 2.5, t.z);
    if (age > 1.7 || c[3] <= 0) { t.on = false; t.el.style.opacity = 0; continue; }
    t.el.style.transform = `translate3d(${(c[0] / c[3] * .5 + .5) * innerWidth}px,${(.5 - c[1] / c[3] * .5) * innerHeight}px,0)`;
    t.el.style.opacity = (Math.min(1, age * 10) * (1 - Math.max(0, age - 1.1) / .6)).toFixed(2);
  }
}

/* ================= receipts: every solid is judged again on demand ================= */
const card = $("#receipt");
let hover = -1, cardFor = null, lastPick = 0;
function growth(s, now) { const g = Math.min(1, Math.max(0, (now - s.birth) / GROW)); return 1 - Math.pow(1 - g, 3); }
function pick(px, py, now) {
  const nx = px / innerWidth * 2 - 1, ny = 1 - py / innerHeight * 2;
  const a = xf(IVP, nx, ny, -1), b = xf(IVP, nx, ny, 1);
  const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], d = [b[0] / b[3] - o[0], b[1] / b[3] - o[1], b[2] / b[3] - o[2]];
  let best = null, bt = Infinity;
  for (const s of world.solids) {
    if (s.birth === undefined) continue;
    const e = s.mesh.ext, lo = [s.plot.x + e[0], 0, s.plot.z + e[2]], hi = [s.plot.x + e[1], s.h * growth(s, now), s.plot.z + e[3]];
    let t0 = 0, t1 = Infinity;
    for (let k = 0; k < 3 && t0 <= t1; k++) { let u = (lo[k] - o[k]) / d[k], v = (hi[k] - o[k]) / d[k]; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); }
    if (t0 <= t1 && t0 < bt) { bt = t0; best = s; }
  }
  return best;
}
const fmt = n => n.toLocaleString("en-US");
function receipt(s, now) {
  if (s === cardFor) return;
  cardFor = s;
  if (!s) { card.classList.remove("on"); hover = -1; return; }
  const j = CI.judge(s.toks);
  card.querySelector("[data-r=id]").textContent = s.id;
  card.querySelector("[data-r=toks]").textContent = s.toks.map(t => t.s).join(" ");
  card.querySelector("[data-r=n]").textContent = s.toks.length + " of " + s.toks.length + " tokens";
  card.querySelector("[data-r=now]").textContent = j.ok && j.kernel ? "ADMITTED · VERIFIED" : "REFUSED · " + j.why;
  card.querySelector("[data-r=seed]").textContent = "seed " + String(s.seed).padStart(2, "0") + " · proposal " + fmt(s.at) + " of its stream";
  card.querySelector("[data-r=when]").textContent = s.birth < 0 ? "before your first frame" : Math.max(0, now - s.birth).toFixed(0) + " s ago";
  card.classList.add("on"); hover = s.i;
}
function receipts(now) {
  if (!R || !ptr.moved || now - lastPick < .05) return;
  lastPick = now; ptr.moved = false;
  const over = document.elementFromPoint(ptr.mx, ptr.my);
  const s = over && over.closest("a, button, .copy p, .copy h1, .copy h2, .card, .rail, header, .hud") ? null : pick(ptr.mx, ptr.my, now);
  receipt(s, now);
  if (s) card.style.transform = `translate3d(${Math.min(ptr.mx + 22, innerWidth - card.offsetWidth - 12)}px,${Math.min(ptr.my + 22, innerHeight - card.offsetHeight - 12)}px,0)`;
}
addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { ptr.mx = e.clientX; ptr.my = e.clientY; ptr.moved = true; } }, { passive: true });

/* ================= the live readout ================= */
const T = {}; $$("[data-t]").forEach(el => (T[el.dataset.t] = T[el.dataset.t] || []).push(el));
const put = (k, v) => (T[k] || []).forEach(el => { if (el.textContent !== v) el.textContent = v; });
const bars = $$("[data-why]");
const external = () => performance.getEntriesByType("resource").filter(e => new URL(e.name, location.href).origin !== location.origin).length;
let lastHud = -1;
function hud(now) {
  if (now - lastHud < .12) return; lastHud = now;
  put("prop", fmt(tally.prop)); put("rej", fmt(tally.rej)); put("adm", fmt(tally.adm)); put("inv", fmt(tally.inv));
  put("ext", String(external()));
  if (complete) put("state-live", "FIELD COMPLETE");
  const top = Math.max(1, ...Object.values(tally.why));
  bars.forEach(b => { const n = tally.why[b.dataset.why] || 0; b.style.setProperty("--w", (n / top).toFixed(3)); b.querySelector("b").textContent = fmt(n); });
}

/* every printed manifest fact is checked against the manifest; a stale one says so */
$$("[data-m]").forEach(el => { const v = CM.project(el.dataset.m); if (v !== el.textContent) { el.classList.add("stale"); console.error("stale projection", el.dataset.m, el.textContent, "≠", v); } });
put("state", CM.CHECKSUM);

/* ================= the GPU ================= */
function gpu() {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, HEAD + src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src); return s; };
  const P = {};
  for (const k in SRC) {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, SRC[k][0])); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, SRC[k][1])); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(k + ": " + gl.getProgramInfoLog(p));
    p.u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i).name; p.u[a] = gl.getUniformLocation(p, a); }
    P[k] = p;
  }
  const use = (p, o) => { gl.useProgram(p); for (const k in o) { const l = p.u[k], v = o[k]; if (!l) continue;
    if (typeof v === "number") gl.uniform1f(l, v); else if (v.length === 16) gl.uniformMatrix4fv(l, false, v); else gl[["", "", "uniform2fv", "uniform3fv", "uniform4fv"][v.length]](l, v); } };
  const buffer = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); return b; };
  const vao = (parts) => { const v = gl.createVertexArray(); gl.bindVertexArray(v);
    for (const [buf, stride, fields, div] of parts) { gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (const [loc, size, off] of fields) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); gl.vertexAttribDivisor(loc, div); } }
    gl.bindVertexArray(null); return v; };
  /* stateless effects: each instance is a function of time; a ring overwrites the oldest */
  const ring = (stride, cap) => { const r = { data: new Float32Array(stride * cap).fill(-1e9), stride, cap, head: 0, dirty: true }; r.buf = buffer(r.data); return r; };
  const push = (r, ...v) => { r.data.set(v, r.head * r.stride); r.head = (r.head + 1) % r.cap; r.dirty = true; };
  const flush = r => { if (!r.dirty) return; gl.bindBuffer(gl.ARRAY_BUFFER, r.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, r.data); r.dirty = false; };
  /* the city only grows: one growable vertex store per pass */
  const store = stride => { const s = { data: new Float32Array(stride * 8192), stride, n: 0, dirty: false }; s.buf = buffer(s.data); return s; };
  const append = (s, v) => { const need = (s.n * s.stride) + v.length; if (need > s.data.length) { let c = s.data.length; while (c < need) c *= 2; const d = new Float32Array(c); d.set(s.data.subarray(0, s.n * s.stride)); s.data = d; } s.data.set(v, s.n * s.stride); s.n += v.length / s.stride; s.dirty = true; };
  const upload = s => { if (!s.dirty) return; gl.bindBuffer(gl.ARRAY_BUFFER, s.buf); gl.bufferData(gl.ARRAY_BUFFER, s.data.subarray(0, s.n * s.stride), gl.DYNAMIC_DRAW); s.dirty = false; };

  const quad = buffer(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]));             /* along, side */
  const square = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  const SOL = store(11), EDG = store(8);
  const FX = ring(14, MOBILE ? 1024 : 2048), OUT = ring(14, 1024), SPK = ring(8, MOBILE ? 3072 : 6144), RIP = ring(4, MOBILE ? 768 : 1536);
  const V = {
    empty: gl.createVertexArray(),
    solid: vao([[SOL.buf, 11, [[0, 3, 0], [1, 3, 3], [2, 4, 6], [3, 1, 10]], 0]]),
    edge: vao([[EDG.buf, 8, [[0, 3, 0], [1, 4, 3]], 0]]),
    glass: vao([[square, 2, [[0, 2, 0]], 0]]),
    fx: vao([[quad, 2, [[0, 2, 0]], 0], [FX.buf, 14, [[1, 3, 0], [2, 3, 3], [3, 4, 6], [4, 4, 10]], 1]]),
    out: vao([[quad, 2, [[0, 2, 0]], 0], [OUT.buf, 14, [[1, 3, 0], [2, 3, 3], [3, 4, 6], [4, 4, 10]], 1]]),
    spark: vao([[SPK.buf, 8, [[0, 3, 0], [1, 3, 3], [2, 2, 6]], 0]]),
    ripple: vao([[square, 2, [[0, 2, 0]], 0], [RIP.buf, 4, [[1, 4, 0]], 1]]),
  };

  /* the walls: four slabs just outside the glass, rising from the abyss in chapter 05 */
  const wall = [];
  const box = (x0, z0, x1, z1) => {
    const f = (a, b, c, d, n) => { for (const q of [a, b, c, a, c, d]) wall.push(...q, ...n); };
    f([x0,0,z1],[x1,0,z1],[x1,1,z1],[x0,1,z1],[0,0,1]); f([x1,0,z0],[x0,0,z0],[x0,1,z0],[x1,1,z0],[0,0,-1]);
    f([x1,0,z1],[x1,0,z0],[x1,1,z0],[x1,1,z1],[1,0,0]); f([x0,0,z0],[x0,0,z1],[x0,1,z1],[x0,1,z0],[-1,0,0]);
    f([x0,1,z1],[x1,1,z1],[x1,1,z0],[x0,1,z0],[0,1,0]);
  };
  const W0 = PLANE + 1, W1 = PLANE + 7;
  box(-W1, -W1, W1, -W0); box(-W1, W0, W1, W1); box(-W1, -W0, -W0, W0); box(W0, -W0, W1, W0);
  const WAL = buffer(new Float32Array(wall)); V.wall = vao([[WAL, 6, [[0, 3, 0], [1, 3, 3]], 0]]);

  /* the seal, computed after the first frame: the orbit lifted by its next iterate */
  const SEAL = { n: 0 };
  setTimeout(() => {
    const n = MOBILE ? 140000 : 320000, o = CM.dsinOrbit(CM.CANON, n + 1);
    let m = 0; for (let i = 0; i < o.length; i++) m = Math.max(m, Math.abs(o[i]));
    const d = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const z = o[i * 2 + 2] / m; d[i * 4] = o[i * 2] / m; d[i * 4 + 1] = o[i * 2 + 1] / m; d[i * 4 + 2] = z * .55; d[i * 4 + 3] = z * .5 + .5; }
    V.seal = vao([[buffer(d), 4, [[0, 4, 0]], 0]]); SEAL.n = n;
  }, 300);

  /* render targets: multisampled HDR scene → resolve → half → quarter bloom */
  const HDR = !!gl.getExtension("EXT_color_buffer_float"), FMT = HDR ? gl.RGBA16F : gl.RGBA8;
  const SAMPLES = Math.min(MOBILE ? 2 : 4, Math.max(...gl.getInternalformatParameter(gl.RENDERBUFFER, FMT, gl.SAMPLES)));
  let RT = null, scale = 1;
  const tex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, FMT, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
  function targets() {
    const dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2) * scale;
    const w = Math.max(4, Math.round(innerWidth * dpr)), h = Math.max(4, Math.round(innerHeight * dpr));
    if (RT && RT.w === w && RT.h === h) return;
    if (RT) { for (const t of [RT.scene, RT.half, RT.qa, RT.qb]) { gl.deleteTexture(t.t); gl.deleteFramebuffer(t.f); } gl.deleteRenderbuffer(RT.c); gl.deleteRenderbuffer(RT.d); gl.deleteFramebuffer(RT.ms); }
    canvas.width = w; canvas.height = h;
    const ms = gl.createFramebuffer(), c = gl.createRenderbuffer(), d = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, FMT, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ms); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, c); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("scene framebuffer incomplete");
    RT = { w, h, ms, c, d, dpr, scene: tex(w, h), half: tex(w >> 1, h >> 1), qa: tex(w >> 2, h >> 2), qb: tex(w >> 2, h >> 2) };
  }
  const pass = (t, prog, u, src) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.f : null); gl.viewport(0, 0, t ? t.w : RT.w, t ? t.h : RT.h);
    use(prog, u); let unit = 0; for (const k in src) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, src[k]); gl.uniform1i(prog.u[k], unit++); }
    gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3); };

  /* frame-time governor: resolution yields before motion does */
  let slow = 0, frames = 0;
  function govern(dt) { frames++; slow += dt > 1 / 40 ? 1 : 0; if (frames >= 90) { if (slow > 45 && scale > .55) { scale *= .85; RT && targets(); } frames = slow = 0; } }

  function draw(now, dt, wallRise, sealA) {
    govern(dt); targets(); view(RT.w / RT.h);
    upload(SOL); upload(EDG);
    let n = 0; const od = OUT.data;
    const seg = (a, b, r, g, bl, i, w) => { od.set([a[0], -.25, a[1], b[0], -.25, b[1], r, g, bl, i, 0, 1, w, 0], n * 14); n++; };
    for (const path of paths.values()) { for (let i = 0; i + 1 < path.length && n < OUT.cap - 1; i++) seg(path[i], path[i + 1], .4, .53, 1, 1.35, 2.2); const t = path[path.length - 1]; if (n < OUT.cap) seg(t, t, .75, .82, 1, 3.2, 6.5); }
    od.fill(-1e9, n * 14); OUT.dirty = true;
    for (const r of [FX, OUT, SPK, RIP]) flush(r);

    const above = EYE[1] > 0, px = RT.dpr;
    const C = { uVP: VP, uEye: EYE, uTime: now, uFog: FOG, uFogD: FOGD, uPx: px, uRes: [RT.w, RT.h] };
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.ms); gl.viewport(0, 0, RT.w, RT.h);
    gl.clearColor(0, 0, 0, 1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(false);
    use(P.sky, { uInvVP: IVP, uEye: EYE, uFog: FOG }); gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (SEAL.n && sealA > .001) {
      const r = now * .025, c = Math.cos(r), s = Math.sin(r), k = 108;
      use(P.seal, Object.assign({}, C, { uA: sealA, uSky: new Float32Array([c * k, 0, -s * k, 0, 0, k, 0, 0, s * k * .9, 0, c * k * .9, 0, 0, 172, -120, 1]) }));
      gl.bindVertexArray(V.seal); gl.drawArrays(gl.POINTS, 0, SEAL.n);
    }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    if (above && SOL.n) {          /* the city in the glass */
      gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      use(P.solid, Object.assign({}, C, { uGrow: GROW, uMirror: -1, uHover: hover })); gl.bindVertexArray(V.solid); gl.drawArrays(gl.TRIANGLES, 0, SOL.n);
      gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
    if (SOL.n) { use(P.solid, Object.assign({}, C, { uGrow: GROW, uMirror: 1, uHover: hover })); gl.bindVertexArray(V.solid); gl.drawArrays(gl.TRIANGLES, 0, SOL.n); }
    if (wallRise > .001) { use(P.wall, Object.assign({}, C, { uTop: -120 + 205 * wallRise })); gl.bindVertexArray(V.wall); gl.drawArrays(gl.TRIANGLES, 0, wall.length / 6); }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (EDG.n) { use(P.edge, Object.assign({}, C, { uGrow: GROW })); gl.bindVertexArray(V.edge); gl.drawArrays(gl.LINES, 0, EDG.n); }
    const storm = () => {
      gl.blendFunc(gl.ONE, gl.ONE);
      use(P.beam, C); gl.bindVertexArray(V.fx); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, FX.cap);
      if (n) { gl.bindVertexArray(V.out); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); }
      use(P.spark, C); gl.bindVertexArray(V.spark); gl.drawArrays(gl.POINTS, 0, SPK.cap);
    };
    const glass = () => { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); use(P.glass, Object.assign({}, C, { uSize: PLANE })); gl.bindVertexArray(V.glass); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    if (above) { storm(); glass(); } else { glass(); storm(); }
    gl.blendFunc(gl.ONE, gl.ONE); use(P.ripple, C); gl.bindVertexArray(V.ripple); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, RIP.cap);

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.scene.f);
    gl.blitFramebuffer(0, 0, RT.w, RT.h, 0, 0, RT.w, RT.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    pass(RT.half, P.bright, { uTx: [1 / RT.w, 1 / RT.h], uThr: HDR ? .9 : .72 }, { uT: RT.scene.t });
    pass(RT.qa, P.bright, { uTx: [1 / RT.half.w, 1 / RT.half.h], uThr: 0 }, { uT: RT.half.t });
    for (let i = 0; i < 2; i++) {
      pass(RT.qb, P.blur, { uDir: [(1.4 + i) / RT.qa.w, 0] }, { uT: RT.qa.t });
      pass(RT.qa, P.blur, { uDir: [0, (1.4 + i) / RT.qa.h] }, { uT: RT.qb.t });
    }
    pass(null, P.final, { uTime: now }, { uScene: RT.scene.t, uBloom: RT.qa.t });
  }

  return {
    draw,
    solid(s) {
      const t = s.mesh.tri, nv = t.length / 6, v = new Float32Array(nv * 11);
      for (let i = 0; i < nv; i++) { v.set(t.subarray(i * 6, i * 6 + 6), i * 11); v[i * 11 + 6] = s.plot.x; v[i * 11 + 7] = s.plot.z; v[i * 11 + 8] = s.h; v[i * 11 + 9] = s.birth; v[i * 11 + 10] = s.i; }
      append(SOL, v);
      const e = s.mesh.edge, ne = e.length / 3, w = new Float32Array(ne * 8);
      for (let i = 0; i < ne; i++) { w.set(e.subarray(i * 3, i * 3 + 3), i * 8); w[i * 8 + 3] = s.plot.x; w[i * 8 + 4] = s.plot.z; w[i * 8 + 5] = s.h; w[i * 8 + 6] = s.birth; }
      append(EDG, w);
    },
    streak(x, z, now) { const d = 42 + jitter() * 30; push(FX, x + (jitter() - .5) * 14, -d, z + (jitter() - .5) * 14, x, -.25, z, .5, .62, 1, 1.5, now, TRAVEL, 2.1, 1); },
    ripple(x, z, now, kind) { push(RIP, x, z, now, kind); },
    sparks(x, z, now) { for (let i = 0; i < 6; i++) { const a = jitter() * 6.283, r = 2 + jitter() * 6; push(SPK, x, -.3, z, Math.cos(a) * r, -2 - jitter() * 7, Math.sin(a) * r, now, .7 + jitter() * .5); } },
    fall(path, now) { for (let i = 0; i + 1 < path.length; i++) push(FX, path[i][0], -.25, path[i][1], path[i + 1][0], -.25, path[i + 1][1], .4, .5, 1, 1.2, now, 1.5, 2, 2); },
  };
}

/* ================= start: a warm city, then live ================= */
for (let i = 0; i < WARM; i++) { const o = world.step(); if (!o) break; apply(o, 0, false); }
measure(); addEventListener("resize", measure); addEventListener("load", measure);
const iWalls = secs.findIndex(s => s.dataset.ch === "contain");
const SEAL_A = [.03, .055, .02, .015, 0, .05, .16, .04];   /* per chapter: top … access */
let t0 = performance.now() / 1000, clock = 0;
function frame(ms) {
  const dt = Math.min(ms / 1000 - t0, .1); t0 = ms / 1000; clock += dt;
  simulate(clock, dt); story(dt);
  if (R) {
    const wall = Math.max(0, Math.min(1, (p - (iWalls - .75)) / .75)), i = Math.min(Math.floor(p), SEAL_A.length - 2), f = p - i;
    const seal = SEAL_A[i] + (SEAL_A[i + 1] - SEAL_A[i]) * ease(Math.min(1, f));
    R.draw(clock, dt, ease(wall), seal);
    tags(clock); receipts(clock);
  }
  hud(clock);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
