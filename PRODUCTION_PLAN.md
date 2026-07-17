# PRODUCTION_PLAN.md — CytherAI Website: Substrate / Disclosure-Engine Implementation

**Status:** APPROVED FOR IMPLEMENTATION · 2026-07-17
**Authority:** This file supersedes the design spec inside the repo `CLAUDE.md`
("CytherAI Website — v3 Design System Implementation Guide" and everything below it).
The behavioral guidelines at the top of `CLAUDE.md` (think before coding, simplicity,
surgical changes, goal-driven execution) still apply. Where this plan and any other
document disagree, this plan wins.

**Reference implementations (source of truth for all logic — port, do not reinvent):**
- `newC3/synthesis-rev5.html` — content, sections, manifest, admission (dsin), claims
  registry, reader ledger, boundary instrument, epochal record, commitment, anti-manifest,
  hold-to-cross, briefing capture, intent-adaptive CTA.
- `newC3/substrate-demo.html` — the world architecture: orbit → 4 exposure tiles →
  derived camera → scroll-as-observation, core-sample minimap, fork (long-press on touch),
  resize/pointercancel/degenerate-fork safety. All known bugs are already fixed in these
  two files. Port their logic verbatim wherever this plan does not explicitly amend it.
- Prototypes stay in `newC3/` untouched — they are the design record (supersede, never erase).

**Model/effort note:** Every design decision is made in this file. If something appears
to require a new design decision, it does not — re-read the relevant section; if truly
absent, choose the option that adds the least code and note it in the commit message.
Do not redesign, restyle, or "improve" anything beyond what is written here.

---

## 0. Environment & verification harness

- macOS, Apple Silicon. **No node, no Chrome, no Playwright.** Only Safari for manual checks.
- JS syntax/logic verification: `jsc` at
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`.
  Every new JS module MUST be structured so `jsc js/<file>.js` parses it, and its pure
  logic (no DOM) can execute under jsc: wrap all DOM wiring in
  `if (typeof document !== "undefined") { ... }`.
- Manual serving: `python3 -m http.server 8000` from repo root.
- Scratch verify scripts: write throwaway harnesses to the session scratchpad, never into
  the repo. Pattern: copy the pure functions into a test file, run under jsc, compare
  against the expected invariants in §9.
- **Git:** the repo is not a git repository. First action of Phase 1: `git init`, add all,
  commit `pre-substrate state (graphite v2 + dossier subpages + newC3 prototypes)`.
  Commit at the end of every phase with the phase name. No remote, no push.

---

## 1. Current state (verified inventory, 2026-07-17)

| Area | Files | State |
|---|---|---|
| Homepage | `index.html` (403 ln) | "Graphite/Observable Record" design; loads `engine/trajectory-engine.js` → `content/record.js` → `profiles/disclosure.js` → `js/console.js` with SRI; strict CSP; build-hash meta |
| Engine stack | `engine/*`, `content/record.js`, `profiles/disclosure.js`, `js/console.js`, `pages/runner.html`, `trajectory-engine/*` | Separate ongoing project. Referenced ONLY by old `index.html` and `pages/runner.html` (verified by grep) |
| Subpages | `contact.html`, `pages/{brief,privacy,security,terms}.html` | Unmigrated dossier-era; reference `css/cytherai.css` (1019 ln), `js/cytherai.js`, `js/command-palette.js`, `js/sealed-artifact.js`, `js/cytherai-phase-transition.js` |
| Infra | `sw.js` (cache-first, `CACHE='cytherai-graphite-v2'`), `generate-integrity.sh` (SRI + build-hash patcher), `manifest.webmanifest` (dark graphite colors), CSP in each HTML head | Working; all lists reference old assets |
| Design record | `newC3/*` (3 concept prototypes, synthesis rev3–rev5, substrate-demo, epoch04-preimage.txt) | Approved; keep untouched |
| Misc | `backup/*`, `icon.svg`, `CLAUDE.md`, `CLAUDE_ADDENDUM.md` | `backup/` is the archive dir; `icon.svg` stays as-is |

---

## 2. Target architecture

### 2.1 Files to CREATE
| File | Contents (public symbols — exactly these, no more) |
|---|---|
| `js/manifest.js` | `window.CytherManifest = { MANIFEST, COMMITMENTS, PUBLISHED_NONCES, NORM, CANON, ADMISSION_NONCE, CHECKSUM, fnv, dsin, dcos, derive, seedsFor, paramsFor, admit, renderedRichness, normalizeManifest, stateChecksum, dsinOrbit }` — port from rev5 lines defining these + add `dsinOrbit(params, n)` returning a `Float32Array` of n orbit points computed with dsin/dcos (same warmup 40, start 0.08/0.12). Admission gains the legibility screen (§5.3) |
| `js/substrate.js` | `window.CytherSubstrate = { boot, redevelop, observe, fork API }` — port substrate-demo: `computeOrbit` (native sin, for tiles), tiles/render/observe/coremap/fork/resize/pointercancel, **camera anchors derived from `CytherManifest.dsinOrbit(params, 220000)`** instead of the native orbit (§5.2) |
| `js/claims.js` | `window.CytherClaims = { CLAIMS, setClaim, recomputeClaims, renderClaims, checkRenderManifest }` — port rev5 claims engine; registry per §5.4 (CL-01…CL-08) |
| `js/ledger.js` | `window.CytherLedger = { recordAct, ACTS }` — port rev5 reader ledger verbatim (self-report register, LEDGER_CLEARED genesis, diligence threshold, briefing capture, intent-adaptive CTA, mailto body) |
| `js/instrument.js` | `window.CytherInstrument = { audit }` — port rev5 boundary instrument verbatim (biEngine/biAdmit/biKernel, high-bit LCG, seeds 1 & 2, streaming via shared loop, 10k audit feeding CL-05) |
| `js/site.js` | no exports — glue: thesis weight-field, weight-waves, shared sleeping rAF loop (owns `wake()`/`loop()`; substrate fork redevelop and instrument streaming register step functions with it), hold-to-cross (pointer + keyboard + double-activation click path), zone/gauge driver, serial strip, epochal record + commitment chip render, floor manifest + anti-manifest render, boot order |
| `PRODUCTION_PLAN.md` | this file (already exists) |

Load order in `index.html` (all `defer`, SRI patched by generate-integrity.sh):
`js/manifest.js` → `js/substrate.js` → `js/claims.js` → `js/ledger.js` → `js/instrument.js` → `js/site.js`.

### 2.2 Files to REWRITE
- `index.html` — full rewrite (§6). Inline `<style>` only (CSP allows `style-src 'unsafe-inline'`;
  it does NOT allow inline `<script>` — all JS must be in the external modules above).
  Keep: CSP meta exactly as it is today, `manifest.webmanifest` link, build-hash meta
  (integrity script patches it), description/OG meta updated to the new register (§7.4).
- `css/cytherai.css` — full rewrite, subpages only (§6.5). New cold tokens, flat static
  treatment. No substrate, no world model, no JS requirements on subpages.
- `contact.html`, `pages/brief.html`, `pages/privacy.html`, `pages/security.html`,
  `pages/terms.html` — restyle against new css; remove ALL script tags for retired js;
  keep contact form action/logic; brief.html keeps v1.1 numbers (GVR beam = 100%,
  GVR temp/completion = 100%, IR 0.00%, params 16.1M — verify no 94.5% remains anywhere).
- `sw.js` — `CACHE = 'cytherai-substrate-v1'`; ASSETS = index.html, contact.html, the four
  pages, pages/runner.html, css/cytherai.css, the six new js modules, engine stack files
  (runner still needs them), manifest.webmanifest, icon.svg. Remove retired assets.
- `manifest.webmanifest` — `name: "CytherAI"`, `short_name: "CytherAI"`,
  `background_color: "#ECF0F4"`, `theme_color: "#101620"`. Keep icon block.
- `generate-integrity.sh` — RESOURCES = css/cytherai.css + the six new js modules + engine
  stack (runner's files); HTML_FILES = index.html, contact.html, 4 pages, runner.html.
- `CLAUDE.md` — keep the top behavioral-guidelines section verbatim; DELETE the entire v3
  dossier design spec below it; replace with ~40 lines describing the new architecture
  (file map §2, load order, the law, the register rules §7, verification harness §0,
  pointer to this plan and to `newC3/` as design record).

### 2.3 Files to RETIRE (move, never delete)
Create `backup/graphite-v2/`: move OLD `index.html` there (as `index.html`).
Create `backup/dossier-v3/`: move `js/cytherai.js`, `js/command-palette.js`,
`js/sealed-artifact.js`, `js/cytherai-phase-transition.js`, `css/cytherai-phase-transition.css`,
and a copy of the OLD `css/cytherai.css`.
`content/record.js`, `profiles/disclosure.js`, `js/console.js`, `engine/*`,
`trajectory-engine/*`, `pages/runner.html` stay in place (runner.html depends on them).

### 2.4 Explicitly OUT OF SCOPE (phase 2, do not start)
Arabic projection (string-table refactor + native review + "identical state, projected
twice" claim), co-derived mark (WebCrypto engagement protocol), per-system geology pages,
command palette revival, real WebCrypto conduct chain.

---

## 3. The design in one paragraph (context, not instructions)

The page is a disclosure engine. One derived object — the canonical mark, a Clifford
orbit whose four parameters are digests of the public manifest — IS the world: four
pre-rendered exposure tiles of it form the background, and scroll moves a derived camera
from far-field observation into the filament core (transform+opacity only; zero substrate
rasters per frame). Content descends by epistemic distance: claim → definition →
architecture → measurement → controlled → clearance → floor. Ambient light, ink, panels
interpolate continuously (no toggles). Standing claims execute as predicates against the
page itself. The reader keeps a local self-reported ledger. The law, printed at the floor:
*The surface states. Depth conditions. Records substantiate. Boundaries govern. The reader
is a record. Nothing is stated that is not checked.*

---

## 4. Locked design tokens & rules

### 4.1 Tokens (from substrate-demo, authoritative)
```
--bg:      written by observe()  (BGS keyframes below)
--ink:     written by observe()
--panel:   written by observe()  (PANELS keyframes below)
--accent:  #2036C7 at surface → interpolate to #7FA0FF at floor (add ACCENTS array,
           4 stops: #2036C7, #2A48D6, #5F7BFF, #7FA0FF — same bi/bf interpolation)
--hair:    color-mix(in srgb, var(--ink) 16%, transparent)
--mono:    'SF Mono', Menlo, 'Cascadia Code', 'Courier New', monospace
--display: system-ui, -apple-system, 'Segoe UI', sans-serif
BGS    = [["#ECF0F4","#101620"],["#B9C3D2","#131A26"],["#3A4658","#DDE6F2"],["#070A10","#C7D2E4"]]
PANELS = [[255,255,255,.60],[240,245,251,.55],[14,20,29,.50],[10,15,23,.55]]
```
No webfonts, no images, no CDNs — the CSP (`connect-src 'none'`, `script-src 'self'`)
enforces this at platform level; CL-01 observes it.

### 4.2 Register rules (grep-enforced, §9)
BANNED anywhere in shipped files: fake measurements (`−540 M` style meters), the strings
`CONDUCT RECEIPT` (it is a `READING SELF-REPORT`), `Append-only` (the reader ledger is
owner-erasable), `1e-12` (the compositing bound is `< 0.05 px · transform quantization`),
any `--gold`/`#d4af37`/warm-paper tokens, `DOC-2026-001` (document-register is retired).
The gauge shows `OBS <MODE> · ×<zoom>` and `DEPTH <nn>%` — true observables only.
The commitment chip must keep: "The page renders the commitment; it does not notarize it."

### 4.3 Accessibility & motion (all already implemented in the prototypes — carry them)
- Hold-to-cross: pointer hold (900ms), keyboard hold (Enter/Space keydown→keyup), AND
  double-activation click path for AT (two clicks within 4s).
- Fork: desktop = FORK button toggle + drag; touch = long-press 550ms (cancelled by >12px
  move); `pointercancel` releases the fork lock; `RETURN TO CANONICAL` always visible
  when forked.
- `prefers-reduced-motion`: no weight-field/waves; instrument runs 4000 proposals
  synchronously instead of streaming; instant morphs; scroll-behavior auto. Scroll-driven
  ambient/tile interpolation stays (scroll-linked, not autonomous).
- Focus-visible outlines in `--accent` everywhere. Ledger/claims buttons are real buttons.
- Mobile (≤640px): reader ledger docks as bottom bar (rev5 fix), core-sample map stays
  (56px, right:6px), proto/verbose chrome hides, sections stack.

### 4.4 Performance rules
- ONE shared rAF loop that sleeps (idle after 40 quiet frames) — `site.js` owns it;
  substrate fork-redevelop and instrument streaming register with it.
- Scroll cost: transform + opacity on tiles + CSS var writes + styled-overlay reticle.
  Zero canvas raster per scroll frame.
- Boot: tiles render once (native sin); admission verification runs AFTER load, chunked
  (80ms yields), from `PUBLISHED_NONCES` (rev5 pattern). Resize: debounced 160ms; height-only
  deltas <160px never re-render tiles (substrate-demo pattern).

---

## 5. Mechanism amendments (the only places the port differs from the prototypes)

### 5.1 One manifest, one page
`js/manifest.js` MANIFEST absorbs the real facts currently in `content/record.js`
(chain-of-record milestones, revision history, patent status) — see §8 data table.
The new index does NOT load the engine stack. `record.js` remains untouched on disk
for `runner.html`.

### 5.2 Camera ≡ derivation
Anchors derive from the **dsin orbit** (`CytherManifest.dsinOrbit`), not the native-sin
render orbit, so the journey is engine-invariant. New standing claim **CL-08
`CAMERA ≡ DERIVATION`**: the async verifier re-derives anchors from the manifest and
compares to the live camera path (same pattern as CL-03).

### 5.3 Legibility admission
Extend `admit()`: a nonce is admissible only if `renderedRichness(p) > 400` **and** the
text-lane metric passes. Text lane = the horizontal band of the far-field (×0.9) view
covering the content column (center 760px or 62% of width, whichever is smaller, full
height). Metric: fraction of 96-grid cells inside the lane whose dsin-orbit count exceeds
the orbit mean. Calibration procedure (do this in a jsc harness during Phase 1):
compute the metric for the canonical manifest at nonce 0; set
`LEGIBILITY_CAP = round(3 × measured, 2 decimals)`; hardcode it with the measured value
in a comment. New claim **CL-06b** asserts the canonical metric ≤ cap. This keeps
contrast checkable when the background is derived content.

### 5.4 Claims registry (final list)
CL-01 zero external requests (Resource Timing) · CL-02 render ≡ manifest ·
CL-03 published admission ≡ derivation (async verifier) · CL-04 serial ≡ state ·
CL-05 boundary emits no invalid program (quick 1500-proposal audit at boot, 10k on demand) ·
CL-06 headings ≥4.5:1 outside declared flip band (recompute band for the final keyframes;
declare it in the claim text; the prototype band was 32–52%) · CL-06b text-lane ≤ cap ·
CL-07 deterministic admission core (|dsin−sin| < 1e-6) · CL-08 camera ≡ derivation.
Footer: `CLAIMS n/9 HOLDING`; any failure prints `✕ INVALID` in place.

### 5.5 Sections ↔ exposures
Exposure depth `d = p*3` over full scroll (4 tiles, as in the demo). Stratum labels come
from section offsets (rev5 `computeZones` with `getBoundingClientRect().top + scrollY`).
Section order (locked): SURFACE (thesis + serial strip) → DEFINITION (5 failure modes) →
ARCHITECTURE (ladder + boundary instrument + 2 disclosed system cards + causality grid) →
MEASUREMENT (validation table + methodology + dagger footnote + PUBLIC RECORD TERMINATES
boundary) → CONTROLLED (ghost NTP stratum) → CLEARANCE (3 paths, featured CTA
intent-adaptive) → FLOOR (law · standing claims · public manifest · NOT CLAIMED ·
epochal record + commitment chip · colophon). All copy ports from rev5 verbatim, minus
prototype-only labels ("PROTOTYPE D", "REV 5", "synthesis"); colophon rewrites to describe
the production page (substrate, tiles, one loop, self-report register, closed causality).

### 5.6 The serial strip (from substrate-demo) replaces the framed mark
Bottom fixed strip: `MARK <serial> · ×<zoom> · FORK · <status> · CAPTURE BRIEFING STATE ·
RETURN TO CANONICAL`. Status values: `CANONICAL STATE · EPOCH 0n · <checksum> · ADMISSION
<PENDING|VERIFIED|MISMATCH…>` / `LOCAL FORK — VISITOR FORK OF THE PUBLIC CHECKSUM` /
`REPRODUCED FROM LINK · IDENTICAL BY CONSTRUCTION` / `DEVELOPING…`. Briefing capture and
`#m=`/`#d=`/`#x=` hash restore port from rev5 unchanged (fork params go to the substrate
redevelop instead of the framed mark).

---

## 6. Page specs

### 6.1 index.html skeleton
```
<head> CSP (unchanged) · meta (§7.4) · manifest link · inline <style>
<body>
  4 tile canvases + #substrate gesture layer      (substrate-demo)
  chrome: wordmark · gauge (OBS/DEPTH/STRATUM)    (no proto badge in production)
  core-sample minimap + reticle overlay           (substrate-demo, post-fix)
  main: 7 sections per §5.5                       (rev5 content)
  serial strip (§5.6) · reader ledger aside       (rev5, mobile-docked)
  footer: CLAIMS n/9 · © 2026 CYTHERAI · RIYADH, KSA · US PATENT PENDING
  6 script tags, defer, SRI
```

### 6.2 Emails (unchanged, verify): primary/qualified CTAs → `nda@cytherai.com`,
diligence → `review@cytherai.com`, contact form → `contact@cytherai.com` (keep form as-is).

### 6.3 Validation numbers (v1.1, locked): IR 0.00% vs 10.00% (DeepCAD) vs 0.93% (T2CAD†);
GVR beam 100% (n=100); GVR completion 100% (n=100); DimAcc ±3mm 99% / ±5mm 97% (n=35);
Multi-op encoder 91% (n=35); methodology/environment/source/evaluated-by rows + dagger
apparatus exactly as rev5; `CONTROLLED RECORDS — 03 · structure indexed · values sealed`.

### 6.4 Boundary crossing copy (locked, rev5): "PUBLIC RECORD TERMINATES HERE …
[HOLD TO CROSS BOUNDARY] … BOUNDARY — CLOSED · SCROLLING PAST REMAINS FREE" →
crossed: "BOUNDARY — CROSSED · CONTROLLED INDEX LEGIBLE"; sealed fields sharpen; featured
CTA becomes "Request Controlled Disclosure" + `REF NTP-2025-001`.

### 6.5 Subpages treatment (css/cytherai.css rewrite)
Flat cold surface `#ECF0F4`, ink `#101620`, hairlines via color-mix, mono metadata +
system-sans body, accent `#2036C7` ONLY for: links-as-actions, focus, form focus border,
verified/status values. No substrate, no ambient interpolation, no JS. A thin top strip:
`CYTHERAI · <PAGE NAME> · PUBLIC SURFACE` linking home. Footer matches index register.
Keep every legal/privacy/security TEXT unchanged — restyle only.

---

## 7. Data & content sources

### 7.1 REAL data (carry as-is)
- Validation v1.1 numbers (§6.3). ZATCA Phase 1 certification, April 2025, 2 production
  environments, zero core cloud dependency (SijilOS). CytherCAD facts (on-prem, private,
  log + external benchmark). Chain of record from `content/record.js`: 2024.Q4 ORIGINATED,
  2025.Q1 FILED (US provisional), 2026.Q1 VALIDATED, 2026.Q2 CURRENT — fold into the
  epochal/floor area as `PROVENANCE` rows in the floor manifest block. Emails. Coordinates
  line `24°41′N 46°43′E · UTC+3 · RIYADH, KSA`.

### 7.2 PROVISIONAL data (ship with rev5 values, marked `data-provisional="true"` on the
containing element; single source in js/manifest.js with a `/* PROVISIONAL */` comment)
| Item | Prototype value |
|---|---|
| epoch number / derived date | 03 / 2026-07-16 |
| systems_indexed / disclosed / controlled_references | 6 / 2 / 3 |
| public_records | 14 |
| validation_index string array | rev5 values |
| not_claimed entries | rev5 five entries |
| Epochs 01, 02 manifests (dates, revisions, contents) | rev5 fabricated values |
| Controlled entries 004 (EXECUTION RECEIPT), 005 (DETERMINISTIC ADMISSION) | rev5 |
| Claims-ledger receipt IDs (CL-2026-03-EVAL etc.) | rev4/5 placeholders — receipts-on-prose only if kept; else drop receipts-on-prose entirely in v1 (DECISION: drop; it returns with the real claims ledger) |
| Commitment epoch 04 digest | `c763fcd5faecb8c5…` from `newC3/epoch04-preimage.txt` (demo preimage; real one replaces it before launch) |

The user supplies real values later; the implementation must make replacement a
data-only edit in `js/manifest.js` (nothing hardcoded in HTML — floor manifest, epoch
chips, checksums, mark all derive).

### 7.3 Expected constants — IMPORTANT
Prototype-verified constants (checksum `8DC9:9FD1`, nonces 0/0/0, BI seed-2 10k =
38 admitted / 0 invalid, dsin max err 5.6e-8, contrast worst 4.87:1 outside 32–52%)
are valid ONLY for the exact prototype manifest snapshot. After merging §7.1 data the
derived values WILL change. The checks in §9 assert the INVARIANTS, not these constants.
Recompute and record the new constants in code comments during Phase 1.

### 7.4 Meta/description (locked copy)
Title: `CytherAI — Sovereign Operational AI`.
Description: `Evaluation-first AI systems, built to run where they are deployed — on-prem,
air-gapped, log-verified. This page makes no external request, and it states nothing it
cannot check.` OG tags mirror it.

---

## 8. Phases (commit after each; verify before committing)

**P1 — foundation.** `git init` + baseline commit. Write `js/manifest.js` (port rev5 +
`dsinOrbit` + legibility admission §5.3 + §7.1 data merge). Verify (jsc harness):
nonces re-derive to published; `stateChecksum` prints identically from NORM and from the
epoch-3 entry; dsin error < 1e-6; legibility cap calibrated and asserted; degenerate-params
`admit` returns null without hanging (bounded).

**P2 — world + claims.** `js/substrate.js` (port demo + camera-from-dsinOrbit),
`js/claims.js` (CL-01…CL-08 + CL-06b). Verify: camera anchors from dsin orbit are
deterministic across two jsc runs; bounded camera walk terminates on collapsed input;
compositing worst-case (with toFixed quantization) < 0.05px in harness; contrast sweep
holds outside the declared band for the final keyframes (adjust band edges if needed,
then write them into CL-06's claim text).

**P3 — conduct + instrument + glue.** `js/ledger.js`, `js/instrument.js`, `js/site.js`.
Verify: jsc parses all; BI seed-2 10k audit = 0 invalid & >0 admitted; ledger clear
records `LEDGER_CLEARED` genesis; diligence threshold excludes PAGE_OPENED and
LEDGER_CLEARED; mailto body begins `READING SELF-REPORT` + `SELF-REPORTED — NOT
INDEPENDENTLY VERIFIABLE`.

**P4 — index.html.** Assemble per §6.1 with inline CSS merged from rev5+demo (tokens §4.1).
Verify: no inline `<script>` anywhere (CSP); all six modules referenced defer in order;
banned-strings grep clean (§9); serve locally, manual pass in Safari (§9 manual list).

**P5 — subpages.** Rewrite `css/cytherai.css`; restyle the five subpages; strip retired
script tags; brief.html numbers check (no `94.5`). Verify: `grep -rn 'gold\|d4af37'` clean;
every subpage loads with zero JS errors and zero external requests.

**P6 — infra + retirement.** sw.js (new cache name + asset list), webmanifest colors,
generate-integrity.sh lists, run `./generate-integrity.sh`, CLAUDE.md rewrite (§2.2),
move retired files (§2.3). Verify: integrity script exits 0 and HTML files carry fresh
SRI + build-hash; `grep -rn 'graphite-v2'` only in backup/; old index unreachable from
any link; runner.html still loads its engine stack.

**P7 — final sweep.** Run the complete §9 checklist. Commit `substrate v1 · production`.

---

## 9. Final verification checklist

Automated (run each; expected result stated):
1. `jsc` parses all six modules (only DOM-global ReferenceErrors allowed, no SyntaxError).
2. `grep -rnE 'https?://' index.html contact.html pages css js` → only `mailto:`-free
   matches allowed: NONE (CSP meta contains no URLs; verify zero matches outside comments).
3. Banned strings: `grep -rnE '−540|CONDUCT RECEIPT|Append-only|1e-12|--gold|d4af37|94\.5|DOC-2026-001|PROTOTYPE' index.html css js contact.html pages` → 0 matches.
4. Claims harness: all 9 predicates return ok:true against the shipped data (jsc, DOM-free
   variants where applicable).
5. Degenerate-fork suite: collapsed params → admit null (no hang), camera walk ≤256 tries,
   span floor active, no NaN in transform math.
6. Compositing error harness < 0.05px. Contrast sweep ≥4.5:1 outside the declared band.
7. `./generate-integrity.sh` exits 0; every script tag has integrity + crossorigin.

Manual (Safari, desktop + responsive mode 390px; user does this):
scroll full descent (light falls continuously, no pops) · claims table all HOLDING ·
network tab empty after load · fork (drag + long-press) then RETURN TO CANONICAL ·
capture briefing state, open link in new tab, same view/state · hold-to-cross with mouse,
keyboard, and double-click · run proposer + 10k audit · reduced-motion pass
(System Settings → Accessibility) · ledger clear → genesis act · mobile: ledger docked,
gauge legible, no horizontal scroll.

---

## 10. What the user still owes (does not block implementation)
Real epoch-01/02 history · real manifest counts · real commitment preimage (kept private) ·
real claims-ledger IDs (revives receipts-on-prose) · native-Arabic review before the
projection phase · decision on publishing (hosting) — all replace PROVISIONAL data in
`js/manifest.js` only.
