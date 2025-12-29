# CytherAI Phase Transition Engine

## The Paradigm Shift

**North-Star treats the page as an optical instrument—you focus, expose, develop.**

**Phase Transition treats the page as thermodynamic medium—you modulate energy, content crystallizes from chaos.**

The difference: In North-Star, you travel through static content. In Phase Transition, content *transforms* based on your thermal signature (scroll velocity + attention duration). You don't read—you **precipitate meaning from supersaturation**.

---

## Material Metaphor: Thermodynamic Medium

The entire page is a substance at the edge of phase transition. Your scroll velocity is temperature. Your pause duration is pressure. Content exists in quantum superposition of states until your attention collapses it into crystalline certainty.

**The user doesn't consume content. The user is a catalyst.**

---

## Phase States

| State | Scroll Velocity | Visual Character | Information Density |
|-------|----------------|------------------|---------------------|
| **PLASMA** | Very fast (>2000px/s) | Streaking, energetic, chaotic | Near-zero (pure energy) |
| **GAS** | Fast (800-2000px/s) | Volatile, suggestive, ephemeral | Low (ideas, not facts) |
| **LIQUID** | Medium (200-800px/s) | Flowing, coherent, impermanent | Medium (readable, not retained) |
| **SOLID** | Slow (50-200px/s) | Structured, stable, trustworthy | High (clear understanding) |
| **CRYSTAL** | Stationary + time | Faceted, prismatic, eternal | Maximum (insight crystallized) |

---

## Core Mechanics

### 1. Thermal Velocity Detection
```
Fast scroll = High temperature = Disorder
Slow scroll = Low temperature = Order
Stationary = Absolute zero = Perfect crystal
```

The system measures scroll velocity in real-time and maps it to thermal states. Body receives `data-thermal` attribute:
- `plasma` | `gas` | `liquid` | `solid` | `frozen`

### 2. Nucleation Sites
Certain elements are marked as **nucleation sites**—they crystallize first and seed structure around them. These are your key claims, headlines, proof statements.

```html
<h2 data-nucleation="primary">SOVEREIGN</h2>
<p data-nucleation="secondary">Zero external dependencies...</p>
```

Nucleation sites:
- Crystallize 200ms before surrounding content
- Create visible "crystallization front" radiating outward
- Remain crystalline even as surrounding content liquefies on scroll resume

### 3. Latent Heat Delay
Phase transitions aren't instant. There's latent heat—a delay that creates anticipation:

| Transition | Delay |
|------------|-------|
| Plasma → Gas | 50ms |
| Gas → Liquid | 100ms |
| Liquid → Solid | 200ms |
| Solid → Crystal | 600ms |

This rewards patience. Impatient scrolling keeps you in gas state. Deliberate reading achieves crystallization.

### 4. Supercooling Events
Occasionally (2-3 times per session), content **supercools**:
- Appears to crystallize
- Then suddenly liquefies back
- Creates productive uncertainty
- Mirrors the fragility of proof before final verification

### 5. The Triple Point
At exactly 60% scroll with medium velocity, all five states briefly coexist:
- Plasma sparkles in margins
- Gas swirls at edges
- Liquid flows through body text
- Solid anchors in headlines
- Crystal facets flash in key terms

This is your "impossibility moment"—the thermodynamic equivalent of the constraint reveal.

---

## Signature Objects

### The Seed Crystal (3 appearances)
A perfect crystalline form that appears at 25%, 60%, and 92% scroll:

**State 1 - Nucleus (25%)**
- Tiny, bright, promising
- Single facet visible
- Caption: "INIT"

**State 2 - Growing (60%)**
- Multi-faceted, actively crystallizing
- Visible growth animation
- Caption: "FORMING"

**State 3 - Complete (92%)**
- Perfect geometric form
- All facets visible, prismatic dispersion
- Caption: "PROVEN"

### The Phase Diagram (Persistent UI)
Unlike North-Star's linear spine, the Phase Diagram is a **2D coordinate system**:
- X-axis: Pressure (scroll position 0-100%)
- Y-axis: Temperature (scroll velocity)
- Your reading path traces a visible curve
- Phase boundaries are marked
- Current state indicated by glowing point

Position: Bottom-left corner, 120x120px, subtle until hovered.

### The Euler Characteristic
At section boundaries, a topological marker appears showing the "genus" of your reading:
- How many times you've backtracked
- How many pauses you've taken
- Your topological reading signature

---

## Progressive Revelation: Crystalline Facets

Instead of linear disclosure, content has **facets**—different angles of the same truth:

```html
<div class="faceted-content" data-facets="6">
  <div data-facet="1">The surface claim</div>
  <div data-facet="2">Technical depth</div>
  <div data-facet="3">Philosophical implication</div>
  <div data-facet="4">Practical application</div>
  <div data-facet="5">Edge cases</div>
  <div data-facet="6">The profound insight</div>
</div>
```

Each additional 400ms of pause reveals one more facet, up to 6 (crystallographic symmetry).

Facets don't stack linearly—they **rotate into view**, like turning a crystal in your hand.

---

## Atmospheric Elements

### Brownian Particles
Background particles in random walk:
- **Plasma**: Violent, fast, streaking trails
- **Gas**: Rapid, random, no trails
- **Liquid**: Slow, flowing, current-like
- **Solid**: Minimal drift, clustering
- **Crystal**: Locked in lattice positions

### Lattice Emergence
In solid/crystal states, a geometric lattice fades in:
- Gold lines forming crystallographic structure
- Hexagonal or cubic depending on content type
- Technical content: cubic lattice
- Philosophical content: hexagonal lattice

### Prismatic Dispersion
In crystal state only:
- Edges of key elements show spectral separation
- Subtle rainbow gradient on gold borders
- Indicates "pure" crystallized understanding

### Thermal Gradient Overlay
Subtle color temperature shift based on state:
- Plasma: Blue-white hot
- Gas: White-gold
- Liquid: Warm gold
- Solid: Deep gold
- Crystal: Cold gold with prismatic edges

---

## Typography Behavior

### Plasma State
```css
letter-spacing: 0.5em;      /* Expanded, energetic */
filter: blur(3px);          /* Undefined */
animation: plasma-jitter;    /* Position randomization */
color: var(--thermal-white); /* Hot */
```

### Gas State
```css
letter-spacing: 0.35em;
filter: blur(1.5px);
animation: gas-drift;        /* Subtle word-level drift */
opacity: 0.8;
```

### Liquid State
```css
letter-spacing: 0.2em;
filter: blur(0);
animation: liquid-flow;      /* Gentle baseline undulation */
opacity: 0.95;
```

### Solid State
```css
letter-spacing: 0.15em;
filter: none;
animation: none;
opacity: 1;
text-shadow: solid-emboss;   /* Dimensional presence */
```

### Crystal State
```css
letter-spacing: 0.12em;      /* Tight, precise */
filter: none;
-webkit-font-smoothing: antialiased;
text-shadow: crystal-facet;  /* Multi-angle shadows */
background: prismatic-gradient; /* On key terms */
```

---

## The Proof Connection

This system maps directly to theorem proving:

| Phase State | Proof Analog |
|-------------|--------------|
| Plasma | Undefined goal, pure search space |
| Gas | Hypothesis formation, volatile ideas |
| Liquid | Proof attempt in progress, coherent direction |
| Solid | Valid proof structure, stable inference chain |
| Crystal | Verified theorem, eternal truth |

The λ symbol transitions through states with the page.
The ∎ (QED) mark **only appears in crystal state**.

---

## Integration

### HTML Attributes
```html
<section data-phase-section="origin">
<h2 data-nucleation="primary">
<p data-facets="4">
<span data-crystallizes="early">
```

### Body Attributes (Set by JS)
```html
<body
  data-thermal="liquid"           /* Current phase */
  data-velocity="medium"          /* Scroll speed class */
  data-crystal-depth="3"          /* Facets revealed */
  data-supercooled="false"        /* Supercooling event active */
  data-triple-point="false"       /* All states coexisting */
>
```

---

## Philosophy

North-Star says: "The user travels through a procedure."

Phase Transition says: **"The user transforms chaos into order through the thermodynamics of attention."**

Reading isn't consumption. It's crystallization. The proof doesn't exist until you precipitate it from the supersaturated solution of possibility.

The page doesn't inform you. **You nucleate meaning.**

---

## Scarcity Economics

| Element | Occurrences | Condition |
|---------|-------------|-----------|
| Crystal state | Rare | 600ms+ pause |
| Seed Crystal | 3 | Fixed positions |
| Complete lattice | 1 | 90%+ in solid state |
| Prismatic dispersion | Crystal only | Sustained attention |
| Supercooling | 2-3 | Random, tension-building |
| Triple point | 1 | 60% + medium velocity |
| Full facet reveal | 6 max | 2400ms sustained pause |

---

## Console Verification

```
═══════════════════════════════════════════════════
  CYTHERAI PHASE TRANSITION ENGINE v1.0
  Material: Thermodynamic Medium
═══════════════════════════════════════════════════
✓ Thermal Velocity Detection
✓ Phase State Management (5 states)
✓ Nucleation Site System
✓ Seed Crystal (3 appearances)
✓ Phase Diagram UI
✓ Crystalline Facets
✓ Latent Heat Delays
✓ Supercooling Events
✓ Triple Point Detection
✓ Brownian Particle Field
✓ Lattice Emergence
✓ Prismatic Dispersion
═══════════════════════════════════════════════════
```
