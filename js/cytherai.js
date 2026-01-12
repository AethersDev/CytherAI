/**
 * CYTHERAI MAIN MODULE
 * Core functionality for navigation, smooth scrolling, and UI enhancements
 */

class CytherAI {
    constructor() {
        this.init();
    }

    /**
     * Initialize all components
     */
    init() {
        this.setupNavigation();
        this.setupSmoothScroll();
        this.setupDisclosureModules();
        this.setupAccessibility();
        this.detectReducedMotion();
    }

    /**
     * Setup navigation scroll behavior
     */
    setupNavigation() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    /**
     * Setup smooth scrolling for anchor links
     */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();

                    const offsetTop = target.offsetTop - 100;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Update URL without triggering scroll
                    history.pushState(null, null, href);

                    // Focus target for accessibility
                    target.focus({ preventScroll: true });
                }
            });
        });
    }

    /**
     * Setup disclosure modules (details/summary elements)
     * Progressive enhancement - works without JS, enhanced with JS
     */
    setupDisclosureModules() {
        const modules = document.querySelectorAll('.disclosure-module');

        modules.forEach(module => {
            const header = module.querySelector('.disclosure-header');
            if (!header) return;

            // Add ARIA attributes if not already present
            if (!module.hasAttribute('role')) {
                module.setAttribute('role', 'region');
            }

            // Track state for analytics (if needed)
            module.addEventListener('toggle', () => {
                const isOpen = module.hasAttribute('open');
                const title = module.querySelector('.disclosure-title')?.textContent;

                // Could send analytics event here
                console.log(`Disclosure ${isOpen ? 'opened' : 'closed'}: ${title}`);
            });
        });
    }

    /**
     * Setup accessibility enhancements
     */
    setupAccessibility() {
        // Skip to main content link
        this.addSkipLink();

        // Keyboard trap prevention
        this.preventKeyboardTraps();

        // Focus management
        this.manageFocus();
    }

    /**
     * Add skip to main content link
     */
    addSkipLink() {
        const main = document.querySelector('main');
        if (!main || main.id) return;

        main.id = 'main-content';

        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--gold);
            color: var(--bg-primary);
            padding: 0.5rem 1rem;
            text-decoration: none;
            z-index: 10001;
            transition: top 0.2s;
        `;

        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Prevent keyboard traps
     */
    preventKeyboardTraps() {
        document.addEventListener('keydown', (e) => {
            // If Tab is pressed and we're in a modal/dialog
            const activeDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
            if (!activeDialog) return;

            if (e.key === 'Tab') {
                this.trapFocus(activeDialog, e);
            }
        });
    }

    /**
     * Trap focus within an element
     */
    trapFocus(element, event) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                event.preventDefault();
            }
        }
    }

    /**
     * Manage focus states
     */
    manageFocus() {
        // Track if user is using keyboard
        let usingKeyboard = false;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                usingKeyboard = true;
                document.body.classList.add('keyboard-nav');
            }
        });

        document.addEventListener('mousedown', () => {
            usingKeyboard = false;
            document.body.classList.remove('keyboard-nav');
        });
    }

    /**
     * Detect and respect reduced motion preference
     */
    detectReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleMotionPreference = (e) => {
            if (e.matches) {
                document.documentElement.classList.add('reduced-motion');
            } else {
                document.documentElement.classList.remove('reduced-motion');
            }
        };

        // Check initial state
        handleMotionPreference(mediaQuery);

        // Listen for changes
        mediaQuery.addEventListener('change', handleMotionPreference);
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Utility: Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cytherai = new CytherAI();
    });
} else {
    window.cytherai = new CytherAI();
}

export default CytherAI;
