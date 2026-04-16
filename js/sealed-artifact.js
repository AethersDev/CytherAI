/**
 * SEALED ARTIFACT VERIFICATION MODULE — v2.1
 *
 * Data-only external-request monitor. No display DOM required.
 * Exposes window.sealedArtifact with getReport() for the command palette.
 *
 * Tracks: external HTTP requests, their origins, and a content build hash.
 */

;(function (global) {
  'use strict';

  /* ─── Constants ─────────────────────────────────────────── */
  const MONITOR_DURATION_MS   = 60_000; // Stop observer after 60 s
  const MAX_TRACKED_EXTERNALS = 200;    // Cap on stored external-request objects
  const BUILD_HASH_META       = 'build-hash';
  const HASH_BYTES            = 8;      // 16 hex chars displayed

  /* ─── SealedArtifactMonitor ──────────────────────────────── */
  class SealedArtifactMonitor {
    constructor () {
      /** @type {Array<{url:string,type:string,origin:string,timestamp:number}>} */
      this.externalRequests = [];
      this.externalOrigins  = new Set();
      this._seen            = new Set();
      this.buildHash        = '';
      this._initialized     = false;
      this._observer        = null;
      this._stopTimer       = null;
    }

    /** Initialize monitoring. Safe to call multiple times. */
    async init () {
      if (this._initialized) return;
      this._initialized = true;

      await this._computeBuildHash();
      this._monitorResources();
      this._updateDisplay();
    }

    /* ── Build hash ─────────────────────────────────────────── */

    /**
     * Priority:
     *  1. CI-injected <meta name="build-hash" content="sha256-hex">
     *  2. SHA-256 of static HTML content (scripts stripped)
     *  3. Deterministic FNV-1a fallback from title + pathname
     */
    async _computeBuildHash () {
      const meta = document.querySelector(`meta[name="${BUILD_HASH_META}"]`);
      if (meta && meta.content && meta.content !== '{{BUILD_HASH}}') {
        this.buildHash = meta.content.substring(0, HASH_BYTES * 2);
        return;
      }

      try {
        const clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('script, [data-dynamic]').forEach(el => el.remove());
        const html = clone.outerHTML;
        const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html));
        this.buildHash = Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, HASH_BYTES * 2);
      } catch {
        this.buildHash = this._staticFallbackHash();
      }
    }

    /**
     * FNV-1a 32-bit × 2 rounds for 64-bit-wide output. (L1 fix)
     * Round 1 hashes title+pathname; round 2 hashes pathname+title.
     * Produces a full 16-hex-char string with no zero-padding artifacts.
     */
    _staticFallbackHash () {
      const fnv = (str) => {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = (Math.imul(h, 0x01000193)) >>> 0;
        }
        return (h >>> 0).toString(16).padStart(8, '0');
      };
      const a = document.title + window.location.pathname;
      const b = window.location.pathname + document.title;
      return fnv(a) + fnv(b);
    }

    /* ── Resource monitoring ────────────────────────────────── */

    _monitorResources () {
      if (!window.performance?.getEntriesByType) return;

      // Scan already-loaded resources
      performance.getEntriesByType('resource').forEach(e => this._analyzeResource(e));
      this._updateDisplay();

      // Watch future resources (C4 fix: observer runs for full duration)
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          this._observer = new PerformanceObserver(list => {
            list.getEntries().forEach(e => this._analyzeResource(e));
            this._updateDisplay();
          });
          this._observer.observe({ entryTypes: ['resource'] });

          // Disconnect observer after MONITOR_DURATION_MS
          this._stopTimer = setTimeout(() => {
            this._observer?.disconnect();
            this._observer = null;
          }, MONITOR_DURATION_MS);
        } catch (err) {
          console.warn('[SealedArtifact] PerformanceObserver failed:', err);
        }
      }
    }

    /**
     * Classify a resource entry as external or same-origin.
     * Skips blob:/data: URIs, deduplicates across initial scan + observer.
     */
    _analyzeResource (entry) {
      const name = entry.name;

      if (this._seen.has(name)) return;
      this._seen.add(name);

      if (!name.startsWith('http:') && !name.startsWith('https:')) return;

      let resourceUrl;
      try {
        resourceUrl = new URL(name, window.location.href);
      } catch {
        return;
      }

      if (resourceUrl.origin === window.location.origin || resourceUrl.origin === 'null') return;

      if (this.externalRequests.length < MAX_TRACKED_EXTERNALS) {
        this.externalRequests.push({
          url:       name,
          type:      entry.initiatorType,
          origin:    resourceUrl.origin,
          timestamp: Date.now(),
        });
      }
      this.externalOrigins.add(resourceUrl.origin);
    }

    /* ── Display ────────────────────────────────────────────── */

    _updateDisplay () {
      const statusPanel = document.getElementById('artifact-status');
      if (statusPanel && this.buildHash) statusPanel.style.display = '';

      const hashEl  = document.getElementById('artifact-build-hash');
      const countEl = document.getElementById('artifact-external-count');
      const origEl  = document.getElementById('artifact-origins-count');

      if (hashEl)  hashEl.textContent  = this.buildHash;
      if (countEl) countEl.textContent = this.externalRequests.length;
      if (origEl)  origEl.textContent  = this.externalOrigins.size;
    }

    /* ── Public API ─────────────────────────────────────────── */

    /**
     * @returns {{ externalRequests:number, externalOrigins:string[], buildHash:string, timestamp:string }}
     */
    getReport () {
      return {
        externalRequests: this.externalRequests.length,
        externalOrigins:  Array.from(this.externalOrigins),
        buildHash:        this.buildHash,
        timestamp:        new Date().toISOString(),
      };
    }

    destroy () {
      this._observer?.disconnect();
      clearTimeout(this._stopTimer);
    }
  }

  /* ─── Bootstrap ──────────────────────────────────────────── */
  function boot () {
    const monitor = new SealedArtifactMonitor();
    monitor.init().catch(err => console.error('[SealedArtifact] init failed:', err));
    global.sealedArtifact = monitor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
