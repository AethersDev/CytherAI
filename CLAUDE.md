# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no framework, package manager, bundler, or linter. The
zero-dependency verification entrypoint is `./verify.sh`; it runs the jsc module and
logic regressions, the Python projection/integration tests, and the corpus validator.
Browser-only checks (layout, service worker, reading ink over the film, the settled state)
remain in `docs/deploy.md`; the retired front doors' laws run against their snapshots,
`backup/instrument-v1/verify.sh`, `backup/drawing-set-v1/verify.sh` and
`backup/unhappened-v1/verify.sh`. Every push to `main` runs `./verify.sh` again on GitHub (`.github/workflows/verify.yml`: a clean
checkout with the whole history, on a macOS runner for jsc, Python 3.10 or later): a second observer that gates and publishes
nothing, free while the repository is public and skipped if it is private (the owner, 2026-11-24: CI within the free tier).
Serve with any static file server: `python3 -m http.server 8000` from the repo root — but
`http.server` answers no byte ranges, so the films cannot seek there (and Safari plays no video
from it); a browser observation that seeks a film needs a server that answers `Range` (GitHub
Pages does, and so does the system Ruby's: `./deploy.sh && ruby -run -e httpd dist -p 8000`).

One check at a time: a jsc regression takes the modules it needs before it, in load
order, exactly as `verify.sh` lists them (`$JSC js/manifest.js js/instrument.js
tools/test-boundary.js`). `tools/test-site.py`, `tools/test-vaic.py`, `tools/test-release.py` (the build and the publish, in sites of their own under a temporary directory), `tools/test-record.py` (the recorder) and `tools/test-origin.py` (the origin check, against a server of its own) are `unittest`
(`python3 tools/test-vaic.py VaicCorpusTests.test_<name>`); the other `tools/test-*.py`
are plain scripts. All Python tooling is stdlib `python3`; `.venv` holds only
`websocket-client`, for driving Chrome over CDP: the committed browser probes
`tools/probe-ink.py` (CY-SEM-003) and `tools/probe-settle.py` (CY-TEMP-001), run as
`.venv/bin/python tools/probe-<name>.py dist <out-dir>`, and `tools/probe-origin.py` for the live origin (CY-ORIGIN-001); their receipts are `EXTERNAL` and cite the ledger. `tools/probe-arrival.py` (the same way; no obligation, run after any change to the front door, the bar, the anchors, the page's edges or the contact pages) holds the audit of 2026-11-05, its re-check of 2026-11-06 and the front door's reading since 2026-11-25, `tools/probe-return.py` (the same way; no obligation, run after any change to `sw.js`, to how `js/film.js` registers it or to how a page names its resources) holds a returning visitor with a publish between two visits, and `tools/probe-ios.py` (the same way; no obligation, run after any change to how `js/film.js` loads or holds the film) holds the same in the iOS Simulator's WebKit, where a screenshot alone can see a resting frame. `tools/probe-turn.py` (the same way; no
obligation, run after any change to how `js/flat.js` asks for its clip, drops it or holds it) holds the audit's
finding 9 of 2026-11-24 on Both looked flat, with the page's `fetch` answered in the order the probe
chooses: a phone turned twice asks for the first clip's URL again, and the first download, answered late, changes nothing; a
dropped download is cancelled and a displaced clip's blob URL released. `CANONICAL_REF` is local
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
longer runs `./deploy.sh`; a test builds into a temp directory instead (`./deploy.sh <dir>`; until 2026-11-24 the destination came from the environment, `DIST`, and was removed before anything was checked). `deploy.sh` replaces only what it built: a destination that is not, to the byte, what it
last built there (its record stands beside it, `<destination>.sha256`) is left whole, to be renamed aside (`mv dist dist.aside`),
and the old artifact is removed only once the new one stands in its place.

**Release policy consumes effective verdicts; the validator never reads policy.** The
validator says what a verdict *is*; `vaic/release-dispositions.v0.json` records what the
owner has *decided*, and a disposition never changes a verdict. Every obligation whose
**effective** verdict is `FAIL` needs an obligation-keyed disposition, and every `FAIL`
recorded in the evidence ledger must be named even when its binding has expired —
documentation may explain a failure differently, but may not make it disappear. A
`NOT_EVALUATED` is **not** folded into either rule: missing evidence and a tested defect
may both block release, but under different clauses.

Zero external requests, ever. The homepage CSP forbids inline `<script>` (`script-src 'self'`); all homepage JS is in external modules (its one data block, the Organization's JSON-LD, runs nothing). No node — verify JS with
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
the VAIC candidate, appends the automated-set receipts; existing receipts are never edited). Once `tools/probe-ink.py` and
`tools/probe-settle.py` pass on that candidate, `python3 tools/vaic_record.py <ink.json> <settle.json> "<what changed>"` appends their
observations and receipts (the origin's follow the publish: `tools/probe-origin.py --record`). A scratchpad goes with its session, so a release tool lives in `tools/`.

The figures the pages print — CytherCAD's validation record on `pages/brief.html` and in CytherCAD's rooms
(`cythercad/`, `ar/cythercad.html`; the front doors print none since 2026-10-21) — are projections of `js/manifest.js`:
marked elements (`data-m="name"`) that `python3 tools/project-manifest.py` rewrites from `CytherManifest.project` (no page
reads them back at runtime: no page loads the record). After a manifest edit, run the projector before the integrity
step; `tools/test-projection.py` fails on a stale page, an unknown name, an identifier the brief or a CytherCAD room does
not print, or any mark on a front door. **The record states what its run's own files show** (2026-10-21, at the review of
the production handover): until then it printed *0.00% invalid on an external benchmark, against 10.00% for DeepCAD* and
five more rows, but the 192 descriptions were chosen and run by CytherAI, the run's result file shows 1 invalid part in
384, DeepCAD's figure was the Text2CAD paper's own test, and no run supports the other rows as printed; the corrected
record and its evidence are `docs/deploy.md` §5ad, the six rows as first printed `backup/cold-paper-v1/pages/brief.html`.

The architecture and change-impact guide is `docs/architecture.md`; running the site day to day (the host, the domain,
the mailboxes, monitoring, restoring a build, and what only the owner can settle) is `docs/operations.md`.

## Architecture — the film

The homepage opens on its statement, *Let AI change things. Keep control of what changes.*, with **The three systems ↓** and **Talk to us →**: they stand from the first paint, where they stand at the film's end (the audit of 2026-11-05; until then they waited for its 10.6th second, LCP 11.3 s: `docs/deploy.md` §5ad, §5ag). Nightfall plays once behind the statement. The camera leaves a rooftop room, follows a street up to a lightning mast and returns to the lit window. The landscape and separately composed portrait masters each run 15.125 seconds. Both keep the words in HTML. The line *A conceptual visualization. It measures no product.* sits under the film.

Under the film the page is on the identity's paper, in its own flow (2026-11-25, the owner: *when you first enter you see the new film but when you scroll it changes to the old one … treat UX as part of engineering*): the principle (*One principle. Three systems.* · *The model proposes. The system decides.*), then a row for each system, its name, its headline, what it does, its condition and its one route (*See what this is based on →* to `adii/`, *See the demonstration →* to `awc-os/`, *Read the validation record →* to `cythercad/`), always on show; then the invitation, *Tell us what must never happen.*, with the contact address and the route to Both looked flat. The film leaves 92 px of that paper in the first window (`--peek`), with its label in it, so a first view never looks like the whole page. No script moves, fades or holds any of it: `js/film.js` names the film and Replay and nothing else (`tools/test-site.py`). Three systems under one principle, a shared principle, never a product connection.

From 2026-10-20 to 2026-11-25 a twenty-five-second scene the scroll moved through, the passage, stood there. It had been rendered to open on the last frame of the film Nightfall replaced on 2026-11-23, so from that day the page dissolved from a rooftop into a machine it had never introduced; it took 13.6 screens to say about 210 words, each shown only in its own window of the scroll. It is whole in `backup/passage-v1/`, with its render scripts and its probe; its words are the ones on the paper.

The film plays once, muted, and never restarts on its own; Replay plays it again. Until it plays its own first frame stands (`film/nightfall-*-open.jpg`, preloaded by the page for its orientation; until 2026-11-25 its last, so its ending showed before its opening). Reduced motion, a request to save data, or a connection the browser calls 2G or estimates under 1 Mbit/s (these three fetch no film and no worker either, under 1 MB; never "3g" by itself, which Chrome reports on a loopback server and at 50 kbit/s alike: §5ag, §5ai), a refused or failed play, a film not started within `GUARD` (6 s), or one that falls `STALL` (2 s) behind real time while the page is visible (short pauses count together) shows the final composition (`still()`); a film stopped short of its end drops its source, so its poster, the same final frame, stands, nothing more downloads, and a late download cannot pull the visitor
back. It plays on while any of it shows under the header; a visitor who has scrolled past it is done with it (`IntersectionObserver`). A page that opens past the film (an anchor, a restored scroll, a return through the history even to the top: without its back-forward cache Chrome replayed the film to a visitor
back from the contact page until 2026-10-21) never plays it. Where scripting is off the stylesheet shows its last frame. The English social card (`assets/og/og-card.jpg`) is the identity kit's Open Graph image since 2026-11-23, copied byte for byte: the mark as STANDARD No. 001, a rendering of a design, with the kit's line *Every claim carries its check.* (IMG-031; the Nightfall card it replaced is `backup/nightfall-card-v1/`); CytherCAD's rooms preview with their language's card since 2026-11-25 (until then a still of the passage); the Arabic card (`assets/og/og-card-ar.jpg`, IMG-032) is that composition since 2026-11-24, rendered here (`tools/render-og-film.py ar`) on the kit's rendering of the part with nothing drawn on it (`tools/og-plate-standard-001.jpg`): the name, and the line handed over that day for the kit's, *مع كلّ ادّعاء طريقة للتحقّق منه.*, without the kit's descriptor, which has no Arabic wording (until then the film's last frame with its statement, `backup/nightfall-card-v1/`; the orbit plate before that is `backup/og-card-v1/`, its own PNG of 612 KB `backup/og-card-v2/`). **When nothing is changing, nothing
runs:** once the film has ended, or been scrolled past, the page requests no frame, plays nothing and fires no timer (CY-TEMP-001). Reading ink over the film holds ≥ 4.5:1 at glyph support (CY-SEM-003) by localized darkening only: along the film's lower edge, behind Replay and behind the statement; on the paper by its inks. There is no sound. The statement is the page's `h1`, shown by its markup whatever the film or a script does; a screen-reader-only paragraph (`.sr`) is the silent film's text alternative.

**The mark is the CytherAI mark** (adopted 2026-11-21 from the owner's sheet *A mark that counts itself*, kept outside
the repository in `~/Desktop/cyther-studies/sheet.html`): a C of eight positions round a ring, from the top anticlockwise,
each 0 to 7 units thick, filled with the one sequence of the 8⁸ = 16,777,216 in which position n is as thick as the number
of positions n thick, 4 2 1 0 1 0 0 0 (its 840 orders hold one true one). `tools/render-mark.py` finds it by enumeration,
draws it (outer radius 46 of 100, 6.5 a unit, every end cut along a ray from the centre), stops unless that is the sheet's
drawing to the byte, and writes the logo (`assets/logo/cytherai.svg`: the mark beside the name, whose letters are the sheet's
drawing carried verbatim, the mark twice the capitals' height), `icon.svg`, `favicon.ico` and the app icons: since 2026-11-23 the identity kit's, the mark in Ink on Paper at 0.80 of the square (0.86 under 64 px), `icon.svg` the mark alone and byte-identical to the kit's `favicon.svg` (until then the sheet's, on a rounded Night square: `backup/mark-night-icons-v1/`). Every page's
header shows the logo as one image in the home link (`<img class="logo">`, 34 px high, 30 under 760 px; its URL names its
bytes, `generate-integrity.sh`): since 2026-11-23, on paper, `assets/logo/cytherai-ink.svg`, the same drawing in the identity kit's
Ink `#16161a`. Both looked flat's social cards carry `assets/logo/cytherai.svg` at 42 px, over its film (in the tree, not served); the Arabic card shows the ink logo at its name alone, the part beside it being the mark. The logo is only
ever Ink `#f0ece2` on Night `#09090b` (the sheet's) or the kit's Ink on its Paper; amber and red are states, never its colour. Never redraw it: `tools/test-site.py`
holds the logo, the icon and the favicon to what the generator writes and every header and card to the logo file. No
trademark search or registration has been made (the owner, 2026-11-21: registration when it is needed). The retired marks
are `backup/seal-v1/` (the Cyther Seal, 2026-10-13 to 2026-11-21, with its generator, icons and cards),
`backup/icon-v1/` (the orbit filament) and `backup/og-card-v1/` (the orbit plate).

**`index.html`** — a CSP with no inline script or style; type from `adii/fonts/` (shared,
precached); `css/film.css` and one script with SRI, `js/film.js` (`defer`).
`js/film.js` reads no module and publishes nothing: the film, the still state and `sw.js` registration once the film is still (its install would take the
link from the film on a first visit; it lets a waiting worker in with `take-over`); its DOM wiring sits behind `typeof document`, so it loads under jsc. The media
live in `film/`: two films, each with its first frame and its last (the last precached);
`tools/test-site.py` holds every file the page names to `deploy.paths`, and back.
`js/manifest.js` (`CytherManifest`: `project` and the record, for the projector, the verifiers and
the derived assets) and `js/instrument.js` (`CytherInstrument`: `biEngine`, `audit` and `judge`, for
the verifiers) are loaded by no page and not published; they stay at their paths because the
corpus binds them (`record_hash`, `kernel_hash`), and `tools/test-api.py` holds their surface.

**Arabic** (`ar/`, 2026-10-14): `ar/index.html` is the front door in Arabic and `ar/contact.html` the contact page;
each system's evidence has an Arabic room (2026-10-21): `ar/adii.html` and `ar/cythercad.html` introduce ADII's run and
CytherCAD's record, which stay in their original English, and `ar/awc-os.html` carries AWC-OS's own Arabic film and text;
the brief and the security policy stay English and the Arabic pages mark their links to them (بالإنجليزية); the privacy policy and the terms have Arabic versions, `ar/privacy.html` and `ar/terms.html` (2026-11-06, drafted from the English and not yet reviewed by a lawyer; neither says which governs, the owner's decision), held by `tools/test-site.py` to the English's blocks, numbers, addresses and named providers. Each Arabic page is `lang="ar" dir="rtl"`; each pair declares
both languages (`hreflang`) and links the other visibly. `tools/test-site.py` requires the Arabic front door to carry
exactly the English one's film, sections, routes and projected figures. The styles are logical (`inset-inline`), so one stylesheet mirrors; Arabic is never letter-spaced
or upper-cased (spacing breaks the joins), gets taller lines, and keeps a Latin name whole and in its own order
(`[lang=en]`, isolated). Its type is IBM Plex Sans Arabic 300/400 (`fonts/`, OFL, shipped unmodified: the licence
reserves the name "Plex", so it is not subset). The lockup stays left to right. The Arabic card is `assets/og/og-card-ar.jpg` (`tools/render-og-film.py ar`). The copy was drafted in Modern Standard Arabic and
published for the owner to refine.

**One lit environment** (2026-10-20, the owner's decision): the front door is the same whatever the device's theme. Since 2026-11-23 (the owner: *Nightfall is the main* and the new identity *merged* round it, so the site reads as enterprise-grade, *not like a dark fully looking like startup*) that environment is the dark film and the identity kit's paper, Paper `#f4f1ea` in Ink `#16161a` (`~/Desktop/cyther-studies/cyther-rod/cytherai/identity`, outside the repository; mock-ups A, B and C and a liquid-glass header were shown, B with the plain paper header chosen: `docs/deploy.md` §5ap): its header and footer from that day, everything under the film since 2026-11-25, the rooms whole, and the header and footer of Both looked flat, which stays dark for its own film. Until then the front door was dark throughout. Light
mode (2026-10-14: `js/theme.js`, the header's switch `#theme`, light tokens for the sections below the film) retired to
`backup/theme-switch-v1/` on 2026-10-20, when the switch changed only the footer,
a promise of an alternate view the page did not keep. Every page starts at one edge, the header's, 5vw in (`css/room.css` `main`; the rooms were centred, 130 px in from their own header at 1440, until 2026-11-25), and a link in running text is told by a line of 3:1. The front door's header (`.bar`) stays in view, slim, on paper (until 2026-11-23 on its own darkness), opaque under the statement as it scrolls by (it showed through by 40 levels of 255 until 2026-11-06: `tools/probe-arrival.py`) (the audit of 2026-11-05), and scrolls away only in a window at most 480 px tall: the brand going home, *What we build* (the brief), *About*, *Talk to us*, the language. It is every page's one header since 2026-11-07 (the owner, after comparing the site with Anthropic's, OpenAI's and Apple's: the brief and About were found in the footers alone), in view on every page (sticky on the rooms' ground), its links in a second row where they do not fit beside the brand, as on a phone; *The three systems* stays the opening's own link; `tools/test-site.py` holds the destinations, `tools/probe-arrival.py` (`nav`) that a pointer reaches them on every page, at its top and as it scrolls. The rooms share its paper (`css/room.css`). `tools/test-site.py` holds the front door
to one environment (no switch, no theme on the root, no colour-scheme query in `css/film.css`; all but the film on paper) and
every ink to 4.5:1 on its ground, the dark and the paper alike.

**The rooms** (2026-10-21, the owner's direction: finish the visitor's journey after the film, one route first,
homepage → ADII evidence → contact → return, in both languages; then AWC-OS and CytherCAD): the pages a visitor reaches
from the front door are rooms of it, `css/room.css` — quieter, with its type, logo, header and footer, no motion,
and on the identity's paper, in ink, in either device theme (2026-11-23; until then dark, the film's world, an art-direction
choice the owner had kept in review on 2026-10-21); the quiet layout and the stillness give the change of pace. `adii/` opens on its arrival: what
the recorded run is, whose work it is (*Built by Group 05* and its four names, under the headline: the company's identity
never hides the team's authorship), what decision it shows (from the run's own text) and what it does not claim, beside
the run itself (on a phone: the headline, the byline, the limit, the run, then what it shows); the paper follows (*Permission Is Not Justification*, in the owner's words of 2026-11-06, every figure checked against it, with what the numbers are beneath: its repository is `AethersDev/adii_team`, and until that day the site said no results were published, false since 2026-10-02: `docs/deploy.md` §5ai), then what ADII is, in its repository's own words (a complete, locally running reference implementation, not deployed into a production customer environment; never *from CytherAI*: the copyright is the four authors'), then the run as text and the
team, verbatim (their CVs withdrawn by the owner, 2026-10-30). `ar/adii.html` introduces it in Arabic, with the paper and what ADII is, the team's names in Latin, with the run (its
interface in English) and a marked link to the English text. The contact pages continue *Tell us what must never
happen.* with three plain questions (*What system are you working on?* · *What would you want AI to do?* · *What must
never happen?*), composed into one readable email draft for the visitor's own email app: the button says *Open email
draft*, never *Send*, with *Your email app will open with these answers. Review the draft and send it there.* beside it,
and if no app opens, *Copy the message* copies the draft whole, the address beside it, or a link carries the draft to Gmail, Outlook.com or Outlook for work or school, the visitor's to follow (until 2026-11-08 one Outlook link went to the work and school host alone; no link is documented by its service, and only the owner can check one signed in: `docs/deploy.md` §5f, §5am; a draft too long for Gmail, which refused 9,800 characters, drops them). A press with nothing answered opens nothing and asks again; any other says what should be happening, since where no app answers `mailto:` nothing else shows (the audit of 2026-11-05). The answers stay in the browser until the draft opens; the page sends and stores nothing and never says a message was sent, and `pages/privacy.html` describes exactly that, with the host's own logs (GitHub Pages logs every visitor's IP address) as a separate matter
(`mailto:` by design; without the script the form posts the answers to `mailto:`). Each contact page keeps its one inline
script, admitted by its `sha256-` in the page's CSP, never `'unsafe-inline'` (edit the script and the hash must follow).
`awc-os/` (2026-10-21, at the owner's direction: *the other two destinations have not received this treatment*) opens
on *Not every answer was allowed.*, who built it (*Developed by Al-Baseera*, presented at the AMAD 2026 FinTech
Hackathon, as its film's closing card says), what the demonstration shows (the engine runs a program, refuses it with a
Sharia-compliant alternative, or blocks it; the measured failure kept), and its limit (a hackathon demonstration, an
evaluation machine, no deployment claimed), beside its English film; how it decides, its paths, the film as text and its
source follow, verbatim from the evaluation gateway it replaced (`backup/before-rooms/awc-os/`, whose language toggle
retired with it). Its posters are the films' frame of the engine's trace marked EXECUTED, not the refusal, whose card
names an Alinma product (IMG-015). `cythercad/` opens on CytherAI's own test (*In CytherAI's own test of April 2026, 1 of 384 parts was
invalid.*, projected) and its conditions (the 192 descriptions CytherAI chose from the Text2CAD dataset, one part from each
of CytherCAD's two ways of reading each; a valid part builds and passes the kernel's check, which is not to be the part
described; the check tightened in May 2026 and the test not run since; figures published for other systems on the dataset
are another test and not compared), beside the record; the record follows as the brief states it. The routes: *See what this is based on →* lands on ADII's arrival, *See the demonstration →* on
AWC-OS's, *Read the validation record →* on CytherCAD's, each Arabic route on its Arabic room, and *Talk to us →* on the
contact page. An evidence room's way back, *← The three systems*, returns to the system that led to it (`#adii`, `#awc-os`, `#cythercad`); the contact room, reached from many places, is left by the browser's own Back or the one header (until 2026-11-07 its
header's way back returned through the history, `navigation.canGoBack`, or to `#principle`). `tools/test-site.py` holds each room to its stylesheet, its home lockup and its footer, the room's
paper and ink to the identity kit's and to the front door's header and footer (every ink ≥ 4.5:1 on the ground and on the lifted ground, a field's edge ≥ 3:1), and each
evidence room's way back to the system whose route leads to it. The contact pages say what is wrong at the first question, where the focus goes, tied to its field (2026-11-25: until then under the button, out of view once the focus had moved), and offer the other ways to send a draft as a row of links under the button. The pages they replaced are `backup/before-rooms/` and
`backup/cold-paper-v1/`.

**The brief, the legal pages and the 404** are rooms too since 2026-10-21 (the owner: *do the brief, the legal pages
and the 404, then one review of titles and link previews*). The cold-paper design they shared (`css/cytherai.css`, its
bar of links, *LEGAL* stamps, the document register's *DOC-2026-002*, section stamps and exhibit labels, the brief's
illustrative figures and the 404's empty plate) retired whole to `backup/cold-paper-v1/` with their generators. The
legal pages kept their text word for word then (since changed: the privacy policy for the contact page's webmail links, and the terms' section 4 on 2026-11-06, since a notice on a public website is no confidentiality agreement); the brief is the site's one portfolio story since the re-check of 2026-11-06 (the owner: lead with what they build; every public repository worth showing goes on the site): CytherCAD, CytherAI's lead product, then SijilOS, then the founder's public repositories (MenuMind, the Barker papers), then the two team projects the film also shows, credited to their teams, and its access; each record as the system's
own records state it (corrected 2026-10-21, `docs/deploy.md` §5ad: SijilOS's certification, production environments and
event-sourcing were not what its records show, and are withdrawn; CytherCAD's figure projected, every validation identifier
printed); the 404, served at any depth (every URL absolute), says
in English and Arabic that nothing is published at the address. Each opens with the one header (2026-11-07), where until then it headed back with *← The three systems* to
`#principle`, and every page's footer names the About page, the brief, the contact page, security, privacy and terms, marking the one it is (About, `pages/about.html` and `ar/about.html`: since 2026-11-07, at the owner's direction, what CytherAI is first, in sentences the site already states, then a Team section with the founder's name, role, LinkedIn and GitHub; no photo, stage, registration or careers). Each system's status is one sentence (2026-11-06, `tools/test-site.py`): its `.cond` on the front door, word for word at the head of its room's limit and in the brief's Status row
(`tools/test-site.py`). One review of titles and link previews followed: every title is *… — CytherAI*, the front
doors' *CytherAI — * and their own statement (until 2026-10-21 the film study's working name, *Everything changes. One
thing holds.*, which the page never said); every shareable page previews with the site's name, its title, a
description, its own URL and language, the large card, and an image whose declared size and type are its real ones
(`tools/test-site.py` reads them from the file), and names that URL as its canonical one. Search visibility is a decision:
`robots.txt` admits every crawler and names `sitemap.xml`, which lists every page by its canonical URL except the 404 and
a page that asks not to be indexed (AWC-OS's rooms keep the `noindex` of the evaluation gateway they replaced, pending the
owner's decision); `tools/test-site.py` holds the two to each other. Every page's CSP is least
privilege: `script-src` exactly what the page runs, nothing fetched from another origin (the one connection any page
makes is Both looked flat's to its own sequence: `connect-src 'self'` and `media-src blob:` on its two pages alone,
`connect-src 'none'` everywhere else), and everything a page or stylesheet fetches a shipped file (`tools/test-site.py` resolves references against `deploy.paths`, not the tree).
`pages/privacy.html` and `ar/privacy.html` must name exactly what the site stores (today only the worker's cache; the light-mode choice the front door remembered until 2026-10-20 is no longer read); `tools/test-site.py` holds them to the served scripts.

**Both looked flat** (`flat/`, `ar/flat.html`; 2026-10-25, a candidate on the branch `both-looked-flat` until the owner
reviews it): the front door's principle shown in physics. Two blocks of lapped steel that look the same are each tested
with an optical flat under sodium light: the first shows straight fringes, the second concentric rings around a rise of
1.2 micrometres, hidden until the glass revealed it; *Both looked flat. Only one is.*, then the close, the front door's own
*The model proposes. The system decides.* The scene is the script (`tools/render-flat.py`, Blender 5.1, Cycles on the Apple
GPU, nothing imported): every fringe is computed, never drawn, as the reflectance of the stack glass | 15 nm silver |
air gap | steel (characteristic matrices, every internal reflection) for the sodium D lines (D2 twice D1), at the gap the
scene's own timeline sets, its phase taken at the camera ray's own angle, averaged over a half-frame shutter; the camera's
aperture washes the fringes out at large gaps by itself, and within 0.2 mm the stack takes over from the silvered
underside's semi-mirror (R 0.575, T 0.395, from the same matrices). Optical constants: fused silica (Malitson 1965), iron
(Johnson and Christy 1974), silver (Johnson and Christy 1972), from the refractiveindex.info database; for an unsilvered flat
the Airy sum and the matrices agree (0.382 to 0.640). The flats are partially silvered, as gauge interferometers' were,
which sharpens the fringes; the blocks, the dome and the wedges are the scene's, and the page says so. Landscape and
portrait are separately composed (the blocks side by side; one beyond the other), 12 frames a second, joined by
`tools/encode-flat.py`, which reads the stills' names and seconds from `js/flat.js`. The scroll moves the sequence at one
pace, 4 s a viewport (`css/flat.css`, held by `tools/test-site.py`), its last stretch a viewport past the sequence's 32 s
with the last frame held, so its conclusion is read before the instrument rises over the film (until 2026-10-25 it lay
under it; `tools/probe-flat.py` now finds words that anything covers); its words fade with the scroll in their windows, and
*Rings.* comes only once the second flat's wedge is shallower than its dome's steepest slope, where a fringe can first close,
and is up in full as that flat settles (held by `tools/test-site.py`; until the review of 2026-10-25 it came over open bands
and faded as the rings closed); a new viewport keeps the visitor's moment in the film and, past it, their place (the block at
the top of the view, and how far into it); it
downloads whole, by a request of its own, and plays from memory (its CSP is the only one that admits
`connect-src 'self'` and `media-src blob:`), and its stills stand in until then, under reduced motion, on a lean link or after a failed
download. After the film, before the principle, the instrument (`#bench`, *Lift the glass. Press it back.*): both flats at
rest from above, as pressed as they go, so the first gesture it invites lifts (until the review of 2026-10-25 it invited a
press that could not move them); the visitor lifts either one and presses it back (up lifts, down presses, across turns it;
the arrow keys and Enter do the same)
and the page computes every fringe in the browser, WebGL2, drawing only when pressed: each pixel's ray traced through the
glass slab to the steel with the plates' own camera (`flat/media/plate.json`), the stack's reflectance computed there from
the same constants, and five plates Blender rendered at constant reflectances (0, 0.25, 0.5, 0.75, 1) blended at it, so the
film's own light and tone carry the fringes; its plates load only as it comes near, and without WebGL2, or when the GPU refuses its shader or takes
its context back, the film's last still stands, with words saying so. The review of 2026-11-06: the page wears the front door's fixed `.bar` with *Talk to us* (what stays the front door's alone on a phone is named by `#film~main`), a lean link keeps the stills (`lean`, one rule with `js/film.js`, `tools/test-site.py`), and the instrument is centred and never taller than the window less 140 px, since the glass takes every swipe that starts on it (`touch-action:none`: the gesture its words ask for is up and down, so the review's `pan-y` would take that away), which leaves a margin to scroll by even on a phone on its side; its reading stays in view (`position:sticky`) wherever the glass stands in the window, and the canvas is an `application` with the front door's focus ring. `tools/test-site.py` holds the page's optical constants, sodium lines and dome to the
renderer's and runs the page's own reflectance under jsc against the renderer's (1e-9); every figure
either page states (the dome's 1.2 µm, a fringe's 0.29 µm, the 15 nm film) is the scene's, and every one of the scene's is stated. `tools/probe-flat.py` is its browser
check: a finger's swipes on the glass and beside it by Chrome's own touch pipeline, the frame each scroll names, reading ink (by `tools/probe-ink.py`'s method), and the place a new viewport keeps, from
the film and from the instrument, the close and the notes. Its method states the model's approximations (the stack at normal
incidence, only its phase at the camera's angle; iron's constants for the steel; the page's agreement with the film checks the
computation, not the model), and its limits that straight fringes show a block flat only to the reference flat's own accuracy.
The front doors route to it from their close only, under the invitation (*Looking right is not a test: a demonstration in light →*, its own page's words; until 2026-11-05 *Both looked flat. See why →*, which told a first-time visitor nothing at the page's main click), so a visitor meets the company and its three systems first; the film's conclusion routes back to the three systems before the instrument, which
stays optional (both on review, 2026-10-25).

**The experiment, retired** (2026-10-16, at the owner's direction): THE EXCEPTION, two decisions
that look right, was published at `/exception/` on 2026-10-04 and linked from no page after
2026-10-12. *Draw* released a drawing to the real boundary engine (`CytherInstrument.judge`):
refused at operation 6 (CROSSES), then a valid alternative admitted by the kernel
(`PRG-9FD9BC52`); *Correct* was an illustration of ADII with constructed figures, which the page
said. It is preserved whole in `backup/exception-v1/` (the page, the two modules as it loaded
them, its fonts), which opens from the repository root; `/exception/` now answers 404.

**Project pages** (`adii/`, `awc-os/`, `cythercad/`) ship only their reviewed publication set, pinned in
`REVIEWED_PUBLICATION` (`tools/test-site.py`): a new file is served once it is reviewed and
named there. `adii/` keeps every URL its first publication served but the team's CVs, withdrawn by the owner on 2026-10-30 and
required to 404 (`tools/probe-origin.py`); all three are rooms since 2026-10-21;
`awc-os/live/` redirects to an ephemeral tunnel and never ships. The Alinma plan was cancelled (2026-10-19):
AWC-OS's films have their closing production line masked and its competition deck is withdrawn (the originals:
`backup/awc-os-v1/`); state no Alinma deployment or pilot. They are stamped like
every page; `sw.js` sends media, documents and range requests to the network uncached, and
every page to the network first (`adii/`, `awc-os/`, `cythercad/` and the Arabic evidence rooms with no copy of their own for when it fails).

**Infra:** `sw.js` (a page from the network, past the HTTP cache, and from the cache only when the network fails, so a returning visitor reads what is
published: until 2026-11-06 pages were cache-first, and the first load after a publish was the last build, as was every reload until a front door's film
ended or every tab of the site closed, `docs/deploy.md` §5aj; everything else cache-first, each `?v=` file named by its bytes; install fetches past the HTTP cache and commits one build
or nothing, each page by its stamp and each `?v=` file by its digest, as the fetch handler does before it keeps anything, since Pages' CDN answers any `?v=` from its one copy of the path and old bytes kept under a new name failed every load until the next publish; `CACHE` carries the build hash stamped by `generate-integrity.sh`; a new build's
worker **waits**, which holds back only a visitor's offline copy, and never takes over a page that may still be loading: Safari checks for the
update at the navigation itself, and a worker that skipped waiting answered a returning
reader's previous-build page with this build's modules, which then failed SRI. A page whose
film is still lets the waiting worker in (`take-over`), so the next load is new),
`manifest.webmanifest`, `generate-integrity.sh` (SRI over the requested resources, each URL naming its bytes
(`?v=` the first 12 hex of their SHA-256) in the pages and in the worker's precache alike, so no older build's
worker can answer a newer page from its cache: it did, to the Arabic front door's first visit, and the page lost its
stylesheet to its own integrity check; + build-hash over every `deploy.paths` byte, stamped into every `.html`
`deploy.paths` declares: there is no second page list), `deploy.sh` (allowlist → `dist/`, replacing only what it built there),
`publish.sh` (`dist/` → the `gh-pages` branch GitHub Pages serves at `cytherai.com`;
admitted states only, from a tree with no uncommitted change, and only with a current PASS for the two browser observations judged before publication, which `./verify.sh` does not ask for; it builds in a directory of its own, leases its push to the `gh-pages` it fetched, so two publishers cannot replace each other unseen, and keeps the artifact it replaces as the
branch `rollback/<its build>`, here and at origin, which `./publish.sh --restore <build>` serves again from any checkout (`docs/deploy.md` §7, §5ar); headers contract in `docs/deploy.md` §1, and Pages' limits, accepted by the owner on
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

`var(--brass)`/gold/warm-paper tokens and the document register (any document number, `DOC-2026-001`, and since
2026-10-21 the brief's `DOC-2026-002`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (the retired ledger was a `READING SELF-REPORT`), `Append-only`,
`1e-12`. A front-door claim ships only as a shipped source states it, with its condition
beside it and a link to that source (`adii/`, `awc-os/`, `cythercad/`, `pages/brief.html`); a claim no
shipped source supports is dropped, not softened, and a shipped source states only what its run's own records show
(CytherCAD's record, corrected 2026-10-21: `docs/deploy.md` §5ad). Figures are projections (`data-m`), never
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
  published on 2026-10-12; Nightfall replaced it on 2026-11-23. Its render sources are `backup/passage-v1/tools/`
  (`render-film.py`, and `render-passage.py` for the scene that went on under it until 2026-11-25) and
  `backup/system-sequences-v1/` (Blender 5.1, `blender -b -P <script> -- …`; usage in each header).
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
  before curation), `exception-v1/` (THE EXCEPTION, whole), `adii-sequence-v1/` and `system-sequences-v1/` (the three
  systems' six-second sequences, retired on 2026-10-20 for the passage), `passage-v1/` (the passage, retired on 2026-11-25) and `audit/` (the instrument-v1
  audit record, 00–08, formerly `docs/audit/`).
  Supersede, never erase: retire into `backup/`, do not delete.
