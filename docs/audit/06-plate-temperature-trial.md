# Plate temperature trial — a falsified mechanism

**Date:** 2026-09-08  
**Baseline:** scratch copy of build `9C6CEDC92F65369C` (branch `visual-pass`, canonical state `75D1:89D1`)  
**Mode:** research experiment under declared constraints; **no operator enters the tree**

## Verdict

**REJECTED — the mechanism does not transfer to the plate grammar.** A plausible
transfer from a state-of-the-art hero (a spiral point cloud whose perceived mass comes
from sparse chromatic asymmetry plus a luminance hierarchy) was tested on the CytherAI
exposure plates and falsified by both pixel statistics and the side-by-side comparison.
The renderer's existing luminance saturation (core onset 0.68, earned only where density
saturates) already supplies the focal hierarchy; added chroma and bloom either sit at the
development noise floor or damage focal hierarchy and procedural character.

## Hypothesis

Sparse chromatic asymmetry + luminance hierarchy → perceived physical mass. Astra's
field: 12,000 sprites, 85 % cool / 15 % ember by weight, bloom threshold 0.08, on black.

## Constraints declared before touching the renderer

1. Temperature structurally derived: eligibility from the density field (density over its
   7×7, twice-blurred neighbourhood, κ > 1.6; strong 1.15); manifest entropy
   (`fnv("temperature:" + checksum)`) resolves only the per-cell dose.
2. Bloom tail-only: `B = blur(ρ · 1[ρ > Q₀.₉₂])`, radius 2, two passes; emission toward the
   core on dark plates, ink only on light plates (never above paper).
3. No additional runtime visual authority: operators applied once, at each plate's final
   tonemap; nothing per frame.
4. Comparison before choice: same manifest, viewport (1440×900), scroll position, optics
   and phase; baseline beside candidates at 1:1.

The 85/15 distribution was not targeted numerically. A warm-ramp variant was run for
comparison only; the design record forbids warm tones (`docs/audit/03`, palette rule).

## What the operators touched

| plate | deposited cells | crest κ>1.6 | crest κ>1.15 | bloom (conservative) | bloom (strong) |
|---|---:|---:|---:|---:|---:|
| 0 | 159 566 | 16.6 % | 35.0 % | 23.2 % | 35.3 % |
| 1 | 248 864 | 16.9 % | 37.0 % | 19.9 % | 28.3 % |
| 2 | 316 337 | 13.4 % | 33.8 % | 20.1 % | 28.7 % |
| 3 | 490 931 | 19.6 % | 41.6 % | 14.3 % | 24.5 % |

Crest eligibility is not sparse. A Clifford density field is filament almost everywhere,
so a structurally derived asymmetry cannot be sparse without an arbitrary dose — the
"artistically sprinkled" outcome the constraints excluded.

## Screenshot difference to baseline (max channel per pixel)

| position | conservative mean Δ | px Δ>8 | strong mean Δ | px Δ>8 | warm+strong mean Δ | px Δ>8 |
|---|---:|---:|---:|---:|---:|---:|
| hero (plate 0, surface) | 0.66 | 2.31 % | 3.60 | 6.98 % | 3.82 | 7.58 % |
| definition (plates 0–1) | 0.69 | 1.95 % | 3.77 | 10.26 % | 3.96 | 10.34 % |
| measurement (plate 2, flip, BALANCED) | 0.32 | 0.18 % | 1.44 | 3.57 % | 1.59 | 3.99 % |
| measurement, READ | 0.22 | 0.06 % | 0.98 | 2.62 % | 1.09 | 2.81 % |
| floor (plate 3, core) | 1.40 | 4.66 % | 7.29 | 11.97 % | 7.71 | 12.43 % |

Noise floor from development non-determinism (adaptive batch cadence at the time):
mean 0.1–0.3, < 0.03 % of pixels above 8. The conservative candidate sits at or near
that floor everywhere but the floor plate.

## Judgement against the declared criteria

- **Apparent mass** — none gained. A halo on a filament is a blur; an ink halo is a smudge.
- **Focal hierarchy** — worse at strength, unchanged at the conservative dose.
- **Procedural character** — lost at strength: the floor plate's tail saturates into flat
  cut-outs with dark holes.
- **READ interference** — strong variants add field behind the validation panel in the
  flip phase; conservative changes 0.06–0.18 % of pixels there.
- **Inevitability of warm points** — unattainable: ink over paper reads brown-grey; on dark
  plates warmth would recolour 20–40 % of the filaments.

Two recorded laws would also be violated by adoption: no warm tones / no glows
(`docs/audit/03`) and B4 in `tools/test-motion.py` (the shipped plate's radial profile
rises from the core with no bloom ring).

## Method note worth keeping

The first capture pass reported "subtle differences" between variants. Instrumentation
(per-plate crest/bloom cell counts) showed the operators had not executed at all:
`URLSearchParams` decodes `+` as a space, so `?v=struct+bloom` arrived as one unknown
token. The perceived differences were development variance. The verdict above rests on
the instrumented pass only. The same variance is the reason the next work item makes
the development trajectory deterministic (fixed-step development; cadence chooses which
prefix is displayed, never what it contains).

## Disposition

No renderer code from this trial is retained. The 1:1 comparison board (four strips,
statistics, verdict) is the owner's private artifact
`https://claude.ai/code/artifact/f4c9ee79-6890-414e-b34f-66e808be27ba`.
