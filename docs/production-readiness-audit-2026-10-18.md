# Production-readiness structural audit — 2026-10-18

Audit of `aethersdev/cytherai` at commit `4d55f21` (build `B76DECC774B9AFBB`, the build live on
`cytherai.com` per `docs/deploy.md` §5s). The audit wrote nothing but this file; no source file was changed.

## Verdict

**No High findings. 6 Medium, 45 Low, 31 Info** (82 after merging duplicates). Every finding below survived
two independent adversarial verifiers (one re-read the cited code and re-ran each reproduction; one argued
documented intent, accepted dispositions and severity). Three findings were disputed by one verifier and are
adjudicated in place; none was refuted outright on its mechanism.

The served site is sound today: every local reference resolves, the allowlist ships exactly 57 files and no
`backup/` or `docs/`, both build-identity implementations agree, every seal equals the computed one, every
generator that can run here reproduces its asset byte for byte, and no credential or secret exists in any
tracked file or history blob. The full non-browser suite passes on this tree.

What is not sound is mostly **the machinery that is supposed to keep it that way**:

1. **The evidence ledger cannot record a regression.** A FAIL appended after a PASS makes the corpus INVALID
   (VAIC-1), and the release-register gate fails on any current FAIL however it is disposed (SITE-19). The
   corpus has never held a FAIL receipt; under this code it cannot.
2. **The automated receipt overstates what was observed** (VAIC-2): restamp records "deploy.sh plus
   tools/test-site.py … complete allowlist and dist closure, 27 files" while running one static test that never
   runs `deploy.sh`, against a 57-file allowlist.
3. **Several laws the docs call enforced are not.** No test pins the homepage CSP or "zero external requests"
   (SITE-3); the page-resource check resolves against the source tree, not the shipped set (SITE-1); a page added
   to `deploy.paths` but not to `generate-integrity.sh` escapes every per-page law (SITE-2); the "grep-enforced"
   register rules have no grep (REG-1).
4. **Two user-facing obligations are unmet:** the privacy policy describes storage the site no longer uses and
   omits the persistent key it does use (PAGE-1), and the ADII recorded run, the front door's evidence route, is
   a silent video with no text alternative (PAGE-2, WCAG 1.2.1 Level A).
5. **The documented rollback is wrong** (DOCS-1): it would force-push the September drawing-set build.

### Fix first

| # | Finding | Why first | Effort |
|---|---|---|---|
| 1 | PAGE-1 privacy policy | a published legal statement that is false today | one paragraph |
| 2 | DOCS-1 rollback | the only incident procedure restores a retired front door | publish.sh keeps the outgoing gh-pages; rewrite §7 |
| 3 | VAIC-1, SITE-19 | the ledger cannot carry a FAIL, so the first real regression has no honest record | derive the row verdict from current-binding receipts |
| 4 | VAIC-2 | admitted receipts are immutable; every restamp appends another overstated one | run the tests the method names; derive the method text |
| 5 | SITE-2, SITE-3, SITE-1 | the laws the release rests on are partly unchecked | set-equality, CSP/external-URL assertions, resolve against `deploy.paths` |
| 6 | PAGE-2 | Level A accessibility failure on the front door's evidence route | a transcript beside the video |
| 7 | REL-1 | a stale artifact can be force-pushed to production | `unset DIST` in publish.sh |

## Scope and method

**Audited:** every tracked file outside `backup/` (99 files: 11 pages, 7 JavaScript files of which 4 are served,
2 stylesheets, the release scripts, 20 tools, the VAIC corpus and ledger, the docs, 31 binary assets); `backup/` (171 files)
for exposure only — it is retired, never served (`deploy.sh` and `tools/test-site.py` refuse it), and its laws
run against its own snapshots, so its code was not re-audited for correctness. Git history (515 commits on the
public remote) was scanned for secrets and personal data.

**How:** four parallel auditors (VAIC tooling; site tests and the manifest; served pages; media generators) plus
direct review of the front end, worker and release path; then two gap auditors (the release docs read in full
against the code; secrets and exposure), each run twice independently. Every finding then went to two
verifiers with opposite briefs (refute on the evidence; refute on intent and severity). Location corrections
the verifiers made are applied below.

**Environment limits.** This is a Linux container; the repo's tooling is macOS-only by declaration. JavaScriptCore
was replaced by a Node shim and BSD `sed -i ''` by a GNU wrapper, injected in-process
(`subprocess.Popen` argv rewrite) so no repository file was touched; an attempt to place a shim at the hard-coded
`/System/Library/...` path was refused by the session's permission policy. The local clone has `main` and no
`master`, so a scratch clone with `master` = `origin/main` was used. Headless Chromium (Playwright) has no H.264,
so runtime experiments served VP8 stand-ins at the films' URLs. Baseline under the shims: syntax check, boundary
engine, test-api, test-projection (`project-manifest.py --check`: 0 stale), test-site (21 OK), test-assets,
vaic_validate (VALID / CERTIFIED), test-vaic (37 OK).

**Labels.** CONFIRMED = provable from the code as written, or reproduced. SUSPECTED = plausible; the missing
confirmation is stated. Severity: High = can ship wrong or broken content, or lose data, on a realistic path;
Medium = a realistic user-visible, legal, accessibility or record-integrity failure; Low = narrow, latent, or
degraded but recoverable; Info = hygiene or drift.

---

## Medium

### PAGE-1 — The privacy policy describes storage the site no longer uses, and omits the key it does use
CONFIRMED · `pages/privacy.html:72`, `pages/privacy.html:51`, `js/theme.js:10,22`

```html
The homepage keeps a single session-scoped display preference &mdash; the reading-optics mode &mdash; under the key
<b>cy-optics</b> in sessionStorage; it dies with the tab. … The reading self-report ledger exists only in memory …
```
```js
try { chosen = localStorage.getItem("theme"); } catch (e) {}                                   // theme.js:10
try { if (chosen) localStorage.setItem("theme", chosen); else localStorage.removeItem("theme"); } // theme.js:22
```
**Failure.** The shipped homepage writes a *persistent* `localStorage` key, `theme`; the policy names a
session-scoped `cy-optics` key and a "ledger" that exist only in retired builds (`backup/instrument-v1/`).
The storage type, key, lifetime and one item are all wrong, and "Last updated: 1 January 2025" (:51) predates
the change (localStorage arrived in `eae73ec`, 2026-10-14).
**Falsification.** No served `.js/.html/.css` mentions `cy-optics` or `sessionStorage` except this page.
**Fix.** Rewrite the paragraph (the `theme` key in localStorage, kept until the visitor clears site data or picks
the device's own theme; the worker's cache) and bump the date.

### PAGE-2 — ADII's recorded run has no text alternative (WCAG 1.2.1, Level A)
CONFIRMED · `adii/index.html:85-88`, routed from `index.html:61`

```html
<video controls playsinline muted preload="metadata" poster="poster.jpg">
  <source src="replay.mp4" type="video/mp4">
</video>
<figcaption class="label">ADII running · a recorded fix, replayed</figcaption>
```
**Failure.** `replay.mp4` is 67.6 s of video with no audio stream (ffprobe: one h264 1920×1080 stream). Its
substance is on-screen text — the investigation, the queries, the verdicts, the sign-off — so a screen-reader user
following *Watch the recorded run →* gets a caption and nothing else.
**Falsification.** No `<track>`, transcript or linked description; the lede and status line summarise, they do
not substitute.
**Fix.** A transcript beside the video (prompt, each step and verdict, answer, sign-off).

### VAIC-1 — A verdict change makes the corpus INVALID: the append-only ledger cannot record a regression or a fix
CONFIRMED (reproduced twice, with a real failing harness) · `tools/vaic_validate.py:553-554`, `tools/vaic_restamp.py:146-148`

```python
if receipt["result"] != result:                                              # vaic_validate.py:553 (every receipt, history included)
    errors.append(f"{label}: result does not match the obligation result")
```
```python
receipt["result"] = "PASS" if run.returncode == 0 else "FAIL"                # vaic_restamp.py:146-148
erow["evaluation"]["receipts"].append(receipt)
erow["evaluation"]["result"] = receipt["result"]
```
**Failure.** The row has one `result` and every receipt, of every build, must equal it. When a served change
makes the harness fail, restamp appends a FAIL and sets the row to FAIL; all 66 earlier PASS receipts of
CY-ART-001 then "mismatch" and the validator reports `structure: INVALID`, `verdict distribution NOT LICENSED` —
the FAIL is reported as corruption, not as a FAIL. The only ways back to VALID are rewriting admitted receipts
(which the history guard forbids) or discarding the new receipt. CLAUDE.md requires the opposite: corpus FAIL
results are "reported without being laundered into structural test failures", re-evaluation appends, and a
historical PASS and FAIL both stand as history.
**Reproduction.** In a copy: add an entry the allowlist test rejects (`echo adii/notes.txt >> deploy.paths`),
`./generate-integrity.sh`, `tools/vaic_restamp.py` → `receipts: CY-ART-001=FAIL`; `tools/vaic_validate.py` → exit 1,
66 × `result does not match the obligation result`.
**Falsification.** `tools/test-vaic.py:354-377` reach VALID only by setting *every* receipt to FAIL (the forbidden
rewrite); `:737-771` runs restamp with a failing harness but never validates the result. Not High: it fails
closed — `verify.sh` exits nonzero and `publish.sh` refuses — so nothing is falsely certified.
**Fix.** Check result agreement only among receipts bound to the current candidate, or derive the row verdict
from the latest current-binding receipt instead of storing it.

### VAIC-2 — The automated receipt records an observation that did not happen
CONFIRMED (reproduced) · `tools/vaic_restamp.py:41-45,141`, `tools/test-site.py:312-330`

```python
HARNESS = {
    "deploy.sh plus tools/test-site.py": [
        "python3", "tools/test-site.py",
        "SiteContractTests.test_deploy_allowlist_and_service_worker_cannot_drift"],
}
...
receipt = copy.deepcopy(templates[-1])        # method, evidence, environment copied verbatim
```
**Failure.** The one test run checks that `deploy.paths` entries exist, the forbidden prefixes, the reviewed
publication set and the worker's precache list. It never runs `deploy.sh` (that is
`test_declared_deploy_set_is_exactly_what_deploy_ships`, `test-site.py:517`). Yet each appended receipt says
harness "deploy.sh plus tools/test-site.py", method "complete allowlist and dist closure", threshold
"27 files, no forbidden trees, exact integrity identity" — `deploy.paths` has 57 entries.
**Reproduction.** In a copy, `exit 1` after `set -eu` in `deploy.sh` (`./deploy.sh` now exits 1); restamp →
`receipts: CY-ART-001=PASS`; validator → `release: CERTIFIED`, exit 0.
**Falsification.** `verify.sh` runs all of `test-site.py`, so `publish.sh` would still refuse. The defect is the
record: an immutable, admitted receipt certifying a method that was not performed, and a validator that certifies
on it. Rated Medium (one verifier said Low) because the receipts are the release's stated evidence.
**Fix.** Point the harness at the tests that build and check `dist/` (or the whole of `test-site.py`); generate
the method/threshold text from the harness definition instead of copying the previous receipt.

### SITE-2 — A page in `deploy.paths` but not in `generate-integrity.sh` escapes every per-page law
CONFIRMED (reproduced) · `tools/test-site.py:52,330`, `generate-integrity.sh:20`

```python
HTML_FILES = shell_list(INTEGRITY_SCRIPT, "HTML_FILES")       # :52 — every per-page test iterates this
self.assertTrue(set(HTML_FILES).issubset(DEPLOY_FILES))       # :330 — one direction only
```
**Failure.** Resource closure, SRI, build-hash, `?v=` naming, referrer and the seal law all loop over the
hand-kept list in `generate-integrity.sh`, which also decides what gets stamped. CLAUDE.md says the deployable set
is "declared once, in deploy.paths".
**Reproduction.** In a copy, a new `pages/new.html` with an external `<script src="https://cdn.example/x.js">`,
a missing stylesheet, a broken link and no meta tags, appended to `deploy.paths` only; regenerate → `test-site`
OK, `vaic_validate` exit 0, `deploy.sh` ships it. Today the two lists match exactly (11 = 11).
**Fix.** `assertEqual({p for p in DEPLOY_FILES if p.endswith(".html")}, set(HTML_FILES))`, or derive
`HTML_FILES` from `deploy.paths` in both places.

### DOCS-1 — The only documented rollback restores the drawing-set build of 2026-09-17, and nothing keeps a newer one
CONFIRMED · `docs/deploy.md:1334-1335`, `publish.sh:36-42`

```
The rollback artifact is the previous `gh-pages` commit, kept as the local branch
`rollback/9236E6A692F915D4` (`git push --force origin rollback/9236E6A692F915D4:gh-pages`).
```
**Failure.** `9236E6A692F915D4` is the seven-sheet drawing set (§5c, §5d), three front doors ago; the build
before the live one was `E6B35C3BEFAE718A` (§5s). An operator following §7 in an incident force-pushes retired
claims to `cytherai.com`. `publish.sh` `git init`s `dist/` and force-pushes a single commit, so it keeps no
outgoing artifact; and the natural fallback (check out the previous release commit and re-run `publish.sh`) is
refused, because receipts admitted later are absent at that commit and the history guard fails.
**Falsification.** The line is present-tense procedure in the live publishing section, not a dated record.
`docs/history-rewrite-2026-10-13.md:31` mentions four local `rollback/<build>` branches on the owner's machine;
none newer is named, and none is visible from here.
**Fix.** Before force-pushing, have `publish.sh` fetch `origin gh-pages` and keep it as `rollback/<outgoing build>`
(and push it); rewrite §7 to name that procedure rather than a fixed build.

---

## Low

### Front end and worker

**FILM-1 — One failing system clip stops the other two from ever being pre-warmed.** CONFIRMED (reproduced) ·
`js/film.js:85-88,93-97,103-114,124-125`
```js
s.addEventListener("pause", idle); s.addEventListener("ended", idle);        // :87 — no "error" listener
const WHOLE = ["progress", "canplaythrough", "emptied"];                     // :93
whole(s).then(() => { if (slot === s) slot = null; next(); });              // :107 — the slot's only release
```
A clip whose download fails fires none of `WHOLE`, so the one-download slot is never released and `next()`
(`if (slot) return;`) never warms the rest. When a sequence scrolls into view the off-screen holder is evicted
with `tried.delete(w)` (:125), and `seqs.find` in document order (:112) hands the failing clip the slot again.
*Reproduced* (Chromium, VP8 stand-ins, a server that drops `sys-adii.mp4` mid-download): healthy, all three
clips requested at 12.2 s; with the failure, `sys-awcos`/`sys-cad` never requested until AWC-OS is scrolled in at
24 s, after which `sys-adii` is re-requested and CytherCAD stays `src=none`. A pure media error (`err=4`) behaves
the same. In-view playback still recovers; what is lost is warming, the iOS fix the comment at :60-67 exists for.
*Fix:* add `"error"` handling that rests the clip (`rest(s)`), so `whole()` resolves via `emptied`; keep a
failed clip out of the warm queue.

**CSS-1 — `main` is `height:100svh` with no fallback; where `svh` is unknown the statement renders above the page.**
CONFIRMED (simulated) · `css/film.css:22`
```css
main{position:relative;z-index:2;height:100svh;padding:0 5vw;overflow:hidden}
```
Every child of `main` is absolutely positioned (`.line`, `.landing` :23, `.sr` :33, `#replay` :41, `.note` :19),
so an unsupported unit drops the declaration and `main` collapses to 0. *Simulated* (film.css served with an
unknown unit, 390×844): `main` 0 px, `h1` at y −245…−182 px, `.principle` at 0; as shipped, `main` 844 px, `h1` at
599…662. Affects Safari < 15.4 and Chrome < 108 (e.g. Android 6's last Chrome). No browser floor is declared.
*Fix:* `height:100vh;height:100svh`.

**SW-1 — Runtime-cached directory pages are written under a key the lookup never uses.** CONFIRMED (reproduced) ·
`sw.js:110-113,120-121`
```js
var key = (e.request.mode === 'navigate' && path.indexOf(SCOPE) === 0 && path.slice(-1) === '/')
  ? path.slice(SCOPE.length) + 'index.html' : e.request;                    // looks up 'adii/index.html'
if (response.ok) cache.put(e.request, response.clone());                     // stores '/adii/'
```
For precached directories (`/`, `/ar/`) the lookup key exists; for `/adii/` and `/awc-os/` it never does, so every
visit re-fetches and re-writes an entry nothing reads. *Reproduced* with the server killed (Playwright's offline
mode does not reach the worker): `/`, `/ar/`, `/pages/brief.html` → 200 from the worker; `/adii/`, `/awc-os/` →
`net::ERR_FAILED`, although the cache holds `/adii/` and `/awc-os/`. Offline is not promised for these pages; the
defect is the dead write path. *Fix:* put under the same `key`, or skip caching navigations that are not precached.

**SW-2 — Runtime fetches go through the HTTP cache and are then served cache-first for the whole build.**
CONFIRMED (mechanism); impact SUSPECTED · `sw.js:120`, cf. `sw.js:38-50`; `awc-os/index.html:168`
```js
return fetch(e.request).then(function (response) { if (response.ok) cache.put(e.request, response.clone());
```
Install deliberately fetches with `cache: 'reload'` because fetching through the HTTP cache pairs old bytes with a
new build (comment :38-46); the runtime path does not. Unversioned, non-SRI subresources take it:
`<script src="awc-os.js" defer>` (observed key `/awc-os/awc-os.js`), `film/sys-*.jpg`, `adii/poster.jpg`,
`assets/brief/*`. Pages sends `max-age=600` (`publish.sh:12-15`), so a reader who fetched one of these within ten
minutes before a new worker activates gets the old bytes frozen into the new build's cache for that build's
lifetime — and since `/awc-os/` itself is always re-fetched (SW-1), new HTML can meet old JS. Not observed live.
*Fix:* `fetch(e.request, { cache: 'no-cache' })` on the runtime path, or version `awc-os.js`.

### Release path and docs

**REL-1 — `publish.sh` lets `deploy.sh` build into `$DIST` but force-pushes `./dist`.** CONFIRMED (reproduced) ·
`deploy.sh:17`, `publish.sh:32,36-43`
```sh
DIST="${DIST:-$ROOT/dist}"                       # deploy.sh:17 — a test override, read from the environment
./deploy.sh                                       # publish.sh:32 — inherits it
cd dist                                           # publish.sh:36 — hard-coded
git push --force "$REMOTE" gh-pages:gh-pages      # publish.sh:42
```
*Reproduced* against a throwaway bare remote (`verify.sh` stubbed: no jsc here): with `DIST` exported and a stale
`./dist` from an earlier plain `./deploy.sh`, `publish.sh` exited 0 and gh-pages held only the stale tree, under
the commit message `publish B76DECC774B9AFBB`; the fresh build sat in `$DIST`; the failing `$(cat CNAME)` (:43)
did not abort. Low, not Medium: it needs `DIST` exported in the owner's macOS shell *and* a `dist/` left by a plain
`deploy.sh` (a `dist/` left by `publish.sh` aborts at `git checkout -b`). *Fix:* `unset DIST` (or pin it) at the
top of `publish.sh`, and `cd "$DIST"`.

**DOCS-5 — `publish.sh` checks only served files for uncommitted changes, so a publish does not prove
"verify green at the release commit".** CONFIRMED · `publish.sh:26,31`; `docs/deploy.md:1262`
```sh
dirty=$(git status --porcelain -- $(cat deploy.paths) deploy.paths)
```
`verify.sh` then reads the working tree's `tools/`, `vaic/` and `verify.sh`. An uncommitted restamp of the corpus
or a locally edited test lets `verify.sh` pass while `verify.sh` at the named source commit would fail. The served
bytes still equal HEAD's. *Fix:* refuse any uncommitted change in the verification set and `vaic/`, or run
`verify.sh` in a clean `git worktree` of HEAD.

**VAIC-9 — Admission rests on a local `master` that a fresh clone does not have, and one guard passes vacuously
without it.** CONFIRMED (reproduced) · `tools/test-vaic.py:118-121`, `tools/test-vaic.py:32`, `publish.sh:24,28`
```python
listing = subprocess.run(["git", "log", "--format=%H", ref, "--", path], cwd=root, capture_output=True, text=True)
if listing.returncode != 0:
    continue
```
With `refs/heads/master` absent, the history walk finds nothing and
`test_no_admitted_receipt_has_ever_disappeared_from_retained_history` passes even with an admitted receipt
dropped; it fails once `master` exists. The full suite still fails closed (the sibling test at :201-218 asserts the
ref), but a single-test run — which CLAUDE.md documents — does not. The origin has `main`, not `master`; this
checkout has `main` and no `master`; only CLAUDE.md, not README or `docs/deploy.md` §7, says to create it.
*Fix:* assert the ref exists inside `admitted_states`; document `git branch master origin/main` in README and §7
(or check admission against `origin/main` after a fetch).

**DOCS-2 — The launch gate declared "in force" requires Safari checks on mechanisms that no longer ship.**
CONFIRMED · `docs/deploy.md:1246-1250` (preamble :15-17)
> `1. The §5 WEBKIT-SPECIFIC residual (W1–W8) has been run in Safari and recorded.`

W1 (runner.html's inline module), W2 (SRI on module fetches), W5 (`.thesis .g`/`[data-wave]`) and W8 (the plate's
compositing) target code that is in `backup/` and not served; item 2 names a staging origin that does not exist;
the film's real WebKit checks (§5f) are not referenced. *Fix:* gate item 1 on §5f plus W3/W4/W6/W7; mark the rest
retired.

**DOCS-3 — The CY-ORIGIN-001 PASS behind `release: CERTIFIED` comes from a harness outside the repository.**
CONFIRMED · `docs/deploy.md:143-155,1329-1330`; latest CY-ORIGIN-001 receipt
The receipt's harness is "Claude Code origin closure check (scratchpad originprobe.py)"; no such script is
tracked, and §4, the only in-repo origin procedure, checks none of byte identity, per-path 301, ranges or worker
generation. The evidence entry describes the method in detail, so it can be rebuilt; EXTERNAL provenance is
allowed. *Fix:* commit the origin harness and name it in §4/§7.

**DOCS-4 — §2's caching rule protects only `index.html`.** CONFIRMED (mechanism), conditional ·
`docs/deploy.md:121-123`
> `` Serve `sw.js` and `index.html` with `Cache-Control: no-cache`; everything else may be cached. ``

`ar/index.html` (a second front door since 2026-10-14) and every subpage reference SRI'd `?v=` resources; on an
origin that follows §2 with a long max-age, a cached page can name integrity values for bytes the server no longer
serves. Subpage-only visitors never register the worker that otherwise protects them. *Fix:* every page in
`HTML_FILES` and `sw.js` no-cache; long caching only for `?v=` resources and immutable media.

### Served pages

**PAGE-3 — AWC-OS copper status text is below 4.5:1.** CONFIRMED · `awc-os/index.html:20,61,63`
`--copper:#B5733A`: "BLOCKED" (11 px mono on `#FFFFFF`) 3.83:1; the callout's bold lead on `#FEF9F4` 3.66:1.
*Fix:* a darker copper for text (≈ `#8F5526`).

**PAGE-4 — The AWC-OS language toggle exposes no selected state.** CONFIRMED · `awc-os/index.html:86-87`,
`awc-os/awc-os.js:8-9` — `classList.toggle("on", l === "ar")` only. *Fix:* set `aria-pressed` in `setLang()`.

**PAGE-5 — English phrases on the Arabic AWC-OS page are not marked `lang="en"` (WCAG 3.1.2).** CONFIRMED ·
`awc-os/index.html:79,83,122-124,164` ("Evaluation Gateway", "One Step Ahead", EXECUTED/REFUSED/BLOCKED); after
the toggle, the Arabic labels are untagged. *Fix:* `lang` on the fixed-language spans.

**PAGE-6 — The AWC-OS "Measured failure retained" callout is empty without JS, and it is the source of a
front-door claim.** CONFIRMED · `awc-os/index.html:126-128`, `awc-os/awc-os.js:11`
```html
<div class="callout" data-ar="<b>فشل مُقاس…" data-en="<b>Measured failure retained:</b> …"></div>
```
Only `e.innerHTML = e.dataset[l]` fills it; every other bilingual element carries its Arabic text in its body.
`index.html:67` ("a proposal was blocked when it failed its own condition") routes here. *Fix:* put the Arabic
markup in the element body.

**PAGE-7 — The AWC-OS films have no text alternative or description.** CONFIRMED (that none exists) ·
`awc-os/index.html:141-142` — no `<track>`, no transcript; both films' audio is the same music bed, the content is
on-screen text and UI. *Fix:* a short transcript per film.

**PAGE-8 — A focused field the script marked invalid has no visible focus indicator.** CONFIRMED (cascade) ·
`css/cytherai.css:141,144,42`; `contact.html:281,333` (and `ar/contact.html`)
`.form-input:focus{outline:none;border-color:var(--accent)}` is then overridden on border-colour by the later
`[aria-invalid="true"]{border-color:var(--refuse)}`; the `:focus-visible` outline (0,1,0) loses to
`outline:none`. The script focuses exactly such a field. *Fix:* an outline for `[aria-invalid="true"]:focus`.

**PAGE-9 — The contact form's refusal UI is mostly unreachable; its consent error is unreachable.** CONFIRMED
(HTML spec) · `contact.html:87-93,158-170,303-304,326-335` (and `ar/contact.html`)
Without `novalidate`, native constraint validation blocks submission before the `submit` handler runs, so the
"NOT TRANSMITTED" line and messages appear only for input that passes native rules but fails the script's (e.g.
`a@b`); the checkbox is `required`, so its error can never show, and it has no `aria-describedby`.
*Fix:* `novalidate` and rely on the script, or delete the dead branch.

**PAGE-10 — Contact field boundaries are ≈ 1.33:1.** CONFIRMED (values); WCAG 1.4.11 applicability interpretive ·
`css/cytherai.css:22,138` — border vs field 1.34:1, vs page 1.33:1, field vs page 1.06:1. *Fix:* a ≥ 3:1 border.

**PAGE-12 — The brief's two exhibit titles are styled `div`s, not headings.** CONFIRMED ·
`pages/brief.html:86,142`; the outline is `h1` (:60) then `h2` (:175). *Fix:* make them `h2`.

### Verification corpus (VAIC)

**VAIC-3 — Editing the record or the policy without moving a served byte makes current receipts
"contradictory".** CONFIRMED (reproduced) · `tools/vaic_validate.py:590`, `tools/vaic_restamp.py:134-136`
```python
elif observed_build == build and verifier_current and value != candidate.get(identity):
```
`js/manifest.js` (`record_hash`) and the evaluator matrix (`policy_hash`) are not in `deploy.paths`, so editing
them leaves the build unchanged; EXTERNAL receipts always count as verifier-current; and restamp skips any row
that already has a current-build receipt. A comment-only edit to `js/manifest.js`, or a reworded coverage class,
→ INVALID with 4 × `claims build B76DECC774B9AFBB but its record_hash/policy_hash is another candidate's`, which
restamp cannot repair. CLAUDE.md: stale-but-well-formed evidence stays VALID / INCOMPLETE. Fails closed.
*Fix:* treat a mismatch in an identity that is not a projection of the build as STALE.

**VAIC-5 — Totality breaks: several malformed inputs exit 2 (INTERNAL_ERROR) instead of 1 (INVALID).** CONFIRMED
(reproduced) · `tools/vaic_validate.py:149,270-275,288-312,405-411`
```python
except (OSError, json.JSONDecodeError) as exc:                              # :149
```
A Latin-1 byte (UnicodeDecodeError), 100 000-deep nesting (RecursionError), a 5 000-digit integer (ValueError), an
acyclic chain of ~1 500 rows (the recursive `dependency_cycle`), a ledger whose `observations` is a list
(AttributeError at :275), and a deleted identity file such as `css/film.css` (hashed at :405-411 without a guard)
all exit 2. CLAUDE.md: "Malformed data must never escape as a Python exception." *Fix:* catch those as
`CorpusError`; make the DFS iterative; type-check the ledger; report missing identity files as INVALID.

**VAIC-6 — A PASS receipt citing a ledger observation that recorded FAIL is VALID and certifies the release.**
CONFIRMED (reproduced) · `tools/vaic_validate.py:278`
```python
if observation.get("artifact_build") != observed_build:
```
Only the build is compared. Setting `reading_ink_B76DECC774B9AFBB.result` to FAIL → `4 PASS … release: CERTIFIED`.
`test-site.py:586-600` forces the FAIL to be named in the register, by subject only. *Fix:* require
`observation.get("result") in (None, receipt_result)`.

**VAIC-7 — A core obligation leaves release judgment if its `scope` is relabelled.** CONFIRMED (reproduced) ·
`tools/vaic_validate.py:125,647-650`
Release judges only `scope == "projection"` and `"origin"` rows; `scope` is only typed `str`. CY-ART-001 with every
receipt FAIL → NOT_CERTIFIED; scope set to `"artifact"` → VALID, CERTIFIED. *Fix:* require scope ∈
{projection, origin} and core/grammar rows in a judged scope.

**VAIC-8 — Admitted obligation definitions are not frozen.** CONFIRMED (reproduced) · `tools/test-vaic.py:96-100,130-146,244`
The history guards compare receipts only; the successor test compares rows across versions and only for fields in
`rebound_fields`. Replacing CY-TEMP-001's bound (0 frames / 0 timers / 0 media) with `{"note":"weakened in place"}`
→ all 37 tests OK, CERTIFIED: admitted receipts now appear to certify a different obligation. *Fix:* compare row
definitions per (file, id) across admitted states, or bind an obligation digest into each receipt.

**VAIC-14 — Receipt identity (build, verifier) cannot hold two independent EXTERNAL observations of one build.**
CONFIRMED (reproduced) · `tools/vaic_validate.py:575`
A WebKit receipt beside the Chromium one on CY-SEM-003 → INVALID `duplicate receipt identity … / EXTERNAL`; this
blocks the WebKit matrix `docs/deploy.md:43` says is open. *Fix:* add an observation id to EXTERNAL identities.

**VAIC-15 — `artifact_build`, `observed_at`, `harness_version` are never format-checked.** CONFIRMED (reproduced) ·
`tools/vaic_validate.py:133-139,607` — `artifact_build: "not a build"` with evidence in a RETIRED file is VALID
(treated as history, with archive privileges). *Fix:* `[0-9A-F]{16}` and an ISO date.

**VAIC-16 — The successor guard misses fields added to a row.** CONFIRMED (reproduced) · `tools/test-vaic.py:244`
`changed = {k for k in before if …}` iterates only the predecessor's keys; adding `exemptions` to CY-ART-001 passes.
*Fix:* iterate `before.keys() | row.keys()`.

**VAIC-17 — `kernel_hash` is computed but bound by no receipt, and `tools/canon.py` is outside the verification
identity.** CONFIRMED · `tools/vaic_validate.py:75,86-91`, `tools/vaic_restamp.py:46`, `tools/test-assets.py:34`
An edit to `js/instrument.js` moves `kernel_hash` and nothing else changes (VALID / CERTIFIED); `canon.py`, imported
by a verifier, can change without moving `verification_identity`. *Fix:* bind `kernel_hash`; add `canon.py`.

### Site tests and manifest tooling

**SITE-1 — The page-resource check resolves against the source tree, not the shipped set, and skips most
reference kinds.** CONFIRMED (reproduced) · `tools/test-site.py:109-118,185,201`
```python
fetchable = {("script", "src"), ("img", "src"), ("source", "src")}          # :185
self.assertTrue(target.is_file(), f"{page}: unresolved local target {raw_url}")   # :201
```
A served page linking `../docs/architecture.md` or `<img src="../backup/icon-v1/icon.svg">` passes every check and
404s in production; `<video src|poster>` outside the front door, `rel=preload`, `srcset` and CSS `url()` are never
read; a path climbing out of the repo is accepted. Nothing is broken today (two independent resolvers over all 11
pages and both stylesheets: 0 misses). *Fix:* resolve against `set(DEPLOY_FILES)`, contain under ROOT, add the
missing kinds.

**SITE-3 — Neither the homepage CSP nor "zero external requests" is asserted.** CONFIRMED (reproduced) ·
`tools/test-site.py:203-220`
The comment at :206 says "Their CSP forbids inline script."; the only CSP assertion is `script-src 'none'` for the
four legal pages (:220). Widening both front doors' CSP to `script-src 'self' 'unsafe-inline' https:` and adding
`<img src="https://tracker.example/p.gif">` passes the whole suite. (An extra inline `<script>` *would* be caught by
the script-order assertion at :209.) *Fix:* parse and pin each page's CSP; fail on any scheme-bearing URL in
`src/href/poster/data-src` other than allowed anchors.

**SITE-5 — The seal law reads size and colours from the page under test.** CONFIRMED (reproduced) ·
`tools/test-site.py:397,403-405,408-409`
```python
self.assertEqual(svg, seal.fitted_svg(int(size), ink, ground, ' class="seal"'), page)
```
`size/ink/ground` come from the page itself, so a gold seal (CLAUDE.md: "Warm is never the seal's colour") passes;
the docstring says "another colour fails". The "teeth" control compares two locally built strings. *Fix:* pin
(size, ink, ground) per page; mutate a page in the control.

**SITE-6 — Projection P5's negative control never exercises the manifest's refusal.** CONFIRMED (reproduced) ·
`tools/test-projection.py:51-56` — the `ValueError` comes from a Python dict miss; making `CytherManifest.project`
return `"n/a"` instead of `null` still prints `PASS P5`, and the projector then writes `>n/a<`. *Fix:* project the
unknown name through `PM.projections` and assert None.

**SITE-7 — The projector sees `data-m` only on `span`, `td` and `div`.** CONFIRMED (reproduced) ·
`tools/project-manifest.py:22`
```python
MARK = re.compile(r'(<(span|td|div)\b[^>]*\bdata-m="([^"]+)"[^>]*>)([^<]*)(</\2>)')
```
`<strong data-m="count:systems_indexed">05</strong>` (true value 06) on both front doors → P3 PASS, `--check`
0 stale. *Fix:* find every `data-m` with an HTML parser; fail on any mark the projector cannot rewrite.

**SITE-8 — P7's figure-literal ban matches only whole text nodes of today's values.** CONFIRMED (reproduced) ·
`tools/test-projection.py:73` — `>0\.00%<|>10\.00%<|…` misses "An invalid rate of 0.00% against DeepCAD at
10.00%" in prose, and a future 93 % is never searched. *Fix:* build the pattern from the projected values; search
the unmarked text anywhere.

**SITE-9 — P6 moves the baseline on one page only.** CONFIRMED (reproduced) · `tools/test-projection.py:63` — a
second, hard-coded "vs 10.00% (DeepCAD)" in the manifest's outcome line goes undetected. *Fix:* run P6 over every
page and name.

**SITE-10 — `./verify.sh` is not read-only, and its fixed temp names race.** CONFIRMED (reproduced) ·
`tools/project-manifest.py:27`, `tools/canon.py:33`, `tools/test-projection.py:60`
```python
driver = os.path.join(ROOT, "tools", ".project-driver.js")
```
Drivers and mutants are written into `tools/` (not gitignored); 12 concurrent `--check` runs → 9 failures. CLAUDE.md:
"./verify.sh is therefore read-only". (Also `test-vaic.py:563` writes `__pycache__`, VAIC-21.) *Fix:*
`tempfile.mkdtemp()`, or pass the driver with `jsc -e`.

**SITE-14 — test-api's inventory and "no page loads a module" checks are evadable.** CONFIRMED (reproduced) ·
`tools/test-api.py:37-40,43` — `Object.assign(API, {…})` publishes 8 keys while test-api counts 6; a
`<script src="../js/manifest.js">` on a served page passes (SITE-1) and 404s. *Fix:* enumerate globals under jsc;
scan pages for the module paths.

**SITE-15 — The asset-receipt set defines itself.** CONFIRMED (reproduced) · `tools/test-assets.py:48`
```python
if "SHA-256" not in rows: continue
```
Renaming EXHIBIT-B's row label to `SHA256` and flipping a byte of the served PNG → `PASS D1 … (8 receipts, 15
files)`, down from 9/16. *Fix:* a section with Output rows but no digest is a defect; pin coverage to served paths.

**SITE-16 — D8's "pages name it" set is 6 of 11 pages, read by attribute-order-sensitive regexes.** CONFIRMED
(reproduced) · `tools/test-assets.py:101-105`. *Fix:* iterate `HTML_FILES` with the HTML parser.

**SITE-17 — Retired, unshipped DERIVED assets are bound to the live manifest checksum.** CONFIRMED (reproduced) ·
`tools/test-assets.py:88-91`
```python
elif r["checksum"] != checksum: defects.append("%s: derived from state %s, current state is %s" % …)
```
All three DERIVED receipts are retired `backup/` assets; a legitimate `epoch: 3 → 4` edit fails `verify.sh`
(OG-CARD-V1, ICON-V1, SURFACE-TERMINAL), against `js/manifest.js:16-18` ("nothing derived is hardcoded
downstream"). *Fix:* bind retired receipts to the checksum they record.

**SITE-19 (merges VAIC-22) — The current-FAIL disposition gate fails on any current FAIL, however disposed, and
matches by subject only.** CONFIRMED (reproduced) · `tools/test-site.py:550,557,565`
```python
disposed = {entry["subject"] for entry in register["dispositions"]}                # :550
self.assertEqual(self.effective_failures(mutated, matrix), {"CY-ART-001"})          # :565
```
The control at :565 runs on a copy of the *live* corpus, so a second current FAIL with a proper OPEN_DEFECT entry
makes the test fail: a disposed FAIL becomes a structural test failure, which CLAUDE.md forbids. The subject-only
match would also accept `"disposition": "RESOLVED"`, though today :565 decides first. Together with VAIC-1, no
current FAIL can coexist with a green `verify.sh`. *Fix:* assert `effective_failures(mutated) −
effective_failures(corpus) == {"CY-ART-001"}`; validate the disposition kind.

### Media and provenance

**GEN-1 — The ten shipped film media have no promotion-log receipt, and their renders are not reproducible.**
CONFIRMED · `docs/asset-promotion-log.md:8`; `tools/test-assets.py:49,101-106`; `tools/render-film.py:270`,
`tools/render-systems.py:198`
"a promoted asset with no receipt is a defect" — `film/*.mp4` and `film/*.jpg` have none; test-assets parses only
`png|svg`; `c.time_limit = float(os.environ.get('TL', 0))` makes sampling wall-clock dependent and the frames were
not kept. The bytes are consistent (posters match last frames at 35–41 dB PSNR). *Fix:* ILLUSTRATIVE receipts with
master commit, encode and poster commands and digests; extend test-assets to `mp4|jpg`.

**GEN-2 — The AWC-OS sequence's pale "alternative" slab passes through the refused slab.** CONFIRMED (shipped
frames) · `tools/render-systems.py:138,143-144` — `p2` and `alt` share `lanes[1]`; frames 95–101 (3.92–4.17 s) show
them merged. *Fix:* a separate lane or later start.

**GEN-3 — In the CytherCAD sequence two refused tokens merge and a passing token slides through the third.**
CONFIRMED (shipped poster) · `tools/render-systems.py:162-166` — tokens 8 and 12 overlap ≈ 82 %; `film/sys-cad.jpg`
shows two refused tokens, not three. *Fix:* choose non-overlapping stop heights.

### Exposure

**PII-1 — The served ADII CVs publish four team members' phone numbers and personal emails.** PLAUSIBLE (consent
unknown) · `adii/cv/*.pdf` (linked `adii/index.html:93-96`)
Counts only: one 12-digit phone number and one email per CV (three on personal webmail); PDF `Author` metadata in
three, one of which does not appear in its CV's text. Publishing the CVs is deliberate (`REVIEWED_PUBLICATION`);
the repository cannot show consent either way. *Fix:* record consent, or republish with company contact details and
stripped metadata under the same URLs.

---

## Info

| ID | Location | Finding |
|---|---|---|
| FILM-2 | `js/film.js:10,57`; `js/theme.js:16`; `css/film.css:35` | `no-js` is removed before wiring that can throw; on a MediaQueryList without `addEventListener` (Safari/iOS ≤ 13) the statement stays at opacity 0 (simulated). Those engines also lack `svh` (CSS-1), so the marginal impact is nil; it matters as robustness: any future throw between :10 and :58 hides the statement everywhere. |
| DOC-1 | `docs/deploy.md:1238` vs `js/film.js:16` | The owner's device table says a film not started "within 3 s" gives way; `GUARD = 6000`. |
| REG-1 (merges SITE-4) | CLAUDE.md "Register rules (grep-enforced)" | No tool greps for `CONDUCT RECEIPT`, `Append-only`, `1e-12`, `var(--brass)`, fake meters; a page carrying all of them passes the suite. The served set is clean today. |
| PAGE-11 | `contact.html:50`; `css/cytherai.css:60,181` | The English contact page letter-spaces its Arabic link: the guard `:lang(ar) *` misses the `lang="ar"` element itself. Joining damage per engine SUSPECTED. Fix: `:lang(ar), :lang(ar) *`. |
| PAGE-13 | `contact.html:33`, `ar/contact.html:35` | `script-src 'unsafe-inline'` for one static inline script; a hash source would allow only it. |
| PAGE-14 | every page | No `rel=canonical`; subpages link home as `index.html` while og:url/hreflang name `/`. |
| PAGE-16 | `adii/index.html:71-100` | No `<main>` landmark. |
| PAGE-17 | `index.html:45-80`, `ar/index.html:42-77` | The principle, systems and close sit outside any landmark; the footer is nested in a section. |
| VAIC-4 | `tools/vaic_validate.py:607` | A same-build receipt from an earlier verifier is not "historical", so it cannot resolve through archive snapshots. Disputed; adjudicated Info: CLAUDE.md scopes archive resolution to earlier builds, it fails closed, and an `EVIDENCE:` marker resolves it. |
| VAIC-10 | `tools/test-vaic.py:118` | The history walk uses git's default simplification (no `--full-history`); latent — every extra commit on the real history checked, none lost a receipt. |
| VAIC-11 | `tools/vaic_validate.py:635` | The bespoke-relation kill ratio is read from the corpus it judges; NaN disables it. |
| VAIC-12 | `tools/vaic_validate.py:63,85,682` | `--matrix` judges with one matrix while `policy_hash` hashes the default file. Not used by `verify.sh`. |
| VAIC-13 | `generate-integrity.sh:66-67,96` vs `tools/vaic_validate.py:197` | Shell blanks the first stamp per line, Python every one. Disputed; Info: the trigger (two build-hash metas) is already rejected by test-site's exactly-one rule. |
| VAIC-18 | `tools/vaic_validate.py:231-268` | An empty anchor (`deploy.sh#`) resolves. |
| VAIC-19 | `vaic/README.md:22-24,102` | README says overreach/coverage mismatch is NOT_EVALUATED (the validator says INVALID) and "18 obligations" (19). |
| VAIC-20 | `tools/vaic_restamp.py:18-19,100-111` | `stamp()` does not re-parse what it writes, though the docstring says both edits are. |
| VAIC-21 | `tools/test-vaic.py:563` | A child Python without `-B` writes `tools/__pycache__/` (gitignored). |
| SITE-11 | `tools/project-manifest.py:15,59-68` | Writes earlier pages before refusing an unknown name on a later one. |
| SITE-12 | `tools/project-manifest.py:30-31,43`; `js/manifest.js:79` | Reserved (`__checksum`) and over-segmented names project; `__ids` crashes. |
| SITE-13 | `tools/test-api.py:31-34,51` | "Every symbol has a real caller" is satisfied by the word in a comment; the comment stripper is applied only to module sources. |
| SITE-18 | `js/instrument.js:22-25,37,55,109` | `judge()` admits tokens after closure, accepts negative `mg` past ARG RANGE, and loops forever on fractional `mg`. No page loads it. |
| SITE-20 | `tools/project-manifest.py:4-10`; `js/manifest.js:34,73`; `tools/test-boundary.js:2-3`; `tools/test-assets.py:24-26` | Comments name consumers that no longer exist (`js/unhappened.js`, a runtime read-back, the seed-02 boot). |
| SITE-21 | `tools/test-boundary.js:41`; `tools/test-projection.py:35`; `tools/test-site.py:432` | Assertions narrower than their labels (CROSSES position unchecked; P1's child output discarded; 3-digit hex never contrast-checked). |
| GEN-4 | `tools/render-film.py:2,265`; `tools/render-systems.py:2,193` | Renders depend on the operator's startup.blend (no `--factory-startup`), undocumented `TL/EDGE/HIDE`, and Metal; `blender -b -P` exits 0 on a script error. |
| GEN-5 | `tools/render-og-film.py:31-34` | The guard `not os.path.isfile(OUT)` cannot fire: OUT is tracked and Chrome writes onto it. |
| GEN-6 | `tools/render-systems.py:111`; `tools/render-film.py:11,285`; `tools/render-og-film.py:20-21` | Unknown selectors fall through to a default (a typo renders CytherCAD into AWC-OS's directory). |
| GEN-7 | `tools/gen-exhibit-a.py:178-180,122-135` | The "no curve commands" check only rejects `<text`; the T-junction test uses strict `<`. The shipped SVG is clean. |
| GEN-8 | `docs/asset-promotion-log.md:12-13,175,188,200,232-241` | Names tools now in `backup/`, the retired plate card, and a build hash over "nine JS/CSS resources". |
| EXP-1 | `deploy.sh:4-9` | The GitHub repository is public (API: `"private": false`), so `backup/`, the epoch-04 preimage and all history are public regardless of the allowlist. The allowlist claims only the served origin and keeps it; no doc says the repo is confidential. Worth one sentence. |
| EXP-2 | history: `awc-os/live/index.html` on tag `archive/uploads-until-2026-09-12` | A three-month-old Cloudflare quick-tunnel hostname (no credentials) — the public live-demo route of its day. |
| PII-2 | git metadata; `backup/audit/00-repository-baseline.md:5` | A device hostname in commit emails, a personal address on PR heads and tags, a local home path in a tracked record. Not removable without a rewrite the doctrine forbids. |

---

## Suspected, not raised

- **`GUARD` counts hidden time; `STALL` does not.** `js/film.js:51` arms `setTimeout(still, GUARD)` in wall-clock
  time, while `tick()` (:42) excludes hidden intervals from `STALL`. A tab opened in the background, whose
  playback the browser defers until shown, would reach the still composition before it is ever seen. The
  fallback is the designed state (statement + Replay). *Missing:* a real browser with background-tab media
  deferral; headless Chromium cannot hide a page.
- **`clients.claim()` claims every client, not only the page that asked.** `sw.js:85` vs the comment at :70
  ("taking over a loaded page is harmless"): a second tab still loading an old-build page when the first sends
  `take-over` could have its `?v=OLD` requests answered from the network with new bytes. *Missing:* a two-tab
  race on a slow link.
- **IBM Plex Mono subset.** `adii/fonts/OFL.txt:1-5` calls the ADII fonts "Latin subsets, unmodified" of fonts
  including IBM Plex Mono (Reserved Font Name "Plex"); CLAUDE.md declines to subset the Arabic Plex for exactly
  that reason. If `ibm-plex-mono-400.woff2` is IBM's own split file there is nothing to report. *Missing:* a
  comparison with IBM's published subsets (no network here).
- **`role="alert"` with `aria-live="polite"`** on the contact feedback line (`contact.html:175-180`), shown from
  `display:none`; announcement behaviour varies by screen reader. *Missing:* VoiceOver/NVDA.

## Structural observations (not defects)

- **No CI.** Verification runs only on the owner's Mac (hard-coded `/System/Library/...jsc`, BSD `sed -i ''`), inside
  `publish.sh`. Nothing checks a pushed commit or a PR; every guarantee above is as strong as that one machine's
  discipline.
- **No declared browser floor.** CSS-1 and FILM-2 are defects only relative to one; stating it (e.g. Safari 15.4+)
  would turn them into accepted limits.
- **H.264 only.** Every film is h264 High with no alternative source; a browser without H.264 shows the still
  composition and posters — the designed fallback, observed here.

## Checked and clean

- **Served set.** `deploy.sh` builds exactly the 57 `deploy.paths` files; `backup/`, `docs/`, `awc-os/live/` refused;
  every precached asset present.
- **References.** Every `href/src/poster/data-src/srcset/url()`, `og:url/og:image` and manifest reference on all 11
  pages and both stylesheets resolves into `deploy.paths` (two independent resolvers; 0 misses, 0 bad fragments).
- **Build identity.** The shell (`generate-integrity.sh:62-73`) and Python projections agree byte for byte on the
  current tree (`B76DECC774B9AFBB`); SRI and `?v=` values match the bytes.
- **Worker.** One-build-or-nothing install with `cache:'reload'` and a build-stamp check; range, video and document
  requests bypass; offline `/`, `/ar/` and the precached subpages load from the worker (reproduced).
- **Media.** All eight served MP4s are faststart (`moov` before `mdat`); posters match their films' last frames.
- **Seal and generators.** All 11 inline seals equal `fitted_svg` of the computed walk (77 proposals, 29 admitted,
  48 refused); `render-seal.py`, `gen-empty-plate.py`, `gen-exhibit-a.py`, `gen-exhibit-b.py` reproduce their
  committed assets byte for byte.
- **Validator security.** Evidence pointers with `../`, absolute paths, NUL, archive prefixes and `js/film.js/../..`
  are all rejected by the exact-match coverage allowlist.
- **Secrets.** No API key, token, private key, password or credential in any tracked file or any of 1 575 history
  blobs.
- **Page security.** Every `target=_blank` carries `rel=noopener`; AWC-OS's `innerHTML` receives only constant
  author data; the legal pages run `script-src 'none'`; every SVG is script-free with no external reference.
- **Front-door parity.** `ar/index.html` matches `index.html` tag for tag except the expected language attributes,
  font preloads and localised links.

## Coverage ledger

Categories: **C** correctness · **F** failure handling · **S** security · **A** accessibility · **T** test
validity · **D** docs/claims · **R** release/config. "—" = not applicable.

| File(s) | C | F | S | A | T | D | R |
|---|---|---|---|---|---|---|---|
| `index.html`, `ar/index.html` | clean | — | clean | PAGE-17 | — | clean | clean |
| `js/film.js` | FILM-1 | FILM-1, FILM-2 | clean | clean | — | clean | — |
| `js/theme.js` | clean | FILM-2 | clean | clean | — | PAGE-1 | — |
| `css/film.css` | CSS-1 | — | — | clean | — | — | — |
| `sw.js` | SW-1, SW-2 | clean | clean | — | — | clean | clean |
| `contact.html`, `ar/contact.html` | PAGE-9 | clean | PAGE-13 | PAGE-8, 9, 10, 11 | — | PAGE-14 | — |
| `pages/brief.html` | clean | — | clean | PAGE-12 | — | PAGE-14 | — |
| `pages/privacy.html` | — | — | clean | clean | — | PAGE-1 | — |
| `pages/security.html`, `pages/terms.html`, `404.html` | clean | — | clean | clean | — | clean | — |
| `adii/index.html`, `adii/*` media | clean | — | clean | PAGE-2, PAGE-16 | — | clean | PII-1 |
| `awc-os/index.html`, `awc-os/awc-os.js` | clean | PAGE-6 | clean | PAGE-3, 4, 5, 7 | — | PAGE-6 | SW-2 |
| `css/cytherai.css` | clean | — | — | PAGE-8, 10, 11 | — | — | — |
| `manifest.webmanifest`, `icon.svg`, SVG/PNG assets | clean | — | clean | clean | — | — | clean |
| `film/*` media | GEN-2, GEN-3 | — | — | — | — | GEN-1 | clean |
| `deploy.paths`, `CNAME`, `.nojekyll`, `.gitignore` | clean | — | EXP-1 | — | — | — | clean |
| `deploy.sh` | clean | REL-1 | clean | — | — | EXP-1 | REL-1 |
| `publish.sh` | REL-1 | REL-1 | clean | — | — | DOCS-5 | DOCS-1, DOCS-5, VAIC-9 |
| `verify.sh` | clean | clean | — | — | SITE-10 | — | VAIC-9 |
| `generate-integrity.sh` | VAIC-13 | clean | — | — | — | — | SITE-2 |
| `tools/vaic_validate.py` | VAIC-1, 3, 4, 6, 7, 11, 12, 14, 15, 17, 18 | VAIC-5 | clean | — | — | VAIC-19 | — |
| `tools/vaic_restamp.py` | VAIC-1, 2, 3 | clean | clean | — | VAIC-2 | VAIC-20 | — |
| `tools/test-vaic.py` | clean | clean | — | — | VAIC-8, 9, 10, 16, 21 | — | — |
| `tools/test-site.py` | SITE-1, 2 | clean | SITE-1 | — | SITE-1, 2, 3, 5, 19, 21 | — | — |
| `tools/test-assets.py` | SITE-16 | clean | — | — | SITE-15, 16, 17; GEN-1 | SITE-20 | — |
| `tools/test-projection.py`, `tools/project-manifest.py` | SITE-7, 11, 12 | SITE-11 | clean | — | SITE-6, 7, 8, 9, 10 | SITE-20 | — |
| `tools/test-api.py` | clean | clean | — | — | SITE-13, 14 | — | — |
| `tools/canon.py`, `tools/pngout.py` | clean | clean | — | — | VAIC-17 | — | — |
| `js/manifest.js`, `js/instrument.js`, `tools/test-boundary.js` | SITE-12, 18 | SITE-18 | — | — | SITE-21 | SITE-20 | — |
| `tools/render-*.py`, `tools/gen-*.py`, `tools/og-card*.html` | GEN-2, 3, 7 | GEN-5, 6 | clean | — | GEN-7 | — | GEN-4 |
| `vaic/` corpus, ledger, matrix, dispositions, README | VAIC-1 | — | — | — | SITE-19 | VAIC-19 | — |
| `docs/deploy.md` | — | — | — | — | — | DOC-1, DOCS-1, 2, 3, 4 | DOCS-1 |
| `docs/architecture.md`, `docs/history-rewrite-…`, `README.md` | — | — | — | — | — | VAIC-9 (setup) | — |
| `docs/asset-promotion-log.md` | — | — | — | — | — | GEN-1, GEN-8 | — |
| `CLAUDE.md` | — | — | — | — | — | REG-1 | — |
| `backup/` (171 files) | not audited (retired, not served) | — | EXP-1, PII-2 | — | — | — | clean (refused by `deploy.sh` and `test-site.py:316`) |
| git history (515 commits) | — | — | clean (no secrets); EXP-2, PII-2 | — | — | — | — |

## Could not verify

- Real Safari / iOS (warming, Low Power Mode, VoiceOver, the Arabic letter-spacing in PAGE-11), H.264 playback,
  macOS JavaScriptCore, BSD `sed`, Blender and Chrome rendering — every browser result above is headless Chromium
  with VP8 stand-ins, or a simulation where stated.
- The live origin (no network access to `cytherai.com`) and GitHub Pages' behaviour on a missing `CNAME`.
- The owner's local `rollback/*` branches, and the external links on the AWC-OS page.
- Whether the four people consented to their CVs being published.
