/**
 * ════════════════════════════════════════════════════════════════════════════════
 * NORTH-STAR V4: AUTHORITY ENHANCEMENTS (LITE)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Lightweight enhancement layer for existing dossier-plate structure.
 * Adds dwell-based progressive reveal without replacing existing HTML/CSS.
 *
 * @version 4.0.1-lite
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
        dwellTimers: new Map()
    };

    // ════════════════════════════════════════════════════════════════════════════
    // BRIEFING PACE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════════
    //
    // Dwell-based progressive reveal for authority-driven attention.
    // Works with existing .dossier-plate elements via [data-exhibit] attributes.

    const BriefingPaceController = {
        dwellThreshold: 600, // ms required to fully reveal (increased for authority)
        exhibits: [],
        observer: null,

        init() {
            this.injectStyles();
            this.findExhibits();
            this.setupObserver();
            this.logInit();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.id = 'v4-authority-enhancements';
            style.textContent = `
                /* V4 Authority Enhancement: Dwell-based reveal */
                /* Works alongside existing dossier-plate CSS */

                [data-exhibit] {
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* Authority state: withheld until dwell */
                [data-exhibit]:not(.v4-revealed) {
                    opacity: 0.3;
                    transform: translateY(12px);
                }

                /* Authority state: revealed after dwell */
                [data-exhibit].v4-revealed {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* First exhibit (KERNEL entry) reveals immediately */
                [data-exhibit][data-dossier="kernel"]:first-of-type {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Smooth scroll for controlled pace */
                html {
                    scroll-behavior: smooth;
                }
            `;
            document.head.appendChild(style);
        },

        findExhibits() {
            this.exhibits = Array.from(document.querySelectorAll('[data-exhibit]'));

            // First exhibit (KERNEL entry) reveals immediately
            if (this.exhibits[0]) {
                this.exhibits[0].classList.add('v4-revealed');
                Authority.exhibitsRevealed.push(0);
                Authority.currentExhibit = 0;
            }
        },

        setupObserver() {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const exhibit = entry.target;
                    const index = this.exhibits.indexOf(exhibit);

                    // Skip if already revealed
                    if (Authority.exhibitsRevealed.includes(index)) return;

                    if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
                        // Start dwell timer - authority requires sustained attention
                        if (!Authority.dwellTimers.has(index)) {
                            const timer = setTimeout(() => {
                                this.revealExhibit(index);
                            }, this.dwellThreshold);
                            Authority.dwellTimers.set(index, timer);
                        }
                    } else {
                        // Cancel if scrolled away before dwell threshold met
                        if (Authority.dwellTimers.has(index)) {
                            clearTimeout(Authority.dwellTimers.get(index));
                            Authority.dwellTimers.delete(index);
                        }
                    }
                });
            }, {
                threshold: [0.2, 0.4, 0.6, 0.8],
                rootMargin: '-10% 0px -20% 0px' // Require more intent
            });

            this.exhibits.forEach(exhibit => {
                this.observer.observe(exhibit);
            });
        },

        revealExhibit(index) {
            if (Authority.exhibitsRevealed.includes(index)) return;

            const exhibit = this.exhibits[index];
            if (!exhibit) return;

            // Add reveal class
            exhibit.classList.add('v4-revealed');
            Authority.exhibitsRevealed.push(index);
            Authority.currentExhibit = index;

            // Log for debugging
            console.log(`[V4 Authority] Exhibit ${exhibit.dataset.exhibit} revealed (${exhibit.dataset.dossier})`);

            // Emit event if ProofBus exists (integrate with existing system)
            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('v4:exhibit:revealed', {
                    index,
                    id: exhibit.dataset.exhibit,
                    dossier: exhibit.dataset.dossier,
                    total: this.exhibits.length
                });
            }

            // Check if briefing complete (all exhibits revealed)
            if (Authority.exhibitsRevealed.length === this.exhibits.length) {
                this.onBriefingComplete();
            }
        },

        onBriefingComplete() {
            Authority.briefingSealed = true;
            console.log('[V4 Authority] Briefing complete - all exhibits revealed');

            if (typeof ProofBus !== 'undefined') {
                ProofBus.emit('v4:briefing:complete', {
                    totalExhibits: this.exhibits.length,
                    duration: Date.now() - this.startTime
                });
            }
        },

        logInit() {
            this.startTime = Date.now();
            console.log(`
═══════════════════════════════════════════════════
  NORTH-STAR V4: AUTHORITY ENHANCEMENTS
  Dwell-based progressive reveal active
═══════════════════════════════════════════════════
Exhibits found: ${this.exhibits.length}
Dwell threshold: ${this.dwellThreshold}ms
Mode: Enhancement (preserves existing CSS)
═══════════════════════════════════════════════════
            `);
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ════════════════════════════════════════════════════════════════════════════

    // Wait for DOM + ProofBus (if exists)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => BriefingPaceController.init(), 100);
        });
    } else {
        setTimeout(() => BriefingPaceController.init(), 100);
    }

    // Export for debugging
    window.CytherV4Authority = {
        BriefingPaceController,
        Authority,
        version: '4.0.1-lite'
    };

})();
