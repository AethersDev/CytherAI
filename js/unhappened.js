/* ============================================================================
   js/unhappened.js — the CytherAI homepage: THE UNHAPPENED.
   Black may propose. White may exist. Cobalt must explain why.

   Nothing exists when the page begins. Every bead is one proposed operation —
   a token offered to extend a program — judged by the boundary engine of the
   record (CytherInstrument.biEngine) as it strikes the pane.
     REFUSED   — it ceases at the pane. Its stroke flashes as a cobalt ghost where
                 its attempt was assembling, and the pane keeps a Cyther Trace
                 (TRACE-1, js/trace.js) drawn from the receipt.
     ACCEPTED  — the token crosses, still black, and joins its attempt: a black
                 candidate profile assembling under the pane, visible and causally
                 absent. No shadow, no consequence.
     ADMITTED  — only when the kernel admits the closed program does anything
                 become real. Its profile lands on the floor as a hard shadow with
                 nothing above it — the licence — and porcelain then extrudes
                 straight up out of that shadow until it fits it.
   The one causal light is vertical and never moves, so a solid's shadow is its
   profile at any height. A photographic fill follows the cursor and casts nothing.
   Each admitted profile takes the next bay around the room, decided when it is
   admitted; the walls at the end are the same solids extruded further, never
   moved. Two ledgers face each other: the pane, what didn't happen; the floor,
   what did. A short visit leaves a short room — gaps are left, never filled.

   Cobalt is evidence, outside the light: composited after exposure, never lit,
   blurred, refracted or reflected. Your gesture seeds a proposer; its first
   refusal is yours, carried to the end, and replayable from #trace=SEED.INDEX.HASH
   (local, never sent). When nothing is changing, nothing renders.
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

/* ================= the world: empty until something is admitted ================= */
function walk(toks) { let x = 6, y = 6; const v = [[x, y]]; for (const t of toks) { if (t.k === "Z") break; if (t.k === "H") x += t.sg * t.mg; else y += t.sg * t.mg; v.push([x, y]); } return v; }
function inPoly(v, x, y) { let c = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) { const [xi, yi] = v[i], [xj, yj] = v[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const GLASS = { c: [0, 2.2, 0], h: [3.0, .085, 2.0], r: .05 };
const TOP = GLASS.c[1] + GLASS.h[1], BOTTOM = GLASS.c[1] - GLASS.h[1];
/* FS: floor metres per grid unit of an admitted profile; CS: the same profile while it is only a candidate under the pane */
const ROOM = [3.95, 2.95], FS = .13, CS = .085, WALL_H = 2.6, GAP = .1, CORNER = .95, HOLD = .4, RISE = .9, LIFT = .12;
const FLOOR = [-7, -5.6, 14, 11.2];           /* the floor ledger's extent: x0, z0, width, depth */
const admitted = [];                          /* every program the kernel admitted on this visit, in order */

/* the room is a perimeter of bays, filled in admission order: the back from just right of centre (where the opening view
   sees the floor, through the pane), then left, front, right; then the next ring out. Its inner edge clears the pane. */
const SIDES = A => [[[A[0], -A[1]], [-1, 0], [0, 1], 2 * A[0]], [[-A[0], -A[1]], [0, 1], [1, 0], 2 * A[1]],
                    [[-A[0], A[1]], [1, 0], [0, -1], 2 * A[0]], [[A[0], A[1]], [0, -1], [-1, 0], 2 * A[1]]];
const bay = { ring: 0, side: 0, s: ROOM[0] - .6 };
function place(loc, U, W) {
  const along = Math.max(U, W), depth = Math.min(U, W), flip = W > U;
  for (let guard = 0; guard < 64; guard++) {
    const [c0, dir, inn, len] = SIDES([ROOM[0] + bay.ring * 1.1, ROOM[1] + bay.ring * 1.1])[bay.side];
    if (bay.s + along <= len - CORNER) {
      const m = bay.s + along / 2; bay.s += along + GAP;
      const cx = c0[0] + dir[0] * m + inn[0] * depth / 2, cz = c0[1] + dir[1] * m + inn[1] * depth / 2;
      const cells = loc.map(([u, w]) => { const a = flip ? w : u, d = flip ? -u : w; return [cx + dir[0] * a + inn[0] * d, cz + dir[1] * a + inn[1] * d]; });
      const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]), h = FS / 2;
      return { cells, cx, cz, side: bay.side, ring: bay.ring, minX: Math.min(...xs) - h, maxX: Math.max(...xs) + h, minZ: Math.min(...zs) - h, maxZ: Math.max(...zs) + h };
    }
    bay.side = (bay.side + 1) % 4; bay.s = CORNER; if (bay.side === 0) bay.ring++;
  }
  return null;
}
/* where the next admission will stand: the camera may wait there before anything does */
function nextBay() {
  const [c0, dir, inn] = SIDES([ROOM[0] + bay.ring * 1.1, ROOM[1] + bay.ring * 1.1])[bay.side];
  return [c0[0] + dir[0] * (bay.s + .4) + inn[0] * .35, c0[1] + dir[1] * (bay.s + .4) + inn[1] * .35];
}

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
/* your trace carried on matter: TRACE-1 on a face, or the receipt hash as 32 ticks (tall = 1) */
const DECAL = `
uniform vec4 uDecO, uDecU, uDecV; uniform float uDecCode; uniform uint uDecHash;
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
`;

/* the studio: the floor and its ledger, and the black candidates the systems propose (visible, never real) */
const SCENE = [FULL, STUDIO + TRACE + DECAL + `
in vec2 vUV; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
uniform mat4 uInvVP, uVP; uniform vec3 uEye, uKey; uniform float uGlassOn, uPxA;
uniform vec4 uBk[2], uBkH[2], uKerf; uniform vec3 uBMin, uBMax, uGC, uGH;
uniform sampler2D uLedger; uniform vec4 uFloor;
float mapVisible(vec3 p){
  float r = 1e5;
  for (int i = 0; i < 2; i++) { if (uBk[i].w <= 0.) continue; float d = sdRBox(p - uBk[i].xyz, uBkH[i].xyz, uBkH[i].w);
    if (i == 1 && uKerf.w > 0.) d = max(d, uKerf.w - abs(dot(p.xz - uKerf.xy, vec2(cos(uKerf.z), sin(uKerf.z)))));   /* your trace, as a hairline */
    r = min(r, d); }
  return r;
}
vec3 calcN(vec3 p){ const vec2 k = vec2(1., -1.); const float e = .0008;
  return normalize(k.xyy * mapVisible(p + k.xyy * e) + k.yyx * mapVisible(p + k.yyx * e) + k.yxy * mapVisible(p + k.yxy * e) + k.xxx * mapVisible(p + k.xxx * e)); }
/* r: the licence, an admitted profile; g: porcelain standing on it */
vec2 ledger(vec2 xz){ vec2 uv = (xz - uFloor.xy) / uFloor.zw; return any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.))) ? vec2(0.) : texture(uLedger, uv).rg; }
vec3 shadeFloor(vec3 p, float t){
  float sh = 1. - ledger(p.xz).r;                                 /* the causal light is vertical: only an admitted profile darkens the floor */
  if (abs(p.x - uGC.x) < uGH.x && abs(p.z - uGC.z) < uGH.z) sh *= mix(1., .93, uGlassOn);   /* the pane is real too */
  float near = 0.;
  for (int i = 0; i < 8; i++) { float a = float(i) * .785398; vec2 d = vec2(cos(a), sin(a)); near += ledger(p.xz + d * .06).g + ledger(p.xz + d * .15).g * .6; }
  return mix(FLOOR * mix(.6, 1., sh) * (1. - .3 * near / 12.8), FLOOR, smoothstep(14., 70., t));
}
vec3 shadeBlack(vec3 p, vec3 n, vec3 rd){
  float dif = clamp((dot(n, uKey) + .3) / 1.3, 0., 1.), hemi = .55 + .45 * n.y, fr = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  return vec3(.006) * (dif + hemi) + envR(reflect(rd, n)) * fr * .95 + pow(max(dot(n, normalize(uKey - rd)), 0.), 160.) * 2.;
}
void main(){
  vec4 a = uInvVP * vec4(vUV * 2. - 1., -1., 1.), b = uInvVP * vec4(vUV * 2. - 1., 1., 1.);
  vec3 ro = uEye, rd = normalize(b.xyz / b.w - a.xyz / a.w);
  float tF = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  vec2 tb = boxHit(ro, rd, uBMin, uBMax);
  float t = max(tb.x, 0.), tEnd = min(tb.y, tF); bool hit = false;
  if (tb.x < tb.y && tb.y > 0.) for (int i = 0; i < 96; i++) { if (t > tEnd) break; float h = mapVisible(ro + rd * t); if (h < .0006 * t) { hit = true; break; } t += h * .9; }
  vec3 col; float dist, ev = 0.;
  if (hit) { vec3 p = ro + rd * t, n = calcN(p); col = shadeBlack(p, n, rd); dist = t; ev = decal(p, n, t * uPxA / max(abs(dot(n, rd)), .25)); }
  else if (tF < 1e8) { col = shadeFloor(ro + rd * tF, tF); dist = tF; }
  else { col = env(rd); dist = 1e4; }
  vec4 c = uVP * vec4(ro + rd * min(dist, 400.), 1.);
  gl_FragDepth = dist < 1e3 ? clamp(c.z / c.w * .5 + .5, 0., 1.) : 1.;
  o = vec4(col, dist); o2 = vec4(ev);   /* evidence is written apart from the light, and composited after it */
}`];

/* admitted matter: one porcelain prism per occupied cell, extruded from the floor */
const PRISM = [`layout(location=0) in vec3 aV; layout(location=1) in vec3 aN; layout(location=2) in vec4 aI; layout(location=3) in float aB;
uniform mat4 uVP; out vec3 vP; flat out vec3 vN;
void main(){ vec3 P = vec3(aI.x + aV.x * aI.z, aB + aV.y * aI.w, aI.y + aV.z * aI.z); vP = P; vN = aN;
  gl_Position = aI.w > 0. ? uVP * vec4(P, 1.) : vec4(2., 2., 2., 1.); }`,
STUDIO + TRACE + DECAL + `in vec3 vP; flat in vec3 vN; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
uniform vec3 uEye, uKey; uniform float uPxA;
void main(){
  vec3 n = vN, rd = normalize(vP - uEye), h = normalize(uKey - rd);
  float fill = clamp((dot(n, uKey) + .3) / 1.3, 0., 1.), top = max(n.y, 0.), hemi = .55 + .45 * n.y;   /* the fill shapes it; only the vertical light is causal */
  float fr = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.), foot = mix(.64, 1., smoothstep(0., .14, vP.y));   /* contact darkens only matter on the floor */
  vec3 col = vec3(.885, .88, .865) * (fill * .85 + top * .4 + hemi * .45) * foot + pow(max(dot(n, h), 0.), 90.) * .35 + fr * envR(reflect(rd, n)) * .22;
  float dist = length(vP - uEye);
  o = vec4(col, dist); o2 = vec4(decal(vP, n, dist * uPxA / max(abs(dot(n, rd)), .25)));
}`];

const BEAD = [`layout(location=0) in vec2 aQ; layout(location=1) in vec4 aP;
uniform mat4 uVP; uniform vec3 uRight, uUp; out vec2 vQ; flat out vec3 vC; flat out float vR;
void main(){ vQ = aQ; vC = aP.xyz; vR = aP.w;
  gl_Position = aP.w > 0. ? uVP * vec4(aP.xyz + (uRight * aQ.x + uUp * aQ.y) * aP.w * 1.05, 1.) : vec4(2., 2., 2., 1.); }`,
STUDIO + `in vec2 vQ; flat in vec3 vC; flat in float vR; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
uniform mat4 uVP; uniform vec3 uRight, uUp, uEye, uKey;
void main(){
  float r2 = dot(vQ, vQ); if (r2 > 1.) discard;
  vec3 f = normalize(uEye - vC), n = normalize(uRight * vQ.x + uUp * vQ.y + f * sqrt(1. - r2)), P = vC + n * vR, rd = normalize(P - uEye);
  vec4 c = uVP * vec4(P, 1.); gl_FragDepth = c.z / c.w * .5 + .5;
  float dif = clamp((dot(n, uKey) + .2) / 1.2, 0., 1.), hemi = .55 + .45 * n.y, fr = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  o = vec4(vec3(.006) * (dif + hemi) + envR(reflect(rd, n)) * fr * .95 + pow(max(dot(reflect(-uKey, n), -rd), 0.), 90.) * 2.2, length(P - uEye)); o2 = vec4(0.);
}`];

/* lines: cobalt evidence at display resolution; black candidates in the world (the same geometry, a different existence) */
const LINE_VS = `layout(location=0) in vec2 aQ; layout(location=1) in vec3 aA; layout(location=2) in vec3 aB; layout(location=3) in vec2 aW;
uniform mat4 uVP; uniform vec2 uRes; uniform float uPx; uniform vec3 uEye; out float vA, vS, vD;
void main(){
  vec4 ca = uVP * vec4(aA, 1.), cb = uVP * vec4(aB, 1.);
  if (aW.x <= 0. || ca.w < .05 || cb.w < .05) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; float l = length(d); vec2 t = l > 1e-4 ? d / l : vec2(1., 0.), n = vec2(-t.y, t.x);
  vec4 c = mix(ca, cb, aQ.x); float w = aW.y * uPx;
  c.xy += (n * aQ.y * w + t * (aQ.x * 2. - 1.) * w * .5) / uRes * 2. * c.w;
  gl_Position = c; vA = aW.x; vS = aQ.y; vD = distance(mix(aA, aB, aQ.x), uEye);
}`;
const WIRE = [LINE_VS, `in float vA, vS, vD; out vec4 o; uniform sampler2D uScene; uniform vec2 uRes;
void main(){ if (vD > texture(uScene, gl_FragCoord.xy / uRes).a * 1.002 + .015) discard; float g = 1. - vS * vS; o = vec4(vA * g * g); }`];
const INK = [LINE_VS, `in float vA, vS, vD; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o2;
void main(){ float g = 1. - vS * vS; o = vec4(vec3(.012), vA * g * g); o2 = vec4(0.); }`];

/* stamping: a trace into the pane's memory; a licence (r) or standing porcelain (g) into the floor's */
const STAMP = [`layout(location=0) in vec2 aQ; layout(location=1) in vec3 aS; uniform vec2 uGH2; out vec2 vQ; flat out float vCode;
void main(){ vQ = aQ * .2; vCode = aS.z; vec2 w = aS.xy + vQ; gl_Position = vec4(w.x / uGH2.x, w.y / uGH2.y, 0., 1.); }`,
TRACE + `in vec2 vQ; flat in float vCode; out vec4 o; void main(){ o = vec4(sig(vQ, vCode, 1.) * .3); }`];
const LICENCE = [`layout(location=0) in vec2 aQ; layout(location=1) in vec3 aS; uniform vec4 uFloor;
void main(){ vec2 w = aS.xy + aQ * aS.z; gl_Position = vec4((w - uFloor.xy) / uFloor.zw * 2. - 1., 0., 1.); }`,
`out vec4 o; uniform vec4 uC; void main(){ o = uC; }`];

const FINAL = [FULL, STUDIO + TRACE + `in vec2 vUV; out vec4 o;
uniform sampler2D uScene, uTrace; uniform mat4 uInvVP, uVP; uniform vec3 uEye, uKey, uGC, uGH; uniform float uGR, uGlassOn, uTime, uExposure, uFocusD, uAspect;
uniform vec4 uHits[24], uFocus, uIntro, uMine, uLamp; uniform vec2 uTexel; uniform sampler2D uEv, uCov;
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
/* the pane's memory of every refusal, the ones still happening, and the one being read */
float traceAt(vec2 xz, float px){
  float v = min(texture(uTrace, xz / (2. * uGH.xz) + .5).r, .75);
  for (int i = 0; i < 24; i++) {
    vec4 h = uHits[i]; float age = uTime - h.z; if (age < 0. || age > 1.6) continue;
    vec2 q = xz - h.xy; if (dot(q, q) > .05) continue;
    v = max(v, sig(q, h.w, 1., px) * (1. - smoothstep(.4, 1.6, age)));   /* a receipt is issued whole, then settles into the pane's memory */
  }
  if (uFocus.w > 0.) { vec2 q = xz - uFocus.xy; if (dot(q, q) < .06) v = max(v, max(sig(q, uFocus.z, 1., px), exp(-pow((length(q) - .19) / max(.0022, px * .6), 2.)) * .7)); }
  if (uIntro.w > 0.) v = max(v, sig((xz - uIntro.xy) / 7., uIntro.z, 1., px / 7.) * uIntro.w);   /* the first refusal, at the scale of the room */
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
    /* inside the boundary: total internal reflection between two faces, inclusions */
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
const MAXB = MOBILE ? 700 : 1600, MAXW = 1200, MAXS = 64, MAXP = 6000, MAXI = 600, MAXL = 4000;
let R = null;
try { if (gl) R = gpu(); } catch (err) { console.error(err); R = null; }
if (!R) document.documentElement.classList.add("no-gl");

function gpu() {
  /* the lens and the evidence both read distances from the scene: without a float target they would be wrong, so there is no studio */
  if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("no float colour buffer: the plain page stands in");
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, HEAD + src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = ([vs, fs]) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); p.u[a.name.replace(/\[0\]$/, "")] = { l: gl.getUniformLocation(p, a.name), t: a.type }; }
    return p;
  };
  const P = { scene: prog(SCENE), prism: prog(PRISM), bead: prog(BEAD), wire: prog(WIRE), ink: prog(INK), stamp: prog(STAMP), licence: prog(LICENCE), final: prog(FINAL) };
  const VEC = { [gl.FLOAT]: "uniform1fv", [gl.FLOAT_VEC2]: "uniform2fv", [gl.FLOAT_VEC3]: "uniform3fv", [gl.FLOAT_VEC4]: "uniform4fv" };
  const set = (p, o) => { gl.useProgram(p); for (const k in o) { const u = p.u[k]; if (!u) continue; const v = o[k];
    if (u.t === gl.FLOAT_MAT4) gl.uniformMatrix4fv(u.l, false, v); else if (u.t === gl.INT || u.t === gl.SAMPLER_2D) gl.uniform1i(u.l, v); else if (u.t === gl.UNSIGNED_INT) gl.uniform1ui(u.l, v); else gl[VEC[u.t]](u.l, typeof v === "number" ? [v] : v); } };
  const buf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
  const quad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW), seg = buf(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
  /* a unit prism without a floor face: x, z in [-1, 1], y in [0, 1] */
  const faces = [[[1, 0, 0], [[1, 0, -1], [1, 1, -1], [1, 1, 1], [1, 0, 1]]], [[-1, 0, 0], [[-1, 0, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, -1]]],
                 [[0, 0, 1], [[1, 0, 1], [1, 1, 1], [-1, 1, 1], [-1, 0, 1]]], [[0, 0, -1], [[-1, 0, -1], [-1, 1, -1], [1, 1, -1], [1, 0, -1]]],
                 [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]]];
  const cube = buf(new Float32Array(faces.flatMap(([n, q]) => [0, 1, 2, 0, 2, 3].flatMap(i => [...q[i], ...n]))), gl.STATIC_DRAW);
  const beads = new Float32Array(MAXB * 4), wires = new Float32Array(MAXW * 8), inks = new Float32Array(MAXI * 8), stamps = new Float32Array(MAXS * 3), prisms = new Float32Array(MAXP * 5), lic = new Float32Array(MAXL * 3);
  const bBead = buf(beads, gl.DYNAMIC_DRAW), bWire = buf(wires, gl.DYNAMIC_DRAW), bInk = buf(inks, gl.DYNAMIC_DRAW), bStamp = buf(stamps, gl.DYNAMIC_DRAW), bPrism = buf(prisms, gl.DYNAMIC_DRAW), bLic = buf(lic, gl.DYNAMIC_DRAW);
  const vao = parts => { const v = gl.createVertexArray(); gl.bindVertexArray(v);
    for (const [b, stride, fields, div] of parts) { gl.bindBuffer(gl.ARRAY_BUFFER, b); for (const [loc, size, off] of fields) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); gl.vertexAttribDivisor(loc, div); } }
    gl.bindVertexArray(null); return v; };
  const V = { empty: gl.createVertexArray(),
    bead: vao([[quad, 2, [[0, 2, 0]], 0], [bBead, 4, [[1, 4, 0]], 1]]),
    wire: vao([[seg, 2, [[0, 2, 0]], 0], [bWire, 8, [[1, 3, 0], [2, 3, 3], [3, 2, 6]], 1]]),
    ink: vao([[seg, 2, [[0, 2, 0]], 0], [bInk, 8, [[1, 3, 0], [2, 3, 3], [3, 2, 6]], 1]]),
    stamp: vao([[quad, 2, [[0, 2, 0]], 0], [bStamp, 3, [[1, 3, 0]], 1]]),
    lic: vao([[quad, 2, [[0, 2, 0]], 0], [bLic, 3, [[1, 3, 0]], 1]]),
    prism: vao([[cube, 6, [[0, 3, 0], [1, 3, 3]], 0], [bPrism, 5, [[2, 4, 0], [3, 1, 4]], 1]]) };
  const texture = (w, h, fmt, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  const target = tex => { const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return fb; };
  /* the pane's memory: one texel per ~3 mm of glass; the floor's: ~8 mm, kept for the whole visit */
  const TW = MOBILE ? 1024 : 2048, TH = Math.round(TW * GLASS.h[2] / GLASS.h[0]), LW = MOBILE ? 1024 : 1792, LH = Math.round(LW * FLOOR[3] / FLOOR[2]);
  const trTex = texture(TW, TH, gl.RGBA8, gl.LINEAR), trFb = target(trTex), ldTex = texture(LW, LH, gl.RGBA8, gl.LINEAR), ldFb = target(ldTex);

  let RT = null, EV = null, scale = MOBILE ? .7 : (devicePixelRatio > 1.5 ? .62 : .9);
  function targets() {
    const dpr = Math.min(devicePixelRatio || 1, 2), cw = Math.round(innerWidth * dpr), ch = Math.round(innerHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (!EV || EV.w !== cw || EV.h !== ch) {                   /* wires of evidence, at display resolution */
      if (EV) { gl.deleteTexture(EV.tex); gl.deleteFramebuffer(EV.fb); }
      const tex = texture(cw, ch, gl.R8, gl.LINEAR);
      EV = { tex, fb: target(tex), w: cw, h: ch };
    }
    const w = Math.max(4, Math.round(cw * scale)), h = Math.max(4, Math.round(ch * scale));
    if (RT && RT.w === w && RT.h === h) return;
    if (RT) { gl.deleteTexture(RT.tex); gl.deleteTexture(RT.cov); gl.deleteRenderbuffer(RT.depth); gl.deleteFramebuffer(RT.fb); }
    const tex = texture(w, h, gl.RGBA16F, gl.LINEAR), cov = texture(w, h, gl.R8, gl.LINEAR);
    const depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, cov, 0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("studio framebuffer incomplete");
    RT = { tex, cov, depth, fb, w, h };
  }
  let slow = 0, frames = 0;
  function govern(dt) { frames++; if (dt > 1 / 45) slow++; if (frames >= 60) { if (slow > 30 && scale > .42) scale *= .86; frames = slow = 0; } }
  const drawLines = (vaoName, b, data, n) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, n * 8)); gl.bindVertexArray(V[vaoName]); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); };

  function draw(f) {
    govern(f.dt); targets();
    gl.disable(gl.DEPTH_TEST);
    if (f.nStamps) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, trFb); gl.viewport(0, 0, TW, TH); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, bStamp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, stamps.subarray(0, f.nStamps * 3));
      set(P.stamp, { uGH2: [GLASS.h[0], GLASS.h[2]] }); gl.bindVertexArray(V.stamp); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.nStamps);
    }
    if (f.licences.length) {                                     /* a licence, or porcelain now standing on one: stamped once, kept */
      gl.bindFramebuffer(gl.FRAMEBUFFER, ldFb); gl.viewport(0, 0, LW, LH); gl.enable(gl.BLEND); gl.blendEquation(gl.MAX);
      for (const [cells, channel] of f.licences.splice(0)) {
        const n = Math.min(cells.length, MAXL); cells.slice(0, n).forEach(([x, z], k) => lic.set([x, z, FS / 2], k * 3));
        gl.bindBuffer(gl.ARRAY_BUFFER, bLic); gl.bufferSubData(gl.ARRAY_BUFFER, 0, lic.subarray(0, n * 3));
        set(P.licence, { uFloor: FLOOR, uC: channel ? [0, 1, 0, 0] : [1, 0, 0, 0] }); gl.bindVertexArray(V.lic); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      }
      gl.blendEquation(gl.FUNC_ADD);
    }
    gl.disable(gl.BLEND);
    const common = { uInvVP: f.ivp, uVP: f.vp, uEye: f.eye, uKey: f.key, uTime: f.time, uGlassOn: f.glass, uGC: GLASS.c, uGH: GLASS.h, uPxA: 2 * Math.tan(f.fov / 2) / RT.h,
      uDecO: f.dec[0], uDecU: f.dec[1], uDecV: f.dec[2], uDecCode: f.dec[3], uDecHash: f.dec[4] };
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.fb); gl.viewport(0, 0, RT.w, RT.h);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.ALWAYS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ldTex);
    set(P.scene, Object.assign({ uBk: f.bk, uBkH: f.bkh, uKerf: f.kerf, uBMin: f.bmin, uBMax: f.bmax, uLedger: 0, uFloor: FLOOR }, common));
    gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthFunc(gl.LESS);
    if (f.nCells) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bPrism); gl.bufferSubData(gl.ARRAY_BUFFER, 0, prisms.subarray(0, f.nCells * 5));
      set(P.prism, common); gl.bindVertexArray(V.prism); gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, f.nCells);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bBead); gl.bufferSubData(gl.ARRAY_BUFFER, 0, beads);
    set(P.bead, Object.assign({ uRight: f.right, uUp: f.up }, common)); gl.bindVertexArray(V.bead); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, MAXB);
    if (f.nInk) {                                                /* black candidates: seen, and nothing more */
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); gl.depthFunc(gl.LEQUAL);
      set(P.ink, Object.assign({ uRes: [RT.w, RT.h], uPx: RT.w / innerWidth }, common)); drawLines("ink", bInk, inks, f.nInk);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    gl.disable(gl.DEPTH_TEST);
    /* evidence wires: at display resolution, unlit, hidden only by what stands in front of them */
    gl.bindFramebuffer(gl.FRAMEBUFFER, EV.fb); gl.viewport(0, 0, EV.w, EV.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (f.nWires) {
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.tex);
      set(P.wire, Object.assign({ uRes: [EV.w, EV.h], uPx: EV.w / innerWidth, uScene: 0 }, common)); drawLines("wire", bWire, wires, f.nWires);
      gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.tex); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, trTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, EV.tex); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, RT.cov);
    set(P.final, Object.assign({ uScene: 0, uTrace: 1, uEv: 2, uCov: 3, uGR: GLASS.r, uExposure: 2.45, uHits: f.hits, uFocus: f.focusTrace, uIntro: f.intro, uMine: f.mine, uLamp: f.lamp, uFocusD: f.focusD, uAspect: RT.w / RT.h, uTexel: [1 / RT.w, 1 / RT.h] }, common));
    gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { draw, beads, wires, inks, stamps, prisms, aspect: () => canvas.width / canvas.height };
}

/* ================= proposers: the rain's, the opening's, and yours ================= */
const TR = window.CytherTrace;
/* each attempt assembles under its own place on the pane, chosen by its proposer and attempt number */
const anchorFor = pp => { const h = CM.fnv(hex(pp.seed) + "/" + pp.attempt) >>> 0; return [((h & 0xffff) / 65535 - .5) * 4.9, ((h >>> 16) / 65535 - .5) * 2.9]; };
const proposer = (seed, user) => { const pp = { e: CI.biEngine(seed), seed, user, n: 0, path: [[6, 6]], toks: [], refused: 0, crossed: 0, attempt: 0, ends: false }; pp.anchor = anchorFor(pp); return pp; };
const RAIN = [3, 4, 5, 8, 9, 10, 13, 14, 16, 17, 19, 20].map(s => proposer(s, false));   /* seed 3's first proposal is refused: the opening */
let yours = null, opening = null, rainTurn = 0;
const YOURS = RAIN.length, OPENING = RAIN.length + 1, byOwner = i => i < RAIN.length ? RAIN[i] : i === YOURS ? yours : opening;
const tally = { judged: 0, accepted: 0, refused: 0 };            /* operations; admitted programs are admitted.length */

/* one proposed operation, followed: the attempt it extends and, if refused, its receipt.
   It reads only the proposer's own state, so a link can replay it exactly. */
function follow(pp) {
  const ev = pp.e.step(); pp.n++;
  if (ev.e === "ok") { pp.path.push([ev.to.x, ev.to.y]); pp.toks = ev.toks.map(t => t.s); pp.crossed++; return { ev }; }
  if (ev.e === "adm") { pp.path = [[6, 6]]; pp.toks = []; pp.crossed++; pp.ends = true; return { ev }; }
  pp.refused++;
  const why = ev.e === "inv" ? "KERNEL" : ev.why, n = pp.toks.length, tk = ev.tk, f = ev.from;
  const h = CM.fnv(hex(pp.seed) + ":" + pp.n + ":" + pp.toks.join("") + "|" + tk.s) >>> 0;
  const stroke = tk.k === "H" ? [[f.x, f.y], [f.x + tk.sg * tk.mg, f.y]] : tk.k === "V" ? [[f.x, f.y], [f.x, f.y + tk.sg * tk.mg]] : tk.k === "Z" ? [[f.x, f.y], [6, 6]] : null;
  const rc = { seed: pp.seed, index: pp.n, h, why, token: n + 1, discarded: !!ev.discarded, code: TR.code(why, n, h, ev.discarded), path: pp.path.slice(), stroke };
  if (ev.discarded || ev.e === "inv") { pp.path = [[6, 6]]; pp.toks = []; pp.ends = true; }
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

/* every refusal: a trace the pane keeps, a live mark, a ghost of the stroke that never existed */
const traces = [], hits = new Float32Array(24 * 4).fill(-99), ghosts = [], licences = [];
let hitAt = 0, nStamps = 0, mine = null;
function judge(pp, x, z, now, big) {
  const { ev, rc } = follow(pp); tally.judged++;
  let v = ev.e;
  if (ev.e === "adm") admit(pp, ev.prog, now);
  if (rc) {
    tally.refused++; v = "rej";
    const t = { x, z, code: rc.code, label: label(rc, pp.user), rc };
    traces.push(t); if (traces.length > 8000) traces.shift();
    hits.set([x, z, now, rc.code], hitAt * 4); hitAt = (hitAt + 1) % 24;
    if (R && nStamps < MAXS) { R.stamps.set([x, z, rc.code], nStamps * 3); nStamps++; }
    ghosts.push({ path: rc.path, stroke: rc.stroke, a: pp.anchor.slice(), t: now, big }); if (ghosts.length > 40) ghosts.shift();
    /* the receipt you carry: your latest gesture's first refusal, else the one you were sent, else the first you saw */
    if (pp.user === "YOURS" ? pp.refused === 1 : !mine) own(t, pp.user || "FIRST");
  } else tally.accepted++;
  if (pp.ends) { pp.ends = false; pp.attempt++; pp.anchor = pp.home || anchorFor(pp); }   /* the attempt is over: the next one starts elsewhere */
  return v;
}
function own(t, who) {
  mine = Object.assign({ who }, t);
  if (who === "YOURS") history.replaceState(null, "", "#trace=" + hex(t.rc.seed) + "." + t.rc.index + "." + hex(t.rc.h));
  $("#mineTrace").innerHTML = TR.svg(t.code);
  $("#mineHash").textContent = hex(t.rc.h);
  $("#mineWho").textContent = (who === "YOURS" ? "yours" : who === "SENT" ? "sent to you" : "the first refusal you saw") + " · " + TR.VERSION;
}
/* the kernel admitted a closed program: its profile is licensed onto the floor, now, at the next bay; the matter follows */
function admit(pp, prog, now) {
  const v = walk(prog), gx = v.map(q => q[0]), gy = v.map(q => q[1]), x0 = Math.min(...gx), x1 = Math.max(...gx), y0 = Math.min(...gy), y1 = Math.max(...gy);
  const loc = [];
  for (let i = x0; i < x1; i++) for (let j = y0; j < y1; j++) if (inPoly(v, i + .5, j + .5)) loc.push([(i + .5 - (x0 + x1) / 2) * FS, ((y0 + y1) / 2 - j - .5) * FS]);
  const g = place(loc, (x1 - x0) * FS, (y1 - y0) * FS); if (!g) return;
  const id = "PRG-" + hex(CM.fnv(prog.map(t => t.s).join("")));
  Object.assign(g, { id, ops: prog.length, seed: pp.seed, index: pp.n, birth: now, h0: .15 + .55 * (CM.fnv(id) % 1000) / 1000, h: 0, standing: false });
  admitted.push(g); licences.push([g.cells, 0]);
}

/* ================= beads: proposals have no weight; they only arrive ================= */
const BR = .042;
const bx = new Float32Array(MAXB), by = new Float32Array(MAXB), bz = new Float32Array(MAXB), vx = new Float32Array(MAXB), vy = new Float32Array(MAXB), vz = new Float32Array(MAXB);
const st = new Uint8Array(MAXB).fill(9), rad = new Float32Array(MAXB), owner = new Int8Array(MAXB), still = new Uint8Array(MAXB);
let spawnAt = 0, rng = 12345;
const rand = () => (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
const onGlass = (x, z) => Math.abs(x) < GLASS.h[0] - .02 && Math.abs(z) < GLASS.h[2] - .02;
const inPane = (x, z) => [Math.max(-2.9, Math.min(2.9, x)), Math.max(-1.9, Math.min(1.9, z))];
function spawn(x, y, z, v, who, stop = false) {
  for (let k = 0; k < MAXB; k++) { const i = (spawnAt + k) % MAXB; if (st[i] !== 9) continue;
    spawnAt = i + 1; bx[i] = x; by[i] = y; bz[i] = z; vx[i] = (rand() - .5) * .2; vy[i] = v; vz[i] = (rand() - .5) * .2;
    st[i] = 0; rad[i] = BR * (stop ? 1.5 : .82 + rand() * .36); owner[i] = who; still[i] = stop ? 1 : 0; return; }
}
function simulate(now, dt, rain) {
  const n = Math.floor(rain * dt + rand());
  for (let k = 0; k < n; k++) { const j = rainTurn++ % RAIN.length, [x, z] = inPane(RAIN[j].anchor[0] + (rand() - .5) * .9, RAIN[j].anchor[1] + (rand() - .5) * .7); spawn(x, 6.2 + rand() * 1.2, z, -1.5 - rand() * .9, j); }
  for (let i = 0; i < MAXB; i++) {
    if (st[i] === 9) continue;
    bx[i] += vx[i] * dt; by[i] += vy[i] * dt; bz[i] += vz[i] * dt;
    const r = rad[i];
    if (st[i] === 0 && onGlass(bx[i], bz[i]) && by[i] - r <= TOP && by[i] > BOTTOM) {   /* the instant of judgment */
      if (judge(byOwner(owner[i]), bx[i], bz[i], now, still[i] === 1) === "rej") { st[i] = 9; R.beads[i * 4 + 3] = 0; continue; }   /* refused: it ceases; the trace remains */
      st[i] = 3; vx[i] = vz[i] = 0;                               /* accepted into its attempt: it crosses, still black, and joins the candidate below */
    }
    if ((st[i] === 3 && by[i] < BOTTOM - .05) || by[i] < -1) st[i] = 9;   /* black that missed the pane passes through the floor: nothing stops it */
    const d = R.beads; d[i * 4] = bx[i]; d[i * 4 + 1] = by[i]; d[i * 4 + 2] = bz[i]; d[i * 4 + 3] = st[i] === 9 ? 0 : r;
  }
}

/* ================= the story ================= */
const secs = $$("[data-k]");
/* eye, target, fov · rain. A scene with focus frames the latest admission (or the bay waiting for the first): eye at
   [distance out from the room, height], target height. */
const SC = [
  { e: [7.9, 4.5, 9.8], t: [.25, 1.45, 0], f: 30, rain: 36 },        /* the model proposes */
  { e: [3.9, 3.3, 4.6], t: [.55, 2.2, .15], f: 34, rain: 46 },       /* most proposals are wrong */
  { e: [1.1, 2.2, 1.25], t: [-2.4, 2.15, -1.3], f: 50, rain: 40 },   /* inside the boundary */
  { e: [6.0, 1.55, 6.6], t: [.1, .95, 0], f: 31, rain: 40 },         /* only the valid crosses */
  { focus: [4.2, 2.4], ty: .2, f: 30, rain: 40 },                     /* CytherCAD: the newest solid */
  { focus: [4.0, 1.7], ty: .6, f: 30, rain: 34 },                     /* ADII */
  { focus: [3.8, 1.4], ty: .75, f: 30, rain: 34 },                    /* AWC-OS */
  { e: [6.4, 4.4, 7.8], t: [0, .25, 0], f: 34, rain: 34 },          /* SijilOS: the floor is the ledger */
  { e: [12.4, 10.8, 15.2], t: [0, .7, 0], f: 30, rain: 40 },         /* inside your walls */
  { e: [1.0, 32, 1.6], t: [0, 1.0, -.1], f: 17, rain: 0 },           /* what must never happen: stillness, nearly orthographic */
];
const latest = () => admitted[admitted.length - 1] || null;
const standing = () => { for (let i = admitted.length - 1; i >= 0; i--) if (admitted[i].h > .05) return admitted[i]; return null; };
function frameOf(s) {
  if (!s.focus) return s;
  const g = latest(), F = g ? [g.cx, g.cz] : nextBay(), out = Math.hypot(...F) > .1 ? F.map(v => v / Math.hypot(...F)) : [.6, .8];
  const c = Math.cos(.45), sn = Math.sin(.45), o = [out[0] * c - out[1] * sn, out[0] * sn + out[1] * c];   /* a little off-axis, from outside the room */
  return { e: [F[0] + o[0] * s.focus[0], s.focus[1], F[1] + o[1] * s.focus[0]], t: [F[0], s.ty, F[1]], f: s.f, rain: s.rain };
}
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

/* the opening: a lit floor; one proposal crosses the light and leaves no shadow; a tick; the pane. Nothing is preloaded:
   the first solid stands whenever the engine first admits a program, and not before. */
const intro = { on: !!R && !CALM && scrollY < 40, t0: -1, hit: -1, end: -1 };   /* no studio, no opening: the cover and the copy at once */
const OPEN = [1.25, 1.35];
if (!intro.on) document.documentElement.classList.remove("intro");
let glassOn = intro.on ? 0 : 1, lightSweep = intro.on ? 1 : 0, introU = [0, 0, 0, 0];

/* time-driven events inside the systems, acting only on matter that was admitted */
let awcT = 0, adiiT = 0;
const weight = s => clamp01(1 - Math.abs(p - s) * 1.6);
const BK = new Float32Array(8), BKH = new Float32Array(8);
const half = g => [(g.maxX - g.minX) / 2, (g.maxZ - g.minZ) / 2], mid = g => [(g.maxX + g.minX) / 2, (g.maxZ + g.minZ) / 2];
function matter(dt) {
  BK.fill(0); BKH.fill(0);
  const g = standing();
  /* ADII: a black change to an admitted value rises from it and is held, never applied */
  const w5 = weight(5); adiiT = w5 > .4 && g ? Math.min(adiiT + dt / 1.8, 1) : 0;
  if (w5 > .01 && g) { const [hx, hz] = half(g), [cx, cz] = mid(g); BK.set([cx, lerp(g.h - .2, g.h + .26, ease(adiiT)), cz, w5]); BKH.set([hx * w5, .225 * w5, hz * w5, .018], 0); }
  /* AWC-OS: a black answer rises above admitted matter, wider than what supports it; it is stopped and withdrawn */
  const w6 = weight(6); awcT = w6 > .4 && g ? (awcT + dt / 5.4) % 1 : 0;
  if (w6 > .01 && g) {
    const t = awcT, base = g.h + .03, top = base + .42, [hx, hz] = half(g), [cx, cz] = mid(g);
    const y = lerp(base, top, ease(clamp01((t - .1) / .32))) - (t > .62 ? ease(clamp01((t - .62) / .28)) * (top - base) : 0);
    const sc = (t < .1 ? ease(t / .1) : 1 - ease(clamp01((t - .7) / .2))) * w6;
    if (sc > .01) BK.set([cx, y, cz, 1], 4), BKH.set([(hx * 1.35 + .14) * sc, .05 * sc, hz * sc, .02], 4);
  }
}
/* matter, extruded: the licence alone for HOLD, then a planar extrusion — linear, no easing, no overshoot.
   The walls are the same solids extruded further; nothing is moved. */
let nCells = 0, lifted = null;   /* the solid being inspected, held off its licence */
function extrude(now) {
  const wall = clamp01((p - 7.3) / .7);
  nCells = 0;
  for (const g of admitted) {
    const t = now - g.birth - HOLD;
    g.h = t <= 0 ? 0 : (g.h0 + (WALL_H - g.h0) * wall) * clamp01(t / RISE);
    if (t > 0 && !g.standing) { g.standing = true; licences.push([g.cells, 1]); }
    const base = g === lifted ? LIFT : 0;
    for (const [x, z] of g.cells) { if (nCells >= MAXP) break; R.prisms.set([x, z, FS / 2, g.h, base], nCells * 5); nCells++; }
  }
}

/* your trace on matter: on the held value, a hairline through the refused answer, a registration mark on the newest
   record (the receipt hash, 32 ticks), and somewhere in the walls the session built */
const OFF = [[0, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, 0], 0, 0];
function decal() {
  if (!mine) return OFF;
  const w5 = weight(5), w7 = weight(7), w8 = Math.max(weight(8), weight(9)), c = mine.code, h = mine.rc.h, g = standing();
  if (w5 > .01 && BK[3] > 0) return [[BK[0], BK[1], BK[2] + BKH[2], .8], [1, 0, 0, 0], [0, 1, 0, .4 * w5], c, h];
  if (w7 > .3 && g) return [[g.minX + .04, g.h / 2, g.maxZ, 1], [1, 0, 0, 1], [0, 1, 0, w7], c, h];
  const back = w8 > .3 ? admitted.filter(a => a.side === 0 && a.h > 1) : [];   /* the back wall, facing into the room */
  if (back.length) { const b = back[h % back.length]; return [[mid(b)[0], 1.25, b.maxZ, 2.2], [1, 0, 0, 0], [0, 1, 0, .85 * w8], c, h]; }
  return OFF;
}
const kerf = () => mine && weight(6) > .01 && BK[7] > 0 ? [BK[4] + ((mine.code % 16) / 8 - .5) * BKH[4] * 1.2, BK[6], Math.floor(mine.code / 64) % 64 / 64 * 2 * Math.PI, .004] : [0, 0, 0, 0];

/* lines: cobalt where something never existed; black where something is only proposed */
let nWires = 0, nInk = 0;
function wire(a, b, alpha, width = 1.6) { if (nWires >= MAXW || alpha <= .004) return; R.wires.set([a[0], a[1], a[2], b[0], b[1], b[2], alpha, width], nWires * 8); nWires++; }
function ink(a, b, width) { if (nInk >= MAXI) return; R.inks.set([a[0], a[1], a[2], b[0], b[1], b[2], 1, width], nInk * 8); nInk++; }
function boxWire(c, h, alpha, width) {
  const v = []; for (let k = 0; k < 8; k++) v.push([c[0] + (k & 1 ? h[0] : -h[0]), c[1] + (k & 2 ? h[1] : -h[1]), c[2] + (k & 4 ? h[2] : -h[2])]);
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) wire(v[i], v[j], alpha, width);
}
const under = (a, s) => ([gx, gy]) => [a[0] + (gx - 6) * s, BOTTOM - .045, a[1] - (gy - 6) * s];   /* an attempt's place under the pane */
function lines(now) {
  nWires = 0; nInk = 0;
  /* the candidates assembling under the pane: black, visible, causally absent */
  for (const pp of [...RAIN, yours, opening]) { if (!pp || pp.path.length < 2) continue; const at = under(pp.anchor, CS); for (let k = 0; k + 1 < pp.path.length; k++) ink(at(pp.path[k]), at(pp.path[k + 1]), 1.8); }
  /* the refused stroke, flashing where its attempt was assembling */
  for (const g of ghosts) {
    const life = g.big ? 2.8 : .75, age = now - g.t; if (age > life) continue;
    const a = 1 - ease(clamp01((age - life * .3) / (life * .7))), at = under(g.a, g.big ? .16 : CS);
    if (g.big) for (let k = 0; k + 1 < g.path.length; k++) wire(at(g.path[k]), at(g.path[k + 1]), a * .55, 1.2);
    if (g.stroke) wire(at(g.stroke[0]), at(g.stroke[1]), a, 2.2);
  }
  const w5 = weight(5), w6 = weight(6), w7 = weight(7), g = standing();
  /* ADII: where the held value would have stood, had the change been admitted */
  if (w5 > .01 && g) { const [hx, hz] = half(g), [cx, cz] = mid(g); boxWire([cx, (g.h + .5) / 2, cz], [hx, (g.h + .5) / 2, hz], w5 * ease(adiiT) * .9, 1.4); }
  /* AWC-OS: the promise that exceeds what supports it */
  if (w6 > .01 && g && awcT > .4 && awcT < .66) {
    const [hx, hz] = half(g), [cx, cz] = mid(g), wide = hx * 1.35 + .14, ov = (wide - hx) / 2, base = g.h, y = base + .45, al = w6 * (1 - Math.abs(awcT - .53) / .13);
    for (const sx of [-1, 1]) { boxWire([cx + sx * (hx + ov), y, cz], [ov, .056, hz + .007], al, 2); wire([cx + sx * wide, y - .056, cz + hz], [cx + sx * wide, base, cz + hz], al, 1.6); wire([cx + sx * hx, base, cz - hz], [cx + sx * hx, base, cz + hz], al, 1.6); }
  }
  /* SijilOS: one filament binds every admitted record to the one before */
  if (w7 > .01) for (let k = 1; k < admitted.length; k++) wire([admitted[k - 1].cx, .012, admitted[k - 1].cz], [admitted[k].cx, .012, admitted[k].cz], w7, 1.6);
}

/* ================= camera ================= */
function story(now, dt) {
  p = progress();
  const i = Math.min(Math.floor(p), SC.length - 2), f = ease(clamp01(p - i)), a = frameOf(SC[i]), b = frameOf(SC[i + 1]);
  const k = CALM ? 1 : 1 - Math.exp(-dt * 2.4);
  for (let j = 0; j < 3; j++) { cam.e[j] += (lerp(a.e[j], b.e[j], f) * (MOBILE && p < 1.5 ? 1.45 : 1) - cam.e[j]) * k; cam.t[j] += (lerp(a.t[j], b.t[j], f) - cam.t[j]) * k; }
  cam.f += (lerp(a.f, b.f, f) + (MOBILE ? 8 : 0) - cam.f) * k;
  rain += (lerp(a.rain, b.rain, f) - rain) * k;
  if (!CALM) { const kp = 1 - Math.exp(-dt * 2.5); ptr.sx += (ptr.x - ptr.sx) * kp; ptr.sy += (ptr.y - ptr.sy) * kp; }
  secs.forEach((s, j) => { const v = clamp01(1 - (Math.abs(p - j) - .26) * 2.6).toFixed(2); if (s.dataset.v !== v) { s.dataset.v = v; s.style.setProperty("--v", v); } });
}
function view() {
  /* the pointer stops moving the camera at the end, and inside the pane, whose 17 cm it would otherwise leave */
  const still = Math.max(p > 8.6 ? clamp01((p - 8.6) / .4) : 0, clamp01((.9 - Math.abs(p - 2)) / .25)), az = ptr.sx * .32 * (1 - still), el = ptr.sy * .12 * (1 - still);
  const dx = cam.e[0] - cam.t[0], dz = cam.e[2] - cam.t[2], c = Math.cos(az), s = Math.sin(az);
  EYE = [cam.t[0] + dx * c - dz * s, cam.e[1] - el * 2.5, cam.t[2] + dx * s + dz * c];
  const L = look(EYE, cam.t); RIGHT = L.right; UP = L.up;
  VP = mul(persp(cam.f * Math.PI / 180, R ? R.aspect() : innerWidth / innerHeight, .05, 400, MOBILE ? 0 : .34, MOBILE ? .52 : 0), L.m); IVP = inv(VP);
}
function bounds() {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let s = 0; s < 2; s++) { if (BK[s * 4 + 3] <= 0) continue; for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], BK[s * 4 + a] - BKH[s * 4 + a] - .05); hi[a] = Math.max(hi[a], BK[s * 4 + a] + BKH[s * 4 + a] + .05); } }
  return lo[0] > hi[0] ? [[1, 1, 1], [-1, -1, -1]] : [lo, hi];
}

/* ================= pointer: light, proposals, receipts ================= */
function ray(px, py) {
  const nx = px / innerWidth * 2 - 1, ny = 1 - py / innerHeight * 2, a = xf(IVP, nx, ny, -1), b = xf(IVP, nx, ny, 1), o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
  return [o, [b[0] / b[3] - o[0], b[1] / b[3] - o[1], b[2] / b[3] - o[2]]];
}
function glassPoint(px, py) {
  const [o, d] = ray(px, py); if (Math.abs(d[1]) < 1e-5) return null; const t = (TOP - o[1]) / d[1]; if (t < 0) return null;
  const x = o[0] + d[0] * t, z = o[2] + d[2] * t; return onGlass(x, z) ? [x, z] : null;
}
/* the admitted solid whose top (or, before it rises, whose licence) is under the pointer */
function solidAt(px, py) {
  const [o, d] = ray(px, py); let best = null, bt = 1e9;
  if (Math.abs(d[1]) < 1e-5) return null;
  for (const g of admitted) {
    const t = (g.h + (g === lifted ? LIFT : 0) - o[1]) / d[1]; if (t <= 0 || t >= bt) continue;
    const x = o[0] + d[0] * t, z = o[2] + d[2] * t;
    if (g.cells.some(([cx, cz]) => Math.abs(x - cx) <= FS / 2 && Math.abs(z - cz) <= FS / 2)) { best = g; bt = t; }
  }
  return best;
}
const tip = $("#receipt"), yourLine = $("#yours");
let focusTrace = [0, 0, 0, 0], drag = null;
const onCanvas = e => e.target === canvas;
const showTip = (e, text, kind) => { tip.textContent = text; tip.dataset.kind = kind; tip.hidden = false; tip.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - tip.offsetWidth - 12)}px,${e.clientY + 18}px)`; };
addEventListener("pointermove", e => {
  ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1;
  if (!R || drag || !onCanvas(e)) { if (!drag) { focusTrace = [0, 0, 0, 0]; tip.hidden = true; if (lifted) { lifted = null; wake(); } } return; }
  const g = glassPoint(e.clientX, e.clientY); let best = null, bd = .012;
  if (g) for (let i = traces.length - 1; i >= 0 && i > traces.length - 4000; i--) { const t = traces[i], d = (t.x - g[0]) ** 2 + (t.z - g[1]) ** 2; if (d < bd) { bd = d; best = t; } }
  if (best) {
    if (focusTrace[0] !== best.x || focusTrace[1] !== best.z || lifted) { lifted = null; wake(); }
    focusTrace = [best.x, best.z, best.code, 1]; canvas.style.cursor = "default"; showTip(e, best.label, ""); return;
  }
  if (focusTrace[3]) wake(); focusTrace = [0, 0, 0, 0];
  /* why does this exist? because this program was admitted, here: lifted off its licence, which stays where it was issued */
  const s = solidAt(e.clientX, e.clientY);
  if (s !== lifted) { lifted = s; wake(); }
  if (s) { canvas.style.cursor = "default"; showTip(e, "ADMITTED · " + s.id + " · " + s.ops + " operations · proposal " + fmt(s.index) + " of seed " + hex(s.seed), "real"); return; }
  tip.hidden = true; canvas.style.cursor = "crosshair";
}, { passive: true });
addEventListener("scroll", () => { wake(); lifted = null; if (!tip.hidden) { tip.hidden = true; focusTrace = [0, 0, 0, 0]; } }, { passive: true });   /* a receipt belongs to the view it was read in */
addEventListener("pointerdown", e => { if (R && e.button === 0 && onCanvas(e)) { const g = glassPoint(e.clientX, e.clientY); if (g) drag = { g, x: e.clientX, y: e.clientY }; } });
addEventListener("pointercancel", () => { drag = null; });
addEventListener("pointerup", e => {
  if (!drag) return; const d = drag; drag = null;
  const g2 = glassPoint(e.clientX, e.clientY) || d.g;
  /* your gesture is the seed: where you touched the glass, and which way you moved; your attempts assemble where you touched */
  const key = [Math.round(d.g[0] / .05), Math.round(d.g[1] / .05), Math.round((g2[0] - d.g[0]) / .1), Math.round((g2[1] - d.g[1]) / .1)].join("|");
  yours = proposer(CM.fnv("gesture:" + key) >>> 0, "YOURS"); yours.home = [Math.max(-2.4, Math.min(2.4, d.g[0])), Math.max(-1.4, Math.min(1.4, d.g[1]))]; yours.anchor = yours.home; wake();
  const dx = g2[0] - d.g[0], dz = g2[1] - d.g[1], len = Math.hypot(dx, dz) || 1;
  for (let k = 0; k < 10; k++) { const s = k / 9 * Math.min(len, 1.2), [x, z] = inPane(d.g[0] + dx / len * s + (rand() - .5) * .08, d.g[1] + dz / len * s + (rand() - .5) * .08); spawn(x, TOP + 1.6 + k * .2, z, -.8, YOURS); }
});

/* ================= the readout ================= */
const out = {}; $$("[data-t]").forEach(el => (out[el.dataset.t] = out[el.dataset.t] || []).push(el));
const put = (k, v) => (out[k] || []).forEach(el => { if (el.textContent !== v) el.textContent = v; });
$$("[data-m]").forEach(el => { if (CM.project(el.dataset.m) !== el.textContent) { el.style.outline = "1px dashed #c00"; console.error("stale projection", el.dataset.m); } });
const external = () => performance.getEntriesByType("resource").filter(e => new URL(e.name, location.href).origin !== location.origin).length;
const remeasure = () => { measure(); wake(); };   /* the fonts arriving move the sections as much as a resize does */
measure(); addEventListener("resize", remeasure); addEventListener("load", remeasure);
const copyBtn = $("#copy");
copyBtn.addEventListener("click", () => navigator.clipboard.writeText(location.href).then(
  () => { copyBtn.textContent = "Link copied"; },
  () => { copyBtn.textContent = "Copy it from the address bar"; }));   /* clipboard refused: the address bar already holds the link */

/* ================= the end: stillness, then the light finds your trace among all of them ================= */
const rcpt = $("#mine"), stillNote = $("#still");
let lamp = [0, 0, 0, 0], mineU = [0, 0, 0, 0], reveal = -1, halted = false;
function ending(now) {
  const end = SC[9], there = p > 8.95 && Math.hypot(cam.e[0] - end.e[0], cam.e[1] - end.e[1], cam.e[2] - end.e[2]) < .05;
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
/* nothing is allowed to change: no proposal arriving, no mark still fading, no solid still rising, the camera at rest */
function settled() {
  if (intro.on || rain > .02) return false;
  for (let i = 0; i < MAXB; i++) if (st[i] !== 9) return false;
  for (let i = 0; i < 24; i++) if (clock - hits[i * 4 + 2] < 1.6) return false;
  for (const g of ghosts) if (clock - g.t < (g.big ? 2.8 : .75)) return false;
  for (const g of admitted) if (clock - g.birth < HOLD + RISE) return false;
  return true;
}
function wake() { if (!halted) return; halted = false; stillNote.hidden = true; last = performance.now() / 1000; requestAnimationFrame(frame); }

/* ================= one clock ================= */
let last = performance.now() / 1000, clock = 0, hud = -1;
if (opening) opening.anchor = OPEN.slice();
if (opening && !intro.on) judge(opening, OPEN[0], OPEN[1], 0, false);
function frame(ms) {
  const dt = Math.min(ms / 1000 - last, .05); last = ms / 1000; clock += dt;
  story(clock, dt);
  if (intro.on) {
    if (intro.t0 < 0) intro.t0 = clock;
    const t = clock - intro.t0;
    if (t > .5 && !intro.dropped) { const who = opening ? OPENING : 0; byOwner(who).anchor = OPEN.slice(); spawn(OPEN[0], TOP + 2.0, OPEN[1], -1.1, who, true); intro.dropped = true; }
    if (intro.hit < 0 && tally.judged > 0) { intro.hit = clock; intro.tr = traces[traces.length - 1]; }   /* the first judgment: a tick in empty air */
    const h = intro.hit < 0 ? -1 : clock - intro.hit;
    if (intro.tr && h >= 0) introU = [intro.tr.x, intro.tr.z, intro.tr.code, 1 - ease(clamp01((h - 2.4) / 1.2))];
    if (h > .9) { const k = clamp01((h - .9) / 1.8); glassOn = k; lightSweep = 1 - ease(k); }   /* then the light finds the glass */
    if (h > 2.2 && !intro.copy) { document.documentElement.classList.remove("intro"); intro.copy = true; }
    if (h > 3.4 || p > .35 || t > 11) { intro.on = false; intro.end = clock; glassOn = 1; lightSweep = 0; introU = [0, 0, 0, 0]; document.documentElement.classList.remove("intro");
      if (opening && !intro.dropped) judge(opening, OPEN[0], OPEN[1], clock, false); }
  }
  const ramp = intro.on ? 0 : intro.end < 0 ? 1 : clamp01((clock - intro.end) / 2.5);
  const rainNow = rain * (CALM ? .35 : MOBILE ? .55 : 1) * ramp;
  view();
  if (R) {
    nStamps = 0;
    simulate(clock, dt, rainNow);
    matter(dt); extrude(clock); lines(clock);
    const free = p > 8.6 ? 0 : 1, az = .62 + ptr.sx * .55 * free - lightSweep * 1.5, key = [-Math.cos(az) * .62, .74 - ptr.sy * .08 * free, Math.sin(az) * .62 + .2], kl = Math.hypot(...key);
    const done = ending(clock);
    const [lo, hi] = bounds();
    R.draw({ dt, time: clock, vp: VP, ivp: IVP, eye: EYE, right: RIGHT, up: UP, key: key.map(v => v / kl), glass: glassOn, fov: cam.f * Math.PI / 180,
      bk: BK, bkh: BKH, bmin: lo, bmax: hi, hits, focusTrace, intro: introU, dec: decal(), kerf: kerf(), mine: mineU, lamp, licences,
      focusD: Math.hypot(EYE[0] - cam.t[0], EYE[1] - cam.t[1], EYE[2] - cam.t[2]), nStamps, nWires, nInk, nCells });
    if (done && settled()) halted = true;
  } else halted = true;   /* no studio: the copy follows the scroll, one frame per scroll or resize */
  if (halted || clock - hud > .2) {
    hud = clock; put("judged", fmt(tally.judged)); put("judgedw", tally.judged === 1 ? "proposed operation" : "proposed operations"); put("refused", fmt(tally.refused)); put("admitted", fmt(admitted.length)); put("admittedw", admitted.length === 1 ? "program admitted" : "programs admitted"); put("ext", String(external()));
    if (yours) { yourLine.hidden = false; put("yseed", hex(yours.seed)); put("yref", fmt(yours.refused)); put("ycross", fmt(yours.crossed)); copyBtn.hidden = !(mine && mine.who === "YOURS"); }
  }
  if (halted) { stillNote.hidden = false; return; }   /* nothing is changing, so nothing is computed: the last frame stands */
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});   /* insecure context — run online-only */
})();
