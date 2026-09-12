# Production asset promotion log

One entry per asset promoted into the deployment artifact. Studies never ship;
every shipped asset is either **DERIVED** (deterministically produced from
canonical repository state) or **ILLUSTRATIVE** (claim-free imagery whose
status is stated in adjacent HTML). Every entry records the reproduction
command and the output digest; a promoted asset with no receipt is a defect.
`tools/test-assets.py` (a `./verify.sh` stage) re-reads these receipts: every output's
bytes must match its digest and size, every DERIVED entry's state checksum and
canonical parameters must equal the current manifest's, and every icon and plate the
web manifest and the pages name must have an entry — so a manifest edit stales the OG
card and the icons loudly, as the poster already was by `tools/test-poster.py`.

---

## OG-CARD — the link-preview plate

| | |
|---|---|
| Asset ID | IMG-001 |
| Source study | `docs/audit/generation-studies/img/IMG-001-og-composition-study.png` (visual-work, round 1, approved composition) — framing reference only; no study pixel ships |
| Classification | **DERIVED** |
| Command | `python3 tools/render-og.py` (renderer rev 1) |
| Canonical inputs | `CytherManifest.CANON = [-1.7515999999999998, 1.85944, -0.98268, -0.6072]` and admission nonce 0, read from `js/manifest.js` (sha256 `84b0fee171f2029f7494dc4916bf4cb520d2f139da4074f1ba04dd4ac3d878f9`) by executing it under jsc — never hand-copied. State checksum `75D1:89D1`. |
| Method | dsin/dcos orbit recurrence (engine-invariant; Python port verified bit-identical to jsc), plate-0 grammar of `js/substrate.js` verbatim: angular-lobe anchor inks with rot 0.12, log tonemap with gamma 1.5, dark core on light paper, alpha over `#ECF0F4`. 2400×1260 source, 12,000,000 iterations, then exact 2×2 box-mean downsample. The 2× source is never written to disk. |
| Output | `assets/og/og-card.png` · 1200×630 · 355,054 bytes |
| SHA-256 | `bd59c137b1c5eb29bacf9347b149f73a703079c2b61d96233b6c418953ab1d9d` |
| Determinism | Run twice; byte-identical output both runs. |
| Acceptance checks | Left-45% lane and bottom-12% band: every 24px block mean L ≥ 229 (`#E0E6EF` floor) — measured pure paper, min block L 239.4. Core = the lobe-convergence point (the orbit origin, where the four angular ink anchors meet): (0.671 W, 0.505 H), 48px box mean L 170.8 against paper 239.4. Palette: warm 0.00%, off-cold-hue 0.00%, accent (saturated cold hue) 4.58% ≤ 8%. Crops 1.91:1, centered 1:1, centered 4:5: convergence core inside each with ≥ 40px margin; quiet fraction ≥ 30%. |
| Recorded diagnostics | The aggregate deep-ink centroid sits at (938, 271) and the darkest 48px sliver at (990, 210) — the orbit's upper-right rim caustic. The composition core is the convergence point, which is a derived quantity of the plate grammar; the mass asymmetry is the real object's geometry and matches the approved round-1 framing study. |
| Deployment | `deploy.sh` allowlist only. Not in `sw.js` ASSETS: the card is fetched by link scrapers, never by any page — precaching 355 KB for a resource the browser never requests has no offline value. Not in the SRI fingerprint: `generate-integrity.sh` covers the nine JS/CSS resources; images cannot move the build hash. The homepage runtime makes no request for this file. |
| Commit | `88ccafb` |
| Owner sign-off | PENDING |

---

## ICON — the derived mark

| | |
|---|---|
| Asset ID | IMG-002 |
| Source study | `docs/audit/generation-studies/img/IMG-002-icon-study-rev2.png` (visual-work, round 2, accepted as SVG derivation reference) — geometric reference only; no study pixel ships |
| Classification | **DERIVED** |
| Command | `python3 tools/derive-icon.py` (rev 1) |
| Canonical inputs | `CytherManifest.CANON` and admission nonce 0 via jsc from `js/manifest.js`; state checksum `75D1:89D1` |
| Method | The silhouette is the **densest filament of the canonical mark**: dsin-orbit density field at 384-grid (4,000,000 iterations), cells above the 95th percentile of occupied density, largest connected component — the orbit's right rim caustic, a sweeping band with a dense knot. Regularized by Euclidean-disk morphology (close 3 / dilate 16 / open 18; the opening radius constructs the minimum stroke width), hole-filled, traced (Moore), simplified (Douglas–Peucker 2.0), smoothed (Chaikin ×2, DP 0.6), placed into the central 76% of a 512 viewBox. Rasters are scanline even-odd fills of the same polygon, 4×4 supersampled, ink on opaque paper. |
| Outputs | `icon.svg` (replaces the retired warm-gold lambda — closes ADV-001) · `assets/icons/icon-180.png` (apple-touch) · `icon-192.png`, `icon-512.png` (web-manifest, `any` + `maskable`) |
| SHA-256 | svg `884d04d844768cc653ac8315d141966dddee54127053eab705189b019bf2552b` · 180 `7351a474f52eba33eb04d26a96b2136f897bf096e1cb6fc32506e722f85615b0` · 192 `daa09fb19742c55ffd79fe177fdd1d27082b28d8f9e3f55317824565deb939f8` · 512 `24dcbaee5a902979d5edcd6825cb29b5026dded9552d608203f9768241f82998` |
| Determinism | Run twice; all four outputs byte-identical. |
| Acceptance checks | 16×16 single-bit reduction: **1** four-connected component at thresholds 0.25 / 0.50 / 0.75 (the round-2 study split 21+13 at midpoint — this is the test that had to pass). 32×32: 1 / 1 / 1. Minimum stroke width: disk opening at r=25 (floor 50px = 9.8% of viewBox) keeps 99.5% of ink in one component; construction gives ≈54px = 10.6%. Margins ≥ 12% all sides. Circular mask: rmax 200.3 ≤ 256 (no clipping), and ≤ 204.8 — inside the 40% maskable safe zone, so `purpose: maskable` is mechanically true. Monochrome: paper + ink only, no accent anywhere (removability is trivial). Ink coverage 12.3% of viewBox. |
| Deployment | `deploy.sh` allowlist (3 raster additions; icon.svg already listed). Rasters are not precached: `sw.js` ASSETS keeps `icon.svg` (the favicon every page links) — the PNGs are fetched by the OS at install/pin time, not by any page. |
| Commit | `5e3f51a` |
| Owner sign-off | PENDING |

---

## EXHIBIT-A — the constraint boundary

| | |
|---|---|
| Asset ID | IMG-003 |
| Source study | `docs/audit/generation-studies/img/IMG-003-exhibit-a-composition-study.png` (visual-work, round 1) — composition reference only; no study pixel ships |
| Classification | **ILLUSTRATIVE** — the adjacent caption states it: `FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT` |
| Command | `python3 tools/gen-exhibit-a.py` (LCG seed 11, grid 32px) |
| Canonical inputs | None — a fixed algorithm and seed; the SVG is a pure function of the script. |
| Method | SVG, 2560×800 (16:5): `#E0E6EF` ground; 1px hairline grid at ink opacity 0.12; eight open rejected rectilinear fragments (ink, opacity 0.14–0.25) thinning toward the left; exactly one closed axis-aligned cobalt ring — a rectangle with non-overlapping castellation notches, simple by construction. SVG chosen over PNG: rectilinear hairlines are resolution-independent, the file is 3 KB against ~100 KB raster, CSP `img-src 'self'` admits it, and `.svg` MIME is already in the deployment contract. |
| Output | `assets/brief/exhibit-a-boundary.svg` · displayed in `pages/brief.html` §02 Exhibit A above the record type line |
| SHA-256 | `ab3dbd18f85403eafce10c070ffd461e17c248c0d936d2a87fef34b6ad0335ca` |
| Determinism | Pure text generation, no clock, no environment; two runs byte-identical. |
| Acceptance checks | Exactly one accent element; the ring is closed, axis-aligned, spur-free and non-self-intersecting (segment-pair receipt); ring bbox inside the right 40% and clear of the top/bottom 15%; 8 fragments (window 8–12), all open, all axis-aligned, none left of x=640 — the left 25% label lane carries grid only; palette closed over {`#E0E6EF`, `#101620`, `#2036C7`}; no text, no curve commands, no arrows. |
| Deployment | `deploy.sh` allowlist (24 files). Not precached — the brief is not an offline-critical surface and the figure is decoration on it. |
| Commit | `8def89d` |
| Owner sign-off | PENDING |

---

## EXHIBIT-B — the event strata

| | |
|---|---|
| Asset ID | IMG-004 |
| Source study | `docs/audit/generation-studies/img/IMG-004-exhibit-b-composition-study.png` (visual-work, round 1) — composition reference only; no study pixel ships |
| Classification | **ILLUSTRATIVE** — captioned `FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT` |
| Command | `python3 tools/gen-exhibit-b.py` (integer-hash stipple, seed 5) |
| Canonical inputs | None — fixed algorithm and seed. |
| Method | PNG, 2560×800: nine horizontal strata of per-pixel Bernoulli stipple under a deterministic integer hash — accumulation, not gradient; every pixel is exactly one of four colours. Coverage ramp 0.015 → 0.92 top-to-bottom; boundaries are piecewise-linear deposition lines (±9px, control points every 160px); stratum 8 of 9 is thin (48px nominal) and cobalt. |
| Output | `assets/brief/exhibit-b-strata.png` · 247,669 bytes · displayed in `pages/brief.html` §03 Exhibit B above the record type line |
| SHA-256 | `ff344466b0cfb4c48c8326144e4687012bc9b83d25165c0736316feb85c72149` |
| Determinism | Pure integer arithmetic, no clock; two runs byte-identical. |
| Acceptance checks | Nine strata, ink coverage strictly increasing downward (0.015 / 0.040 / 0.089 / 0.159 / 0.259 / 0.399 / 0.549 / 0.698 / 0.921); accent pixels 86,305 in the lower third and **0** above it; every stratum present at both 64px edge columns at ≥ 40% of its interior coverage (no truncation); palette exactly {`#E0E6EF`, `#3A4658`, `#101620`, `#2036C7`} — 4 colours total, which also proves stipple-not-gradient. |
| Deployment | `deploy.sh` allowlist (25 files). Not precached, same reasoning as Exhibit A. |
| Commit | `f8e3fa8` |
| Owner sign-off | PENDING |

---

## EMPTY-PLATE — the 404 emblem

| | |
|---|---|
| Asset ID | IMG-005 |
| Source study | `docs/audit/generation-studies/img/IMG-005-empty-plate-candidate.png` (visual-work, round 1) — reference only; the 1024px study is not upscaled and does not ship |
| Classification | **ILLUSTRATIVE** — decorative on `404.html` (`alt=""`); the explanation is live HTML |
| Command | `python3 tools/gen-empty-plate.py` (LCG seed 3) |
| Canonical inputs | None — fixed algorithm and seed. |
| Method | Transparent SVG, 1200×1200: one square hairline frame (720×720 = 60%, ink at 0.16, 2px stroke) and 200 fixed-seed stipple deposits entering from the frame's lower-left corner and dying out before the center. No accent — nothing is verified on an empty plate. CSS supplies the cold-paper ground. |
| Output | `assets/error/plate-empty.svg` · displayed on the new `404.html` |
| SHA-256 | `274b9c7ef354b50a50e8c840a9a03558b8ffad5b85019d9d88dad93f6641ab65` |
| Determinism | Pure LCG; two runs byte-identical. |
| Acceptance checks | 200 deposits (window 180–220), all inside the frame; nearest deposit 133px from center (floor 110) — the center is genuinely empty; drift density strictly decreasing (95/54/51 per band); one stroked element (the frame); no accent; no opaque ground. |
| Deployment | `deploy.sh` allowlist (27 files, with `404.html`). `404.html` joins `generate-integrity.sh` HTML_FILES — it carries the build-hash meta and the stylesheet SRI like every shipped page; this does not move the build hash (the fingerprint is the nine JS/CSS resources). Not precached: the offline reader is served by the worker's cached routes; a styled 404 is origin behaviour, which must be verified live (docs/deploy.md §3–4). |
| Commit | `bc4074c` |
| Owner sign-off | PENDING |

---

## SURFACE-TERMINAL — the promoted terminal exposure

| | |
|---|---|
| Asset ID | IMG-006 |
| Source study | None. The image is not composed; it is the plate the page's own kernel develops. |
| Classification | **DERIVED** |
| Command | `python3 tools/promote-poster.py` — which runs `jsc js/manifest.js js/substrate.js tools/promote-poster.js` and encodes what comes back |
| Producer binding | The pixels come from the repository's substrate kernel, not a second renderer: `js/manifest.js` sha256 `df0ad2da86d3011a4e86dcf7c5b42498acdfb67cc084e27d3abeb286bef6e20b`, `js/substrate.js` sha256 `45fbe61e865ffbbdda9b9d166750fb2c8eb7a4f6dc49b43c5d7c22615565fa6d`, `tools/promote-poster.js` sha256 `79f7c2e1ab45377fe1713e6c83880b5a0a3a78b4b943ecb08b0275f66811cee2`. The Python step is a lossless container writer and receipt printer; it computes no pixel. |
| Provenance chain | manifest → kernel → terminal development state D_N → terminal raster R_N → encoded poster P. Recorded below at every edge. |
| Canonical inputs | `CytherManifest.CANON = [-1.7515999999999998, 1.85944, -0.98268, -0.6072]`, admission nonce 0, state checksum `75D1:89D1`, epoch 3 — read by executing `js/manifest.js` under jsc, never hand-copied. |
| Method | Plate 0 (`ZOOMS[0]` 1.3, `PLATE[0]` anchor inks, rot 0.12, and the luminous exposure `floor` 0.16 / `gain` 0.65 / `satQ` 0.997) developed by `developStep` at the fixed `DEV_BATCH` of 60,000 iterations to its terminal state, then `tonemapInto` — the same function the page calls — into a `Uint8ClampedArray`, whose round-half-even clamping is part of the exposure law. Every recurrence is `dsin`/`dcos`/`datan2` (§8.1), so D_N and R_N are engine-invariant: jsc and Chrome produce the identical raster (measured 2026-09-09, rgba FNV `5f13f462` at a 800×343 probe frame). Plate 0 is now the LUMINOUS end of the exposure order: it emits onto the unexposed field rather than depositing ink on paper, so the promoted raster is mostly transparent and its alpha carries the accumulation. `#poster` composites it `plus-lighter`, exactly as the tile it stands in for, or the swap at D_N would step in brightness by the ground beneath it. |
| Reference frame | 1200×600. A real viewport frame whose bin raster is exactly `BIN_TGT` (720,000 cells) — the most the runtime ever develops — at the widest aspect the page presents it. |
| Terminal state | step 15 · 900,000 deposits · 900,000 iterations · max density 128 · density hash (FNV-1a over the field and counters) `ef4bf18f` |
| Terminal raster R_N | 1200×600 RGBA · sha256 `c3acb1b07cc336145e2f40e91f0056745ef686cc18c1b423f1969896c302c190` |
| Encoder | `tools/pngout.py write_png(alpha=True)` — PNG colour type 6, 8-bit, filter 0 on every row, zlib level 9, no ancillary chunks. Lossless by construction: the poster is the canonical representation of a generated plate, not a bandwidth optimisation, so there is no gap between "the plate" and "an approximation shown until the real one arrives". |
| Output | `assets/plate/surface-terminal.png` · 1200×600 · 393,801 bytes |
| SHA-256 | `d28fcea417bca3fb881449ba5e15a8c4848337fb063a0233fa9f1f810df94298` |
| Determinism | Run twice; byte-identical output both runs (`tools/test-poster.py`). |
| Acceptance checks | `python3 tools/test-poster.py`, five gates: producer determinism; **decode(P) == R_N pixel for pixel** (the load-bearing proof — not an equality between the PNG digest and the kernel's FNV checkpoint, which identify different objects); a change to any declared derivation input (`normalizeManifest`: epoch, derived, revision, disclosed, indexed, controlled, validation, not_claimed) moves the raster and makes these bytes stale, while a presentation-only manifest field does not; a one-bit pixel edit, a corrupted file, and a substituted valid image (`og-card.png`) each fail verification; the promotion log and deployment contract record this artifact. |
| Presentation | A CSS `background-image` on `#poster` inside `#world`, under the tiles, shown only for viewport aspects in [1, 2] — the window where a `cover` fit **is** the exact crop the developed plate would show, because vertical world extent is constant across landscape frames and horizontal extent scales with aspect. Outside that window it is not shown at all, and because a `display:none` element's background is never fetched, the aspect window is also the download rule. `js/substrate.js` removes it the moment plate 0 reaches D_N and never restores it: a fork or a redevelopment is a different world and the poster cannot speak for it. |
| Deployment | `deploy.sh` allowlist (28 files). **Not** in `sw.js` ASSETS: 394 KB at install time to save a few hundred milliseconds on a warm cache is a bad trade (the file grew with the denser plate of `docs/audit/07` and again with the luminous exposure — a bigger poster simply wins the race less often, which is the intended failure mode), and its absence degrades exactly to the previous behaviour — the reader's own plate develops. On a cold or slow connection the poster loses the race and is removed before it paints, which is the intended failure mode. Not in the SRI fingerprint (images cannot carry SRI); it does move the build identity, which since 2026-09-08 is a projection of every served byte. |
| Commit | promoted on branch `visual-pass`; `git log --follow -- assets/plate/surface-terminal.png` names the commit |
| Owner sign-off | PENDING |

---

## MOT-001 / MOT-002 — motion conformance (no asset; no implementation change)

The two accepted motion studies are verification references. The shipped
implementation was checked against their laws by `tools/test-motion.py`
(13 mechanical assertions) and **required no change**:

- **MOT-001, the ink flip** — bistable with a 0.09 hysteresis gap
  (`READING` read from `js/substrate.js` under jsc); the retained-state
  machine in `js/site.js` is authoritative; zero border-radius anywhere in
  `index.html`; membrane softness is `mask-image` attenuation; none of the
  43 `data-ink`/`data-phase` rules moves layout — colour and background
  only; the flip is a 0.25s controlled crossfade. No illegible interpolated
  midpoint exists in the model: the storyboard's panel-3 crossfade wording
  was retired in round 2, and the implementation is what the study was
  corrected toward.
- **MOT-002, plate development** — the exposure order runs luminous → ink,
  and the two kinds are laws in opposite senses. The INK plates (2–3)
  darken monotonically with density for every anchor at exposure ceilings
  10/100/1000 and never exceed paper luminance — ink cannot emit. The
  LUMINOUS plates (0–1) brighten monotonically over the unexposed field,
  deposit nothing at all below their declared threshold, and are bounded
  by their own white core. The mirror names the plates by kind, not by
  index: the earlier mirror was pinned to indices 0–1 and kept reporting
  PASS after those plates became luminous, testing nothing.
  the cobalt anchor is hue, not luminance (L 60 vs paper 239); the shipped
  plate render (`assets/og/og-card.png`, same grammar) shows a radial
  profile rising monotonically out of the core — no bloom ring
  (165→207→216→220→222); reduced motion develops whole plates and
  tonemaps only at completion; development never touches the camera
  anchors. The monotonic-core and radial-profile receipts from the
  round-2 verification harness now live in the maintained tree as
  `tools/test-motion.py`.

Run: `python3 tools/test-motion.py` — exits nonzero on any breach.
