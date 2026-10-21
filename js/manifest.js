/* ============================================================================
   js/manifest.js  →  window.CytherManifest
   The public manifest and its deterministic derivation core. One normalized
   disclosure tuple drives the checksum and the canonical parameters (CANON) the
   derived social card and icon are drawn from; the pages print its facts as
   projections (project), never as literals. No page loads it: the projector and the
   verifiers read it under jsc (THE EXCEPTION, the last page that did, retired on
   2026-10-16 to backup/exception-v1/).

   Ported from backup/newC3/synthesis-rev5.html; MANIFEST merges the real facts from
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
  external_runtime_calls: 0,                  /* REAL — every page's CSP and tools/test-site.py hold it (CL-01, the drawing set's runtime check, retired with it) */
  validation_index: ["T2C192-INV-1-384"],      /* REAL (v1.1) — corrected 2026-10-21, below */
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
   validation_index above carries the checksum-bearing identifiers: a display change never
   re-derives the mark, a correction of the record does. VALIDATION is the same record in its
   printed form, one row per identifier in table order; the projection test holds the two
   identifier sets equal. `mark` is the evidence class: log-verified (CytherAI's own log) or
   externally validated.
   Corrected 2026-10-21 against the runs' own records (docs/deploy.md §5ad). The 192
   descriptions were chosen from the Text2CAD dataset and run by CytherAI, not an external
   benchmark, and the run's result file shows one invalid part in 384 (none of 192 on one way
   of reading a description, one of 192 on the other), not 0.00%. DeepCAD's 10.00% and
   Text2CAD's 0.93% are the Text2CAD paper's own test (Table 1: expert prompts, its checker),
   not comparable, and are withdrawn; so are the rows no run supports as printed: a beam GVR of
   100% at n=100; "Dimensional Accuracy ±3mm/±5mm (n=35)", which was compliance with a 3 or 5 mm
   minimum over 427 and 425 generated dimensions; a multi-operation rate printed as an accuracy;
   a completion figure on prompts the decoding had been tuned on. The six rows as first printed
   are backup/cold-paper-v1/pages/brief.html. */
const VALIDATION = [
  { id: "T2C192-INV-1-384", mark: "log", metric: "Invalid parts · CytherAI’s test, April 2026 · 192 descriptions from the Text2CAD dataset, two parts each",
    cyther: "1 of 384" }
];
/* the Arabic room prints the figure in Arabic word order, derived from the same string: one authority */
for (const r of VALIDATION) r.ar = r.cyther.replace(" of ", " من ");

/* ================= projections — every manifest fact the pages print =================
   tools/project-manifest.py writes these strings into the marked elements of pages/brief.html
   and CytherCAD's rooms (data-m="name"; the front doors print none since 2026-10-21), so the documents keep their facts as bytes
   and a reader without scripts still has them; no page reads them back. A printed count
   or figure that is not a projection is a second authority — which is how the strata once
   stated 06 INDEXED while only the floor derived the count. An unknown name is INVALID,
   first-class: null, and the projector refuses it; so is a name with a part too many. */
const pad2 = n => String(n).padStart(2, "0");
function project(name) {
  const parts = name.split(":"), [kind, key, field] = parts;
  if (parts.length !== (kind === "validation" ? 3 : 2)) return null;
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
   (calibrated Phase 1: 0); CANON is derived at it. CANONICAL CHECKSUM = 5290:7C3B since the record's correction
   (2026-10-21); 75D1:89D1 before it, the state the retired derived assets record. */
const NORM = normalizeManifest(MANIFEST);
const ADMISSION_NONCE = 0;
const CANON = paramsFor(NORM, ADMISSION_NONCE);
const CHECKSUM = stateChecksum(NORM);

/* the public surface — every symbol has a caller in a verifier (tools/test-api.py holds
   the inventory); fnv, derive, seedsFor, paramsFor, normalizeManifest and stateChecksum
   are the derivation's internals. */
const API = { MANIFEST, VALIDATION, CANON, ADMISSION_NONCE, CHECKSUM, project };
root.CytherManifest = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof globalThis !== "undefined" ? globalThis : this);
