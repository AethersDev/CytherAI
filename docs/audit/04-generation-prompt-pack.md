# 04 — Generation Prompt Pack (GPT-5.6, image + design)

**Governed by:** the Visual Constitution in `03-visual-system-analysis.md` §15. Every prompt below embeds its constraints; do not use any prompt without its paired negative block (§4).
**Standing decision:** interface text stays real HTML. No generated asset may contain rendered text, numerals, checksums, or logotypes unless the prompt explicitly says otherwise (none below does).
**Preferred provenance:** wherever a deterministic render of the real orbit is feasible (IMG-001, IMG-002), the generated asset is a *composition study* to be approved, then reproduced programmatically from `CytherManifest.CANON` — "derived, not designed" is the brand law. The remaining assets (IMG-003…005) are illustrative and may ship as generated, since they decorate the *brief/error* register, never the homepage.

Palette tokens referenced below (from `js/substrate.js:20-23`, `index.html:22-27`, `css/cytherai.css:10-22`):
`paper #ECF0F4 · paper-2 #B9C3D2 · deep #3A4658 · core #070A10 · ink #101620 · ink-light #E3EAF4 · accent #2036C7 · accent-2 #2A48D6 · accent-3 #5F7BFF · accent-4 #7FA0FF · hairline = ink at 14–16% alpha`

---

## 1. Image-asset generation prompts

### IMG-001 — Link-preview card (og:image)

| Field | Value |
|---|---|
| Target | `index.html` (+ all subpages) `<meta property="og:image">` — closes ADV-002 |
| Purpose | Carry the mark's identity into link previews (Slack/iMessage/X/LinkedIn), where the site currently renders as bare text |
| Aspect ratio | exactly 1.91:1 (1200×630) |
| Min resolution | 2400×1260 (render 2×, downscale) |
| Composition | Far-field exposure of a Clifford-orbit density field occupying the right ~55% of frame; left 45% is quiet cold paper. The field's densest filament sits at the 2/3-right, 1/2-height power point |
| Focal point | Single dense filament core, right-of-center; periphery dissolves into sparse individual deposits |
| Text-safe region | Entire left 45% and bottom 12% must stay ≥ #E0E6EF-clean (previews overlay titles there; our own card embeds no text) |
| Crop behavior | Center-crop to 1:1 (mobile squares) must keep the filament core and at least 30% quiet paper; nothing essential in outer 8% |
| Palette | Ground `#ECF0F4`; field inks `#101620 → #3A4658`; exactly one lobe of the field carries `#2036C7`, ≤8% of total frame area |
| Lighting | None (flat archival plate; no light source, no specular) |
| Material/texture | Stippled accumulation — millions of sub-pixel deposits; grain from density, not noise overlay; no brush strokes, no smoke, no fluid |
| Depth/atmosphere | Flat plane; depth implied only by density falloff; zero blur, zero vignette |
| Required motifs | Density-earned core (Constitution §6); functional negative space (§7); hairline frame optional at 1px `#101620` @14% inset 24px |
| Forbidden motifs | Gradients-as-background, lens effects, 3D, glow/bloom, symmetry, recognizable objects, stars/space |
| Embedded text | **Forbidden** (no wordmark either — the preview title supplies the name) |
| Transparency | None — flat `#ECF0F4` ground |
| Filename / path | `og-card.png` → `assets/og/og-card.png` |
| Acceptance | Reads as a scientific plate at 320px wide; accent ≤8% area, single lobe; left half passes as a text lane (place white 16px text over it mentally — AA against paper); indistinguishable in grammar from the site's own plate renderer output |
| Rejection | Any smoothness that reads as airbrush/fluid sim; accent scattered through the field; centered composition; any hue outside the palette; anything readable as a logo |

**Prompt (GPT-5.6):**
> Archival mathematical plate, flat 2D, no lighting. A strange-attractor point-density field built from millions of tiny ink deposits on cold blue-grey paper #ECF0F4. The field occupies the right 55% of the frame with one dense filament core at the right-third, mid-height; density falls off into isolated stipple points toward the left, leaving the left 45% of the frame almost empty paper. Ink colors: deep blue-black #101620 through slate #3A4658; exactly one angular lobe of the field is tinted cobalt #2036C7, occupying under a tenth of the image. Luminance comes only from accumulated point density — dense areas darkest, no glow, no blur, no gradient washes, no vignette, no texture overlay. Square edges, no border. Aspect 1.91:1, 2400×1260. No text, no letters, no numbers, no logo, no symmetry, no 3D, no photography.

### IMG-002 — Icon / favicon composition study (derived-mark silhouette)

| Field | Value |
|---|---|
| Target | `icon.svg` replacement + `manifest.webmanifest` icons (closes ADV-001). **This is a study**: the shipped icon must be re-derived from `CytherManifest.CANON` (execution plan Phase 12) |
| Purpose | Replace the retired warm-gold lambda with a mark in the current register that survives 16px |
| Aspect | 1:1 |
| Min resolution | 1024×1024 |
| Composition | One high-contrast silhouette distilled from an attractor filament — a single sweeping density stroke with a dense knot, off-center on quiet ground; safe margin ≥12% all sides (maskable) |
| Focal point | The knot, at upper-right power point |
| Text-safe | n/a |
| Crop | Must survive a centered circle crop (maskable PWA) with nothing essential outside the inner 80% |
| Palette | Two variants: (a) ink `#101620` mark on `#ECF0F4`; (b) inverse for dark contexts. Accent `#2036C7` allowed only as the knot's core, ≤5% area, and must survive removal |
| Lighting/material | Flat; the stroke is stippled density at 1024px but must collapse to a clean solid at 32px |
| Depth | None |
| Required motifs | Density-earned core; asymmetry; square outer field (no rounded container — the OS masks) |
| Forbidden | Letterforms (no λ, no C, no A), shields, hexagons, circuits, orbit-rings-around-a-sphere, swooshes |
| Embedded text | **Forbidden** |
| Transparency | Variant (a) opaque; also deliver alpha version of the mark alone |
| Filename / path | `icon-study-a.png`, `icon-study-b.png` → `docs/audit/assets/` (studies never ship; the shipped file remains `icon.svg`) |
| Acceptance | Recognizable at 16px; silhouette unique among a tab row of generic favicons; plausibly a crop of the site's own background object |
| Rejection | Reads as a letter, logo-cliché, or generic AI swirl; needs the accent to be legible; symmetric |

**Prompt (GPT-5.6):**
> Minimal app-icon study, flat, square canvas. A single dense filament stroke from a strange attractor — one sweeping curved band of accumulated stipple points with a tight dark knot near the upper right — rendered as near-solid deep blue-black #101620 on cold paper #ECF0F4. The knot's very center may carry a small cobalt #2036C7 core, under 5% of the canvas. The form is asymmetric, cropped as if it were a detail of a much larger mathematical object, with at least 12% clear margin on all sides. At small sizes it must read as one bold organic-geometric mark. No letters, no symbols, no shield or badge shapes, no circles containing the mark, no gradients, no glow, no 3D bevel, no drop shadow, no text.

### IMG-003 — Brief, Exhibit A frontispiece (CytherCAD: the constraint boundary)

| Field | Value |
|---|---|
| Target | `pages/brief.html` §02 Exhibit A header area (`.doc-exhibit-body`, above `.doc-exhibit-type`) |
| Purpose | Give the CAD exhibit an evidentiary figure: generation constrained to validity — the homepage's boundary instrument (`js/instrument.js` grid + rectilinear path) spoken in the plate grammar |
| Aspect | 16:5 wide band |
| Min resolution | 2560×800 |
| Composition | A faint 1px hairline grid (ink @14%) across the full band; on it, one continuous rectilinear (axis-aligned) closed path in `#2036C7` at 2px, occupying the right 40%; to its left, a scatter of faded, incomplete, *rejected* rectilinear fragments in ink @25%, thinning toward the left edge |
| Focal point | The single closed admitted path, right-of-center |
| Text-safe | Left 25% nearly empty (the exhibit label column); top/bottom 15% clear of the accent path |
| Crop | At mobile (stacked, ~680px), the band center-crops to 2:1 keeping the closed path and ≥3 rejected fragments |
| Palette | Ground `#E0E6EF` (paper-dense token — this page's section ground); grid + fragments `#101620` at 14–25%; the one admitted path `#2036C7` |
| Lighting/material | Flat technical drawing; crisp 90° corners; no line smoothing artifacts |
| Depth | None |
| Required motifs | Hairline grid (instrument frame motif); exactly one accent element = the admitted state; failures rendered quiet, not red |
| Forbidden | Isometric/3D CAD renders, screws/gears, blueprints-blue ground, dimension arrows, curves |
| Embedded text | **Forbidden** (no dimension numbers) |
| Transparency | None |
| Filename / path | `exhibit-a-boundary.png` → `assets/brief/exhibit-a-boundary.png` |
| Acceptance | Instantly parses as "many proposals, one admitted"; the accent path is closed and axis-aligned; grid subordinate to content |
| Rejection | More than one blue element; diagonal or curved segments; any lighting/shadow; decorative blueprint styling |

**Prompt (GPT-5.6):**
> Flat technical figure, wide band 16:5, on pale cold paper #E0E6EF. A very faint fine square grid of 1px blue-black lines at low opacity covers the band. Right of center, one continuous closed rectilinear path — only horizontal and vertical segments with sharp 90° corners — drawn in cobalt #2036C7 at 2px weight, forming an irregular but closed circuit. Scattered to the left: eight to twelve incomplete rectilinear fragments in faded blue-black #101620 at low opacity, visibly unfinished or out of bounds, thinning out toward the left edge which stays almost empty. Everything perfectly flat and crisp: no 3D, no shadows, no glow, no arrows, no annotations, no numbers, no text, no blueprint-blue background, no curves.

### IMG-004 — Brief, Exhibit B frontispiece (SijilOS: event-sourced strata)

| Field | Value |
|---|---|
| Target | `pages/brief.html` §03 Exhibit B (same slot as IMG-003) |
| Purpose | Figure for the ledger engine: immutable append-only strata, offline-dense, one certified stratum |
| Aspect | 16:5 · min 2560×800 |
| Composition | Horizontal sedimentary bands of stippled density (the plate grammar laid in strata): ~9 layers, each a band of accumulated points at differing densities, oldest (densest, near-solid `#101620`) at bottom, sparser toward top; one thin stratum in the lower third carries the accent `#2036C7` as its lobe tint; right 20% shows the strata continuing undisturbed (no truncation) |
| Focal point | The accent stratum, lower-left third |
| Text-safe | Top 25% (sparsest band) stays quiet enough for the exhibit header |
| Crop | 2:1 mobile crop keeps ≥6 strata incl. the accent one |
| Palette | Ground `#E0E6EF`; strata `#101620`→`#3A4658` by density; accent single stratum |
| Lighting/material | Flat; stipple accumulation, banding edges slightly irregular like deposition, never wavy-artistic |
| Required motifs | Density-earned darkness; single accent = certified state; horizontality (time as strata) |
| Forbidden | Coins/currency, database cylinders, blockchain cubes/chains, charts, arrows |
| Embedded text | **Forbidden** · Transparency: none |
| Filename / path | `exhibit-b-strata.png` → `assets/brief/exhibit-b-strata.png` |
| Acceptance | Reads as geological record of events; strata continuous edge-to-edge (nothing erased); one accent layer |
| Rejection | Any icon-like objects; wavy decorative banding; more than one accent band; gradient smoothness replacing stipple |

**Prompt (GPT-5.6):**
> Flat archival figure, wide band 16:5, cold pale paper #E0E6EF. Nine horizontal sedimentary strata rendered as bands of fine stippled point-density, spanning the full width edge to edge: the bottom bands are dense, near-solid deep blue-black #101620; each higher band is sparser, the top band barely a scatter of points. Band boundaries are slightly irregular, like natural deposition, but strictly horizontal. Exactly one thin stratum in the lower third is tinted cobalt #2036C7. No band is interrupted, erased, or truncated anywhere. Completely flat: no perspective, no lighting, no shadows, no glow, no objects, no symbols, no charts, no text, no numbers.

### IMG-005 — 404 / offline emblem (the empty plate)

| Field | Value |
|---|---|
| Target | new `404.html` (execution plan Phase 13) and optional SW offline page |
| Purpose | An in-register mark for "no record at this path" |
| Aspect | 1:1 · min 1200×1200 |
| Composition | A 1px hairline square frame (ink @16%) centered, occupying 60% of canvas — an instrument frame with **almost nothing in it**: only a sparse drift of ~200 stipple points entering from the lower-left corner and dying out before the center; ground `#ECF0F4` |
| Focal point | The emptiness at center (the absent exposure) |
| Text-safe | Everything below the frame (bottom 20%) — the page's real-HTML message sits there |
| Crop | Safe at any center crop ≥70% |
| Palette | Paper, ink-alpha hairline, stipple `#101620` @ ≤40%; **no accent** (nothing is verified here) |
| Required motifs | Hairline-boxed instrument; density (here: its absence) |
| Forbidden | Broken-link icons, ghosts, magnifying glasses, question marks, sad faces |
| Embedded text | **Forbidden** · Transparency: deliver with alpha (page supplies ground) |
| Filename / path | `plate-empty.png` → `assets/error/plate-empty.png` |
| Acceptance | Melancholy-precise "empty exposure"; someone who has seen the homepage recognizes the family instantly |
| Rejection | Any accent blue; any icon/metaphor; frame thicker than 1–2px at final size |

**Prompt (GPT-5.6):**
> Minimal flat composition on cold paper #ECF0F4, square. A thin 1px square outline in blue-black at very low opacity, centered, covering about 60% of the canvas — an empty specimen frame. Inside it, only a sparse drift of roughly two hundred tiny stipple points in faded blue-black #101620, entering from the lower-left corner of the frame and thinning to nothing before reaching the center. The rest of the frame is empty paper. Nothing else: no icons, no symbols, no accent colors, no gradients, no shadows, no texture, no text.

---

## 2. UI / interface concept prompts

These generate **concept mockups for human review**, then get implemented by hand in the real codebase. The generator must be told what already exists; each prompt embeds that.

### UI-001 — Standing-claims table, evidence-expansion concept

- **Existing screen:** `index.html` floor section, `.manifest.claims` block (:606-613) — mono key/value rows rendered by `js/claims.js:117-135`: `CL-xx · TEXT` left, `● HOLDING · detail` right in accent, `✕ INVALID` in bold ink, `RECOMPUTE ALL` button below.
- **Preserve:** row grammar (key left / status right), hairline separators, mono type, accent-only-for-holding, dark-glass panel context at depth, zero radius, the `n/9 HOLDING` footer linkage.
- **Problem:** a claim's *detail* string is one dense line; a diligence reader cannot see the predicate's method or re-run one claim in isolation.
- **Required hierarchy:** claim id+title → status → (expanded) method sentence, live measured value, per-claim re-run affordance, last-computed stamp.
- **Required states:** CHECKING (wait-grey), HOLDING (accent), INVALID (bold ink, never red), expanded/collapsed, per-claim recomputing.
- **Responsive:** single column ≤640px; expansion pushes content, never overlays; strip/ledger chrome unaffected.
- **Accessibility:** rows become `<button aria-expanded>`; status never color-only (keep ●/✕ glyphs); focus-visible accent outline; AA on dark glass.
- **Must remain recognizable:** the manifest-row silhouette — a reader of the current page must see the same table, now openable.
- **Must not invent:** new claims, new numbers, icons beyond ●/◌/—/✕, charts, progress bars, shields.
- **Feasibility:** must be buildable with the existing `renderClaims()` DOM pattern + ~30 lines; no new libraries; no layout shift of the floor.
- **Acceptance:** the collapsed view is pixel-close to today's; expansion adds ≤3 lines of mono text + one small re-run control. **Rejection:** cards, accordions with chevrons/shadows, color-coded severity, any element that implies unverified data.

**Prompt (GPT-5.6):**
> Design a single UI component mockup, desktop 900px wide, dark translucent panel (rgba(7,10,16,0.93)) on a near-black ground #070A10. A table of nine rows in a monospaced font (11px feel), each row: left — an ID like "CL-06 · READING INK ≥4.5:1 AT EVERY DEPTH" in pale grey-blue #C7D2E4; right — "● HOLDING" plus a short measurement in periwinkle #7FA0FF. Hairline separators (1px, pale ink at 10%). Show one row expanded: beneath it, three quiet mono lines (method sentence, measured value, timestamp) indented, plus a small underlined text control "RE-RUN THIS CLAIM" in the same periwinkle, and the row's right edge showing "COMPUTING…" in mid-grey for a second variant. One row shown failing: "✕ INVALID" in bright off-white bold, no red. Square corners everywhere, no shadows, no icons other than ● and ✕, no chevrons, no cards, no color fills. All text is placeholder-real, no lorem ipsum gibberish beyond the strings given.

### UI-002 — Subpage navigation strip completion

- **Existing:** `.nav` strip on subpages (`css/cytherai.css:46-56`; e.g. contact.html:15-20): 44px sticky bar, brand left, `PAGE · PUBLIC SURFACE` scope label; `.nav-links` CSS exists but is unused (ARCH-006).
- **Preserve:** 44px height, blur+paper translucency, mono 10px tracking, brand weight, scope label with accent `<b>`, hairline bottom rule.
- **Problem:** dead-end navigation — no page links to its siblings.
- **Required hierarchy:** brand → scope → (right) sibling links with `aria-current` page marked in accent.
- **States:** default, hover (accent), current (accent + non-hover), focus-visible, ≤640px (links collapse to a second 26px row or an unobtrusive inline scroll — show both variants).
- **Accessibility:** current page marked non-color-only (e.g. underline or `·` prefix); tab order left→right.
- **Must not invent:** hamburger menus, dropdowns, logos, search fields, CTA buttons in the nav.
- **Feasibility:** pure HTML/CSS addition using the existing unused `.nav-links` rules.
- **Acceptance:** indistinguishable in tone from the current strip with five quiet uppercase links added. **Rejection:** any element taller than the strip, pill highlights, background fills on links.

**Prompt (GPT-5.6):**
> Mockup of a minimal sticky top bar, 1000px content width on cold paper #ECF0F4, bar height 44px with a 1px bottom hairline. Left: "CYTHERAI" in bold letterspaced 10px mono, blue-black #101620. Next to it in quiet grey-blue mono: "PRIVACY · PUBLIC SURFACE" with "PUBLIC SURFACE" in cobalt #2036C7. Right-aligned: five tiny uppercase mono links — BRIEF, CONTACT, SECURITY, PRIVACY, TERMS — in muted grey #6B7688; PRIVACY (the current page) is cobalt with a thin underline. Second variant below: the same bar at 390px mobile width where the five links sit on a slim second row, 26px tall, same styling. Flat, square, no icons, no hamburger, no shadows, no pills, no fills behind links.

### UI-003 — Contact form as transmission instrument

- **Existing:** contact.html:45-140 — stacked `.form-group`s (mono uppercase labels, flat bordered inputs on `--paper-lifted`, accent focus border), consent checkbox, `role="alert"` feedback div, full-width `TRANSMIT MESSAGE` primary button; mailto transport with honest degraded-state messaging.
- **Preserve:** field set exactly (name, email, organization, message, consent), label style, flat inputs, accent-on-focus, the button text, the copy-email fallback block, zero radius (removing the stray radii, ARCH-003).
- **Problem:** the page's register promises an instrument; the form reads generic. Also the mailto degraded state surprises users *after* submit (REL-002).
- **Required hierarchy:** channel status line (transport: local mail client · nothing stored server-side) *above* the form → fields → consent → transmit → feedback.
- **Required states:** default, focus, invalid field (refuse-red `#B23A2E` border + message), submit-pending ("OPENING MAIL CLIENT…"), success note, no-mail-client advisory (visible pre-submit as a quiet line, not a popup).
- **Responsive:** single column always; 600px max; no floating labels.
- **Accessibility:** labels remain real `<label for>`; error text tied via `aria-describedby`; feedback stays `role="alert"`; AA for the red on paper (B23A2E on ECF0F4 ≈ 5.5:1, passes).
- **Must not invent:** captchas, file upload, phone fields, chat widgets, send-icons, multi-step wizards.
- **Feasibility:** styling + copy only; the DOM and inline script stay structurally as-is.
- **Acceptance:** the form reads like the homepage's manifest blocks — a protocol, not a marketing form. **Rejection:** rounded inputs, placeholder-as-label, floating labels, icons inside fields, any third-party form aesthetic.

**Prompt (GPT-5.6):**
> Mockup of a contact form, 600px column on cold paper #ECF0F4, everything flat and square-cornered. At top, a quiet protocol block in 10px mono grey #6B7688: three key-value lines styled like a technical manifest — "CHANNEL — LOCAL MAIL CLIENT", "SERVER STORAGE — NONE", "FALLBACK — COPY ADDRESS BELOW" — separated from the form by a 1px hairline. Form fields: uppercase 10px letterspaced mono labels in grey above flat input rectangles with 1px hairline borders on slightly lifted paper #F3F6FA; one field shown focused with a cobalt #2036C7 border; one field shown invalid with a muted brick #B23A2E border and a small mono error line beneath it. A consent checkbox row in small mono. Full-width button: blue-black fill #101620, white 10px uppercase mono text "TRANSMIT MESSAGE"; a second variant of the button reading "OPENING MAIL CLIENT…" in a disabled tone. No icons, no rounded corners, no shadows, no placeholder-only labels, no decorative graphics.

### UI-004 — Mobile fixed-chrome resolution (≤640px)

- **Existing:** at small widths four fixed layers coexist: `.chrome` header (index.html:48-53), `.strip` serial bar bottom (:276-286, forkStatus hidden ≤640), `.optics` (right, bottom:104px ≤900px, :361-366), `.rledger` docked left/right at bottom:60px (:377). **Uncertainty note:** no device run was executed (baseline §6.1); this concept exists to resolve the audit's highest-uncertainty layout zone before/alongside the Safari 390px pass.
- **Preserve:** all four functions (gauge, serial+fork+capture, optics triad, ledger header), mono microtype, translucent blur panels, bottom strip as the anchor.
- **Problem:** stacked fixed bars can consume >25% of a 390×844 viewport and may collide (ledger head above strip, optics floating above both).
- **Required hierarchy:** strip (always) → ledger collapsed to a strip-integrated chip → optics collapsed into the strip as a single cycling control (`WORLD/BAL/READ`) → gauge stays top.
- **Required states:** ledger closed/open (open = sheet expanding from the strip, max 40vh, scrollable log), optics cycling, forking (strip button active), crossed.
- **Accessibility:** every control ≥44px hit target despite 9px type (padding, not font-size); open ledger traps nothing (plain reflow, Esc/again to close); `aria-expanded` preserved.
- **Must not invent:** tab bars, FABs, hamburger, swipe-only gestures, icons replacing the text controls.
- **Feasibility:** CSS + a few lines relocating the optics buttons; no new modules; desktop unchanged ≥900px.
- **Acceptance:** ≤2 fixed rows at rest (top gauge, bottom strip incl. chips); nothing overlaps; text controls stay text. **Rejection:** icon-only controls, drawers with scrims, any third bar at rest.

**Prompt (GPT-5.6):**
> Two mobile mockups, 390×844, of a dark-mode instrument webpage at depth: ground near-black #070A10 with a faint mathematical point-field, pale grey-blue text #C7D2E4. Mockup A "at rest": a slim top bar with tiny mono text "OBS FLOOR · ×6.80 / DEPTH 98%"; a single bottom bar (translucent dark, blurred, 1px top hairline) containing tiny mono text controls in one row: "MARK +1.752 −0.983…" truncated, "FORK", "CAPTURE", a small chip "LEDGER · 4", and a mode chip "BAL". Nothing else floats. Mockup B "ledger open": same page with the bottom bar expanded upward into a panel taking 40% of screen height, showing a small mono event log ("t+12s boundary crossed · NTP-2025-001" style lines, some values in periwinkle #7FA0FF), with underlined text actions "VERIFY CHECKSUM" and "CLEAR LEDGER", the bar's chip now reading "LEDGER ×". All corners square, all controls text-based, no icons, no tab bar, no floating buttons, no scrim, no rounded sheets.

---

## 3. Optional motion / transition concepts

Motion here is storyboard generation for review; implementation is code in `js/site.js`/CSS honoring Constitution §8 (reader-caused, interruptible, reduced-motion instant).

### MOT-001 — The ink flip as focus pull (refinement study of the P9 membrane)

- **Target:** index.html:293-326 flip behavior (`body[data-ink]`/`[data-phase="flip"]`), currently a 0.25s color crossfade + membrane ground.
- **Concept to visualize:** a 5-frame storyboard of scroll positions 40%→52%: (1) dark ink on grey-blue ambient; (2) membrane rises behind text blocks only (envelope rectangles darken to rgba(16,22,31,.82)); (3) ink crossfades dark→light *within* the grounded envelopes; (4) membrane persists while world moves behind; (5) settled: light ink, panels phase-changed. Constraint text for the generator: the *world never pauses*; only the reading layer changes state; no element moves position.
- **Acceptance:** reads as optics (exposure change), not as theme toggle. **Rejection:** page-wide flashes, sliding panels, elements translating.

**Prompt (GPT-5.6):**
> A 5-panel horizontal storyboard, flat UI frames 16:9 each, showing the same webpage section at five scroll instants. The page: mono/sans typographic blocks over a continuous abstract point-density field that gradually shifts from grey-blue #B9C3D2 toward slate #3A4658 across the panels. Panel 1: dark blue-black text directly on the field. Panel 2: soft-edged rectangular zones appear behind each text block only, darkening toward rgba(16,22,31,0.82); text still dark. Panel 3: within those zones, text mid-crossfade to pale #E3EAF4 (show at 50% blend). Panel 4: text fully pale on the dark zones; the field behind continues its drift. Panel 5: settled — pale text, translucent dark panels. Nothing changes position in any panel; no motion blur; no arrows or annotations; no text other than greeked typographic blocks (unreadable pseudo-lines, not real words).

### MOT-002 — Plate development as boot narrative (exposure, not loader)

- **Target:** the develop stream (`js/substrate.js:307-348`, status line "EXPOSING PLATE n/4 · n = X DEPOSITIONS", `js/site.js:225-230`).
- **Concept:** 4-frame storyboard of one plate developing: sparse scatter → filaments emerge → density saturates → tonemapped final with accent lobe; the serial strip's true-observable counter is the only "progress" indicator (never a bar). Purpose: art direction reference for tuning batch pacing, and a reduced-motion contrast frame (final state only).
- **Acceptance:** progress is legible from density alone. **Rejection:** spinners, progress bars, skeleton screens, percentage rings.

**Prompt (GPT-5.6):**
> A 4-panel storyboard, each panel the same full-screen field on cold paper #ECF0F4. Panel 1: a few thousand scattered stipple points in pale blue-grey, no structure. Panel 2: the points concentrate into faint curving filament bands, structure emerging, still airy. Panel 3: dense dark filaments in #101620–#3A4658, one angular region taking a cobalt #2036C7 tint. Panel 4: the finished plate — deep accumulated density with a dark core, the cobalt lobe distinct, sparse periphery. Identical composition and camera across all panels; only density accumulates. Flat, no glow, no blur, no UI elements, no progress indicators, no text.

---

## 4. Negative prompts and global exclusions

Append to **every** image prompt above:

> **Negative:** text, letters, numbers, words, watermark, signature, logo, gold, brass, warm tones, beige, sepia, gradients as backgrounds, glassmorphism, neon, cyberpunk, glow, bloom, lens flare, bokeh, vignette, 3D render, octane, unreal engine, isometric, photograph, photorealistic, skin, faces, hands, robots, humanoids, brains, circuit boards, chips, padlocks, shields, keys, globes, maps, skylines, rounded corners, drop shadows, bevels, plastic, chrome, smoke, fluid simulation, marble ink, watercolor, paper texture overlay, noise filter, film grain overlay, stock-photo composition, centered mandala symmetry, sacred geometry, hexagon grids, particle swirls around spheres, dashboards, charts, graphs, arrows.

Global rules for any future prompt not in this pack:
1. Palette limited to §Palette tokens; accent ≤10% of frame; no hue outside it.
2. Flat/orthographic only; depth = density falloff, never perspective or blur.
3. No embedded text ever; interface text is HTML.
4. Nothing that renders a claim (number, checksum, meter) — imagery may not state what it cannot check (register rule; grep-enforced for `−540`-style fake meters).
5. Square edges; hairline frames at 1px ink-alpha if framed at all.
6. If it could be the output of `js/substrate.js`'s renderer, it's on-register; if it could be a stock "AI/tech" image, it's rejected.

---

## 5. Asset integration notes

1. **Where assets live:** new top-level `assets/` (`assets/og/`, `assets/brief/`, `assets/error/`). Add the directory to `deploy.sh`'s allowlist (execution-plan Phase 3) when the first asset ships. Concept *studies* (UI/MOT, icon studies) live under `docs/` and never deploy.
2. **The homepage takes none of these.** index.html's colophon ("no images", :634) and CL-01's spirit are binding: no `<img>`, no CSS `url()` on `/`. The og:image is metadata fetched by scrapers, not by the page — state this in the commit body when adding it (see ADV-002).
3. **Formats:** PNG for og (scraper compatibility); prefer re-encoding brief/error figures to lossless WebP or keeping ≤150 KB PNGs (there is no build pipeline — commit final bytes). SVG only for the icon, and only once re-derived programmatically (Phase 12); generated bitmaps are studies for it, not the shipped file.
4. **CSP:** all pages already allow `img-src 'self' data:` — self-hosted assets need no CSP change. Never hotlink.
5. **Service worker:** brief/error images should be added to `sw.js` ASSETS only if offline-brief matters (they're ~100 KB each; the cache is downloaded eagerly on install — weigh it). If added: run `./generate-integrity.sh`? — no; images are not SRI'd resources; bump the CACHE `-rN` suffix instead (Phase 6 convention).
6. **Accessibility:** every shipped `<img>` gets a real `alt` describing the figure's claim-free content (e.g. "Density field: many rejected path fragments, one admitted closed path"), and `width`/`height` attributes to prevent layout shift on the brief.
7. **Acceptance loop:** generate ≥4 candidates per prompt → cull against each prompt's Rejection row → the survivor is checked against the Visual Constitution ten rules → owner sign-off (brand assets: mandatory for IMG-001/002) → optimize bytes → commit with the finding ID in the message.
8. **Provenance labeling:** per the epistemic-label motif, brief figures get a quiet mono caption in HTML (not in the image): `FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT`. The site never ships an unlabeled figure that could be mistaken for data.
