/* ============================================================================
   prototype/glass/glass.js — THE GLASS, rendered.
   One sheet of glass; four systems stand on it. Below the glass a model proposes;
   above it stands only what that system's authority allowed. CytherCAD streams the
   boundary engine of the record; ADII, AWC-OS and SijilOS run the toy worlds of
   worlds.js, whose authorities are real code. The sky is the seal, dsinOrbit(CANON).
   Visual language, fixed across all four: blue-grey = proposed, blue = under review,
   cobalt flash = stopped at the glass, white = allowed, a beam to the sky = a person.
   ============================================================================ */
(function () {
"use strict";
if (typeof document === "undefined") return;
const CM = window.CytherManifest, CI = window.CytherInstrument, CX = window.CytherCrossing, CW = window.CytherWorlds;
const MOBILE = matchMedia("(max-width: 760px)").matches;
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PLANE = 310, GROW = 1.6, FOG = [0.035, 0.047, 0.085], FOGD = 0.0011;
const AT = { cad: [-68, 70], adii: [70, 66], awc: [72, -60], sijil: [-62, -66] };   /* a site plan: four systems, one glass */
const WHITE = [.96, .97, 1], DATA = [.70, .75, .84], BLUE = [.16, .27, .95], GHOST = [.45, .58, 1], COBALT = [.2, .34, 1];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ease = x => x * x * (3 - 2 * x), clamp01 = x => Math.max(0, Math.min(1, x)), lerp = (a, b, t) => a + (b - a) * t;

/* ================= matrices (column-major) ================= */
function persp(fov, a, n, f, sx, sy) {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
  return new Float32Array([t / a,0,0,0, 0,t,0,0, -sx,-sy,(f + n) * nf,-1, 0,0,2 * f * n * nf,0]);
}
function look(e, c) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  return new Float32Array([xx,yx,zx,0, 0,yy,zy,0, xz,yz,zz,0,
    -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
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
/* one light for everything that stands: a raking key from the story's side, the storm beneath */
const LIGHT = `vec3 lit(vec3 base, vec3 N, float wy){
  float dif = max(dot(N, normalize(vec3(.62, .74, .26))), 0.), back = max(dot(N, normalize(vec3(-.3, .25, .9))), 0.);
  vec3 c = base * (.12 + .86 * dif + .3 * back + .1 * max(N.y, 0.)) * mix(.5, 1., smoothstep(0., 5., wy));
  return c + vec3(.22,.34,1.) * .2 * (1. - smoothstep(0., 2.5, wy)) * step(0., wy);
}
`;

const SRC = {
  sky: [FULL, `in vec2 vUV; uniform mat4 uInvVP; uniform vec3 uEye, uFog; out vec4 o;
    void main(){
      vec4 w = uInvVP * vec4(vUV * 2. - 1., 1., 1.); vec3 d = normalize(w.xyz / w.w - uEye); float y = d.y;
      vec3 c = y > 0. ? mix(uFog, vec3(.006,.009,.02), smoothstep(0., .5, y)) : mix(uFog, vec3(.002,.003,.008), smoothstep(0., -.4, y));
      o = vec4(c + vec3(.3,.4,.85) * exp(-abs(y) * 120.) * .08, 1.);
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
    ${LIGHT}
    void main(){
      vec3 N = normalize(vN), c = lit(vec3(.96,.97,1.), N, vY);
      float s = (vAge - uGrow) / 1.1;                       /* the kernel's pass, after the rise */
      if (s < 1.2) {
        c = mix(vec3(.16,.27,.95) * (.6 + .7 * max(dot(N, normalize(vec3(.62,.74,.26))), 0.)), c, smoothstep(0., 1., s));
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
      vC = vec4(mix(vec3(.5,.64,1.) * 2.2, vec3(.93,.95,1.), clamp((age - uGrow) / 1.1, 0., 1.)), .6 * exp(-length(w - uEye) * uFogD));
    }`, `in vec4 vC; out vec4 o; void main(){ o = vC; }`],

  /* boxes: every moving thing of ADII, AWC-OS and SijilOS — instanced, rebuilt each frame */
  box: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aA; layout(location=3) in vec4 aB; layout(location=4) in vec3 aC;
    uniform float uMirror; out vec3 vN, vW, vC; out float vY0, vH, vBand, vA;
    void main(){
      vec3 w = vec3(aA.x + aP.x * aA.w, aA.y + aP.y * aB.x, aA.z + aP.z * aB.y);
      vW = vec3(w.x, w.y * uMirror, w.z); vN = vec3(aN.x, aN.y * uMirror, aN.z);
      vY0 = aP.y * aB.x; vH = aB.x; vBand = aB.z; vA = aB.w; vC = aC;
      gl_Position = uVP * vec4(vW, 1.);
    }`, `in vec3 vN, vW, vC; in float vY0, vH, vBand, vA; uniform vec3 uEye, uFog; uniform float uFogD, uMirror; out vec4 o;
    ${LIGHT}
    void main(){
      vec3 c = lit(vC, normalize(vN), abs(vW.y));
      if (vBand >= 0.) c += vec3(.55,.66,1.) * 3. * exp(-pow((vY0 - vBand * vH) / .3, 2.));
      float f = 1. - exp(-length(vW - uEye) * uFogD);
      if (uMirror < 0.) { o = vec4(mix(c * .55, uFog, f), .34 * exp(-abs(vW.y) * .1) * (1. - f)); return; }
      o = vec4(mix(c, uFog, f), vA);
    }`],

  boxedge: [VIEW + `layout(location=0) in vec3 aP; layout(location=2) in vec4 aA; layout(location=3) in vec4 aB; layout(location=4) in vec3 aC; out vec4 vC;
    void main(){
      vec3 w = vec3(aA.x + aP.x * aA.w, aA.y + aP.y * aB.x, aA.z + aP.z * aB.y); gl_Position = uVP * vec4(w, 1.);
      bool ghost = aB.w < .99;
      vC = vec4(mix(aC, vec3(1.), ghost ? .25 : .55) * (ghost ? 1.7 : 1.), (ghost ? min(1., aB.w * 2.6) : .5) * exp(-length(w - uEye) * uFogD));
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
      float edge = 1. - smoothstep(.88, 1., max(abs(vW.x), abs(vW.z)) / uSize);
      float a = (above ? mix(.62, .95, fres) : mix(.16, .5, fres)) * edge;
      vec3 tint = above ? vec3(.010,.015,.030) : vec3(.04,.06,.12);
      vec3 g = vec3(.5,.62,1.) * lines(vW.xz + 7., 14.) * (above ? .022 : 0.) * fog * edge;
      o = vec4(mix(uFog, tint, fog) * a + uFog * fres * .6 * a + g, a);
    }`],

  /* beams: 0 a standing segment · 1 a token rising to the glass · 2 a refused shape falling · 3 a timed line */
  beam: [VIEW + `layout(location=0) in vec2 aQ; layout(location=1) in vec3 aA; layout(location=2) in vec3 aB; layout(location=3) in vec4 aC; layout(location=4) in vec4 aT;
    out vec3 vC; out float vS, vL; flat out float vM;
    void main(){
      vec3 a = aA, b = aB; float k = 1., m = aT.w;
      if (aC.a <= 0.) { ${HIDE} return; }
      if (m > .5) {
        float s = (uTime - aT.x) / aT.y;
        if (s < 0. || s > 1.) { ${HIDE} return; }
        if (m < 1.5) { float e = s * s, e0 = max(0., s - .2); a = mix(aA, aB, e0 * e0); b = mix(aA, aB, e); k = smoothstep(0., .15, s); }
        else if (m < 2.5) { vec3 dy = vec3(0., -30. * s * s - 3. * s, 0.); a += dy; b += dy; k = (1. - s) * (1. - s); }
        else k = smoothstep(0., .08, s) * (1. - smoothstep(.7, 1., s));
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

  spark: [VIEW + `layout(location=0) in vec3 aP; layout(location=1) in vec3 aV; layout(location=2) in vec3 aT; out vec3 vC;
    void main(){
      float age = uTime - aT.x, s = age / aT.y;
      if (s < 0. || s > 1.) { ${HIDE} return; }
      vec3 p = aP + aV * age + vec3(0., -14. * age * age, 0.); vec4 c = uVP * vec4(p, 1.);
      gl_Position = c; gl_PointSize = clamp(uPx * 70. / c.w, uPx, 5. * uPx);
      vC = (aT.z > .5 ? vec3(.9,.94,1.) : vec3(.32,.46,1.)) * 2.4 * (1. - s) * exp(-length(p - uEye) * uFogD);
    }`, `in vec3 vC; out vec4 o; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float g = max(0., 1. - dot(q, q)); o = vec4(vC * g * g, 1.); }`],

  /* ripples: 0 a token admitted · 1 stopped at the glass · 2 crossed · 3 a read · 4 a decision */
  ripple: [VIEW + `layout(location=0) in vec2 aQ; layout(location=1) in vec4 aR; out vec2 vQ, vP; out float vS, vF; flat out float vK;
    void main(){
      float k = aR.w, s = (uTime - aR.z) / (k > 1.5 && k < 2.5 ? 1.6 : 1.1);
      if (s < 0. || s > 1.) { ${HIDE} return; }
      float R = k < .5 ? 1.8 : k < 1.5 ? 3.4 : k < 2.5 ? 10. : k < 3.5 ? 2.4 : 6.;
      vec3 w = vec3(aR.x + aQ.x * R, uEye.y > 0. ? .03 : -.03, aR.y + aQ.y * R);
      vQ = aQ; vP = w.xz; vS = s; vK = k; vF = exp(-length(w - uEye) * uFogD); gl_Position = uVP * vec4(w, 1.);
    }`, `in vec2 vQ, vP; in float vS, vF; flat in float vK; out vec4 o;
    void main(){
      float d = length(vQ), r = exp(-pow((d - vS) / .08, 2.)) * pow(1. - vS, 2.), core = exp(-d * d * 28.) * pow(1. - vS, 5.);
      vec2 g = abs(fract(vP + .5) - .5), fw = fwidth(vP), m = 1. - smoothstep(fw * .5, fw * 1.5, g);
      float lat = max(m.x, m.y) * (1. - smoothstep(.15, 1., d)) * (1. - vS) * .55;   /* the lattice, where it was tested */
      vec3 c = vK < .5 ? vec3(.55,.62,.85) * .35 : vK < 1.5 ? vec3(.2,.34,1.) * 2.4 : vK < 2.5 ? vec3(.9,.94,1.) * 2.6 : vK < 3.5 ? vec3(.4,.55,1.) * 1.1 : vec3(.9,.94,1.) * 1.8;
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

/* ================= the GPU ================= */
const canvas = $("#world");
const gl = canvas && canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
if (!gl) document.documentElement.classList.add("no-gl");
let VP = new Float32Array(16), IVP = VP, EYE = [0, 0, 0];
const R = gl ? gpu() : null;

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
  const vao = parts => { const v = gl.createVertexArray(); gl.bindVertexArray(v);
    for (const [buf, stride, fields, div] of parts) { gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (const [loc, size, off] of fields) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4); gl.vertexAttribDivisor(loc, div); } }
    gl.bindVertexArray(null); return v; };
  /* stateless effects: each instance is a function of time; a ring overwrites the oldest */
  const ring = (stride, cap) => { const r = { data: new Float32Array(stride * cap).fill(-1e9), stride, cap, head: 0, dirty: true }; r.buf = buffer(r.data); return r; };
  const push = (r, ...v) => { r.data.set(v, r.head * r.stride); r.head = (r.head + 1) % r.cap; r.dirty = true; };
  const flush = r => { if (!r.dirty) return; gl.bindBuffer(gl.ARRAY_BUFFER, r.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, r.data); r.dirty = false; };
  /* growable stores: the CAD city only grows; the box lists are rewritten every frame */
  const store = stride => { const s = { data: new Float32Array(stride * 4096), stride, n: 0, dirty: false }; s.buf = buffer(s.data); return s; };
  const reserve = (s, extra) => { const need = (s.n + extra) * s.stride; if (need > s.data.length) { let c = s.data.length; while (c < need) c *= 2; const d = new Float32Array(c); d.set(s.data.subarray(0, s.n * s.stride)); s.data = d; } };
  const append = (s, v) => { reserve(s, v.length / s.stride); s.data.set(v, s.n * s.stride); s.n += v.length / s.stride; s.dirty = true; };
  const upload = s => { if (!s.dirty) return; gl.bindBuffer(gl.ARRAY_BUFFER, s.buf); gl.bufferData(gl.ARRAY_BUFFER, s.data.subarray(0, s.n * s.stride), gl.DYNAMIC_DRAW); s.dirty = false; };

  const quad = buffer(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]));
  const square = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  const cube = [], cubeEdge = [];
  { const f = (a, b, c, d, n) => { for (const q of [a, b, c, a, c, d]) cube.push(...q, ...n); };
    const x0 = -.5, x1 = .5, z0 = -.5, z1 = .5;
    f([x0,0,z1],[x1,0,z1],[x1,1,z1],[x0,1,z1],[0,0,1]); f([x1,0,z0],[x0,0,z0],[x0,1,z0],[x1,1,z0],[0,0,-1]);
    f([x1,0,z1],[x1,0,z0],[x1,1,z0],[x1,1,z1],[1,0,0]); f([x0,0,z0],[x0,0,z1],[x0,1,z1],[x0,1,z0],[-1,0,0]);
    f([x0,1,z1],[x1,1,z1],[x1,1,z0],[x0,1,z0],[0,1,0]); f([x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1],[0,-1,0]);
    for (const y of [0, 1]) cubeEdge.push(x0,y,z0, x1,y,z0, x1,y,z0, x1,y,z1, x1,y,z1, x0,y,z1, x0,y,z1, x0,y,z0);
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) cubeEdge.push(x, 0, z, x, 1, z); }
  const CUBE = buffer(new Float32Array(cube)), CUBE_E = buffer(new Float32Array(cubeEdge));
  const SOL = store(11), EDG = store(8), OPQ = store(11), LO = store(11), HI = store(11);
  const FX = ring(14, MOBILE ? 1536 : 3072), OUT = store(14), SPK = ring(9, MOBILE ? 2048 : 4096), RIP = ring(4, MOBILE ? 768 : 1536);
  const boxVao = s => vao([[CUBE, 6, [[0, 3, 0], [1, 3, 3]], 0], [s.buf, 11, [[2, 4, 0], [3, 4, 4], [4, 3, 8]], 1]]);
  const edgeVao = s => vao([[CUBE_E, 3, [[0, 3, 0]], 0], [s.buf, 11, [[2, 4, 0], [3, 4, 4], [4, 3, 8]], 1]]);
  const V = {
    empty: gl.createVertexArray(),
    solid: vao([[SOL.buf, 11, [[0, 3, 0], [1, 3, 3], [2, 4, 6], [3, 1, 10]], 0]]),
    edge: vao([[EDG.buf, 8, [[0, 3, 0], [1, 4, 3]], 0]]),
    glass: vao([[square, 2, [[0, 2, 0]], 0]]),
    fx: vao([[quad, 2, [[0, 2, 0]], 0], [FX.buf, 14, [[1, 3, 0], [2, 3, 3], [3, 4, 6], [4, 4, 10]], 1]]),
    out: vao([[quad, 2, [[0, 2, 0]], 0], [OUT.buf, 14, [[1, 3, 0], [2, 3, 3], [3, 4, 6], [4, 4, 10]], 1]]),
    spark: vao([[SPK.buf, 9, [[0, 3, 0], [1, 3, 3], [2, 3, 6]], 0]]),
    ripple: vao([[square, 2, [[0, 2, 0]], 0], [RIP.buf, 4, [[1, 4, 0]], 1]]),
    opq: boxVao(OPQ), lo: boxVao(LO), hi: boxVao(HI), opqE: edgeVao(OPQ), loE: edgeVao(LO), hiE: edgeVao(HI),
  };
  /* VAOs hold buffer objects, not their storage: a store that grows keeps its VAO */

  const wall = [];
  { const box = (x0, z0, x1, z1) => { const f = (a, b, c, d, n) => { for (const q of [a, b, c, a, c, d]) wall.push(...q, ...n); };
      f([x0,0,z1],[x1,0,z1],[x1,1,z1],[x0,1,z1],[0,0,1]); f([x1,0,z0],[x0,0,z0],[x0,1,z0],[x1,1,z0],[0,0,-1]);
      f([x1,0,z1],[x1,0,z0],[x1,1,z0],[x1,1,z1],[1,0,0]); f([x0,0,z0],[x0,0,z1],[x0,1,z1],[x0,1,z0],[-1,0,0]);
      f([x0,1,z1],[x1,1,z1],[x1,1,z0],[x0,1,z0],[0,1,0]); };
    const W0 = PLANE + 1, W1 = PLANE + 7;
    box(-W1, -W1, W1, -W0); box(-W1, W0, W1, W1); box(-W1, -W0, -W0, W0); box(W0, -W0, W1, W0); }
  V.wall = vao([[buffer(new Float32Array(wall)), 6, [[0, 3, 0], [1, 3, 3]], 0]]);

  const SEAL = { n: 0 };
  setTimeout(() => {
    const n = MOBILE ? 140000 : 320000, o = CM.dsinOrbit(CM.CANON, n + 1);
    let m = 0; for (let i = 0; i < o.length; i++) m = Math.max(m, Math.abs(o[i]));
    const d = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const z = o[i * 2 + 2] / m; d[i * 4] = o[i * 2] / m; d[i * 4 + 1] = o[i * 2 + 1] / m; d[i * 4 + 2] = z * .55; d[i * 4 + 3] = z * .5 + .5; }
    V.seal = vao([[buffer(d), 4, [[0, 4, 0]], 0]]); SEAL.n = n;
  }, 300);

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

  let slow = 0, frames = 0;
  function govern(dt) { frames++; slow += dt > 1 / 40 ? 1 : 0; if (frames >= 90) { if (slow > 45 && scale > .55) { scale *= .85; targets(); } frames = slow = 0; } }

  const one = new Float32Array(11);
  function box(x, y0, z, w, h, d, c, a = 1, band = -1) {
    const s = a >= .99 ? OPQ : y0 + h <= .05 ? LO : HI;
    one[0] = x; one[1] = y0; one[2] = z; one[3] = w; one[4] = h; one[5] = d; one[6] = band; one[7] = a; one[8] = c[0]; one[9] = c[1]; one[10] = c[2];
    reserve(s, 1); s.data.set(one, s.n * 11); s.n++; s.dirty = true;
  }
  const seg14 = new Float32Array(14);
  function seg(a, b, c, i, w) {
    seg14.set([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], i, 0, 1, w, 0]);
    reserve(OUT, 1); OUT.data.set(seg14, OUT.n * 14); OUT.n++; OUT.dirty = true;
  }

  function draw(now, dt, wallRise, sealA, hover) {
    govern(dt); targets(); view(RT.w / RT.h);
    for (const s of [SOL, EDG, OPQ, LO, HI, OUT]) upload(s);
    for (const r of [FX, SPK, RIP]) flush(r);
    const above = EYE[1] > 0;
    const C = { uVP: VP, uEye: EYE, uTime: now, uFog: FOG, uFogD: FOGD, uPx: RT.dpr, uRes: [RT.w, RT.h] };
    const boxes = (v, n, mirror) => { if (!n) return; use(P.box, Object.assign({}, C, { uMirror: mirror })); gl.bindVertexArray(v); gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, n); };
    const edges = (v, n) => { if (!n) return; use(P.boxedge, C); gl.bindVertexArray(v); gl.drawArraysInstanced(gl.LINES, 0, 24, n); };
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.ms); gl.viewport(0, 0, RT.w, RT.h);
    gl.clearColor(0, 0, 0, 1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(false);
    use(P.sky, { uInvVP: IVP, uEye: EYE, uFog: FOG }); gl.bindVertexArray(V.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (SEAL.n && sealA > .001) {
      const r = now * .025, c = Math.cos(r), s = Math.sin(r), k = 110;
      use(P.seal, Object.assign({}, C, { uA: sealA, uSky: new Float32Array([c * k, 0, -s * k, 0, 0, k, 0, 0, s * k * .9, 0, c * k * .9, 0, 0, 212, -300, 1]) }));
      gl.bindVertexArray(V.seal); gl.drawArrays(gl.POINTS, 0, SEAL.n);
    }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    if (above) {                   /* what stands, in the glass */
      gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      if (SOL.n) { use(P.solid, Object.assign({}, C, { uGrow: GROW, uMirror: -1, uHover: hover })); gl.bindVertexArray(V.solid); gl.drawArrays(gl.TRIANGLES, 0, SOL.n); }
      boxes(V.opq, OPQ.n, -1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
    if (SOL.n) { use(P.solid, Object.assign({}, C, { uGrow: GROW, uMirror: 1, uHover: hover })); gl.bindVertexArray(V.solid); gl.drawArrays(gl.TRIANGLES, 0, SOL.n); }
    boxes(V.opq, OPQ.n, 1);
    if (wallRise > .001) { use(P.wall, Object.assign({}, C, { uTop: -120 + 205 * wallRise })); gl.bindVertexArray(V.wall); gl.drawArrays(gl.TRIANGLES, 0, wall.length / 6); }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (EDG.n) { use(P.edge, Object.assign({}, C, { uGrow: GROW })); gl.bindVertexArray(V.edge); gl.drawArrays(gl.LINES, 0, EDG.n); }
    edges(V.opqE, OPQ.n);
    const ghosts = (v, ve, n) => { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); boxes(v, n, 1); edges(ve, n); };
    const storm = () => {
      ghosts(V.lo, V.loE, LO.n);
      gl.blendFunc(gl.ONE, gl.ONE);
      use(P.beam, C); gl.bindVertexArray(V.fx); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, FX.cap);
      if (OUT.n) { gl.bindVertexArray(V.out); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, OUT.n); }
      use(P.spark, C); gl.bindVertexArray(V.spark); gl.drawArrays(gl.POINTS, 0, SPK.cap);
    };
    const glass = () => { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); use(P.glass, Object.assign({}, C, { uSize: PLANE })); gl.bindVertexArray(V.glass); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    if (above) { storm(); glass(); ghosts(V.hi, V.hiE, HI.n); } else { ghosts(V.hi, V.hiE, HI.n); glass(); storm(); }
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
    draw, box, seg,
    begin() { OPQ.n = LO.n = HI.n = OUT.n = 0; for (const s of [OPQ, LO, HI, OUT]) s.dirty = true; },
    solid(s, ox, oz) {
      const t = s.mesh.tri, nv = t.length / 6, v = new Float32Array(nv * 11);
      for (let i = 0; i < nv; i++) { v.set(t.subarray(i * 6, i * 6 + 6), i * 11); v[i * 11 + 6] = ox + s.plot.x; v[i * 11 + 7] = oz + s.plot.z; v[i * 11 + 8] = s.h; v[i * 11 + 9] = s.birth; v[i * 11 + 10] = s.i; }
      append(SOL, v);
      const e = s.mesh.edge, ne = e.length / 3, w = new Float32Array(ne * 8);
      for (let i = 0; i < ne; i++) { w.set(e.subarray(i * 3, i * 3 + 3), i * 8); w[i * 8 + 3] = ox + s.plot.x; w[i * 8 + 4] = oz + s.plot.z; w[i * 8 + 5] = s.h; w[i * 8 + 6] = s.birth; }
      append(EDG, w);
    },
    fx: {
      streak(a, b, now, dur, c, i, w) { push(FX, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], i, now, dur, w, 1); },
      fall(a, b, now, c, i) { push(FX, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], i, now, 1.5, 2, 2); },
      line(a, b, now, dur, c, i, w) { push(FX, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], i, now, dur, w, 3); },
      ripple(x, z, now, kind) { push(RIP, x, z, now, kind); },
      sparks(x, y, z, now, kind = 0, n = 6) { for (let i = 0; i < n; i++) { const a = jitter() * 6.283, r = 2 + jitter() * 6; push(SPK, x, y, z, Math.cos(a) * r, (kind ? 4 : -2) - jitter() * 7, Math.sin(a) * r, now, .7 + jitter() * .5, kind); } },
    },
  };
}
let jit = 7; function jitter() { jit = (Math.imul(jit, 1664525) + 1013904223) >>> 0; return (jit >>> 8) / 16777216; }
const NOFX = { streak() {}, fall() {}, line() {}, ripple() {}, sparks() {} };
const fx = R ? R.fx : NOFX;

/* ================= tags: what each authority said, where it said it ================= */
const tagLayer = $("#tags"), TAGS = [];
for (let i = 0; i < (MOBILE ? 6 : 16); i++) { const el = document.createElement("span"); tagLayer.appendChild(el); TAGS.push({ el, on: false, t0: 0, life: 0, p: [0, 0, 0], key: "", drift: 0 }); }
function tag(p, text, cls, now, life = 2.2, key = "", drift = 0) {
  if (!R) return;
  const dx = p[0] - EYE[0], dy = p[1] - EYE[1], dz = p[2] - EYE[2]; if (dx * dx + dy * dy + dz * dz > 190 * 190) return;
  const c = xf(VP, p[0], p[1], p[2]); if (c[3] <= 0) return;
  const nx = c[0] / c[3], ny = c[1] / c[3];
  if (Math.abs(ny) > .86 || (MOBILE ? ny < -.12 || nx > .4 : nx < .02 || nx > .7)) return;     /* never over the copy */
  const t = (key && TAGS.find(t => t.on && t.key === key)) || (!key && TAGS.find(t => t.on && !t.key && Math.abs(t.p[0] - p[0]) + Math.abs(t.p[2] - p[2]) < 5))
    || TAGS.find(t => !t.on) || TAGS.reduce((a, b) => a.t0 < b.t0 ? a : b);
  t.el.textContent = text; t.el.className = cls; t.p = p.slice(); t.t0 = now; t.life = life; t.key = key; t.drift = drift; t.on = true;
}
function tags(now) {
  for (const t of TAGS) {
    if (!t.on) continue;
    const age = now - t.t0, c = xf(VP, t.p[0], t.p[1] - age * t.drift, t.p[2]);
    if (age > t.life || c[3] <= 0) { t.on = false; t.el.style.opacity = 0; continue; }
    t.el.style.transform = `translate3d(${(c[0] / c[3] * .5 + .5) * innerWidth}px,${(.5 - c[1] / c[3] * .5) * innerHeight}px,0)`;
    t.el.style.opacity = (Math.min(1, age * 10) * (1 - Math.max(0, age - (t.life - .5)) / .5)).toFixed(2);
  }
}
const hitBox = (o, d, lo, hi) => { let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3 && t0 <= t1; k++) { let u = (lo[k] - o[k]) / d[k], v = (hi[k] - o[k]) / d[k]; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); }
  return t0 <= t1 ? t0 : Infinity; };
const fmt = n => n.toLocaleString("en-US"), M = CW.money;

/* ================= 01 · CytherCAD — the boundary engine of the record ================= */
function cad() {
  const [ox, oz] = AT.cad, world = CX.world(14, 70), paths = new Map(), queue = [], st = { adm: 0, rej: 0, inv: 0 };
  let qi = 0, acc = 0;
  const at = (plot, p) => [ox + plot.x + p.x - CX.O, oz + plot.z + p.y - CX.O];
  function apply(o, now, live) {
    const { ev } = o; let path = paths.get(o.seed);
    if (!path) paths.set(o.seed, path = [at(o.plot, { x: CX.O, y: CX.O })]);
    const tip = at(o.plot, ev.from);
    if (ev.e === "ok") { path.push(at(o.plot, ev.to)); if (live) fx.ripple(tip[0], tip[1], now, 0); return; }
    if (ev.e === "rej") {
      st.rej++;
      if (live) { fx.ripple(tip[0], tip[1], now, 1); fx.sparks(tip[0], -.3, tip[1], now); tag([tip[0], 0, tip[1]], ev.tk.s + " · " + ev.why, "rule", now, 1.7, "", 2.5); }
      if (ev.discarded) { if (live) for (let i = 0; i + 1 < path.length; i++) fx.fall([path[i][0], -.25, path[i][1]], [path[i + 1][0], -.25, path[i + 1][1]], now, [.4, .5, 1], 1.2); paths.delete(o.seed); }
      return;
    }
    paths.delete(o.seed);
    if (ev.e === "inv") { st.inv++; return; }
    st.adm++; const s = o.solid; s.birth = live ? now : -1e4;
    if (R) R.solid(s, ox, oz);
    if (live) fx.ripple(ox + s.plot.x, oz + s.plot.z, now, 2);
  }
  for (let i = 0; i < 6000; i++) { const o = world.step(); if (!o) break; apply(o, 0, false); }
  return {
    st, name: "CytherCAD", center: [ox, 8, oz],
    step(now, dt) {
      acc += (CALM ? 30 : 110) * dt;
      while (acc >= 1) { acc--; const o = world.step(); if (!o) { acc = 0; break; }
        const tip = at(o.plot, o.ev.from); fx.streak([tip[0] + (jitter() - .5) * 14, -42 - jitter() * 30, tip[1] + (jitter() - .5) * 14], [tip[0], -.25, tip[1]], now, .7, [.5, .62, 1], 1.5, 2.1);
        queue.push({ t: now + .7, o }); }
      while (qi < queue.length && queue[qi].t <= now) apply(queue[qi++].o, now, true);
      if (qi > 2048) { queue.splice(0, qi); qi = 0; }
    },
    frame() {
      for (const path of paths.values()) {
        for (let i = 0; i + 1 < path.length; i++) R.seg([path[i][0], -.25, path[i][1]], [path[i + 1][0], -.25, path[i + 1][1]], [.4, .53, 1], 1.35, 2.2);
        const t = path[path.length - 1]; R.seg([t[0], -.25, t[1]], [t[0], -.25, t[1]], [.75, .82, 1], 3.2, 6.5);
      }
    },
    pick(o, d, now) {
      let best = null, bt = Infinity;
      for (const s of world.solids) {
        if (s.birth === undefined) continue;
        const e = s.mesh.ext, g = 1 - Math.pow(1 - clamp01((now - s.birth) / GROW), 3);
        const t = hitBox(o, d, [ox + s.plot.x + e[0], 0, oz + s.plot.z + e[2]], [ox + s.plot.x + e[1], s.h * g, oz + s.plot.z + e[3]]);
        if (t < bt) { bt = t; best = s; }
      }
      if (!best) return null;
      const j = CI.judge(best.toks);
      return { t: bt, hover: best.i, card: { title: best.id, badge: "CROSSED", sub: best.toks.map(t => t.s).join(" "), rows: [
        ["Boundary", "admitted · " + best.toks.length + " of " + best.toks.length + " tokens"], ["Kernel", "verified · independent rebuild"],
        ["Judged now", j.ok && j.kernel ? "ADMITTED · VERIFIED" : "REFUSED · " + j.why], ["Proposer", "seed " + String(best.seed).padStart(2, "0") + " · proposal " + fmt(best.at)]] } };
    },
  };
}

/* ================= 02 · ADII — a number looks wrong; two programs decide ================= */
function adii() {
  const [ox, oz] = AT.adii, D = CW.adii(5), st = { fix: 0, leave: 0, esc: 0 }, PX = 2.6, PZ = 3.3, BW = 1.25, BD = 1.25, TYP = 4200000;
  const pos = c => [ox + (c.c - (D.COLS - 1) / 2) * PX, oz + (c.r - (D.ROWS - 1) / 2) * PZ];
  const height = v => { const x = v / TYP; return 4.6 * (x <= 1.5 ? x : 1.5 + .85 * Math.log(x / 1.5)); };
  const shown = new Map(D.cells.map(c => [c, c.total])), notes = new Map();
  let cur = null, t0 = 0, nextAt = 1.5, done = new Set();
  function settle(k) { shown.set(k.cell, k.after); notes.set(k.cell, k); st[k.v === "FIX" ? "fix" : k.v === "LEAVE" ? "leave" : "esc"]++; }
  for (let i = 0; i < 5; i++) settle(D.investigate());
  const beat = (now, t, at) => t >= at && !done.has(at) && done.add(at);
  return {
    st, name: "ADII", center: [ox, 5, oz],
    focus: () => cur ? pos(cur.cell) : [ox, oz],
    step(now) {
      if (!cur && now >= nextAt) { cur = D.investigate(); t0 = now; done = new Set(); shown.set(cur.cell, cur.before); }
      if (!cur) return;
      const t = now - t0, [x, z] = pos(cur.cell), top = height(shown.get(cur.cell));
      if (beat(now, t, 0)) tag([x, height(cur.injected) + 3, z], "LOOKS WRONG · " + cur.flag, "rule", now, 3, "adii");
      for (let i = 0; i < 3; i++) if (beat(now, t, 1 + i * .5)) {
        const bx = x + (i - 1) * .9;
        fx.line([bx, -26, z + 2], [bx, -.3, z], now, 4.6 - i * .5, [.45, .6, 1], 1.4, 1.6); fx.ripple(bx, z, now, 3);
        tag([x + 9, -2 - i * 4.5, z], "READ · " + cur.read[i], "prop", now, 4.4 - i * .5, "adii-r" + i);
      }
      if (beat(now, t, 2.9)) tag([x, -4, z], "PROPOSE · " + cur.proposal.text, "prop", now, 2.6, "adii");
      if (beat(now, t, 4.3)) { const g = cur.gates[0]; fx.ripple(x, z, now, g.ok ? 4 : 1); if (!g.ok) fx.sparks(x, -.3, z, now);
        tag([x, 2, z], (g.ok ? "ALLOWED ✓ · " : "NOT ALLOWED · ") + g.why, g.ok ? "ok" : "rule", now, 2.4, "adii"); }
      if (cur.gates[1] && beat(now, t, 5.5)) { const g = cur.gates[1]; fx.ripple(x, z, now, g.ok ? 4 : 1); if (!g.ok) fx.sparks(x, -.3, z, now);
        tag([x, 2, z], (g.ok ? "HOLDS ✓ · " : "DOES NOT HOLD · ") + g.why, g.ok ? "ok" : "rule", now, 2.4, "adii"); }
      if (beat(now, t, 6.8)) {
        if (cur.v === "FIX") { fx.ripple(x, z, now, 2); fx.sparks(x, top, z, now, 1, 10); tag([x, height(cur.after) + 3, z], "FIX · " + M(cur.injected) + " → " + M(cur.after), "ok", now, 3, "adii"); }
        else if (cur.v === "LEAVE") tag([x, top + 3, z], "LEAVE · the sources agree — it was real", "ok", now, 3, "adii");
        else { fx.line([x, top, z], [x, 230, z], now, 5, [.9, .94, 1], 2.2, 3); tag([x, top + 4, z], "ESCALATE · to a person", "esc", now, 3, "adii"); }
      }
      if (t >= 6.8) { if (shown.get(cur.cell) !== cur.after || !notes.has(cur.cell)) { if (t >= 7.6) { settle(cur); } else shown.set(cur.cell, lerp(cur.injected, cur.after, ease(clamp01((t - 6.8) / .8)))); } }
      else if (t < .7) shown.set(cur.cell, lerp(cur.before, cur.injected, ease(t / .7)));
      else shown.set(cur.cell, cur.injected);
      if (t >= 8.6) { cur = null; nextAt = now + .6; }
    },
    frame(now) {
      const t = cur ? now - t0 : 0;
      for (const c of D.cells) {
        const [x, z] = pos(c), h = Math.max(.15, height(shown.get(c))), k = notes.get(c), live = cur && cur.cell === c;
        let col = DATA, band = -1;
        if (live) col = [.5, .58, .9];
        else if (k && k.v === "FIX") col = WHITE;
        if (live && cur.v === "FIX" && t > 6.8 && t < 8.2) { col = WHITE; band = clamp01((t - 6.8) / 1.2); }
        R.box(x, 0, z, BW, h, BD, col, 1, band);
        if (!live && k && k.v === "LEAVE") R.box(x, h, z, BW + .3, .25, BD + .3, [1.4, 1.45, 1.6]);
        if (!live && k && k.v === "ESCALATE") R.seg([x, h + .5, z], [x, h + 7, z], [.9, .94, 1], 1.6, 2.2);   /* awaiting a person */
      }
      if (!cur) return;
      const [x, z] = pos(cur.cell), hp = Math.max(.15, height(cur.proposal.to)), failAt = cur.gates[0].ok ? 5.5 : 4.3;
      if (t > 2.9 && t < 7.4) {                               /* the proposal hangs under the glass until both gates answer */
        const a = .42 * clamp01((t - 2.9) / .5) * (1 - clamp01((t - 6.8) / .6)), band = t > 5.5 && t < 6.6 && cur.gates[1] ? (t - 5.5) / 1.1 : -1;
        R.box(x, -hp, z, BW, hp, BD, cur.v === "ESCALATE" && t > failAt ? COBALT : GHOST, Math.max(.02, a), band);
      }
      if (t > 1 && t < 4) for (let i = 0; i < cur.cell.items.length && i < 7; i++)        /* the evidence it read, below */
        R.box(x + 5, -6 - i * .9, z, 2.4, .6, 2.4, [.4, .52, 1], .3 * clamp01((t - 1) / .5) * (1 - clamp01((t - 3.4) / .6)));
    },
    pick(o, d) {
      let best = null, bt = Infinity;
      for (const c of D.cells) { const [x, z] = pos(c), h = height(shown.get(c)); const t = hitBox(o, d, [x - BW / 2, 0, z - BD / 2], [x + BW / 2, h, z + BD / 2]); if (t < bt) { bt = t; best = c; } }
      if (!best) return null;
      const k = notes.get(best), rows = [["Recorded", M(best.total)], ["Line items", M(best.items.reduce((s, x) => s + x, 0))], ["Bank deposit", M(best.deposit)]];
      if (k) rows.push(["Investigated", k.flag], ["Proposed", k.proposal.text], ["Allowed", (k.gates[0].ok ? "✓ " : "✗ ") + k.gates[0].why]);
      if (k && k.gates[1]) rows.push(["Holds", (k.gates[1].ok ? "✓ " : "✗ ") + k.gates[1].why]);
      return { t: bt, card: { title: "Branch " + (best.r + 1) + " · day " + (best.c + 1), badge: k ? k.v : "HOLDS", sub: k ? "decided by the two gates, not by the investigator" : "total = its line items = the bank deposit", rows } };
    },
  };
}

/* ================= 03 · AWC-OS — the program runs only if the engine says so ================= */
function awc() {
  const [ox, oz] = AT.awc, E = CW.awc(), st = { exe: 0, ref: 0, blk: 0 }, PL = 6.2, TH = .9, PITCH = 1.2, STEP = .62, receipts = [];
  const slotOf = k => [ox + ((k % 8) - 3.5) * 9, oz + 15 + Math.floor(k / 8) * 9];
  let cur = null, t0 = 0, nextAt = 1, done = new Set();
  const settle = r => { if (r.verdict.v === "EXECUTED") { receipts.push(r); if (receipts.length > 40) receipts.shift(); } st[{ EXECUTED: "exe", REFUSED: "ref", BLOCKED: "blk" }[r.verdict.v]]++; };
  for (let i = 0; i < 9; i++) settle(E.next());
  const beat = (t, at) => t >= at && !done.has(at) && done.add(at);
  const tEnd = r => 1.5 + (r.verdict.at + 1) * STEP;
  return {
    st, name: "AWC-OS", center: [ox, 6, oz],
    step(now) {
      if (!cur && now >= nextAt) { cur = E.next(); t0 = now; done = new Set(); }
      if (!cur) return;
      const t = now - t0, v = cur.verdict, n = cur.lines.length;
      if (beat(t, .2)) tag([ox, 3, oz + 4], (cur.prog.alt ? "ALTERNATIVE · " : "PROPOSED · ") + cur.prog.q, "prop", now, 2.2, "awc");
      for (let j = 0; j <= v.at; j++) if (beat(t, 1.5 + j * STEP)) {
        const y = (j + 1) * PITCH;
        if (j === v.at && v.v !== "EXECUTED") { fx.ripple(ox, oz, now, 1); fx.sparks(ox, .2, oz, now, 0, 10); tag([ox, y + 2, oz], v.v + " · " + v.why, "rule", now, 3.2, "awc"); }
        else tag([ox, y + 2, oz], cur.lines[j] + (v.trace[j] && v.trace[j] !== "✓" ? "  →  " + v.trace[j] : "  ✓"), "prop", now, 1.4, "awc");
      }
      if (v.v === "EXECUTED" && beat(t, tEnd(cur))) { fx.ripple(ox, oz, now, 2); tag([ox, n * PITCH + 3, oz], "EXECUTED · " + cur.prog.name + " = " + v.result, "ok", now, 3, "awc"); }
      const life = v.v === "EXECUTED" ? tEnd(cur) + 1.6 : tEnd(cur) + (v.v === "BLOCKED" ? 2.8 : 1.8);
      if (t >= life) { settle(cur); cur = null; nextAt = now + .5; }
    },
    frame(now) {
      const s = PL / 2 + 1.2;                                 /* the engine: a frame in the glass */
      for (const [a, b] of [[[-s, -s], [s, -s]], [[s, -s], [s, s]], [[s, s], [-s, s]], [[-s, s], [-s, -s]]]) R.seg([ox + a[0], .03, oz + a[1]], [ox + b[0], .03, oz + b[1]], [.5, .62, 1], 1.1, 1.6);
      receipts.forEach((r, k) => { const [x, z] = slotOf(k), n = r.lines.length; for (let i = 0; i < n; i++) R.box(x, (n - 1 - i) * PITCH, z, PL, TH, PL, i === n - 1 ? [1.1, 1.12, 1.2] : WHITE); });
      if (!cur) return;
      const t = now - t0, v = cur.verdict, n = cur.lines.length, rise = ease(clamp01(t / 1.5));
      const jNow = Math.floor((t - 1.5) / STEP), band = clamp01((t - 1.5) / STEP - jNow);
      const crossed = t < 1.5 ? 0 : Math.min(v.at + 1, (t - 1.5) / STEP);
      let top = lerp(-46, -.4, rise) + crossed * PITCH, x = ox, z = oz, after = 0;
      if (v.v === "EXECUTED" && t > tEnd(cur)) { after = ease(clamp01((t - tEnd(cur) - .3) / 1.1)); const [gx, gz] = slotOf(Math.min(receipts.length, 39)); x = lerp(ox, gx, after); z = lerp(oz, gz, after); top = lerp(top, (n - 1) * PITCH + TH, after); }
      if (v.v === "REFUSED" && t > tEnd(cur)) top -= 30 * Math.pow(clamp01((t - tEnd(cur)) / 1.6), 2);
      if (v.v === "BLOCKED" && t > tEnd(cur) + 1.6) top -= 40 * Math.pow(clamp01((t - tEnd(cur) - 1.6) / 1.2), 2);
      const fading = v.v === "REFUSED" ? 1 - clamp01((t - tEnd(cur)) / 1.6) : v.v === "BLOCKED" ? 1 - clamp01((t - tEnd(cur) - 1.6) / 1.2) : 1;
      for (let i = 0; i < n; i++) {
        const y = top - i * PITCH - TH, over = y > -.2, failed = i === v.at && v.v !== "EXECUTED" && t >= 1.5 + v.at * STEP;
        if (failed) R.box(x, y, z, PL, TH, PL, [.25, .4, 1.6], .9 * fading, -1);
        else if (over && v.v === "EXECUTED") R.box(x, y, z, PL, TH, PL, i === n - 1 && after > 0 ? [1.1, 1.12, 1.2] : WHITE, 1, i === jNow && after === 0 ? band : -1);
        else if (over) R.box(x, y, z, PL, TH, PL, v.v === "BLOCKED" ? [.7, .75, .9] : WHITE, (v.v === "BLOCKED" ? .35 : 1) * fading);
        else R.box(x, y, z, PL, TH, PL, GHOST, .3 * fading);
      }
    },
    pick(o, d) {
      let best = null, bt = Infinity;
      receipts.forEach((r, k) => { const [x, z] = slotOf(k), h = r.lines.length * PITCH; const t = hitBox(o, d, [x - PL / 2, 0, z - PL / 2], [x + PL / 2, h, z + PL / 2]); if (t < bt) { bt = t; best = r; } });
      if (!best) return null;
      return { t: bt, card: { title: best.prog.q, badge: "EXECUTED", sub: best.prog.name + " = " + best.verdict.result,
        rows: best.lines.map((l, i) => [String(i + 1).padStart(2, "0"), l + (best.verdict.trace[i] && best.verdict.trace[i] !== "✓" ? " → " + best.verdict.trace[i] : " ✓")]) } };
    },
  };
}

/* ================= 04 · SijilOS — the present enters at the glass; the past rises ================= */
function sijil() {
  const [ox, oz] = AT.sijil, L = CW.sijil(9), st = { rej: 0 }, SZ = 20, TH = .42, PITCH = .56;
  let cur = null, t0 = 0, nextAt = .8, lift = 1, link = null;
  for (let i = 0; i < 60; i++) if (!L.propose().ok) st.rej++;
  const colOf = e => e.kind === "SALE" ? WHITE : e.kind === "REFUND" ? [.62, .7, .86] : [.45, .6, 1.25];
  const yOf = n => (L.log.length - 1 - n) * PITCH - (1 - lift) * PITCH;
  return {
    st, name: "SijilOS", center: [ox, 10, oz], log: L.log,
    height: () => L.log.length * PITCH,
    step(now, dt) {
      lift = Math.min(1, lift + dt / .45);
      if (!cur && now >= nextAt) { cur = L.propose(); t0 = now; }
      if (!cur) return;
      if (now - t0 >= .75) {
        if (cur.ok) {
          lift = 0; fx.ripple(ox, oz, now, 4);
          tag([ox + SZ / 2 + 2, 1, oz], "#" + cur.event.n + " · " + cur.event.kind + " · " + M(cur.event.net) + "  ·  chain " + cur.event.hash, "ok", now, 1.8, "sijil");
          if (cur.event.kind === "CORRECTION") link = { ref: cur.event.ref, n: cur.event.n, t: now };
        } else { st.rej++; fx.ripple(ox, oz, now, 1); fx.sparks(ox, -.3, oz, now, 0, 10); tag([ox + SZ / 2 + 2, 1, oz], "REJECTED · " + cur.why, "rule", now, 2.4, "sijil"); }
        cur = null; nextAt = now + .45;
      }
    },
    frame(now) {
      const n0 = Math.max(0, L.log.length - 420);
      for (let n = n0; n < L.log.length; n++) R.box(ox, yOf(n), oz, SZ, TH, SZ, colOf(L.log[n]));
      const h = L.log.length * PITCH, cx = ox + SZ / 2 + .6, cz = oz + SZ / 2 + .6;
      R.seg([cx, 0, cz], [cx, h, cz], [.5, .62, 1], 1.6, 1.8);                  /* the chain: every event bound to the one before */
      R.seg([cx, 0, cz], [cx, 0, cz], [.8, .86, 1], 3, 6);
      if (link && now - link.t < 5 && link.ref >= n0) {                        /* a correction points at what it corrects */
        const a = yOf(link.n) + TH / 2, b = yOf(link.ref) + TH / 2, x = ox - SZ / 2 - 1.2, k = 1 - clamp01((now - link.t - 3.5) / 1.5);
        R.seg([x + 1, a, oz], [x, a, oz], [.6, .72, 1], 2 * k, 1.8); R.seg([x, a, oz], [x, b, oz], [.6, .72, 1], 2 * k, 1.8); R.seg([x, b, oz], [x + 1, b, oz], [.6, .72, 1], 2 * k, 1.8);
      }
      if (cur) { const s = clamp01((now - t0) / .75); R.box(ox, lerp(-34, -TH - .1, ease(s)), oz, SZ, TH, SZ, cur.ok ? GHOST : [.4, .5, 1], .4); }
    },
    pick(o, d) {
      const h = L.log.length * PITCH, t = hitBox(o, d, [ox - SZ / 2, 0, oz - SZ / 2], [ox + SZ / 2, h, oz + SZ / 2]);
      if (t === Infinity) return null;
      const y = o[1] + d[1] * t, n = Math.max(0, Math.min(L.log.length - 1, L.log.length - 1 - Math.floor(y / PITCH))), e = L.log[n];
      return { t, card: { title: "Event #" + e.n + " · " + e.kind, badge: "APPENDED", sub: e.text, rows: [
        ["Net", M(e.net)], ["VAT", M(e.vat)], ["Chain", e.hash + " ← " + (n ? L.log[n - 1].hash : L.genesis)],
        ["State after", "revenue " + M(e.revenue) + " · VAT due " + M(e.vatDue)], ["History", "never edited — " + (L.log.length - 1 - n) + " events since"]] } };
    },
  };
}

const S = { cad: cad(), adii: adii(), awc: awc(), sijil: sijil() }, STATIONS = Object.values(S);

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
const MOB = [[1.3, 8], [1.35, 8], [1.35, 8], [1.35, 8], [1.3, 8], [1.15, 8], [1, 20], [1.2, 10]];
function keys() {
  const fa = S.adii.focus(), th = S.sijil.height(), ax = lerp(AT.adii[0], fa[0], .5), A = AT;
  const off = (q, dx, y, dz) => [q[0] + dx, y, q[1] + dz], sway = CALM ? 0 : .14 * Math.sin(performance.now() / 9000);
  return [                                                     /* each system is met from its outer side: the walk is one orbit */
    { e: [470 * Math.sin(.69 + sway), 178, 470 * Math.cos(.69 + sway)], t: [0, 30, 0], f: 38 },   /* the glass, four systems */
    { e: off(A.cad, -86, 40, 100), t: off(A.cad, 0, 6, 0), f: 40 },                       /* 01 geometry */
    { e: [ax + 64, 30, A.adii[1] + 62], t: [ax, 3, A.adii[1]], f: 40 },                   /* 02 data */
    { e: off(A.awc, 76, 36, -74), t: off(A.awc, 0, 6, 10), f: 40 },                       /* 03 money */
    { e: off(A.sijil, -70, 24 + th * .3, -84), t: off(A.sijil, 0, th * .42, 0), f: 42 },  /* 04 records */
    { e: [620, 430, 380], t: [0, -14, 0], f: 38 },                                         /* inside your walls */
    { e: [0, 14, 96], t: [0, 212, -300], f: 56 },                                          /* the record */
    { e: [-310, 100, 280], t: [0, 10, 0], f: 38 },                                         /* what must never happen */
  ];
}
const cam = { e: [60, -80, 300], t: [0, -10, -40], f: 54 };
const ptr = { x: 0, y: 0, sx: 0, sy: 0, mx: -1, my: -1, moved: false };
function story(dt) {
  p = progress();
  const K = keys(), i = Math.min(Math.floor(p), K.length - 2), f = ease(Math.min(1, p - i)), a = K[i], b = K[i + 1];
  const lp = (u, v) => u.map((x, k) => x + (v[k] - x) * f);
  const goal = { e: lp(a.e, b.e), t: lp(a.t, b.t), f: a.f + (b.f - a.f) * f };
  if (MOBILE) { const sc = lerp(MOB[i][0], MOB[i + 1][0], f); goal.e = goal.e.map((x, k) => goal.t[k] + (x - goal.t[k]) * sc); goal.f += lerp(MOB[i][1], MOB[i + 1][1], f); }
  const k = CALM ? 1 : 1 - Math.exp(-dt * 2.1);
  for (let j = 0; j < 3; j++) { cam.e[j] += (goal.e[j] - cam.e[j]) * k; cam.t[j] += (goal.t[j] - cam.t[j]) * k; }
  cam.f += (goal.f - cam.f) * k;
  if (!CALM) { const kp = 1 - Math.exp(-dt * 3); ptr.sx += (ptr.x - ptr.sx) * kp; ptr.sy += (ptr.y - ptr.sy) * kp; }
  secs.forEach((s, j) => { const v = clamp01(1 - (Math.abs(p - j) - .28) * 2.4).toFixed(2); if (s.dataset.vis !== v) { s.dataset.vis = v; s.style.setProperty("--vis", v); } });
  const cur = Math.round(p);
  RAIL.forEach((r, j) => r.toggleAttribute("aria-current", j + 1 === cur));
  if (railBox) railBox.classList.toggle("off", p < .5);
}
function view(aspect) {
  const r = [cam.t[2] - cam.e[2], cam.e[0] - cam.t[0]], d = Math.hypot(cam.e[0] - cam.t[0], cam.e[1] - cam.t[1], cam.e[2] - cam.t[2]);
  const rl = Math.hypot(r[0], r[1]) || 1, sway = d * .035;
  EYE = [cam.e[0] + r[0] / rl * ptr.sx * sway, cam.e[1] - ptr.sy * sway * .6, cam.e[2] + r[1] / rl * ptr.sx * sway];
  VP = mul(persp(cam.f * Math.PI / 180, aspect, .5, 5000, MOBILE ? 0 : .3, MOBILE ? .4 : 0), look(EYE, cam.t)); IVP = inv(VP);
}
addEventListener("pointermove", e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; if (e.pointerType === "mouse") { ptr.mx = e.clientX; ptr.my = e.clientY; ptr.moved = true; } }, { passive: true });
addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { ptr.mx = e.clientX; ptr.my = e.clientY; ptr.moved = true; } }, { passive: true });

/* ================= the four names, over the overview ================= */
const names = $$("[data-station]").map(el => ({ el, s: S[el.dataset.station] }));
function labels() {
  for (const { el, s } of names) {
    const c = s.center, top = s === S.sijil ? S.sijil.height() + 8 : s === S.cad ? 26 : 20, q = xf(VP, c[0], top, c[2]);
    const wide = Math.max(clamp01(1 - p * 2), clamp01(1 - Math.abs(p - 5) * 2));
    const vis = q[3] > 0 ? wide : 0;
    el.style.opacity = vis.toFixed(2); el.style.pointerEvents = vis > .5 ? "auto" : "none";
    if (vis > 0) el.style.transform = `translate3d(${(q[0] / q[3] * .5 + .5) * innerWidth}px,${(.5 - q[1] / q[3] * .5) * innerHeight}px,0)`;
  }
}

/* ================= receipts: every standing thing answers for itself ================= */
const card = $("#receipt");
let hover = -1, cardKey = null, lastPick = 0;
function showCard(c) {
  card.querySelector("[data-r=title]").textContent = c.title; card.querySelector("[data-r=badge]").textContent = c.badge;
  card.querySelector("[data-r=sub]").textContent = c.sub;
  const dl = card.querySelector("dl"); dl.textContent = "";
  for (const [k, v] of c.rows) { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; dl.append(dt, dd); }
}
function receipts(now) {
  if (!R || !ptr.moved || now - lastPick < .05) return;
  lastPick = now; ptr.moved = false;
  const over = document.elementFromPoint(ptr.mx, ptr.my);
  let best = null;
  if (!(over && over.closest("a, button, .copy p, .copy h1, .copy h2, .copy li, #receipt, .rail, header, .hud, [data-station]"))) {
    const nx = ptr.mx / innerWidth * 2 - 1, ny = 1 - ptr.my / innerHeight * 2, a = xf(IVP, nx, ny, -1), b = xf(IVP, nx, ny, 1);
    const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], d = [b[0] / b[3] - o[0], b[1] / b[3] - o[1], b[2] / b[3] - o[2]];
    for (const s of STATIONS) { const h = s.pick(o, d, now); if (h && (!best || h.t < best.t)) best = h; }
  }
  hover = best && best.hover !== undefined ? best.hover : -1;
  if (!best) { card.classList.remove("on"); cardKey = null; return; }
  const key = best.card.title + best.card.sub;
  if (key !== cardKey) { showCard(best.card); cardKey = key; }
  card.classList.add("on");
  card.style.transform = `translate3d(${Math.min(ptr.mx + 22, innerWidth - card.offsetWidth - 12)}px,${Math.min(ptr.my + 22, innerHeight - card.offsetHeight - 12)}px,0)`;
}

/* ================= the live readout ================= */
const T = {}; $$("[data-t]").forEach(el => (T[el.dataset.t] = T[el.dataset.t] || []).push(el));
const put = (k, v) => (T[k] || []).forEach(el => { if (el.textContent !== v) el.textContent = v; });
const external = () => performance.getEntriesByType("resource").filter(e => new URL(e.name, location.href).origin !== location.origin).length;
let lastHud = -1;
function hud(now) {
  if (now - lastHud < .15) return; lastHud = now;
  const c = S.cad.st, a = S.adii.st, w = S.awc.st, s = S.sijil.st, log = S.sijil.log;
  put("cad", fmt(c.adm)); put("cad-rej", fmt(c.rej)); put("cad-inv", fmt(c.inv));
  put("fix", fmt(a.fix)); put("leave", fmt(a.leave)); put("esc", fmt(a.esc)); put("adii", fmt(a.fix));
  put("exe", fmt(w.exe)); put("ref", fmt(w.ref)); put("blk", fmt(w.blk)); put("awc", fmt(w.exe));
  put("sij", fmt(log.length)); put("sij-rej", fmt(s.rej)); put("head", log.length ? log[log.length - 1].hash : "—");
  put("stopped", fmt(c.rej + a.esc + w.ref + w.blk + s.rej)); put("ext", String(external()));
}
$$("[data-m]").forEach(el => { const v = CM.project(el.dataset.m); if (v !== el.textContent) { el.classList.add("stale"); console.error("stale projection", el.dataset.m, el.textContent, "≠", v); } });
put("state", CM.CHECKSUM);

/* ================= the loop ================= */
measure(); addEventListener("resize", measure); addEventListener("load", measure);
const iWalls = secs.findIndex(s => s.dataset.ch === "contain");
const SEAL_A = [.02, .02, .02, .02, .02, .045, .16, .05];
let t0 = performance.now() / 1000, clock = 0;
function frame(ms) {
  const dt = Math.min(ms / 1000 - t0, .1); t0 = ms / 1000; clock += dt;
  for (const s of STATIONS) s.step(clock, dt);
  story(dt);
  if (R) {
    R.begin(); for (const s of STATIONS) s.frame(clock);
    const wall = clamp01((p - (iWalls - .75)) / .75), i = Math.min(Math.floor(p), SEAL_A.length - 2);
    R.draw(clock, dt, ease(wall), lerp(SEAL_A[i], SEAL_A[i + 1], ease(Math.min(1, p - i))), hover);
    tags(clock); receipts(clock); labels();
  }
  hud(clock);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
