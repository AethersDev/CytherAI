/**
 * ════════════════════════════════════════════════════════════════════════════════
 * CYTHERAI NORTH-STAR ENHANCEMENT SYSTEM
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * A complete paradigm shift from "features" to "device."
 * 
 * MATERIAL METAPHOR: OPTICAL INSTRUMENT
 * The entire page is a precision optical device. Users don't read—they focus,
 * expose, and develop. Everything manifests through this lens.
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 1. BRIEFING SPINE         Vertical chain-of-custody timeline               │
 * │ 2. OPTICAL LAYER          Lens, focus, aperture, exposure metaphor         │
 * │ 3. SOVEREIGN SEAL         3-state signature object (latent/developing/sealed)│
 * │ 4. CONSTRAINT REVEAL      60% scroll impossibility stamp                   │
 * │ 5. PROGRESSIVE DISCLOSURE Pause-triggered depth surfacing                  │
 * │ 6. CUT LANGUAGE           Cinematic vocabulary for chapter transitions     │
 * │ 7. THEOREM ATMOSPHERE     Formal logic as texture, not demonstration       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * @author CytherAI North-Star System
 * @version 1.0.0
 * ════════════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ════════════════════════════════════════════════════════════════════════════
    // SHARED STATE & CONSTANTS
    // ════════════════════════════════════════════════════════════════════════════
    
    const NorthStar = {
        scrollPosition: 0,
        scrollVelocity: 0,
        lastScrollTime: 0,
        isPaused: false,
        pauseTimer: null,
        pauseThreshold: 800, // ms to wait before triggering pause state
        chapters: [],
        currentChapter: 0,
        sealAppearances: 0,
        maxSealAppearances: 3,
        constraintRevealed: false
    };

    // Optical instrument vocabulary
    const Optical = {
        states: {
            UNFOCUSED: 'unfocused',
            FOCUSING: 'focusing',
            FOCUSED: 'focused',
            EXPOSING: 'exposing',
            DEVELOPED: 'developed'
        },
        current: 'unfocused'
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 1. BRIEFING SPINE
    // ════════════════════════════════════════════════════════════════════════════
    // A persistent vertical "chain-of-custody" that chapters lock onto.
    // Not navigation—a timeline of procedure the user travels through.

    const BriefingSpine = {
        element: null,
        nodes: [],
        currentNode: 0,

        // Chapter definitions: one artifact + one sentence each
        chapters: [
            {
                id: 'origin',
                artifact: 'λ',
                sentence: 'Formal reasoning, compressed.',
                glyph: '§0'
            },
            {
                id: 'architecture',
                artifact: '⊢',
                sentence: 'Zero dependencies. Pure inference.',
                glyph: '§1'
            },
            {
                id: 'capability',
                artifact: '→',
                sentence: '97.7% loss reduction. 6 hours.',
                glyph: '§2'
            },
            {
                id: 'sovereignty',
                artifact: '∎',
                sentence: 'Reproducible end-to-end.',
                glyph: '§3'
            }
        ],

        init() {
            this.createSpine();
            this.bindScrollEvents();
            NorthStar.chapters = this.chapters;
        },

        createSpine() {
            // Create the persistent spine element
            this.element = document.createElement('div');
            this.element.id = 'briefing-spine';
            this.element.setAttribute('aria-hidden', 'true');
            
            // Position on right side, persistent
            this.element.style.cssText = `
                position: fixed;
                right: clamp(20px, 4vw, 60px);
                top: 50%;
                transform: translateY(-50%);
                height: 60vh;
                width: 2px;
                z-index: 100;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.8s ease;
            `;

            // Create spine track (the vertical line)
            const track = document.createElement('div');
            track.className = 'spine-track';
            track.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    to bottom,
                    transparent 0%,
                    var(--gold-shadow, #3d3312) 10%,
                    var(--gold-dim, #8a6e1f) 50%,
                    var(--gold-shadow, #3d3312) 90%,
                    transparent 100%
                );
                opacity: 0.4;
            `;
            this.element.appendChild(track);

            // Create chapter nodes on the spine
            this.chapters.forEach((chapter, index) => {
                const node = this.createNode(chapter, index);
                this.nodes.push(node);
                this.element.appendChild(node);
            });

            // Create the traveling indicator (current position)
            const indicator = document.createElement('div');
            indicator.className = 'spine-indicator';
            indicator.style.cssText = `
                position: absolute;
                left: 50%;
                top: 0;
                transform: translateX(-50%);
                width: 8px;
                height: 8px;
                background: var(--gold-core, #d4af37);
                border-radius: 50%;
                box-shadow: 0 0 20px var(--gold-core, #d4af37);
                transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            `;
            this.element.appendChild(indicator);
            this.indicator = indicator;

            document.body.appendChild(this.element);

            // Fade in after initial load
            setTimeout(() => {
                this.element.style.opacity = '1';
            }, 1500);
        },

        createNode(chapter, index) {
            const node = document.createElement('div');
            node.className = 'spine-node';
            node.dataset.chapter = chapter.id;
            
            const yPos = (index / (this.chapters.length - 1)) * 100;
            
            node.style.cssText = `
                position: absolute;
                left: 50%;
                top: ${yPos}%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 12px;
                opacity: 0.3;
                transition: opacity 0.4s ease;
            `;

            // The artifact (single glyph)
            const artifact = document.createElement('span');
            artifact.className = 'spine-artifact';
            artifact.textContent = chapter.artifact;
            artifact.style.cssText = `
                font-family: 'Cormorant Garamond', serif;
                font-size: 18px;
                font-style: italic;
                color: var(--gold-core, #d4af37);
                text-shadow: 0 0 10px var(--gold-dim, #8a6e1f);
            `;

            // The sentence (appears on hover/focus)
            const sentence = document.createElement('span');
            sentence.className = 'spine-sentence';
            sentence.textContent = chapter.sentence;
            sentence.style.cssText = `
                position: absolute;
                right: 20px;
                white-space: nowrap;
                font-family: 'JetBrains Mono', monospace;
                font-size: 9px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--text-secondary, #9c9b96);
                opacity: 0;
                transform: translateX(10px);
                transition: all 0.3s ease;
            `;

            // Section glyph
            const glyph = document.createElement('span');
            glyph.className = 'spine-glyph';
            glyph.textContent = chapter.glyph;
            glyph.style.cssText = `
                position: absolute;
                left: 20px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 8px;
                color: var(--gold-shadow, #3d3312);
                opacity: 0.5;
            `;

            node.appendChild(glyph);
            node.appendChild(artifact);
            node.appendChild(sentence);

            return node;
        },

        bindScrollEvents() {
            let ticking = false;

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.updatePosition();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        },

        updatePosition() {
            const scrollY = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.min(scrollY / docHeight, 1);

            // Update indicator position
            this.indicator.style.top = `${scrollPercent * 100}%`;

            // Determine current chapter based on scroll
            const chapterIndex = Math.min(
                Math.floor(scrollPercent * this.chapters.length),
                this.chapters.length - 1
            );

            if (chapterIndex !== this.currentNode) {
                this.activateNode(chapterIndex);
            }

            NorthStar.scrollPosition = scrollPercent;
            NorthStar.currentChapter = chapterIndex;
        },

        activateNode(index) {
            // Deactivate previous
            this.nodes.forEach((node, i) => {
                const sentence = node.querySelector('.spine-sentence');
                if (i === index) {
                    node.style.opacity = '1';
                    sentence.style.opacity = '1';
                    sentence.style.transform = 'translateX(0)';
                } else {
                    node.style.opacity = '0.3';
                    sentence.style.opacity = '0';
                    sentence.style.transform = 'translateX(10px)';
                }
            });

            this.currentNode = index;

            // Emit event
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('spine:chapter', this.chapters[index]);
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 2. OPTICAL LAYER (Material Truth Metaphor)
    // ════════════════════════════════════════════════════════════════════════════
    // Everything is viewed through a precision optical device.
    // Focus, exposure, aperture, development.

    const OpticalLayer = {
        focusRing: null,
        apertureOverlay: null,
        exposureMeter: null,

        init() {
            this.injectStyles();
            this.createFocusRing();
            this.createApertureOverlay();
            this.createExposureMeter();
            this.bindEvents();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'optical-layer-styles';
            style.textContent = `
                /* Optical Focus Ring - appears around focused elements */
                .optical-focus-ring {
                    position: fixed;
                    pointer-events: none;
                    border: 1px solid var(--gold-dim, #8a6e1f);
                    border-radius: 50%;
                    opacity: 0;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 9998;
                }
                
                .optical-focus-ring::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border: 1px solid var(--gold-shadow, #3d3312);
                    border-radius: 50%;
                }
                
                .optical-focus-ring::after {
                    content: '';
                    position: absolute;
                    inset: 2px;
                    border: 1px dashed var(--gold-dim, #8a6e1f);
                    border-radius: 50%;
                    opacity: 0.5;
                }

                /* Aperture overlay for chapter transitions */
                .aperture-overlay {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 9997;
                    opacity: 0;
                }
                
                .aperture-overlay svg {
                    width: 100%;
                    height: 100%;
                }

                /* Exposure meter - shows "development" state */
                .exposure-meter {
                    position: fixed;
                    left: clamp(20px, 4vw, 60px);
                    bottom: clamp(20px, 4vh, 60px);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 8px;
                    letter-spacing: 0.15em;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 0.6s ease;
                    z-index: 100;
                }
                
                .exposure-meter.visible {
                    opacity: 1;
                }
                
                .exposure-meter .meter-label {
                    text-transform: uppercase;
                    color: var(--text-secondary, #9c9b96);
                }
                
                .exposure-meter .meter-bar {
                    width: 60px;
                    height: 2px;
                    background: var(--gold-shadow, #3d3312);
                    position: relative;
                    overflow: hidden;
                }
                
                .exposure-meter .meter-fill {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    background: var(--gold-core, #d4af37);
                    transition: width 0.3s ease;
                }
                
                .exposure-meter .meter-value {
                    font-variant-numeric: tabular-nums;
                }

                /* Optical vignette */
                body::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    background: radial-gradient(
                        ellipse at center,
                        transparent 0%,
                        transparent 60%,
                        rgba(0,0,0,0.3) 100%
                    );
                    z-index: 9996;
                    opacity: var(--optical-vignette, 0.5);
                    transition: opacity 0.5s ease;
                }

                /* Focus state on body */
                body[data-optical-state="focused"] {
                    --optical-vignette: 0.2;
                }
                
                body[data-optical-state="exposing"] {
                    --optical-vignette: 0.1;
                }
                
                body[data-optical-state="developed"] {
                    --optical-vignette: 0;
                }

                /* Calibration marks (corners) */
                .calibration-mark {
                    position: fixed;
                    width: 20px;
                    height: 20px;
                    pointer-events: none;
                    z-index: 99;
                    opacity: 0.3;
                }
                
                .calibration-mark::before,
                .calibration-mark::after {
                    content: '';
                    position: absolute;
                    background: var(--gold-shadow, #3d3312);
                }
                
                .calibration-mark.top-left { top: 20px; left: 20px; }
                .calibration-mark.top-right { top: 20px; right: 20px; }
                .calibration-mark.bottom-left { bottom: 20px; left: 20px; }
                .calibration-mark.bottom-right { bottom: 20px; right: 20px; }
                
                .calibration-mark.top-left::before,
                .calibration-mark.bottom-left::before {
                    left: 0; width: 100%; height: 1px; top: 0;
                }
                .calibration-mark.top-left::after,
                .calibration-mark.top-right::after {
                    top: 0; height: 100%; width: 1px; left: 0;
                }
                .calibration-mark.top-right::before,
                .calibration-mark.bottom-right::before {
                    right: 0; width: 100%; height: 1px; top: 0;
                }
                .calibration-mark.bottom-left::after,
                .calibration-mark.bottom-right::after {
                    bottom: 0; height: 100%; width: 1px; right: 0;
                }
            `;
            document.head.appendChild(style);
        },

        createFocusRing() {
            this.focusRing = document.createElement('div');
            this.focusRing.className = 'optical-focus-ring';
            this.focusRing.style.width = '100px';
            this.focusRing.style.height = '100px';
            document.body.appendChild(this.focusRing);
        },

        createApertureOverlay() {
            this.apertureOverlay = document.createElement('div');
            this.apertureOverlay.className = 'aperture-overlay';
            
            // Create iris aperture SVG
            this.apertureOverlay.innerHTML = `
                <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <mask id="aperture-mask">
                            <rect width="100" height="100" fill="white"/>
                            <circle cx="50" cy="50" r="45" fill="black" class="aperture-circle"/>
                        </mask>
                    </defs>
                    <rect width="100" height="100" fill="black" mask="url(#aperture-mask)"/>
                </svg>
            `;
            
            document.body.appendChild(this.apertureOverlay);
        },

        createExposureMeter() {
            this.exposureMeter = document.createElement('div');
            this.exposureMeter.className = 'exposure-meter';
            this.exposureMeter.innerHTML = `
                <span class="meter-label">EXPOSURE</span>
                <div class="meter-bar">
                    <div class="meter-fill" style="width: 0%"></div>
                </div>
                <span class="meter-value">0.00</span>
            `;
            document.body.appendChild(this.exposureMeter);

            // Create calibration marks
            ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
                const mark = document.createElement('div');
                mark.className = `calibration-mark ${pos}`;
                document.body.appendChild(mark);
            });
        },

        bindEvents() {
            // Show exposure meter after first scroll
            let hasScrolled = false;
            window.addEventListener('scroll', () => {
                if (!hasScrolled && window.scrollY > 100) {
                    hasScrolled = true;
                    this.exposureMeter.classList.add('visible');
                }
                this.updateExposure();
            }, { passive: true });
        },

        updateExposure() {
            const scrollPercent = NorthStar.scrollPosition;
            const fill = this.exposureMeter.querySelector('.meter-fill');
            const value = this.exposureMeter.querySelector('.meter-value');
            
            fill.style.width = `${scrollPercent * 100}%`;
            value.textContent = scrollPercent.toFixed(2);

            // Update optical state
            let state = 'unfocused';
            if (scrollPercent > 0.1) state = 'focusing';
            if (scrollPercent > 0.3) state = 'focused';
            if (scrollPercent > 0.6) state = 'exposing';
            if (scrollPercent > 0.9) state = 'developed';

            document.body.setAttribute('data-optical-state', state);
            Optical.current = state;
        },

        // Iris transition for chapter changes
        irisTransition(callback, duration = 800) {
            const circle = this.apertureOverlay.querySelector('.aperture-circle');
            this.apertureOverlay.style.opacity = '1';
            
            // Close iris
            circle.style.transition = `r ${duration/2}ms cubic-bezier(0.4, 0, 1, 1)`;
            circle.setAttribute('r', '0');
            
            setTimeout(() => {
                if (callback) callback();
                
                // Open iris
                circle.style.transition = `r ${duration/2}ms cubic-bezier(0, 0, 0.2, 1)`;
                circle.setAttribute('r', '60');
                
                setTimeout(() => {
                    this.apertureOverlay.style.opacity = '0';
                    circle.setAttribute('r', '45');
                }, duration/2);
            }, duration/2);
        },

        // Focus on element
        focusOn(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) + 40;
            
            this.focusRing.style.width = `${size}px`;
            this.focusRing.style.height = `${size}px`;
            this.focusRing.style.left = `${rect.left + rect.width/2 - size/2}px`;
            this.focusRing.style.top = `${rect.top + rect.height/2 - size/2}px`;
            this.focusRing.style.opacity = '1';
        },

        unfocus() {
            this.focusRing.style.opacity = '0';
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 3. SOVEREIGN SEAL (Signature Object)
    // ════════════════════════════════════════════════════════════════════════════
    // Appears exactly 3 times. States: latent, developing, sealed.
    // Scarcity makes it expensive.

    const SovereignSeal = {
        appearances: [],
        triggerPoints: [0.15, 0.60, 0.95], // Scroll positions for each appearance
        currentAppearance: 0,
        sealElement: null,

        states: {
            LATENT: 'latent',
            DEVELOPING: 'developing',
            SEALED: 'sealed'
        },

        init() {
            this.createSeal();
            this.injectStyles();
            this.bindEvents();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'sovereign-seal-styles';
            style.textContent = `
                .sovereign-seal {
                    position: fixed;
                    width: 80px;
                    height: 80px;
                    pointer-events: none;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 1.2s ease, transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .sovereign-seal[data-state="latent"] {
                    opacity: 0.08;
                    filter: blur(2px) grayscale(0.5);
                    transform: scale(0.9);
                }
                
                .sovereign-seal[data-state="developing"] {
                    opacity: 0.5;
                    filter: blur(0.5px) grayscale(0);
                    transform: scale(1);
                    animation: sealDevelop 2s ease-out;
                }
                
                .sovereign-seal[data-state="sealed"] {
                    opacity: 1;
                    filter: none;
                    transform: scale(1);
                }
                
                @keyframes sealDevelop {
                    0% {
                        opacity: 0.1;
                        filter: blur(4px) grayscale(1);
                    }
                    50% {
                        opacity: 0.4;
                        filter: blur(1px) grayscale(0.5);
                    }
                    100% {
                        opacity: 0.5;
                        filter: blur(0.5px) grayscale(0);
                    }
                }
                
                .sovereign-seal svg {
                    width: 100%;
                    height: 100%;
                }
                
                .sovereign-seal .seal-inner {
                    transform-origin: center;
                    animation: sealPulse 4s ease-in-out infinite;
                }
                
                @keyframes sealPulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                
                /* Seal positions for each appearance */
                .sovereign-seal[data-appearance="0"] {
                    top: 15%;
                    left: 8%;
                }
                
                .sovereign-seal[data-appearance="1"] {
                    top: 55%;
                    right: 8%;
                    left: auto;
                }
                
                .sovereign-seal[data-appearance="2"] {
                    bottom: 10%;
                    left: 50%;
                    top: auto;
                    transform: translateX(-50%);
                }
                
                /* Counter showing seal rarity */
                .seal-counter {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    letter-spacing: 0.15em;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    z-index: 100;
                }
                
                .seal-counter.visible {
                    opacity: 0.6;
                }
            `;
            document.head.appendChild(style);
        },

        createSeal() {
            this.sealElement = document.createElement('div');
            this.sealElement.className = 'sovereign-seal';
            this.sealElement.dataset.state = this.states.LATENT;
            this.sealElement.dataset.appearance = '0';
            
            // The Lambda Crown seal SVG
            this.sealElement.innerHTML = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="sealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--gold-dim, #8a6e1f)"/>
                            <stop offset="50%" stop-color="var(--gold-core, #d4af37)"/>
                            <stop offset="100%" stop-color="var(--gold-dim, #8a6e1f)"/>
                        </linearGradient>
                        <filter id="sealGlow">
                            <feGaussianBlur stdDeviation="1.5" result="blur"/>
                            <feMerge>
                                <feMergeNode in="blur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    <g class="seal-inner" filter="url(#sealGlow)" fill="none" stroke="url(#sealGradient)">
                        <!-- Outer ring -->
                        <circle cx="50" cy="50" r="45" stroke-width="0.5" opacity="0.6"/>
                        <circle cx="50" cy="50" r="42" stroke-width="0.3" opacity="0.4"/>
                        
                        <!-- Crown points -->
                        <path d="M50 15 L55 25 L60 18 L58 30 L65 22 L60 35 L50 32 L40 35 L35 22 L42 30 L40 18 L45 25 Z" 
                              stroke-width="1" fill="var(--gold-shadow, #3d3312)" opacity="0.8"/>
                        
                        <!-- Lambda -->
                        <text x="50" y="58" 
                              fill="url(#sealGradient)" 
                              font-family="'Cormorant Garamond', serif" 
                              font-size="28" 
                              font-style="italic" 
                              text-anchor="middle">λ</text>
                        
                        <!-- Inner circle -->
                        <circle cx="50" cy="50" r="30" stroke-width="0.5" opacity="0.5"/>
                        
                        <!-- Radial marks -->
                        ${Array.from({length: 12}, (_, i) => {
                            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
                            const x1 = 50 + Math.cos(angle) * 38;
                            const y1 = 50 + Math.sin(angle) * 38;
                            const x2 = 50 + Math.cos(angle) * 42;
                            const y2 = 50 + Math.sin(angle) * 42;
                            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="0.5" opacity="0.4"/>`;
                        }).join('')}
                        
                        <!-- Authority text arc -->
                        <path id="sealArcTop" d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="none"/>
                        <text font-family="'JetBrains Mono', monospace" font-size="4" fill="var(--gold-shadow, #3d3312)" letter-spacing="0.2em">
                            <textPath href="#sealArcTop" startOffset="50%" text-anchor="middle">
                                CYTHERAI • SOVEREIGN • PROVER
                            </textPath>
                        </text>
                    </g>
                </svg>
            `;
            
            document.body.appendChild(this.sealElement);

            // Create counter
            this.counter = document.createElement('div');
            this.counter.className = 'seal-counter';
            this.counter.textContent = 'SEAL 0/3';
            document.body.appendChild(this.counter);
        },

        bindEvents() {
            window.addEventListener('scroll', () => {
                this.checkAppearance();
            }, { passive: true });
        },

        checkAppearance() {
            const scrollPercent = NorthStar.scrollPosition;
            
            for (let i = 0; i < this.triggerPoints.length; i++) {
                const trigger = this.triggerPoints[i];
                const nextTrigger = this.triggerPoints[i + 1] || 1;
                
                if (scrollPercent >= trigger && scrollPercent < nextTrigger) {
                    if (this.currentAppearance !== i) {
                        this.showAppearance(i);
                    }
                    
                    // Update state within this appearance zone
                    const zoneProgress = (scrollPercent - trigger) / (nextTrigger - trigger);
                    this.updateState(zoneProgress);
                    break;
                }
            }

            // Hide if before first trigger
            if (scrollPercent < this.triggerPoints[0]) {
                this.sealElement.style.opacity = '0';
                this.counter.classList.remove('visible');
            }
        },

        showAppearance(index) {
            this.currentAppearance = index;
            NorthStar.sealAppearances = index + 1;
            
            this.sealElement.dataset.appearance = index;
            this.sealElement.dataset.state = this.states.LATENT;
            this.sealElement.style.opacity = '';
            
            // Update counter
            this.counter.textContent = `SEAL ${index + 1}/3`;
            this.counter.classList.add('visible');

            // Emit event
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('seal:appear', { index, total: 3 });
            }
        },

        updateState(progress) {
            let state = this.states.LATENT;
            if (progress > 0.3) state = this.states.DEVELOPING;
            if (progress > 0.7) state = this.states.SEALED;
            
            if (this.sealElement.dataset.state !== state) {
                this.sealElement.dataset.state = state;
                
                if (state === this.states.SEALED && typeof ProofBus !== 'undefined') {
                    ProofBus.emit('seal:complete', { 
                        appearance: this.currentAppearance + 1 
                    });
                }
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 4. CONSTRAINT REVEAL
    // ════════════════════════════════════════════════════════════════════════════
    // At 60% scroll, reveal an "impossible constraint" as a lab spec stamp.

    const ConstraintReveal = {
        element: null,
        revealed: false,
        triggerPoint: 0.60,

        constraints: [
            { spec: 'INIT', value: 'RANDOM', note: 'No pretrained weights' },
            { spec: 'DEPS', value: 'ZERO', note: 'Pure inference chain' },
            { spec: 'REPRO', value: 'E2E', note: 'Deterministic output' }
        ],

        init() {
            this.createElement();
            this.injectStyles();
            this.bindEvents();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'constraint-reveal-styles';
            style.textContent = `
                .constraint-stamp {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.8);
                    padding: 40px 60px;
                    border: 1px solid var(--gold-dim, #8a6e1f);
                    background: rgba(0, 0, 0, 0.9);
                    font-family: 'JetBrains Mono', monospace;
                    z-index: 10000;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .constraint-stamp.revealed {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                
                .constraint-stamp::before {
                    content: 'SPECIFICATION CONSTRAINT';
                    position: absolute;
                    top: -10px;
                    left: 20px;
                    padding: 2px 10px;
                    background: var(--bg-primary, #050508);
                    font-size: 8px;
                    letter-spacing: 0.2em;
                    color: var(--gold-shadow, #3d3312);
                }
                
                .constraint-stamp::after {
                    content: 'VERIFIED';
                    position: absolute;
                    bottom: -10px;
                    right: 20px;
                    padding: 2px 10px;
                    background: var(--gold-shadow, #3d3312);
                    font-size: 8px;
                    letter-spacing: 0.15em;
                    color: var(--bg-primary, #050508);
                }
                
                .constraint-row {
                    display: flex;
                    align-items: baseline;
                    gap: 20px;
                    margin: 15px 0;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.4s ease;
                }
                
                .constraint-stamp.revealed .constraint-row {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .constraint-stamp.revealed .constraint-row:nth-child(1) { transition-delay: 0.2s; }
                .constraint-stamp.revealed .constraint-row:nth-child(2) { transition-delay: 0.4s; }
                .constraint-stamp.revealed .constraint-row:nth-child(3) { transition-delay: 0.6s; }
                
                .constraint-spec {
                    font-size: 10px;
                    letter-spacing: 0.15em;
                    color: var(--text-secondary, #9c9b96);
                    min-width: 60px;
                }
                
                .constraint-value {
                    font-size: 24px;
                    font-weight: 300;
                    letter-spacing: 0.1em;
                    color: var(--gold-core, #d4af37);
                    text-shadow: 0 0 20px var(--gold-dim, #8a6e1f);
                }
                
                .constraint-note {
                    font-size: 9px;
                    color: var(--gold-shadow, #3d3312);
                    font-style: italic;
                }
                
                /* Overlay behind stamp */
                .constraint-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.6s ease;
                }
                
                .constraint-overlay.visible {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        },

        createElement() {
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'constraint-overlay';
            document.body.appendChild(this.overlay);

            // Create stamp
            this.element = document.createElement('div');
            this.element.className = 'constraint-stamp';
            
            this.constraints.forEach(c => {
                const row = document.createElement('div');
                row.className = 'constraint-row';
                row.innerHTML = `
                    <span class="constraint-spec">${c.spec}</span>
                    <span class="constraint-value">${c.value}</span>
                    <span class="constraint-note">// ${c.note}</span>
                `;
                this.element.appendChild(row);
            });

            document.body.appendChild(this.element);
        },

        bindEvents() {
            window.addEventListener('scroll', () => {
                this.checkReveal();
            }, { passive: true });
        },

        checkReveal() {
            const scrollPercent = NorthStar.scrollPosition;
            
            // Reveal at trigger point, hide slightly after
            if (scrollPercent >= this.triggerPoint && scrollPercent < this.triggerPoint + 0.08) {
                if (!this.revealed) {
                    this.reveal();
                }
            } else {
                if (this.revealed) {
                    this.hide();
                }
            }
        },

        reveal() {
            this.revealed = true;
            NorthStar.constraintRevealed = true;
            
            this.overlay.classList.add('visible');
            this.element.classList.add('revealed');

            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('constraint:reveal');
            }
        },

        hide() {
            this.revealed = false;
            this.overlay.classList.remove('visible');
            this.element.classList.remove('revealed');
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 5. PROGRESSIVE DISCLOSURE (Pause-triggered)
    // ════════════════════════════════════════════════════════════════════════════
    // When user pauses, deeper footnotes surface. Moving hides them.

    const ProgressiveDisclosure = {
        disclosures: new Map(),
        activeDisclosure: null,

        init() {
            this.injectStyles();
            this.findDisclosureTargets();
            this.bindEvents();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'progressive-disclosure-styles';
            style.textContent = `
                .disclosure-target {
                    position: relative;
                }
                
                .disclosure-depth {
                    position: absolute;
                    left: 0;
                    top: 100%;
                    margin-top: 8px;
                    padding: 12px 16px;
                    background: rgba(0, 0, 0, 0.8);
                    border-left: 2px solid var(--gold-shadow, #3d3312);
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 14px;
                    font-style: italic;
                    color: var(--text-secondary, #9c9b96);
                    max-width: 300px;
                    opacity: 0;
                    transform: translateY(-5px);
                    transition: all 0.5s ease;
                    pointer-events: none;
                    z-index: 50;
                }
                
                .disclosure-depth.surfaced {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .disclosure-depth::before {
                    content: '↳';
                    margin-right: 8px;
                    color: var(--gold-dim, #8a6e1f);
                }
                
                /* Reading pause indicator */
                .pause-indicator {
                    position: fixed;
                    top: 50%;
                    left: 10px;
                    width: 3px;
                    height: 0;
                    background: var(--gold-dim, #8a6e1f);
                    transition: height 0.3s ease;
                    z-index: 100;
                    opacity: 0;
                }
                
                body[data-reading="paused"] .pause-indicator {
                    opacity: 0.5;
                    height: 40px;
                }
            `;
            document.head.appendChild(style);
        },

        findDisclosureTargets() {
            // Elements that can have deeper disclosure
            const targets = document.querySelectorAll('[data-disclosure]');
            
            targets.forEach(target => {
                const depthText = target.dataset.disclosure;
                if (!depthText) return;

                target.classList.add('disclosure-target');
                
                const depth = document.createElement('div');
                depth.className = 'disclosure-depth';
                depth.textContent = depthText;
                target.appendChild(depth);
                
                this.disclosures.set(target, depth);
            });

            // Create pause indicator
            const indicator = document.createElement('div');
            indicator.className = 'pause-indicator';
            document.body.appendChild(indicator);
        },

        bindEvents() {
            let scrollTimeout;
            let lastScrollY = window.scrollY;

            window.addEventListener('scroll', () => {
                // Clear existing timeout
                clearTimeout(NorthStar.pauseTimer);
                
                // Mark as scrolling
                if (NorthStar.isPaused) {
                    NorthStar.isPaused = false;
                    document.body.setAttribute('data-reading', 'scrolling');
                    this.hideActiveDisclosure();
                }

                lastScrollY = window.scrollY;

                // Set new pause timer
                NorthStar.pauseTimer = setTimeout(() => {
                    NorthStar.isPaused = true;
                    document.body.setAttribute('data-reading', 'paused');
                    this.checkDisclosures();
                }, NorthStar.pauseThreshold);
            }, { passive: true });
        },

        checkDisclosures() {
            if (!NorthStar.isPaused) return;

            const viewportCenter = window.innerHeight / 2;
            let closestTarget = null;
            let closestDistance = Infinity;

            this.disclosures.forEach((depth, target) => {
                const rect = target.getBoundingClientRect();
                const targetCenter = rect.top + rect.height / 2;
                const distance = Math.abs(targetCenter - viewportCenter);

                if (distance < closestDistance && rect.top > 0 && rect.bottom < window.innerHeight) {
                    closestDistance = distance;
                    closestTarget = target;
                }
            });

            if (closestTarget && closestDistance < 200) {
                this.showDisclosure(closestTarget);
            }
        },

        showDisclosure(target) {
            if (this.activeDisclosure === target) return;
            
            this.hideActiveDisclosure();
            
            const depth = this.disclosures.get(target);
            if (depth) {
                depth.classList.add('surfaced');
                this.activeDisclosure = target;
            }
        },

        hideActiveDisclosure() {
            if (this.activeDisclosure) {
                const depth = this.disclosures.get(this.activeDisclosure);
                if (depth) {
                    depth.classList.remove('surfaced');
                }
                this.activeDisclosure = null;
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 6. CUT LANGUAGE (Cinematic Transitions)
    // ════════════════════════════════════════════════════════════════════════════
    // Vocabulary of cuts for chapter boundaries: hard cut, match cut, iris cut, dissolve.

    const CutLanguage = {
        cuts: {
            HARD: 'hard',
            MATCH: 'match',
            IRIS: 'iris',
            DISSOLVE: 'dissolve'
        },

        // Define which cut type to use at each chapter boundary
        chapterCuts: [
            'hard',      // Chapter 0 → 1
            'dissolve',  // Chapter 1 → 2
            'iris',      // Chapter 2 → 3
        ],

        currentChapter: 0,
        isTransitioning: false,

        init() {
            this.injectStyles();
            this.createOverlays();
            this.bindEvents();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'cut-language-styles';
            style.textContent = `
                .cut-overlay {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 9990;
                    opacity: 0;
                }
                
                /* Hard Cut */
                .cut-hard {
                    background: var(--bg-primary, #050508);
                }
                
                .cut-hard.active {
                    animation: hardCut 0.15s step-end;
                }
                
                @keyframes hardCut {
                    0%, 60% { opacity: 1; }
                    100% { opacity: 0; }
                }
                
                /* Match Cut (shared element emphasis) */
                .cut-match {
                    background: radial-gradient(circle at var(--match-x, 50%) var(--match-y, 50%), 
                        transparent 0%, 
                        var(--bg-primary, #050508) 100%);
                }
                
                .cut-match.active {
                    animation: matchCut 0.6s ease-in-out;
                }
                
                @keyframes matchCut {
                    0% { opacity: 0; }
                    40%, 60% { opacity: 1; }
                    100% { opacity: 0; }
                }
                
                /* Iris Cut */
                .cut-iris {
                    background: var(--bg-primary, #050508);
                    mask-image: radial-gradient(circle at center, transparent var(--iris-size, 100%), black var(--iris-size, 100%));
                    -webkit-mask-image: radial-gradient(circle at center, transparent var(--iris-size, 100%), black var(--iris-size, 100%));
                }
                
                .cut-iris.active {
                    animation: irisCut 0.8s ease-in-out;
                }
                
                @keyframes irisCut {
                    0% { --iris-size: 100%; opacity: 1; }
                    40% { --iris-size: 0%; opacity: 1; }
                    60% { --iris-size: 0%; opacity: 1; }
                    100% { --iris-size: 100%; opacity: 0; }
                }
                
                /* Dissolve */
                .cut-dissolve {
                    background: var(--bg-primary, #050508);
                    mix-blend-mode: normal;
                }
                
                .cut-dissolve.active {
                    animation: dissolveCut 1s ease-in-out;
                }
                
                @keyframes dissolveCut {
                    0% { opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { opacity: 0; }
                }
                
                /* Cut label (shows cut type briefly) */
                .cut-label {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    z-index: 9991;
                }
                
                .cut-label.visible {
                    opacity: 0.5;
                }
            `;
            document.head.appendChild(style);
        },

        createOverlays() {
            Object.values(this.cuts).forEach(type => {
                const overlay = document.createElement('div');
                overlay.className = `cut-overlay cut-${type}`;
                overlay.id = `cut-${type}`;
                document.body.appendChild(overlay);
            });

            // Cut label
            this.label = document.createElement('div');
            this.label.className = 'cut-label';
            document.body.appendChild(this.label);
        },

        bindEvents() {
            // Listen for chapter changes from BriefingSpine
            if (typeof ProofBus !== 'undefined') {
                ProofBus.on('spine:chapter', (chapter) => {
                    const newIndex = NorthStar.chapters.findIndex(c => c.id === chapter.id);
                    if (newIndex !== this.currentChapter && newIndex > this.currentChapter) {
                        this.executeCut(this.currentChapter, newIndex);
                        this.currentChapter = newIndex;
                    }
                });
            }
        },

        executeCut(fromChapter, toChapter) {
            if (this.isTransitioning) return;
            
            const cutType = this.chapterCuts[fromChapter] || 'dissolve';
            const overlay = document.getElementById(`cut-${cutType}`);
            
            if (!overlay) return;

            this.isTransitioning = true;

            // Show label
            this.label.textContent = cutType.toUpperCase() + ' CUT';
            this.label.classList.add('visible');

            // Execute cut
            overlay.classList.add('active');

            // Get duration from animation
            const durations = {
                hard: 150,
                match: 600,
                iris: 800,
                dissolve: 1000
            };

            setTimeout(() => {
                overlay.classList.remove('active');
                this.label.classList.remove('visible');
                this.isTransitioning = false;
            }, durations[cutType] || 500);

            // Emit event
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('cut:execute', { type: cutType, from: fromChapter, to: toChapter });
            }
        },

        // Manual trigger for custom moments
        triggerCut(type) {
            const overlay = document.getElementById(`cut-${type}`);
            if (overlay) {
                overlay.classList.add('active');
                setTimeout(() => overlay.classList.remove('active'), 800);
            }
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // 7. THEOREM ATMOSPHERE
    // ════════════════════════════════════════════════════════════════════════════
    // Formal logic as texture: inference glyph dust, redacted rule headings,
    // consistency checks as calibration marks.

    const TheoremAtmosphere = {
        glyphs: ['λ', '⊢', '→', '∧', '∨', '¬', '∀', '∃', '⊥', '⊤', '≡', '⊃'],
        rules: ['MP', '→I', '∧E', '∨I', '¬E', '∀E', '∃I', 'RAA', 'DN'],
        
        glyphContainer: null,
        marginalia: [],

        init() {
            this.injectStyles();
            this.createGlyphDust();
            this.createMarginalia();
            this.createCalibrationChecks();
            this.startAmbientMotion();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'theorem-atmosphere-styles';
            style.textContent = `
                /* Glyph dust layer */
                .glyph-dust-container {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 1;
                    opacity: 0.15;
                }
                
                .glyph-particle {
                    position: absolute;
                    font-family: 'Cormorant Garamond', serif;
                    font-style: italic;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0;
                    transition: opacity 2s ease;
                    animation: glyphFloat 20s linear infinite;
                }
                
                @keyframes glyphFloat {
                    0% {
                        transform: translateY(100vh) rotate(0deg);
                    }
                    100% {
                        transform: translateY(-20vh) rotate(360deg);
                    }
                }
                
                /* Redacted rule marginalia */
                .rule-marginalia {
                    position: fixed;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 8px;
                    letter-spacing: 0.15em;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0.2;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    pointer-events: none;
                    z-index: 2;
                }
                
                .rule-marginalia.left {
                    left: 10px;
                }
                
                .rule-marginalia.right {
                    right: 10px;
                }
                
                .rule-marginalia .redacted {
                    text-decoration: line-through;
                    opacity: 0.5;
                }
                
                /* Consistency calibration marks */
                .calibration-check {
                    position: fixed;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 7px;
                    color: var(--gold-shadow, #3d3312);
                    opacity: 0.25;
                    pointer-events: none;
                    z-index: 2;
                }
                
                .calibration-check::before {
                    content: '✓';
                    margin-right: 4px;
                    color: var(--gold-dim, #8a6e1f);
                }
                
                .calibration-check.top { top: 60px; }
                .calibration-check.bottom { bottom: 60px; }
                .calibration-check.left { left: 40px; }
                .calibration-check.right { right: 40px; text-align: right; }
                
                /* Inference trace lines */
                .inference-trace {
                    position: fixed;
                    width: 1px;
                    background: linear-gradient(
                        to bottom,
                        transparent,
                        var(--gold-shadow, #3d3312) 20%,
                        var(--gold-shadow, #3d3312) 80%,
                        transparent
                    );
                    opacity: 0.1;
                    pointer-events: none;
                    z-index: 1;
                }
            `;
            document.head.appendChild(style);
        },

        createGlyphDust() {
            this.glyphContainer = document.createElement('div');
            this.glyphContainer.className = 'glyph-dust-container';
            
            // Create floating glyph particles
            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('span');
                particle.className = 'glyph-particle';
                particle.textContent = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
                
                const size = 12 + Math.random() * 16;
                const left = Math.random() * 100;
                const delay = Math.random() * 20;
                const duration = 15 + Math.random() * 15;
                
                particle.style.cssText = `
                    font-size: ${size}px;
                    left: ${left}%;
                    animation-delay: -${delay}s;
                    animation-duration: ${duration}s;
                `;
                
                this.glyphContainer.appendChild(particle);
                
                // Fade in gradually
                setTimeout(() => {
                    particle.style.opacity = (0.3 + Math.random() * 0.4).toString();
                }, i * 200);
            }
            
            document.body.appendChild(this.glyphContainer);
        },

        createMarginalia() {
            // Left side marginalia
            const leftMargin = document.createElement('div');
            leftMargin.className = 'rule-marginalia left';
            leftMargin.style.top = '30%';
            leftMargin.innerHTML = this.rules.slice(0, 4).map(r => 
                Math.random() > 0.5 ? `<span class="redacted">${r}</span>` : r
            ).join(' · ');
            document.body.appendChild(leftMargin);
            this.marginalia.push(leftMargin);

            // Right side marginalia
            const rightMargin = document.createElement('div');
            rightMargin.className = 'rule-marginalia right';
            rightMargin.style.top = '50%';
            rightMargin.innerHTML = this.rules.slice(4).map(r => 
                Math.random() > 0.5 ? `<span class="redacted">${r}</span>` : r
            ).join(' · ');
            document.body.appendChild(rightMargin);
            this.marginalia.push(rightMargin);
        },

        createCalibrationChecks() {
            const checks = [
                { pos: 'top left', text: 'CONSISTENCY' },
                { pos: 'top right', text: 'SOUNDNESS' },
                { pos: 'bottom left', text: 'COMPLETENESS' },
                { pos: 'bottom right', text: 'DECIDABILITY' }
            ];

            checks.forEach(check => {
                const el = document.createElement('div');
                el.className = `calibration-check ${check.pos}`;
                el.textContent = check.text;
                document.body.appendChild(el);
            });

            // Create subtle vertical inference trace lines
            [15, 85].forEach(left => {
                const trace = document.createElement('div');
                trace.className = 'inference-trace';
                trace.style.cssText = `
                    left: ${left}%;
                    top: 10%;
                    height: 80%;
                `;
                document.body.appendChild(trace);
            });
        },

        startAmbientMotion() {
            // Subtle parallax on marginalia based on scroll
            window.addEventListener('scroll', () => {
                const scrollY = window.scrollY;
                
                this.marginalia.forEach((el, i) => {
                    const offset = (scrollY * 0.02 * (i + 1)) % 100;
                    el.style.top = `${30 + offset}%`;
                });
            }, { passive: true });
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // MASTER INITIALIZATION
    // ════════════════════════════════════════════════════════════════════════════

    function initNorthStar() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        function init() {
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
            console.log('%c  CYTHERAI NORTH-STAR SYSTEM v1.0', 'color: #d4af37; font-weight: bold; font-size: 14px;');
            console.log('%c  Material: Optical Instrument', 'color: #9c9b96; font-size: 11px;');
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');

            // Initialize all systems in order
            TheoremAtmosphere.init();  // Background layer first
            OpticalLayer.init();        // Optical device metaphor
            BriefingSpine.init();       // Navigation spine
            SovereignSeal.init();       // Signature object
            ConstraintReveal.init();    // 60% reveal
            ProgressiveDisclosure.init(); // Pause-triggered depth
            CutLanguage.init();         // Cinematic transitions

            console.log('%c✓ Theorem Atmosphere', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Optical Layer', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Briefing Spine', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Sovereign Seal (3 appearances)', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Constraint Reveal (60%)', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Progressive Disclosure', 'color: #22c55e; font-size: 10px;');
            console.log('%c✓ Cut Language', 'color: #22c55e; font-size: 10px;');
            console.log('%c═══════════════════════════════════════════════════', 'color: #d4af37;');
        }
    }

    initNorthStar();

    // Export for external access
    window.CytherNorthStar = {
        state: NorthStar,
        BriefingSpine,
        OpticalLayer,
        SovereignSeal,
        ConstraintReveal,
        ProgressiveDisclosure,
        CutLanguage,
        TheoremAtmosphere
    };

})();
