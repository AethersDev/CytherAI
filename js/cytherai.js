/**
 * CYTHERAI MAIN MODULE — v2.1
 *
 * Core: nav scroll shadow, smooth scroll, accessibility (focus trap,
 * keyboard-nav detection, reduced-motion).
 */

;(function (global) {
  'use strict';

  /** Scroll threshold (px) for nav shadow — single source, no inline duplicate */
  const NAV_SCROLL_THRESHOLD = 60;

  class CytherAI {
    constructor () {
      this.init();
    }

    init () {
      this.setupNavigation();
      this.setupSmoothScroll();
      this.setupAccessibility();
      this.detectReducedMotion();
    }

    /* ── Navigation ─────────────────────────────────────────── */

    /**
     * M1 fix: select nav by both id and class so this works on
     * index.html (<nav id="nav">) and subpages (<nav class="nav">).
     * Single threshold eliminates divergence.
     */
    setupNavigation () {
      const nav = document.querySelector('.nav, #nav');
      if (!nav) return;

      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > NAV_SCROLL_THRESHOLD);
      }, { passive: true });
    }

    /* ── Smooth scroll ──────────────────────────────────────── */

    setupSmoothScroll () {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
          const href = anchor.getAttribute('href');
          if (!href || href === '#') return;

          const target = document.querySelector(href);
          if (!target) return;

          e.preventDefault();

          const offsetTop = target.getBoundingClientRect().top
            + window.scrollY
            - 100;

          window.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });

          const isFocusable = target.matches(
            'a, button, input, select, textarea, [tabindex], details, summary'
          ) || target.getAttribute('tabindex') !== null;

          if (isFocusable) {
            target.focus({ preventScroll: true });
          }
        });
      });
    }

    /* ── Accessibility ──────────────────────────────────────── */

    setupAccessibility () {
      this._manageFocus();
    }

    _manageFocus () {
      document.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          document.body.classList.add('keyboard-nav');

          const dialog = document.querySelector(
            '[role="dialog"][aria-modal="true"]:not([hidden])'
          );
          if (dialog) this._trapFocus(dialog, e);
        }
      });

      document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-nav');
      });
    }

    /**
     * @param {Element} container
     * @param {KeyboardEvent} event
     */
    _trapFocus (container, event) {
      const selector = [
        'a[href]', 'button:not([disabled])',
        'input:not([disabled])', 'select:not([disabled])',
        'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusable = Array.from(container.querySelectorAll(selector));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    }

    /* ── Reduced motion ─────────────────────────────────────── */

    detectReducedMotion () {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const apply = matches => {
        document.documentElement.classList.toggle('reduced-motion', matches);
      };
      apply(mq.matches);
      mq.addEventListener('change', e => apply(e.matches));
    }

  }

  /* ─── Bootstrap ──────────────────────────────────────────── */
  function boot () {
    global.cytherai = new CytherAI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.CytherAI = CytherAI;

})(window);
