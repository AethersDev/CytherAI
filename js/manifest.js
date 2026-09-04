/* ============================================================================
   js/manifest.js  →  window.CytherManifest
   The public manifest and its deterministic derivation core. One normalized
   disclosure tuple drives the seeds, the admission, the checksum, and the
   world's four parameters — the statistic, the render, and the printed state
   are the same function of the same data.

   Ported from newC3/synthesis-rev5.html. Amendments over the prototype:
     · dsinOrbit(params, n)   — the engine-invariant orbit the camera derives from (§5.2)
     · legibility() + admit() — the legibility screen extends admission (§5.3)
     · MANIFEST merges the real facts from content/record.js (§5.1, §7.1):
       provenance (chain of record), patent status, and the real revision head.

   Pure logic — no DOM. Loads clean under jsc (globalThis, no browser globals).
   PROVISIONAL values (marked below) are the single source the user replaces
   later; replacement is a data-only edit here — nothing derived is hardcoded
   downstream.
   ============================================================================ */
(function (root) {
"use strict";

/* ================= the public manifest — single source of derived state ================= */
const MANIFEST = {
  /* ---- checksum tuple (drives derivation): epoch, derived, revision, disclosed,
     indexed, controlled, validation, not_claimed ---- */
  epoch: 3,                                   /* PROVISIONAL */
  derived: "2026-07-16",                      /* PROVISIONAL */
  revision: "2.0",                            /* REAL — content/record.js sealed head */
  systems_indexed: 6,                         /* PROVISIONAL */
  systems_disclosed: ["CAD-2024-001", "SIJ-2025-001"],  /* REAL ids · count PROVISIONAL */
  public_records: 14,                         /* PROVISIONAL */
  controlled_references: 3,                   /* PROVISIONAL */
  external_runtime_calls: 0,                  /* REAL — CL-01 re-derives from Resource Timing */
  validation_index: ["T2C192-IR-0.00", "GVR-BEAM-100", "GVR-COMP-100", "DIM3-99", "DIM5-97", "MOP-91"], /* REAL (v1.1) */
  not_claimed: [                              /* PROVISIONAL wording */
    "GENERAL TEXT-TO-CAD SEMANTIC PARITY",
    "CLOUD-SCALE THROUGHPUT",
    "FOUNDATION-MODEL GENERALITY",
    "UNSUPERVISED DEPLOYMENT AUTHORITY",
    "BENCHMARK LEADERSHIP BEYOND THE DISCLOSED RECORD"
  ],
  /* ---- merged real facts (content/record.js) — presentation only, not in the
     checksum tuple; changing these never re-derives the mark ---- */
  provenance: [                               /* REAL — §04 chain of record */
    { date: "2024.Q4", event: "ORIGINATED", desc: "Zero-dependency architecture established in CytherCAD build" },
    { date: "2025.Q1", event: "FILED",      desc: "US Provisional Application submitted" },
    { date: "2026.Q1", event: "VALIDATED",  desc: "CytherCAD evaluation confirms zero-dependency execution path" },
    { date: "2026.Q2", event: "CURRENT",    desc: "Public surface disclosure at current classification level" }
  ],
  patent: "US PROVISIONAL · FILED 2025.Q1"    /* REAL — footer reads US PATENT PENDING */
};

/* ================= prior + committed disclosure states ================= */
/* Epochs 01/02 are PROVISIONAL (dates fabricated); revision numbers are REAL
   (content/record.js revision history: 1.0, 1.4, 2.0). The async verifier
   re-derives each from its published nonce. */
const EPOCHS = [
  { epoch: 1, derived: "2026-02-09", revision: "1.0", disclosed: ["CAD-2024-001"],
    indexed: 4, controlled: 1, validation: ["T2C192-IR-0.00"] },
  { epoch: 2, derived: "2026-05-02", revision: "1.4", disclosed: ["CAD-2024-001", "SIJ-2025-001"],
    indexed: 5, controlled: 2, validation: ["T2C192-IR-0.00", "GVR-BEAM-100", "GVR-COMP-100"] }
];
/* Pre-registration: digest published while sealed; preimage discloses with the epoch.
   Precedence needs an external anchor — the page renders the commitment; it does not
   notarize it. PROVISIONAL digest (newC3/epoch04-preimage.txt demo preimage). */
/* PROVISIONAL. `status` is printed verbatim on the floor chip — it is the page's
   statement about the preimage, so it must describe the preimage's actual custody.
   This digest is sha256 of newC3/epoch04-preimage.txt, a tracked demonstration
   file: the preimage is public, and the chip says so. Replacing this with a real
   commitment is a data-only edit — new digest, new date, and status
   "PREIMAGE SEALED" once the preimage exists only in the owner's custody and
   appears in no history intended for public release. Do not restore "SEALED"
   before that is true; the floor's law is that nothing is stated that is not checked. */
const COMMITMENTS = [
  { epoch: 4, committed: "2026-07-17",
    digest: "c763fcd5faecb8c568c60f6b42f3b968babb95a5aa9c55593cf96e963187439d",
    status: "PREIMAGE PUBLIC · DEMONSTRATION" }
];

/* ================= FNV-1a ================= */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/* ================= deterministic sine — the admission domain =================
   Admission decides identity, so it runs on dsin/dcos: a polynomial sine over
   IEEE-exact +,*,floor, bit-identical across engines. Math.sin is not normatively
   specified and may differ in the last ulp per engine; the render keeps native sin
   (the orbits agree to ~1e-7 per step) and admission never reads the render. */
const TWO_PI = 6.283185307179586, HALF_PI = 1.5707963267948966, D_PI = 3.141592653589793;
function dsin(x) {
  x = x - TWO_PI * Math.floor(x / TWO_PI + 0.5);
  if (x > HALF_PI) x = D_PI - x; else if (x < -HALF_PI) x = -D_PI - x;
  const x2 = x * x;
  return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800))))));
}
function dcos(x) { return dsin(x + HALF_PI); }

/* the dsin orbit — n points, same warmup 40 and start (0.08, 0.12) as the render.
   The camera derives its anchors from THIS orbit (not the native-sin tiles), so the
   journey through the mark is engine-invariant (§5.2, CL-08). */
function dsinOrbit(params, n) {
  const a = params[0], b = params[1], c = params[2], d = params[3];
  let x = 0.08, y = 0.12;
  for (let i = 0; i < 40; i++) { const nx = dsin(a * y) + c * dcos(a * x), ny = dsin(b * x) + d * dcos(b * y); x = nx; y = ny; }
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const nx = dsin(a * y) + c * dcos(a * x), ny = dsin(b * x) + d * dcos(b * y);
    x = nx; y = ny; out[i * 2] = x; out[i * 2 + 1] = y;
  }
  return out;
}

/* ================= digest → parameter within the map's working ranges ================= */
function derive(seed, lo, hi) {
  const h = fnv(seed);
  const u = ((h >>> 8) % 10000) / 10000;
  return ((h & 1) ? 1 : -1) * (lo + u * (hi - lo));
}

/* Richness + legibility share the same deterministic 280k-point walk. The old
   implementation walked it twice per nonce (once for richness, once for the
   legibility grid), so the three published admission checks paid for 1.68m
   recurrences. One bounded numeric cache now keeps only the two scalar results;
   the orbit and Set are released after each previously unseen parameter tuple. */
const RICHNESS_N = 280000, RICHNESS_FLOOR = 400;

/* legibility screen (§5.3): the far-field exposure (×0.9) centers the whole orbit
   behind the reading column. A candidate is admissible only if it does not pack
   excessive density into that central band. Computed W-independently over the orbit's
   own 96-cell bounding grid: the "text lane" is the central 62% of columns, full height
   — the content-column fraction (min(760px, 0.62·W)) taken as its W-invariant 0.62
   branch so the predicate is deterministic and DOM-free. Metric = fraction of lane
   cells whose dsin-orbit count exceeds the mean occupied-cell density. Admission caps
   it at LEGIBILITY_CAP = round(3 × canonical, 2) — 3× headroom over the shipped mark.
   CANONICAL LEGIBILITY (nonce 0) = 0.1887  →  LEGIBILITY_CAP = 0.57  (calibrated Phase 1) */
const LEGIBILITY_G = 96, LEGIBILITY_N = 280000, LEGIBILITY_CAP = 0.57;
const METRIC_CACHE = new Map(), METRIC_CACHE_MAX = 192;
const metricKey = p => p.map(v => Number(v).toPrecision(17)).join(",");
function admissionMetrics(p) {
  const key = metricKey(p), cached = METRIC_CACHE.get(key);
  if (cached) return cached;

  const G = LEGIBILITY_G, n = LEGIBILITY_N;
  const a = p[0], b = p[1], c = p[2], d = p[3];
  let x = 0.08, y = 0.12;
  for (let i = 0; i < 40; i++) {
    const nx = dsin(a * y) + c * dcos(a * x), ny = dsin(b * x) + d * dcos(b * y);
    x = nx; y = ny;
  }
  const orbit = new Float32Array(n * 2), occupied = new Set();
  for (let i = 0; i < n; i++) {
    const nx = dsin(a * y) + c * dcos(a * x), ny = dsin(b * x) + d * dcos(b * y);
    x = nx; y = ny;
    if (!isFinite(x) || !isFinite(y)) return { richness: 0, legibility: 1 };
    /* Richness intentionally reads the unrounded recurrence, exactly as before;
       the Float32 orbit remains the normative input to the legibility grid. */
    occupied.add(((x * 40) | 0) + ":" + ((y * 40) | 0));
    orbit[i * 2] = x; orbit[i * 2 + 1] = y;
  }

  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (let i = 0; i < n; i++) {
    const x = orbit[i * 2], y = orbit[i * 2 + 1];
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const span = Math.max(maxx - minx, maxy - miny, 1e-3);
  const grid = new Float32Array(G * G);
  for (let i = 0; i < n; i++) {
    const gx = Math.max(0, Math.min(G - 1, ((orbit[i * 2] - minx) / span * G) | 0));
    const gy = Math.max(0, Math.min(G - 1, ((orbit[i * 2 + 1] - miny) / span * G) | 0));
    grid[gy * G + gx]++;
  }
  let occ = 0, sum = 0;
  for (let i = 0; i < G * G; i++) { if (grid[i] > 0) { occ++; sum += grid[i]; } }
  const mean = occ ? sum / occ : 0;
  const c0 = Math.round(G * 0.19), c1 = Math.round(G * 0.81);   /* central 62% */
  let lane = 0, dense = 0;
  for (let gy = 0; gy < G; gy++) for (let gx = c0; gx < c1; gx++) { lane++; if (grid[gy * G + gx] > mean) dense++; }
  const result = { richness: occupied.size, legibility: lane ? dense / lane : 0 };
  if (METRIC_CACHE.size >= METRIC_CACHE_MAX) METRIC_CACHE.clear();
  METRIC_CACHE.set(key, result);
  return result;
}
function renderedRichness(p) { return admissionMetrics(p).richness; }
function legibility(p) { return admissionMetrics(p).legibility; }

/* ================= the normalized tuple → seeds → parameters ================= */
function normalizeManifest(M) {
  return {
    epoch: M.epoch, derived: M.derived, revision: M.revision, disclosed: M.systems_disclosed,
    indexed: M.systems_indexed, controlled: M.controlled_references, validation: M.validation_index,
    not_claimed: M.not_claimed
  };
}
function seedsFor(m) {
  return [
    "systems:" + m.disclosed.join(",") + ":" + m.indexed,
    "validation:" + m.validation.join("|"),
    "revision:" + m.revision + ":epoch:" + m.epoch,
    "controlled:" + m.controlled
  ];
}
function paramsFor(m, n) {
  const S = seedsFor(m);
  return [derive(S[0] + ":n" + n, 1.2, 2.0), derive(S[1] + ":n" + n, 1.2, 2.0),
          derive(S[2] + ":n" + n, 0.6, 1.2), derive(S[3] + ":n" + n, 0.6, 1.2)];
}
/* admission: first nonce whose params render a rich AND legible orbit. Bounded scan;
   a manifest with no admissible orbit within 64 nonces returns null (INVALID,
   first-class) — surfaced by the verifier as ADMISSION FAILED, never swallowed. */
function admit(m) {
  for (let n = 0; n < 64; n++) {
    const p = paramsFor(m, n);
    if (renderedRichness(p) > RICHNESS_FLOOR && legibility(p) <= LEGIBILITY_CAP) return { p, n };
  }
  return null;
}
function stateChecksum(m) {
  const h = fnv(JSON.stringify([m.epoch, m.derived, m.revision, m.disclosed, m.indexed, m.controlled, m.validation, m.not_claimed || []]));
  return ((h >>> 16).toString(16).padStart(4, "0") + ":" + (h & 0xffff).toString(16).padStart(4, "0")).toUpperCase();
}

/* ================= published derivation cache =================
   Boot renders from these immediately (paramsFor is microseconds; only the richness +
   legibility screens are expensive). The verifier re-derives them from the manifest
   after load, off the boot path. A stale cache is detected and displayed, never trusted.
   NONCES (calibrated Phase 1): current = 0 · epoch 01 = 0 · epoch 02 = 0
   CANONICAL CHECKSUM = 75D1:89D1 · epoch 01 = E141:9D7A · epoch 02 = 2BF8:2477 (recorded Phase 1) */
const PUBLISHED_NONCES = { current: 0, epochs: [0, 0] };
const NORM = normalizeManifest(MANIFEST);
const ADMISSION_NONCE = PUBLISHED_NONCES.current;
const CANON = paramsFor(NORM, ADMISSION_NONCE);
const CHECKSUM = stateChecksum(NORM);

const API = {
  MANIFEST, EPOCHS, COMMITMENTS, PUBLISHED_NONCES, NORM, CANON, ADMISSION_NONCE, CHECKSUM,
  LEGIBILITY_CAP,
  fnv, dsin, dcos, dsinOrbit, derive, renderedRichness, legibility,
  seedsFor, paramsFor, admit, normalizeManifest, stateChecksum
};
root.CytherManifest = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
