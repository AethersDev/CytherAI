'use strict';
/**
 * content/record.js — THE CANONICAL PUBLIC RECORD
 *
 * Public-surface data only. Everything here is already safe to ship; nothing
 * here is gated by presentation. Restricted content is represented by its
 * genuine ABSENCE (value === INVALID), never by a shipped-but-hidden field —
 * see the security boundary note in profiles/disclosure.js.
 *
 * The §04 Chain of Record and the colophon Revision History are not prose:
 * they are literal edgeLogs. The tables on the page are rendered by walking
 * their `.edges`, and "current" is `valueAt(latest)` — a real point query, not
 * a hand-marked row that can drift.
 */
(function (global) {
  const E = global.CytherEngine ||
    (typeof require !== 'undefined' ? require('../engine/trajectory-engine.js') : null);
  if (!E) throw new Error('record.js: CytherEngine not loaded — engine/trajectory-engine.js must come first');
  const { INVALID, edgeLog, materialize } = E;

  /* ── §04 · Chain of Record — each milestone is an edge into a sealed log ── */
  const chainOfRecord = edgeLog(INVALID);          // before origination there is no record
  chainOfRecord.append(materialize(INVALID, [
    { tau: 0, value: { date: '2024.Q4', event: 'ORIGINATED', desc: 'Zero-dependency architecture established in CytherCAD build' } },
    { tau: 1, value: { date: '2025.Q1', event: 'FILED',      desc: 'US Provisional Application submitted' } },
    { tau: 2, value: { date: '2026.Q1', event: 'VALIDATED',  desc: 'CytherCAD evaluation confirms zero-dep execution path claim' } },
    { tau: 3, value: { date: '2026.Q2', event: 'CURRENT',    desc: 'Public surface disclosure at current classification level' } },
  ]));

  /* ── Revision History — an edge log; current revision = valueAt(now) ── */
  const revisionHistory = edgeLog(INVALID);
  revisionHistory.append(materialize(INVALID, [
    { tau: 0, value: { rev: '1.0', date: '2026.03', note: 'Initial filing' } },
    { tau: 1, value: { rev: '1.4', date: '2026.04', note: 'Validation readout updated' } },
    { tau: 2, value: { rev: '2.0', date: '2026.04', note: 'Protocol & provenance sections added' } },
  ]));
  const currentRevision = revisionHistory.valueAt(Infinity);   // the sealed head: REV 2.0

  /* ── Exhibits — positioning FACTS only. Disclosure tier is computed from these
   *    (profiles/disclosure.js), never hand-typed. Restricted content is absent. ── */
  const exhibits = [
    {
      id: 'CAD-2024-001', label: 'EXHIBIT A',
      facts: { environment: 'on-prem', dependency: 'zero', evaluation: 'gated', restricted: false },
      content: { type: 'TECHNICAL VALIDATION RECORD', title: 'CytherCAD — Controlled Generative CAD',
        rows: [['Status', 'Production-validated'], ['Verified', 'Log + external benchmark'], ['Context', 'On-prem · Private']],
        hash: 'e3b0c442..78ce', outcome: 'IR 0.00% vs 10.00% (DeepCAD) · Text2CAD-192' },
    },
    {
      id: 'SIJ-2025-001', label: 'EXHIBIT B',
      facts: { environment: 'on-prem', dependency: 'zero', evaluation: 'gated', restricted: false },
      content: { type: 'DEPLOYMENT OPERATIONAL RECORD', title: 'SijilOS — Event-Sourced Ledger Engine',
        hash: 'a7ffc6f8..4e48', outcome: 'Zero core cloud dependency · Full offline operation' },
    },
    {
      id: 'NTP-2025-001', label: 'EXHIBIT C',
      facts: { environment: 'air-gapped', dependency: 'zero', evaluation: 'gated', restricted: true },
      // SECURITY BOUNDARY: this exhibit's real content is NOT present in the bundle.
      // Its public value is genuinely INVALID — there is nothing in devtools to find.
      content: INVALID,
    },
  ];

  /* ── §03 · Validation readout (CytherCAD v1.1) — already public ── */
  const validation = {
    subject: 'CytherCAD v1.1 · External benchmark · Text2CAD-192',
    metrics: [
      { tier: 'ext',      label: 'Invalid Rate (↓ better)',          cyther: '0.00%', deepcad: '10.00%', t2cad: '0.93%', bar: 100, op: 0.45 },
      { tier: 'verified', label: 'GVR · Constrained Beam (n=100)',   cyther: '100%',  deepcad: '—', t2cad: '—', bar: 100, op: 0.45 },
      { tier: 'verified', label: 'GVR · Completion (n=100)',         cyther: '100%',  deepcad: '—', t2cad: '—', bar: 100, op: 0.45 },
      { tier: 'verified', label: 'Dimensional Accuracy ±3mm (n=35)', cyther: '99%',   deepcad: '—', t2cad: '—', bar: 99,  op: 0.38 },
      { tier: 'verified', label: 'Dimensional Accuracy ±5mm (n=35)', cyther: '97%',   deepcad: '—', t2cad: '—', bar: 97,  op: 0.32 },
      { tier: 'verified', label: 'Multi-Op Accuracy · Encoder (n=35)', cyther: '91%', deepcad: '—', t2cad: '—', bar: 91,  op: 0.26 },
    ],
  };

  /* ── Build hash — COMPUTED from the canonical record, not typed. Deterministic
   *    FNV-1a over the serialized public record; recompute reproduces it exactly. ── */
  function serializeRecord() {
    const seal = (log) => log.edges.map((e) => e.to);
    return JSON.stringify({
      chain: seal(chainOfRecord),
      revisions: seal(revisionHistory),
      exhibits: exhibits.map((x) => ({ id: x.id, facts: x.facts, restricted: x.facts.restricted })),
      validation: validation.metrics.map((m) => [m.label, m.cyther]),
    });
  }
  function buildHash() {
    const s = serializeRecord();
    let h = 0x811c9dc5;                          // FNV-1a 32-bit
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  const api = { chainOfRecord, revisionHistory, currentRevision, exhibits, validation, buildHash, serializeRecord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CytherRecord = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
