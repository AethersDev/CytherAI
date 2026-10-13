# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no framework, package manager, bundler, or linter. The
zero-dependency verification entrypoint is `./verify.sh`; it runs the jsc module and
logic regressions, the Python projection/integration tests, and the corpus validator.
Browser-only checks (layout, service worker, reading ink over the film, the settled state)
remain in `docs/deploy.md`; the retired front doors' laws run against their snapshots,
`backup/instrument-v1/verify.sh`, `backup/drawing-set-v1/verify.sh` and
`backup/unhappened-v1/verify.sh`.
Serve with any static file server: `python3 -m http.server 8000` from the repo root — but
`http.server` answers no byte ranges, so the films cannot seek there; a browser observation
that seeks a film needs a server that answers `Range` (GitHub Pages does).

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
to THE UNHAPPENED; `v3` → `v2`, re-bound to the film), carries every receipt of its predecessor
verbatim, and records on every
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

## Architecture — the film

The homepage is a twelve-second film, rendered offline in Blender (Cycles on the Apple GPU,
`tools/render-film.py`), silent, with its sentences as HTML over it: *AI can change
everything.* · *Not everything should be allowed to change.* · *CytherAI builds the part of AI
that decides what is allowed to happen.* · then the statement *Let AI change things. Keep
control of what changes.* with **The three systems ↓** and **Talk to us ↗**. One continuous
shot: an exact structure of glass fins, ceramic plates and machined frames around a warm
current rebuilds itself; a wave of change runs to a hairline plane; one pale slab stops a
fraction short of it and stays while the current runs on through the plane; a fitting group
passes, then the rest settle and pass; the camera emerges to a still composition, which stays
as the setting of what follows. Phones get a separately composed vertical film (the structure
as a tower). The line *A conceptual visualization. It measures no product.* sits under the
film: its sentences are positioning, and no motion on the page claims to correspond to a
system event (CY-TEMP-002 was superseded with THE UNHAPPENED).

Below it, over the final composition: *One principle. Three systems.* and *The model
proposes. The system decides.* Then ADII, AWC-OS and CytherCAD, each a six-second sequence in
the film's materials (`tools/render-systems.py`), a headline, two sentences a shipped page
states, its condition, and one route into the evidence (`adii/`, `awc-os/`,
`pages/brief.html`); CytherCAD's two figures are the front door's only `data-m` marks. The
close is *Tell us what must never happen.* with the contact address.

The film plays once, muted, and never restarts on its own; Replay plays it again. Reduced
motion, a refused or failed play, a film not started within `GUARD` (3 s), or one that stops
advancing for `STALL` (2 s) while the page is visible shows the final composition and the whole
statement (`still()`); a film stopped short of its end drops its source, so its poster — the
same final frame — stands, nothing more downloads, and a late download cannot pull the visitor
back. Each sequence plays once from its first frame when half of it is in view and holds its
last frame, which is also its poster. iOS Safari downloads a clip only when asked to play it and
buffers all of it before the first frame moves, so once the film is still the three are warmed
in turn (started muted off screen, paused as they play) and arrive ready; without that, a
phone sat on the last frame for seconds, as if frozen (2026-10-13, seen by the owner). A slow
start is never a failure; refused, or stalled for `STALL` after it has moved, a sequence rests
on its poster and tries again the next time it comes into view; scrolling past one before it
begins is not a failure. Reduced motion shows the posters. The social card (`assets/og/og-card.png`, on every
page that names one) is the film's last frame with its statement (`tools/render-og-film.py`;
the orbit plate it replaced is `backup/og-card-v1/`). **When nothing is changing, nothing runs:** once the film
and every sequence in view have ended, the page requests no frame, plays nothing and fires no
timer (CY-TEMP-001). If the script never runs, the statement unveils itself after 6 s
(`.no-js`, CSS). Reading ink over the film holds ≥ 4.5:1 at glyph support (CY-SEM-003) by
localized darkening only: under the header, along the film's lower edge, behind Replay,
behind each caption and the statement, and behind the principle. There is no sound. The
statement is the page's `h1` and is in the accessibility tree from the first moment (only its
links wait for it, so focus never lands on something invisible); a screen-reader-only
paragraph (`.sr`) is the silent film's text alternative and carries its three sentences.

**The mark is the Cyther Seal** (adopted 2026-10-13 from the owner's identity draft): a path
computed from SHA-256 of the word `CytherAI` — a walk on a 6×6 grid that admits a move only
inside the grid on an unused cell (77 proposals, 29 admitted, 48 refused). `tools/render-seal.py`
computes it, writes the favicon and app icons, and prints the inline seal for a page; below 48
px every seal is pixel-fitted (u = ⌊size/13⌋ px, so its edges fall on whole pixels). The front
door uses the primary lockup, the seal left of the wordmark, ink `#ECE7DC` with its path in
ground; the cold-paper subpages put the paper-ink seal before `CYTHERAI`; the social card
carries the same lockup. Warm is never the seal's colour. Never redraw, rotate or mirror the
path: `tools/test-site.py` requires every inline seal to equal the computed one. The retired
marks are `backup/icon-v1/` (the orbit filament) and `backup/og-card-v1/` (the orbit plate).

**`index.html`** — a CSP with no inline script or style; type from `adii/fonts/` (shared,
precached); `css/film.css` and one script, `js/film.js` (`defer`), both with SRI.
`js/film.js` reads no module and publishes nothing: the film, its cues, the still state, the
sequences' IntersectionObserver, and `sw.js` registration (it lets a waiting worker in with
`take-over`); its DOM wiring sits behind `typeof document`, so it loads under jsc. The media
live in `film/`: two films with their final-frame posters, three sequences with theirs;
`tools/test-site.py` holds every file the page names to `deploy.paths`, and back.
`js/manifest.js` (`CytherManifest`: `fnv` for THE EXCEPTION; `project` and the record for the
verifiers and derived assets) and `js/instrument.js` (`CytherInstrument`: `judge` for THE
EXCEPTION; `biEngine` and `audit` for the verifiers) are no longer loaded by the front door.

**Subpages** (`contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script).
Their ink law (every ink ≥ 4.5:1 on every ground) is `tools/test-site.py`.

**The experiment** (`exception/`, published beside the front door on 2026-10-04; since the
film became the front door on 2026-10-12 no homepage link points to it) is THE EXCEPTION: two
decisions that look right.
*Draw* releases a drawing to the real boundary engine (`CytherInstrument.judge`, so `judge` is
a production symbol): refused at operation 6 (CROSSES), the never-judged rest drawn as a
labelled preview, then a valid alternative admitted by the kernel (`PRG-9FD9BC52`). *Correct*
holds a number against evidence and is an illustration of ADII with constructed figures, which
the page says. Every claim on it stays within what its source establishes (the grammar rule,
not physical strength). It shipped without an unfamiliar-reader test; that test stays optional,
and its result, when run, is recorded in `docs/deploy.md` §5h. Its files are pinned in
`REVIEWED_PUBLICATION`; `exception/exception.js` is SRI'd like the homepage modules.

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
script has run lets the waiting worker in (`take-over`), so the next load is new),
`manifest.webmanifest`, `generate-integrity.sh` (SRI over the requested resources +
build-hash over every `deploy.paths` byte), `deploy.sh` (allowlist → `dist/`),
`publish.sh` (`dist/` → the `gh-pages` branch GitHub Pages serves at `cytherai.com`;
admitted states only; headers contract in `docs/deploy.md` §1, and Pages' limits, accepted by the owner on
2026-10-04 and registered in `vaic/release-dispositions.v0.json`, in §7; HTTPS enforcement is not one of them). **Developer page:** `pages/runner.html` loads
`engine/trajectory-engine.js` and its `.test.js` — linked from no page, not in
`deploy.paths`, not precached, unstamped.

**Retired front doors** live whole in `backup/`, each a verbatim snapshot with every verifier
that established its laws, its own `verify.sh` and a README; the receipts that cite their
files resolve through them. **instrument-v1** (`backup/instrument-v1/`, commit `9d6cbdb`) —
the substrate / disclosure-engine homepage. **drawing-set-v1** (`backup/drawing-set-v1/`,
commit `c921f00`) — the seven-sheet engineering drawing set, FIG. 1, the eleven standing
claims (`6 CL · 5 DS`) and Sheet 7, superseded on 2026-10-04 **as presentation, preserved as
historical record**: its claims stay attributable to it, and nothing of its design (CSS,
components, layout, terminology, badges, seal, sheet numbering) is imported into the front
door. Do not build a `/record` page from it unless asked. **unhappened-v1**
(`backup/unhappened-v1/`, commit `011ffd0`) — THE UNHAPPENED: the pane, the beads, TRACE-1,
the shadows and porcelain, the ten scenes; superseded on 2026-10-12 the same way, as
presentation, preserved as record, nothing of its design carried.

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
  is `backup/drawing-set-demo.html` (the approved demo) and `git show c921f00:CLAUDE.md`.
- **THE EXCEPTION** began as `prototype/exception/` on the `exception` branch and moved to
  `exception/` when it was published (2026-10-04).
- **`prototype/`** holds the homepage design studies (`crossing/`, `glass/`, `section/`,
  `research/`) and THE UNHAPPENED's versions: `unhappened/` (v1, TRACE-1 and the carried
  receipt), `unhappened-2/` (v2, only what was admitted casts a
  shadow), `unhappened-4/` (v4, the solid rises from its own shadow — promoted to production
  on 2026-10-04, minus its sound, retired on 2026-10-12) and `compare/` (the side-by-side
  harness). Not served.
- **The film** was built as an untracked study (`cyther-film/`, never committed) from pasted
  directions on 2026-10-11, revised once on a reviewer's critique (the one refused slab, the
  camera holding at the refusal), then extended into the site with three systems and
  published on 2026-10-12; its render sources moved to `tools/render-film.py` and
  `tools/render-systems.py` (Blender 5.1, `blender -b -P <script> -- …`; usage in each header).
- **The history was rewritten once** (2026-10-13, at the owner's request): the `Co-Authored-By:` lines were removed
  from every commit message and `main` was force-pushed; trees, order, authors and dates are unchanged, and the old
  history is the branch `history/before-message-rewrite`. Every old → new hash is in
  `docs/history-rewrite-2026-10-13.md`; admitted records that cite old hashes resolve through it. Commit messages
  carry no attribution trailer.
- **`newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `instrument-v1/` (the substrate homepage,
  whole, with its verifiers — see its README), `graphite-v2/` (old engine-backed homepage,
  with the three modules only it loaded), `dossier-v3/` (old shared CSS + the dossier IIFE
  modules), `trajectory-engine/` (the engine's `-v2.js` dev source, its prototypes, and the
  v-next design map), `drawing-set-v1/` (the drawing set, whole, with its verifiers — see its
  README), `unhappened-v1/` (THE UNHAPPENED, whole, with its verifiers — see its README),
  `icon-v1/` and `og-card-v1/` (the derived orbit icon family and social plate, with their
  generators, replaced on 2026-10-13 by the Cyther Seal and the film's card),
  `drawing-set-demo.html` (the demo the drawing set was approved from, loading that
  snapshot's modules), `project-pages/` (the ADII and AWC-OS pages as first published,
  before curation).
  Supersede, never erase: retire into `backup/`, do not delete.
