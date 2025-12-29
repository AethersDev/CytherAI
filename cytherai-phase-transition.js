/**
 * ════════════════════════════════════════════════════════════════════════════════
 * CYTHERAI PHASE TRANSITION ENGINE - JavaScript
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Material Metaphor: Thermodynamic Medium
 * Content crystallizes from chaos through the thermodynamics of attention.
 *
 * The user doesn't read—they precipitate meaning from supersaturation.
 *
 * ════════════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Thermal velocity thresholds (px/s)
        thermal: {
            plasma: 2000,    // > 2000 = plasma
            gas: 800,        // 800-2000 = gas
            liquid: 200,     // 200-800 = liquid
            solid: 50,       // 50-200 = solid
            frozen: 50       // < 50 + time = frozen
        },

        // Latent heat delays (ms)
        latent: {
            plasmaToGas: 50,
            gasToLiquid: 100,
            liquidToSolid: 200,
            solidToFrozen: 600
        },

        // Crystal formation
        crystal: {
            facetDelay: 400,         // ms between facet reveals
            maxFacets: 6,            // crystallographic symmetry
            nucleationAdvance: 200   // ms earlier for nucleation sites
        },

        // Seed crystal positions (scroll %)
        seedCrystal: {
            positions: [25, 60, 92],
            states: ['nucleus', 'growing', 'complete'],
            labels: ['INIT', 'FORMING', 'PROVEN']
        },

        // Triple point
        triplePoint: {
            scrollPosition: 60,      // % scroll
            velocityRange: [300, 600], // medium velocity
            duration: 2000           // ms to remain active
        },

        // Supercooling
        supercooling: {
            probability: 0.15,       // 15% chance per solid→frozen attempt
            maxEvents: 3,
            cooldown: 10000          // ms between possible events
        },

        // Brownian particles
        particles: {
            count: 30,
            minSize: 2,
            maxSize: 5
        },

        // Phase diagram
        phaseDiagram: {
            updateInterval: 100,     // ms
            maxPathPoints: 200
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════════

    const STATE = {
        currentPhase: 'liquid',
        previousPhase: null,
        scrollVelocity: 0,
        scrollPosition: 0,
        lastScrollY: 0,
        lastScrollTime: 0,
        stationaryTime: 0,
        crystalDepth: 1,
        supercoolingCount: 0,
        lastSupercool: 0,
        isTriplePoint: false,
        pathPoints: [],
        initialized: false
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE TRANSITION ENGINE
    // ═══════════════════════════════════════════════════════════════════════════════

    const PhaseEngine = {

        // ─────────────────────────────────────────────────────────────────
        // INITIALIZATION
        // ─────────────────────────────────────────────────────────────────

        init() {
            if (STATE.initialized) return;
            STATE.initialized = true;

            this.createDOM();
            this.bindEvents();
            this.startVelocityLoop();
            this.startCrystalLoop();
            this.initParticles();

            // Set initial state
            document.body.setAttribute('data-thermal', 'liquid');
            document.body.setAttribute('data-crystal-depth', '1');
            document.body.setAttribute('data-supercooled', 'false');
            document.body.setAttribute('data-triple-point', 'false');

            this.log('Phase Transition Engine initialized');
        },

        createDOM() {
            // Thermal overlay
            if (!document.querySelector('.thermal-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'thermal-overlay';
                document.body.appendChild(overlay);
            }

            // Brownian particle container
            if (!document.querySelector('.brownian-container')) {
                const container = document.createElement('div');
                container.className = 'brownian-container';
                document.body.appendChild(container);
            }

            // Phase diagram
            this.createPhaseDiagram();

            // Seed crystals
            this.createSeedCrystals();

            // Triple point badge
            if (!document.querySelector('.triple-point-badge')) {
                const badge = document.createElement('div');
                badge.className = 'triple-point-badge';
                badge.textContent = 'TRIPLE POINT';
                document.body.appendChild(badge);
            }

            // Supercooling warning
            if (!document.querySelector('.supercool-warning')) {
                const warning = document.createElement('div');
                warning.className = 'supercool-warning';
                warning.textContent = 'SUPERCOOLING';
                document.body.appendChild(warning);
            }

            // Euler mark
            if (!document.querySelector('.euler-mark')) {
                const euler = document.createElement('div');
                euler.className = 'euler-mark';
                euler.innerHTML = 'χ = <span class="euler-value">0</span>';
                document.body.appendChild(euler);
            }
        },

        createPhaseDiagram() {
            if (document.querySelector('.phase-diagram')) return;

            const diagram = document.createElement('div');
            diagram.className = 'phase-diagram';
            diagram.innerHTML = `
                <div class="phase-diagram-bg"></div>
                <div class="phase-region plasma"></div>
                <div class="phase-region gas"></div>
                <div class="phase-region liquid"></div>
                <div class="phase-region solid"></div>
                <div class="phase-region crystal"></div>
                <svg class="phase-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline class="phase-path-line" points=""/>
                </svg>
                <div class="phase-current"></div>
                <span class="phase-axis-label x">PRESSURE</span>
                <span class="phase-axis-label y">TEMP</span>
            `;
            document.body.appendChild(diagram);

            // Show after brief delay
            setTimeout(() => diagram.classList.add('visible'), 2000);
        },

        createSeedCrystals() {
            CONFIG.seedCrystal.positions.forEach((pos, i) => {
                if (document.querySelector(`.seed-crystal[data-appearance="${i+1}"]`)) return;

                const crystal = document.createElement('div');
                crystal.className = 'seed-crystal';
                crystal.setAttribute('data-appearance', i + 1);
                crystal.setAttribute('data-state', 'hidden');
                crystal.innerHTML = `
                    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Hexagonal crystal structure -->
                        <polygon
                            points="30,5 52,17.5 52,42.5 30,55 8,42.5 8,17.5"
                            stroke="currentColor"
                            stroke-width="1"
                            fill="none"
                            opacity="0.6"
                        />
                        <polygon
                            points="30,12 45,21 45,39 30,48 15,39 15,21"
                            stroke="currentColor"
                            stroke-width="0.75"
                            fill="rgba(212,175,55,0.1)"
                            opacity="0.8"
                        />
                        <polygon
                            points="30,18 38,24 38,36 30,42 22,36 22,24"
                            stroke="currentColor"
                            stroke-width="0.5"
                            fill="rgba(212,175,55,0.2)"
                        />
                        <!-- Inner facets -->
                        <line x1="30" y1="5" x2="30" y2="55" stroke="currentColor" stroke-width="0.3" opacity="0.4"/>
                        <line x1="8" y1="17.5" x2="52" y2="42.5" stroke="currentColor" stroke-width="0.3" opacity="0.4"/>
                        <line x1="52" y1="17.5" x2="8" y2="42.5" stroke="currentColor" stroke-width="0.3" opacity="0.4"/>
                        <!-- Core -->
                        <circle cx="30" cy="30" r="4" fill="currentColor" opacity="0.6"/>
                    </svg>
                    <span class="seed-crystal-label">${CONFIG.seedCrystal.labels[i]}</span>
                `;
                crystal.style.color = 'var(--gold-core, #d4af37)';
                document.body.appendChild(crystal);
            });
        },

        // ─────────────────────────────────────────────────────────────────
        // EVENT BINDING
        // ─────────────────────────────────────────────────────────────────

        bindEvents() {
            // Scroll velocity tracking
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

            // Resize handling
            window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 200));
        },

        handleScroll() {
            const now = performance.now();
            const currentY = window.scrollY;
            const deltaY = Math.abs(currentY - STATE.lastScrollY);
            const deltaTime = now - STATE.lastScrollTime;

            if (deltaTime > 0) {
                STATE.scrollVelocity = (deltaY / deltaTime) * 1000; // px/s
            }

            STATE.scrollPosition = (currentY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            STATE.lastScrollY = currentY;
            STATE.lastScrollTime = now;
            STATE.stationaryTime = 0;

            // Update seed crystals
            this.updateSeedCrystals();

            // Check for triple point
            this.checkTriplePoint();
        },

        handleResize() {
            // Recalculate particle positions
            this.initParticles();
        },

        // ─────────────────────────────────────────────────────────────────
        // VELOCITY DETECTION LOOP
        // ─────────────────────────────────────────────────────────────────

        startVelocityLoop() {
            const loop = () => {
                const now = performance.now();

                // Decay velocity when not scrolling
                if (now - STATE.lastScrollTime > 100) {
                    STATE.scrollVelocity *= 0.9;
                    STATE.stationaryTime += 16;
                }

                // Determine phase from velocity
                const newPhase = this.calculatePhase();

                if (newPhase !== STATE.currentPhase) {
                    this.transitionPhase(newPhase);
                }

                // Update phase diagram
                this.updatePhaseDiagram();

                // Update Euler characteristic
                this.updateEuler();

                requestAnimationFrame(loop);
            };

            requestAnimationFrame(loop);
        },

        calculatePhase() {
            const v = STATE.scrollVelocity;

            if (v > CONFIG.thermal.plasma) return 'plasma';
            if (v > CONFIG.thermal.gas) return 'gas';
            if (v > CONFIG.thermal.liquid) return 'liquid';
            if (v > CONFIG.thermal.solid) return 'solid';

            // Frozen requires time stationary
            if (STATE.stationaryTime > CONFIG.latent.solidToFrozen) {
                return 'frozen';
            }

            return 'solid';
        },

        transitionPhase(newPhase) {
            STATE.previousPhase = STATE.currentPhase;

            // Check for supercooling before solid→frozen
            if (STATE.currentPhase === 'solid' && newPhase === 'frozen') {
                if (this.checkSupercooling()) {
                    return; // Supercooling event triggered
                }
            }

            // Get latent heat delay
            const delay = this.getLatentDelay(STATE.currentPhase, newPhase);

            setTimeout(() => {
                STATE.currentPhase = newPhase;
                document.body.setAttribute('data-thermal', newPhase);

                // Reset crystal depth on phase change upward
                if (this.getPhaseOrder(newPhase) < this.getPhaseOrder(STATE.previousPhase)) {
                    STATE.crystalDepth = 1;
                    document.body.setAttribute('data-crystal-depth', '1');
                }

                this.log(`Phase transition: ${STATE.previousPhase} → ${newPhase}`);
            }, delay);
        },

        getPhaseOrder(phase) {
            const order = { plasma: 0, gas: 1, liquid: 2, solid: 3, frozen: 4 };
            return order[phase] || 2;
        },

        getLatentDelay(from, to) {
            if (from === 'plasma' && to === 'gas') return CONFIG.latent.plasmaToGas;
            if (from === 'gas' && to === 'liquid') return CONFIG.latent.gasToLiquid;
            if (from === 'liquid' && to === 'solid') return CONFIG.latent.liquidToSolid;
            if (from === 'solid' && to === 'frozen') return CONFIG.latent.solidToFrozen;
            return 50; // Default quick transition for reverse
        },

        // ─────────────────────────────────────────────────────────────────
        // CRYSTALLIZATION LOOP
        // ─────────────────────────────────────────────────────────────────

        startCrystalLoop() {
            setInterval(() => {
                // Only grow crystals when frozen
                if (STATE.currentPhase === 'frozen') {
                    if (STATE.crystalDepth < CONFIG.crystal.maxFacets) {
                        STATE.crystalDepth++;
                        document.body.setAttribute('data-crystal-depth', STATE.crystalDepth.toString());
                        this.log(`Crystal facet revealed: ${STATE.crystalDepth}/${CONFIG.crystal.maxFacets}`);
                    }
                }
            }, CONFIG.crystal.facetDelay);
        },

        // ─────────────────────────────────────────────────────────────────
        // SUPERCOOLING
        // ─────────────────────────────────────────────────────────────────

        checkSupercooling() {
            const now = performance.now();

            // Check limits
            if (STATE.supercoolingCount >= CONFIG.supercooling.maxEvents) return false;
            if (now - STATE.lastSupercool < CONFIG.supercooling.cooldown) return false;

            // Random chance
            if (Math.random() < CONFIG.supercooling.probability) {
                this.triggerSupercooling();
                return true;
            }

            return false;
        },

        triggerSupercooling() {
            STATE.supercoolingCount++;
            STATE.lastSupercool = performance.now();

            document.body.setAttribute('data-supercooled', 'true');
            this.log('SUPERCOOLING EVENT');

            // Flash back to liquid briefly
            setTimeout(() => {
                STATE.currentPhase = 'liquid';
                document.body.setAttribute('data-thermal', 'liquid');
            }, 300);

            // Reset supercooled state
            setTimeout(() => {
                document.body.setAttribute('data-supercooled', 'false');
            }, 1000);
        },

        // ─────────────────────────────────────────────────────────────────
        // TRIPLE POINT
        // ─────────────────────────────────────────────────────────────────

        checkTriplePoint() {
            const inRange =
                Math.abs(STATE.scrollPosition - CONFIG.triplePoint.scrollPosition) < 5 &&
                STATE.scrollVelocity >= CONFIG.triplePoint.velocityRange[0] &&
                STATE.scrollVelocity <= CONFIG.triplePoint.velocityRange[1];

            if (inRange && !STATE.isTriplePoint) {
                STATE.isTriplePoint = true;
                document.body.setAttribute('data-triple-point', 'true');
                this.log('TRIPLE POINT ACHIEVED');

                // Auto-expire
                setTimeout(() => {
                    STATE.isTriplePoint = false;
                    document.body.setAttribute('data-triple-point', 'false');
                }, CONFIG.triplePoint.duration);
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // SEED CRYSTALS
        // ─────────────────────────────────────────────────────────────────

        updateSeedCrystals() {
            CONFIG.seedCrystal.positions.forEach((pos, i) => {
                const crystal = document.querySelector(`.seed-crystal[data-appearance="${i+1}"]`);
                if (!crystal) return;

                const currentState = crystal.getAttribute('data-state');
                let newState = 'hidden';

                // Determine state based on scroll position and phase
                const scrollDist = Math.abs(STATE.scrollPosition - pos);

                if (scrollDist < 15) {
                    if (STATE.currentPhase === 'frozen') {
                        newState = CONFIG.seedCrystal.states[i];
                    } else if (STATE.currentPhase === 'solid') {
                        newState = i === 0 ? 'nucleus' : 'hidden';
                    } else if (STATE.currentPhase === 'liquid' && scrollDist < 8) {
                        newState = 'nucleus';
                    }
                }

                if (newState !== currentState) {
                    crystal.setAttribute('data-state', newState);
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────
        // PHASE DIAGRAM
        // ─────────────────────────────────────────────────────────────────

        updatePhaseDiagram() {
            // Calculate position on diagram
            // X = scroll position (0-100%)
            // Y = thermal velocity inverted (high temp at top)
            const x = STATE.scrollPosition;
            const y = 100 - Math.min(100, (STATE.scrollVelocity / CONFIG.thermal.plasma) * 100);

            // Update current indicator
            const indicator = document.querySelector('.phase-current');
            if (indicator) {
                indicator.style.left = `${x}%`;
                indicator.style.top = `${y}%`;
            }

            // Add to path
            STATE.pathPoints.push({ x, y });
            if (STATE.pathPoints.length > CONFIG.phaseDiagram.maxPathPoints) {
                STATE.pathPoints.shift();
            }

            // Update path line
            const pathLine = document.querySelector('.phase-path-line');
            if (pathLine && STATE.pathPoints.length > 1) {
                const points = STATE.pathPoints
                    .map(p => `${p.x},${p.y}`)
                    .join(' ');
                pathLine.setAttribute('points', points);
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // EULER CHARACTERISTIC
        // ─────────────────────────────────────────────────────────────────

        eulerBacktracks: 0,
        eulerPauses: 0,
        lastScrollDirection: 0,

        updateEuler() {
            // Detect backtracking
            const currentDirection = STATE.scrollVelocity > 10 ?
                (window.scrollY > STATE.lastScrollY ? 1 : -1) : 0;

            if (currentDirection !== 0 && currentDirection !== this.lastScrollDirection && this.lastScrollDirection !== 0) {
                this.eulerBacktracks++;
            }
            this.lastScrollDirection = currentDirection;

            // Count pauses (frozen state entries)
            if (STATE.currentPhase === 'frozen' && STATE.previousPhase === 'solid') {
                this.eulerPauses++;
            }

            // Calculate Euler characteristic (topology of reading)
            const chi = this.eulerPauses - this.eulerBacktracks;

            const eulerValue = document.querySelector('.euler-value');
            if (eulerValue) {
                eulerValue.textContent = chi >= 0 ? `+${chi}` : chi;
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // BROWNIAN PARTICLES
        // ─────────────────────────────────────────────────────────────────

        initParticles() {
            const container = document.querySelector('.brownian-container');
            if (!container) return;

            container.innerHTML = '';

            for (let i = 0; i < CONFIG.particles.count; i++) {
                const particle = document.createElement('div');
                particle.className = 'brownian-particle';

                const size = CONFIG.particles.minSize +
                    Math.random() * (CONFIG.particles.maxSize - CONFIG.particles.minSize);

                particle.style.cssText = `
                    width: ${size}px;
                    height: ${size}px;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    --random-x: ${Math.random()};
                    --random-y: ${Math.random()};
                    animation-delay: ${Math.random() * 2}s;
                `;

                container.appendChild(particle);
            }
        },

        // ─────────────────────────────────────────────────────────────────
        // UTILITIES
        // ─────────────────────────────────────────────────────────────────

        debounce(fn, delay) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        log(msg) {
            console.log(`%c[Phase] ${msg}`, 'color: #d4af37; font-weight: bold;');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // NUCLEATION SITE PROCESSOR
    // ═══════════════════════════════════════════════════════════════════════════════

    const NucleationProcessor = {
        init() {
            // Find all elements that should be nucleation sites
            this.markNucleationSites();
        },

        markNucleationSites() {
            // Headlines are primary nucleation sites
            document.querySelectorAll('.chapter-stamp, .sovereign-headline, .gate-stamp').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'primary');
                }
            });

            // Claims are secondary
            document.querySelectorAll('.chapter-claim, .sovereign-subline').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'secondary');
                }
            });

            // Key terms in artifacts
            document.querySelectorAll('.artifact-label').forEach(el => {
                if (!el.hasAttribute('data-nucleation')) {
                    el.setAttribute('data-nucleation', 'tertiary');
                }
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // FACET SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════════

    const FacetSystem = {
        init() {
            // Convert data-disclosure elements to faceted content
            this.processFacetedContent();
        },

        processFacetedContent() {
            document.querySelectorAll('[data-disclosure]').forEach(el => {
                if (el.classList.contains('faceted-processed')) return;

                const mainContent = el.innerHTML;
                const disclosure = el.getAttribute('data-disclosure');

                el.classList.add('faceted-processed');
                el.setAttribute('data-facets', '2');

                // Create facet structure
                el.innerHTML = `
                    <span data-facet="1">${mainContent}</span>
                    <span data-facet="2" class="facet-disclosure">${disclosure}</span>
                `;

                // Add facet indicator
                const indicator = document.createElement('div');
                indicator.className = 'facet-indicator';
                indicator.innerHTML = `
                    <div class="facet-dot revealed"></div>
                    <div class="facet-dot"></div>
                `;
                el.appendChild(indicator);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSOLE BRANDING
    // ═══════════════════════════════════════════════════════════════════════════════

    const ConsoleBrand = {
        print() {
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
            console.log('%c  CYTHERAI PHASE TRANSITION ENGINE v1.0', 'color: #d4af37; font-weight: bold; font-size: 14px;');
            console.log('%c  Material: Thermodynamic Medium', 'color: #8a6e1f; font-style: italic;');
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
            console.log('%c  ✓ Thermal Velocity Detection', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Phase State Management (5 states)', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Nucleation Site System', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Seed Crystal (3 appearances)', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Phase Diagram UI', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Crystalline Facets', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Latent Heat Delays', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Supercooling Events', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Triple Point Detection', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Brownian Particle Field', 'color: #22c55e; font-size: 10px;');
            console.log('%c  ✓ Euler Characteristic Tracking', 'color: #22c55e; font-size: 10px;');
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
            console.log('%c  "You don\'t read—you nucleate meaning."', 'color: #f5f5f0; font-style: italic;');
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════

    function init() {
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('%c[Phase] Reduced motion detected - minimal effects', 'color: #8a6e1f;');
            document.body.setAttribute('data-thermal', 'solid');
            return;
        }

        ConsoleBrand.print();
        PhaseEngine.init();
        NucleationProcessor.init();
        FacetSystem.init();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.CytherPhase = {
        engine: PhaseEngine,
        state: STATE,
        config: CONFIG
    };

})();
