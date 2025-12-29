/**
 * ════════════════════════════════════════════════════════════════════════════════
 * CYTHERAI PHASE TRANSITION ENGINE - Authority Edition
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * "Fast reveals nothing. Slow reveals truth."
 *
 * Deterministic. Hysteresis-based. φ-governed. No gimmicks.
 *
 * Core principles:
 * - Attention is the only input
 * - Scroll velocity = temperature
 * - Pause duration = pressure
 * - State changes are hysteresis-based (not random)
 * - Feels physical and inevitable
 *
 * ════════════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════════
    // φ-BASED CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════

    const PHI = 1.618033988749895;
    const PHI_INV = 0.618033988749895;

    const CONFIG = {
        // Thermal velocity thresholds (px/s)
        // Reduced to 3 visible behaviors: hot, warm, cold
        thermal: {
            hotThreshold: 600,      // > 600 px/s = hot (blurry, suggestive)
            coldThreshold: 80,      // < 80 px/s = entering cold
            frozenTime: 500         // ms stationary to reach crystallized
        },

        // Hysteresis bands - prevents flickering
        // Once in a state, need to cross FURTHER to exit
        hysteresis: {
            hotExit: 400,           // Must drop below 400 to exit hot
            coldExit: 150           // Must rise above 150 to exit cold
        },

        // φ-based scroll landmarks
        landmarks: {
            emergence: PHI_INV - (1 / (PHI * PHI * PHI)),  // 0.382
            balance: PHI_INV,                               // 0.618
            completion: PHI_INV + (1 / (PHI * PHI))         // 0.854
        },

        // Crystal facet timing (capped at 3)
        facets: {
            depth1Time: 0,          // Immediate
            depth2Time: 800,        // First reveal after 800ms
            depth3Time: 1600,       // Maximum depth at 1600ms
            maxDepth: 3
        },

        // Triple point detection
        triplePoint: {
            scrollTolerance: 0.03,  // ±3% around 0.618
            velocityMin: 150,       // Between warm and cold
            velocityMax: 400,       // Between warm and hot
            duration: 800           // How long effect persists
        },

        // Performance
        performance: {
            velocitySampleRate: 50, // ms between velocity samples
            stateUpdateRate: 100    // ms between state evaluations
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE (Minimal, deterministic)
    // ═══════════════════════════════════════════════════════════════════════════════

    const STATE = {
        thermal: 'warm',            // hot | warm | cold
        lockedThermal: null,        // Hysteresis lock
        velocity: 0,
        scrollPercent: 0,
        lastScrollY: 0,
        lastScrollTime: 0,
        stationaryStart: 0,
        crystalDepth: 1,
        triplePointActive: false,
        initialized: false
    };

    // Velocity sample buffer for smoothing
    const velocityBuffer = [];
    const VELOCITY_BUFFER_SIZE = 5;

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE TRANSITION ENGINE
    // ═══════════════════════════════════════════════════════════════════════════════

    const PhaseEngine = {

        init() {
            if (STATE.initialized) return;
            STATE.initialized = true;

            // Create minimal DOM elements
            this.createDOM();

            // Set initial state
            document.body.setAttribute('data-thermal', 'warm');
            document.body.setAttribute('data-crystal-depth', '1');
            document.body.setAttribute('data-triple-point', 'false');

            // Bind scroll listener (passive for performance)
            window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });

            // Start state evaluation loop
            this.startStateLoop();

            // Mark nucleation sites
            this.markNucleationSites();

            this.log('Authority Edition initialized');
        },

        // ─────────────────────────────────────────────────────────────────
        // MINIMAL DOM CREATION
        // ─────────────────────────────────────────────────────────────────

        createDOM() {
            const fragment = document.createDocumentFragment();

            // Thermal vignette (cold state)
            if (!document.querySelector('.thermal-vignette')) {
                const vignette = document.createElement('div');
                vignette.className = 'thermal-vignette';
                fragment.appendChild(vignette);
            }

            // Thermal reticle (cold state edge tightening)
            if (!document.querySelector('.thermal-reticle')) {
                const reticle = document.createElement('div');
                reticle.className = 'thermal-reticle';
                fragment.appendChild(reticle);
            }

            // Brownian field (CSS-based, no particles)
            if (!document.querySelector('.brownian-field')) {
                const field = document.createElement('div');
                field.className = 'brownian-field';
                fragment.appendChild(field);
            }

            // Calibration marks (cold state corners)
            const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            positions.forEach(pos => {
                if (!document.querySelector(`.calibration-mark.${pos}`)) {
                    const mark = document.createElement('div');
                    mark.className = `calibration-mark ${pos}`;
                    fragment.appendChild(mark);

                    const markV = document.createElement('div');
                    markV.className = `calibration-mark ${pos} vertical`;
                    fragment.appendChild(markV);
                }
            });

            // Seed crystals at φ landmarks
            this.createSeedCrystals(fragment);

            document.body.appendChild(fragment);
        },

        createSeedCrystals(fragment) {
            const positions = ['emergence', 'balance', 'completion'];
            const crystalSVG = `
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="20,4 35,12 35,28 20,36 5,28 5,12"
                        stroke="currentColor" stroke-width="0.75" fill="none" opacity="0.6"/>
                    <polygon points="20,10 28,15 28,25 20,30 12,25 12,15"
                        stroke="currentColor" stroke-width="0.5" fill="rgba(212,175,55,0.08)"/>
                    <line x1="20" y1="4" x2="20" y2="36" stroke="currentColor" stroke-width="0.3" opacity="0.3"/>
                </svg>
            `;

            positions.forEach(pos => {
                if (!document.querySelector(`.seed-crystal[data-position="${pos}"]`)) {
                    const crystal = document.createElement('div');
                    crystal.className = 'seed-crystal';
                    crystal.setAttribute('data-position', pos);
                    crystal.setAttribute('data-visible', 'false');
                    crystal.innerHTML = crystalSVG;
                    fragment.appendChild(crystal);
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────
        // SCROLL HANDLING (Velocity calculation)
        // ─────────────────────────────────────────────────────────────────

        onScroll() {
            const now = performance.now();
            const currentY = window.scrollY;
            const deltaY = Math.abs(currentY - STATE.lastScrollY);
            const deltaTime = now - STATE.lastScrollTime;

            // Calculate instantaneous velocity
            if (deltaTime > 0 && deltaTime < 500) {
                const instantVelocity = (deltaY / deltaTime) * 1000;

                // Add to buffer for smoothing
                velocityBuffer.push(instantVelocity);
                if (velocityBuffer.length > VELOCITY_BUFFER_SIZE) {
                    velocityBuffer.shift();
                }

                // Smoothed velocity (average of buffer)
                STATE.velocity = velocityBuffer.reduce((a, b) => a + b, 0) / velocityBuffer.length;
            }

            // Calculate scroll percentage
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            STATE.scrollPercent = docHeight > 0 ? currentY / docHeight : 0;

            // Update tracking
            STATE.lastScrollY = currentY;
            STATE.lastScrollTime = now;

            // Reset stationary timer on movement
            if (deltaY > 2) {
                STATE.stationaryStart = 0;
                STATE.crystalDepth = 1;
                document.body.setAttribute('data-crystal-depth', '1');
            }

            // Update seed crystal visibility
            this.updateSeedCrystals();
        },

        // ─────────────────────────────────────────────────────────────────
        // STATE EVALUATION LOOP (Hysteresis-based)
        // ─────────────────────────────────────────────────────────────────

        startStateLoop() {
            let lastUpdate = 0;

            const loop = (timestamp) => {
                // Throttle updates
                if (timestamp - lastUpdate >= CONFIG.performance.stateUpdateRate) {
                    lastUpdate = timestamp;
                    this.evaluateState(timestamp);
                }
                requestAnimationFrame(loop);
            };

            requestAnimationFrame(loop);
        },

        evaluateState(now) {
            const v = STATE.velocity;
            const timeSinceScroll = now - STATE.lastScrollTime;

            // Determine target thermal state with hysteresis
            let targetThermal = STATE.thermal;

            if (STATE.thermal === 'hot') {
                // Exit hot only if velocity drops below hysteresis band
                if (v < CONFIG.hysteresis.hotExit) {
                    targetThermal = v < CONFIG.thermal.coldThreshold ? 'cold' : 'warm';
                }
            } else if (STATE.thermal === 'cold') {
                // Exit cold only if velocity rises above hysteresis band
                if (v > CONFIG.hysteresis.coldExit) {
                    targetThermal = v > CONFIG.thermal.hotThreshold ? 'hot' : 'warm';
                }
            } else {
                // In warm state, evaluate normally
                if (v > CONFIG.thermal.hotThreshold) {
                    targetThermal = 'hot';
                } else if (v < CONFIG.thermal.coldThreshold) {
                    targetThermal = 'cold';
                }
            }

            // Handle stationary → crystallization
            if (timeSinceScroll > 100) {
                // Velocity decays when stationary
                STATE.velocity *= 0.85;

                if (STATE.stationaryStart === 0) {
                    STATE.stationaryStart = now;
                }

                const stationaryDuration = now - STATE.stationaryStart;

                // Deep crystallization only after frozen time
                if (stationaryDuration > CONFIG.thermal.frozenTime) {
                    targetThermal = 'cold';

                    // Progressive facet reveal
                    if (stationaryDuration > CONFIG.facets.depth2Time && STATE.crystalDepth < 2) {
                        STATE.crystalDepth = 2;
                        document.body.setAttribute('data-crystal-depth', '2');
                    }
                    if (stationaryDuration > CONFIG.facets.depth3Time && STATE.crystalDepth < 3) {
                        STATE.crystalDepth = 3;
                        document.body.setAttribute('data-crystal-depth', '3');
                    }
                }
            }

            // Apply state change
            if (targetThermal !== STATE.thermal) {
                STATE.thermal = targetThermal;
                document.body.setAttribute('data-thermal', targetThermal);
            }

            // Check for triple point at φ balance
            this.checkTriplePoint();
        },

        // ─────────────────────────────────────────────────────────────────
        // TRIPLE POINT (Deterministic at 0.618)
        // ─────────────────────────────────────────────────────────────────

        checkTriplePoint() {
            const scrollNearBalance = Math.abs(STATE.scrollPercent - CONFIG.landmarks.balance) < CONFIG.triplePoint.scrollTolerance;
            const velocityInRange = STATE.velocity >= CONFIG.triplePoint.velocityMin &&
                                    STATE.velocity <= CONFIG.triplePoint.velocityMax;

            if (scrollNearBalance && velocityInRange && !STATE.triplePointActive) {
                STATE.triplePointActive = true;
                document.body.setAttribute('data-triple-point', 'true');

                // Auto-expire after duration
                setTimeout(() => {
                    STATE.triplePointActive = false;
                    document.body.setAttribute('data-triple-point', 'false');
                }, CONFIG.triplePoint.duration);
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // SEED CRYSTALS (φ landmark visibility)
        // ─────────────────────────────────────────────────────────────────

        updateSeedCrystals() {
            const scroll = STATE.scrollPercent;

            // Emergence crystal: visible near 0.382
            const emergence = document.querySelector('.seed-crystal[data-position="emergence"]');
            if (emergence) {
                const nearEmergence = Math.abs(scroll - CONFIG.landmarks.emergence) < 0.08;
                emergence.setAttribute('data-visible', nearEmergence ? 'true' : 'false');
            }

            // Balance crystal: visible near 0.618
            const balance = document.querySelector('.seed-crystal[data-position="balance"]');
            if (balance) {
                const nearBalance = Math.abs(scroll - CONFIG.landmarks.balance) < 0.08;
                balance.setAttribute('data-visible', nearBalance ? 'true' : 'false');
            }

            // Completion crystal: visible near 0.854
            const completion = document.querySelector('.seed-crystal[data-position="completion"]');
            if (completion) {
                const nearCompletion = Math.abs(scroll - CONFIG.landmarks.completion) < 0.08;
                completion.setAttribute('data-visible', nearCompletion ? 'true' : 'false');
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // NUCLEATION SITES (Hierarchy without UI)
        // ─────────────────────────────────────────────────────────────────

        markNucleationSites() {
            // Primary: headlines crystallize first
            document.querySelectorAll('.chapter-stamp, .sovereign-headline, .gate-stamp').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'primary');
                }
            });

            // Secondary: claims follow
            document.querySelectorAll('.chapter-claim, .sovereign-subline').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'secondary');
                }
            });

            // Tertiary: artifacts last
            document.querySelectorAll('.artifact-label, .chapter-artifact').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'tertiary');
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────
        // UTILITIES
        // ─────────────────────────────────────────────────────────────────

        log(msg) {
            console.log(`%c[Phase] ${msg}`, 'color: #d4af37;');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSOLE SIGNATURE (Minimal)
    // ═══════════════════════════════════════════════════════════════════════════════

    const printSignature = () => {
        console.log('%c════════════════════════════════════════════', 'color: #d4af37;');
        console.log('%c  PHASE TRANSITION ENGINE', 'color: #d4af37; font-weight: bold;');
        console.log('%c  Authority Edition', 'color: #8a6e1f; font-style: italic;');
        console.log('%c════════════════════════════════════════════', 'color: #d4af37;');
        console.log('%c  "Fast reveals nothing. Slow reveals truth."', 'color: #9c9b96;');
        console.log('%c════════════════════════════════════════════', 'color: #d4af37;');
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════

    const init = () => {
        // Check for reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.setAttribute('data-thermal', 'warm');
            console.log('%c[Phase] Reduced motion - minimal effects', 'color: #8a6e1f;');
            return;
        }

        printSignature();
        PhaseEngine.init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Minimal API exposure
    window.CytherPhase = {
        getState: () => ({ ...STATE }),
        getConfig: () => ({ ...CONFIG })
    };

})();
