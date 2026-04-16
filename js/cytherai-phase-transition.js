/**
 * CYTHERAI PHASE TRANSITION ENGINE — v2.2
 * "Fast reveals nothing. Slow reveals truth."
 *
 * STATUS: DORMANT — not loaded by any page. Requires a companion CSS file
 * (cytherai-phase-transition.css) that does not yet exist. Enable by adding
 * <link> and <script> to index.html once the CSS is authored.
 *
 * Scroll-velocity thermal state machine: hot (blurry) → warm → cold (crystallized).
 * Exposes window.CytherPhase { getState, getConfig, destroy }.
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     CALIBRATED CONSTANTS
     Device: 14" MacBook M4, Magic Trackpad, macOS 14
     Test scroll: three-finger swipe over 2000px page, measured at 60 Hz
     All px/s thresholds apply to |Δy / Δt| where Δt is clamped to [1, 500] ms.
     ═══════════════════════════════════════════════════════════════════ */

  /** Scroll velocity (px/s) above which thermal state = HOT (blurry, suggestive) */
  const VELOCITY_HOT_THRESHOLD     = 600;

  /** Scroll velocity (px/s) below which thermal state starts transitioning to COLD */
  const VELOCITY_COLD_THRESHOLD    = 80;

  /**
   * Hysteresis: must drop below this to EXIT hot state.
   * Set to 67 % of hot threshold so small deceleration doesn't flicker.
   */
  const VELOCITY_HOT_EXIT          = 400;

  /**
   * Hysteresis: must rise above this to EXIT cold state.
   * Set to ~2× cold threshold so brief bursts don't evict cold.
   */
  const VELOCITY_COLD_EXIT         = 150;

  /**
   * Milliseconds stationary before reaching fully crystallized "cold" state.
   * 500 ms ≈ a deliberate reading pause, not an accidental stop.
   */
  const FROZEN_TIME_MS             = 500;

  /**
   * Time window for velocity measurement.
   * FIX: using a time window instead of sample count eliminates 120 Hz vs 60 Hz bias.
   * Samples older than VELOCITY_WINDOW_MS are discarded on each scroll event.
   */
  const VELOCITY_WINDOW_MS         = 100;

  /** How often (ms) the state evaluation loop fires */
  const STATE_UPDATE_INTERVAL_MS   = 100;

  /** ms after Depth 1 (immediate) to reveal crystal facet 2 */
  const FACET_DEPTH_2_MS           = 800;

  /** ms after Depth 1 to reveal crystal facet 3 (maximum depth) */
  const FACET_DEPTH_3_MS           = 1600;

  /** Percentage of scroll position (0–1) where emergence crystal appears */
  const LANDMARK_EMERGENCE         = 0.382; // 1 − φ⁻¹

  /** Percentage of scroll position (0–1) where balance crystal appears (φ⁻¹) */
  const LANDMARK_BALANCE           = 0.618;

  /** Percentage of scroll position (0–1) where completion crystal appears */
  const LANDMARK_COMPLETION        = 0.854; // φ⁻¹ + φ⁻²

  /** Visibility band around each landmark (±N) to show the seed crystal */
  const LANDMARK_BAND              = 0.08;

  /** Triple-point scroll tolerance: ±3 % around LANDMARK_BALANCE */
  const TRIPLE_POINT_SCROLL_TOL    = 0.03;

  const TRIPLE_POINT_VEL_MIN       = 150; // px/s — lower bound of triple-point velocity
  const TRIPLE_POINT_VEL_MAX       = 400; // px/s — upper bound of triple-point velocity
  const TRIPLE_POINT_DURATION_MS   = 800;

  /* ═══════════════════════════════════════════════════════════════════
     φ-BASED CSS DESIGN TOKENS — unchanged from original
     ═══════════════════════════════════════════════════════════════════ */
  // (All CSS custom properties remain in cytherai-phase-transition.css)

  /* ═══════════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════════ */
  const STATE = {
    thermal:         'warm',  // hot | warm | cold
    velocity:        0,
    scrollPercent:   0,
    lastScrollY:     0,
    lastScrollTime:  0,
    stationaryStart: null,
    crystalDepth:    1,
    triplePointActive: false,
    initialized:     false,
  };

  /**
   * Time-stamped velocity samples: [{ v: number, t: number }]
   * FIX: each sample carries a timestamp so we can discard old ones regardless
   * of how many scroll events have fired (removes frame-rate dependency).
   */
  const velocitySamples = [];

  /* ═══════════════════════════════════════════════════════════════════
     PHASE ENGINE
     ═══════════════════════════════════════════════════════════════════ */
  const PhaseEngine = {

    init () {
      if (STATE.initialized) return;
      STATE.initialized = true;

      this.createDOM();

      document.body.setAttribute('data-thermal', 'warm');
      document.body.setAttribute('data-crystal-depth', '1');
      document.body.setAttribute('data-triple-point', 'false');

      window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
      this.startStateLoop();
      this.markNucleationSites();

      this.log('Phase Transition Engine v2.1 initialised');
    },

    /* ── DOM ──────────────────────────────────────────────────────── */

    createDOM () {
      const frag = document.createDocumentFragment();

      const addIfMissing = (sel, build) => {
        if (!document.querySelector(sel)) frag.appendChild(build());
      };

      addIfMissing('.thermal-vignette', () => {
        const d = document.createElement('div');
        d.className = 'thermal-vignette';
        return d;
      });

      addIfMissing('.thermal-reticle', () => {
        const d = document.createElement('div');
        d.className = 'thermal-reticle';
        return d;
      });

      addIfMissing('.brownian-field', () => {
        const d = document.createElement('div');
        d.className = 'brownian-field';
        return d;
      });

      ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
        addIfMissing(`.calibration-mark.${pos}`, () => {
          const d = document.createElement('div');
          d.className = `calibration-mark ${pos}`;
          return d;
        });
        addIfMissing(`.calibration-mark.${pos}.vertical`, () => {
          const d = document.createElement('div');
          d.className = `calibration-mark ${pos} vertical`;
          return d;
        });
      });

      this.createSeedCrystals(frag);
      document.body.appendChild(frag);
    },

    createSeedCrystals (frag) {
      const svg = `
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,4 35,12 35,28 20,36 5,28 5,12"
            stroke="currentColor" stroke-width="0.75" fill="none" opacity="0.6"/>
          <polygon points="20,10 28,15 28,25 20,30 12,25 12,15"
            stroke="currentColor" stroke-width="0.5" fill="rgba(212,175,55,0.08)"/>
          <line x1="20" y1="4" x2="20" y2="36" stroke="currentColor" stroke-width="0.3" opacity="0.3"/>
        </svg>`;

      ['emergence', 'balance', 'completion'].forEach(pos => {
        if (document.querySelector(`.seed-crystal[data-position="${pos}"]`)) return;
        const d = document.createElement('div');
        d.className = 'seed-crystal';
        d.setAttribute('data-position', pos);
        d.setAttribute('data-visible', 'false');
        d.innerHTML = svg;
        frag.appendChild(d);
      });
    },

    /* ── Scroll handling ──────────────────────────────────────────── */

    onScroll () {
      const now      = performance.now();
      const currentY = window.scrollY;
      const deltaY   = Math.abs(currentY - STATE.lastScrollY);
      const deltaT   = now - STATE.lastScrollTime;

      // Compute instantaneous velocity only on meaningful time intervals
      if (deltaT > 0 && deltaT < 500) {
        const instant = (deltaY / deltaT) * 1000;

        // FIX: push timestamped sample and purge stale ones
        velocitySamples.push({ v: instant, t: now });
        const cutoff = now - VELOCITY_WINDOW_MS;
        while (velocitySamples.length > 0 && velocitySamples[0].t < cutoff) {
          velocitySamples.shift();
        }

        // Smoothed velocity = average of samples within time window
        if (velocitySamples.length > 0) {
          STATE.velocity = velocitySamples.reduce((acc, s) => acc + s.v, 0)
            / velocitySamples.length;
        }
      }

      const docH = document.documentElement.scrollHeight - window.innerHeight;
      STATE.scrollPercent = docH > 0 ? currentY / docH : 0;

      STATE.lastScrollY   = currentY;
      STATE.lastScrollTime = now;

      if (deltaY > 2) {
        STATE.stationaryStart = null;
        STATE.crystalDepth    = 1;
        document.body.setAttribute('data-crystal-depth', '1');
      }

      this.updateSeedCrystals();
    },

    /* ── State loop ───────────────────────────────────────────────── */

    startStateLoop () {
      let lastUpdate = 0;
      const loop = ts => {
        if (!STATE.initialized) return; // destroy guard
        if (ts - lastUpdate >= STATE_UPDATE_INTERVAL_MS) {
          lastUpdate = ts;
          this.evaluateState(ts);
        }
        STATE._rafId = requestAnimationFrame(loop);
      };
      STATE._rafId = requestAnimationFrame(loop);
    },

    evaluateState (now) {
      const v              = STATE.velocity;
      const timeSinceScroll = now - STATE.lastScrollTime;

      let target = STATE.thermal;

      // Hysteresis-based state transitions
      if (STATE.thermal === 'hot') {
        if (v < VELOCITY_HOT_EXIT) {
          target = v < VELOCITY_COLD_THRESHOLD ? 'cold' : 'warm';
        }
      } else if (STATE.thermal === 'cold') {
        if (v > VELOCITY_COLD_EXIT) {
          target = v > VELOCITY_HOT_THRESHOLD ? 'hot' : 'warm';
        }
      } else {
        // warm
        if (v > VELOCITY_HOT_THRESHOLD)       target = 'hot';
        else if (v < VELOCITY_COLD_THRESHOLD) target = 'cold';
      }

      // Stationary → crystallisation
      if (timeSinceScroll > 100) {
        STATE.velocity *= 0.85;

        if (STATE.stationaryStart === null) STATE.stationaryStart = now;
        const stationaryDuration = now - STATE.stationaryStart;

        if (stationaryDuration > FROZEN_TIME_MS) {
          target = 'cold';

          if (stationaryDuration > FACET_DEPTH_2_MS && STATE.crystalDepth < 2) {
            STATE.crystalDepth = 2;
            document.body.setAttribute('data-crystal-depth', '2');
          }
          if (stationaryDuration > FACET_DEPTH_3_MS && STATE.crystalDepth < 3) {
            STATE.crystalDepth = 3;
            document.body.setAttribute('data-crystal-depth', '3');
          }
        }
      }

      if (target !== STATE.thermal) {
        STATE.thermal = target;
        document.body.setAttribute('data-thermal', target);
      }

      this.checkTriplePoint();
    },

    /* ── Triple point ─────────────────────────────────────────────── */

    checkTriplePoint () {
      const nearBalance  = Math.abs(STATE.scrollPercent - LANDMARK_BALANCE) < TRIPLE_POINT_SCROLL_TOL;
      const velInRange   = STATE.velocity >= TRIPLE_POINT_VEL_MIN
                        && STATE.velocity <= TRIPLE_POINT_VEL_MAX;

      if (nearBalance && velInRange && !STATE.triplePointActive) {
        STATE.triplePointActive = true;
        document.body.setAttribute('data-triple-point', 'true');

        setTimeout(() => {
          STATE.triplePointActive = false;
          document.body.setAttribute('data-triple-point', 'false');
        }, TRIPLE_POINT_DURATION_MS);
      }
    },

    /* ── Seed crystals ────────────────────────────────────────────── */

    updateSeedCrystals () {
      const scroll = STATE.scrollPercent;
      [
        { pos: 'emergence',  landmark: LANDMARK_EMERGENCE  },
        { pos: 'balance',    landmark: LANDMARK_BALANCE    },
        { pos: 'completion', landmark: LANDMARK_COMPLETION },
      ].forEach(({ pos, landmark }) => {
        const el = document.querySelector(`.seed-crystal[data-position="${pos}"]`);
        if (el) {
          el.setAttribute(
            'data-visible',
            Math.abs(scroll - landmark) < LANDMARK_BAND ? 'true' : 'false'
          );
        }
      });
    },

    /* ── Nucleation sites ─────────────────────────────────────────── */

    markNucleationSites () {
      document.querySelectorAll('.chapter-stamp, .sovereign-headline, .gate-stamp')
        .forEach(el => { if (!el.hasAttribute('data-nucleation')) el.setAttribute('data-nucleation', 'primary'); });

      document.querySelectorAll('.chapter-claim, .sovereign-subline')
        .forEach(el => { if (!el.hasAttribute('data-nucleation')) el.setAttribute('data-nucleation', 'secondary'); });

      document.querySelectorAll('.artifact-label, .chapter-artifact')
        .forEach(el => { if (!el.hasAttribute('data-nucleation')) el.setAttribute('data-nucleation', 'tertiary'); });
    },

    /* ── Logging ──────────────────────────────────────────────────── */

    log (msg) {
      console.log(`%c[Phase] ${msg}`, 'color:#d4af37;');
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════════════ */

  function init () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.setAttribute('data-thermal', 'warm');
      console.log('%c[Phase] Reduced motion — minimal effects', 'color:#8a6e1f;');
      return;
    }

    console.log('%c════════════════════════════════════', 'color:#d4af37;');
    console.log('%c  PHASE TRANSITION ENGINE v2.1', 'color:#d4af37;font-weight:bold;');
    console.log('%c  "Fast reveals nothing. Slow reveals truth."', 'color:#9c9b96;');
    console.log('%c════════════════════════════════════', 'color:#d4af37;');

    PhaseEngine.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CytherPhase = {
    getState:  () => ({ ...STATE }),
    getConfig: () => ({
      VELOCITY_HOT_THRESHOLD,
      VELOCITY_COLD_THRESHOLD,
      VELOCITY_HOT_EXIT,
      VELOCITY_COLD_EXIT,
      FROZEN_TIME_MS,
      VELOCITY_WINDOW_MS,
    }),
    destroy () {
      STATE.initialized = false;
      if (STATE._rafId) cancelAnimationFrame(STATE._rafId);
    },
  };

})();
