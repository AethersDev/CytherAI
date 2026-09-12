# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no framework, package manager, bundler, or linter. The
zero-dependency verification entrypoint is `./verify.sh`; it runs jsc module and
logic regressions, Python integration/motion tests, and the deployment build.
Browser-only engine, layout, and service-worker checks remain in `docs/deploy.md`.
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
cannot cite it. Identities stay separated by role (record, kernel, grammar, policy,
artifact, verification) and are never collapsed into one digest, so a receipt states
exactly what moved. An observation binds both the candidate and the verifier that
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
(`script-src 'self'`); all homepage JS is in external modules. No node, no Chrome on
this machine — verify JS with `jsc`:
`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`.
A ReferenceError on a browser global is a PASS for a parse check; SyntaxError is a fail.
Pure logic is guarded so it loads under jsc; DOM wiring is behind `typeof document`.

After changing any served file (anything in `deploy.paths`, HTML included — the build
identity is the served-artifact manifest), re-run `./generate-integrity.sh` (SRI + the
`build-hash` meta + the worker cache name), then `python3 tools/vaic_restamp.py` (re-stamps
the VAIC candidate, appends the automated-set receipts; existing receipts are never edited).

The facts the pages print — the strata's counts and the validation figures on
`index.html` and `pages/brief.html` — are projections of `js/manifest.js`: marked
elements (`data-m="name"`) that `python3 tools/project-manifest.py` rewrites from
`CytherManifest.project`, and that CL-02 reads back at runtime. After a manifest edit,
run the projector before the integrity step; `tools/test-projection.py` fails on a
stale page, an unknown name, or an identifier that is not printed. The floor also
discloses every VAIC obligation — what the page owes and who may establish it, never a
receipt or verdict, because a receipt for a build cannot be inside that build —
projected from `vaic/cytherai-obligations.v0.json` by `python3 tools/project-obligations.py`
after any obligation edit.

The architecture and change-impact guide is `docs/architecture.md`.

## Architecture — the substrate / disclosure engine

The homepage is a disclosure engine. One derived object — the canonical mark, a Clifford
orbit whose four parameters are digests of the public manifest — **is the world**: four
pre-rendered exposure tiles form the background, and scroll moves a derived camera from
far-field into the filament core (transform + opacity only; zero substrate rasters per
frame). Content descends by epistemic distance. Standing claims execute as predicates
against the page itself; the reader keeps a local, owner-erasable self-report ledger.
A separate **reading exposure** governs the record (P9): bistable reading ink with
hysteresis (`CytherSubstrate.READING`, CL-06/CL-06c check it against the AMBIENT ground at
every depth — the plate is not in that model; the composited ground is CY-SEM-003, a
browser obligation, because the page cannot read its own composited pixels), phase-changed
panel materials, density-conditioned legibility envelopes (`.env`, fed by the retained
plate fields), corridor placement from the density atlas, rest-state world amplitude,
and a reader optics control (WORLD · BALANCED · READ, session-local).

**The law, printed at the floor:** *The surface states. Depth conditions. Records
substantiate. Boundaries govern. The reader is a record. Nothing is stated that is not checked.*

**`index.html`** — inline `<style>` only; loads six modules `defer` with SRI, in order:

| Module | `window.*` | Role |
|---|---|---|
| `js/manifest.js` | `CytherManifest` | public manifest + deterministic derivation (fnv, dsin/dcos/datan2, admit, dsinOrbit, legibility, checksum) — the whole world runs on these, not on native transcendentals |
| `js/substrate.js` | `CytherSubstrate` | the world: plate-developed exposure tiles (angular-lobe density, log tonemap; development is a deterministic fixed-step sequence streamed as genuine prefixes — cadence chooses the prefix shown, never its content; REDEVELOP replays the current world and the floor's development receipt prints the four terminal checkpoint names and the comparison), dsin-orbit camera anchors, `observe`, fork; minimap keeps the point-cloud measurement view, is an observation control (a slider: a point in the form names the depth whose camera comes nearest it — `depthFor`, continuous from the current depth — and the keyboard walks the descent; both resolve to document scroll only) and previews the requested orbit while a fork is being formed (`FORK PREVIEW`; the plates stay the prior world until the terminal state) |
| `js/claims.js` | `CytherClaims` | CL-01…CL-08 + CL-06b/CL-06c predicates; `CLAIMS n/10 HOLDING` |
| `js/ledger.js` | `CytherLedger` | reader self-report ledger, intent-adaptive CTA |
| `js/instrument.js` | `CytherInstrument` | hostile-proposer boundary instrument (feeds CL-05) |
| `js/site.js` | *(none)* | glue: one sleeping rAF loop, weight-field/waves, scroll→observe, hold-to-cross, floor renders, CL-03 verifier |

`js/develop-worker.js` is not a page module: a dedicated Worker (transport only) that
runs `CytherSubstrate.developServer` — the kernel's protocol — off the main thread;
`substrate.js` keeps the presentation law and runs the same server inline where a
Worker cannot be constructed. Execution location changes, the trajectory does not.

**Subpages** (`contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script).

The promoted terminal exposure `assets/plate/surface-terminal.png` IS plate 0's terminal
raster at a 1200×600 frame, produced offline by the same kernel
(`tools/promote-poster.js` → `tools/promote-poster.py`, verified by `tools/test-poster.py`:
`decode(P) == R_N` pixel for pixel). It is the first paint inside the aspect window
[1, 2] and `noscript`'s only mark, and it is removed for good when plate 0 reaches D_N —
a fork or a redevelopment is a different world and the poster cannot speak for it.

**Infra:** `sw.js` (cache-first; `CACHE` name carries the build hash, stamped by
`generate-integrity.sh`, so each build installs atomically), `manifest.webmanifest`,
`generate-integrity.sh` (SRI + build-hash), `deploy.sh` (publish allowlist → `dist/`;
headers contract in `docs/deploy.md`). **Engine stack:** `engine/trajectory-engine.js`
and its `.test.js` are loaded only by `pages/runner.html`, a developer page: linked
from no page, not in `deploy.paths`, not precached, unstamped — run it from the local
static server. The homepage does not load them. The three modules only the retired graphite homepage loaded (`content/record.js`,
`profiles/disclosure.js`, `js/console.js`) are archived beside it under
`backup/graphite-v2/`, and the engine's `-v2.js` dev source, prototypes and v-next design
map under `backup/trajectory-engine/` — none is served, precached, or fingerprinted.

## Register rules (grep-enforced)

`var(--brass)`/gold/warm-paper tokens and the document register (`DOC-2026-001`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (it is a `READING SELF-REPORT`), `Append-only` (the ledger is
owner-erasable), `1e-12` (the compositing bound is `< 0.05 px · transform quantization`).
The commitment chip must keep: *"The page renders the commitment; it does not notarize it."*
PROVISIONAL manifest values (epoch history, counts, commitment preimage) live only in
`js/manifest.js`; replacing them is a data-only edit. The floor's commitment chip prints
`COMMITMENTS[0].status` verbatim — it never asserts a status of its own. `PREIMAGE SEALED`
may be set only when the preimage is in the owner's custody alone and appears in no
history intended for public release; the shipped value is `PREIMAGE PUBLIC · DEMONSTRATION`
because `newC3/epoch04-preimage.txt` hashes to the published digest.

## Provenance

- **`PRODUCTION_PLAN.md`** is the authoritative build spec (supersedes any older design
  spec). Phases P1–P7, verification checklist §9.
- **`newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `graphite-v2/` (old engine-backed homepage,
  with the three modules only it loaded), `dossier-v3/` (old shared CSS + the dossier IIFE
  modules), `trajectory-engine/` (the engine's `-v2.js` dev source, its prototypes, and the
  v-next design map). Supersede, never erase: retire into `backup/`, do not delete.
