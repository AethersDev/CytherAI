# Mark legibility sweep — the tone curve and the zoom ladder

**Date:** 2026-09-09  
**Baseline:** build `B2F25BCB98E56EDC` on `visual-pass`  
**Mode:** parameter sweep on a scratch copy, laws checked per variant, one decision taken

## Why

Seven commits of provenance and determinism work had produced no visible change, and
the owner said so. The diagnosis was not chroma — that had already been falsified in
`docs/audit/06` — but two constants that decide whether the mark can be seen at all:

- the tone curve `L = sqrt(L) * L` (gamma 1.5 on log density) in `tonemapInto`, which
  put a typical filament at **16% alpha**: the density field was computed and then
  discarded at the last step;
- the far-field zoom `ZOOMS[0] = 0.9`, which framed the entire orbit as one soft ball,
  so the filament structure existed but was never legible.

Measured first: READ, BALANCED, WORLD and an artificially contrast-boosted render of
the shipped page are nearly indistinguishable. No optics mode could fix this.

## Sweep

Gamma {1.5, 1.2, 1.0, 0.8} × far-field zoom {0.9, 1.3, 1.8}, hero and floor, 1440×900.
The zoom multiplier scales the **whole ladder**, so the descent keeps its log-spaced
ratios (2.11, 1.89, 1.89) rather than collapsing its first leg.

| gamma | B1 monotonic | B2 no emission | alpha at L=0.30 | alpha at L=0.60 |
|---|---|---|---:|---:|
| 1.5 (was) | PASS | PASS | 39.8 / 255 | 112.6 / 255 |
| 1.2 | PASS | PASS | 57.1 / 255 | 131.2 / 255 |
| **1.0** | **PASS** | **PASS** | **72.7 / 255** | **145.3 / 255** |
| 0.8 | PASS | PASS | 92.5 / 255 | 161.0 / 255 |

Claims held 10/10 in all twelve variants.

## Legibility cost

Contrast measured at the pixels where glyphs actually render (rendered screenshot
minus text-hidden screenshot, glyph core only), not at the darkest pixel of a text
block — an earlier framing of that measurement sampled inter-line gaps and reported a
failure that does not exist.

| variant | hero paragraph, median | section heading, median |
|---|---:|---:|
| gamma 1.5 · zoom 0.9 (was) | 3.17:1 | 12.18:1 |
| gamma 1.2 · zoom 1.3 | 3.18:1 | 11.28:1 |
| **gamma 1.0 · zoom 1.3** | **3.12:1** | **10.72:1** |
| gamma 1.0 · zoom 1.8 | 3.19:1 | 11.40:1 |
| gamma 0.8 · zoom 1.3 | 3.11:1 | 10.06:1 |

A louder mark costs about **2%** of rendered text contrast. The absolute values are
dominated by antialiasing at device pixel ratio 1 and do not settle an AA verdict in
either direction; they are comparable across variants, which is what the decision needed.

## Decision — gamma 1.0, far-field zoom 1.3

Gamma is the smaller lever and reads most on the dark plates. Zoom is the larger one:
at 1.3 the mark becomes a structured object with visible arcs and caustics.

**Zoom 1.8 was rejected on doctrine, not taste.** The hero states the mark is
*"observed from far — its own sparse periphery, not decoration."* At 1.8 the frame is
filled edge to edge with the dense interior; it is no longer a periphery observed from
far, and the descent has nowhere left to go. 1.3 keeps the object bounded with paper
around it.

Gamma 1.0 is the identity, so the curve is removed rather than reparameterised: the
tone map is now normalized log density, and `fieldEnergy` — which conditions the
legibility envelope — reads the same tone the plate deposits, as it always should have.

## Consequences recorded

- The promoted terminal exposure was invalidated and regenerated; `tools/test-poster.py`
  caught it, which is the machinery working. The asset grew 251,884 → 393,585 bytes with
  the denser plate. It is still not precached: a bigger poster simply wins the first-paint
  race less often, and losing it degrades to the reader's own development.
- `tools/render-og.py` still renders `assets/og/og-card.png` with the gamma-1.5 curve in
  its own Python port of the plate grammar. That divergence is **open**: the link-preview
  card is now a lighter exposure than the site it previews. It is a pre-existing second
  renderer authority, and regenerating it would have to re-clear that asset's own
  acceptance checks (paper-lane luminance floor, core luminance, accent fraction).

## Resolved after review — the reading laws are split, not widened

CL-06 and CL-06c compute contrast against `bgRgbAt(d)`, the ambient colour token, and
never against the composited ground that includes the plate drawn behind the text. Every
variant in this sweep reported an identical `worst 4.51:1` because the plate is not in
the model at all. The claim read "reading ink ≥4.5:1 at every depth" and measured a
ground the reader never sees on its own.

The existing predicates were **narrowed to the proposition they actually prove** rather
than adjusted to approximate the composited ground:

- `CL-06` / `CL-06c` — *ink ≥4.5:1 on the AMBIENT ground, every depth*. Unchanged
  arithmetic, complete over the declared depth domain, and now saying so.
- `CL-06R` — *ink ≥4.5:1 over the plate, where text is in view*. A separate, bounded,
  environment-scoped measurement: for each reading element in the viewport it samples
  the retained density field beneath that element, composites the dominant plate's core
  ink at the peak tone under it — the most extreme ink, so the bound errs against the
  page — and measures the element's own computed colour against the result. It is taken
  before the envelope blur and any panel material, and it prints its scope (elements in
  view, viewport, phase, optics) beside its value. It never claims "at every depth",
  because a live sample cannot.

A live page claim was built for the second proposition and **rejected before shipping**.
The page cannot read its own composited pixels — `#world` opacity, the tile crossfade, the
envelope's backdrop filter and the panel materials are all invisible to script — so the
predicate had to model the ground from the retained density field. Checked against the
rendered measurement already on record (`docs/deploy.md`, worst 4.63:1 at the previous
build), the model reported 1.04:1: it would have put a permanent, false ✕ on the floor.
Overclaiming invalidity is still overclaiming. The suite stays at `CLAIMS n/10`, and the
composited-ground proposition became `CY-SEM-003` in the corpus — a `BROWSER_HARNESS`
obligation with `SAMPLED` coverage, `NOT_EVALUATED` for this candidate, whose first
evidence is recorded in `docs/deploy.md` §5b.

That evidence says the obligation would **FAIL as sampled**: six of eighteen samples carry
background beneath text below 4.5:1, worst 1.00:1 on mobile `.d-body`. Run against the
build before this change, the same harness finds the same holes at nearly the same worst
values — 1.00:1 on that element there too — with a smaller affected area. The defect is
pre-existing and this change widened it. Its structural cause is that `.env` wraps zone
labels and section headings while the reading paragraphs sit directly on the plate; the
tone curve is the amplifier, not the hole.

## Accent share — measured, because the tone change moves it

Removing the gamma raises the saturated cobalt anchor faster than the neutral ones, so
accent share had to be measured rather than assumed. Over the plate region of the hero
(no chrome, no text, no accent-coloured controls):

| variant | lit | accent | accent / lit |
|---|---:|---:|---:|
| gamma 1.5 · zoom 0.9 (was) | 20.91% | 4.53% | **21.67%** |
| gamma 1.5 · zoom 1.3 | 46.08% | 3.52% | 7.65% |
| gamma 1.2 · zoom 1.3 | 48.06% | 5.76% | 11.98% |
| **gamma 1.0 · zoom 1.3 (shipped)** | 49.08% | 8.58% | **17.47%** |
| gamma 0.8 · zoom 1.3 | 49.87% | 12.84% | 25.75% |

Zoom dilutes accent by revealing neutral filaments; gamma concentrates it. The shipped
combination carries a **lower** accent share than the state it replaced, so "the page
reads monochrome until something is true" is better served, not worse.

## The OG derivative — attempted, reverted

`tools/render-og.py` was rebuilt at gamma 1.0 and **failed its own acceptance gate**:
accent 9.12% against an 8% budget. Its framing is fixed by `FIELD_W`/`LANE_X` and gets
none of the zoom dilution the page gets, so accent share of lit pixels doubled
(19.58% → 38.98%) while lit coverage was unchanged at 23.39%. Everything else passed
(lane floors 239.4, warm 0.00%, off-hue 0.00%, core L 144.5).

The change was reverted. A promoted asset that fails its receipts is not promoted, and
raising the budget to admit it would make a real failure disappear. The card therefore
still carries the gamma-1.5 curve and is a lighter exposure than the site it previews.
Closing that properly means re-composing the card at a framing matching the page's new
zoom and re-clearing its checks — a composition decision against an approved study, and
the owner's to take.
