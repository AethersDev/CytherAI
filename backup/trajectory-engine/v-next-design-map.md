# v-next Design Map — the site as a trajectory system

Step 1 of the approved plan (engine-as-base for the superseding site version). Grounded in the
*current* `index.html` + `js/*`, which already implement these concepts ad-hoc. v-next formalizes
them on `trajectory-engine-v2.js`. This map decides whether the engine genuinely fits before any
porting effort is spent (the minimalism gate). Verdict up front: **it fits — the current site is a
hand-rolled trajectory system, and the engine is its formal substrate.**

---

## 1. The τ model — the one load-bearing decision

The site already varies state over several distinct parameters. They are not one axis; conflating
them is the mistake to avoid.

- **Canonical τ = document position `p ∈ [0,1]`** (monotone-normalized scroll). The reading
  trajectory lives here: which section is active, what has been revealed, disclosure state.
  *Why canonical:* by the engine's covariance law (R1/R3), the **order** of section transitions is
  invariant under how you traverse — slow scroll, fast scroll, rail-jump (smooth-scroll), or a
  viewport reflow that changes pixel offsets. Only the *metric* (dwell time, pacing) differs. So the
  document's narrative order is canonical; pacing is not.
- **Perceptual-side (reads the *metric* of τ, must NOT be canonical):** strand-progress %,
  nav-shadow threshold, reveal animation timing, any debounce. These are R2's case — metric-
  dependent transducers that live in CSS/perception, never in the canonical log.
- **Separate observation axes (own logs, own τ):**
  - *wall-clock* — connectivity (online/offline), sealed-artifact external-request count, document
    expiry. Unrelated to scroll; their own trajectories.
  - *interaction-sequence* — command-palette state machine, keyboard/mouse input mode.
- **Persistence = the cursor.** `localStorage['cytherai-doc-state']` is, conceptually, a persisted
  **committed frontier**: "what has this visitor already observed." v-next makes that literal.

**Decision needed (sign-off): adopt `document position` as the canonical τ?** Alternative is a
*discrete guided-reveal sequence* (a stepped walkthrough rather than free-scroll), which makes τ an
integer step index. Recommend document-position unless v-next becomes an explicitly paged
experience. The rest of this map assumes document-position.

---

## 2. Entities · properties · trajectories

Each maps a real piece of current behavior to an engine construct.

| entity:prop | τ axis | engine construct | replaces (current ad-hoc) |
|---|---|---|---|
| `document:activeSection` | scroll | `makeDerived(scrollPos, offsets) → §00..§06` (step) | `updateRail()` `getBoundingClientRect` poll on every scroll event |
| `document:railProgress` | scroll *metric* | **perceptual-side** (not in the log) | `--strand-progress` % |
| `nav:scrolled` | scroll *metric* | **perceptual-side** threshold | `classList.toggle('scrolled', scrollY>60)` |
| `reveal[i]:shown` | scroll | `installLifecycle` birth-only: `INDETERMINATE→shown`, monotone, no death | `IntersectionObserver` + `unobserve` |
| `document:lifecycle` | wall-clock | `installLifecycle(issued 15 Apr, …, tauDeath = expiry 15 May)` → `INVALID` | `js-expiry` "EXPIRED — REVISION REQUIRED" check |
| `exhibitC:disclosure` | clearance | `INVALID` (sealed) / `INDETERMINATE` (exists, undisclosed) until access grant | `.doc-exhibit-restricted` static markup |
| `connectivity:online` | wall-clock | boolean trajectory (online↔offline edges) | `online`/`offline` listeners |
| `artifact:externalReqs` | wall-clock | monotone counter trajectory | `sealed-artifact.js` PerformanceObserver |
| `palette:state` | interaction | state-machine trajectory (`closed→open→navigating`) | `command-palette.js` |
| `input:mode` | interaction | boolean (`keyboard`/`mouse`) | `_manageFocus` `keyboard-nav` class |
| `visitor:frontier` | persisted | the cursor's committed frontier, serialized | `cytherai-doc-state` localStorage blob |

---

## 3. Derivations (the engine's reason to exist here)

- `railLink[k].active = eq(document:activeSection, k)` — pure derived; the rail is a view of one log.
- `section:newSinceLastVisit = derived(visitor:frontier, document position)` — **new capability** the
  current site gestures at ("local document memory") but doesn't really deliver; trivial once the
  frontier is a real cursor.
- `exhibit:accessible = and(disclosure == granted, connectivity:online)` — definedness + boolean
  lattice; sealed exhibits are `INVALID`, not `false`.

---

## 4. Definedness & lifecycle — the INVALID/INDETERMINATE cases

These are why the engine's three-valued model matters here, not just booleans:

- **Expired document** → `INVALID` (death edge already fired: today > 15 May expiry).
- **Restricted Exhibit C** → `INVALID` (sealed/absent) vs **un-reached section** → `INDETERMINATE`
  (exists, value not yet committed). The current site collapses both into "hidden"; the engine keeps
  them distinct, which is exactly the disclosure-vs-not-yet-seen distinction the Dossier metaphor
  wants.
- **Reveal** → birth (`INDETERMINATE → shown`), monotone, no death — drained once, like the engine's
  observe-once cursor.

---

## 5. Where the engine earns its place — and where it does not

**Earns it:**
- *Edge-minimality* kills the per-scroll-event recompute: `updateRail` runs on every scroll tick;
  the engine emits an edge only when `activeSection` actually changes. Event-driven, not poll-driven.
- *Definedness* unifies expiry + restricted-exhibit + reveal under one lifecycle mechanism instead of
  three independent ad-hoc checks.
- *Persisted cursor* makes "document memory" real (resumable reading, new-since-last-visit) instead
  of a stubbed localStorage blob.
- *Covariance* cleanly separates narrative order (engine) from pacing/animation (CSS) — the
  architecture the Dossier metaphor was reaching for.
- *Derivation + repropagation*: a responsive reflow is a `rebase` of section offsets; active-section
  and reveals repropagate through the identical machinery, no manual re-wiring.

**Does NOT earn it (keep it out):**
- Static prose, layout, typography, styling — plain HTML/CSS. The engine is the **state layer**, not
  a renderer. Do not model non-stateful content as trajectories.

---

## 6. Out of scope (this map)

Rendering/animation (CSS owns), routing, copywriting, and the engine's own internals. This map fixes
*what state v-next has and how it's expressed*, not how it looks.

---

## 7. Next pull after sign-off

Foundational browser port (step 2): split the library from its auto-running test suite, IIFE/ESM
form, load-bearing guards as unconditional `throw` (not `assert`, which minifiers strip), then wire
SRI (`generate-integrity.sh`) + a `sw.js` cache entry to match the sealed-artifact discipline.
