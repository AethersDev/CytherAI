# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no framework, package manager, bundler, or linter. The
zero-dependency verification entrypoint is `./verify.sh`; it runs the jsc module and
logic regressions, the Python projection/integration tests, and the corpus validator.
Browser-only checks (layout, service worker, the studio as rendered, the settled halt)
remain in `docs/deploy.md`; the retired front doors' laws run against their snapshots,
`backup/instrument-v1/verify.sh` and `backup/drawing-set-v1/verify.sh`.
Serve with any static file server: `python3 -m http.server 8000` from the repo root.

One check at a time: a jsc regression takes the modules it needs before it, in load
order, exactly as `verify.sh` lists them (`$JSC js/manifest.js js/instrument.js
tools/test-boundary.js`). `tools/test-site.py` and `tools/test-vaic.py` are `unittest`
(`python3 tools/test-vaic.py VaicCorpusTests.test_<name>`); the other `tools/test-*.py`
are plain scripts. All Python tooling is stdlib `python3`; `.venv` holds only
`websocket-client`, for driving Chrome over CDP. `CANONICAL_REF` is local `master`,
which tracks `origin/main`; there is no local `main`.

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

**A corpus transition is a successor, never a subtraction.** Each corpus supersedes the
one before (`supersedes`: `v1` → `v0`, re-bound to the drawing set; `v2` → `v1`, re-bound
to THE UNHAPPENED), carries every receipt of its predecessor verbatim, and records on every
row a `transition`: **CARRIED_FORWARD** — the requirement is unchanged, its surface and
verifier re-bound to the current front door (`successor_surface`, `rebound_fields`, and
`version` + 1 when a field moved) — or **SUPERSEDED** — the mechanism it governed retired
(`retired_mechanism`, `preserved_in`). A superseded
obligation's effective verdict is `SUPERSEDED`: neither PASS, FAIL nor NOT_EVALUATED; it
enters no projection or release judgment; a receipt bound to the current build on it is
`INVALID` (the build does not ship its mechanism); its observations stand. Supersession
is not satisfaction, failure, or revocation. The guards walk every lineage (`LINEAGE`),
so a receipt admitted into `v0` or `v1` on master must remain, unchanged, in the live `v2`.

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
lives whole in a declared snapshot (`ARCHIVES`: `backup/instrument-v1/`,
`backup/drawing-set-v1/`), a
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

The figures the pages print — the CytherCAD invalid rate and the DeepCAD baseline it is
stated against on `index.html`, the validation figures on `pages/brief.html` — are
projections of `js/manifest.js`: marked elements (`data-m="name"`) that
`python3 tools/project-manifest.py` rewrites from `CytherManifest.project`, and that the
front door reads back at runtime (a stale mark is outlined and logged). After a manifest
edit, run the projector before the integrity step; `tools/test-projection.py` fails on a
stale page, an unknown name, an identifier the brief does not print, or any mark on the
front door other than those two.

The architecture and change-impact guide is `docs/architecture.md`.

## Architecture — THE UNHAPPENED

The homepage is a pane of glass over an empty floor, rendered in WebGL2. Nothing exists when
the page begins. Every bead is one proposed operation — a token offered to extend a program —
judged in the browser by `CytherInstrument.biEngine`, the boundary engine of the record, as it
strikes the pane. Its law: **Black may propose. White may exist. Cobalt must explain why.**

- **Refused** — the bead ceases at the pane; a cobalt ghost flashes where its attempt was
  assembling and the pane keeps a Cyther Trace (TRACE-1) drawn from the receipt.
- **Accepted** — the token crosses, still black, into a candidate profile under the pane:
  visible and causally absent. No shadow, no consequence. In scene 3 (*Only the valid
  crosses. An accepted step is not yet an admitted program.*) the rain thins, one proposer
  (`FEATURE`) assembles at a fixed `PLACE` the camera watches, the pane's memory recedes to a
  third (`uMemory`; nothing is erased), and its next accepted step is followed: carried from
  where it struck to the vertex it adds, its segment joining only on arrival. The follow is
  tied to the engine's attempt; any emphasis follows a real event, never precedes one.
- **Admitted** — only a program the kernel admits becomes real: its profile lands on the floor
  as a hard shadow (the licence), held 0.4 s, and porcelain extrudes straight up out of it
  (0.9 s). Each admission takes the next perimeter bay around the room, decided when it is
  admitted; the walls of scene 8 are the same solids extruded further, never moved. A short
  visit leaves a short room — gaps are left, never filled.

The one causal light is vertical and never moves, so a solid's shadow is its profile at any
height; a fill follows the cursor and casts nothing. Cobalt is evidence, composited after the
tone map: never lit, blurred, refracted or reflected. Ten scenes (`SC`, one `[data-k]` section
each, counted by `tools/test-site.py`) carry the copy; scenes 4–7 are the four systems, each
with its claim and the condition it holds under. Hovering or tapping a trace reads its receipt;
hovering or tapping a solid lifts it off its licence and names it (`ADMITTED · id · ops ·
proposal n of seed`). The studio is focusable (`role="application"`, last in tab order): ← →
read the refusals newest first, ↑ ↓ the programs admitted, Esc clears; every receipt goes
through `#receipt`, a status region, so it is announced. A press that does not travel reads;
only a drag proposes. Keyboard focus inside a section scrolls it to its centre, where its copy
is fully visible.
A press-and-drag seeds the visitor's own proposer; its first refusal is carried to the end,
revealed by the light, and replayable from `#trace=SEED.INDEX.HASH` (local, never sent; a
fragment that does not reproduce on this build is refused, `#unsent`). **When nothing is
changing, nothing renders:** `settled()` halts the frame loop and `#still` says so; scroll,
resize, hover or a gesture `wake()`s it. A page left alone is not watched: after `IDLE` (two
minutes) without input the rain stops and the page rests the same way (`resting`); any input
brings it back. A long active session is bounded too: traces cap at 8,000, ghosts at 40; the
6,000-cell prism cap holds about 565 programs (about an hour of continuous heavy rain). **Startup never blocks:** the nine programs compile
and link on the driver's threads (`KHR_parallel_shader_compile`) and are queried only when done
(`R.ready()`); if the studio is not ready within `BUDGET` (600 ms) the opening is given up and
the copy shows at once, and the canvas stays invisible until its first frame (`.lit`). If the
scripts never take over, the opening's hidden copy unveils itself after 6 s (CSS). **A device
that cannot carry the studio gets the plain page:** the governor judges frames per second,
steps resolution down to 0.42, and if the median frame is still over 90 ms twice, `starve()`
releases the context and the cover stands in. Without WebGL2 and a float colour buffer, the
`.no-gl` cover stands in, captioned with the three relations (black: proposed or accepted, no
consequence · cobalt: refused, why · white: admitted, it stands), and the copy follows
the scroll one frame at a time. Short viewports (≤ 540 px tall: 200% zoom of a laptop, a
phone on its side) compact the type so every section's copy fits its pinned page; on a phone the
copy keeps clear of the HUD at its measured height (`--hud`) and pins to the small viewport
(`100svh`). Headings carry their system's name for assistive technology (`.sr`). There is no
sound. Reduced motion skips the opening, moves the camera without easing and thins the rain.

**`index.html`** — inline `<style>` only, type from `adii/fonts/` (shared, precached); loads
four modules `defer` with SRI, in order:

| Module | `window.*` | Role |
|---|---|---|
| `js/manifest.js` | `CytherManifest` | the public manifest: `project` (the `data-m` facts) and `fnv`; `MANIFEST`, `VALIDATION`, `CANON`, `ADMISSION_NONCE`, `CHECKSUM` for the verifiers and the derived assets |
| `js/instrument.js` | `CytherInstrument` | the boundary: `biEngine` (seeded stream, positioned events), `judge` (a proposed program against boundary then kernel), `audit`; pure, DOM-free |
| `js/trace.js` | `CytherTrace` | TRACE-1, the Cyther Trace: one drawing of a receipt (`code` → `GLSL` for the studio, `svg` for the carried receipt); pinned by `tools/test-trace.js` |
| `js/unhappened.js` | — | the studio: the world, the bays, the GPU passes, the story, the pointer, the readout, the ending, `settled`/`wake`, `sw.js` registration |

The HUD's note states the demonstration's limit: the engine is a toy grammar of rectilinear
profiles, not CytherCAD itself. The page carries no claim registry, seal, sheet, title block
or obligations disclosure; the VAIC corpus is the record (`vaic/`).

**Subpages** (`contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script).
Their ink law (every ink ≥ 4.5:1 on every ground) is `tools/test-site.py`.

**Project pages** (`adii/`, `awc-os/`) ship only their reviewed publication set, pinned in
`REVIEWED_PUBLICATION` (`tools/test-site.py`): a new file is served once it is reviewed and
named there. `adii/` keeps every URL its first publication served, the CVs included;
`awc-os/live/` redirects to an ephemeral tunnel and never ships. Both pages are stamped like
the subpages; `sw.js` sends media, documents and range requests to the network uncached.

**Infra:** `sw.js` (cache-first; install fetches past the HTTP cache and commits one build
or nothing; `CACHE` carries the build hash stamped by `generate-integrity.sh`; a new build's
worker **waits** and never takes over a page that may still be loading: Safari checks for the
update at the navigation itself, and a worker that skipped waiting answered a returning
reader's previous-build page with this build's modules, which then failed SRI. A page whose
modules have all run lets the waiting worker in (`take-over`), so the next load is new),
`manifest.webmanifest`, `generate-integrity.sh` (SRI over the requested resources +
build-hash over every `deploy.paths` byte), `deploy.sh` (allowlist → `dist/`),
`publish.sh` (`dist/` → the `gh-pages` branch GitHub Pages serves at `cytherai.com`;
admitted states only; headers contract in `docs/deploy.md` §1, and Pages' limits, accepted by the owner on
2026-10-04 and registered in `vaic/release-dispositions.v0.json`, in §7; HTTPS enforcement is not one of them). **Developer page:** `pages/runner.html` loads
`engine/trajectory-engine.js` and its `.test.js` — linked from no page, not in
`deploy.paths`, not precached, unstamped.

**Retired front doors** live whole in `backup/`, each a verbatim snapshot with every verifier
that established its laws, its own `verify.sh` and a README; the receipts that cite their
files resolve through them. **instrument-v1** (`backup/instrument-v1/`, commit `bf82377`) —
the substrate / disclosure-engine homepage. **drawing-set-v1** (`backup/drawing-set-v1/`,
commit `99b167a`) — the seven-sheet engineering drawing set, FIG. 1, the eleven standing
claims (`6 CL · 5 DS`) and Sheet 7, superseded on 2026-10-04 **as presentation, preserved as
historical record**: its claims stay attributable to it, and nothing of its design (CSS,
components, layout, terminology, badges, seal, sheet numbering) is imported into the front
door. Do not build a `/record` page from it unless asked.

## Register rules (grep-enforced)

`var(--brass)`/gold/warm-paper tokens and the document register (`DOC-2026-001`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (the retired ledger was a `READING SELF-REPORT`), `Append-only`,
`1e-12`. A front-door claim ships only as a shipped source states it, with its condition
beside it and a link to that source (`pages/brief.html`, `adii/`, `awc-os/`); a claim no
shipped source supports is dropped, not softened. Figures are projections (`data-m`), never
literals.

## Provenance

- **`PRODUCTION_PLAN.md`** is the build spec of instrument-v1 (phases P1–P9), superseded
  by the drawing set on 2026-09-16 and kept as its record; the drawing set's design record
  is `backup/drawing-set-demo.html` (the approved demo) and `git show 99b167a:CLAUDE.md`.
- **`prototype/`** holds the homepage design studies (`crossing/`, `glass/`, `section/`,
  `research/`) and THE UNHAPPENED's versions: `unhappened/` (v1, TRACE-1 and the carried
  receipt), `unhappened-2/` (v2, only what was admitted casts a
  shadow), `unhappened-4/` (v4, the solid rises from its own shadow — promoted to production
  on 2026-10-04, minus its sound) and `compare/` (the side-by-side harness). Not served.
- **`newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `instrument-v1/` (the substrate homepage,
  whole, with its verifiers — see its README), `graphite-v2/` (old engine-backed homepage,
  with the three modules only it loaded), `dossier-v3/` (old shared CSS + the dossier IIFE
  modules), `trajectory-engine/` (the engine's `-v2.js` dev source, its prototypes, and the
  v-next design map), `drawing-set-v1/` (the drawing set, whole, with its verifiers — see its
  README), `drawing-set-demo.html` (the demo the drawing set was approved from, loading that
  snapshot's modules), `project-pages/` (the ADII and AWC-OS pages as first published,
  before curation).
  Supersede, never erase: retire into `backup/`, do not delete.
