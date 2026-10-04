/* ============================================================================
   prototype/unhappened-2/unhappened.js — THE UNHAPPENED, version 2.
   Black may propose. White may exist. Cobalt must explain why.

   Version 2 obeys one law the page never states: only what was admitted can
   cast a shadow. The three materials are three relations to light and cause.
     BLACK  — visible to the observer, absent from the world. It exists on the
              camera's ray only: no shadow, no occlusion, no weight, no contact,
              no sound. A refused proposal reaches the pane and ceases.
     WHITE  — admitted, so real: its shadow snaps on at the instant of admission
              (the porcelain follows 60 ms later), then weight, contact and sound.
     COBALT — evidence, outside the light: composited after exposure, never lit,
              shadowed, blurred, refracted or reflected; a pixel wide at any depth.
   The renderer keeps two worlds: mapVisible (primary rays) and mapReal (shadow
   rays, occlusion, contact); a black candidate is only ever in the first.

   A white studio, one pane of glass. Every bead is one proposed operation — a
   token offered to extend a program — judged by the boundary engine of the record
   (CytherInstrument.biEngine) as it strikes: accepted, it crosses and turns white;
   refused, it never becomes real — its actual rejected stroke flashes beneath the
   pane as a cobalt ghost, and the glass keeps its Cyther Trace (TRACE-1, trace.js),
   a drawing of the receipt. Hover a trace and it reads its receipt. Press and drag:
   your gesture seeds a proposer; its first refusal is yours, carried through every
   scene to the end, and reproducible from a link alone (#trace=SEED.INDEX.HASH,
   replayed here and never sent anywhere). When nothing is changing, nothing renders.

   One body of matter: the 21 cells of a real admitted program become ADII's
   columns, AWC-OS's plates, SijilOS's ledger, and the walls. Nothing decorative
   moves; nothing decorative sounds. No libraries, no external request.
   ============================================================================ */
(function () {
"use strict";
if (typeof document === "undefined") return;
const CM = window.CytherManifest, CI = window.CytherInstrument;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MOBILE = matchMedia("(max-width: 760px)").matches, CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = x => Math.max(0, Math.min(1, x)), ease = x => x * x * (3 - 2 * x), lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => n.toLocaleString("en-US"), hex = h => (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
document.documentElement.classList.remove("no-js");

/* ================= the matter: a real admitted program, cut into its cells ================= */
function walk(toks) { let x = 6, y = 6; const v = [[x, y]]; for (const t of toks) { if (t.k === "Z") break; if (t.k === "H") x += t.sg * t.mg; else y += t.sg * t.mg; v.push([x, y]); } return v; }
function inPoly(v, x, y) { let c = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) { const [xi, yi] = v[i], [xj, yj] = v[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const areaOf = v => Math.abs(v.reduce((s, p, i) => { const q = v[(i + 1) % v.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
let best = null;                     /* the most intricate program the seed-02 run admits in 30,000 proposals */
{ const e = CI.biEngine(2);
  for (let i = 0; i < 30000; i++) { const ev = e.step(); if (ev.e !== "adm") continue;
    const v = walk(ev.prog), a = areaOf(v); if (!best || v.length > best.v.length || (v.length === best.v.length && a > best.a)) best = { a, v, toks: ev.prog }; } }
const PRG = "PRG-" + hex(CM.fnv(best.toks.map(t => t.s).join("")));
const XS = best.v.map(p => p[0]), YS = best.v.map(p => p[1]);
const CX = (Math.min(...XS) + Math.max(...XS)) / 2, CY = (Math.min(...YS) + Math.max(...YS)) / 2;
const S = 3.1 / Math.max(Math.max(...XS) - Math.min(...XS), Math.max(...YS) - Math.min(...YS));
const CELLS = [];
for (let gx = Math.min(...XS); gx < Math.max(...XS); gx++) for (let gy = Math.min(...YS); gy < Math.max(...YS); gy++)
  if (inPoly(best.v, gx + .5, gy + .5)) CELLS.push([(gx + .5 - CX) * S, (CY - gy - .5) * S]);
const N = CELLS.length, PART_H = .78, KMAX = 32, XTRA = Math.min(10, KMAX - N);
const ORDER = CELLS.map((c, i) => i).sort((a, b) => CELLS[a][0] - CELLS[b][0] || CELLS[a][1] - CELLS[b][1]);

/* the glass, and the room the matter will become */
const GLASS = { c: [0, 2.2, 0], h: [3.0, .085, 2.0], r: .05 };
const TOP = GLASS.c[1] + GLASS.h[1], BOTTOM = GLASS.c[1] - GLASS.h[1];
const ROOM = [5.4, 4.1];

/* layouts: one block = [x, y, z, round, hx, hy, hz] */
const blk = (x, y, z, hx, hy, hz, r) => [x, y, z, r, hx, hy, hz];
const NONE = blk(0, 0, 0, 0, 0, 0, 0);
const L_CAD = CELLS.map(([x, z]) => blk(x, PART_H / 2, z, S / 2, PART_H / 2, S / 2, .006));
const COLS = Math.ceil(N / 3), SLOT = [(COLS - (COLS - 1) / 2) * .46, 0];
const L_ADII = new Array(N), L_AWC = new Array(N);
ORDER.forEach((ci, k) => {
  const col = Math.floor(k / 3), row = k % 3, h = .3 + .58 * ((CM.fnv("adii:" + k) % 1000) / 1000);
  L_ADII[ci] = blk((col - (COLS - 1) / 2) * .46, h / 2, (row - 1) * .46, .14, h / 2, .14, .022);
  L_AWC[ci] = blk(0, .035 + k * .068, 0, 1.0, .028, .62, .016);
});
const RANK = new Array(KMAX); ORDER.forEach((ci, k) => { RANK[ci] = k; }); for (let j = N; j < KMAX; j++) RANK[j] = j;
let K = N;                           /* blocks that exist: the program's cells, then admitted ledger records */
function ledger(lift) { const out = []; for (let j = 0; j < KMAX; j++) out.push(j < K ? blk(0, .03 + (K - 1 - RANK[j]) * .057 + lift * .057, 0, .85, .022, .85, .012) : NONE); return out; }
function walls() {
  const out = [], [A, B] = ROOM, L = 4 * A + 4 * B;
  for (let j = 0; j < KMAX; j++) {
    if (j >= K) { out.push(NONE); continue; }
    let s = (RANK[j] + .5) / K * L, len = L / K - .08;
    if (s < 2 * A) out.push(blk(-A + s, 1.25, -B, len / 2, 1.25, .06, .015));
    else if ((s -= 2 * A) < 2 * B) out.push(blk(A, 1.25, -B + s, .06, 1.25, len / 2, .015));
    else if ((s -= 2 * B) < 2 * A) out.push(blk(A - s, 1.25, B, len / 2, 1.25, .06, .015));
    else { s -= 2 * A; out.push(blk(-A, 1.25, B - s, .06, 1.25, len / 2, .015)); }
  }
  return out;
}
const pad = a => a.concat(Array(KMAX - a.length).fill(NONE));

/* ================= matrices (column-major) ================= */
function persp(fov, a, n, f, sx, sy) { const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f); return new Float32Array([t / a,0,0,0, 0,t,0,0, -sx,-sy,(f + n) * nf,-1, 0,0,2 * f * n * nf,0]); }
function look(e, c) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  return { m: new Float32Array([xx,yx,zx,0, 0,yy,zy,0, xz,yz,zz,0, -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]), right: [xx, 0, xz], up: [yx, yy, yz] };
}
function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
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
const HEAD = "#version 300 es\nprecision highp float;\nprecision highp int;\n";
const FULL = "out vec2 vUV; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }";
const STUDIO = `
const vec3 FLOOR = vec3(.80, .81, .83);
float softbox(vec3 d, vec3 c, vec2 s){
  float dd = dot(d, c); if (dd <= 0.) return 0.;
  vec3 u = normalize(cross(c, vec3(0., 1., 0.))), v = cross(u, c);
  vec2 q = abs(vec2(dot(d, u), dot(d, v)) / dd), e = 1. - smoothstep(s * .78, s, q); return e.x * e.y;
}
vec3 env(vec3 d){
  vec3 c = d.y < 0. ? FLOOR * .9 : mix(FLOOR, vec3(.935, .94, .95), smoothstep(0., .5, d.y));
  c += 3.4 * softbox(d, normalize(vec3(-.55, .75, .42)), vec2(.42, .26));
  c += 1.5 * softbox(d, normalize(vec3(.78, .42, -.32)), vec2(.2, .44));
  c += 1.1 * softbox(d, normalize(vec3(.05, .62, -.78)), vec2(.75, .28));
  return c;
}
vec3 envR(vec3 d){ return env(d) * (1. - .8 * softbox(d, normalize(vec3(-.12, .34, -.93)), vec2(.95, .15)) - .55 * softbox(d, normalize(vec3(.95, .2, .2)), vec2(.18, .5))); }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
vec2 boxHit(vec3 ro, vec3 rd, vec3 lo, vec3 hi){ vec3 iv = 1. / rd, a = (lo - ro) * iv, b = (hi - ro) * iv, n = min(a, b), f = max(a, b);
  return vec2(max(max(n.x, n.y), n.z), min(min(f.x, f.y), f.z)); }
`;
const TRACE = window.CytherTrace.GLSL;            /* TRACE-1: one drawing of a receipt, for every surface */

const SCENE = [FULL, STUDIO + TRACE + `
in vec2 vUV; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
uniform mat4 uInvVP, uVP; uniform vec3 uEye, uKey; uniform float uGlassOn, uPulse;
uniform int uK; uniform vec4 uBC[32], uBH[32]; uniform vec4 uBk[2], uBkH[2];
uniform vec3 uBMin, uBMax, uGC, uGH;
uniform vec4 uDecO, uDecU, uDecV, uKerf; uniform float uDecCode; uniform uint uDecHash;
uniform vec4 uS[48]; uniform int uNS; uniform float uPxA;
float blocks(vec3 p, uint m){
  float d = 1e5;
  for (int i = 0; i < 32; i++) { if (i >= uK) break; if ((m & (1u << uint(i))) == 0u) continue; d = min(d, sdRBox(p - uBC[i].xyz, uBH[i].xyz, uBC[i].w)); }
  return d;
}
/* two worlds: the camera sees black; nothing else does. Black lives on the primary ray only. */
vec2 mapVisible(vec3 p, uint m){
  vec2 r = vec2(blocks(p, m), 1.);
  for (int i = 0; i < 2; i++) { if (uBk[i].w <= 0.) continue; float d = sdRBox(p - uBk[i].xyz, uBkH[i].xyz, uBkH[i].w);
    if (i == 1 && uKerf.w > 0.) d = max(d, uKerf.w - abs(dot(p.xz - uKerf.xy, vec2(cos(uKerf.z), sin(uKerf.z)))));   /* your trace, as a hairline */
    if (d < r.x) r = vec2(d, 5.); }
  return r;
}
float mapReal(vec3 p, uint m){ return blocks(p, m); }
/* admitted beads are real: they shadow and darken what lies under them */
float beadShadow(vec3 p, vec3 L){
  float s = 1.;
  for (int i = 0; i < 48; i++) { if (i >= uNS) break; vec4 b = uS[i]; vec3 v = b.xyz - p; float tc = dot(v, L); if (tc <= 0. || b.w <= 0.) continue;
    float dp = length(v - L * tc), w = max(tc * .028, .002), c = min(1., b.w / w);
    s *= 1. - c * c * (1. - smoothstep(max(b.w - w, 0.), b.w + w, dp)); }
  return s;
}
float beadAO(vec3 p, vec3 n){
  float o = 1.;
  for (int i = 0; i < 48; i++) { if (i >= uNS) break; vec4 b = uS[i]; vec3 v = b.xyz - p; float d2 = dot(v, v); if (d2 > .2 || b.w <= 0.) continue;
    o *= 1. - clamp(dot(n, v) * inversesqrt(d2), 0., 1.) * min(b.w * b.w / d2, 1.); }
  return o;
}
uint rayMask(vec3 ro, vec3 rd){
  uint m = 0u;
  for (int i = 0; i < 32; i++) { if (i >= uK) break; if (uBH[i].y <= 0.) continue; vec3 e = uBH[i].xyz + .02; vec2 t = boxHit(ro, rd, uBC[i].xyz - e, uBC[i].xyz + e); if (t.x <= t.y && t.y > 0.) m |= 1u << uint(i); }
  return m;
}
uint nearMask(vec3 p, float rad){
  uint m = 0u;
  for (int i = 0; i < 32; i++) { if (i >= uK) break; if (uBH[i].y <= 0.) continue; vec3 q = abs(p - uBC[i].xyz) - uBH[i].xyz; if (length(max(q, 0.)) < rad) m |= 1u << uint(i); }
  return m;
}
vec3 calcN(vec3 p, uint m){ const vec2 k = vec2(1., -1.); const float e = .0008;
  return normalize(k.xyy * mapVisible(p + k.xyy * e, m).x + k.yyx * mapVisible(p + k.yyx * e, m).x + k.yxy * mapVisible(p + k.yxy * e, m).x + k.xxx * mapVisible(p + k.xxx * e, m).x); }
float shadow(vec3 ro, vec3 rd){
  float res = 1.; vec2 tb = boxHit(ro, rd, uBMin, uBMax);
  if (tb.x < tb.y && tb.y > 0.) { uint m = rayMask(ro, rd); float t = max(tb.x, .005);
    for (int i = 0; i < 48; i++) { if (t > tb.y) break; float h = mapReal(ro + rd * t, m); res = min(res, 9. * h / t); if (res < .003) break; t += clamp(h, .015, .35); } }
  vec2 tg = boxHit(ro, rd, uGC - uGH, uGC + uGH);
  if (tg.x < tg.y && tg.y > 0.) res *= mix(1., .9, uGlassOn);
  return clamp(res, 0., 1.) * beadShadow(ro, rd);
}
float ao(vec3 p, vec3 n, uint m){ float o = 0., s = 1.; for (int i = 1; i <= 5; i++) { float h = .012 + .045 * float(i); o += (h - max(mapReal(p + n * h, m), 0.)) * s; s *= .72; } return clamp(1. - 2.4 * o, .25, 1.); }
/* your trace carried on the matter: TRACE-1 on a face, or the receipt hash as 32 ticks (tall = 1) */
float decal(vec3 p, vec3 n, float px){
  if (uDecV.w <= 0.) return 0.;
  vec3 N = cross(uDecU.xyz, uDecV.xyz), d = p - uDecO.xyz;
  if (abs(dot(d, N)) > .006 || dot(n, N) < .8) return 0.;
  vec2 q = vec2(dot(d, uDecU.xyz), dot(d, uDecV.xyz)) / uDecO.w;
  if (uDecU.w < .5) return sig(q, uDecCode, 1., px / uDecO.w) * uDecV.w;
  float i = floor(q.x / .0134); if (i < 0. || i > 31.) return 0.;
  float bit = float((uDecHash >> uint(31. - i)) & 1u);
  return (1. - smoothstep(.12, .24, abs(fract(q.x / .0134) - .5))) * step(abs(q.y), mix(.006, .015, bit)) * uDecV.w;
}
vec3 shadeObj(vec3 p, vec3 n, vec3 rd, float id, uint m){
  vec3 L = uKey; float sh = shadow(p + n * .004, L), occ = ao(p, n, m) * beadAO(p, n);
  float dif = clamp((dot(n, L) + .3) / 1.3, 0., 1.) * sh, hemi = .55 + .45 * n.y;
  float fr = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  vec3 h = normalize(L - rd);
  vec3 col;
  if (id == 5.) col = vec3(.006) * (dif + hemi) + envR(reflect(rd, n)) * fr * .95 + pow(max(dot(n, h), 0.), 160.) * sh * 2.;   /* proposed: black */
  else col = vec3(.885, .88, .865) * (dif * 1.05 + hemi * .55 * occ) + pow(max(dot(n, h), 0.), 90.) * sh * .5               /* admitted: porcelain */
           + fr * envR(reflect(rd, n)) * .22 * occ + vec3(1., .96, .88) * .07 * uPulse * occ;
  return col;
}
vec3 shadeFloor(vec3 p, float t){
  float sh = shadow(p + vec3(0., .002, 0.), uKey), occ = beadAO(p, vec3(0., 1., 0.));
  if (all(greaterThan(p, uBMin - .7)) && all(lessThan(p, uBMax + .7))) occ *= ao(p, vec3(0., 1., 0.), nearMask(p, .5));
  return mix(FLOOR * mix(.66, 1., sh) * mix(.6, 1., occ), FLOOR, smoothstep(14., 70., t));
}
void main(){
  vec4 a = uInvVP * vec4(vUV * 2. - 1., -1., 1.), b = uInvVP * vec4(vUV * 2. - 1., 1., 1.);
  vec3 ro = uEye, rd = normalize(b.xyz / b.w - a.xyz / a.w);
  float tF = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  vec2 tb = boxHit(ro, rd, uBMin, uBMax);
  float t = max(tb.x, 0.), tEnd = min(tb.y, tF), id = 0.; bool hit = false; uint m = 0u;
  if (tb.x < tb.y && tb.y > 0.) { m = rayMask(ro, rd);
    for (int i = 0; i < 160; i++) { if (t > tEnd) break; vec2 h = mapVisible(ro + rd * t, m); if (h.x < .0006 * t) { hit = true; id = h.y; break; } t += h.x * .9; } }
  vec3 col; float dist, ev = 0.;
  if (hit) { vec3 p = ro + rd * t; uint mn = nearMask(p, .6); vec3 n = calcN(p, mn); col = shadeObj(p, n, rd, id, mn); dist = t;
    ev = decal(p, n, t * uPxA / max(abs(dot(n, rd)), .25)); }
  else if (tF < 1e8) { col = shadeFloor(ro + rd * tF, tF); dist = tF; }
  else { col = env(rd); dist = 1e4; }
  vec4 c = uVP * vec4(ro + rd * min(dist, 400.), 1.);
  gl_FragDepth = dist < 1e3 ? clamp(c.z / c.w * .5 + .5, 0., 1.) : 1.;
  o = vec4(col, dist); o2 = vec4(ev);   /* evidence is written apart from the light, and composited after it */
}`];

const BEAD = [`layout(location=0) in vec2 aQ; layout(location=1) in vec4 aP; layout(location=2) in vec2 aC;
uniform mat4 uVP; uniform vec3 uRight, uUp; out vec2 vQ; flat out vec3 vC; flat out float vR, vD;
void main(){ vQ = aQ; vC = aP.xyz; vR = aP.w; vD = aC.x;
  gl_Position = aP.w > 0. ? uVP * vec4(aP.xyz + (uRight * aQ.x + uUp * aQ.y) * aP.w * 1.05, 1.) : vec4(2., 2., 2., 1.); }`,
STUDIO + `in vec2 vQ; flat in vec3 vC; flat in float vR, vD; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
uniform mat4 uVP; uniform vec3 uRight, uUp, uEye, uKey;
void main(){
  float r2 = dot(vQ, vQ); if (r2 > 1.) discard;
  vec3 f = normalize(uEye - vC), n = normalize(uRight * vQ.x + uUp * vQ.y + f * sqrt(1. - r2)), P = vC + n * vR, rd = normalize(P - uEye);
  vec4 c = uVP * vec4(P, 1.); gl_FragDepth = c.z / c.w * .5 + .5;
  float dif = clamp((dot(n, uKey) + .2) / 1.2, 0., 1.), hemi = .55 + .45 * n.y, fr = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  vec3 black = vec3(.006) * (dif + hemi) + envR(reflect(rd, n)) * fr * .95 + pow(max(dot(reflect(-uKey, n), -rd), 0.), 90.) * 2.2;
  vec3 white = vec3(.885, .88, .865) * (dif * 1.05 + hemi * .55) + envR(reflect(rd, n)) * fr * .25;
  o = vec4(mix(black, white, vD), length(P - uEye)); o2 = vec4(0.);
}`];

/* cobalt wire: the ghosts of what was refused, counterfactuals, the chain */
const WIRE = [`layout(location=0) in vec2 aQ; layout(location=1) in vec3 aA; layout(location=2) in vec3 aB; layout(location=3) in vec2 aW;
uniform mat4 uVP; uniform vec2 uRes; uniform float uPx; uniform vec3 uEye; out float vA, vS, vD;
void main(){
  vec4 ca = uVP * vec4(aA, 1.), cb = uVP * vec4(aB, 1.);
  if (aW.x <= 0. || ca.w < .05 || cb.w < .05) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; float l = length(d); vec2 t = l > 1e-4 ? d / l : vec2(1., 0.), n = vec2(-t.y, t.x);
  vec4 c = mix(ca, cb, aQ.x); float w = aW.y * uPx;
  c.xy += (n * aQ.y * w + t * (aQ.x * 2. - 1.) * w * .5) / uRes * 2. * c.w;
  gl_Position = c; vA = aW.x; vS = aQ.y; vD = distance(mix(aA, aB, aQ.x), uEye);
}`, `in float vA, vS, vD; out vec4 o; uniform sampler2D uScene; uniform vec2 uRes; uniform float uOcc;
void main(){ if (uOcc > 0. && vD > texture(uScene, gl_FragCoord.xy / uRes).a * 1.002 + .015) discard; float g = 1. - vS * vS; o = vec4(vA * g * g); }`];

/* stamping a trace into the glass's memory */
const STAMP = [`layout(location=0) in vec2 aQ; layout(location=1) in vec3 aS; uniform vec2 uGH2; out vec2 vQ; flat out float vCode;
void main(){ vQ = aQ * .2; vCode = aS.z; vec2 w = aS.xy + vQ; gl_Position = vec4(w.x / uGH2.x, w.y / uGH2.y, 0., 1.); }`,
TRACE + `in vec2 vQ; flat in float vCode; out vec4 o; void main(){ o = vec4(sig(vQ, vCode, 1.) * .3); }`];

const FINAL = [FULL, STUDIO + TRACE + `in vec2 vUV; out vec4 o;
uniform sampler2D uScene, uTrace; uniform mat4 uInvVP, uVP; uniform vec3 uEye, uKey, uGC, uGH; uniform float uGR, uGlassOn, uTime, uExposure, uFocusD, uAspect;
uniform vec4 uHits[24], uFocus, uIntro, uMine, uLamp; uniform vec2 uTexel; uniform float uIntroG; uniform sampler2D uEv, uCov;
const vec3 INK = vec3(.110, .180, .690);   /* evidence in display values: not lit, not exposed, not blurred */
vec3 glassN(vec3 p){ const vec2 k = vec2(1., -1.); const float e = .0005; vec3 q = p - uGC;
  return normalize(k.xyy * sdRBox(q + k.xyy * e, uGH, uGR) + k.yyx * sdRBox(q + k.yyx * e, uGH, uGR) + k.yxy * sdRBox(q + k.yxy * e, uGH, uGR) + k.xxx * sdRBox(q + k.xxx * e, uGH, uGR)); }
vec3 lens(vec2 uv){
  vec4 c = texture(uScene, uv); float r = clamp(abs(c.a - uFocusD) / c.a * 1.25, 0., 1.) * .011;
  if (r < .0012) return c.rgb;
  vec3 acc = c.rgb; float w = 1.;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.39996, d = sqrt((float(i) + .5) / 16.) * r;
    vec4 s = texture(uScene, uv + vec2(cos(a) / uAspect, sin(a)) * d);
    float k = smoothstep(d * .6, d, max(clamp(abs(s.a - uFocusD) / s.a * 1.25, 0., 1.) * .011, r * .5));
    acc += s.rgb * k; w += k;
  }
  return acc / w;
}
/* the glass's memory of every refusal, the ones still happening, and the one being read */
float traceAt(vec2 xz, float px){
  float v = min(texture(uTrace, xz / (2. * uGH.xz) + .5).r, .75);
  for (int i = 0; i < 24; i++) {
    vec4 h = uHits[i]; float age = uTime - h.z; if (age < 0. || age > 1.6) continue;
    vec2 q = xz - h.xy; if (dot(q, q) > .05) continue;
    v = max(v, sig(q, h.w, .25 + .75 * (1. - pow(1. - clamp(age / .35, 0., 1.), 3.)), px) * (1. - smoothstep(.4, 1.6, age)));
  }
  if (uFocus.w > 0.) { vec2 q = xz - uFocus.xy; if (dot(q, q) < .06) v = max(v, max(sig(q, uFocus.z, 1., px), exp(-pow((length(q) - .19) / max(.0022, px * .6), 2.)) * .7)); }
  if (uIntro.w > 0.) v = max(v, sig((xz - uIntro.xy) / 7., uIntro.z, uIntroG, px / 7.) * uIntro.w);   /* the first refusal, at the scale of the room */
  if (uMine.w > 0.) v = max(v, sig(xz - uMine.xy, uMine.z, 1., px) * uMine.w);                      /* yours, found at the end */
  return v;
}
void main(){
  vec4 a = uInvVP * vec4(vUV * 2. - 1., -1., 1.), b = uInvVP * vec4(vUV * 2. - 1., 1., 1.);
  vec3 ro = uEye, rd = normalize(b.xyz / b.w - a.xyz / a.w), col;
  float tTop = abs(rd.y) > 1e-5 ? (uGC.y + uGH.y - ro.y) / rd.y : -1.;
  vec2 xzTop = (ro + rd * clamp(tTop, 0., 40.)).xz;
  float pxTop = min(length(fwidth(xzTop)), .012);            /* a display pixel on the pane: evidence keeps its width at any distance */
  float ev = max(texture(uEv, vUV).r, texture(uCov, vUV).r);
  if (all(lessThan(abs(uEye - uGC), uGH - vec3(.004)))) {
    if (tTop > 0.) ev = max(ev, traceAt(xzTop, pxTop));         /* the pane's face, seen directly: evidence is never reflected */
    /* inside the boundary: total internal reflection between two faces, inclusions, traces as large as rooms */
    vec3 p = ro, d = rd, acc = vec3(0.), tr = vec3(1.);
    for (int bnc = 0; bnc < 6; bnc++) {
      float tf = d.y > 0. ? (uGC.y + uGH.y - p.y) / d.y : d.y < 0. ? (uGC.y - uGH.y - p.y) / d.y : 30.; tf = min(tf, 30.);
      for (int k = 0; k < 8; k++) {
        float tt = (float(k) + .5) / 8. * min(tf, 8.); vec3 q = p + d * tt, cell = floor(q * 22.);
        float hs = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        if (hs > .993) { float dd = length(q - (cell + .5) / 22.); acc += tr * vec3(.97, .99, 1.) * exp(-dd * dd * 9000.) * .8 * exp(-tt * .15); }
      }
      p += d * tf; tr *= exp(-tf * vec3(.2, .07, .11));
      vec3 n = vec3(0., d.y > 0. ? 1. : -1., 0.);
      if (abs(d.y) > .745 || tf >= 30.) {
        vec3 ex = refract(d, -n, 1.5); if (dot(ex, ex) < .01) ex = d;
        vec4 c1 = uVP * vec4(p + ex * 1.5, 1.);
        acc += tr * texture(uScene, clamp(c1.xy / c1.w * .5 + .5, uTexel, 1. - uTexel)).rgb * vec3(.9, .97, .95);
        break;
      }
      acc += tr * envR(reflect(d, n)) * .05;
      d.y = -d.y;
    }
    col = acc + vec3(.03, .05, .045);
  } else {
    vec4 s = texture(uScene, vUV); col = lens(vUV);
    vec2 tb = boxHit(ro, rd, uGC - uGH - .01, uGC + uGH + .01);
    if (tb.x < tb.y && tb.y > 0.) {
      float t = max(tb.x, 0.); bool hit = false;
      for (int i = 0; i < 40; i++) { float d = sdRBox(ro + rd * t - uGC, uGH, uGR); if (d < 1e-4) { hit = true; break; } t += d; if (t > tb.y) break; }
      if (hit && t < s.a) {
        vec3 p = ro + rd * t, n = glassN(p), rr = refract(rd, n, 1. / 1.5);
        vec4 c1 = uVP * vec4(p + rr * .6, 1.), c0 = uVP * vec4(p + rd * .6, 1.);
        float edge = 1. - smoothstep(.75, .97, abs(n.y));
        vec3 refr = lens(clamp(vUV + (c1.xy / c1.w - c0.xy / c0.w) * .5 * (1. - edge), uTexel, 1. - uTexel)) * vec3(.955, .98, .978);
        vec3 body = vec3(.46, .62, .58) * (.55 + .45 * envR(reflect(rd, n)).g);
        float F = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
        vec3 g = mix(refr, body, edge * .9) * (1. - F) + envR(reflect(rd, n)) * F + pow(max(dot(reflect(-uKey, n), -rd), 0.), 400.) * 5.;
        float u = (p.x - uGC.x) / (2. * uGH.x) + .5, w = uGlassOn * 1.5 - .25;
        col = mix(col, g, smoothstep(u - .25, u, w)) + exp(-pow((w - u) / .03, 2.)) * .6 * step(uGlassOn, .999);
        if (abs(n.y) > .9) { vec2 l = p.xz - uLamp.xy; col += uLamp.w * .3 * exp(-dot(l, l) / .09); ev = max(ev, traceAt(xzTop, pxTop) * .9); }
      }
    }
  }
  col = 1. - exp(-col * uExposure);
  col = pow(col, vec3(1. / 2.2));
  vec2 q = vUV - .5; col *= 1. - dot(q, q) * .22;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) * .014;   /* grain belongs to the paper: it does not move */
  o = vec4(mix(col, INK, clamp(ev, 0., 1.)), 1.);
}`];

/* ================= the GPU ================= */
const canvas = $("#studio");
const gl = canvas && canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
const MAXB = MOBILE ? 700 : 1600, MAXW = 1200, MAXS = 64;
let R = null;
try { if (gl) R = gpu(); } catch (err) { console.error(err); R = null; }
if (!R) document.documentElement.classList.add("no-gl");

function gpu() {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, HEAD + src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = ([vs, fs]) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); p.u[a.name.replace(/\[0\]$/, "")] = { l: gl.getUniformLocation(p, a.name), t: a.type }; }
    return p;
  };
  const P = { scene: prog(SCENE), bead: prog(BEAD), wire: prog(WIRE), stamp: prog(STAMP), final: prog(FINAL) };
  const VEC = { [gl.FLOAT]: "uniform1fv", [gl.FLOAT_VEC2]: "uniform2fv", [gl.FLOAT_VEC3]: "uniform3fv", [gl.FLOAT_VEC4]: "uniform4fv" };
  const set = (p, o) => { gl.useProgram(p); for (const k in o) { const u = p.u[k]; if (!u) continue; const v = o[k];
    if (u.t === gl.FLOAT_MAT4) gl.uniformMatrix4fv(u.l, false, v); else if (u.t === gl.INT || u.t === gl.SAMPLER_2D) gl.uniform1i(u.l, v); else if (u.t === gl.UNSIGNED_INT) gl.uniform1ui(u.l, v); else gl[VEC[u.t]](u.l, typeof v === "number" ? [v] : v); } };
  const HDR = !!gl.getExtension("EXT_color_buffer_float");
  const buf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
  const quad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW), seg = buf(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const beads = new Float32Array(MAXB * 6), wires = new Float32Array(MAXW * 8), stamps = new Float32Array(MAXS * 3);
  const bBead = buf(beads, gl.DYNAMIC_DRAW), bWire = buf(wires, gl.DYNAMIC_DRAW), bStamp = buf(stamps, gl.DYNAMIC_DRAW);
  const vao = parts => { const v = gl.createVertexArray(); gl.bindVertexArray(v);
    for (const [b, stride, fields, div] of parts) { gl.bindBuffer(gl.ARRAY_BUFFER, b); for (const [loc, size, off] of fields) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); gl.vertexAttribDivisor(loc, div); } }
    gl.bindVertexArray(null); return v; };
  const V = { empty: gl.createVertexArray(),
    bead: vao([[quad, 2, [[0, 2, 0]], 0], [bBead, 6, [[1, 4, 0], [2, 2, 4]], 1]]),
    wire: vao([[seg, 2, [[0, 2, 0]], 0], [bWire, 8, [[1, 3, 0], [2, 3, 3], [3, 2, 6]], 1]]),
    stamp: vao([[quad, 2, [[0, 2, 0]], 0], [bStamp, 3, [[1, 3, 0]], 1]]) };
  const texture = (w, h, fmt, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  /* the glass's memory: one texel per ~3mm of glass, kept for the whole visit */
  const TW = MOBILE ? 1024 : 2048, TH = Math.round(TW * GLASS.h[2] / GLASS.h[0]);
  const trTex = texture(TW, TH, gl.RGBA8, gl.LINEAR), trFb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, trFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trTex, 0);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);

  let RT = null, EV = null, scale = MOBILE ? .7 : (devicePixelRatio > 1.5 ? .62 : .9);
  const CAST = new Float32Array(48 * 4);
  function targets() {
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = Math.round(innerWidth * dpr), ch = Math.round(innerHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (!EV || EV.w !== cw || EV.h !== ch) {                   /* wires of evidence, at display resolution */
      if (EV) { gl.deleteTexture(EV.tex); gl.deleteFramebuffer(EV.fb); }
      const tex = texture(cw, ch, gl.R8, gl.LINEAR), fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      EV = { tex, fb, w: cw, h: ch };
    }
    const w = Math.max(4, Math.round(cw * scale)), h = Math.max(4, Math.round(ch * scale));
    if (RT && RT.w === w && RT.h === h) return;
    if (RT) { gl.deleteTexture(RT.tex); gl.deleteTexture(RT.cov); gl.deleteRenderbuffer(RT.depth); gl.deleteFramebuffer(RT.fb); }
    const tex = texture(w, h, HDR ? gl.RGBA16F : gl.RGBA8, gl.LINEAR), cov = texture(w, h, gl.R8, gl.LINEAR);
    const depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, cov, 0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("studio framebuffer incomplete");
    RT = { tex, cov, depth, fb, w, h };
  }
  let slow = 0, frames = 0;
  function govern(dt) { frames++; if (dt > 1 / 45) slow++; if (frames >= 60) { if (slow > 30 && scale > .42) scale *= .86; frames = slow = 0; } }

  function draw(f) {
    govern(f.dt); targets();
    if (f.nStamps) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, trFb); gl.viewport(0, 0, TW, TH); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
      gl.bindBuffer(gl.ARRAY_BUFFER, bStamp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, stamps.subarray(0, f.nStamps * 3));
      set(P.stamp, { uGH2: [GLASS.h[0], GLASS.h[2]] }); gl.bindVertexArray(V.stamp); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.nStamps);
    }
    const common = { uInvVP: f.ivp, uVP: f.vp, uEye: f.eye, uKey: f.key, uTime: f.time, uGlassOn: f.glass, uGC: GLASS.c, uGH: GLASS.h };
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.fb); gl.viewport(0, 0, RT.w, RT.h);
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.ALWAYS);
    set(P.scene, Object.assign({ uK: f.k, uBC: f.bc, uBH: f.bh, uBk: f.bk, uBkH: f.bkh, uPulse: f.pulse, uBMin: f.bmin, uBMax: f.bmax,
      uDecO: f.dec[0], uDecU: f.dec[1], uDecV: f.dec[2], uDecCode: f.dec[3], uDecHash: f.dec[4], uKerf: f.kerf,
      uS: CAST, uNS: f.nCast, uPxA: 2 * Math.tan(f.fov / 2) / RT.h }, common));
    gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthFunc(gl.LESS);
    gl.bindBuffer(gl.ARRAY_BUFFER, bBead); gl.bufferSubData(gl.ARRAY_BUFFER, 0, beads);
    set(P.bead, Object.assign({ uRight: f.right, uUp: f.up }, common)); gl.bindVertexArray(V.bead); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, MAXB);
    gl.disable(gl.DEPTH_TEST);
    /* evidence wires: at display resolution, unlit, hidden only by what stands in front of them */
    gl.bindFramebuffer(gl.FRAMEBUFFER, EV.fb); gl.viewport(0, 0, EV.w, EV.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (f.nWires) {
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, bWire); gl.bufferSubData(gl.ARRAY_BUFFER, 0, wires.subarray(0, f.nWires * 8));
      set(P.wire, Object.assign({ uRes: [EV.w, EV.h], uPx: EV.w / innerWidth, uScene: 0, uOcc: HDR ? 1 : 0 }, common)); gl.bindVertexArray(V.wire); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.nWires);
      gl.blendEquation(gl.FUNC_ADD);
    }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.tex); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, trTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, EV.tex); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, RT.cov);
    set(P.final, Object.assign({ uScene: 0, uTrace: 1, uEv: 2, uCov: 3, uGR: GLASS.r, uExposure: 2.45, uHits: f.hits, uFocus: f.focusTrace, uIntro: f.intro, uIntroG: f.introG, uMine: f.mine, uLamp: f.lamp, uFocusD: f.focusD, uAspect: RT.w / RT.h, uTexel: [1 / RT.w, 1 / RT.h] }, common));
    gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { draw, beads, wires, stamps, casters: CAST, aspect: () => canvas.width / canvas.height };
}

/* ================= sound: off unless asked for; every sound is a state transition ================= */
const audio = { ctx: null, on: false, noise: null, last: { evidence: 0, contact: 0 } };
const out_ = (node, pan) => { const c = audio.ctx; if (!pan) return node.connect(c.destination); const s = c.createStereoPanner(); s.pan.value = pan; node.connect(s).connect(c.destination); };
function voice(freq, dur, gain, pan = 0) {
  const c = audio.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  out_(o.connect(g), pan); o.start(t); o.stop(t + dur + .02);
}
function hiss(freq, q, dur, gain, pan = 0) {
  const c = audio.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = audio.noise; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  out_(s.connect(f).connect(g), pan); s.start(t); s.stop(t + dur + .02);
}
/* black makes no sound. A receipt is an instrument's tick: dry, fixed, nowhere in the room.
   Only real matter sounds, from where it is: ceramic contact, a record binding. */
function sound(kind, pan = 0) {
  if (!audio.on) return;
  const t = audio.ctx.currentTime;
  if (kind in audio.last) { if (t - audio.last[kind] < (kind === "evidence" ? .05 : .035)) return; audio.last[kind] = t; }
  if (kind === "evidence") voice(3150, .022, .05);
  else if (kind === "contact") { voice(1850, .11, .02, pan); voice(2930, .07, .012, pan); hiss(4200, 3, .03, .02, pan); }
  else if (kind === "bind") { voice(660, .9, .009); voice(990, .9, .006); }
}
const soundBtn = $("#sound");
soundBtn.addEventListener("click", () => {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; audio.ctx = new AC();
    const n = audio.ctx.sampleRate * .5, b = audio.ctx.createBuffer(1, n, audio.ctx.sampleRate), d = b.getChannelData(0); let s = 7;
    for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
    audio.noise = b;
  }
  audio.on = !audio.on; if (audio.on) audio.ctx.resume();
  soundBtn.setAttribute("aria-pressed", String(audio.on)); soundBtn.textContent = audio.on ? "Sound on" : "Sound off";
});

/* ================= proposers: the rain's, the opening's, and yours ================= */
const TR = window.CytherTrace;
const proposer = (seed, user) => ({ e: CI.biEngine(seed), seed, user, n: 0, path: [[6, 6]], toks: [], refused: 0, crossed: 0 });
const RAIN = [3, 4, 5, 8, 9, 10, 13, 14, 16, 17, 19, 20].map(s => proposer(s, false));   /* seed 3's first proposal is refused: the opening */
let yours = null, opening = null, rainTurn = 0;
const tally = { judged: 0, refused: 0 };

/* one proposed operation, followed: the attempt it extends and, if refused, its receipt.
   It reads only the proposer's own state, so a link can replay it exactly. */
function follow(pp) {
  const ev = pp.e.step(); pp.n++;
  if (ev.e === "ok") { pp.path.push([ev.to.x, ev.to.y]); pp.toks = ev.toks.map(t => t.s); pp.crossed++; return { ev }; }
  if (ev.e === "adm") { pp.path = [[6, 6]]; pp.toks = []; pp.crossed++; return { ev }; }
  pp.refused++;
  const why = ev.e === "inv" ? "KERNEL" : ev.why, n = pp.toks.length, tk = ev.tk, f = ev.from;
  const h = CM.fnv(hex(pp.seed) + ":" + pp.n + ":" + pp.toks.join("") + "|" + tk.s) >>> 0;
  const stroke = tk.k === "H" ? [[f.x, f.y], [f.x + tk.sg * tk.mg, f.y]] : tk.k === "V" ? [[f.x, f.y], [f.x, f.y + tk.sg * tk.mg]] : tk.k === "Z" ? [[f.x, f.y], [6, 6]] : null;
  const rc = { seed: pp.seed, index: pp.n, h, why, token: n + 1, discarded: !!ev.discarded, code: TR.code(why, n, h, ev.discarded), path: pp.path.slice(), stroke };
  if (ev.discarded || ev.e === "inv") { pp.path = [[6, 6]]; pp.toks = []; }
  return { ev, rc };
}
const label = (rc, who) => (who ? who + " · " : "") + "REFUSED · " + rc.why + " · token " + rc.token + " · " + hex(rc.h) + (rc.discarded ? " · attempt abandoned" : "");

/* a link carries a decision, not a picture: #trace=SEED.INDEX.HASH is replayed here, locally,
   and must reproduce its own hash before the opening proposal is allowed to become it */
const SENT = /^#trace=([0-9A-F]{8})\.(\d{1,5})\.([0-9A-F]{8})$/i.exec(location.hash);
if (SENT) {
  const seed = parseInt(SENT[1], 16), index = +SENT[2], probe = proposer(seed, "SENT");
  let rc = null; while (probe.n < index) rc = follow(probe).rc;
  if (rc && rc.index === index && hex(rc.h) === SENT[3].toUpperCase()) {
    opening = proposer(seed, "SENT"); while (opening.n < index - 1) follow(opening);
  } else $("#unsent").hidden = false;
}

/* every refusal: a trace the glass keeps, a live mark, a ghost of the stroke that never existed */
const traces = [], hits = new Float32Array(24 * 4).fill(-99), ghosts = [];
let hitAt = 0, nStamps = 0, mine = null;
function judge(pp, x, z, now, big) {
  const { ev, rc } = follow(pp); tally.judged++;
  if (!rc) return ev.e;
  tally.refused++;
  const t = { x, z, code: rc.code, label: label(rc, pp.user), rc };
  traces.push(t); if (traces.length > 8000) traces.shift();
  hits.set([x, z, now, rc.code], hitAt * 4); hitAt = (hitAt + 1) % 24;
  if (R && nStamps < MAXS) { R.stamps.set([x, z, rc.code], nStamps * 3); nStamps++; }
  ghosts.push({ path: rc.path, stroke: rc.stroke, x, z, t: now, big }); if (ghosts.length > 40) ghosts.shift();
  /* the receipt you carry: your latest gesture's first refusal, else the one you were sent, else the first you saw */
  if (pp.user === "YOURS" ? pp.refused === 1 : !mine) own(t, pp.user || "FIRST");
  sound("evidence");
  return "rej";
}
function own(t, who) {
  mine = Object.assign({ who }, t);
  if (who === "YOURS") history.replaceState(null, "", "#trace=" + hex(t.rc.seed) + "." + t.rc.index + "." + hex(t.rc.h));
  $("#mineTrace").innerHTML = TR.svg(t.code);
  $("#mineHash").textContent = hex(t.rc.h);
  $("#mineWho").textContent = (who === "YOURS" ? "yours" : who === "SENT" ? "sent to you" : "the first refusal you saw") + " · " + TR.VERSION;
}

/* ================= beads ================= */
const BR = .042;
const bx = new Float32Array(MAXB), by = new Float32Array(MAXB), bz = new Float32Array(MAXB), vx = new Float32Array(MAXB), vy = new Float32Array(MAXB), vz = new Float32Array(MAXB);
const st = new Uint8Array(MAXB).fill(9), dec = new Float32Array(MAXB), die = new Float32Array(MAXB), rad = new Float32Array(MAXB), owner = new Int8Array(MAXB), still = new Uint8Array(MAXB);
const adm = new Float32Array(MAXB), rest = new Uint8Array(MAXB);
let spawnAt = 0, rng = 12345, pulse = 0;
const rand = () => (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
const onGlass = (x, z) => Math.abs(x) < GLASS.h[0] - .02 && Math.abs(z) < GLASS.h[2] - .02;
function spawn(x, y, z, v, who, stop = false) {
  for (let k = 0; k < MAXB; k++) { const i = (spawnAt + k) % MAXB; if (st[i] !== 9) continue;
    spawnAt = i + 1; bx[i] = x; by[i] = y; bz[i] = z; vx[i] = (rand() - .5) * .2; vy[i] = v; vz[i] = (rand() - .5) * .2;
    st[i] = 0; dec[i] = 0; die[i] = -1; rest[i] = 0; rad[i] = BR * (stop ? 1.5 : .82 + rand() * .36); owner[i] = who; still[i] = stop ? 1 : 0; return; }
}
/* the top of whatever real matter lies under a bead of radius r at (x, z), at or below y; the floor otherwise. Black is never support. */
function support(x, z, y, r) {
  let top = 0;
  for (let j = 0; j < K; j++) { const hy = BH[j * 4 + 1]; if (hy <= 0) continue; const t = BC[j * 4 + 1] + hy;
    if (t <= y + .05 && t > top && Math.abs(x - BC[j * 4]) < BH[j * 4] + r && Math.abs(z - BC[j * 4 + 2]) < BH[j * 4 + 2] + r) top = t; }
  return top;
}
function simulate(now, dt, rain) {
  const n = Math.floor(rain * dt + rand());
  for (let k = 0; k < n; k++) spawn((rand() - .5) * 5.4, 6.2 + rand() * 1.2, (rand() - .5) * 3.4, -1.5 - rand() * .9, -1);
  for (let i = 0; i < MAXB; i++) {
    if (st[i] === 9) continue;
    if (st[i] === 2 && !rest[i]) vy[i] -= 6.2 * dt;                 /* weight belongs to what was admitted */
    if (!rest[i]) { bx[i] += vx[i] * dt; by[i] += vy[i] * dt; bz[i] += vz[i] * dt; }
    const r = rad[i];
    if (st[i] === 0 && onGlass(bx[i], bz[i]) && by[i] - r <= TOP && by[i] > BOTTOM) {   /* the instant of judgment */
      const pp = owner[i] === 1 ? yours : owner[i] === 2 ? opening : owner[i] === 3 ? RAIN[1] : RAIN[rainTurn++ % RAIN.length];
      const v = judge(pp, bx[i], bz[i], now, still[i] === 1);
      if (v === "rej") { st[i] = 9; R.beads[i * 6 + 3] = 0; continue; }   /* refused: it ceases. No bounce, no future; the trace remains */
      st[i] = 2; adm[i] = now; vx[i] *= .3; vz[i] *= .3; if (v === "adm") pulse = 1;
    }
    if (st[i] === 2) {
      dec[i] = now - adm[i] > .06 ? 1 : 0;                           /* the shadow first; the porcelain a moment later */
      if (!rest[i]) { const top = support(bx[i], bz[i], by[i] - r, r); if (by[i] - r <= top) { by[i] = top + r; vx[i] = vy[i] = vz[i] = 0; rest[i] = 1; die[i] = now + 2; contact(bx[i], by[i], bz[i], top > 0); if (owner[i] === 3 && intro.landed < 0) intro.landed = now; } }
    }
    if (by[i] < -1) st[i] = 9;                                       /* black that missed the pane passes through the floor: nothing stops it */
    let size = r;
    if (die[i] >= 0 && now > die[i]) { const k = (now - die[i]) / .55; size = r * (1 - ease(clamp01(k))); if (k >= 1) { st[i] = 9; size = 0; } }
    const d = R.beads; d[i * 6] = bx[i]; d[i * 6 + 1] = by[i]; d[i * 6 + 2] = bz[i]; d[i * 6 + 3] = st[i] === 9 ? 0 : size; d[i * 6 + 4] = dec[i];
  }
}
function contact(x, y, z, onMatter) {
  if (onMatter) pulse = Math.max(pulse, .35);
  const c = xf(VP, x, y, z); sound("contact", Math.max(-1, Math.min(1, c[0] / c[3])));
}
/* what casts a shadow: the admitted beads, latest first */
let nCast = 0;
function casters() {
  const idx = []; for (let i = 0; i < MAXB; i++) if (st[i] === 2) idx.push(i);
  idx.sort((a, b) => adm[b] - adm[a]); nCast = Math.min(48, idx.length);
  for (let k = 0; k < nCast; k++) { const i = idx[k]; R.casters.set([bx[i], by[i], bz[i], R.beads[i * 6 + 3]], k * 4); }
}

/* ================= the story ================= */
const secs = $$("[data-k]");
/* eye, target, fov · layout · rain · glass */
const SC = [
  { e: [7.9, 4.5, 9.8], t: [.25, 1.45, 0], f: 30, L: "cad", rain: 30 },       /* the model proposes */
  { e: [3.9, 3.3, 4.6], t: [.55, 2.2, .15], f: 34, L: "cad", rain: 46 },      /* most proposals are wrong */
  { e: [1.1, 2.2, 1.25], t: [-2.4, 2.15, -1.3], f: 50, L: "cad", rain: 34 },  /* inside the boundary */
  { e: [6.0, 1.55, 6.6], t: [.1, .95, 0], f: 31, L: "cad", rain: 30 },        /* only the valid crosses */
  { e: [5.5, 3.7, 6.7], t: [.2, .45, 0], f: 30, L: "cad", rain: 16 },         /* CytherCAD */
  { e: [6.6, 2.6, 7.9], t: [.6, 1.0, 0], f: 30, L: "adii", rain: 10 },        /* ADII */
  { e: [5.5, 1.62, 6.7], t: [.15, 1.32, 0], f: 30, L: "awc", rain: 10 },       /* AWC-OS */
  { e: [4.5, 2.25, 5.5], t: [.15, 1.1, 0], f: 30, L: "sijil", rain: 10 },     /* SijilOS */
  { e: [12.4, 10.8, 15.2], t: [0, .7, 0], f: 30, L: "walls", rain: 16 },      /* inside your walls */
  { e: [1.6, 12.8, 2.6], t: [0, 1.6, -.1], f: 36, L: "walls", rain: 0 },       /* what must never happen: stillness */
];
let pivots = [], p = 0;
function measure() { pivots = secs.map(s => s.offsetTop + s.offsetHeight / 2); }
function progress() {
  const mid = scrollY + innerHeight / 2;
  if (mid <= pivots[0]) return 0;
  for (let i = 0; i < pivots.length - 1; i++) if (mid < pivots[i + 1]) return i + (mid - pivots[i]) / (pivots[i + 1] - pivots[i]);
  return pivots.length - 1;
}
const cam = { e: SC[0].e.slice(), t: SC[0].t.slice(), f: SC[0].f };
const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
let VP = new Float32Array(16), IVP = VP, EYE = [0, 0, 0], RIGHT = [1, 0, 0], UP = [0, 1, 0], rain = 0;

/* the opening: a lit floor; one proposal crosses the light and leaves no shadow; a tick; the pane; then the first shadow */
const intro = { on: !!R && !CALM && scrollY < 40, t0: -1, hit: -1, end: -1, landed: -1 };   /* no studio, no opening: the cover and the copy at once */
const OPEN = [1.25, 1.35], OVERHEAD = [-.2, .97, .15].map((v, _, a) => v / Math.hypot(...a));   /* over open floor, lit from above: nothing under it */
if (!intro.on) document.documentElement.classList.remove("intro");
let glassOn = intro.on ? 0 : 1, lightSweep = intro.on ? 1 : 0, lightTop = intro.on ? 1 : 0, introU = [0, 0, 0, 0], introG = 0;

/* time-driven events inside the systems */
let lift = 0, ledgerT = 0, awcT = 0, adiiT = 0;
const weight = s => clamp01(1 - Math.abs(p - s) * 1.6);
function layoutOf(name) {
  if (name === "cad") return pad(L_CAD); if (name === "adii") return pad(L_ADII); if (name === "awc") return pad(L_AWC);
  if (name === "sijil") return ledger(lift); return walls();
}
const BC = new Float32Array(KMAX * 4), BH = new Float32Array(KMAX * 4), BK = new Float32Array(8), BKH = new Float32Array(8);
function matter(dt) {
  const i = Math.min(Math.floor(p), SC.length - 2), f = clamp01(p - i), A = layoutOf(SC[i].L), B = layoutOf(SC[i + 1].L);
  for (let j = 0; j < KMAX; j++) {
    const d = (RANK[j] / KMAX) * .4, fj = ease(clamp01((f - d) / .6)), a = A[j], b = B[j];
    BC[j * 4] = lerp(a[0], b[0], fj); BC[j * 4 + 1] = lerp(a[1], b[1], fj); BC[j * 4 + 2] = lerp(a[2], b[2], fj); BC[j * 4 + 3] = lerp(a[3], b[3], fj);
    BH[j * 4] = lerp(a[4], b[4], fj); BH[j * 4 + 1] = lerp(a[5], b[5], fj); BH[j * 4 + 2] = lerp(a[6], b[6], fj);
  }
  BK.fill(0); BKH.fill(0);
  /* ADII: a black candidate value rises and is held against the glass */
  const w5 = weight(5); adiiT = w5 > .4 ? Math.min(adiiT + dt / 1.8, 1) : 0;
  if (w5 > .01) { const h = .5, top = BOTTOM - .006, y = lerp(h / 2 + .02, top - h / 2, ease(adiiT)); BK.set([SLOT[0], y, SLOT[1], w5]); BKH.set([.14 * w5, h / 2 * w5, .14 * w5, .022], 0); }
  /* AWC-OS: a black answer rises, wider than what supports it; it is stopped and withdrawn */
  const w6 = weight(6); awcT = w6 > .4 ? (awcT + dt / 5.4) % 1 : 0;
  if (w6 > .01) {
    const t = awcT, base = .035 + N * .068, top = base + .42, y = lerp(base, top, ease(clamp01((t - .1) / .32))) - (t > .62 ? ease(clamp01((t - .62) / .28)) * (top - base) : 0);
    const sc = (t < .1 ? ease(t / .1) : 1 - ease(clamp01((t - .7) / .2))) * w6;
    if (sc > .01) BK.set([0, y, 0, 1], 4), BKH.set([1.32 * sc, .05 * sc, .62 * sc, .02], 4);
  }
  /* SijilOS: a black record enters at the bottom, turns white as it locks, and the past rises */
  const w7 = weight(7);
  if (w7 > .5 && K < N + XTRA) { ledgerT += dt / 1.7; lift = ease(clamp01(ledgerT)); if (ledgerT >= 1) { K++; ledgerT = 0; lift = 0; sound("bind"); } }
  else if (w7 <= .5) { ledgerT = 0; lift = 0; }
  if (w7 > .01 && ledgerT > 0) { const z = ease(clamp01(ledgerT)); BK.set([(1 - z) * 2.6, .03, 0, 1], 4); BKH.set([.85, .022, .85, .012], 4); }
}

/* your trace on the matter: on the held value, a hairline through the refused answer, a registration
   mark on the newest record (the receipt hash, 32 ticks), and somewhere in the walls built from them */
const OFF = [[0, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, 0], 0, 0];
function farWall(h) { const far = []; for (let j = 0; j < K; j++) if (Math.abs(BC[j * 4 + 2] + ROOM[1]) < .01 && BH[j * 4 + 2] < .1) far.push(j); return far.length ? far[h % far.length] : -1; }
function decal() {
  if (!mine) return OFF;
  const w5 = weight(5), w7 = weight(7), w8 = Math.max(weight(8), weight(9)), c = mine.code, h = mine.rc.h;
  if (w5 > .01 && BK[3] > 0) return [[BK[0], BK[1], BK[2] + BKH[2], .8], [1, 0, 0, 0], [0, 1, 0, .4 * w5], c, h];
  const j = w7 > .3 ? (K > N ? K - 1 : ORDER[N - 1]) : w8 > .3 ? farWall(h) : -1;
  if (j < 0) return OFF;
  const x = BC[j * 4], y = BC[j * 4 + 1], z = BC[j * 4 + 2] + BH[j * 4 + 2];
  if (w7 > .3) return [[x + BH[j * 4] - .52, y, z, 1], [1, 0, 0, 1], [0, 1, 0, w7], c, h];
  return [[x, 1.25 + ((h >>> 8) % 100 / 100 - .5) * .6, z, 5], [1, 0, 0, 0], [0, 1, 0, .85 * w8], c, h];
}
const kerf = () => mine && weight(6) > .01 ? [((mine.code % 16) / 8 - .5) * 1.6, 0, Math.floor(mine.code / 64) % 64 / 64 * 2 * Math.PI, .004] : [0, 0, 0, 0];

/* cobalt wires: what never existed, drawn where it would have been */
let nWires = 0;
function wire(a, b, alpha, width = 1.6) { if (nWires >= MAXW || alpha <= .004) return; R.wires.set([a[0], a[1], a[2], b[0], b[1], b[2], alpha, width], nWires * 8); nWires++; }
function boxWire(c, h, alpha, width) {
  const v = []; for (let k = 0; k < 8; k++) v.push([c[0] + (k & 1 ? h[0] : -h[0]), c[1] + (k & 2 ? h[1] : -h[1]), c[2] + (k & 4 ? h[2] : -h[2])]);
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) wire(v[i], v[j], alpha, width);
}
function wires(now) {
  nWires = 0;
  const cadNear = weight(4) > .5;
  for (const g of ghosts) {
    const life = g.big ? 2.8 : .75, age = now - g.t; if (age > life) continue;
    const a = (1 - ease(clamp01((age - life * .3) / (life * .7)))) * ease(clamp01(age / .06));
    /* under the pane at the impact, or — while CytherCAD is in view — at the scale of the part */
    const atPart = cadNear && !g.big, s = atPart ? S : g.big ? .16 : .045, y = atPart ? PART_H + .03 : BOTTOM - .03;
    const at = ([gx, gy]) => atPart ? [(gx - CX) * s, y, (CY - gy) * s] : [g.x + (gx - 6) * s, y, g.z - (gy - 6) * s];
    for (let k = 0; k + 1 < g.path.length; k++) wire(at(g.path[k]), at(g.path[k + 1]), a * .55, 1.2);
    if (g.stroke) wire(at(g.stroke[0]), at(g.stroke[1]), a, 2.2);
  }
  if (mine && cadNear) {
    const k = (now % 3.4) / 3.4, a = k < .35 ? Math.sin(k / .35 * Math.PI) : 0, at = ([gx, gy]) => [(gx - CX) * S, PART_H + .035, (CY - gy) * S];
    for (let i = 0; i + 1 < mine.rc.path.length; i++) wire(at(mine.rc.path[i]), at(mine.rc.path[i + 1]), a * .6, 1.4);
    if (mine.rc.stroke) wire(at(mine.rc.stroke[0]), at(mine.rc.stroke[1]), a, 2.8);
  }
  const w5 = weight(5), w6 = weight(6), w7 = weight(7), w8 = Math.max(weight(8), weight(9));
  /* ADII: where the held value would have stood, had it been admitted */
  if (w5 > .01) boxWire([SLOT[0], .725, SLOT[1]], [.14, .725, .14], w5 * ease(adiiT) * .9, 1.4);
  /* AWC-OS: the promise that exceeds what supports it */
  if (w6 > .01 && awcT > .4 && awcT < .66) {
    const base = .035 + N * .068, y = base + .42, al = w6 * (1 - Math.abs(awcT - .53) / .13);
    for (const sx of [-1, 1]) { boxWire([sx * 1.16, y, 0], [.165, .056, .627], al, 2); wire([sx * 1.32, y - .056, .62], [sx * 1.32, base, .62], al, 1.6); wire([sx * 1.0, base, -.62], [sx * 1.0, base, .62], al, 1.6); }
  }
  /* SijilOS, and the walls built from it: one filament binds every record to the one before */
  if (w7 > .01) { const top = .03 + (K - 1) * .057 + lift * .057 + .022; wire([.865, 0, .865], [.865, top, .865], w7, 1.8); }
  if (w8 > .01) { const [A, B] = ROOM, y = 1.25, i = .075; const c = [[-A + i, y, -B + i], [A - i, y, -B + i], [A - i, y, B - i], [-A + i, y, B - i]]; for (let k = 0; k < 4; k++) wire(c[k], c[(k + 1) % 4], w8 * .9, 1.2); }
}

/* ================= camera ================= */
function story(now, dt) {
  p = progress();
  const i = Math.min(Math.floor(p), SC.length - 2), f = ease(clamp01(p - i)), a = SC[i], b = SC[i + 1];
  const k = CALM ? 1 : 1 - Math.exp(-dt * 2.4);
  for (let j = 0; j < 3; j++) { cam.e[j] += (lerp(a.e[j], b.e[j], f) * (MOBILE && p < 1.5 ? 1.45 : 1) - cam.e[j]) * k; cam.t[j] += (lerp(a.t[j], b.t[j], f) - cam.t[j]) * k; }
  cam.f += (lerp(a.f, b.f, f) + (MOBILE ? 8 : 0) - cam.f) * k;
  rain += (lerp(a.rain, b.rain, f) - rain) * k;
  if (!CALM) { const kp = 1 - Math.exp(-dt * 2.5); ptr.sx += (ptr.x - ptr.sx) * kp; ptr.sy += (ptr.y - ptr.sy) * kp; }
  secs.forEach((s, j) => { const v = clamp01(1 - (Math.abs(p - j) - .26) * 2.6).toFixed(2); if (s.dataset.v !== v) { s.dataset.v = v; s.style.setProperty("--v", v); } });
}
function view() {
  const still = p > 8.6 ? clamp01((p - 8.6) / .4) : 0, az = ptr.sx * .32 * (1 - still), el = ptr.sy * .12 * (1 - still);
  const dx = cam.e[0] - cam.t[0], dz = cam.e[2] - cam.t[2], c = Math.cos(az), s = Math.sin(az);
  EYE = [cam.t[0] + dx * c - dz * s, cam.e[1] - el * 2.5, cam.t[2] + dx * s + dz * c];
  const L = look(EYE, cam.t); RIGHT = L.right; UP = L.up;
  VP = mul(persp(cam.f * Math.PI / 180, R ? R.aspect() : innerWidth / innerHeight, .05, 400, MOBILE ? 0 : .34, MOBILE ? .52 : 0), L.m); IVP = inv(VP);
}
function bounds() {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let j = 0; j < K; j++) { if (BH[j * 4 + 1] <= 0) continue; for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], BC[j * 4 + a] - BH[j * 4 + a] - .05); hi[a] = Math.max(hi[a], BC[j * 4 + a] + BH[j * 4 + a] + .05); } }
  for (let s = 0; s < 2; s++) { if (BK[s * 4 + 3] <= 0) continue; for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], BK[s * 4 + a] - BKH[s * 4 + a] - .05); hi[a] = Math.max(hi[a], BK[s * 4 + a] + BKH[s * 4 + a] + .05); } }
  return lo[0] > hi[0] ? [[1, 1, 1], [-1, -1, -1]] : [lo, hi];
}

/* ================= pointer: light, proposals, receipts ================= */
function glassPoint(px, py) {
  const nx = px / innerWidth * 2 - 1, ny = 1 - py / innerHeight * 2, a = xf(IVP, nx, ny, -1), b = xf(IVP, nx, ny, 1);
  const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], d = [b[0] / b[3] - o[0], b[1] / b[3] - o[1], b[2] / b[3] - o[2]];
  if (Math.abs(d[1]) < 1e-5) return null; const t = (TOP - o[1]) / d[1]; if (t < 0) return null;
  const x = o[0] + d[0] * t, z = o[2] + d[2] * t; return onGlass(x, z) ? [x, z] : null;
}
const tip = $("#receipt"), yourLine = $("#yours");
let focusTrace = [0, 0, 0, 0], drag = null;
const onCanvas = e => e.target === canvas;
addEventListener("pointermove", e => {
  ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1;
  if (!R || drag || !onCanvas(e)) { if (!drag) { focusTrace = [0, 0, 0, 0]; tip.hidden = true; } return; }
  const g = glassPoint(e.clientX, e.clientY); let best = null, bd = .012;
  if (g) for (let i = traces.length - 1; i >= 0 && i > traces.length - 4000; i--) { const t = traces[i], d = (t.x - g[0]) ** 2 + (t.z - g[1]) ** 2; if (d < bd) { bd = d; best = t; } }
  if (!best) { if (focusTrace[3]) wake(); focusTrace = [0, 0, 0, 0]; tip.hidden = true; canvas.style.cursor = "crosshair"; return; }
  if (focusTrace[0] !== best.x || focusTrace[1] !== best.z) wake();
  focusTrace = [best.x, best.z, best.code, 1]; tip.textContent = best.label; tip.hidden = false; canvas.style.cursor = "default";
  tip.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - tip.offsetWidth - 12)}px,${e.clientY + 18}px)`;
}, { passive: true });
addEventListener("scroll", () => { wake(); if (!tip.hidden) { tip.hidden = true; focusTrace = [0, 0, 0, 0]; } }, { passive: true });   /* a receipt belongs to the view it was read in */
addEventListener("pointerdown", e => { if (R && e.button === 0 && onCanvas(e)) { const g = glassPoint(e.clientX, e.clientY); if (g) drag = { g, x: e.clientX, y: e.clientY }; } });
addEventListener("pointerup", e => {
  if (!drag) return; const d = drag; drag = null;
  const g2 = glassPoint(e.clientX, e.clientY) || d.g;
  /* your gesture is the seed: where you touched the glass, and which way you moved */
  const key = [Math.round(d.g[0] / .05), Math.round(d.g[1] / .05), Math.round((g2[0] - d.g[0]) / .1), Math.round((g2[1] - d.g[1]) / .1)].join("|");
  yours = proposer(CM.fnv("gesture:" + key) >>> 0, "YOURS"); wake();
  const dx = g2[0] - d.g[0], dz = g2[1] - d.g[1], len = Math.hypot(dx, dz) || 1;
  for (let k = 0; k < 10; k++) { const s = k / 9 * Math.min(len, 1.2), x = d.g[0] + dx / len * s + (rand() - .5) * .08, z = d.g[1] + dz / len * s + (rand() - .5) * .08;
    spawn(Math.max(-2.9, Math.min(2.9, x)), TOP + 1.6 + k * .2, Math.max(-1.9, Math.min(1.9, z)), -.8, 1); }
});

/* ================= the readout ================= */
const out = {}; $$("[data-t]").forEach(el => (out[el.dataset.t] = out[el.dataset.t] || []).push(el));
const put = (k, v) => (out[k] || []).forEach(el => { if (el.textContent !== v) el.textContent = v; });
put("prg", PRG); put("cells", String(N));
$$("[data-m]").forEach(el => { if (CM.project(el.dataset.m) !== el.textContent) { el.style.outline = "1px dashed #c00"; console.error("stale projection", el.dataset.m); } });
const external = () => performance.getEntriesByType("resource").filter(e => new URL(e.name, location.href).origin !== location.origin).length;
measure(); addEventListener("resize", () => { measure(); wake(); }); addEventListener("load", measure);
const copyBtn = $("#copy");
copyBtn.addEventListener("click", () => navigator.clipboard.writeText(location.href).then(
  () => { copyBtn.textContent = "Link copied"; },
  () => { copyBtn.textContent = "Copy it from the address bar"; }));   /* clipboard refused: the address bar already holds the link */

/* ================= the end: stillness, then the light finds your trace among all of them ================= */
const rcpt = $("#mine"), stillNote = $("#still");
let lamp = [0, 0, 0, 0], mineU = [0, 0, 0, 0], reveal = -1, halted = false;
function ending(now) {
  const there = p > 8.95 && Math.hypot(cam.e[0] - SC[9].e[0], cam.e[1] - SC[9].e[1], cam.e[2] - SC[9].e[2]) < .02;
  if (!there || !mine) { reveal = -1; rcpt.hidden = true; lamp = [0, 0, 0, 0]; mineU = [0, 0, 0, 0]; return there; }
  if (reveal < 0) reveal = now;
  const k = clamp01((now - reveal) / 2.2), e = ease(k);
  lamp = [lerp(-1.6, mine.x, e), lerp(-1.0, mine.z, e), 0, Math.sin(Math.min(k * 1.6, 1) * Math.PI / 2)];
  mineU = [mine.x, mine.z, mine.code, ease(clamp01((k - .5) / .5))];
  if (k > .75) {
    const c = xf(VP, mine.x, TOP, mine.z), px = (c[0] / c[3] * .5 + .5) * innerWidth, py = (.5 - c[1] / c[3] * .5) * innerHeight;
    rcpt.hidden = false;
    const w = rcpt.offsetWidth, beside = px + 26 + w < innerWidth - 16;   /* beside the trace, or below it — never over it */
    const x = beside ? px + 26 : Math.max(16, Math.min(px - w / 2, innerWidth - w - 16)), y = beside ? py - 24 : py + 30;
    rcpt.style.transform = `translate(${x}px,${Math.max(16, Math.min(y, innerHeight - rcpt.offsetHeight - 16))}px)`;
  }
  return k >= 1;
}
/* nothing is allowed to change: no proposal falling, no mark still fading, the camera at rest */
function settled() {
  if (intro.on || rain > .02 || pulse > 0) return false;
  for (let i = 0; i < MAXB; i++) if (st[i] !== 9) return false;
  for (let i = 0; i < 24; i++) if (clock - hits[i * 4 + 2] < 1.6) return false;
  for (const g of ghosts) if (clock - g.t < (g.big ? 2.8 : .75)) return false;
  return true;
}
function wake() { if (!halted) return; halted = false; stillNote.hidden = true; last = performance.now() / 1000; requestAnimationFrame(frame); }

/* ================= one clock ================= */
let last = performance.now() / 1000, clock = 0, hud = -1;
if (opening && !intro.on) judge(opening, OPEN[0], OPEN[1], 0, false);
function frame(ms) {
  const dt = Math.min(ms / 1000 - last, .05); last = ms / 1000; clock += dt;
  story(clock, dt);
  if (intro.on) {
    if (intro.t0 < 0) intro.t0 = clock;
    const t = clock - intro.t0;
    if (t > .5 && !intro.dropped) { spawn(OPEN[0], TOP + 2.0, OPEN[1], -1.1, opening ? 2 : -1, true); intro.dropped = true; }
    if (intro.hit < 0 && tally.judged > 0) { intro.hit = clock; intro.tr = traces[traces.length - 1]; }   /* the first judgment: a tick in empty air */
    const h = intro.hit < 0 ? -1 : clock - intro.hit;
    if (intro.tr && h >= 0) { introG = .2 + .8 * (1 - Math.pow(1 - clamp01(h / .55), 3)); introU = [intro.tr.x, intro.tr.z, intro.tr.code, 1 - ease(clamp01((h - 2.6) / 1.2))]; }
    if (h > .9) { const k = clamp01((h - .9) / 1.8); glassOn = k; lightSweep = 1 - ease(k); }   /* then the light finds the glass */
    if (h > 2 && !intro.crossed) { spawn(.55, TOP + 1.3, 1.6, -1.1, 3, true); intro.crossed = true; }   /* the first operation the boundary accepts: the first shadow */
    if (h > 3.4 && !intro.copy) { document.documentElement.classList.remove("intro"); intro.copy = true; }
    if (h > 4.8 || p > .35 || t > 11) { intro.on = false; intro.end = clock; glassOn = 1; lightSweep = 0; introU = [0, 0, 0, 0]; document.documentElement.classList.remove("intro");
      if (opening && !intro.dropped) judge(opening, OPEN[0], OPEN[1], clock, false); }
  }
  const ramp = intro.on ? 0 : intro.end < 0 ? 1 : clamp01((clock - intro.end) / 2.5);
  const rainNow = rain * (CALM ? .35 : MOBILE ? .55 : 1) * ramp;
  view();
  if (R) {
    nStamps = 0;
    simulate(clock, dt, rainNow);
    matter(dt); wires(clock); casters();
    pulse = Math.max(0, pulse - dt * 2.5);
    const free = p > 8.6 ? 0 : 1, az = .62 + ptr.sx * .55 * free - lightSweep * 1.5, k0 = [-Math.cos(az) * .62, .74 - ptr.sy * .08 * free, Math.sin(az) * .62 + .2], k0l = Math.hypot(...k0);
    const leave = intro.landed >= 0 ? intro.landed + .8 : intro.end;   /* the overhead light leaves once the first shadow has landed */
    if (leave >= 0) lightTop = Math.min(lightTop, 1 - ease(clamp01((clock - leave) / 1.6)));
    const key = k0.map((v, j) => lerp(v / k0l, OVERHEAD[j], lightTop)), kl = Math.hypot(...key);
    const done = ending(clock);
    const [lo, hi] = bounds();
    R.draw({ dt, time: clock, vp: VP, ivp: IVP, eye: EYE, right: RIGHT, up: UP, key: key.map(v => v / kl), glass: glassOn,
      k: K, bc: BC, bh: BH, bk: BK, bkh: BKH, pulse, bmin: lo, bmax: hi, hits, focusTrace, intro: introU, introG, dec: decal(), kerf: kerf(), mine: mineU, lamp,
      nCast, fov: cam.f * Math.PI / 180,
      focusD: Math.hypot(EYE[0] - cam.t[0], EYE[1] - cam.t[1], EYE[2] - cam.t[2]), nStamps, nWires });
    if (done && settled()) halted = true;
  }
  if (halted || clock - hud > .2) {
    hud = clock; put("judged", fmt(tally.judged)); put("refused", fmt(tally.refused)); put("traces", fmt(traces.length)); put("ext", String(external()));
    if (yours) { yourLine.hidden = false; put("yseed", hex(yours.seed)); put("yref", fmt(yours.refused)); put("ycross", fmt(yours.crossed)); copyBtn.hidden = !(mine && mine.who === "YOURS"); }
  }
  if (halted) { stillNote.hidden = false; return; }   /* nothing is changing, so nothing is computed: the last frame stands */
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
