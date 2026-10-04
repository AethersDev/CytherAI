/* ============================================================================
   js/manifest.js  →  window.CytherManifest
   The public manifest and its deterministic derivation core. One normalized
   disclosure tuple drives the checksum and the canonical parameters (CANON) the
   derived social card and icon are drawn from; the pages print its facts as
   projections (project), never as literals.

   Ported from newC3/synthesis-rev5.html; MANIFEST merges the real facts from
   content/record.js (§5.1, §7.1). The epoch history, the commitments, and the
   admission and legibility screen that derived the drawing set's seal retired with
   it (2026-10-04) and are preserved whole in backup/drawing-set-v1/js/manifest.js.

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

/* ================= the validation record, as display data =================
   validation_index above carries the checksum-bearing identifiers and stays exactly
   as it is — a display change must never re-derive the mark. VALIDATION is the same
   record in its printed form, one row per identifier in table order; the projection
   test holds the two identifier sets equal. `mark` is the evidence class the table's
   legend declares: log-verified (●) or externally validated (◌). */
const VALIDATION = [
  { id: "T2C192-IR-0.00", mark: "ext", metric: "Invalid Rate (↓ better)", cyther: "0.00%", deepcad: "10.00%", t2cad: "0.93%" },
  { id: "GVR-BEAM-100",   mark: "log", metric: "GVR · Constrained Beam (n=100)", cyther: "100%" },
  { id: "GVR-COMP-100",   mark: "log", metric: "GVR · Completion (n=100)", cyther: "100%" },
  { id: "DIM3-99",        mark: "log", metric: "Dimensional Accuracy ±3mm (n=35)", cyther: "99%" },
  { id: "DIM5-97",        mark: "log", metric: "Dimensional Accuracy ±5mm (n=35)", cyther: "97%" },
  { id: "MOP-91",         mark: "log", metric: "Multi-Op Accuracy · Encoder (n=35)", cyther: "91%" }
];

/* ================= projections — every manifest fact the pages print =================
   One function, two consumers. tools/project-manifest.py writes these strings into
   the marked elements of index.html and pages/brief.html (data-m="name"), so the
   documents keep their facts as bytes and a reader without scripts still has them;
   the front door (js/unhappened.js) reads its marks back at runtime against this function.
   A printed count or figure that is not a projection is a second authority — which
   is how the strata once stated 06 INDEXED while only the floor derived the count.
   An unknown name is INVALID, first-class: null, and both consumers refuse it. */
const pad2 = n => String(n).padStart(2, "0");
function project(name) {
  const [kind, key, field] = name.split(":");
  if (kind === "count") {
    if (key === "systems_indexed") return pad2(MANIFEST.systems_indexed);
    if (key === "systems_disclosed") return pad2(MANIFEST.systems_disclosed.length);
    if (key === "controlled_references") return pad2(MANIFEST.controlled_references);
    return null;
  }
  if (kind === "validation") {
    const row = VALIDATION.find(r => r.id === key);
    return row && typeof row[field] === "string" && field !== "id" && field !== "mark" ? row[field] : null;
  }
  if (name === "outcome:cad") { const r = VALIDATION[0]; return "IR " + r.cyther + " vs " + r.deepcad + " (DeepCAD) · Text2CAD-192"; }
  return null;
}

/* ================= FNV-1a ================= */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/* ================= digest → parameter within the map's working ranges ================= */
function derive(seed, lo, hi) {
  const h = fnv(seed);
  const u = ((h >>> 8) % 10000) / 10000;
  return ((h & 1) ? 1 : -1) * (lo + u * (hi - lo));
}

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
function stateChecksum(m) {
  const h = fnv(JSON.stringify([m.epoch, m.derived, m.revision, m.disclosed, m.indexed, m.controlled, m.validation, m.not_claimed || []]));
  return ((h >>> 16).toString(16).padStart(4, "0") + ":" + (h & 0xffff).toString(16).padStart(4, "0")).toUpperCase();
}

/* ================= the canonical derivation =================
   ADMISSION_NONCE is the nonce the drawing set's admission screen published and verified
   (calibrated Phase 1: 0); CANON is derived at it. CANONICAL CHECKSUM = 75D1:89D1. */
const NORM = normalizeManifest(MANIFEST);
const ADMISSION_NONCE = 0;
const CANON = paramsFor(NORM, ADMISSION_NONCE);
const CHECKSUM = stateChecksum(NORM);

/* the public surface — every symbol has a caller in a served module or a verifier
   (tools/test-api.py holds the inventory); derive, seedsFor, paramsFor, normalizeManifest
   and stateChecksum are the derivation's internals. */
const API = { MANIFEST, VALIDATION, CANON, ADMISSION_NONCE, CHECKSUM, project, fnv };
root.CytherManifest = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
