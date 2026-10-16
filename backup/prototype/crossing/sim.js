/* ============================================================================
   prototype/crossing/sim.js  →  window.CytherCrossing
   The world of THE CROSSING — pure, DOM-free, loads under jsc.

   Forty seeded proposers stream the boundary engine of the record
   (CytherInstrument.biEngine), round-robin. Each proposer works one plot of a
   spiral around the origin; a program the boundary and the kernel both admit
   becomes a solid on that plot, and its proposer moves to the next free plot.
   Same seeds, same order → the same city, in the same order, on every machine.
   Only the wall-clock pacing belongs to the browser.
   ============================================================================ */
(function (root) {
"use strict";
const CI = root.CytherInstrument, CM = root.CytherManifest;
const O = 6, PITCH = 14;

/* plot centres within radius R, nearest first; ties broken on integer keys only */
function spiral(R) {
  const n = Math.floor(R / PITCH), out = [];
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if ((i * i + j * j) * PITCH * PITCH <= R * R) out.push([i, j]);
  out.sort((p, q) => (p[0] * p[0] + p[1] * p[1]) - (q[0] * q[0] + q[1] * q[1]) || p[0] - q[0] || p[1] - q[1]);
  return out.map(([i, j]) => ({ x: i * PITCH, z: j * PITCH }));
}

/* same identity the drawing set prints: fnv over the token spellings */
const progId = toks => "PRG-" + (CM.fnv(toks.map(t => t.s).join("")) >>> 0).toString(16).padStart(8, "0").toUpperCase();

function inside(v, px, py) {
  let c = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i], [xj, yj] = v[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/* a closed program as a solid, in plot-local units: x,z centred on the plot, y ∈ {0,1}
   (the shader scales it by height). tri: x,y,z,nx,ny,nz per vertex · edge: x,y,z pairs */
function mesh(toks) {
  let x = O, y = O; const v = [[x, y]];
  for (const tk of toks) { if (tk.k === "Z") break; if (tk.k === "H") x += tk.sg * tk.mg; else y += tk.sg * tk.mg; v.push([x, y]); }
  let area2 = 0, minx = 99, maxx = -99, miny = 99, maxy = -99;
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length]; area2 += a[0] * b[1] - b[0] * a[1];
    minx = Math.min(minx, a[0]); maxx = Math.max(maxx, a[0]); miny = Math.min(miny, a[1]); maxy = Math.max(maxy, a[1]);
  }
  const s = area2 > 0 ? 1 : -1, tri = [], edge = [];
  for (let cy = miny; cy < maxy; cy++) for (let cx = minx; cx < maxx; cx++) {
    if (!inside(v, cx + 0.5, cy + 0.5)) continue;
    const x0 = cx - O, x1 = x0 + 1, z0 = cy - O, z1 = z0 + 1;
    for (const [h, n] of [[1, 1], [0, -1]]) tri.push(x0,h,z0,0,n,0, x1,h,z0,0,n,0, x1,h,z1,0,n,0, x0,h,z0,0,n,0, x1,h,z1,0,n,0, x0,h,z1,0,n,0);
  }
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    const nx = s * Math.sign(b[1] - a[1]), nz = -s * Math.sign(b[0] - a[0]);
    const ax = a[0] - O, az = a[1] - O, bx = b[0] - O, bz = b[1] - O;
    tri.push(ax,0,az,nx,0,nz, bx,0,bz,nx,0,nz, bx,1,bz,nx,0,nz, ax,0,az,nx,0,nz, bx,1,bz,nx,0,nz, ax,1,az,nx,0,nz);
    edge.push(ax,1,az, bx,1,bz, ax,0,az, bx,0,bz, ax,0,az, ax,1,az);
  }
  return { tri: new Float32Array(tri), edge: new Float32Array(edge), ext: [minx - O, maxx - O, miny - O, maxy - O] };
}

/* step() returns { seed, ev, plot, solid? } for one proposal, or null once every
   proposer has run out of plots (the field is complete) */
function world(n, R) {
  const plots = spiral(R), eng = [], solids = [];
  let next = 0, tick = 0, live = n;
  for (let s = 1; s <= n; s++) eng.push({ seed: s, e: CI.biEngine(s), plot: next++ });
  function step() {
    if (!live) return null;
    let g; do g = eng[tick++ % n]; while (g.plot < 0);
    const ev = g.e.step(), out = { seed: g.seed, ev, plot: plots[g.plot] };
    if (ev.e === "adm") {
      out.solid = { i: solids.length, id: progId(ev.prog), toks: ev.prog, seed: g.seed, at: g.e.st.prop,
                    plot: out.plot, h: 0.9 * ev.prog.length, mesh: mesh(ev.prog) };
      solids.push(out.solid);
      if (next < plots.length) g.plot = next++; else { g.plot = -1; live--; }
    }
    return out;
  }
  return { step, solids, plots };
}

const API = { world, O };
root.CytherCrossing = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
