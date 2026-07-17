# CLAUDE.md Addendum — v2 Enhancement Integrations

Append these to CLAUDE.md Phase 2 (index.html) implementation.
Read the original CLAUDE.md fully first, then apply these additions on top.

---

## Additional Sections (insert between §03 and current §04 CLEARANCE)

### §04 PROVENANCE & IP (new section — shifts Clearance to §05)

Update all section numbering: Clearance becomes §05, page count becomes 08/08.
Add this section between Validation and Clearance.

**Rail sidebar label:** `§04 / PROVENANCE / — / RESTRICTED`

**Sidebar marginalia (italic annotation below rail label):**
```
US provisional<br>
filed 2025.<br>
Zero-dep claim<br>
independently<br>
validated.<br>
<span class="marginalia-ref">cf. §03</span>
```

**Section content:**
```
Section label: SECTION 04 · PROVENANCE & INTELLECTUAL PROPERTY
Serif headline: Research that increases commercial control.
Body: Research matters when it enables delivery under constraint. This work signals
      first-principles capability when dependency risk, reproducibility, or sovereign
      constraints rule out default approaches.

Patent record block (.patent-record):
  Background: var(--paper-lifted), border: 1px solid var(--rule)
  Header: "US PROVISIONAL APPLICATION · 2025" — mono 9px, var(--ink-quiet), uppercase
  Title: "Neural Network System and Method for Generating Proofs with Zero External Dependencies"
         — serif italic, 15px, var(--ink)
  Body: Same paragraph from existing brief.html

Chain-of-custody timeline table below the patent record:
  Header row: DATE | EVENT | DESCRIPTION
  Rows:
    2024.Q4 | ORIGINATED   | Zero-dependency architecture established in CytherCAD build
    2025.Q1 | FILED        | US Provisional Application submitted
    2026.Q1 | VALIDATED    | CytherCAD evaluation confirms zero-dep execution path claim
    2026.Q2 | CURRENT      | Public surface disclosure at current classification level

  Row styling:
    - DATE column: mono 9px, var(--ink-quiet), letter-spacing .1em, uppercase
    - EVENT column: mono 9px, uppercase
      - ORIGINATED, FILED: var(--ink-quiet)
      - VALIDATED: var(--ink-quiet)
      - CURRENT: var(--brass)  ← only brass row (state: active/current)
    - DESCRIPTION column: mono 10px, var(--ink-mid)
    - Row borders: 1px solid var(--rule)
    - Background: alternate rows between var(--paper-lifted) and var(--paper)
```

---

### §05 OPERATIONAL PROTOCOL (new section — becomes §05, Clearance becomes §06)

**Rail sidebar label:** `§05 / PROTOCOL / — / ENGAGEMENT MODEL`

**Sidebar marginalia:**
```
Each phase is<br>
gated. No phase<br>
proceeds without<br>
prior sign-off.<br>
<span class="marginalia-ref">4 gates total</span>
```

**Section content:**
```
Section label: SECTION 05 · OPERATIONAL PROTOCOL
Serif headline: A disciplined path from definition to deployment.
Body: Each phase makes scope, accountability, and delivery expectations explicit
      before complexity grows. There are no surprises built into the process.

Procedures block (.protocol-block):
  Background: var(--paper-lifted), border: 1px solid var(--rule)
  4 procedure rows, each with:
    - Left column: large serif number (01–04), var(--rule) color, italic, 22px
    - Right column: procedure label + body + gate checkpoint
    - Border-bottom: 1px solid var(--rule) between rows

  PROC-01 · DISCOVERY
  Requirements workshops, stakeholder mapping, decision criteria, and acceptance
  framing before implementation begins.
  Gate: "Problem definition confirmed"

  PROC-02 · ARCHITECTURE
  System design, benchmark specification, infrastructure scoping, and release logic.
  Preventing downstream waste and misaligned expectations.
  Gate: "Architecture sign-off"

  PROC-03 · BUILD
  Gated releases, measurable checkpoints, implementation review, and evaluation-led
  iteration. Every release against defined criteria.
  Gate: "Release criteria met"

  PROC-04 · DEPLOY
  Production deployment, operational telemetry, post-launch iteration support.
  The engagement does not end at code handoff.
  Gate: "Operational acceptance"

Gate checkpoint styling (.gate):
  position: relative
  padding: 6px 0
  margin: 10px 0 4px
  ::before: border-top: 1px dashed var(--rule), absolute, top 50%
  Centered <span>:
    background: var(--paper-lifted)  ← same as parent bg
    padding: 0 10px
    font-size: 7.5px, letter-spacing .18em
    color: var(--ink-quiet)
    text-transform: uppercase

Engagement Modes grid below procedures (3 columns, gap 2px):
  MODE A — Full-Scope System Build
    End-to-end from discovery through production deployment.
  MODE B — Architecture & Evaluation
    Architecture definition, benchmark spec, and acceptance criteria.
  MODE C — Deployment & Integration
    Production deployment and operational integration support.
  
  Mode card styling: background var(--paper), border 1px solid var(--rule), padding 16px
  Mode label: mono 9px, var(--ink-quiet), uppercase, letter-spacing .18em
  Mode title: 12px, var(--ink), margin-bottom 6px
  Mode body: mono 10px, var(--ink-mid), line-height 1.8
```

---

## Document Control Colophon (add before footer, after Clearance section)

Replace the simple footer with a two-part document close:

### Part 1: Colophon block
```
Background: var(--paper-dense), border-top: 1px solid var(--rule), padding: 20px 24px

Three columns (flex, gap 48px, flex-wrap wrap):

Column 1: REVISION HISTORY
  Table: 3 columns (REV | DATE | NOTE), grid-template-columns: 48px 60px 1fr
  Rows:
    1.0 | 2026.03 | Initial filing
    1.4 | 2026.04 | Validation readout updated
    2.0 | 2026.04 | Protocol & provenance sections added
  Current rev row (2.0): all cells use var(--ink-mid) instead of var(--ink-quiet)
  Other rows: var(--ink-quiet)
  Label row headers: var(--rule), uppercase, letter-spacing .08em

Column 2: DOCUMENT CONTROL
  Rows (label: var(--rule) | value: var(--ink-quiet)):
    Classification  | Public Surface
    Distribution    | Unrestricted
    Retention       | Until superseded
    Expiry          | 15 MAY 2026    ← this value: var(--brass) at .6 opacity
                                        (it is the only time-sensitive state field)

Column 3: INTEGRITY
  Rows (label: var(--rule) | value: var(--ink-quiet)):
    Build hash  | 4A7F2C1E   (mono font)
    Pages       | 8 of 8     (update if page count changes)
    Exhibits    | 3 filed · 2 public
    Externals   | 0          ← var(--brass) value (verified state = 0 external deps)
```

### Part 2: Document close line
Below the colophon, above the standard footer links:
```
Background: var(--paper-dense)
Border-top: 1px solid var(--rule)
Height: 20px
Content: "End of Document · DOC-2026-001 · REV 2.0"
Font: mono 8px, letter-spacing .32em, color var(--rule), centered, uppercase
aria-hidden="true"
```

---

## Ambient Layer Additions (add to index.html inline CSS)

### Film grain (light palette variant)
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.022;
  mix-blend-mode: multiply;   /* NOT overlay — multiply for light surfaces */
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

@media (prefers-reduced-motion: reduce) {
  body::after { display: none; }
}
```

### Corner registration marks (ink-toned, not brass)
Add 4 fixed-position divs with `aria-hidden="true"`, class `reg`:
```css
.reg { position: fixed; z-index: 9997; pointer-events: none; }
.reg i { position: absolute; background: rgba(23,22,18,.06); display: block; }
.reg-tl { top: 12px; left: 12px; }
.reg-tr { top: 12px; right: 12px; }
.reg-bl { bottom: 12px; left: 12px; }
.reg-br { bottom: 12px; right: 12px; }
.reg i.h { width: 18px; height: 1px; }
.reg i.v { width: 1px; height: 18px; }
```
HTML (add immediately after `<body>`, before document control strip):
```html
<div class="reg reg-tl" aria-hidden="true"><i class="h"></i><i class="v"></i></div>
<div class="reg reg-tr" aria-hidden="true"><i class="h" style="right:0"></i><i class="v" style="right:0"></i></div>
<div class="reg reg-bl" aria-hidden="true"><i class="h"></i><i class="v"></i></div>
<div class="reg reg-br" aria-hidden="true"><i class="h" style="right:0"></i><i class="v" style="right:0"></i></div>
```

---

## Animations (add to index.html inline CSS, respect reduced-motion)

```css
@keyframes breathe {
  0%, 100% { opacity: .72; }
  50%       { opacity: .94; }
  /* NO drop-shadow or glow — those are dark-system effects */
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: .35; }
}

@keyframes seal-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.lambda-breathe { animation: breathe 5s ease-in-out infinite; }

.pulse-dot {
  display: inline-block;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--ink);
  opacity: .55;
  animation: pulse-dot 2.5s ease-in-out infinite;
  vertical-align: middle;
  margin-right: 4px;
}

.seal-ring { 
  transform-origin: 80px 80px;
  animation: seal-spin 120s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .lambda-breathe, .pulse-dot, .seal-ring {
    animation: none !important;
  }
}
```

Apply `.lambda-breathe` class to the `<svg>` mark in the cover.
Apply `.pulse-dot` as a `<span>` inline before "Live beta" text in Exhibit B's Status row.

---

## Document Seal Watermark (cover section)

Add inside the cover content div, positioned absolute top-right, `aria-hidden="true"`:
```html
<svg width="160" height="160" viewBox="0 0 160 160" fill="none"
     style="position:absolute;right:32px;top:40px;opacity:.055;pointer-events:none;"
     aria-hidden="true">
  <defs>
    <path id="seal-path" d="M 80,80 m -62,0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0"/>
  </defs>
  <circle cx="80" cy="80" r="72" stroke="rgba(23,22,18,.4)" stroke-width=".5" fill="none"/>
  <circle cx="80" cy="80" r="62" stroke="rgba(23,22,18,.3)" stroke-width=".3" fill="none"/>
  <circle cx="80" cy="80" r="52" stroke="rgba(23,22,18,.15)" stroke-width=".3" fill="none"/>
  <g class="seal-ring">
    <text font-family="'SF Mono',Menlo,monospace" font-size="6.5"
          fill="rgba(23,22,18,.45)" letter-spacing=".1em">
      <textPath href="#seal-path">
        VERIFIED · DOC-2026-001 · CYTHERAI SYSTEMS · ISSUED 15 APR 2026 · REV 2.0 · SHA:4A7F ·&nbsp;
      </textPath>
    </text>
  </g>
  <!-- Axis marks -->
  <line x1="80" y1="8"   x2="80" y2="22"  stroke="rgba(23,22,18,.15)" stroke-width=".3"/>
  <line x1="80" y1="138" x2="80" y2="152" stroke="rgba(23,22,18,.15)" stroke-width=".3"/>
  <line x1="8"  y1="80"  x2="22" y2="80"  stroke="rgba(23,22,18,.15)" stroke-width=".3"/>
  <line x1="138" y1="80" x2="152" y2="80" stroke="rgba(23,22,18,.15)" stroke-width=".3"/>
  <!-- Lambda center mark -->
  <text x="80" y="86" fill="rgba(122,91,27,.18)" font-family="Georgia,serif"
        font-size="36" font-style="italic" text-anchor="middle">λ</text>
</svg>
```
The cover content div needs `position: relative; overflow: hidden` for the absolute-positioned seal.

---

## Detail Enhancements

### Exhibit hash rows (add to Exhibit A and B tables)
Add as the final table row in each exhibit's metadata table:
```html
<tr>
  <td style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;
             color:var(--rule);padding:5px 0;">Hash</td>
  <td style="font-size:9px;color:var(--rule);text-align:right;padding:5px 0;
             font-family:'SF Mono',Menlo,monospace;">e3b0c442..78ce</td>
</tr>
```
Exhibit A hash: `e3b0c442..78ce`
Exhibit B hash: `a7ffc6f8..4e48`

### Sidebar marginalia class (add to cytherai.css)
```css
.rail-marginalia {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  font-size: 7.5px;
  color: var(--ink-quiet);
  line-height: 2.2;
  font-style: italic;
  letter-spacing: .04em;
  opacity: .55;
}
.marginalia-ref {
  color: var(--brass);
  opacity: .7;
  font-style: normal;
}
```

Marginalia content per section:
- §01 DESIGNATION rail: `"cf. §03 for validation data"` + `"4 principles · all active"`
- §02 EXHIBITS rail: `"Three filed."` + `"Two at public surface."` + `"One held under restricted appendix."` + `<span class="marginalia-ref">cf. §04 IP</span>`
- §03 VALIDATION rail: `"All metrics from internal eval"` + `"on air-gapped environment."` + `<span class="marginalia-ref">✓ methodology</span>`
- §04 PROVENANCE rail: `"US provisional filed 2025."` + `"Zero-dep claim independently validated."` + `<span class="marginalia-ref">cf. §03</span>`
- §05 PROTOCOL rail: `"Each phase is gated."` + `"No phase proceeds without prior sign-off."` + `<span class="marginalia-ref">4 gates total</span>`

### Response time on clearance cards
In the Capability Review card footer, add alongside "Qualified inquiries · NDA required":
```html
<span style="font-size:8px;letter-spacing:.1em;color:var(--rule);
             text-transform:uppercase;">Response: 24–48h</span>
```
In the Technical Diligence card footer:
```html
<span style="font-size:8px;letter-spacing:.1em;color:var(--rule);
             text-transform:uppercase;">By arrangement</span>
```

### Exhibit C hover declassification (add to CSS)
The dark panel on paper makes the contrast meaningful. The veil partially reveals content on hover:
```css
.doc-exhibit-restricted .redact-veil {
  transition: opacity 1.8s cubic-bezier(.16,1,.3,1);
}
.doc-exhibit-restricted:hover .redact-veil {
  opacity: .35;
}
.doc-exhibit-restricted::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 0;
  background: rgba(122,91,27,.06);
  transition: height .6s cubic-bezier(.16,1,.3,1);
}
.doc-exhibit-restricted:hover::after {
  height: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .doc-exhibit-restricted .redact-veil,
  .doc-exhibit-restricted::after {
    transition: none;
  }
}
```
The redact-veil div wraps the overlay content inside Exhibit C.

### 4th principle: Alignment at the Origin
Add as a fourth `.principle-card` in §01:
```
Label: 04 · PRINCIPLE
Title: Alignment at the Origin
Body: Discovery precedes build. The costliest failure mode is building the wrong
      system precisely.
```

---

## HTML Head Hardening (add to index.html <head>)

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOC-2026-001 · CytherAI | Sovereign Operational AI</title>
<meta name="description" content="CytherAI delivers operational AI systems for environments where failure has institutional consequence. Zero external dependencies. Sovereign-ready. Patent pending.">
<meta property="og:title" content="CytherAI | Sovereign Operational AI">
<meta property="og:description" content="Operational AI systems for environments where failure has institutional consequence.">
<meta name="theme-color" content="#E7DFD1">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'none';">
<!-- Note: script-src includes 'unsafe-inline' because sealed-artifact.js runs inline -->
<!-- No external font requests — system font stack only -->
```

---

## What NOT to Port (do not implement these from v2)

- CRT vignette (`.vignette` radial gradient) — dark-system only, wrong for paper
- Classification sticky banner ("CytherAI Proprietary · Public Surface · Controlled Distribution") — covered by provenance strip
- Coordinate grid on body background — covered by paper palette
- Perforated dividers (`.perf` dashed separator) — dark-system section breaks, v3 uses rules
- Gradient progress bars in §03 — v3 spec is flat fills at opacity (see CLAUDE.md §03 spec)

---

## Updated Verification Checklist Items

Add to existing checklist:
15. §04 PROVENANCE section exists with chain-of-custody timeline; CURRENT row in brass
16. §05 PROTOCOL section exists with PROC-01–04 and gate checkpoints
17. Document Control Colophon visible above footer; expiry date in brass; integrity Externals=0 in brass
18. "End of Document" close line present, aria-hidden, mono 8px centered
19. Film grain present with mix-blend-mode: multiply (not overlay)
20. Corner registration marks present at 4 corners, ink-toned (not brass)
21. Document seal watermark on cover, rotating, ink-toned at .055 opacity
22. Lambda SVG on cover has .lambda-breathe class (opacity pulse, no glow)
23. Exhibit B Status row has .pulse-dot before "Live beta" text
24. Exhibit C has hover declassification interaction (veil fades to .35 on hover)
25. Exhibits A+B have hash rows in var(--rule) color at very low contrast
26. Sidebar marginalia present in each section rail with .marginalia-ref in brass
27. Response time estimates present on Capability Review and Technical Diligence cards
28. 4th principle (Alignment at the Origin) present in §01
29. Reduced-motion media query disables: breathe, pulse-dot, seal-ring, exhibit-c hover, film grain
30. CSP meta tag present in index.html head
