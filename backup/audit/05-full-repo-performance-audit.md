# Full repository and performance audit

**Date:** 2026-08-13; remediated and reverified 2026-08-14  
**Baseline:** `a641406` on `master`; clean worktree before this audit  
**Mode:** full audit followed by user-authorized remediation of every actionable finding  
**Continued by:** `docs/audit/08-runtime-performance-pass.md` (2026-09-11) — findings 1, 3 and 6 re-measured and taken further; 4 and 5 re-measured and deliberately not taken  

## Verdict

The tracked CytherAI artifact is internally coherent and its local gates are
informative: the non-browser battery passes, the browser engine reports 33/33,
the homepage reaches claims 10/10, SRI/build/cache identities agree, and the
27-file allowlisted artifact rebuilds. No new public-artifact security or claim
integrity blocker was confirmed.

The release state is still **NOT ORIGIN-CERTIFIED**. Live response headers, HSTS,
MIME/404 behavior, four interactive WebKit checks, and owner review of provisional
manifest/commitment data remain outside repository proof (`docs/deploy.md:10-15`,
`docs/deploy.md:347-383`).

One product defect was confirmed in the recent mobile chrome work: at 390×844
the fixed bottom instrument covered almost the entire footer at maximum scroll.
It is now resolved with clearance derived from the live wrapped-strip height.
All six ranked performance findings were remediated or bounded as described
below. External origin and owner-certification work remains open because it
cannot be implemented by repository source.

## Scope and coverage ledger

The baseline contained 83 tracked files. The audit also accounted for the
gitignored `awc-os/` microsite (two HTML files plus two videos and one deck) and
the generated `dist/` artifact. `.git/` object data is repository machinery, not
application scope.

| Area | Inventory | Coverage | Result |
|---|---:|---|---|
| Root runtime/release files | 11 | Deep-read; scripts executed where safe | Clean except origin certification remains external |
| Homepage modules (`js/`) | 7 | Six live modules deep-read and executed; `console.js` caller census | Hot paths ranked below; `console.js` remains intentionally unserved |
| Public HTML (`index`, `contact`, `404`, `pages/`) | 8 | Parsed, local-link/resource closure tested, browser-smoked | Mobile footer occlusion fixed and verified at four widths |
| Shared CSS | 1 | Read with responsive/compositor trace | No broken reference; mobile fixed-strip clearance missing |
| Engine | 2 | Browser runner executed | 33/33, exitCode 0, zero console errors |
| Tools | 9 baseline | Source/invocation census; Python compilation and existing regressions executed | New site + ledger tests added |
| Assets | 7 | Size/header/deploy/manifest checks; provenance documents inspected | Declared PNG dimensions and allowlist membership hold |
| Documentation | 7 baseline | Architecture, audit, deployment, asset-record consistency review | Architecture guide added; stale WebKit count corrected |
| Frozen records (`backup`, `newC3`, `trajectory-engine`) | 32 | Inventory, role/caller/deploy-exclusion census; not executed as product | Correctly absent from `dist/` |
| Retained dead engine-project files | 3 | Caller and release-boundary census | No public caller, no precache or allowlist entry |
| Gitignored `awc-os/` | 5 user files + `.DS_Store` | Both HTML files read; media/deck sizes inventoried | Separate artifact; isolated performance note below |
| Generated `dist/` | 27 | Rebuilt from scratch by `deploy.sh` | Pass, 1.0 MiB, forbidden trees absent |

Frozen prototypes and retired surfaces were characterized as records rather than
treated as active routes. That boundary is enforced twice: the allowlist excludes
them (`deploy.sh:20-47`) and the new integration test rejects their appearance in
the artifact contract (`tools/test-site.py:216-228`).

## Confirmed product finding

### UI-001 — mobile bottom instrument occludes the footer

- **Status:** RESOLVED
- **Impact:** Medium; footer claim summary and all five footer navigation links are
  covered at the bottom of the homepage on a current mobile width.
- **Source:** the strip is fixed with wrapping enabled (`index.html:332-336`); the
  ≤640 px rule docks the ledger and optics into that same wrapping container and
  gives every control 34 px vertical padding (`index.html:440-459`). The footer
  follows the strip in source (`index.html:747-760`), but no mobile bottom clearance
  is applied to the document or footer.
- **Reproduction:** served `index.html` in the in-app browser at 390×844, then
  scrolled to the maximum. The strip occupied y=702..844 (142 px); the footer
  occupied y=680..844 (164 px). Only 22 px of the footer remained above the strip.
  Individual docked controls did meet the intended 44 px target (45–46 px), and
  horizontal overflow was zero.
- **Falsification:** the result persisted after initialization reached claims
  10/10 and admission verified, so it was not a transient exposure/loading state.
- **Correction:** `wireStripClearance()` measures the actual wrapped strip with a
  `ResizeObserver`, publishes `--stripH`, and the mobile footer consumes that value
  as bottom padding. No device-specific pixel constant is used.
- **Reverification:** at 320/375/390/430×844 the footer actions ended 14.8–15.7 px
  above the strip, horizontal overflow was zero, and the published claims stayed
  10/10 with admission verified.

## Performance bottlenecks, ranked by impact

### 1. Progressive plate development and repeated full-grid tonemapping

- **Status:** RESOLVED for the audited main-thread hot path
- **Impact:** High startup CPU and main-thread contention.
- **Evidence:** the four plates target 6.3 million in-view deposits and permit up
  to 71 million recurrence iterations (`js/substrate.js:38-40`). Every plate owns
  five large Float32 accumulation arrays plus an ImageData buffer
  (`js/substrate.js:197-218`). Each non-reduced-motion frame deposits a batch and
  then scans/tonemaps the complete grid (`js/substrate.js:223-275`,
  `js/substrate.js:333-357`), including pixels untouched in that frame.
- **Measurement correction:** the initial 2.813/2.158 s probe accepted an
  intermediate status before the fourth canvas was initialized. A fail-closed
  probe requiring three consecutive admission-verified, 10/10 samples with all
  four canvases initialized measured the clean baseline at **21.137 s** on a warm
  1280×720 reload.
- **Correction and result:** tonemapping is cadence-limited to 80 ms plus first and
  final frames, and plate targets are responsive (360k mobile, 520k tablet, 720k
  desktop). The same corrected probe settles in **7.740 s**, a 63% reduction, with
  the deterministic camera, 10/10 claims, and reduced-motion completion law intact.

### 2. Four full-viewport canvas backings plus retained density fields

- **Status:** RESOLVED within a bounded allocation policy; target-device pressure remains NOT MEASURED
- **Impact:** High memory risk on constrained/mobile devices; no device memory
  timeline was available, so eviction/jetsam impact is not claimed as observed.
- **Evidence:** desktop DPR is capped at 2 (`js/substrate.js:191-205`). The live
  1280×720 pass produced four 2560×1440 RGBA backings: 56.25 MiB before compositor
  copies. Four retained 720k-cell Float32 density fields add about 10.99 MiB
  (`js/substrate.js:317-352`). The actively developing plate temporarily owns five
  more Float32 grids, ImageData, and an offscreen canvas.
- **Correction:** responsive DPR caps (1.25/1.5/2), responsive bin targets, and
  bounded 90k-cell stratified reading summaries replace retained full 720k-cell
  density fields. Only the visible canvas advertises compositor `will-change`.
- **Observed mobile bound:** at 390×844 and DPR 1.25, four backings total about
  7.84 MiB; the prior DPR-1.6 policy would require about 12.86 MiB at the same
  CSS size. Final target-iPhone memory-pressure certification remains external.

### 3. Every settled viewport resize redevelops all four plates

- **Status:** RESOLVED
- **Impact:** Medium-high because it replays bottleneck 1 after orientation/window
  changes and after mobile browser-chrome height changes.
- **Evidence:** even the explicitly identified height-only path schedules
  `developAll()` after 450 ms (`js/substrate.js:467-476`). That call recomputes the
  native orbit, deterministic anchors, and all plate queues
  (`js/substrate.js:322-331`). The debounce prevents repeated work during one burst,
  but it does not avoid the final full redevelopment.
- **Correction and browser evidence:** when width and effective DPR are unchanged,
  resize updates layout/CSS coverage without calling `developAll()`. A 390×760 to
  390×720 resize preserved every backing dimension, updated every CSS height, and
  never re-entered `EXPOSING`; width/DPR changes still redevelop fail-safely.

### 4. Three published admissions re-run 560k-point screens on the main thread

- **Status:** RESOLVED
- **Impact:** Medium startup responsiveness and evidence latency.
- **Evidence:** one admission scans 280k points for richness and creates another
  280k-point orbit for legibility (`js/manifest.js:123-170`); it may repeat for 64
  nonces (`js/manifest.js:194-202`). Boot verifies current plus two historical
  manifests (`js/site.js:382-397`). `setTimeout` yields between admissions, not
  inside either 560k-point calculation.
- **Correction and measurement:** richness and legibility now share one orbit pass
  and a bounded tuple cache while preserving the original numeric semantics.
  A clean jsc process fell from roughly 72 ms to 39 ms for cold admission; cached
  repeats are effectively zero. Published nonces remain fail-closed comparisons.

### 5. Canonical camera anchors are derived twice during ordinary boot

- **Status:** RESOLVED
- **Impact:** Low-medium startup CPU; simple duplication, not the dominant delay.
- **Evidence:** `boot()` first sets `canonAnch = deriveAnchors(CM.CANON).ANCH`, then
  immediately calls `developAll()`, which calls `deriveAnchors(P)` again while `P`
  is canonical (`js/substrate.js:322-325`, `js/substrate.js:450-463`). Each pass
  constructs a 220k-point deterministic orbit and a density grid
  (`js/substrate.js:71-102`).
- **Measured:** median 16 ms per `deriveAnchors()` in five jsc runs.
- **Correction:** the boot-time canonical camera is retained and handed into the
  initial development path. Forks and width/DPR redevelopments still derive their
  own camera.

### 6. Scroll-time filtered compositing and per-frame style writes

- **Status:** MITIGATED; target-Safari GPU cost remains NOT MEASURED
- **Impact:** Medium on older mobile GPUs, low CPU by design.
- **Evidence:** one scroll frame writes four canvas visibility/opacity/transforms,
  four root variables, the reticle, and gauge HTML (`js/substrate.js:298-315`,
  `js/site.js:132-146`). Twelve reading envelopes can carry masked
  `backdrop-filter`, while glass/chrome/ledger/optics use additional blur surfaces
  (`index.html:359-387`). The implementation correctly avoids scroll-time raster
  deposition and throttles scroll to one rAF, so this remains a profiling target,
  not a confirmed jank defect.
- **Correction:** unchanged tile/root/core/gauge style values are no longer
  rewritten, hidden tiles drop `will-change`, and envelope backdrop blur is disabled
  while the document is in motion. Safari GPU timeline and long-frame sampling
  remain external performance certification, not a repository defect.

### Separate artifact — ignored AWC-OS media portal

`awc-os/` is excluded from Git and from the CytherAI release artifact, so it does
not affect the ranking above. If deployed separately, it requests metadata for two
3.5 MiB videos. The redundant HEAD request for the Arabic video was removed and
replaced with delegated video error handling. Its live route is a hard-coded
external tunnel redirect (`awc-os/live/index.html:6-14`), a separate availability
and privacy boundary.

## Test remediation added

The recent commits had runtime evidence recorded in prose, but no committed
zero-dependency integration entrypoint for cross-page and release invariants.
This audit added:

- `tools/test-site.py`: seven integration tests covering all public navigation,
  local target closure, module order/CSP posture, exact SRI/build/cache identity,
  deploy/service-worker parity, and manifest icon dimensions
  (`tools/test-site.py:100-240`).
- `tools/test-ledger.js`: nine assertions for de-duplication, diligence counting,
  self-report wording, recorded references, erasure, and new-chain digest behavior
  (`tools/test-ledger.js:19-48`).
- `verify.sh`: one fail-fast entrypoint for module parsing, claims, ledger, site
  integration, motion laws, and artifact construction (`verify.sh:13-33`).

The browser-only gap is explicit rather than hidden: service-worker lifecycle,
real rendered contrast, reduced-motion media emulation, and Safari/VoiceOver/mail
handoff still require the matrix in `docs/deploy.md`. Footer clearance and the
height-only resize path were exercised live during remediation; their source-side
contracts are also guarded by the zero-dependency integration suite.

## Verification evidence

| Command / observation | Result |
|---|---|
| Six homepage modules under jsc | PASS, no syntax errors |
| `tools/test-claims.js` | PASS, 8/8 assertions |
| `tools/test-ledger.js` | PASS, 9/9 assertions |
| `python3 tools/test-site.py` | PASS, 7/7 tests |
| `python3 tools/test-motion.py` | PASS, 15 checks |
| `pages/runner.html` in served browser | PASS, 33/33, exitCode 0, mutation-verified |
| Served homepage, 1280×720 | PASS, 10/10, admission verified, no console errors; corrected settle 21.137 s baseline → 7.740 s remediated |
| Served homepage, 320/375/390/430×844 | PASS claims/integrity/footer clearance; no horizontal overflow |
| Height-only resize, 390×760→720 | PASS, backings unchanged; no exposure restart |
| `./deploy.sh` | PASS, 27 files, 1.0 MiB |

## Architecture output

`docs/architecture.md` is now the current change-impact guide. It maps directory
ownership, route/runtime separation, module APIs and boot flow, state/evidence
boundaries, integrity/deployment/offline flow, tests, browser residuals, and the
files that must move together for common changes. `CLAUDE.md` now points to it and
no longer incorrectly says the repository has no tests.
