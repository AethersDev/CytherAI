# Frontend Design Methodology Skill

## CytherAI Crystalline Design System — 2025 Edition

This skill defines a sophisticated, anti-convergence design methodology that creates unique, memorable digital experiences through the cross-pollination of physical material science, precision instruments, and mathematical notation.

---

## Core Philosophy: Crystalline Material Reality

**NOT glassmorphism blur. NOT generic dark-tech aesthetic.**

Instead, we draw from:
- Swiss chronograph bezels and complications
- Architectural structural glass
- Theorem proof notation and mathematical typography
- Brushed titanium and optical crystals
- Forged precious metals

---

## Design Token System

### Material Palette (Derived from Physical Materials)
```css
--void: #03030a;        /* Deep space black */
--obsidian: #08080f;    /* Volcanic glass */
--titanium: #1a1a24;    /* Brushed metal */
--steel: #2a2a38;       /* Polished steel */
```

### Gold Spectrum (Temperature Progression: Cool → Warm)
```css
--gold-frost: #c9b896;  /* Cool, morning light */
--gold-core: #d4af37;   /* True gold, balanced */
--gold-forge: #e8c547;  /* Heated, active */
--gold-ember: #f4d03f;  /* White-hot peak */
```

### Cryptographic Accent Colors
```css
--proof-blue: #4a6fa5;    /* Verified, trusted */
--theorem-green: #4a8f6a; /* Proven, complete */
--axiom-red: #8f4a5c;     /* Error, attention */
```

---

## Typography: Tension Through Contrast

### Font Stack
1. **--font-theorem**: `'Cormorant Garamond', 'Instrument Serif', Georgia, serif`
   - For headlines, titles, mathematical expressions
   - Italic for emphasis creates visual intrigue

2. **--font-proof**: `'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace`
   - For code, labels, technical notations
   - Small caps, wide letter-spacing

3. **--font-axiom**: `system-ui, -apple-system, sans-serif`
   - For body text, UI elements
   - Clean, readable, professional

---

## Spacing: Golden Ratio Progression (φ = 1.618)

```css
--space-xs: 0.382rem;   /* 1/φ² */
--space-sm: 0.618rem;   /* 1/φ */
--space-md: 1rem;       /* Base unit */
--space-lg: 1.618rem;   /* φ */
--space-xl: 2.618rem;   /* φ² */
--space-2xl: 4.236rem;  /* φ³ */
--space-3xl: 6.854rem;  /* φ⁴ */
```

---

## Motion: Precision Instrument Choreography

### Timing
```css
--motion-instant: 0.1s;      /* Micro-interactions */
--motion-swift: 0.2s;        /* Quick responses */
--motion-smooth: 0.4s;       /* State transitions */
--motion-deliberate: 0.8s;   /* Page transitions */
--motion-ceremonial: 1.4s;   /* Hero reveals */
```

### Easing (Material Physics)
```css
--ease-crystal: cubic-bezier(0.22, 1, 0.36, 1);     /* Precise, clean */
--ease-forge: cubic-bezier(0.34, 1.56, 0.64, 1);    /* Slight overshoot, energy */
--ease-settle: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Natural deceleration */
```

---

## Surface Treatments

### Etched Surface
```css
--surface-etched: linear-gradient(
    135deg,
    rgba(212, 175, 55, 0.03) 0%,
    rgba(212, 175, 55, 0.01) 50%,
    rgba(212, 175, 55, 0.04) 100%
);
```

### Crystal Surface
```css
--surface-crystal: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.02) 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.3) 100%
);
```

### Forge Surface
```css
--surface-forge: linear-gradient(
    145deg,
    rgba(212, 175, 55, 0.08) 0%,
    rgba(212, 175, 55, 0.02) 30%,
    rgba(0, 0, 0, 0.4) 100%
);
```

---

## Component Patterns

### Crystalline Panels (NOT Rounded Shadow Cards)
Use `clip-path` for sharp, crystalline cut corners:
```css
.crystal-panel {
    clip-path: polygon(
        0 20px, 20px 0,
        100% 0, 100% calc(100% - 20px),
        calc(100% - 20px) 100%, 0 100%
    );
}
```

### Proof Tags (Sharp Precision Cuts)
```css
.proof-tag {
    clip-path: polygon(
        8px 0, 100% 0, 100% calc(100% - 8px),
        calc(100% - 8px) 100%, 0 100%, 0 8px
    );
}
```

### Precision Rings (Chronograph Bezel)
Concentric rotating rings at different speeds with dashed borders.

### Dial Ticks (Chronograph Dial)
60 tick marks radiating from center, every 5th is major.

---

## Atmospheric Layers

1. **Void Background**: Deep black base with subtle warmth
2. **Proof Grid**: Precision grid lines (100px), low opacity (0.015)
3. **Forge Texture**: SVG noise overlay, subtle metal grain
4. **Crystalline Field**: WebGL particle system with orbital motion

---

## Interactive States

### Hover Behaviors
- Lift with subtle shadow expansion
- Border color shifts to gold-core
- Corner accents brighten
- No bouncy/springy effects (precision, not playful)

### Focus States
- 2px gold-core outline
- 4px offset
- Clean, visible, accessible

---

## Animation Principles

1. **Staggered Reveals**: Elements appear in sequence with increasing delays
2. **Draw-in Effects**: Lines animate from invisible to visible
3. **Orbital Motion**: Background particles follow elliptical paths
4. **Breathing Rhythms**: Subtle scale/opacity oscillations (4-8s periods)

---

## Accessibility Requirements

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }

    .crystalline-field,
    .forge-particles,
    .proof-grid {
        display: none !important;
    }
}
```

### Focus Visible
```css
:focus-visible {
    outline: 2px solid var(--gold-core);
    outline-offset: 4px;
    border-radius: 2px;
}

:focus:not(:focus-visible) {
    outline: none;
}
```

---

## Implementation Checklist

When applying this methodology:

- [ ] Replace rounded corners with crystalline clip-paths
- [ ] Use φ-ratio spacing throughout
- [ ] Apply temperature-based gold spectrum
- [ ] Implement precision instrument UI patterns
- [ ] Add atmospheric layers (grid, texture, particles)
- [ ] Include theorem-style code blocks
- [ ] Use serif fonts for headings, mono for labels
- [ ] Ensure all animations respect reduced-motion
- [ ] Test focus states for accessibility

---

## File Reference

See `/cytherai-evolved.html` for complete implementation reference.
