# CytherAI North-Star Integration Guide

## Quick Start

Add to your HTML before `</body>`:

```html
<link rel="stylesheet" href="cytherai-northstar.css">
<script src="cytherai-northstar.js"></script>
```

The system auto-initializes and creates all dynamic elements.

---

## 1. Chapter Sections

Mark your major sections with `data-chapter`:

```html
<section data-chapter="origin" class="hero-section">
  <!-- Origin story / Hero -->
</section>

<section data-chapter="architecture" class="architecture-section">
  <!-- Technical architecture -->
</section>

<section data-chapter="capability" class="capability-section">
  <!-- What it does -->
</section>

<section data-chapter="sovereignty" class="sovereignty-section">
  <!-- CTA / Conclusion -->
</section>
```

The Briefing Spine will auto-detect these and create navigation nodes.

---

## 2. Progressive Disclosure

Add `data-disclosure` to elements that should reveal depth on pause:

```html
<p class="key-claim" data-disclosure="Trained from random initialization—no pretrained weights, no transfer learning.">
  Zero-shot theorem proving
</p>

<h2 data-disclosure="The only neural prover achieving this without symbolic preprocessing.">
  97.7% Loss Reduction
</h2>
```

When users stop scrolling for 800ms, the disclosure surfaces. Moving hides it.

---

## 3. Optical Layer Integration

The system automatically tracks scroll and applies these body attributes:

- `data-optical-state="unfocused|focusing|focused|exposing|developed"`
- `data-reading="scrolling|paused"`
- `data-seal-visible="true|false"`
- `data-constraint-revealed="true|false"`

Use in CSS:

```css
body[data-optical-state="exposing"] .my-element {
  filter: brightness(1.1);
}

body[data-reading="paused"] .footnote {
  opacity: 1;
}
```

---

## 4. Seal Appearance Control

The seal appears at 15%, 60%, and 95% scroll. To adjust:

```javascript
// After load
CytherNorthStar.SovereignSeal.triggerPoints = [0.10, 0.55, 0.90];
```

---

## 5. Constraint Content Customization

Modify the constraint reveal content:

```javascript
CytherNorthStar.ConstraintReveal.constraints = [
  { spec: 'INIT', value: 'RANDOM', note: 'No pretrained weights' },
  { spec: 'DEPS', value: 'ZERO', note: 'Pure inference chain' },
  { spec: 'ARCH', value: '100M', note: 'Consumer hardware viable' }
];
```

---

## 6. Cut Language Events

Listen for cuts in your own code:

```javascript
ProofBus.on('cut:execute', ({ type, from, to }) => {
  console.log(`${type} cut from chapter ${from} to ${to}`);
});
```

Trigger manual cuts:

```javascript
CytherNorthStar.CutLanguage.triggerCut('iris');
```

---

## 7. Theorem Atmosphere Customization

Add your own glyphs:

```javascript
CytherNorthStar.TheoremAtmosphere.glyphs.push('⊨', '⊩', '⊪');
```

---

## 8. CSS Classes for Integration

### Show/Hide Based on State

```html
<p class="hide-on-scroll">This disappears while scrolling</p>
<p class="show-on-pause">This appears when paused</p>
```

### Mark Cut-Aware Elements

```html
<div class="cut-aware">
  <!-- Dims during chapter transitions -->
</div>
```

### Artifact Glyphs in Content

```html
<span class="artifact-glyph lambda"></span> <!-- Shows λ -->
<span class="artifact-glyph turnstile"></span> <!-- Shows ⊢ -->
<span class="artifact-glyph arrow"></span> <!-- Shows → -->
<span class="artifact-glyph qed"></span> <!-- Shows ∎ -->
```

### Procedure Steps

```html
<div class="procedure-container">
  <div class="procedure-step">Initialize theorem space</div>
  <div class="procedure-step">Apply inference rules</div>
  <div class="procedure-step">Verify consistency</div>
</div>
```

Automatically numbers as 01, 02, 03...

---

## 9. Responsive Behavior

- **< 768px**: Briefing spine and exposure meter hidden
- **< 1024px**: Marginalia and calibration marks hidden
- **prefers-reduced-motion**: Glyph dust static, cuts instant

---

## 10. Console Verification

After load, you should see:

```
═══════════════════════════════════════════════════
  CYTHERAI NORTH-STAR SYSTEM v1.0
  Material: Optical Instrument
═══════════════════════════════════════════════════
✓ Theorem Atmosphere
✓ Optical Layer
✓ Briefing Spine
✓ Sovereign Seal (3 appearances)
✓ Constraint Reveal (60%)
✓ Progressive Disclosure
✓ Cut Language
═══════════════════════════════════════════════════
```

---

## Complete Example Section

```html
<section data-chapter="capability" class="capability-section constraint-backdrop">
  
  <h2 class="cut-aware" 
      data-disclosure="Achieved in 6 hours on a single RTX 4090—not a datacenter.">
    97.7% Loss Reduction
  </h2>
  
  <p class="procedure-container">
    <span class="artifact-glyph lambda"></span>
    <span class="procedure-step">Parse natural language goal</span>
    <span class="procedure-step">Generate proof search</span>
    <span class="procedure-step">Verify and crystallize</span>
    <span class="artifact-glyph qed"></span>
  </p>
  
  <div class="show-on-pause seal-adjacent">
    <em>Pause to see more...</em>
  </div>
  
</section>
```

---

## Event Reference

```javascript
// Spine navigation
ProofBus.on('spine:chapter', (chapter) => {});

// Seal lifecycle
ProofBus.on('seal:appear', ({ index, total }) => {});
ProofBus.on('seal:complete', ({ appearance }) => {});

// Constraint reveal
ProofBus.on('constraint:reveal', () => {});

// Cinematic cuts
ProofBus.on('cut:execute', ({ type, from, to }) => {});
```

---

## Philosophy Reminder

| Element | Scarcity | Purpose |
|---------|----------|---------|
| Seal | 3 total | Expensive signature object |
| Constraint | 1 reveal | Second peak at 60% |
| Disclosure | On pause only | Rewards attention |
| Cuts | 3 types max | Cinematic grammar |
| Glyphs | Background dust | Formal atmosphere |

The user **travels through a procedure**, not reads a page.
