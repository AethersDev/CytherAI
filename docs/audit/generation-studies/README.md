# Generation studies — round 1 (GPT-5.6)

Eleven outputs generated 2026-08-03 against `04-generation-prompt-pack.md`, reviewed
against the Visual Constitution (`03-visual-system-analysis.md` §15) and each prompt's
paired Acceptance / Rejection rows.

**Every file in this directory is a study.** None is a production asset. None is in
`sw.js`'s precache, the SRI fingerprint, or `deploy.sh`'s allowlist, and nothing here
is reachable from any served page. Files were quarantined here from `assets/`
specifically so that a passing *composition* cannot drift into the release artifact by
proximity. `assets/` is now empty and remains reserved for production files only.

Round-1 verdict: **7 approved as studies · 4 regenerate.** Approval of a composition is
not production eligibility — see the per-asset *production eligibility* lines.

## Correction to commit `20d10e6`

`20d10e6` is described in its message as an HTML-only change. It was not: `git add -A`
also swept in ten of these generated PNGs (~19 MB). The commit is **not being rewritten**
— it is part of the record and the deployment behaviour it describes was never ambiguous,
because `assets/` has never been in the deploy allowlist and `dist/` was unaffected. This
paragraph is the prospective correction. The eleventh output
(`UI-002-subpage-navigation-study.png`, camera UUID `D2CDF097…`) was untracked at the time
of that commit and enters version control here.

## Measured across all eleven

`0%` off-palette · `0%` warm cast except UI-003's `1.36%` (the `--refuse` brick, expected)
· accent `≤1.2%` of frame in every output. Palette discipline is the round's clearest
success. Harness: `imgcheck.py` (sips downscale + minimal PNG decoder, no dependencies).

---

## img/

### IMG-001 — link-preview card (og:image)

| | |
|---|---|
| Camera UUID | `E582D0B3-C4AA-499A-A535-3D3AD0049547.PNG` |
| File | `img/IMG-001-og-composition-study.png` |
| Dimensions | 1731 × 909, no alpha |
| SHA-256 | `094d5316e1bc6473333b1225a0c2ef50811e4f8474aa5cf4cf024ba130af6b08` |
| Verdict | **Approved composition** |
| Reason | Grammar passes: right-weighted density field, quiet left text lane, single accent lobe, density-earned core, no gradient/glow/vignette. |
| Production eligibility | **No.** 1731×909 is below the 2400×1260 minimum, and og cards are downscaled by scrapers from the source. More fundamentally, the prompt pack's standing decision is that the shipped card is *derived, not designed*. |
| Next action | Render `assets/og/og-card.png` deterministically from `CytherManifest.CANON` at exactly 2400×1260, using this composition as the approved framing target. |

### IMG-002 — icon / favicon silhouette

| | |
|---|---|
| Camera UUID | `A94FCD52-DF64-4C12-AAC7-0855D8AC6B7C.PNG` |
| File | `img/IMG-002-icon-study-rejected.png` |
| Dimensions | 1254 × 1254, no alpha |
| SHA-256 | `2c29d19e8c38d46af04eede28ad46fe71470a0ac7bde303c964d53449041f100` |
| Verdict | **Rejected — regenerate** |
| Reason | Hits an explicit Rejection row. The stroke is built from fine stipple that dissolves under downsampling; at 16px the mark collapses to a faint hook and the cobalt knot becomes the only thing carrying recognition. The prompt requires the accent to be removable without loss. |
| Production eligibility | No, and never — this class is a study by design; the shipped icon stays `icon.svg`. |
| Next action | Regenerate with the corrected prompt (`regeneration-prompts-rev2.md` §IMG-002), which sets a minimum stroke thickness and requires a solid interior. Then re-derive the selected silhouette programmatically into SVG. |

### IMG-003 — brief, Exhibit A frontispiece

| | |
|---|---|
| Camera UUID | `E2720610-3DBF-4022-AC79-AEA4C665B4A2.PNG` |
| File | `img/IMG-003-exhibit-a-composition-study.png` |
| Dimensions | 2244 × 701, no alpha |
| SHA-256 | `199fb151dca63644c37f933df1ec5c0f09af76dee7765d33d4a69fb8a1be2e63` |
| Verdict | **Approved composition** |
| Reason | Hairline grid, one closed admitted rectilinear path in accent, rejected fragments thinning leftward, quiet label column. Reads as an instrument trace, not an illustration. |
| Production eligibility | **No.** 2244×701 is below the 2560×800 minimum. |
| Next action | Reproduce programmatically at 2560×800. The geometry is axis-aligned paths on a hairline grid — a generator will hold crisp 90° corners and exact line weights that a model only approximates. |

### IMG-004 — brief, Exhibit B frontispiece

| | |
|---|---|
| Camera UUID | `F2D63002-B170-47BB-8F37-A28CF677E32D.PNG` |
| File | `img/IMG-004-exhibit-b-composition-study.png` |
| Dimensions | 2244 × 701, no alpha |
| SHA-256 | `41531840fdf76b686c1e26d246a8eef61a6d8e84368b57cb849c88c35da98d53` |
| Verdict | **Approved composition** |
| Reason | Same grammar as IMG-003, correctly differentiated in content. |
| Production eligibility | **No.** Same 2244×701 shortfall. |
| Next action | Same — reproduce programmatically at ≥2560×800. |

### IMG-005 — empty-state plate

| | |
|---|---|
| Camera UUID | `F8B70D50-9786-4E62-A650-C10D9DC085A2.PNG` |
| File | `img/IMG-005-empty-plate-candidate.png` |
| Dimensions | 1024 × 1024, **alpha present** |
| SHA-256 | `0a7388d9ff87a6f06638c04100d33bf2dcc42ddf95333e2e2537e8993961860a` |
| Verdict | **Approved — production candidate** |
| Reason | Meets its spec at its specified resolution, with the transparent ground the prompt asked for. The only round-1 output that is close to shippable as generated. |
| Production eligibility | **Candidate.** Not yet approved — no optimisation pass, no page-level review, no integration. |
| Next action | Optimise (strip metadata, quantise), review in-page at real size, then decide integration. Advancing it means adding a first image to a site whose CL-01 claim is that it makes zero external requests — a same-origin precached asset does not break that, but the claim text and `sw.js` ASSETS must be re-read before it ships. |

---

## ui/

Interface studies are **implementation references only**. No pixels from this directory
ship; only hand-authored HTML/CSS/JS does.

### UI-001 — claims table at ten claims

| | |
|---|---|
| Camera UUID | `E1C249FA-5D42-4C6D-BCCD-E8F8BDFFB76D.PNG` |
| File | `ui/UI-001-claims-expansion-study.png` |
| Dimensions | 1448 × 1086, no alpha |
| SHA-256 | `0fff6dd0ab29caacfa02b56c07d3671cc6d15c8abba74adeea14821d4f3da0a3` |
| Verdict | **Approved study** |
| Reason | Register holds; row rhythm and column discipline are correct. Shows nine claims — the registry is now ten (CL-06c landed in P9), so treat the row count as illustrative. |
| Production eligibility | Reference only. |
| Next action | None. Consult when the claims table next changes shape. |

### UI-002 — subpage navigation strip

| | |
|---|---|
| Camera UUID | `D2CDF097-7926-4547-A119-435DD8E87518 copy.PNG` |
| File | `ui/UI-002-subpage-navigation-study.png` |
| Dimensions | 1448 × 1086, no alpha |
| SHA-256 | `8516a615d2d431e85c4ebe3b7da65dbec0f81708f48d1edb1807d351a7d9eadf` |
| Verdict | **Approved study** |
| Reason | Wordmark, accent scope label, hairline and mono tracking preserved; five quiet uppercase links added; both the desktop and 390px variants shown; no hamburger, dropdown, pill, icon or CTA invented. The current page is marked by accent **plus underline** — non-colour-only, as the accessibility row required. |
| Production eligibility | Reference only. |
| Next action | Implement against the existing unused `.nav-links` rules in `css/cytherai.css`. Take the 44px bar height from the stylesheet, not from the mockup — the study's bar measures ≈74px against its own 1000px content width. Accent text is safe here: subpages are the static depth-0 register (`#ECF0F4`), where accent measures 7.6:1; the O1/N1 contrast findings are homepage-specific and do not transfer. |

### UI-003 — contact instrument

| | |
|---|---|
| Camera UUID | `99BB0AD0-A09D-4EAE-B339-17D5BD8A21F6.PNG` |
| File | `ui/UI-003-contact-instrument-study.png` |
| Dimensions | 1122 × 1402, no alpha |
| SHA-256 | `a39210198f63dfc8e9b0064c1a1e405cdc20f35ecdb8a461b072c95740bac23f` |
| Verdict | **Approved study** |
| Reason | Solves REL-002 by stating the mailto handoff *before* submission rather than after. Only warm pixels in the round (1.36%) and they are the `--refuse` brick, which is correct. |
| Production eligibility | Reference only. |
| Next action | Implement the pre-submit advisory in `contact.html`. |

### UI-004 — mobile fixed chrome

| | |
|---|---|
| Camera UUID | `3D9E7675-8431-4916-B756-9D26B0CEC4FF.PNG` |
| File | `ui/UI-004-mobile-chrome-rejected.png` |
| Dimensions | 853 × 1844, no alpha |
| SHA-256 | `a0780b874479ed34bb270655d0bb86e146831e90afabea79faad320ec4fb7d77` |
| Verdict | **Rejected — regenerate** |
| Reason | The ledger header reads `IMMUTABLE APPEND-ONLY`. `Append-only` is a grep-banned string (`CLAUDE.md`, register rules) because the ledger is owner-erasable — and the same panel contradicts itself with a `CLEAR LEDGER` action. A study that asserts a false persistence property cannot guide implementation. |
| Production eligibility | No, and never — mobile chrome ships as hand-authored code. |
| Next action | Regenerate with `regeneration-prompts-rev2.md` §UI-004, which forbids the persistence vocabulary explicitly and attaches the reference capture below. |

### UI-004 reference capture (not a generated output)

| | |
|---|---|
| File | `ui/UI-004-reference-390x844-core-depth.png` |
| Origin | Chrome CDP screenshot of the built `dist/` artifact at 390×844, DPR 3, scroll depth 0.965 (`data-ink="light"`, ground `rgb(12,16,24)`) |
| Dimensions | 1170 × 2532 (3× capture of the 390×844 viewport) |
| SHA-256 | `9bec6def33988070b89eacfe3bc01c0ba6b77a470748a975761ec3f1211c678b` |
| Purpose | The authoritative structural reference attached to the UI-004 regeneration prompt, so the model advances the real interface instead of inventing a replacement page. |

What it documents — the measured fixed-element stack at rest, 390×844, depth 0.965:

| Element | Top..bottom | Height |
|---|---|---|
| `.chrome` (top gauge) | 0..60 | 60 |
| `.core` (sample map) | 323..522 | 199 |
| `.optics` (WORLD · BALANCED · READ) | 715..740 | 25 |
| `.rledger` | 754..784 | 30 |
| `.strip` | 784..844 | 60 |

Three stacked fixed surfaces at the bottom plus a floating map that overlaps body text —
the capture shows a paragraph cut mid-line behind `.rledger`. Both are conditions the
UI-004 prompt lists under automatic rejection, which is precisely why the corrected
prompt attaches this file: the target is one bottom row and no overlap, and the reference
is the current state to be advanced away from. Note the gauge reads `OBS AUDIT · ×6.36 /
DEPTH 96%` at this scroll position; the prompt's `OBS FLOOR · ×6.80 / DEPTH 98%` is the
floor state, not a contradiction.

---

## motion/

Storyboards are **design records**. No storyboard pixels deploy under any circumstance;
they exist to specify motion that is then hand-implemented in CSS/JS.

### MOT-001 — ink flip

| | |
|---|---|
| Camera UUID | `260072CC-0142-470D-9900-09E4BCD3A261.PNG` |
| File | `motion/MOT-001-ink-flip-rejected.png` |
| Dimensions | 2172 × 724, no alpha |
| SHA-256 | `e3e6e193a6d151b6ae32716885c8798e150354349e64788acc77fbf57ab5d561` |
| Verdict | **Rejected — regenerate** |
| Reason | The membrane zones have rounded corners — confirmed by cropping and zooming, not inferred. Rounded geometry violates Constitution §4 and the pack's global negative. The real membrane is a rectangular pseudo-element softened by `mask-image` alpha, and a storyboard that shows radius will produce an implementation with radius. |
| Production eligibility | No, and never. |
| Next action | Regenerate with `regeneration-prompts-rev2.md` §MOT-001, which distinguishes mask-attenuated softness from border-radius softness explicitly. |

### MOT-002 — plate development

| | |
|---|---|
| Camera UUID | `2A324F03-2D7D-4E6F-ABA9-E9D915E5F8E3.PNG` |
| File | `motion/MOT-002-plate-development-rejected.png` |
| Dimensions | 2172 × 724, no alpha |
| SHA-256 | `47bf07b60b0e8a23f97359c57a4fe67ea8c12cb8f97a7e30dbdc466a34a5497c` |
| Verdict | **Rejected — regenerate** *(revised from "approved, flagged" — see below)* |
| Reason | The high-density cores read as bloom: as deposits accumulate the core gets *brighter*, approaching white. On a light plate, accumulation deposits ink and monotonically darkens the paper (Constitution §6). This storyboard's entire purpose is to communicate the development law, and it states the law backwards. An art-direction artifact that reverses the rule it exists to teach cannot safely guide implementation, so this is a failure and not a flag. |
| Production eligibility | No, and never. |
| Next action | Regenerate with `regeneration-prompts-rev2.md` §MOT-002, which states the monotonic-darkening law as a hard constraint and names bright cores under automatic rejection. |

---

## Round-2 status

| Prompt | Round-1 verdict | Round 2 |
|---|---|---|
| IMG-001 | approved composition | not regenerating — reproduce from `CANON` at 2400×1260 |
| IMG-002 | rejected | regenerated — **round-1 defect corrected, geometry non-compliant** |
| IMG-003 | approved composition | not regenerating — reproduce programmatically at 2560×800 |
| IMG-004 | approved composition | not regenerating — reproduce programmatically at 2560×800 |
| IMG-005 | production candidate | not regenerating — optimise and review |
| UI-001 | approved study | — |
| UI-002 | approved study | — |
| UI-003 | approved study | — |
| UI-004 | rejected | regenerated — **approved study** (two minor defects) |
| MOT-001 | rejected | regenerated — **approved record** |
| MOT-002 | rejected | regenerated — **approved record** |

Corrected prompts: `regeneration-prompts-rev2.md`.

---

# Generation studies — round 2 (GPT-5.6)

Five outputs generated 2026-08-03/04 against `regeneration-prompts-rev2.md`, filed under
the same schema. **Still studies.** Nothing here is in the precache, the SRI fingerprint,
or the deploy allowlist; `assets/` remains empty.

Round-2 verdict: **3 of 4 prompts pass outright · IMG-002 corrects its round-1 defect but
misses three stated numbers.** Every round-1 rejection reason is resolved.

## Measured across all five

`0.00%` warm cast · `0.00%` off-cold-hue · accent ≤ `0.29%` of frame. Harness rebuilt as
`imgcheck.py` (pure-python PNG decoder + `sips` downscale, no dependencies); the round-1
copy did not survive its session, so **every number below was re-measured, not inherited.**
The harness is now checked in beside the studies — `docs/` is asserted absent from the
deploy artifact (`deploy.sh` fails if it reaches `dist/`), so it cannot ship. Round-3
checks re-run against the same decoder rather than a rebuilt one.

| Output | Warm | Off-cold-hue | Accent |
|---|---|---|---|
| IMG-002 rev2 | 0.00% | 0.00% | 0.00% (no cobalt at all) |
| UI-004 rev2 frame A | 0.00% | 0.00% | 0.09% cobalt · 0.12% periwinkle |
| UI-004 rev2 frame B | 0.00% | 0.00% | 0.03% cobalt · 0.10% periwinkle |
| MOT-001 rev2 | 0.00% | 0.00% | 0.00% |
| MOT-002 rev2 | 0.00% | 0.00% | 0.29% cobalt |

---

## img/ — round 2

### IMG-002 rev2 — derived icon silhouette

| | |
|---|---|
| Camera UUID | `FEAD642F-88F1-4CEC-A083-1DD541F61E83.PNG` |
| File | `img/IMG-002-icon-study-rev2.png` |
| Dimensions | 1254 × 1254, no alpha |
| SHA-256 | `0a956f4f5545c0ca6f89e40af0d8575fe8193fb2395ecb9804fa8c24f979d82e` |
| Verdict | **Silhouette approved · geometry non-compliant** |
| Production eligibility | No, and never — this class is a study by design; the shipped icon stays `icon.svg`. |

**The round-1 defect is gone.** Round 1 failed because the stroke was fine stipple that
dissolved under downsampling and the cobalt knot carried recognition. Measured here:
99.38% of ink sits below L=48 (deep solid), the full-resolution mask is **one** connected
component with zero isolated deposits, and cobalt is **0.00%** of frame — there is no
accent to remove, so the removability requirement is satisfied trivially. At 32×32 the
single-bit mask holds as one component at every threshold tested (L<96/128/160/192,
coverage 12.8–16.9%). It clears all four automatic-rejection rows.

**It misses three numbers the prompt states.**

| Constraint | Required | Measured |
|---|---|---|
| Stroke width at its narrowest | ≈10% of canvas (125px) | **62px = 4.9%** |
| Clear margin, all sides | ≥12% | **9.17% / 9.17% / 9.09% / 9.57%** |
| Essential geometry inside central 76% | all | **2.91% of ink outside**; 1.90% clipped by an inscribed circular mask |

The waist is the cause of the fourth result: at 16×16 the single-bit mask **splits** —
21+13 px under 4-connectivity at the midpoint threshold (joined only diagonally), and
four fragments at L<96. It coheres only at loosened thresholds (L≥160). The prompt's
"must still work if converted to a single-bit black mask" does not hold at 16px.

*Next action — no third generation round.* The standing plan was always to re-derive the
selected silhouette programmatically into SVG, and all three misses are parameters that
derivation sets: thicken the waist to ≥10% of canvas, then scale to 76% and re-centre on
the ink bounding box for ≥12% margin. Re-run the 16px single-bit test after thickening;
that is the test that failed and the one that must pass.

---

## ui/ — round 2

### UI-004 rev2 — mobile fixed chrome, two frames

| | |
|---|---|
| Camera UUIDs | `558FCBB9-…` (frame A) · `178A6E67-…` (frame B) |
| Files | `ui/UI-004-mobile-chrome-rev2-frame-a.png`, `…-frame-b.png` |
| Dimensions | 853 × 1844 each (2.187× a 390×844 viewport), no alpha |
| SHA-256 (A) | `95827dd7da212750ff760950c3dbb88af9affde94db2cd05bbf7c570afa890dd` |
| SHA-256 (B) | `d1fdf6d78ed043dbc6e48583c8067f0ab65d020015359b51d8ca61356a896746` |
| Verdict | **Approved study** |
| Production eligibility | No, and never — mobile chrome ships as hand-authored code. |

**Both documented defects are resolved**, and this is the first study to advance the real
interface rather than replace it.

*The three-stack is gone.* Frame A has exactly **one** full-width rule below the gauge, at
CSS y 791.6 — a single bottom row 52.4 CSS px tall, clearing the 44px interaction target
through padding. The reference capture's `.optics` / `.rledger` / `.strip` stack at
715/754/784 has been consolidated.

*The floating map is gone.* The core-sample map is now a bordered box in a right-hand
column with a left border at CSS x 214.4; the rightmost body-text pixel in that band sits
at CSS x 204.4. **The text column clears the map by 10 CSS px** — no glyph reaches the
border. The reference capture's paragraph cut mid-line is fixed.

*The false persistence claim is gone.* Frame B reads `READER LEDGER · LOCAL SESSION` /
`OWNER-CLEARABLE`, with `VERIFY CHECKSUM`, `CLEAR LEDGER` and a `LEDGER ×` chip. Neither
frame contains `IMMUTABLE` or `APPEND-ONLY`. The status string now matches the ledger's
actual semantics instead of contradicting its own clear action. The panel measures CSS
675.8..800.3 = **124.5px = 14.8% of the viewport**, against a 40% cap; square corners,
visible scrollbar, no scrim and no modal treatment.

**Two minor defects, neither on a rejection row:**

1. In frame B one body line (`…the conservation laws of structure.`) crosses the map's
   left border by **3.2 CSS px** over a single 4.6px glyph row. Frame A's identical column
   clears by 10px, so this is a text-metrics artifact of generation, not a layout decision.
2. The open panel clips the equation line mid-glyph at its top edge. Inherent to a panel
   that expands upward — but it is the argument for `scroll-padding-bottom` in the
   implementation, so that opening the ledger never severs a line.

⚠️ **Do not lift strings from these frames.** Frame B's typography is corrupted in ways
that would ship as errors: `à CORE INDEX` (should be `Δ`), `invariant a` and `I_d` (should
be `k`), `group ection` (should be `action`), `at floor d^.` (should be `d*`), and a map
axis reading `102` where frame A reads `100`. The two frames even disagree on the body
copy — frame A says the ledger is *"truth under composition"*, frame B *"under
conservation"*. Take **geometry** from these studies and **copy from the repository.**

---

## motion/ — round 2

### MOT-001 rev2 — ink flip with square masked membranes

| | |
|---|---|
| Camera UUID | `B3A6C71D-3E6D-41ED-BCDB-C57FBDA19734.PNG` |
| File | `motion/MOT-001-ink-flip-rev2.png` |
| Dimensions | 2172 × 724, no alpha |
| SHA-256 | `d848d0191032a3ed221bf875784df3eebd57864287b6d0d0205f705145bfcde8` |
| Verdict | **Approved record** |
| Production eligibility | No, and never. |

**The rounded corners are gone — confirmed by cropping and zooming panels 2, 3 and 5, not
inferred.** Every membrane presents sharp 90° corners on its left edge, top and bottom;
the softness comes from alpha attenuation on the **right** edge only, which is exactly the
`mask-image` mechanism the real membrane uses. This is the distinction rev 2 was written
to force, and the output holds it.

Measured: substrate darkens monotonically across the five panels (L 190.2 → 167.2 → 121.3
→ 79.8 → 51.7). Reading ink flips dark→pale between panels 2 and 3. Four text blocks hold
position with **max vertical drift 6px** (<1% of panel height) — nothing translates,
scales or reflows. The substrate reads as genuine point-density stipple.

**One deviation, and the prompt is what is wrong.** Panel 3 was specified as "halfway
through a dark-to-light crossfade"; measured, it shows ink already on the light side at
reduced contrast (Michelson 0.265, against 0.451 and 0.620 in panels 4–5) with **0%** dark
ink remaining. No panel depicts a minimum-contrast midpoint — and it should not. The
implementation's `CytherSubstrate.READING` is **bistable with a hysteresis gap**
(`SW_DOWN 1.00 / SW_UP 0.91`), so the ink snaps between two states rather than fading
through an illegible middle. The storyboard is closer to the shipped behaviour than the
prompt language was. Correct the prompt, not the image.

Minor: panel 5's substrate (L 51.7) overshoots the specified `#3A4658` slate endpoint
(L≈68.8). Take the endpoint from the stylesheet, not the storyboard.

### MOT-002 rev2 — plate development, light-plate density law

| | |
|---|---|
| Camera UUID | `A6E904FB-1EFD-4C5B-8C7C-F87ACEB51F07.PNG` |
| File | `motion/MOT-002-plate-development-rev2.png` |
| Dimensions | 2508 × 627 (four 627×627 panels), no alpha |
| SHA-256 | `fff217468d748106303a5638b4eb03a51a27ce6ce9171c01b1a2ae5af8a38e33` |
| Verdict | **Approved record** |
| Production eligibility | No, and never. |

**The receipt test passes.** Mean luminance of the *same* 48×48 core box — located in panel
4 and then sampled at identical coordinates in all four panels:

| Panel | Mean L | Δ |
|---|---|---|
| 1 | 232.98 | — |
| 2 | 184.98 | −48.00 |
| 3 | 107.88 | −77.10 |
| 4 | **26.91** | −80.96 |

Monotonically decreasing, and panel 4's core lands at L 26.9 against the specified
`#101620` endpoint (L 21.4). The whole plate darkens with it (mean 234.67 → 227.11 →
210.64 → 183.71; ink coverage 0.03% → 21.03%). Round 1 stated this law **backwards**;
round 2 states it correctly.

No bloom. The radial profile outward from the core in panel 4 rises monotonically —
L 29.4 (r<40) → 63.1 → 102.9 → 139.1 → 180.0 → 207.2 (r 250–320) — so the densest point
is the darkest point and there is no bright ring. Pixels above paper luminance occur only
in the sparse periphery (edge overshoot beside filaments and open paper), never in the
core: the panel-4 core box maxes at L 130.1 against paper 242.7.

The cobalt lobe is a hue distinction inside accumulated ink, not an emission: it appears
only in panels 3–4 as specified, mean L 74.0 / 59.9, max L 147.8 — far below paper.
