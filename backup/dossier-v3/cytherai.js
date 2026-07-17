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
      this.setupYear();
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

          const nav = document.querySelector('.nav, #nav');
          const offsetTop = target.getBoundingClientRect().top
            + window.scrollY
            - ((nav ? nav.offsetHeight : 0) + 20);

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
            '.command-palette.active [role="dialog"][aria-modal="true"]'
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

    /* ── Dynamic year ──────────────────────────────────────── */

    setupYear () {
      document.querySelectorAll('.js-year').forEach(el => {
        el.textContent = new Date().getFullYear();
      });
    }

  }

  /* ─── Service Worker ─────────────────────────────────────── */
  function registerSW () {
    if (!('serviceWorker' in navigator)) return;
    var swPath = global.location.pathname.indexOf('/pages/') !== -1 ? '../sw.js' : 'sw.js';
    navigator.serviceWorker.register(swPath).catch(function () { /* silent */ });
  }

  /* ─── Bootstrap ──────────────────────────────────────────── */
  function boot () {
    global.cytherai = new CytherAI();
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
