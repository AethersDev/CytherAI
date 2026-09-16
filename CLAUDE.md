# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no framework, package manager, bundler, or linter. The
zero-dependency verification entrypoint is `./verify.sh`; it runs the jsc module and
logic regressions, the Python projection/integration tests, and the corpus validator.
Browser-only checks (layout, service worker, the seal and FIG. 1 as rendered) remain in
`docs/deploy.md`; the retired world's laws run with `backup/instrument-v1/verify.sh`.
Serve with any static file server: `python3 -m http.server 8000` from the repo root.

The first VAIC-0 research corpus lives under `vaic/`. `./verify.sh` validates its
schema, receipt authority/build binding, coverage scope, and negative controls.
Corpus `FAIL` or `NOT_EVALUATED` results are reported without being laundered into
structural test failures; an invalid corpus or receipt exits nonzero.

**A receipt says what was observed; its binding says where that observation applies;
the verdict for the current candidate is derived from both.** An observation is
immutable — never rewrite a recorded `PASS` into `NOT_EVALUATED` because the bytes
moved. A new build expires the observation's authority, not the observation: a
receipt naming an older build is `STALE` and derives `NOT_EVALUATED`, so a historical
`FAIL` condemns a new candidate no more than a historical `PASS` certifies one. Both
are history until reproduced. Re-running a harness therefore APPENDS a new receipt
rather than editing an admitted one. `INVALID` is reserved for malformed data (bad digest,
unresolvable evidence pointer, cycle, schema violation, or a receipt that claims the
current build AND the current verifier while carrying another candidate's digest);
stale-but-well-formed
evidence keeps structure `VALID` and reports `current evidence: INCOMPLETE`. Result
distributions are derived by the validator and never written into a test.

**Admitted observations are immutable. Provisional observations may be discarded before
admission. Re-evaluation appends; it never edits an admitted observation.** A harness
runs many times while one verifier is being built, and those executions are facts but
not institutional receipts. Immutability begins at ADMISSION, not at the moment a test
process emitted `PASS`:

```
EXECUTION → PROVISIONAL OBSERVATION → candidate/verifier still moving?
                                        yes → discard or replace it
                                        no  → ADMIT → IMMUTABLE RECEIPT
```

**A commit records a state; canonical reachability admits it.** A receipt is *admitted*
iff it occurs in a corpus state reachable from the **canonical admission lineage**,
`refs/heads/master` (declared as `CANONICAL_REF` in `tools/test-vaic.py`, which is where
the guards enforce it). Three strengths, never treated as equivalent:

| state | claim |
|---|---|
| **PROVISIONAL** — working tree, or any development lineage | a reproducible development state |
| **ADMITTED** — reachable from the canonical ref | an institutional state, immutable |
| **ANCHORED** — additionally bound outside mutable git history | history cannot be silently rewritten undetected |

A commit on a development branch is therefore a **candidate** state, still replaceable:
a bogus receipt committed on a branch that is never merged creates no institutional
history, and merging is the act of admission. Git is the enforcement boundary, not the
concept — squashing or splitting commits changes nothing, but **a genesis commit must
not be squashed away on merge**, or the named admission event survives only on a
disposable branch while some other commit becomes the real first admission. CytherAI
claims the first two rows today; only a signed tag or external transparency anchor would
buy the third, and none is claimed.

**Hard boundary: a receipt that has appeared in any committed canonical corpus may never
later be reclassified as a draft.** "It was only intermediate" must be knowable at the
time, never asserted afterwards because the history became inconvenient.
`tools/test-vaic.py` enforces this against `HEAD`.

It follows that **an epoch is an admitted institutional state on the canonical lineage,
not every transient or merely committed computational state.** Three verifier edits
inside one development transaction are one epoch, not three.

**Admission freezes meaning, not incidental serialization.** What is immutable is the
observation — obligation, observed candidate, verdict, method, environment, evidence,
and verifier provenance as recorded. Exact equality is today's *implementation* of that
rule because the corpus has seen no schema migration; a future `v0 → v1` representation
change is permitted through a mechanically verified bijection preserving those
semantics. "Byte-identical forever" is not the law and must not become a trap.

**Three times stay distinct and are never conflated:** *observation time* (when the test
or browser observation happened), *admission time* (when the institution accepted it into
canonical history), and *applicability* (whether it licenses the candidate under
consideration). **Genesis may admit observations older than the ledger. Admission does
not rewrite their provenance, observation time, or authority.** Admitting a receipt whose
verifier is `UNRECORDED` or `EXTERNAL` claims only that the observation is part of the
record with exactly the limitations recorded — never that the current verifier produced
it. `UNRECORDED` is bounded provenance, not shameful provenance; `EXTERNAL` is evidence
from outside the recorded verification boundary, not invalid evidence. Never tidy either
into something prettier before admitting it: the limitation is part of the historical fact.

**Two guards, because they answer different questions.** The HEAD guard asks *am I about
to delete or mutate admitted history?*; the history walk asks *has admitted history ever
disappeared at any earlier transition?* — a receipt admitted in commit A and dropped in B
is invisible from C. Both live in `tools/test-vaic.py`. Their altitude is **append-only
relative to retained repository history, which is not externally anchored historical
immutability**: a force-push, rebase, or repository replacement rewrites the universe the
guards inspect. That is the same boundary the floor already draws — the page renders the
commitment; it does not notarize it. A signed tag or external transparency anchor would
buy the second property, and is not claimed today.

**A location is not an identity.** Evidence resolves as
`receipt → build identity → covered file identity → semantic anchor`, never by line
number. An anchor is a language symbol (`js/ledger.js#mailtoBody`) or, where the file
has none, an explicit `EVIDENCE: slug` comment; it must be defined exactly once in the
cited file. Line numbers may drift without invalidating evidence; a deleted, renamed,
or duplicated anchor is `INVALID`, because the historical record has stopped resolving.
A receipt may only cite a file that `IDENTITY_COVERAGE` in `tools/vaic_validate.py`
declares, so **adding a harness file means adding it there** — otherwise receipts
cannot cite it. **Retirement is a move, not a deletion:** a retired file (`RETIRED`)
lives whole in a declared snapshot (`ARCHIVES`, today `backup/instrument-v1/`), a
receipt observed on an earlier build resolves it there by the path it had then, and a
receipt bound to the current build may not cite it at all — the build does not ship it.
Identities stay separated by role (record, kernel, grammar, policy, artifact,
verification) and are never collapsed into one digest, so a receipt states exactly
what moved. An observation binds both the candidate and the verifier that
produced it: editing any file in the verification set expires the receipts that set
produced, and re-running the harness re-stamps them.

**The validator boundary is total.** Every input yields exactly one of `VALID` (exit 0),
`INVALID` (exit 1, a judgment about the *data*, errors enumerated), or `INTERNAL_ERROR`
(exit 2, a defect in the validator, traceback printed). Malformed data must never escape
as a Python exception, so a broken corpus cannot manufacture an apparent tooling outage
in place of the verdict it has earned. Validation is staged — SHAPE, REFERENCE, IDENTITY,
GRAPH, admissibility, effective verdict — and **invalid objects may be described but may
not participate**: a row failing SHAPE never reaches the dependency graph, and a receipt
that cannot be typed binds nothing. A structurally invalid corpus licenses **no**
distribution; counts over parsed survivors are reported as `diagnostic_partial` under
`status: NOT_LICENSED`, never as the corpus's verdict.

**Artifact identity is a projection of tracked source, not a hash of `dist/`.** The
deployable set is declared once in `deploy.paths`, read by `deploy.sh` and by the
validator, so the shipped set and the hashed set cannot drift. Two clean checkouts of
one commit produce the same identity **without building anything**; a stray
`dist/.DS_Store` cannot change it, and deleting `dist/` leaves it computable. Paths are
hashed beside their bytes, so moving a file is a different artifact. No commit id, dirty
flag, or timestamp enters it: git says where bytes came from, artifact identity says
which bytes constitute the candidate. `./verify.sh` is therefore **read-only** — it no
longer runs `./deploy.sh`; a test builds into a temp directory instead (`DIST=` override).

**Release policy consumes effective verdicts; the validator never reads policy.** The
validator says what a verdict *is*; `vaic/release-dispositions.v0.json` records what the
owner has *decided*, and a disposition never changes a verdict. Every obligation whose
**effective** verdict is `FAIL` needs an obligation-keyed disposition, and every `FAIL`
recorded in the evidence ledger must be named even when its binding has expired —
documentation may explain a failure differently, but may not make it disappear. A
`NOT_EVALUATED` is **not** folded into either rule: missing evidence and a tested defect
may both block release, but under different clauses.

Zero external requests, ever. The homepage CSP forbids inline `<script>`
(`script-src 'self'`); all homepage JS is in external modules. No node — verify JS with
`jsc`: `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`.
A ReferenceError on a browser global is a PASS for a parse check; SyntaxError is a fail.
Pure logic is guarded so it loads under jsc; DOM wiring is behind `typeof document`.
Chrome 151 is installed; browser observations are driven over CDP (headless, an
`Emulation.setDeviceMetricsOverride` viewport, `./generate-integrity.sh` first or SRI
blocks every module).

After changing any served file (anything in `deploy.paths`, HTML included — the build
identity is the served-artifact manifest), re-run `./generate-integrity.sh` (SRI + the
`build-hash` meta + the worker cache name), then `python3 tools/vaic_restamp.py` (re-stamps
the VAIC candidate, appends the automated-set receipts; existing receipts are never edited).

The facts the pages print — the sealed-records count, SCHEDULE 1 and the sheet-1 figures
on `index.html`, the validation figures on `pages/brief.html` — are projections of
`js/manifest.js`: marked elements (`data-m="name"`) that `python3 tools/project-manifest.py`
rewrites from `CytherManifest.project`, and that CL-02 reads back at runtime together with
every `[data-checksum]` site. After a manifest edit, run the projector before the
integrity step; `tools/test-projection.py` fails on a stale page, an unknown name, or an
identifier that is not printed. Sheet 7 discloses every VAIC obligation — what the set
owes and who may establish it, never a receipt or verdict, because a receipt for a build
cannot be inside that build — projected from `vaic/cytherai-obligations.v0.json` by
`python3 tools/project-obligations.py` after any obligation edit.

The architecture and change-impact guide is `docs/architecture.md`.

## Architecture — the drawing set

The homepage is an engineering drawing set: seven sheets inside one border — the border
is the deployment boundary; nothing drawn crosses it — each carrying zone strips, a notes
block, and a title block: **DRAWN FROM** the public manifest (the state checksum, a
`[data-checksum]` site), **CHECKED BY** the standing claims (`6 CL · 5 DS · n/11`),
**REV · EPOCH · DATE**, **SHEET n / 7**, and **APPROVED** — a seal derived from the
disclosed state (`dsinOrbit(CANON)`), not a logo. Sheets: 1 THE STATEMENT (the plain
sentence, the 0.00% beside its conditions, FIG. 1) · 2 THE SYSTEM (section through the
boundary, refusals by class) · 3 MEASUREMENT (SCHEDULE 1, projected) · 4 WHAT RUNS WHERE
(the wall section, CL-01 live) · 5 ACCESS (three paths) · 6 THE RECORD (seal, claims,
revisions, not claimed) · 7 OBLIGATIONS · GENERAL NOTES — the authority layer: obligations
first, chain of record second, normative general notes last; it is allowed to be denser
and longer than the other sheets because its function is different.

**FIG. 1** streams `CytherInstrument.biEngine(2)` — the boundary engine of the record, no
copy — at 5 proposals per frame: a faint construction field where each refused proposal
appears at the position it was judged from with a witness at the offending relation, and
one inked object, the LARGEST program the run admits (`PRG-446DF7E6`), stated by identity
the instant the kernel speaks and drawn in over a ~500 ms resolution. After the run
settles, one edge (the longest with explicit neighbours) becomes adjustable; every
position is a proposal judged by `CytherInstrument.judge`, the receipt names the first
refused relation, only an admitted candidate can be accepted, and the accepted program
is carried through sheets 2–6 as *this browser's demonstration*, never a manifest fact.
Visual language, fixed: cool blue-grey = proposal, blue = candidate, dotted/marked =
refused, black = admitted, ghost = superseded. `tools/test-drawing-set.js` pins the
object, the edge and its limits (−3 admitted · −4 ARG RANGE · +2 CROSSES).

**General Note 1, printed on Sheet 7:** *The surface states only what the record can
support. Conditions and sources travel with every claim. Nothing is stated as established
that has not been checked.*

**`index.html`** — inline `<style>` only; loads four modules `defer` with SRI, in order:

| Module | `window.*` | Role |
|---|---|---|
| `js/manifest.js` | `CytherManifest` | public manifest + deterministic derivation (fnv, dsin, admit, dsinOrbit, legibility, checksum, project) |
| `js/instrument.js` | `CytherInstrument` | the boundary: `biEngine` (seeded stream, positioned events), `judge` (a proposed program against boundary then kernel), `audit`, `lastAudit`; pure, DOM-free |
| `js/claims.js` | `CytherClaims` | the six canonical predicates CL-01 · 02 · 03 · 05 · 06b · 07 and the registry (`CLAIMS`, `setClaim`, `recomputeClaims`, `renderClaims` → `#claimRows`, `#claimsFooter`, `[data-claims-count]`); a page pushes its own predicates before the first render |
| `js/drawing-set.js` | `CytherDrawingSet` | the set: frame/title block/seal on every sheet, projections of the manifest, FIG. 1, the adjustable edge, the carried object, DS-01..05 (seal serial ≡ state, ink and quietest ink ≥ 4.5:1 on paper read from the tokens, seal ≡ derivation pixel for pixel, the drawing is an admitted program), CL-03/CL-05 setting, `sw.js` registration; pure geometry (`walk`, `extent`, `progId`, `pickEdge`, `candidateFor`) exported for the verifier |

Claim identifiers are part of the claim: a canonical `CL` number is used only where the
predicate is the canonical one; a predicate over this set is a `DS`. The world predicates
CL-04, CL-06, CL-06c, CL-08 left with the world and no page carries a row for them.

**Subpages** (`contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script).
Their ink law (every ink ≥ 4.5:1 on every ground) is `tools/test-site.py`.

**Infra:** `sw.js` (cache-first; install fetches past the HTTP cache and commits one build
or nothing; `CACHE` carries the build hash stamped by `generate-integrity.sh`),
`manifest.webmanifest`, `generate-integrity.sh` (SRI over the requested resources +
build-hash over every `deploy.paths` byte), `deploy.sh` (publish allowlist → `dist/`;
headers contract in `docs/deploy.md`). **Developer page:** `pages/runner.html` loads
`engine/trajectory-engine.js` and its `.test.js` — linked from no page, not in
`deploy.paths`, not precached, unstamped.

**instrument-v1** — the substrate / disclosure-engine homepage (four plate-developed
exposure tiles, derived camera, descent strata, reader ledger, reading law, fork, minimap,
poster, Worker) is retired whole to `backup/instrument-v1/`: a verbatim snapshot of
commit `bf82377` with every verifier that established its laws and its own `verify.sh`.
Its README indexes it. The receipts that cite its files resolve through it.

## Register rules (grep-enforced)

`var(--brass)`/gold/warm-paper tokens and the document register (`DOC-2026-001`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (the retired ledger was a `READING SELF-REPORT`), `Append-only`,
`1e-12`. Sheet 6's notes must keep: *"The page renders the commitment; it does not
notarize it."* PROVISIONAL manifest values (epoch history, counts, commitment preimage)
live only in `js/manifest.js`; replacing them is a data-only edit. The revisions list
prints `COMMITMENTS[0].status` verbatim — the page never asserts a status of its own. `PREIMAGE SEALED`
may be set only when the preimage is in the owner's custody alone and appears in no
history intended for public release; the shipped value is `PREIMAGE PUBLIC · DEMONSTRATION`
because `newC3/epoch04-preimage.txt` hashes to the published digest.

## Provenance

- **`PRODUCTION_PLAN.md`** is the build spec of instrument-v1 (phases P1–P9), superseded
  by the drawing set on 2026-09-16 and kept as its record; the drawing set's design record
  is `backup/drawing-set-demo.html` (the approved demo) and this file.
- **`newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `instrument-v1/` (the substrate homepage,
  whole, with its verifiers — see its README), `graphite-v2/` (old engine-backed homepage,
  with the three modules only it loaded), `dossier-v3/` (old shared CSS + the dossier IIFE
  modules), `trajectory-engine/` (the engine's `-v2.js` dev source, its prototypes, and the
  v-next design map), `drawing-set-demo.html` (the demo the drawing set was approved from).
  Supersede, never erase: retire into `backup/`, do not delete.
