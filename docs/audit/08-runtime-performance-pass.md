# Runtime performance pass — development off the main thread

**Date:** 2026-09-11  
**Baseline:** `8e31be7` on `visual-pass` (build `E6C04107EED87D9D`); `docs/audit/05` is the prior performance audit (2026-08-13)  
**Mode:** jsc measurement of the pure kernel; four scheduling changes, each gated on state
equivalence; one semantic repair staged behind browser qualification; no CSS touched

## Verdict

The kernel was never the problem — `dsin` is 3.7 ns and `datan2` beats `Math.atan2`. The
problem was **where** it ran: plate development held the main thread for 12 ms of every
frame (72% of a 60 Hz frame, more than a 120 Hz frame) for ~1.25 s of CPU here and an order
of magnitude more on a phone, on every load, width/DPR resize, fork and REDEVELOP; plate 3
alone burned its 34 M-iteration fuse at a 5.8% in-view hit rate. Development now runs in a
Worker behind a protocol (`CytherSubstrate.developServer`) that `tools/test-develop.js`
drives against the direct kernel in lockstep. Three smaller scheduling wastes are removed.
The compositor-side questions (backdrop filters, `plus-lighter`, the global colour
transition) are deliberately **not** touched: jsc cannot see them, and a browser pass must.

Optimization kept exposing authority boundaries. Workerizing found that `developStep` read
the live `P` every step, so a fork nudged while plates 2–3 were still developing bent a
trajectory mid-plate — the object formalized in `docs/audit/07`'s development law was not
actually fixed at job creation. And plate 3's terminal state on landscape frames turned
out to be defined by a computational fuse, not by its deposit target (below).

The acceptance law for every runtime change: **optimization may change scheduling, never
state** — same world, same checkpoint hashes, same terminal raster, same poster
equivalence (`decode(P) == R_N`), same corpus verdict. Only wall-clock and main-thread
occupancy may improve.

## Relation to `docs/audit/05`

| 05 finding | This pass |
|---|---|
| 1 · progressive development + repeated tonemapping | 05 bounded the tonemap cadence (21.1 s → 7.7 s settle). The residual — the deposit loop itself on the main thread — is now off-thread; tonemapping moves with it. |
| 2 · four backings + retained fields | unchanged (`FIELD_TGT` summaries stand); their exposure point is now derived once |
| 3 · every settled resize redevelops | redevelop remains settle-only; the minimap redraw joins the settle timer instead of running per raw event |
| 4 · admissions on the main thread | re-measured: 30 ms + 2 × 24 ms at T+0.5 s; the richness string `Set` is 7 ms of each (a `Uint8Array` grid is bit-identical, richness 15314) — **not taken**, below the noise of development |
| 5 · anchors derived twice at boot | re-measured: ~6 ms — **not taken** |
| 6 · scroll-time filtered compositing | not measurable here — **open**, browser gate |

## Measurements (jsc, Apple M4; a mid-range phone is ~5–10× slower)

| quantity | value |
|---|---|
| `dsin` / `Math.sin`, 5 M calls | 18.4 ms / 20.5 ms |
| `datan2` / `Math.atan2`, 5 M calls | 11.2 ms / 29.9 ms |
| `dsinOrbit` 220 k · `computeOrbit` · `deriveAnchors` | 5.3 · 5.9 · 7.0 ms |
| development, 1440×900 (bins 1073×671): p0 / p1 / p2 / p3 | 35 / 111 / 293 / 814 ms — it 0.9 M / 4.5 M / 12.1 M / 34.0 M (fused) — hit 100 / 26.8 / 14.9 / 5.8% |
| development totals: 390×844 · 1920×1080 · 2560×1440 | 1068 · 1279 · 1263 ms |
| `tonemapInto` 720 k cells, p0 / p1 / p2 / p3 | 7.1 / 6.3 / 3.1 / 4.8 ms |
| `admissionMetrics` cold · `admit(epoch)` ×2 | 29.8 · 23.8 / 23.5 ms |
| `cameraClaim` (re-derives anchors) | 9.6 ms |
| `stateHash` (byte FNV over 2.9 MB; tests only) | 8.4 ms |
| poster PNG: filter-0 IDAT vs adaptive filtering | 393,744 B vs 535,864 B (adaptive is 36% *worse*; 68.4% of pixels are transparent) — filter-0 stands |
| `verify.sh` stages: test-site · test-vaic · test-poster · test-develop | 2.25 s (1.91 s = 3 × `generate-integrity.sh`, ~144 `sed` spawns) · 1.84 s (1.2 s = 6,420 `anchor_sites` regex rescans) · 1.13 s · 1.06 s (`stateHash`) |

## Findings, ranked by impact

1. **Development on the main thread — RESOLVED** (`b5a72cd`). `developServer` in the pure
   surface: `plate` opens a job with params *copied* at open, `advance` runs the fixed-step
   sequence toward a deposit goal under a time budget, `hash` names the checkpoint.
   `js/develop-worker.js` is transport only; where a Worker cannot be constructed (Chromium
   `file://` throws `SecurityError`) or fails to load, the same closure runs inline under the
   old per-frame budget. The presentation law (DEV_MS ease-out, TONEMAP_MS cadence, reduced
   motion, poster swap at equivalence) stays on the main thread unchanged.
2. **`fieldEnergy` re-derived the exposure histogram per call — RESOLVED** (`430f29a`). A
   90 k-cell scan per `.env`, up to twelve per conditioning pass, on every `onChange` — so a
   fork drag paid a dozen scans per pointer event for an immutable field. `summarizeField`
   now derives `expLog` once; exact by construction and pinned as `summary.expLog ===
   exposureLog(summary)`.
3. **Invisible plates presented at 12.5 Hz — RESOLVED** (`7efaa2e`). Off-screen plates paid
   tonemap + `putImageData` + full-viewport high-quality `drawImage` for pixels nobody saw.
   Progressive rasters are now requested only while `observe()` has the tile visible; the
   terminal raster is never gated.
4. **`backdrop-filter: blur(12px)` on eight `.glass` panels and the fixed chrome over two
   moving `plus-lighter` tiles — OPEN.** The `.env` blur is already disabled while
   scrolling; `.glass` is not. Profile in a browser before touching.
5. **Root custom-property writes per scroll frame + `main *{transition:color}` — OPEN.**
   ~340 elements restyle per frame. Test one build with the global transition disabled; if
   the ambient choreography is unchanged at 60/120 Hz, delete it.
6. **Resize storm — RESOLVED** (`391fd22`). `renderCore` (20 k `fillRect`s + a canvas
   reallocation) ran per raw resize event; the camera still follows every event, the
   minimap and any redevelop wait for one 160 ms settle.
7. **Admission richness `Set` of 280 k strings — NOT TAKEN** (7 ms × 3, off the boot path).
8. **Orbit derived twice at boot; `miniMark` 48 k native-`sin` `fillRect`s — NOT TAKEN**
   (~6 ms; ~15 ms).
9. **Verify loop — NOT TAKEN**: `generate-integrity.sh` spawns ~144 `sed` processes; the
   validator's `anchor_sites` rescans whole files 6,420 times. Developer latency only.

## Correctness found on the way

- `developStep(plateDev, P)` read the live `P`: a fork nudged mid-develop bent the running
  trajectory (fixed by copy-on-open, `b5a72cd`).
- `test-motion.py` B10 sliced the "kernel" from `computeOrbit`, *below* `depositBatch`, and
  passed a plate running on `Math.sin` (repaired, `7bbae48`).
- Nothing under `verify.sh` executed CL-06/CL-06c; `tools/test-exposure.js` now does, with
  the tone map exercised as shipped rather than through a mirrored formula.
- `datan2` had no numeric test though `js/manifest.js` claimed one lived in
  `test-develop.js` (now true: 1.05e-11 rad over the canonical orbit).
- The reading-law comments cited ratios the shipped inks no longer produced (rewritten to
  state the law; ratios are verifier-derived).
- A `test-vaic.py` control blanked every receipt's verifier, colliding (build, verifier)
  identities once a verifier-only re-stamp stacks receipts on one build (scoped to the
  current binding).

## Plate 3 — the fuse had become the picture

The aion-v2 grammar has no completion condition ("developing live and never finished").
P8 (`2a8b160`, 2026-07-18) introduced `PLATE_DEP` as the terminal condition and `PLATE_CAP`
as a recurrence ceiling, sized with ~1.3× headroom under `ZOOMS[3] = 6.8`. The ×1.44 ladder
rescale (`fef20c8`, `docs/audit/07`) halved plate 3's in-view fraction and the 34 M fuse
then terminated it on every landscape frame; `07` never mentions the caps.

| frame | old ladder (6.8): iterations to target | shipped ladder (9.8): to target | with 34 M fuse |
|---|---:|---:|---|
| 1440×900 | 26.0 M (hit 9.2%) | 41.3 M (5.8%) | fused at 1.98 M / 2.4 M deposits |
| 1920×1080 | 25.5 M (9.4%) | 40.4 M (6.0%) | fused at 2.02 M |
| 768×1024 | 21.6 M (11.1%) | 35.3 M (6.8%) | fused at 2.31 M |
| 390×844 | 15.8 M (15.3%) | 23.0 M (10.5%) | reached |

The out-of-view iterations are causal predecessors on one trajectory, not rejected samples:
no sampler redesign preserves the object, and per-iteration cost is already the floor.
Repair staged as `74b5cc9` (branch `plate3-target`): `PLATE_CAP[3]` 34 M → 54 M (P8's
headroom over the measured need), the fuse-vs-terminal distinction stated at the constants,
and a verifier that develops every plate at the frames the record names — 1440×900 (the
`07` sweep), 1200×600 (the promotion frame), 390×844 (the browser matrix's phone) — failing
if any reaches its fuse or lands within a fifth of it. Against the previous kernel it fails
on both landscape frames. Cost: plate 3 ≈ 1.0 s of worker CPU here; `verify.sh` ≈ 14 s.

## Commits

| commit | change | build moved | verdict |
|---|---|---|---|
| `7bbae48` | verification: exposure law, development geometry, two repaired controls, comment corrections | yes (comments) | 5 PASS · 0 FAIL · 14 NOT_EVALUATED |
| `b5a72cd` | perf: development in a Worker | yes | unchanged |
| `430f29a` | perf: field exposure point derived once | yes | unchanged |
| `7efaa2e` | perf: contribution-gated presentation | yes | unchanged |
| `391fd22` | perf: resize settles once — **frozen for browser qualification** | yes | unchanged |
| `74b5cc9` | fix: plate 3 target-terminated (`plate3-target`, applies after qualification) | yes | unchanged |
| `9dfe9f4` | chore: Observable-era modules and engine dev source retired into `backup/` | **no** | unchanged |

Every commit carries its five automated receipts; the poster is byte-unchanged throughout.

## Verification evidence

| Command / observation | Result |
|---|---|
| `./verify.sh` at `391fd22` | PASS, 8.1 s |
| `tools/test-develop.js` server ↔ kernel | 20 replies, 15 rasters byte-identical; terminal field equal; four server mutants caught |
| `tools/test-exposure.js` | 21 laws PASS; seven kernel mutants caught |
| `test-motion.py` B10 against a `Math.sin` deposition mutant | FAIL (was PASS before the repair) |
| `./verify.sh` at `74b5cc9` | PASS, 14.2 s; reference-frame verifier FAILs on the 34 M kernel at both landscape frames |
| console anchor for the browser pass | `developServer` at 1200×600 prints density FNV `ef4bf18f` = the promotion log |
| browser qualification (Worker thread, poster swap, REDEVELOP streaming, queued-generation supersession, `file://` fallback, offline, resize, compositor cost) | **pending — owner** |

## Open

1. Browser qualification on `391fd22`; then `git merge --ff-only plate3-target`; then a
   targeted plate-3 regression on the merged build, and CY-SEM-001/002 bound to *that* build.
2. Findings 4 and 5 — decide from browser frame times, one mechanism at a time.
3. Fuse exhaustion outside the reference envelope is not yet observable at runtime:
   `onFrame` could name `done && dep < target`.
4. `js/manifest.js` still cites `content/record.js` (now `backup/graphite-v2/content/`) as
   the source of its merged facts — true as provenance, stale as a path; a comment edit
   moves the build.
5. Verify-loop cleanup (finding 9) once the runtime is qualified.
