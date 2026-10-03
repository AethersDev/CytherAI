/* ============================================================================
   prototype/unhappened/trace.js — TRACE-1, the Cyther Trace.

   A Cyther Trace is the drawing of one refusal receipt and nothing else: every
   mark is a field of the receipt, so no trace exists without a decision, and two
   traces that look alike record the same kind of decision.

   Its unit is one PROPOSED OPERATION — a single token a proposer offers to extend
   its attempt at a program (CytherInstrument.biEngine().step()). The boundary
   refuses an operation under one of eight relations; KERNEL is the ninth reason,
   when an attempt closes and the independent kernel refuses the whole program.
   A trace never stands for a complete program, and an admitted program leaves none.

   Fields → marks. Frozen: a different drawing is TRACE-2, never an edit of TRACE-1.
     reason r (index in REASONS)   → ring radius, and r%4 + 1 breaks in every ring;
                                     KERNEL rings are unbroken (the program closed;
                                     the kernel refused it whole)
     depth (operations accepted    → 1–4 concentric rings
       before it: <2 · <5 · <9 · ≥9)
     receipt hash h (32-bit)       → orientation, (h mod 64)/64 of a turn
     operation family (r 4–7)      → a witness spoke, opposite the orientation
     discarded (budget exhausted)  → a centre dot: the attempt was abandoned here
   code = r + 16·depth + 64·(h mod 64) + 4096·discarded   (13 bits; exact in float32)
   One drawing, two renderers: GLSL for surfaces (1 unit = 1 world unit; seen from
   above, +x right and +z down) and SVG in the same frame.
   ============================================================================ */
(function (root) {
"use strict";
const VERSION = "TRACE-1";
const REASONS = ["GRAMMAR", "CLOSURE", "CLOSURE AXIS", "CLOSING CROSS", "AXIS ORDER", "ARG RANGE", "BOUNDS", "CROSSES", "KERNEL"];
const G = { base: .04, step: .006, gap: .02, line: .0032, spoke: .0024, dot: .0055, brk: .09 };   /* trace units */

function code(why, accepted, hash, discarded) {
  const r = REASONS.indexOf(why);
  if (r < 0) throw new Error(VERSION + ": no reason " + why);
  return r + 16 * (accepted < 2 ? 0 : accepted < 5 ? 1 : accepted < 9 ? 2 : 3) + 64 * ((hash >>> 0) % 64) + 4096 * (discarded ? 1 : 0);
}

const f = x => x.toFixed(4);
const GLSL = `
float sig(vec2 q, float code, float grow){
  float r = mod(code, 16.), dep = mod(floor(code / 16.), 4.), ang = mod(floor(code / 64.), 64.) / 64. * 6.28318, disc = floor(code / 4096.);
  float rad = length(q), th = atan(q.y, q.x) - ang, v = 0., base = (${f(G.base)} + ${f(G.step)} * r) * grow;
  for (int i = 0; i < 4; i++) { if (float(i) > dep) break; v = max(v, exp(-pow((rad - base - float(i) * ${f(G.gap)} * grow) / ${f(G.line)}, 2.))); }
  if (r < 8.) v *= smoothstep(${f(G.brk * 2 / 3)}, ${f(G.brk * 4 / 3)}, fract(th / 6.28318 * (mod(r, 4.) + 1.) + 1.));
  float outer = base + dep * ${f(G.gap)} * grow;
  float spoke = exp(-pow(abs(sin(th)) * rad / ${f(G.spoke)}, 2.)) * step(cos(th), 0.) * smoothstep(base * .35, base * .5, rad) * (1. - smoothstep(outer, outer + .006, rad));
  v = max(v, spoke * step(4., r) * step(r, 7.));
  return max(v, exp(-pow(rad / ${f(G.dot)}, 2.)) * disc);
}
`;

function svg(c) {
  const r = c % 16, dep = Math.floor(c / 16) % 4, ang = Math.floor(c / 64) % 64 / 64 * 2 * Math.PI, disc = c >= 4096;
  const base = G.base + G.step * r, outer = base + dep * G.gap, b = r < 8 ? r % 4 + 1 : 0, W = f(outer + .012);
  const pt = (R, a) => f(R * Math.cos(a)) + " " + f(R * Math.sin(a));
  let d = "";
  for (let i = 0; i <= dep; i++) {
    const R = base + i * G.gap, A = f(R) + " " + f(R);
    if (!b) d += `M${pt(R, 0)}A${A} 0 1 1 ${pt(R, Math.PI)}A${A} 0 1 1 ${pt(R, 0)}`;
    else for (let k = 0; k < b; k++) { const s = 2 * Math.PI / b, a0 = ang + (k + G.brk) * s, a1 = ang + (k + 1) * s; d += `M${pt(R, a0)}A${A} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(R, a1)}`; }
  }
  if (r >= 4 && r <= 7) d += `M${pt(base * .425, ang + Math.PI)}L${pt(outer, ang + Math.PI)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${W} -${W} ${f(2 * W)} ${f(2 * W)}" aria-hidden="true">` +
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${f(G.line * 1.66)}" stroke-linecap="round"/>` +
    (disc ? `<circle r="${f(G.dot * .8)}" fill="currentColor"/>` : "") + "</svg>";
}

root.CytherTrace = { VERSION, code, GLSL, svg };
})(typeof window !== "undefined" ? window : globalThis);
