# Phase Transition Engine — Authority Edition

**"Fast reveals nothing. Slow reveals truth."**

---

## The Doctrine

Attention is the only input. The system is deterministic and non-gamey.

- **Scroll velocity = temperature**
- **Pause duration = pressure**
- **State changes are hysteresis-based** (not random), so it feels physical and inevitable

---

## Three Visible Behaviors

| State | Velocity | Visual Character |
|-------|----------|------------------|
| **HOT** | > 600 px/s | Content becomes less legible, suggestive. Reveals nothing. |
| **WARM** | 80-600 px/s | Content is readable, stable. Default state. |
| **COLD** | < 80 px/s + pause | Content crystallizes—sharp, precise, sealed. Reveals truth. |

---

## Hysteresis (No Flickering)

Once in a state, you need to cross FURTHER to exit:

```
HOT → must drop below 400 px/s to exit
COLD → must rise above 150 px/s to exit
```

This creates physical inevitability, not jittery gamification.

---

## φ-Based Design Token Ladder

All values derive from golden ratio (1.618):

### Spacing (base 8px)
```css
--space-1: 5px;   --space-2: 8px;   --space-3: 13px;
--space-4: 21px;  --space-5: 34px;  --space-6: 55px;
--space-7: 89px;  --space-8: 144px;
```

### Typography (base 16px)
```css
--type-xs: 10px;  --type-sm: 13px;  --type-base: 16px;
--type-lg: 21px;  --type-xl: 26px;  --type-2xl: 33px;
--type-3xl: 42px; --type-4xl: 55px; --type-5xl: 68px;
```

### Timing (base 100ms)
```css
--time-instant: 50ms;   --time-fast: 100ms;
--time-normal: 160ms;   --time-slow: 260ms;
--time-slower: 420ms;   --time-slowest: 680ms;
```

### Scroll Landmarks
```css
--scroll-emergence: 0.382;   /* 1 - φ⁻¹ */
--scroll-balance: 0.618;     /* φ⁻¹ (THE critical point) */
--scroll-completion: 0.854;  /* φ⁻¹ + φ⁻² */
```

---

## What We Kept

### 1. Nucleation Sites
Key claims "crystallize first." Creates hierarchy without UI.

```html
<h2 data-nucleation="primary">SOVEREIGN</h2>
<p data-nucleation="secondary">Zero external dependencies...</p>
```

Headlines crystallize immediately. Claims follow. Artifacts last.

### 2. Crystal State on Pause
After 500ms stationary, content enters cold state:
- Sharp anti-aliasing
- Crystalline glow
- Vignette tightening
- Edge reticle appears

### 3. Crystalline Facets (Capped at 3)
Progressive micro-reveals, NOT 6:
- **Facet 1**: Immediate (the claim)
- **Facet 2**: After 800ms pause (first depth)
- **Facet 3**: After 1600ms pause (maximum depth, rare)

### 4. Triple Point at 0.618
At exactly 61.8% scroll with medium velocity (150-400 px/s):
- All three behaviors briefly coexist
- Momentary shimmer across thermal states
- Then resolves to stable mode

This is the thermodynamics equivalent of a constraint peak.

---

## What We Dropped

| Dropped | Why |
|---------|-----|
| Phase Diagram UI | Dashboard syndrome. Replaced with diegetic cues only. |
| Random supercooling | Unpredictability = loss of trust. Hysteresis instead. |
| Euler characteristic | "Look what we did." Hidden in console if anywhere. |
| 30 Brownian particles | Performance. CSS-based pattern now. |
| 5 phase states | Feature soup. 3 visible behaviors is enough. |
| 6 facets | Too many. Capped at 3. |

---

## Diegetic Indicators (No Dashboard)

Environmental cues only:

- **Vignette**: Sharpens in cold state
- **Edge reticle**: Tightens inward in cold state
- **Calibration marks**: Appear in corners during cold state
- **Brownian field**: CSS-based drift, visible in hot, still in cold
- **Seed crystals**: Appear at φ landmarks (0.382, 0.618, 0.854)

---

## Optical Centerline Governance

All primary narrative objects share ONE axis:

```css
.hero-content,
.briefing-dossier,
.dossier-plate .plate-surface,
.gate-hard {
    max-width: var(--content-max-width);
    margin-left: auto;
    margin-right: auto;
    transform: translateX(var(--optical-offset));
}
```

NO competing centers. NO independent margin offsets.

---

## Performance Optimizations

1. **Velocity smoothing**: 5-sample buffer prevents jitter
2. **Throttled state loop**: 100ms update interval
3. **Passive scroll listener**: No blocking
4. **CSS-based particles**: No DOM manipulation
5. **Hysteresis**: Reduces state change frequency
6. **DocumentFragment**: Single DOM insertion on init

---

## Console Signature

```
════════════════════════════════════════════
  PHASE TRANSITION ENGINE
  Authority Edition
════════════════════════════════════════════
  "Fast reveals nothing. Slow reveals truth."
════════════════════════════════════════════
```

---

## Integration with North-Star

| North-Star System | Phase Transition Upgrade |
|-------------------|-------------------------|
| Briefing Spine | Phase progression axis (still deterministic) |
| Sovereign Seal | Seed Crystal (3 appearances at φ landmarks) |
| Progressive Disclosure | Crystallization facets (capped at 3) |
| Cut language | Phase-dependent intensity |
| Theorem atmosphere | Brownian field (hot→visible, cold→still) |

---

## The Difference

**North-Star**: "The user travels through a procedure."

**Phase Transition**: "The user transforms chaos into order through the thermodynamics of attention."

But both now share the same φ-based design ladder and optical governance.

---

## Files

- `cytherai-phase-transition.css` — ~525 lines, φ-governed
- `cytherai-phase-transition.js` — ~450 lines, hysteresis-based
- Linked in `index.html` after North-Star
