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
`http.server` answers no byte ranges, so the films cannot seek there (and Safari plays no video
from it); a browser observation that seeks a film needs a server that answers `Range` (GitHub
Pages does, and so does the system Ruby's: `./deploy.sh && ruby -run -e httpd dist -p 8000`).

One check at a time: a jsc regression takes the modules it needs before it, in load
order, exactly as `verify.sh` lists them (`$JSC js/manifest.js js/instrument.js
tools/test-boundary.js`). `tools/test-site.py` and `tools/test-vaic.py` are `unittest`
(`python3 tools/test-vaic.py VaicCorpusTests.test_<name>`); the other `tools/test-*.py`
are plain scripts. All Python tooling is stdlib `python3`; `.venv` holds only
`websocket-client`, for driving Chrome over CDP: the committed browser probes
`tools/probe-ink.py` (CY-SEM-003) and `tools/probe-settle.py` (CY-TEMP-001), run as
`.venv/bin/python tools/probe-<name>.py dist <out-dir>`, and `tools/probe-origin.py` for the live
origin (CY-ORIGIN-001); their receipts are `EXTERNAL` and cite the ledger. `CANONICAL_REF` is local
`master`, which tracks `origin/main`; there is no local `main`. A fresh clone has no `master`, and the
guards fail rather than walk nothing: `git branch master origin/main`.

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
rather than editing an admitted one, and a `FAIL` appended after a history of `PASS` is a
regression on record — a later `PASS` a fix — never corruption: a row's `result` is the verdict
of its receipts bound to the current candidate (one current `FAIL` is never outvoted by a
current `PASS`), or, with none current, its latest observation. A receipt is identified by
(build, record, policy, verifier), an `EXTERNAL` one also by the observation it cites, so two
browsers' observations of one build are two receipts. `INVALID` is reserved for malformed data (bad digest,
unresolvable evidence pointer, cycle, schema violation, or a receipt that claims the
current build AND the current verifier while carrying another candidate's served-set or grammar
digest; a moved record or policy under an unchanged build only expires it);
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
`./verify.sh` parses every served script (each `.js` in `deploy.paths`) with jsc's `checkSyntax`, which parses
without running, so a browser global is no failure there; a SyntaxError is. The record and the engine
(`js/manifest.js`, `js/instrument.js`) run under jsc in the boundary and projection checks.
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
`python3 tools/project-manifest.py` rewrites from `CytherManifest.project` (no page reads
them back at runtime: no page loads the record). After a manifest
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

Below it, the passage (2026-10-20, from the owner's direction *The Shape of Permission*): under the visitor's scroll
the film's final composition opens into ADII's scene, twelve seconds rendered from the film's own scene
(`tools/render-passage.py`, `film/passage-*.mp4`), scrubbed by the scroll and never played. The camera moves into the
plane of the ring the refused slab never crossed, so the ring narrows to a line that stays where it stood; the
structure parts around it and leaves a run of its ceramic tiles standing, which come forward as a row of values, one
visibly wrong (the recorded run's last day). A correction arrives from the proposing side and stops a fraction short of
the line, as the refused slab did; the authorizer's check lights the one slot it may change, the validator's scan runs
the row, and only then does it cross; the wrong value steps back behind it, kept. Its words arrive at their moments at
the foot of the frame, below the scene, each on a darkness of its own: *One principle. Three systems.* · *The model
proposes. The system decides.*, then
ADII's headline at its two moments (*A number looks wrong.* · *Changing it is a separate decision.*), the two sentences
`adii/` states, its condition, and *See what this is based on →* (`adii/#run`, the recorded run). The scroll moves the
scene evenly, 2 s of it a viewport, the stage's own pace: each stretch (`.passage`, `data-t`) is as tall as its seconds,
and the words (`.say`, `data-t`: their window of the passage's seconds) fade in and out with the scroll itself, never
with a timed transition (with one on these fixed captions WebKit missed 16–24 frames a pass, without it 1–3). The owner found the first version, whose
beats held the scene still while words were read and then rushed it, lagging and hard to follow (2026-10-20). Then
AWC-OS and CytherCAD, each a six-second sequence in the film's materials
(`tools/render-systems.py`), a headline, two sentences a shipped page states, its condition, and one route into the
evidence (`awc-os/`, `pages/brief.html`); CytherCAD's two figures are the front door's only `data-m` marks. The close is
*Tell us what must never happen.* with the contact address. AWC-OS, CytherCAD and the close keep this earlier grammar
until the owner extends the direction (`docs/deploy.md` §5v).

The film plays once, muted, and never restarts on its own; Replay plays it again. Reduced
motion, a refused or failed play, a film not started within `GUARD` (6 s), or one that falls
`STALL` (2 s) behind real time while the page is visible (short pauses count together) shows the final composition and the whole
statement (`still()`); a film stopped short of its end drops its source, so its poster — the
same final frame — stands, nothing more downloads, and a late download cannot pull the visitor
back; a visitor who scrolls on past the film ends it the same way. The passage downloads once the film is whole (or
still: asked to play and paused at once, as iOS fetches a clip only then), ahead of the sequences, and shows once whole: its first frame
is the film's last, so nothing changes where it takes over. Until then, under reduced motion, or after a failed
download, the film's final frame stands, and past it ADII's part stands on one still of its moment, the correction
waiting (`film/passage-*.jpg`). A page that opens past the film (an anchor, a restored scroll) never plays it. Each
sequence plays once from its first frame when half of it is in view and holds its
last frame, which is also its poster. iOS Safari downloads a clip only when asked to play it and
buffers all of it before the first frame moves, so once the passage is whole the two are warmed
in turn (started muted off screen, paused as they play) and arrive ready; without that, a
phone sat on the last frame for seconds, as if frozen (2026-10-13, seen by the owner). One
sequence downloads at a time (the film is outside that queue): one arriving in view takes the
slot from a clip warming off screen, which goes back in the queue, never from another in view,
which it waits behind. A slow
start is never a failure; refused, failed to download (which frees the download slot), or
stalled for `STALL` after it has moved, a sequence rests
on its poster and tries again the next time it comes into view; scrolling past one before it
begins is not a failure. Reduced motion shows the posters. The social card (`assets/og/og-card.png`, on every
page that names one) is the film's last frame with its statement (`tools/render-og-film.py`;
the orbit plate it replaced is `backup/og-card-v1/`). **When nothing is changing, nothing runs:** once the film
and every sequence in view have ended and the scroll has stopped (the passage seeks only as it scrolls), the page
requests no frame, plays nothing and fires no timer (CY-TEMP-001). If the script never runs, the statement unveils itself after 6 s
(`.no-js`, CSS). Reading ink over the film holds ≥ 4.5:1 at glyph support (CY-SEM-003) by
localized darkening only: under the header, along the film's lower edge, behind Replay,
behind each caption and the statement, and under each of the passage's words (opaque there, soft at its edges: on a
phone the current runs through their band). There is no sound. The
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
precached); `css/film.css` and two scripts with SRI: `js/theme.js` in the head (it sets the theme before the page
paints) and `js/film.js` (`defer`).
`js/film.js` reads no module and publishes nothing: the film, its cues, the still state, the passage (the scroll's
moment through its stretches, one seek at a time, its words' windows), the sequences' IntersectionObserver, and `sw.js` registration once the film is still (its install would take the
link from the film on a first visit; it lets a waiting worker in with `take-over`); its DOM wiring sits behind `typeof document`, so it loads under jsc. The media
live in `film/`: two films with their final-frame posters, the passage in both orientations with the still that stands
in for it, two sequences with their posters;
`tools/test-site.py` holds every file the page names to `deploy.paths`, and back.
`js/manifest.js` (`CytherManifest`: `project` and the record, for the projector, the verifiers and
the derived assets) and `js/instrument.js` (`CytherInstrument`: `biEngine`, `audit` and `judge`, for
the verifiers) are loaded by no page and not published; they stay at their paths because the
corpus binds them (`record_hash`, `kernel_hash`), and `tools/test-api.py` holds their surface.

**Arabic** (`ar/`, 2026-10-14): `ar/index.html` is the front door in Arabic and `ar/contact.html` the contact page;
the brief, the ADII page and the legal pages stay English and the Arabic pages mark their links to them
(بالإنجليزية); AWC-OS's page is already bilingual. Each Arabic page is `lang="ar" dir="rtl"`; each pair declares
both languages (`hreflang`) and links the other visibly. `tools/test-site.py` requires the Arabic front door to carry
exactly the English one's cues, the passage's seconds, sections, sequences and projected figures (the projector writes its two figures too,
Western digits). The styles are logical (`inset-inline`), so one stylesheet mirrors; Arabic is never letter-spaced
or upper-cased (spacing breaks the joins), gets taller lines, and keeps a Latin name whole and in its own order
(`[lang=en]`, isolated). Its type is IBM Plex Sans Arabic 300/400 (`fonts/`, OFL, shipped unmodified: the licence
reserves the name "Plex", so it is not subset). The lockup stays left to right. The Arabic card is
`assets/og/og-card-ar.png` (`tools/render-og-film.py ar`). The copy was drafted in Modern Standard Arabic and
published for the owner to refine.

**Light mode** (2026-10-14): `js/theme.js` sets `data-theme` on the root from the visitor's remembered choice
(the header's switch, `#theme`, `aria-pressed`) or else the device's setting; choosing the device's own theme forgets
the choice. Only the two sequences' sections, the close and the footer take the light tokens; the film, the passage,
the header and the words over them are dark in both. Every ink holds 4.5:1 on its ground in both themes (`tools/test-site.py`).

**Subpages** (`contact.html`, `ar/contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script, admitted by its
`sha256-` in the page's CSP, never `'unsafe-inline'`; edit the script and the hash must follow). Their ink law
(every ink ≥ 4.5:1 on every ground, a form field's edge ≥ 3:1) is `tools/test-site.py`. Every page's CSP is least
privilege: `script-src` exactly what the page runs, nothing fetched from another origin, and everything a page or
stylesheet fetches a shipped file (`tools/test-site.py` resolves references against `deploy.paths`, not the tree).
`pages/privacy.html` must name exactly what the site stores (today the `theme` key in localStorage, and the worker's
cache); `tools/test-site.py` holds it to the served scripts.

**The experiment, retired** (2026-10-16, at the owner's direction): THE EXCEPTION, two decisions
that look right, was published at `/exception/` on 2026-10-04 and linked from no page after
2026-10-12. *Draw* released a drawing to the real boundary engine (`CytherInstrument.judge`):
refused at operation 6 (CROSSES), then a valid alternative admitted by the kernel
(`PRG-9FD9BC52`); *Correct* was an illustration of ADII with constructed figures, which the page
said. It is preserved whole in `backup/exception-v1/` (the page, the two modules as it loaded
them, its fonts), which opens from the repository root; `/exception/` now answers 404.

**Project pages** (`adii/`, `awc-os/`) ship only their reviewed publication set, pinned in
`REVIEWED_PUBLICATION` (`tools/test-site.py`): a new file is served once it is reviewed and
named there. `adii/` keeps every URL its first publication served, the CVs included;
`awc-os/live/` redirects to an ephemeral tunnel and never ships. The Alinma plan was cancelled (2026-10-19):
AWC-OS's films have their closing production line masked and its competition deck is withdrawn (the originals:
`backup/awc-os-v1/`); state no Alinma deployment or pilot. Both pages are stamped like
the subpages; `sw.js` sends media, documents and range requests to the network uncached, and
leaves every page it did not precache (`adii/`, `awc-os/`) to the network.

**Infra:** `sw.js` (cache-first; install fetches past the HTTP cache and commits one build
or nothing; `CACHE` carries the build hash stamped by `generate-integrity.sh`; a new build's
worker **waits** and never takes over a page that may still be loading: Safari checks for the
update at the navigation itself, and a worker that skipped waiting answered a returning
reader's previous-build page with this build's modules, which then failed SRI. A page whose
film is still lets the waiting worker in (`take-over`), so the next load is new),
`manifest.webmanifest`, `generate-integrity.sh` (SRI over the requested resources, each URL naming its bytes
(`?v=` the first 12 hex of their SHA-256) in the pages and in the worker's precache alike, so no older build's
worker can answer a newer page from its cache: it did, to the Arabic front door's first visit, and the page lost its
stylesheet to its own integrity check; + build-hash over every `deploy.paths` byte, stamped into every `.html`
`deploy.paths` declares: there is no second page list), `deploy.sh` (allowlist → `dist/`),
`publish.sh` (`dist/` → the `gh-pages` branch GitHub Pages serves at `cytherai.com`;
admitted states only, from a tree with no uncommitted change; the artifact it replaces is kept as the local
branch `rollback/<its build>`, the rollback (`docs/deploy.md` §7); headers contract in `docs/deploy.md` §1, and Pages' limits, accepted by the owner on
2026-10-04 and registered in `vaic/release-dispositions.v0.json`, in §7; HTTPS enforcement is not one of them).

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

## Register rules (grep-enforced: `tools/test-site.py`, over every served text file)

`var(--brass)`/gold/warm-paper tokens and the document register (`DOC-2026-001`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (the retired ledger was a `READING SELF-REPORT`), `Append-only`,
`1e-12`. A front-door claim ships only as a shipped source states it, with its condition
beside it and a link to that source (`pages/brief.html`, `adii/`, `awc-os/`); a claim no
shipped source supports is dropped, not softened. Figures are projections (`data-m`), never
literals.

## Provenance

- **The repository holds the site, its release tooling and its record, nothing else** (reorganized 2026-10-16): the
  served files at their URL paths, the release scripts, `tools/`, `vaic/`, `docs/`, and `backup/`, where everything
  retired lives; `backup/README.md` indexes it and maps every path that moved. The owner's untracked studies (the
  `cyther-*` folders, `design-ledger/`, `cyther-seal-identity.html` and four prototypes, `unhappened-3/` among them)
  live outside the repository, in `~/Desktop/cyther-studies/`; never move them back in or commit them.
- **`backup/PRODUCTION_PLAN.md`** is the build spec of instrument-v1 (phases P1–P9), superseded
  by the drawing set on 2026-09-16 and kept as its record; the drawing set's design record
  is `backup/drawing-set-demo.html` (the approved demo) and `git show c921f00:CLAUDE.md`.
- **THE EXCEPTION** began as `prototype/exception/` on the `exception` branch and moved to
  `exception/` when it was published (2026-10-04); it retired whole to `backup/exception-v1/` on 2026-10-16.
- **`backup/prototype/`** holds the homepage design studies (`crossing/`, `glass/`, `section/`,
  `research/`) and THE UNHAPPENED's versions: `unhappened/` (v1, TRACE-1 and the carried
  receipt), `unhappened-2/` (v2, only what was admitted casts a
  shadow), `unhappened-4/` (v4, the solid rises from its own shadow — promoted to production
  on 2026-10-04, minus its sound, retired on 2026-10-12) and `compare/` (the side-by-side
  harness). Not served; their links to the live site resolved from `prototype/`, so open them at their last commit
  there to run them.
- **The film** was built as an untracked study (`cyther-film/`, never committed, now in the studies folder) from pasted
  directions on 2026-10-11, revised once on a reviewer's critique (the one refused slab, the
  camera holding at the refusal), then extended into the site with three systems and
  published on 2026-10-12; its render sources moved to `tools/render-film.py` and
  `tools/render-systems.py` (Blender 5.1, `blender -b -P <script> -- …`; usage in each header).
- **`main`'s history was rewritten once** (2026-10-13, at the owner's request): the `Co-Authored-By:` lines were
  removed from every commit message on `main` and it was force-pushed; trees, order, authors and dates are unchanged.
  The original history, trailers included, remains on the backup branch `history/before-message-rewrite` (local and
  on `origin`) and on the older development branches, which predate the rewrite. Every old → new hash is in
  `docs/history-rewrite-2026-10-13.md`; admitted records that cite old hashes resolve through it. Commit messages
  carry no attribution trailer.
- **`backup/newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `instrument-v1/` (the substrate homepage,
  whole, with its verifiers — see its README), `graphite-v2/` (old engine-backed homepage,
  with the three modules only it loaded), `dossier-v3/` (old shared CSS + the dossier IIFE
  modules), `trajectory-engine/` (the engine's `-v2.js` dev source, its prototypes, the
  v-next design map, and the engine's last source with its browser suite, `engine/` and
  `pages/runner.html`, retired 2026-10-16: no page loads it), `brand-studies/` (the identity
  and dossier drafts of July 2026), `drawing-set-v1/` (the drawing set, whole, with its verifiers — see its
  README), `unhappened-v1/` (THE UNHAPPENED, whole, with its verifiers — see its README),
  `icon-v1/` and `og-card-v1/` (the derived orbit icon family and social plate, with their
  generators, replaced on 2026-10-13 by the Cyther Seal and the film's card),
  `drawing-set-demo.html` (the demo the drawing set was approved from, loading that
  snapshot's modules), `project-pages/` (the ADII and AWC-OS pages as first published,
  before curation), `exception-v1/` (THE EXCEPTION, whole) and `audit/` (the instrument-v1
  audit record, 00–08, formerly `docs/audit/`).
  Supersede, never erase: retire into `backup/`, do not delete.
