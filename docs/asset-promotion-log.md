# Production asset promotion log

One entry per asset promoted into the deployment artifact. Studies never ship;
every shipped asset is either **DERIVED** (deterministically produced from
canonical repository state) or **ILLUSTRATIVE** (claim-free imagery whose
status is stated in adjacent HTML). Every entry records the reproduction
command and the output digest; a promoted asset with no receipt is a defect.

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
| Commit | *(this commit)* |
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
| Commit | *(this commit)* |
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
| Commit | *(this commit)* |
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
| Commit | *(this commit)* |
| Owner sign-off | PENDING |
