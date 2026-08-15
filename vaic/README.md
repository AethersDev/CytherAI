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

Results are exactly `PASS`, `FAIL`, or `NOT_EVALUATED`. Missing/stale evidence,
environment mismatch, evaluator overreach, or insufficient coverage is always
`NOT_EVALUATED`; there is no compensatory score. Projection and origin validity
remain separate.

## Artifacts

- `cytherai-obligations.v0.json` — 18 typed obligations, their quantified
  contexts, dependencies, required evaluator authority/coverage, current results,
  and build-bound receipts.
- `evaluator-matrix.v0.json` — evaluator classes, reusable relation authority,
  coverage semantics, and explicit non-authority.
- `evidence/current-browser-observations.v0.json` — bounded observation ledger.
  Each observation carries its own artifact build; prior-build observations are
  retained but cannot certify the current candidate.
- `tools/vaic_validate.py` — structural and receipt validator.
- `tools/test-vaic.py` — nine negative controls proving the validator rejects
  common authority and coverage laundering paths.

Run:

```sh
python3 tools/vaic_validate.py
python3 tools/test-vaic.py
```

`./verify.sh` runs both after rebuilding `dist/`, so the artifact-manifest receipt
is checked against the exact current closure.

## Initial corpus result

For build `F1FF314DEC2C4717`:

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

The 18 obligations exercise 17 reusable relation names across semantic,
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
