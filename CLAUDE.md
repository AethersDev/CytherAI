# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

This is a **pure static site** — no build system, no package manager, no bundler, no tests, no linter. Open `index.html` in a browser or serve with any static file server (e.g., `python3 -m http.server 8000`).

## Architecture

**Pages:** `index.html` (main landing), `contact.html`, `pages/brief.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`

**CSS:** `css/cytherai.css` is the shared stylesheet for all pages except `index.html`, which has its own inline `<style>` block. Both define the same CSS custom property tokens in `:root`. The design system uses a "Dossier" metaphor — archival paper surfaces, monospace typography, document-style layout with rail navigation.

**JS (3 IIFE modules, no dependencies):**
- `js/cytherai.js` → `window.cytherai` — Navigation scroll behavior, smooth scrolling, keyboard/mouse focus mode detection, reduced-motion support
- `js/command-palette.js` → `window.commandPalette` — Cmd+K command palette overlay (search, navigation, artifact report download)
- `js/sealed-artifact.js` → `window.sealedArtifact` — PerformanceObserver-based external request monitoring, build hash integrity display
- `js/cytherai-phase-transition.js` — **Dormant by design; no `<script>` tag loads it**

**Layout pattern:** Each main section is a `.doc-section` containing a `.doc-rail` (left sidebar, 148px, hidden on mobile ≤768px) and `.doc-content` (main column). Mobile uses `.section-stamp` elements instead of the rail.

**Color discipline (critical for any visual changes):**
- `--brass` (#7A5B1B) — state transitions ONLY (active section markers, key outcomes, scope value, proof fragment accent)
- `--dark-restricted` (#202226) — Exhibit C (restricted appendix) ONLY
- `--rule` (#B9AE97) — all structural borders and dividers
- `--paper` / `--paper-dense` / `--paper-lifted` — surface hierarchy
- `--ink` / `--ink-mid` / `--ink-quiet` — text hierarchy

**Companion spec:** `CLAUDE_ADDENDUM.md` extends the design spec below with §04 Provenance, §05 Protocol, ambient layers (film grain, registration marks, document seal), and additional component definitions.

---

# CytherAI Website — v3 Design System Implementation Guide

## What This Is
Complete redesign from the existing dark-theme to the approved "Dossier" system (v3).
Surface: archival paper. Darkness: restricted states only. Brass: state transitions only.
This file is the authoritative implementation spec. Read all sections before touching any file.

---

## Implementation Order — Do Not Skip Steps

1. `css/cytherai.css` — token foundation (subpages + contact depend on this)
2. `index.html` — main page (has its own inline CSS; rewrite entirely preserving all content)
3. `contact.html` — update palette and nav
4. `pages/brief.html` — update palette + fix stale metrics to v1.1
5. `pages/privacy.html`, `pages/security.html`, `pages/terms.html` — palette update only
6. `js/cytherai.js` — 3 bug fixes
7. `js/command-palette.js` — 4 bug fixes
8. `js/sealed-artifact.js` — 2 bug fixes

---

## V3 Design Tokens

Apply these CSS custom properties in **both** `css/cytherai.css :root` and `index.html :root`.

```css
:root {
  /* Surfaces */
  --paper:           #E7DFD1;   /* primary — cover, designation, validation */
  --paper-dense:     #DDD4C4;   /* rail, stamps, exhibits area, clearance bg */
  --paper-lifted:    #F1EBE0;   /* instrument panels, record fields, proof fragment bg */

  /* Ink */
  --ink:             #171612;   /* headlines, primary CTA fill, strongest text */
  --ink-mid:         #4D493F;   /* body copy, field values */
  --ink-quiet:       #7B7467;   /* metadata, labels, filing gray */

  /* Structure */
  --rule:            #B9AE97;   /* all borders, dividers, hairlines */

  /* State signals */
  --brass:           #7A5B1B;   /* state transitions ONLY — see Brass Discipline */
  --dark-restricted: #202226;   /* restricted states ONLY — see Dark Discipline */

  /* Typography */
  --font-serif: Georgia, 'Times New Roman', serif;
  --font-sans:  system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono:  'SF Mono', Menlo, 'Courier New', monospace;
}
```

---

## Brass Discipline — CRITICAL

`var(--brass)` / `#7A5B1B` appears **only** where something has changed state, been verified, or is the primary decision point.

**Brass IS used for:**
- `SCOPE: PUBLIC SURFACE` value in the document control strip
- The **active** `§NN` marker in the left rail (current section indicator)
- 2px left-border accent on the proof fragment block
- 2px left-border accent on Key Outcome panels in exhibits
- 2px top-line accent on the featured clearance path (Capability Review)
- `● LOG-VERIFIED` legend marker in the validation section
- CytherCAD column metric **values** in the validation table (numbers only, not bars)
- "Sovereign Operational AI" eyebrow — the declared thesis seal line (one explicit exception)

**Brass is NOT used for:**
- Section header label text (`SECTION 01 · DESIGNATION`, etc.)
- Inactive `§NN` markers (those use `var(--rule)`)
- Any exhibit header labels
- Secondary CTA border or text
- Navigation links on hover
- Validation bar fills (those are `var(--ink-quiet)` at opacity)
- Any decorative or structural borders (all use `var(--rule)`)

---

## Dark Discipline — CRITICAL

`var(--dark-restricted)` / `#202226` appears **only** for restricted-access states.

**Dark IS used for:**
- Exhibit C (Restricted Appendix) — entire card background
- The primary CTA button fill uses `var(--ink)` (`#171612`), not the dark-restricted value

**Dark is NOT used for:**
- Page backgrounds
- Navigation
- Section backgrounds
- Any decorative purpose

---

## Typography System

Two materials, each with a defined role:

| Material | Font | Applies to |
|----------|------|-----------|
| Infrastructure | `var(--font-mono)` | Rail, document control, stamps, labels, metadata, table content, exhibit IDs, body copy, form fields, all small text |
| Authority | `var(--font-serif)` (Georgia italic) | Section thesis headlines, product names in exhibit titles |

Body copy: `font-family: var(--font-mono)`, `font-size: 12px`, `line-height: 1.85`, `color: var(--ink-mid)`.

---

## Phase 1: css/cytherai.css

**Completely rewrite this file.** It serves `contact.html` and all `pages/*.html`.
Keep the same component names where possible so existing HTML references still work,
but update all color values and add new components below.

### Token block
Add the `:root` token block defined above.

### Core layout classes to keep (update colors only)
- `.nav`, `.nav-container`, `.nav-brand`, `.nav-links` — update: bg to `rgba(231,223,209,.94)`, text to `var(--ink)`, link hover to `var(--ink)` (not gold)
- `.section` — update bg to `var(--paper)`, remove gold-tinted borders
- `.btn`, `.btn-primary`, `.btn-secondary` — primary: bg `var(--ink)`, text `var(--paper)`; secondary: border `var(--rule)`, text `var(--ink-mid)`
- `.form-input`, `.form-textarea` — bg `var(--paper-lifted)`, border `var(--rule)`, focus border `var(--brass)`
- `.footer`, `.footer-container`, `.footer-text`, `.footer-links` — bg `var(--paper-dense)`, border-top `var(--rule)`, text `var(--ink-quiet)`
- `.skip-link` — bg `var(--ink)`, color `var(--paper)`
- `.command-palette`, `.command-container`, `.command-input`, `.command-results`, `.command-item` — keep dark theme for command palette ONLY (it's a restricted-state overlay); update border colors to `var(--rule)` but keep `var(--dark-restricted)` or near-black background

### New components to add

**`.doc-control` / `.doc-control-row`** — Document control strip at page top
- Two rows on mobile (22px each), single row on desktop (26px)
- Background: `var(--paper-dense)`, border-bottom: `1px solid var(--rule)`
- Font: mono 9px, letter-spacing .18em, uppercase, color `var(--ink-quiet)`
- `.doc-control-scope` class: color `var(--brass)` (the SCOPE field value)

**`.doc-section`** — Flex row container for each content section
- `display: flex` with `border-top: 1px solid var(--rule)` between sections

**`.doc-rail`** — Left sidebar column (148px, desktop only)
- `width: 148px`, `flex-shrink: 0`, `border-right: 1px solid var(--rule)`
- Background: `var(--paper-dense)`, padding: `28px 18px 28px 22px`
- Contains: brand label, progress strand (vertical 1px line), section nav links
- Hidden on mobile: `@media (max-width: 768px) { display: none; }`
- Progress strand: `::before` (full height, `var(--rule)`) + `::after` (active portion, `var(--brass)`, height controlled via `--strand-progress` CSS var set by JS)

**`.doc-content`** — Main content column (flex: 1)
- Padding: `38px 44px 38px 38px` desktop; `26px 20px` mobile

**`.section-stamp`** — Mobile-only section identifier (replaces rail on mobile)
- Hidden on desktop, visible on mobile: `@media (max-width: 768px) { display: flex; }`
- Height: 24px, background `var(--paper-dense)`, border-bottom `1px solid var(--rule)`
- Hard flat — no border-radius, no shadow, no floating behavior
- `.section-stamp-id` active state: `color: var(--brass)`; inactive: `color: var(--rule)`

**`.section-strip`** — Bottom strip of each section (28px desktop, 24px mobile)
- `border-top: 1px solid var(--rule)`, font mono 9px, color `var(--ink-quiet)`, uppercase

**`.proof-fragment`** — Cover excerpt block
- `border-left: 2px solid var(--brass)`, background `var(--paper-lifted)`
- Source line: mono 9px, `var(--ink-quiet)`, separator below with `var(--rule)`
- Body text: mono 12px, italic, `var(--ink-mid)`
- Field line: indented with 1px left border `var(--rule)`, `var(--ink-quiet)`

**`.doc-exhibit`** — Forensic file record
- Background `var(--paper)`, border `1px solid var(--rule)`
- Header: 28px, `var(--paper-dense)` bg, flex space-between, mono 9px
- Body: padding `16px 14px`
- Table rows: `border-bottom: 1px solid var(--rule)`, left cell mono 9px `var(--ink-quiet)`, right cell mono 10px `var(--ink-mid)` right-aligned
- `.doc-exhibit-outcome`: `border-left: 2px solid var(--brass)`, bg `var(--paper-lifted)`
- `.doc-exhibit-outcome-label`: mono 9px, `var(--brass)`, uppercase
- Footer: `border-top: 1px solid var(--rule)`, space-between, disclosure `var(--ink-quiet)`, action link `var(--ink-mid)` with `border-bottom: 1px solid var(--rule)`

**`.doc-exhibit-restricted`** — Exhibit C (dark state)
- Override: bg `var(--dark-restricted)`, border `rgba(185,174,151,.12)`
- Inner text uses rgba values for the dark-on-dark typography (see v3 mockup)
- Paper fold: a 4px strip of `var(--paper)` color at the top interior of the panel (inside the border, above the header) — use a `::before` pseudo-element or a dedicated div with `height: 4px; background: var(--paper)`

**`.validation-panel`** — §03 instrument table
- Background `var(--paper-lifted)`, border `1px solid var(--rule)`
- Legend row: brass for LOG-VERIFIED, `var(--ink-quiet)` for EXT-VALIDATED, `var(--rule)` for NOT DISCLOSED
- Column headers: CYTHER col uses `var(--brass)`, competitor cols use `var(--rule)`
- Metric values: CYTHER values use `var(--brass) font-weight:500`, competitor values use `var(--rule)`
- Bars: 2px height, track `var(--paper-dense)`, fill `var(--ink-quiet)` at opacity (no brass on bars)
- Methodology grid: 2-col, labels `var(--ink-quiet)`, values `var(--ink-mid)`
- **Footnote apparatus**: ruled separator, dagger on its own block-level line, source content below — styled as document apparatus, NOT as disclaimer text (see below)

**`.validation-footnote`** — Dagger apparatus (CRITICAL — must feel like a report note)
```
Structure:
  <div class="validation-footnote">
    <hr class="validation-footnote-rule"> ← thin rule, 1px, var(--rule)
    <span class="validation-footnote-dagger">† Text2CAD-192 (T2CAD): 0.93% invalid rate.</span>
    <p class="validation-footnote-note">External benchmark; evaluation not conducted or curated by CytherAI.</p>
  </div>
```
Dagger line: mono 9px, `var(--ink-quiet)`, display block. Note: mono 9px, `var(--ink-quiet)`, line-height 1.8. No parenthetical inline text — everything on separate lines.

**`.clearance-grid`** — §04 three-path grid
- `grid-template-columns: repeat(3, 1fr)`, gap `2px`, single column on mobile
- `.clearance-path-featured`: featured Capability Review path — `border: 1px solid var(--brass)` + 2px top accent line in `var(--brass)` (on desktop, top line spans card width with 16px inset; **on mobile, spans full card width left:0 right:0**)
- Primary CTA button: bg `var(--ink)`, text `var(--paper)`, mono 10px
- Secondary CTA button: border `1px solid var(--rule)`, text `var(--ink-mid)`

### Mobile cadence rules (append to cytherai.css)
```css
@media (max-width: 768px) {
  /* R1: 32px above every section stamp — chapter breath */
  .section-stamp { margin-top: 32px; }
  .doc-section:first-of-type .section-stamp { margin-top: 0; }

  /* R4: 40px re-entry after dark wall — register change signal */
  /* Add class "section-after-dark" to the §03 section wrapper */
  .section-after-dark > .section-stamp { margin-top: 40px; }

  /* R2: proof fragment gets extra breathing room */
  .proof-fragment { margin-top: 20px; }  /* above it, not inside */

  /* Validation table: drop third comparison column, add footnote */
  .validation-hide-mobile { display: none; }

  /* Exhibit C: full width dark barrier */
  .doc-exhibit-restricted { width: 100%; }
}
```

---

## Phase 2: index.html

**Rewrite completely.** Preserve all existing content — remap it to the v3 structure below.
The current inline CSS uses a different token set; replace it entirely.

### New HTML document structure
```
<html>
<head>
  <style> ← inline CSS with v3 tokens (light theme)
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <!-- Document control strip -->
  <div class="doc-control">
    <div class="doc-control-row">
      <span>DOC-2026-001 · REV 1.4</span>
      <span>ISSUED 15 APR 2026</span>
      <span class="doc-control-scope">SCOPE: PUBLIC SURFACE</span>
      <span>BUILD: 4A7F2C1E</span>
    </div>
  </div>
  <!-- On mobile the single row becomes two rows via CSS -->

  <!-- Navigation: MUST have BOTH id="nav" AND class="nav" -->
  <nav id="nav" class="nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner"> ... </div>
  </nav>

  <main id="main-content">

    <!-- §00 COVER -->
    <section class="doc-section" id="cover" aria-label="Cover">
      <aside class="doc-rail">
        <span class="doc-rail-brand">CYTHERAI</span>
        <div class="doc-rail-strand">
          <nav class="rail-nav" aria-label="Document sections">
            <a class="rail-link active" href="#cover">§00 · COVER</a>
            <a class="rail-link" href="#designation">§01 · DESIGNATION</a>
            <a class="rail-link" href="#exhibits">§02 · EXHIBITS</a>
            <a class="rail-link" href="#validation">§03 · VALIDATION</a>
            <a class="rail-link" href="#clearance">§04 · CLEARANCE</a>
          </nav>
        </div>
      </aside>
      <div class="doc-content cover-content">
        <!-- Mark SVG (existing crown SVG, updated fill colors to brass/rule palette) -->
        <!-- "Sovereign Operational AI" eyebrow in brass -->
        <!-- Headline: Georgia serif, "Built for environments where / failure has consequence." -->
        <!-- Subline: mono body copy -->
        <!-- Proof fragment block (.proof-fragment) -->
        <!-- CTAs: primary "Request a Conversation", secondary "View Selected Work" -->
        <!-- Coordinates: "24°41′N 46°43′E · UTC+3 ..." -->
      </div>
    </section>

    <!-- §01 DESIGNATION -->
    <section class="doc-section" id="designation" aria-label="Designation">
      <div class="section-stamp" aria-hidden="true">
        <span class="section-stamp-id">§01 · DESIGNATION</span>
        <span class="section-stamp-page">02 / 07</span>
      </div>
      <aside class="doc-rail">
        <span class="doc-rail-stamp">§01</span>
        <div class="doc-rail-meta">DESIGNATION<br>—<br>PUBLIC SURFACE</div>
      </aside>
      <div class="doc-content">
        <!-- Section label + serif headline -->
        <!-- Two-column grid: left=body prose, right=3 principle cards -->
        <!-- Principle cards (.principle-card): 01 Evaluation Before Architecture,
             02 Deployment for Real Environments, 03 Security as First Principle -->
      </div>
    </section>

    <!-- §02 EXHIBITS -->
    <section class="doc-section" id="exhibits" aria-label="Selected Exhibits">
      <div class="section-stamp">
        <span class="section-stamp-id">§02 · EXHIBITS</span>
        <span class="section-stamp-page">03 / 07</span>
      </div>
      <aside class="doc-rail">
        <span class="doc-rail-stamp">§02</span>
        <div class="doc-rail-meta">EXHIBITS<br>—<br>SEE DISCLOSURE</div>
      </aside>
      <div class="doc-content">
        <div class="exhibits-grid"> ← 3-column desktop, single column mobile
          <!-- EXHIBIT A: CytherCAD — Technical Validation Record
               Exhibit ID: CAD-2024-001
               Type label: TECHNICAL VALIDATION RECORD
               Title: CytherCAD — Controlled Generative CAD (serif italic)
               Table: Status=Production-validated, Verified=Log + external benchmark, Context=On-prem · Private
               Key Outcome: IR 0.00% vs 10.00% (DeepCAD) · Text2CAD-192
               Disclosure: Public Surface -->

          <!-- EXHIBIT B: SijilOS — Deployment Operational Record
               Exhibit ID: SIJ-2025-001
               Type label: DEPLOYMENT OPERATIONAL RECORD
               Title: SijilOS — Event-Sourced Ledger Engine (serif italic)
               Compliance block: ZATCA Phase 1 · Kingdom of Saudi Arabia / Certified compliant · April 2025
               Operational Status: Live beta · 2 production environments / Offline-first · Zero core cloud dependency
               Key Outcome: Zero core cloud dependency · Full offline operation
               Disclosure: Public Surface -->

          <!-- EXHIBIT C: NTP — Restricted Appendix (DARK STATE)
               Exhibit ID: NTP-2025-001
               4px paper fold strip at top interior (before header)
               Type label: APPENDIX INDEX · ENTRY 003
               Ghost title: Neural Theorem Prover — Zero Dependency NTP (barely visible)
               Index fields: Content=Sealed pending access grant, Reference=NTP-2025-001
               Disclosure: DISCLOSURE LEVEL / RESTRICTED APPENDIX
               Requirement: Verified Context Required / NDA · Identity Confirmation
               Button: "Request Clearance" -->
        </div>
      </div>
    </section>

    <!-- §03 VALIDATION -->
    <section class="doc-section section-after-dark" id="validation" aria-label="Validation Readout">
      <div class="section-stamp">
        <span class="section-stamp-id">§03 · VALIDATION</span>
        <span class="section-stamp-page">04 / 07</span>
      </div>
      <aside class="doc-rail">
        <span class="doc-rail-stamp">§03</span>
        <div class="doc-rail-meta">VALIDATION<br>—<br>QUALIFIED ACCESS</div>
        <div class="doc-rail-note">Log-verified.<br>Conditions<br>documented.<br>n= noted per<br>measurement.</div>
      </aside>
      <div class="doc-content">
        <!-- Section label + subtitle: "CytherCAD v1.1 · External benchmark · Text2CAD-192" -->
        <!-- .validation-panel containing: -->
        <!--   Legend: ● LOG-VERIFIED (brass), ◌ EXT-VALIDATED (ink-quiet), — NOT DISCLOSED (rule) -->
        <!--   Table header: METRIC | CYTHER (brass) | DeepCAD (rule) | T2CAD (rule) -->
        <!--                 On mobile: hide T2CAD column, add class "validation-hide-mobile" -->
        <!--   Rows (v1.1 numbers — CRITICAL, these replace the old 94.5% figures): -->
        <!--     ◌ Invalid Rate (↓ better)          0.00%   10.00%   0.93%  -->
        <!--     ● GVR · Constrained Beam (n=100)   100%    —        —      -->
        <!--     ● GVR · Completion (n=100)          100%    —        —      -->
        <!--     ● Dimensional Accuracy ±3mm (n=35)  99%     —        —      -->
        <!--     ● Dimensional Accuracy ±5mm (n=35)  97%     —        —      -->
        <!--     ● Multi-Op Accuracy · Encoder (n=35) 91%   —        —      -->
        <!--   Bars: 2px, ink-quiet at opacity (decreasing for lower metrics) -->
        <!--   Methodology grid (2-col): -->
        <!--     Methodology: Autoregressive generation · constrained decoding · kernel-backed geometric verification -->
        <!--     Test Environment: Air-gapped · No external calls · Apple Silicon M4 · Local inference only -->
        <!--     Benchmark Source: Text2CAD-192 · External · Published · Not operated by CytherAI -->
        <!--     Evaluated By: CytherAI internal evaluation · April 2026 · Log-verified -->
        <!--   Footnote apparatus (.validation-footnote): -->
        <!--     <hr> rule, then "† Text2CAD-192 (T2CAD): 0.93% invalid rate." on its own line, -->
        <!--     then "External benchmark; evaluation not conducted or curated by CytherAI." -->
        <!--     On mobile: this footnote serves as the T2CAD reference since column is hidden -->
      </div>
    </section>

    <!-- §04 CLEARANCE -->
    <section class="doc-section" id="clearance" aria-label="Access Clearance">
      <div class="section-stamp">
        <span class="section-stamp-id">§04 · CLEARANCE</span>
        <span class="section-stamp-page">05 / 07</span>
      </div>
      <aside class="doc-rail">
        <span class="doc-rail-stamp">§04</span>
        <div class="doc-rail-meta">CLEARANCE<br>—<br>SEE PATHS</div>
      </aside>
      <div class="doc-content">
        <!-- Section label + serif headline: "Selective about what gets built. / Thorough about how it gets built." -->
        <!-- Body prose -->
        <!-- .clearance-grid (3 paths): -->
        <!--   PUBLIC MATERIALS: open surface, no CTA, note "Open access · No qualification" -->
        <!--   CAPABILITY REVIEW (featured, .clearance-path-featured): qualified access, -->
        <!--     btn "Request NDA Briefing" → mailto:nda@cytherai.com -->
        <!--   TECHNICAL DILIGENCE: controlled review, -->
        <!--     btn "Request Diligence Window" → mailto:review@cytherai.com -->
      </div>
    </section>

  </main>

  <footer class="footer">
    <div class="footer-container">
      <div class="footer-text">© 2026 CytherAI · Riyadh, KSA · US Patent Pending</div>
      <ul class="footer-links">
        <li><a href="pages/security.html">Security</a></li>
        <li><a href="pages/privacy.html">Privacy</a></li>
        <li><a href="pages/terms.html">Terms</a></li>
        <li><a href="mailto:contact@cytherai.com">Contact</a></li>
      </ul>
    </div>
  </footer>

  <script src="js/cytherai.js" defer></script>
  <script src="js/command-palette.js" defer></script>
  <script src="js/sealed-artifact.js" defer></script>

  <script>
    /* Inline: year, rail progress, scroll-driven active section */
    (function() {
      'use strict';
      // Year
      const yr = document.getElementById('yr');
      if (yr) yr.textContent = new Date().getFullYear();

      // Rail scroll-driven active section
      const railLinks = document.querySelectorAll('.rail-link');
      const sections = document.querySelectorAll('.doc-section[id]');
      const railStrand = document.querySelector('.doc-rail-strand');

      function updateRail() {
        let active = sections[0];
        sections.forEach(sec => {
          if (sec.getBoundingClientRect().top <= 80) active = sec;
        });
        railLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + active.id);
        });
        if (railStrand) {
          const totalH = document.body.scrollHeight - window.innerHeight;
          const pct = totalH > 0 ? Math.round((window.scrollY / totalH) * 100) : 0;
          railStrand.style.setProperty('--strand-progress', pct + '%');
        }
      }

      window.addEventListener('scroll', updateRail, { passive: true });
      updateRail();
    })();
  </script>
</body>
</html>
```

### index.html inline CSS notes
- Copy the `:root` token block above into the `<style>` tag
- Keep the nav CSS using `var(--paper)` rgba for the backdrop, border `var(--rule)`, text `var(--ink)`
- The cover section should NOT use `.nav-scrolled` trick from the old inline script — `cytherai.js` now handles it (see JS fix below)
- The `.reveal` IntersectionObserver script can stay but update the revealed-state to simply add `visible` class (remove transform if any)
- Remove the old `--gold`, `--gold-bright`, etc. tokens
- The nav CTA `href` should point to `mailto:nda@cytherai.com?subject=Capability%20Conversation%20Request`
- Nav links should point to `#designation`, `#exhibits`, `#validation`, `#clearance`

---

## Phase 3: contact.html

- Update stylesheet link: already `href="css/cytherai.css"` — fine as-is
- Update nav: add `class="nav"` to ensure it has both id and class (check current markup)
- Update background and text: form section should use `background: var(--paper)`, text `var(--ink)`
- The "COMMUNICATION PROTOCOL" stamp: change from gold text to `var(--brass)`
- Section heading: stays `var(--ink)`
- Form feedback: success uses `rgba(122,91,27,.1)` border (brass) + `var(--brass)` text; error keeps red
- The copy-email button and direct channel links: update from `var(--gold)` to `var(--brass)`
- Security/NDA email links: `var(--brass)`
- Footer links in page should match v3 palette

---

## Phase 4: pages/brief.html

Same palette updates as contact.html, PLUS:

**Critical metric updates (v1.1 numbers replace old values):**
- "Validity (beam)" card: keep 100% ✓
- **"Validity (temp)" card: change 94.5% → 100%** (v1.1 locked number)
- "Parameters" card: keep 16.1M ✓
- Add note: "Constrained decoding + kernel-backed geometric verification"

The 94.5% figure was pre-fix (before FILLET edge-feasibility fix). v1.1 GVR is 100% for both beam and temp.

Also update the `REQUEST NDA BRIEFING` button colors to ink-on-paper (no gold).

---

## Phase 5: pages/privacy.html, security.html, terms.html

Palette update only. These pages inherit from `cytherai.css`. The rewritten CSS handles most of it.
Check and update any inline color overrides in the HTML itself (look for `color: var(--gold)` or hardcoded `#d4af37` and replace with `var(--brass)` or `var(--ink-quiet)` as appropriate).

For email links styled as gold: change to `var(--brass)` where they signal action, `var(--ink-mid)` where they're just inline references.

---

## Phase 6: js/cytherai.js — Bug Fixes

### Fix 1: Nav querySelector (CRITICAL)
In `setupNavigation()`:
```js
// CURRENT (broken on index.html — nav has id="nav" not class=".nav"):
const nav = document.querySelector('.nav');

// FIX: select by either class or id
const nav = document.querySelector('.nav, #nav');
```

### Fix 2: Nav scroll threshold inconsistency
The inline script in the old index.html used `scrollY > 60`; cytherai.js uses `scrollY > 100`.
After the index.html rewrite removes the inline scroll handler, cytherai.js is the single source.
Standardize to `window.scrollY > 60` for the `.scrolled` class toggle.

### Fix 3: keyboard-nav class has no CSS consumer
`_manageFocus()` adds/removes `keyboard-nav` class on body. The class has no CSS rules anywhere.
Add to `cytherai.css`:
```css
body.keyboard-nav :focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
}
```
(Add this rule in cytherai.css, not in the JS.)

---

## Phase 7: js/command-palette.js — Bug Fixes

### Fix 1: _downloadReport() Firefox compatibility
```js
// CURRENT (breaks in Firefox — anchor not in DOM):
a.click();

// FIX: append, click, remove
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

### Fix 2: _downloadReport() silent failure on subpages
```js
// CURRENT:
if (!global.sealedArtifact) return;  // ← silent no-op

// FIX: notify user before returning
if (!global.sealedArtifact) {
  this._notify('Artifact monitor not active on this page.');
  return;
}
```

### Fix 3: Dead disclosure commands
The three commands `threat-model`, `deployment-model`, `limitations` call `_openDisclosure()` which looks for `<details id="...">` elements that do not exist anywhere in the codebase.

Remove these three commands from the `this.commands` array entirely:
```js
// DELETE these three command objects:
{ id: 'threat-model', ... }
{ id: 'deployment', ... }
{ id: 'limitations', ... }
```

### Fix 4: Update command hrefs for new page structure
The commands that navigate to pages reference old paths. Update:
```js
// briefing command:
action: () => { window.location.href = '/pages/brief.html'; }
// contact command:
action: () => { window.location.href = '/contact.html'; }
```
These are already correct; verify they still match the file structure.

---

## Phase 8: js/sealed-artifact.js — Bug Fixes

### Fix 1: PerformanceObserver must call _updateDisplay()
After `_analyzeResource()` runs (inside the Observer callback), call `_updateDisplay()`:
```js
// In _monitorResources(), inside the PerformanceObserver callback:
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(e => this._analyzeResource(e));
  this._updateDisplay();  // ← ADD THIS LINE
});
```

### Fix 2: Display element IDs must exist in HTML
`_updateDisplay()` targets three IDs: `artifact-external-count`, `artifact-origins-count`, `artifact-build-hash`.
These don't exist in any HTML file. They currently silently no-op.

Add a small sealed artifact status panel to `index.html`. Place it in the document control strip area or as a visually minimal panel near the footer. Suggested markup (add to index.html, styled to match document control strip):

```html
<!-- Sealed Artifact Status — append inside or near .doc-control -->
<div id="artifact-status" style="display:none"> <!-- shown only if sealedArtifact initializes -->
  <span id="artifact-build-hash"></span>
  <span>Ext. requests: <span id="artifact-external-count">—</span></span>
  <span id="artifact-origins-count" style="display:none"></span>
</div>
```

In `sealed-artifact.js`, in `_updateDisplay()`, add logic to show the panel once initialized:
```js
const statusPanel = document.getElementById('artifact-status');
if (statusPanel && this.buildHash) statusPanel.style.display = '';
```

Style `#artifact-status` in index.html inline CSS to match the document control strip font/color system.

---

## Do NOT Change

- `js/cytherai-phase-transition.js` — dormant by design; do not add `<script>` tags for it
- The `contact.html` form action (`mailto:contact@cytherai.com`) and form logic — keep as-is
- The command palette keyboard shortcut (Cmd+K) and filter/navigation logic
- The `sealed-artifact.js` build hash computation logic — only fix the display and observer issues
- Any meta tags, OG tags, or SEO content in `<head>` elements
- The `nda@cytherai.com` and `review@cytherai.com` email addresses in CTAs

---

## Verification Checklist

After implementation, verify:

1. `index.html` loads with warm archival paper background — no dark surfaces except Exhibit C
2. `pages/brief.html` shows 100% for both validity metrics (not 94.5%)
3. Left rail visible on desktop (≥769px), hidden on mobile (≤768px)
4. Section stamps visible on mobile, hidden on desktop
5. Exhibit C has a dark background (`#202226`), all other exhibits have paper background
6. Exhibit C has a 4px paper-colored strip at its top interior before the header
7. Brass color (`#7A5B1B`) appears ONLY at the 9 specified locations — check all others are ink-quiet or rule
8. Nav scroll `.scrolled` class fires on both index.html and subpages (browser test)
9. Command palette: "Generate Artifact Report" shows toast on subpages instead of silent failure
10. `pages/brief.html` validation table shows v1.1 numbers: GVR beam=100%, GVR temp=100%, not 94.5%
11. Mobile (375px): proof fragment block renders as a left-bordered excerpt, not a metrics strip
12. Mobile: §04 Capability Review top-line accent spans full card width (no inset)
13. Dagger footnote in §03 renders as block-level document note, not inline disclaimer text
14. `cytherai.js` no longer throws null reference on index.html for nav scroll
