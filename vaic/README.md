# VAIC-0 CytherAI obligation corpus

This directory is the first falsifiable experiment in Verified Adaptive Interface
Compilation. It is deliberately a corpus and evaluator-authority matrix, not a
compiler or a universal design DSL. The current CytherAI artifact remains the
oracle: the language must state its real laws without weakening them or converting
implementation accidents into invariants.

The frozen compilation object is:

```text
compile(R, K, G, P, C) -> (A, Pi, beta)
```

The mandatory set is monotone:

```text
M = M_core union M_grammar union M_profile
M_core union M_grammar is a subset of M for every admissible P and C
```

Results are exactly `PASS`, `FAIL`, or `NOT_EVALUATED`. Missing evidence, and
evidence bound to another build, verifier, record or policy (stale), is
`NOT_EVALUATED`. A receipt from an evaluator the obligation does not authorize, or
with coverage it does not license, is malformed data: the corpus is `INVALID`.
There is no compensatory score: one current `FAIL` is the verdict beside any number of
current `PASS`es. Projection and origin validity remain separate.

Every observation stands as recorded. A `FAIL` appended after a history of `PASS` is a
regression on record, and a later `PASS` a fix, never corruption: a row's `result` is the
verdict of its receipts bound to the current candidate, or, with none current, its latest
observation.

## Artifacts

- `cytherai-obligations.v3.json` — the current corpus: 19 typed obligations with their
  quantified contexts, dependencies, required evaluator authority/coverage, results,
  build-bound receipts, and — because it supersedes `v2` — a `transition` on every row:
  4 CARRIED_FORWARD to the film (reading ink, the artifact allowlist, the settled state,
  the origin; successor surface named, rebound fields listed, version raised where a field
  moved), 1 SUPERSEDED with THE UNHAPPENED (motion corresponding to the engine's
  transitions), 4 still SUPERSEDED with the drawing set and 10 with instrument-v1 (retired
  mechanism named, preserved with their evidence, not owed). Every receipt of `v2` is in it
  verbatim.
- `cytherai-obligations.v2.json` — the corpus as written against THE UNHAPPENED,
  `cytherai-obligations.v1.json` against the drawing set, `cytherai-obligations.v0.json`
  against instrument-v1, all kept as history. The guards walk the admitted states of all
  three.
- `evaluator-matrix.v0.json` — evaluator classes, reusable relation authority,
  coverage semantics, and explicit non-authority.
- `evidence/current-browser-observations.v0.json` — bounded observation ledger.
  Each observation carries its own artifact build; prior-build observations are
  retained but cannot certify the current candidate.
- `tools/vaic_validate.py` — structural and receipt validator. Evidence resolves by
  identity and anchor; a retired file (in `backup/instrument-v1/`,
  `backup/drawing-set-v1/` or `backup/unhappened-v1/`) keeps resolving the historical
  receipts that cite it, and a current receipt may not cite it.
- `tools/test-vaic.py` — the negative controls proving the validator rejects common
  authority, coverage and history laundering paths.

Run:

```sh
python3 tools/vaic_validate.py
python3 tools/test-vaic.py
```

`./verify.sh` runs both; the artifact identity is a projection of tracked source, so
nothing is built.

`v0` was written against instrument-v1, the homepage retired on 2026-09-16; `v1` is the
transition to the drawing set, `v2` the transition to THE UNHAPPENED on 2026-10-04, and `v3`
the transition to the film on 2026-10-12 —
each surviving obligations, explicit successor bindings, and supersession records, never
the predecessor minus inconvenient rows. A superseded obligation's
effective verdict is `SUPERSEDED`: not owed by the candidate, not counted for or against
its projection, its observations preserved.

## Initial corpus result

Recorded at genesis, against instrument-v1, and kept as that record; the validator derives
the current distribution (`python3 tools/vaic_validate.py`). For build `F1FF314DEC2C4717`:

| Result | Count | Meaning |
|---|---:|---|
| PASS | 7 | Current artifact-bound evidence with sufficient evaluator authority and declared coverage |
| FAIL | 0 | No current-build authoritative failure receipt |
| NOT_EVALUATED | 11 | Mandatory evidence is missing, stale, environment-mismatched, or outside available evaluator authority |

Therefore:

```text
corpus structure  VALID
projection        INVALID
origin            NOT_CERTIFIED
release           NOT_CERTIFIED
```

`INVALID` here is fail-closed: one or more mandatory projection obligations are
not `PASS`. It is not a claim that every unevaluated obligation is broken.

The prior build `661AFC4C3C67BFD1` observed a concrete 320px target counterexample:
the persistent `FORK` control measured 33.28x45.5px against the proposed 44x44px
envelope. That signal remains recorded, but VAIC-0 correctly refuses to promote it
to a `FAIL` for the current build without a current artifact-bound browser receipt.

## Corpus coverage

The 19 obligations exercise 17 reusable relation names across semantic,
epistemic, artifact, geometry, state, relational, topological, temporal, resource,
and origin layers. The bespoke-relation ratio is 0%, below the frozen 25% kill
criterion. This is evidence that the vocabulary can encode the first corpus; it is
not yet evidence that the vocabulary generalizes beyond this artifact.

The remaining current-build evaluation work is intentionally explicit:

- four-width mobile non-occlusion, viewport closure, and two-dimensional targets;
- height-only observer/world preservation;
- canonical/fork discriminability, reset persistence, and encounter ordering;
- all-claim evidence reachability at depth one;
- whole-runtime quiescence;
- human-reviewed motion/state correspondence;
- time-indexed production-origin closure.
