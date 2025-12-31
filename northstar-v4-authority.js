/**
 * ════════════════════════════════════════════════════════════════════════════════
 * NORTH-STAR V4: AUTHORITY-DRIVEN ATTENTION
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * The page is a controlled briefing, not a website.
 * No cute. No playful discovery. No ambient life.
 * Just authored inevitability.
 * 
 * MATERIAL METAPHOR: AUTHORITY
 * - You control what's shown
 * - You control what's withheld
 * - You're not performing for them
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 1. BRIEFING PACE CONTROLLER   Dwell + intent, not scroll position          │
 * │ 2. EXHIBIT SYSTEM             Legal/defense posture, not marketing         │
 * │ 3. NDA GATE                   Closing state seals, then CTA appears        │
 * │ 4. SOVEREIGN SEAL             3 appearances, authority mark (retained)     │
 * │ 5. SPINE                      Chain-of-custody (retained, simplified)      │
 * │ 6. CONSTRAINT REVEAL          60% second peak (retained)                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * REMOVED:
 * - Breathing animations
 * - Cursor toys / lens reveal
 * - Velocity-reactive anything
 * - Atmospheric particles beyond minimal residue
 * - Meta-commentary ("CUT TYPE", "EXPOSURE", etc.)
 * - Cinematic cut labels
 * - Variable font breathing
 * - Audio-reactive visuals
 * 
 * TEST: After 5 seconds of scroll-stop, user feels:
 * "I interrupted a controlled demonstration."
 * NOT: "I skimmed a landing page."
 * 
 * @version 4.0.0
 * ════════════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ════════════════════════════════════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════════════════════════════════════
    
    const Authority = {
        currentExhibit: -1,
        exhibitsRevealed: [],
        briefingSealed: false,
        dwellTimers: new Map(),
        sealAppearances: 0
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 1. BRIEFING PACE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════════
    //
    // Chapters don't reveal purely on scroll position.
    // They reveal on dwell + intent.
    // The page doesn't spill because someone flicked the wheel.
    // This is control.

    const BriefingPaceController = {
        dwellThreshold: 400, // ms required to reveal
        exhibits: [],
        observer: null,

        init() {
            this.injectStyles();
            this.findExhibits();
            this.setupObserver();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'briefing-pace-styles';
            style.textContent = `
                /* Exhibits start withheld */
                [data-exhibit] {
                    opacity: 0;
                    transform: translateY(8px);
                    transition: opacity 0.6s ease, transform 0.6s ease;
                    will-change: opacity, transform;
                }
                
                /* Revealed state */
                [data-exhibit].revealed {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                /* Exhibit content stays composed even when hidden */
                [data-exhibit]:not(.revealed) .exhibit-content {
                    pointer-events: none;
                }
                
                /* No scroll-jacking, just controlled reveal */
                html {
                    scroll-behavior: auto;
                }
            `;
            document.head.appendChild(style);
        },

        findExhibits() {
            this.exhibits = Array.from(document.querySelectorAll('[data-exhibit]'));
            
            // First exhibit reveals immediately (entry point)
            if (this.exhibits[0]) {
                this.exhibits[0].classList.add('revealed');
                Authority.exhibitsRevealed.push(0);
                Authority.currentExhibit = 0;
            }
        },

        setupObserver() {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const exhibit = entry.target;
                    const index = this.exhibits.indexOf(exhibit);
                    
                    if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                        // Start dwell timer
                        if (!Authority.dwellTimers.has(index)) {
                            const timer = setTimeout(() => {
                                this.revealExhibit(index);
                            }, this.dwellThreshold);
                            Authority.dwellTimers.set(index, timer);
                        }
                    } else {
                        // Cancel if scrolled away before dwell
                        if (Authority.dwellTimers.has(index) && !Authority.exhibitsRevealed.includes(index)) {
                            clearTimeout(Authority.dwellTimers.get(index));
                            Authority.dwellTimers.delete(index);
                        }
                    }
                });
            }, {
                threshold: [0.3, 0.5, 0.7],
                rootMargin: '-10% 0px -10% 0px'
            });

            this.exhibits.forEach(exhibit => {
                this.observer.observe(exhibit);
            });
        },

        revealExhibit(index) {
            if (Authority.exhibitsRevealed.includes(index)) return;
            
            const exhibit = this.exhibits[index];
            if (!exhibit) return;

            exhibit.classList.add('revealed');
            Authority.exhibitsRevealed.push(index);
            Authority.currentExhibit = index;

            // Emit for other systems
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('exhibit:revealed', { 
                    index, 
                    id: exhibit.dataset.exhibit,
                    total: this.exhibits.length 
                });
            }

            // Check if all exhibits revealed
            if (Authority.exhibitsRevealed.length === this.exhibits.length) {
                NDAGate.enableClosingState();
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 2. EXHIBIT SYSTEM
    // ════════════════════════════════════════════════════════════════════════════
    //
    // Not chapters. Exhibits.
    // Each has: one statement, one artifact, one boundary.
    // Legal/defense posture, not marketing.

    const ExhibitSystem = {
        exhibits: [
            {
                id: 'A',
                title: 'SOVEREIGN EXECUTION',
                statement: 'Neural inference without external dependency.',
                boundary: 'Architecture details under NDA.'
            },
            {
                id: 'B', 
                title: 'FROM-SCRATCH TRAINING',
                statement: 'Random initialization to convergence. No pretrained weights.',
                boundary: 'Training methodology under NDA.'
            },
            {
                id: 'C',
                title: 'REPRODUCIBILITY',
                statement: 'Deterministic end-to-end. Same input, same proof.',
                boundary: 'Verification protocol under NDA.'
            },
            {
                id: 'D',
                title: 'CAPABILITY BOUNDARY',
                statement: '97.7% loss reduction. 6 hours. Consumer hardware.',
                boundary: 'Benchmark data under NDA.'
            },
            {
                id: 'E',
                title: 'BRIEFING REQUEST',
                statement: null, // This is the CTA exhibit
                boundary: null
            }
        ],

        init() {
            this.injectStyles();
            this.renderExhibitStructure();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'exhibit-system-styles';
            style.textContent = `
                /* Exhibit container */
                .exhibit {
                    position: relative;
                    min-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: clamp(40px, 8vh, 80px) clamp(20px, 6vw, 120px);
                }
                
                /* Exhibit designation */
                .exhibit-designation {
                    position: absolute;
                    top: clamp(20px, 4vh, 40px);
                    left: clamp(20px, 4vw, 60px);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    letter-spacing: 0.2em;
                    color: var(--gold-shadow, #3d3312);
                }
                
                /* Exhibit title */
                .exhibit-title {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: clamp(10px, 1.2vw, 12px);
                    letter-spacing: 0.25em;
                    color: var(--gold-dim, #8a6e1f);
                    margin-bottom: 2rem;
                    text-transform: uppercase;
                }
                
                /* The statement - non-negotiable */
                .exhibit-statement {
                    font-family: 'Cormorant Garamond', Georgia, serif;
                    font-size: clamp(24px, 4vw, 42px);
                    font-weight: 300;
                    line-height: 1.3;
                    color: var(--text-primary, #f5f5f0);
                    max-width: 800px;
                    margin-bottom: 3rem;
                }
                
                /* Exhibit artifact - redacted/partial */
                .exhibit-artifact {
                    position: relative;
                    padding: 20px 0;
                    margin: 2rem 0;
                    border-left: 1px solid var(--gold-shadow, #3d3312);
                    padding-left: 20px;
                }
                
                .exhibit-artifact::before {
                    content: 'ARTIFACT';
                    position: absolute;
                    top: 0;
                    left: 20px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 7px;
                    letter-spacing: 0.15em;
                    color: var(--gold-shadow, #3d3312);
                }
                
                /* Redacted content within artifact */
                .artifact-redacted {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    color: var(--gold-shadow, #3d3312);
                    letter-spacing: 0.05em;
                }
                
                .artifact-redacted .redacted {
                    background: var(--gold-shadow, #3d3312);
                    color: var(--gold-shadow, #3d3312);
                    padding: 0 4px;
                    margin: 0 2px;
                    user-select: none;
                }
                
                /* Boundary line */
                .exhibit-boundary {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    letter-spacing: 0.1em;
                    color: var(--gold-shadow, #3d3312);
                    padding-top: 2rem;
                    border-top: 1px solid var(--gold-shadow, #3d3312);
                    max-width: 400px;
                }
                
                .exhibit-boundary::before {
                    content: '▸ ';
                    color: var(--gold-dim, #8a6e1f);
                }
                
                /* Final exhibit (CTA) - different treatment */
                .exhibit[data-exhibit="E"] {
                    text-align: center;
                    align-items: center;
                }
                
                .exhibit[data-exhibit="E"] .exhibit-title {
                    margin-bottom: 3rem;
                }
            `;
            document.head.appendChild(style);
        },

        renderExhibitStructure() {
            // Find existing exhibit containers and enhance them
            const exhibitContainers = document.querySelectorAll('[data-exhibit]');
            
            exhibitContainers.forEach(container => {
                const exhibitId = container.dataset.exhibit;
                const exhibitData = this.exhibits.find(e => e.id === exhibitId);
                
                if (!exhibitData) return;

                // Add designation if not present
                if (!container.querySelector('.exhibit-designation')) {
                    const designation = document.createElement('div');
                    designation.className = 'exhibit-designation';
                    designation.textContent = `EXHIBIT ${exhibitData.id}`;
                    container.prepend(designation);
                }

                // Add boundary if not present and data exists
                if (exhibitData.boundary && !container.querySelector('.exhibit-boundary')) {
                    const boundary = document.createElement('div');
                    boundary.className = 'exhibit-boundary';
                    boundary.textContent = exhibitData.boundary;
                    container.appendChild(boundary);
                }

                container.classList.add('exhibit');
            });
        },

        // Generate redacted artifact content
        generateRedactedArtifact(visibleParts, redactedParts) {
            let html = '';
            for (let i = 0; i < visibleParts.length; i++) {
                html += visibleParts[i];
                if (redactedParts[i]) {
                    html += `<span class="redacted">${redactedParts[i]}</span>`;
                }
            }
            return html;
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 3. NDA GATE
    // ════════════════════════════════════════════════════════════════════════════
    //
    // CTA doesn't feel like conversion UX.
    // It feels like the only permissible next step.
    // After final exhibit, device seals into stable end frame.
    // Only then CTA appears.
    // No bounce. No buttons throughout. No SaaS patterns.

    const NDAGate = {
        ctaElement: null,
        sealElement: null,
        isSealed: false,

        init() {
            this.injectStyles();
            this.findCTA();
            this.createSealState();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'nda-gate-styles';
            style.textContent = `
                /* CTA starts locked */
                .nda-gate {
                    opacity: 0;
                    transform: translateY(10px);
                    pointer-events: none;
                    transition: opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s;
                }
                
                /* CTA enabled after seal */
                .nda-gate.enabled {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                
                /* The gate itself */
                .nda-gate-button {
                    display: inline-block;
                    padding: 16px 40px;
                    background: transparent;
                    border: 1px solid var(--gold-dim, #8a6e1f);
                    color: var(--gold-dim, #8a6e1f);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    text-decoration: none;
                    cursor: pointer;
                    transition: background 0.3s ease, color 0.3s ease;
                }
                
                .nda-gate-button:hover {
                    background: var(--gold-dim, #8a6e1f);
                    color: var(--bg-primary, #050508);
                }
                
                /* Seal indicator - shows briefing completion state */
                .briefing-seal-state {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 8px;
                    letter-spacing: 0.15em;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    z-index: 100;
                }
                
                .briefing-seal-state.visible {
                    opacity: 0.5;
                }
                
                .briefing-seal-state.sealed {
                    color: var(--gold-dim, #8a6e1f);
                }
                
                /* Progress pips */
                .seal-progress {
                    display: flex;
                    gap: 6px;
                    margin-top: 6px;
                    justify-content: center;
                }
                
                .seal-pip {
                    width: 4px;
                    height: 4px;
                    border: 1px solid var(--gold-shadow, #3d3312);
                    transition: background 0.3s ease, border-color 0.3s ease;
                }
                
                .seal-pip.complete {
                    background: var(--gold-dim, #8a6e1f);
                    border-color: var(--gold-dim, #8a6e1f);
                }
                
                /* End frame - stable state after seal */
                body.briefing-sealed {
                    /* Subtle indication that briefing is complete */
                }
                
                body.briefing-sealed .exhibit.revealed {
                    /* All exhibits stay revealed, no animation */
                    transition: none;
                }
            `;
            document.head.appendChild(style);
        },

        findCTA() {
            // Find the CTA element (in final exhibit)
            this.ctaElement = document.querySelector('.nda-gate, [data-nda-gate]');
            
            if (!this.ctaElement) {
                // Create default CTA if none exists
                const finalExhibit = document.querySelector('[data-exhibit="E"]');
                if (finalExhibit) {
                    this.ctaElement = document.createElement('div');
                    this.ctaElement.className = 'nda-gate';
                    this.ctaElement.innerHTML = `
                        <a href="#request-briefing" class="nda-gate-button">
                            Request Technical Briefing
                        </a>
                    `;
                    finalExhibit.appendChild(this.ctaElement);
                }
            }
        },

        createSealState() {
            const exhibitCount = document.querySelectorAll('[data-exhibit]').length;
            
            this.sealElement = document.createElement('div');
            this.sealElement.className = 'briefing-seal-state';
            this.sealElement.innerHTML = `
                <span class="seal-label">BRIEFING PROGRESS</span>
                <div class="seal-progress">
                    ${Array(exhibitCount).fill('<span class="seal-pip"></span>').join('')}
                </div>
            `;
            document.body.appendChild(this.sealElement);

            // Show after first exhibit
            if (typeof ProofBus !== 'undefined') {
                ProofBus.on('exhibit:revealed', ({ index, total }) => {
                    this.updateProgress(index, total);
                });
            }
        },

        updateProgress(index, total) {
            if (!this.sealElement) return;
            
            this.sealElement.classList.add('visible');
            
            const pips = this.sealElement.querySelectorAll('.seal-pip');
            pips.forEach((pip, i) => {
                pip.classList.toggle('complete', Authority.exhibitsRevealed.includes(i));
            });
        },

        enableClosingState() {
            if (this.isSealed) return;
            this.isSealed = true;
            Authority.briefingSealed = true;

            // Seal the briefing
            document.body.classList.add('briefing-sealed');
            this.sealElement.classList.add('sealed');
            this.sealElement.querySelector('.seal-label').textContent = 'BRIEFING COMPLETE';

            // Enable CTA
            if (this.ctaElement) {
                this.ctaElement.classList.add('enabled');
            }

            // Emit
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('briefing:sealed');
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 4. SOVEREIGN SEAL (Retained, Simplified)
    // ════════════════════════════════════════════════════════════════════════════
    //
    // 3 appearances. Authority mark. No animation beyond state change.

    const SovereignSeal = {
        triggerPoints: [0.15, 0.55, 0.92],
        currentAppearance: -1,
        sealElement: null,

        states: {
            LATENT: 'latent',
            PRESENT: 'present',
            SEALED: 'sealed'
        },

        init() {
            this.injectStyles();
            this.createSeal();
            this.bindScroll();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'sovereign-seal-v4-styles';
            style.textContent = `
                .sovereign-seal {
                    position: fixed;
                    width: 60px;
                    height: 60px;
                    pointer-events: none;
                    z-index: 200;
                    opacity: 0;
                    transition: opacity 0.6s ease;
                }
                
                .sovereign-seal[data-state="latent"] {
                    opacity: 0.06;
                }
                
                .sovereign-seal[data-state="present"] {
                    opacity: 0.4;
                }
                
                .sovereign-seal[data-state="sealed"] {
                    opacity: 0.8;
                }
                
                /* Positions */
                .sovereign-seal[data-position="0"] {
                    top: 15%;
                    left: 6%;
                }
                
                .sovereign-seal[data-position="1"] {
                    top: 50%;
                    right: 6%;
                    left: auto;
                }
                
                .sovereign-seal[data-position="2"] {
                    bottom: 12%;
                    left: 50%;
                    top: auto;
                    transform: translateX(-50%);
                }
                
                .sovereign-seal svg {
                    width: 100%;
                    height: 100%;
                }
            `;
            document.head.appendChild(style);
        },

        createSeal() {
            this.sealElement = document.createElement('div');
            this.sealElement.className = 'sovereign-seal';
            this.sealElement.dataset.state = 'latent';
            this.sealElement.dataset.position = '0';
            
            // Minimal seal SVG - no animation
            this.sealElement.innerHTML = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <g fill="none" stroke="var(--gold-dim, #8a6e1f)">
                        <circle cx="50" cy="50" r="42" stroke-width="0.5" opacity="0.5"/>
                        <circle cx="50" cy="50" r="35" stroke-width="0.3" opacity="0.3"/>
                        <path d="M50 18 L54 26 L58 20 L56 30 L62 24 L57 34 L50 32 L43 34 L38 24 L44 30 L42 20 L46 26 Z" 
                              stroke-width="0.5" fill="var(--gold-shadow, #3d3312)" opacity="0.6"/>
                        <text x="50" y="56" 
                              fill="var(--gold-dim, #8a6e1f)" 
                              font-family="'Cormorant Garamond', serif" 
                              font-size="22" 
                              font-style="italic" 
                              text-anchor="middle"
                              opacity="0.8">λ</text>
                    </g>
                </svg>
            `;
            
            document.body.appendChild(this.sealElement);
        },

        bindScroll() {
            window.addEventListener('scroll', () => {
                const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
                this.checkAppearance(scrollPercent);
            }, { passive: true });
        },

        checkAppearance(scrollPercent) {
            for (let i = 0; i < this.triggerPoints.length; i++) {
                const trigger = this.triggerPoints[i];
                const nextTrigger = this.triggerPoints[i + 1] || 1;
                
                if (scrollPercent >= trigger && scrollPercent < nextTrigger) {
                    if (this.currentAppearance !== i) {
                        this.showAppearance(i);
                    }
                    
                    // State within zone
                    const progress = (scrollPercent - trigger) / (nextTrigger - trigger);
                    this.updateState(progress);
                    return;
                }
            }
            
            // Before first trigger
            if (scrollPercent < this.triggerPoints[0]) {
                this.sealElement.dataset.state = 'latent';
                this.sealElement.style.opacity = '0';
            }
        },

        showAppearance(index) {
            this.currentAppearance = index;
            Authority.sealAppearances = index + 1;
            this.sealElement.dataset.position = index;
            this.sealElement.dataset.state = 'latent';
        },

        updateState(progress) {
            let state = this.states.LATENT;
            if (progress > 0.2) state = this.states.PRESENT;
            if (progress > 0.7) state = this.states.SEALED;
            this.sealElement.dataset.state = state;
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 5. SPINE (Retained, Simplified)
    // ════════════════════════════════════════════════════════════════════════════
    //
    // Chain-of-custody. No labels, no animations. Just structure.

    const Spine = {
        element: null,

        init() {
            if (window.innerWidth < 1024) return; // Desktop only
            
            this.injectStyles();
            this.createSpine();
            this.bindScroll();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'spine-v4-styles';
            style.textContent = `
                .authority-spine {
                    position: fixed;
                    right: clamp(20px, 3vw, 40px);
                    top: 50%;
                    transform: translateY(-50%);
                    height: 50vh;
                    width: 1px;
                    background: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    z-index: 100;
                }
                
                .authority-spine.visible {
                    opacity: 0.3;
                }
                
                .spine-indicator {
                    position: absolute;
                    left: 50%;
                    top: 0;
                    transform: translateX(-50%);
                    width: 5px;
                    height: 5px;
                    background: var(--gold-dim, #8a6e1f);
                    transition: top 0.2s ease;
                }
                
                .spine-node {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 3px;
                    height: 3px;
                    border: 1px solid var(--gold-shadow, #3d3312);
                    background: transparent;
                    transition: background 0.3s ease;
                }
                
                .spine-node.passed {
                    background: var(--gold-shadow, #3d3312);
                }
            `;
            document.head.appendChild(style);
        },

        createSpine() {
            const exhibitCount = document.querySelectorAll('[data-exhibit]').length;
            
            this.element = document.createElement('div');
            this.element.className = 'authority-spine';
            
            // Create nodes for each exhibit
            for (let i = 0; i < exhibitCount; i++) {
                const node = document.createElement('div');
                node.className = 'spine-node';
                node.style.top = `${(i / (exhibitCount - 1)) * 100}%`;
                this.element.appendChild(node);
            }
            
            // Indicator
            const indicator = document.createElement('div');
            indicator.className = 'spine-indicator';
            this.element.appendChild(indicator);
            this.indicator = indicator;
            
            document.body.appendChild(this.element);
            
            // Show after scroll
            setTimeout(() => {
                this.element.classList.add('visible');
            }, 1000);
        },

        bindScroll() {
            window.addEventListener('scroll', () => {
                const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
                
                if (this.indicator) {
                    this.indicator.style.top = `${scrollPercent * 100}%`;
                }
                
                // Update nodes
                const nodes = this.element.querySelectorAll('.spine-node');
                nodes.forEach((node, i) => {
                    const nodePosition = i / (nodes.length - 1);
                    node.classList.toggle('passed', scrollPercent >= nodePosition - 0.05);
                });
            }, { passive: true });
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 6. CONSTRAINT REVEAL (Retained)
    // ════════════════════════════════════════════════════════════════════════════
    //
    // 60% second peak. Appears as lab spec, not marketing.

    const ConstraintReveal = {
        element: null,
        overlay: null,
        revealed: false,
        triggerPoint: 0.58,

        init() {
            this.injectStyles();
            this.createElement();
            this.bindScroll();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'constraint-reveal-v4-styles';
            style.textContent = `
                .constraint-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 9998;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.4s ease;
                }
                
                .constraint-overlay.visible {
                    opacity: 1;
                }
                
                .constraint-spec {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    padding: 40px 50px;
                    border: 1px solid var(--gold-shadow, #3d3312);
                    background: var(--bg-primary, #050508);
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.5s ease 0.1s;
                }
                
                .constraint-spec.visible {
                    opacity: 1;
                }
                
                .constraint-header {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 7px;
                    letter-spacing: 0.2em;
                    color: var(--gold-shadow, #3d3312);
                    margin-bottom: 30px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--gold-shadow, #3d3312);
                }
                
                .constraint-row {
                    display: flex;
                    align-items: baseline;
                    gap: 20px;
                    margin: 12px 0;
                }
                
                .constraint-key {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    letter-spacing: 0.1em;
                    color: var(--gold-shadow, #3d3312);
                    min-width: 50px;
                }
                
                .constraint-value {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 18px;
                    letter-spacing: 0.05em;
                    color: var(--gold-core, #d4af37);
                }
            `;
            document.head.appendChild(style);
        },

        createElement() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'constraint-overlay';
            document.body.appendChild(this.overlay);

            this.element = document.createElement('div');
            this.element.className = 'constraint-spec';
            this.element.innerHTML = `
                <div class="constraint-header">SPECIFICATION CONSTRAINT</div>
                <div class="constraint-row">
                    <span class="constraint-key">INIT</span>
                    <span class="constraint-value">RANDOM</span>
                </div>
                <div class="constraint-row">
                    <span class="constraint-key">DEPS</span>
                    <span class="constraint-value">ZERO</span>
                </div>
                <div class="constraint-row">
                    <span class="constraint-key">REPRO</span>
                    <span class="constraint-value">E2E</span>
                </div>
            `;
            document.body.appendChild(this.element);
        },

        bindScroll() {
            window.addEventListener('scroll', () => {
                const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
                
                if (scrollPercent >= this.triggerPoint && scrollPercent < this.triggerPoint + 0.06) {
                    if (!this.revealed) this.show();
                } else {
                    if (this.revealed) this.hide();
                }
            }, { passive: true });
        },

        show() {
            this.revealed = true;
            this.overlay.classList.add('visible');
            this.element.classList.add('visible');
        },

        hide() {
            this.revealed = false;
            this.overlay.classList.remove('visible');
            this.element.classList.remove('visible');
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 7. MINIMAL FORMAL RESIDUE
    // ════════════════════════════════════════════════════════════════════════════
    //
    // Not atmosphere. Just residue. Static. Few. Authority markers.

    const FormalResidue = {
        init() {
            this.injectStyles();
            this.addCalibrationMarks();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'formal-residue-styles';
            style.textContent = `
                .calibration-mark {
                    position: fixed;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 7px;
                    letter-spacing: 0.1em;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0.15;
                    pointer-events: none;
                    z-index: 50;
                }
                
                .calibration-mark.tl { top: 20px; left: 20px; }
                .calibration-mark.tr { top: 20px; right: 20px; }
                .calibration-mark.bl { bottom: 20px; left: 20px; }
                .calibration-mark.br { bottom: 20px; right: 20px; }
                
                @media (max-width: 768px) {
                    .calibration-mark { display: none; }
                }
            `;
            document.head.appendChild(style);
        },

        addCalibrationMarks() {
            const marks = [
                { pos: 'tl', text: '⊢' },
                { pos: 'tr', text: '→' },
                { pos: 'bl', text: 'λ' },
                { pos: 'br', text: '∎' }
            ];

            marks.forEach(m => {
                const mark = document.createElement('div');
                mark.className = `calibration-mark ${m.pos}`;
                mark.textContent = m.text;
                document.body.appendChild(mark);
            });
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ════════════════════════════════════════════════════════════════════════════

    function initAuthoritySystem() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        function init() {
            // Silent initialization - no console decoration
            BriefingPaceController.init();
            ExhibitSystem.init();
            NDAGate.init();
            SovereignSeal.init();
            Spine.init();
            ConstraintReveal.init();
            FormalResidue.init();
        }
    }

    initAuthoritySystem();

    // Export
    window.NorthStarV4 = {
        Authority,
        BriefingPaceController,
        ExhibitSystem,
        NDAGate,
        SovereignSeal,
        Spine,
        ConstraintReveal
    };

})();
