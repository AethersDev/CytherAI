# 03 — Visual System Analysis

**Derived from:** commit `02deb5c` — `index.html` (inline style block, lines 16–379), `js/substrate.js` (plate + ambient constants, lines 19–41, 137–157), `css/cytherai.css`, the five subpages, `icon.svg`, and the design record referenced by CLAUDE.md.
**Legend:** statements tagged **[E]** are direct repository evidence (token values, line-cited rules, executed measurements). Statements tagged **[I]** are interpretation — my reading of intent, defensible but not provable from the code alone.

---

## 1. Brand and product impression

**[E]** The homepage renders no images, loads no fonts, and draws its entire background from one mathematically-derived object whose four parameters are digests of the public manifest (`js/manifest.js:181-195`). Claims about the page execute as predicates against the page (`js/claims.js`). The footer prints a governing law ending *"Nothing is stated that is not checked"* (index.html:598).

**[I]** The resulting impression is not "startup website" but **instrument**: a metrological document that measures itself while you read it. The nearest genre relatives are a laboratory notebook, an observatory plate archive, and a classified-document register — not SaaS marketing. Authority is communicated through restraint, determinism, and self-verification rather than through imagery or persuasion. This identity is coherent, rare, and load-bearing: every visual decision below either serves it or (in the few flagged cases) betrays it.

**[E]** Two registers coexist deliberately (CLAUDE.md architecture section): the homepage is *the world* (ambient, deep, kinetic-by-scroll); the subpages are *"flat, cold, static"* (`css/cytherai.css:1-8`) — the public record around the world.

---

## 2. Typography hierarchy

**[E]** Two families only, both system-resident (zero webfonts):
- `--mono: 'SF Mono', Menlo, 'Cascadia Code', 'Courier New', monospace` (index.html:26; cytherai.css:24)
- `--display: system-ui, -apple-system, 'Segoe UI Variable Display', 'Segoe UI', sans-serif` (index.html:27)
- Subpages add `--font-serif: Georgia, 'Times New Roman', serif` used only for brief.html's exhibit titles and section titles (cytherai.css:26, 79, 103) — an archival-document voice.

**[E]** The homepage scale:
| Role | Spec | Source |
|---|---|---|
| Thesis (h1) | `clamp(38px, 5.6vw, 72px)`, weight **250**, line 1.05, tracking −.015em | index.html:80 |
| Stratum head (h2) | `clamp(26px, 3.6vw, 46px)`, weight **300** (variable: `--hw` 280–350 by phase) | :72, :345-350 |
| Ghost (sealed) | `clamp(34px, 6.4vw, 84px)`, weight **200**, at 10–24% ink alpha | :192 |
| The law | `clamp(22px, 3vw, 38px)`, weight 300→**350 at rest** | :218, :352 |
| Body/dek | 14–15.5px sans, line 1.7–1.75 | :84, :104 |
| Metadata | 8.5–11px mono, letter-spacing .08–.28em, frequently uppercase | throughout |

**[E]** Weight is kinetic and semantic: the pointer's proximity drives glyph weight 250→740 on the thesis (`js/site.js:163-177`); hover sends a weight wave (300→820 gaussian) down system titles (`js/site.js:196-208`); heading weight rises ~30 units when the reader comes to rest (index.html:350) — all suppressed under reduced motion and in READ optics. **[I]** Weight functions here the way color functions elsewhere: it is the page's *attention* variable. Any new asset or UI that needs emphasis should reach for weight and spacing before color or size.

**[E]** Mono is never body text on the homepage except in deliberately "instrument" blocks (tables, manifest, ledger, strip). Sans is never used for metadata. The division is strict and consistent.

---

## 3. Color tokens and contrast relationships

**[E]** The homepage has *no static palette* — four ambient keyframes interpolated by scroll depth (`js/substrate.js:20-23`, locked by PRODUCTION_PLAN §4.1):

| Depth stop | `--bg` | ambient ink | accent |
|---|---|---|---|
| 0 far-field | `#ECF0F4` cold paper | `#101620` | `#2036C7` |
| 1 | `#B9C3D2` | `#131A26` | `#2A48D6` |
| 2 | `#3A4658` | `#DDE6F2` | `#5F7BFF` |
| 3 core | `#070A10` near-black | `#C7D2E4` | `#7FA0FF` |

Panels: white-glass `rgba(255,255,255,.60)` → dark-glass `rgba(10,15,23,.55)`. **[E]** Reading ink is *not* the ambient ink: it is bistable (`#101620` ↔ `#E3EAF4`) with hysteresis (flip down at depth 1.44, up at 1.35), grounded through the flip on an absorptive membrane `rgba(16,22,31,.82)` (`js/substrate.js:143-147`, index.html:294-326). CL-06 asserts ≥4.5:1 for this primary ink at every depth — executed worst case 5.33:1.

**[E]** Accent discipline: `#2036C7` (and its depth ramp) marks *state only* — holding claims, admitted programs, verified values, focus, links-as-actions (CLAUDE.md register rules; cytherai.css:5-7). One error red exists on subpages (`--refuse:#B23A2E`, cytherai.css:22) plus a green used only in contact's success feedback (`#0C7C6F`, contact.html:256 — inline, not tokenized **[E]**; a minor stray).

**[E]** Subpage palette is the frozen surface of the homepage's depth-0 frame: paper `#ECF0F4`/`#F3F6FA`/`#E0E6EF`, ink `#101620`/`#414A5B`/`#6B7688`, hairline `color-mix(#101620 14%)` (cytherai.css:10-22).

**[E, executed]** Contrast structure: primary ink AA-proven at all depths; the secondary mono layers (28–72% ink alpha) measure 1.6–4.3:1 in parts of the descent — audit finding A11Y-001, with a design-preserving fix planned. **[I]** The four-alpha hierarchy (≈80 / 70 / 58 / 45%) is a genuine system — "epistemic distance rendered as ink density" — and should be preserved as *ordering* while its floors rise.

---

## 4. Grid, spacing rhythm, and density

**[E]** Homepage: single centered column, `max-width:1160px`, side padding 28px (20px ≤900px), strata separated by `padding:15vh` (12vh mobile) (index.html:68, 370-372). Hero is its own 900px column at 100vh. Content max-widths tighten by role: defs 760px, ladder/instrument/measurement 860px, clearance 1000px, manifest 540px, epochs 660px. **[E]** Above 1100px, sections shift left or right into their plate's *quietest column third* — the corridor system reads the actual rendered density field (`js/substrate.js:370-384`, `js/site.js:85-100`, index.html:355-358). **[I]** This is the most unusual layout mechanism in the repo: negative space is *computed, not composed*. Any generated imagery must respect the same principle — density yields to the reading lane.

**[E]** Vertical rhythm inside strata uses viewport units (2.2–8vh gaps), not a fixed baseline grid. Subpages use a plainer rhythm: 1000px container, 24px gutters, 56px section padding, hairline rules between sections (cytherai.css:48, 65, 71).

**[E]** Density profile: instrument-dense clusters (tables, manifest rows at 8–11px mono) floating in very large quiet fields (15vh strata gaps, 100vh hero, 72vh sealed stratum). **[I]** The page breathes like a plate archive: sparse far-field, dense filament core — and the typography mirrors the substrate's own density curve.

---

## 5. Component geometry, borders, radii, shadows, surfaces

**[E]** Radius: **zero, everywhere, on the homepage.** Not one `border-radius` in index.html. Subpages: three stray inline radii (contact.html:129 `4px`, :181 `8px`; security.html:40 `4px`) — inconsistencies, flagged ARCH-003.
**[E]** Borders: 1px hairlines only, always ink-derived translucency (`--hair`: 16% ink; subpage `--rule`: 14%). Structural emphasis = 2px left border in accent (proof fragments, exhibit outcomes — cytherai.css:87, 104). Featured card = accent full border (index.html:210).
**[E]** Shadows: none on the homepage or subpages. One inset bezel on runner.html's output panel (its own local style).
**[E]** Surfaces: translucent panels + `backdrop-filter: blur(8–12px)` are the homepage's only elevation device (`.glass`, `.chrome`, `.strip`, ledger — index.html:74, 49, 278, 265); panels *phase-change* to dark glass at depth (index.html:319-326). Subpages are fully opaque — elevation via one-step paper tints (`--paper-lifted`, `--paper-dense`).
**[I]** The geometry language: *documents and instruments have edges, not pills.* Softness is expressed through translucency and blur, never through rounding or shadow.

---

## 6. Image and illustration language

**[E]** There are no raster images anywhere in the shipped site. The homepage's colophon states "No webfonts, no CDNs, no images" (index.html:634). The only figurative assets are: the plate-rendered orbit itself (four exposures, angular-lobe ink deposition, log tonemap — `js/substrate.js:25-39, 213-265`), the point-cloud minimap, the epoch chips (16k-point mini-orbits — `js/site.js:330-339`), the boundary instrument's grid-and-path canvas, and `icon.svg`.
**[E]** `icon.svg` is off-register: warm paper `#E7DFD1`, gold-brown `#7A5B1B`, Georgia italic λ — the retired lambda-crown identity (audit ADV-001).
**[I]** The de facto illustration grammar, derivable from the plate renderer: **accumulated density fields** — hundreds of thousands of deposits, hue owned by angular region (four anchor inks per plate, one lobe carrying the accent), luminance from log-density with a gamma-1.5 curve, cores earned only where density saturates (light plates deposit ink; dark plates emit light). Line work appears only as 1px hairline grids and 2px accent paths (the instrument canvas). This grammar — *fields earned by iteration, lines as measurement* — is the house illustration style, and the generation pack in `04` is written to it.

---

## 7. Motion language

**[E]** Every motion is either **scroll-linked** (camera transform/opacity across four pre-rendered tiles — zero rasterization per frame, `js/substrate.js:289-305`), **pointer-linked** (weight field, waves), or a **state settle** (at-rest world dims to 0.72 over 0.6s and returns in 0.25s — "the world yields slowly and returns fast", index.html:298-301; heading weight settles +30). One shared rAF loop sleeps after 40 idle frames (`js/site.js:21-30`). The ink flip is a 0.25s controlled crossfade, never a flash (index.html:293-297). Reduced motion: no field/waves, whole-plate appearance, instant instrument runs.
**[I]** There is no autonomous animation anywhere — nothing moves unless the reader moves. Motion is *observation feedback*, not decoration. Any motion concept must obey this: reader-caused, physically-plausible (exposure, focus pull, settle), interruptible, and absent at rest.

---

## 8. Responsive composition

**[E]** Breakpoints: 1100px (corridors on), 900px (single-column grids, tighter padding, core minimap tucks in), 760px (ladder stacks), 640px (gauge/strip shrink, fork status hides, ledger docks full-width, envelope blur reduces) (index.html:53, 63, 105, 117, 286, 355-378; cytherai.css:157-163). Fixed chrome at small sizes: header strip (top), serial strip (bottom), optics (bottom-right, raised to 104px), ledger (bottom-docked), minimap (right edge). **[E, not executed]** No browser test was run at 390px; the stacking of four fixed elements at ≤640px is the highest-uncertainty layout zone (flagged in the plan's manual checklist).

---

## 9. Recurring motifs (the identity kit)

**[E]** — every one of these appears ≥3 times in the shipped site:
1. **Mono microlabel**: 9–11px, uppercase, .12–.28em tracking, with `·` separators (`STRATUM 02 · ARCHITECTURE · MODE INSPECT`).
2. **Status glyph triad**: `●` verified/log · `◌` external · `—` not disclosed (index.html:511-514, table marks).
3. **Key→value manifest rows**: hairline-separated, key in quiet ink, value right-aligned, accent when verified (`.m-row` pattern).
4. **Serial/checksum strings**: `75D1:89D1`, `PRG-XXXXXXXX`, `±x.xxx` parameter serials — identity as digest.
5. **Hairline-boxed live canvas**: instrument, minimap, epoch chips — instruments carry thin frames; prose never does.
6. **The accent-filled hold affordance** (`.b-hold` fill bar) and 2px accent path lines.
7. **Epistemic labels on everything**: `PROVISIONAL`, `SELF-REPORTED`, `NOT DISCLOSED`, `DERIVED` — data always declares its own status.

---

## 10. Strongest existing visual decisions (preserve at all costs)

1. **[E/I]** The derived mark *as* the world — background, identity, and proof are one object (the page is inside the mark, not decorated by it).
2. **[E]** The two-register split: living instrument (home) vs cold record (subpages) — it makes the homepage's depth feel earned.
3. **[E]** Accent = state, never style. The page reads monochrome until something is *true*.
4. **[E]** Weight-as-attention (variable-weight kinetics) — distinctive, cheap, accessible-degradable.
5. **[E]** Computed negative space (corridors from the density atlas).
6. **[E]** Zero-radius, zero-shadow, hairline discipline.
7. **[E]** The claims table as a visible, executing component — UI as testimony.

## 11. Internal inconsistencies (evidence-backed)

1. **icon.svg** — retired warm/gold serif register on every tab and install surface (ADV-001). The loudest one.
2. **Stray border-radii** ×3 on contact/security vs the otherwise absolute sharp-edge rule (ARCH-003).
3. **Untokenized greens**: contact feedback `#0C7C6F` inline (contact.html:256) vs the token discipline everywhere else; runner.html runs its own seal-green/off-white palette (`--seal:#0C7C6F`, `--ground:#F4F5F2`) — **[I]** acceptable as a separate project's page, but if runner becomes publicly linked (open question Q3) it should adopt the cold register.
4. **`--brass` naming** (17 usages) — visually correct, nominally retired (ARCH-002).
5. **brief.html's serif/document register** — **[I]** deliberate (an exhibit dossier), but its duplicated in-file styles drift from the shared sheet (20px vs clamp title, ARCH-003).
6. **Secondary-ink floors** dip below AA mid-descent — the one place the visual system contradicts the site's own rigor (A11Y-001, executed).

## 12. Generic or template-like elements (the weakest surfaces)

1. The three legal pages: competent but anonymous inline-styled prose — the register survives only in the nav strip and hero stamps. **[I]** Lowest-priority to advance; correctness first.
2. The contact form: standard stacked form layout; only the mono labels tie it to the system. (UI-003 in the prompt pack addresses this within feasibility.)
3. Subpage footers: plain link rows, missing the homepage footer's completeness.

## 13. Where generated imagery would materially help

1. **Link-preview card (og:image)** — currently the identity never leaves the origin (ADV-002). One asset, high leverage. Must be plate-grammar, ideally derived from the real orbit.
2. **Icon/favicon** — replacing the off-register lambda (ADV-001); a derived-mark silhouette.
3. **brief.html exhibit frontispieces** — one plate-style figure per exhibit (constraint-boundary field for CytherCAD; event-strata field for SijilOS) would give the dossier the evidentiary weight its register promises, without touching the homepage.
4. **404/offline emblem** — a single "empty plate" mark (ADV-004).

## 14. Where generated imagery must NOT be used

1. **The homepage.** Its colophon states "no images" and CL-01's spirit depends on everything visible being derived at runtime. Any raster background, hero image, or decorative illustration on index.html breaks the product's core claim. Hard exclusion.
2. **The claims/manifest/floor area** — testimony must remain text and live canvas.
3. **Legal pages** — imagery adds noise to pages whose job is unadorned record.
4. **Anything depicting**: brains, robots, humanoid AI, circuit boards, padlocks, shields, globes, "data streams", Riyadh skylines, or Arabic-calligraphy pastiche. The brand's Saudi identity is stated in coordinates and certification facts, never exoticized. **[I]**
5. **Photography of any kind** — there is no photographic register anywhere in the system.

---

## 15. The Visual Constitution

Rules any new image, interface concept, or asset must satisfy to be native to this site. (Each rule is traceable to evidence above.)

1. **Derived over designed.** Prefer assets computed from the actual manifest/orbit; where generation is used, it must be indistinguishable in grammar from a derived plate (accumulated density, angular-lobe hue, log-tonemap luminance).
2. **The palette is the descent.** Only these hues exist: cold papers `#ECF0F4→#B9C3D2`, deep grounds `#3A4658→#070A10`, inks `#101620`/`#E3EAF4`, accent ramp `#2036C7→#2A48D6→#5F7BFF→#7FA0FF`. No warm tones, no gold, no green (outside form feedback), no gradients that are not density fields.
3. **Accent marks state.** Blue appears only where something is verified, admitted, active, or actionable — never as ambience, never exceeding ~10% of any composition.
4. **Edges are square.** No border radius, no drop shadows, no glows. Elevation = translucency/blur (homepage) or one-step paper tint (subpages). Frames are 1px hairlines at ~14–16% ink.
5. **Two voices of type.** Mono (uppercase, tracked, small) for metadata/measurement; system sans (light weights 200–350, tight leading) for statements. Serif only inside the brief's document register. Never decorative type, never embedded text in images.
6. **Density earns light.** Bright cores and saturated accents must read as *accumulated* (dense centers, sparse peripheries) — nothing uniformly bright, nothing airbrushed.
7. **Negative space is functional.** Every composition keeps a quiet lane (≥1/3 of the frame) where text could sit at AA contrast; focal density sits off-center, opposite the lane.
8. **Motion is observation.** Nothing animates by itself. Motion concepts must map to reader action (scroll = camera, rest = settle, hover = attention) and must have a reduced-motion equivalent that is instant, not slower.
9. **Everything declares its status.** New surfaces carry the epistemic-label motif (`DERIVED`, `PROVISIONAL`, `SELF-REPORTED`) where a claim is made. No implied claims.
10. **Nothing is stated that is not checked.** If an asset depicts a number, a mark, or a checksum, it must be the real one or be unlabeled. No fake meters, no invented data — this is a register rule with grep enforcement, and it binds imagery too.
