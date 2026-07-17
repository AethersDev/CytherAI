/**
 * COMMAND PALETTE MODULE — v2.1
 *
 * Cmd+K palette for quick navigation and utilities.
 * All commands verified against live DOM — no dead references.
 */

;(function (global) {
  'use strict';

  /* ─── Constants ─────────────────────────────────────────── */
  const FILTER_DEBOUNCE_MS = 50;

  /**
   * Resolve a page path relative to the current location.
   * Handles both root (index.html) and /pages/ subpage contexts.
   */
  function resolvePath (page) {
    const path = window.location.pathname;
    if (path.includes('/pages/')) return page;          // already in /pages/
    return 'pages/' + page;                             // from root
  }

  /* ─── CommandPalette ────────────────────────────────────── */
  class CommandPalette {
    constructor () {
      this.isActive       = false;
      this.selectedIndex  = 0;
      this.filteredCommands = [];
      this._filterTimer   = null;

      this.commands = [
        {
          id:          'briefing',
          title:       'REQUEST BRIEFING',
          description: 'Access technical overview',
          action:      () => { window.location.href = resolvePath('brief.html'); },
          keywords:    ['brief', 'technical', 'overview', 'docs'],
        },
        {
          id:          'contact',
          title:       'INITIATE CONTACT',
          description: 'Leave coordinates for response',
          action:      () => { window.location.href = 'mailto:contact@cytherai.com'; },
          keywords:    ['contact', 'email', 'reach', 'coordinates'],
        },
        {
          id:          'security',
          title:       'SECURITY PROTOCOL',
          description: 'View vulnerability disclosure',
          action:      () => { window.location.href = resolvePath('security.html'); },
          keywords:    ['security', 'vulnerability', 'disclosure', 'bug'],
        },
        {
          id:          'copy-email',
          title:       'COPY CONTACT EMAIL',
          description: 'contact@cytherai.com',
          action:      () => this._copyEmail(),
          keywords:    ['copy', 'email', 'clipboard'],
        },
        {
          id:          'artifact-report',
          title:       'GENERATE ARTIFACT REPORT',
          description: 'Download verification data as JSON',
          action:      () => this._downloadReport(),
          keywords:    ['report', 'artifact', 'verification', 'download'],
        },
        {
          id:          'verify',
          title:       'VERIFY INTEGRITY',
          description: 'Check build hash and SRI status',
          action:      () => this._verifyIntegrity(),
          keywords:    ['verify', 'integrity', 'hash', 'sri', 'check'],
        },
        {
          id:          'export',
          title:       'EXPORT DOCUMENT',
          description: 'Print or save as PDF',
          action:      () => { window.print(); },
          keywords:    ['export', 'print', 'pdf', 'save', 'document'],
        },
        {
          id:          'history',
          title:       'REVISION HISTORY',
          description: 'Document revision timeline',
          action:      () => this._showHistory(),
          keywords:    ['history', 'revision', 'changelog', 'version'],
        },
        {
          id:          'clear-state',
          title:       'CLEAR DOCUMENT STATE',
          description: 'Remove local reading history from this device',
          action:      () => this._clearDocState(),
          keywords:    ['clear', 'reset', 'state', 'history', 'local', 'forget'],
        },
      ];

      this._init();
    }

    /* ── Init ───────────────────────────────────────────────── */

    _init () {
      this._createUI();
      this._bindEvents();
    }

    _createUI () {
      const palette = document.createElement('div');
      palette.className = 'command-palette';
      palette.id        = 'command-palette';
      palette.innerHTML = `
        <div class="command-container" role="dialog" aria-modal="true" aria-label="Command Palette">
          <input
            type="text"
            class="command-input"
            id="command-input"
            placeholder="Type a command\u2026"
            aria-label="Command search"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="command-results" id="command-results" role="listbox"></div>
        </div>
      `;

      palette.addEventListener('click', e => {
        if (e.target === palette) this.close();
      });

      document.body.appendChild(palette);
    }

    _bindEvents () {
      document.addEventListener('keydown', e => {
        const isMeta = e.metaKey || e.ctrlKey;

        if (isMeta && e.key.toLowerCase() === 'k') {
          const tag = document.activeElement?.tagName?.toUpperCase?.() ?? '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          e.preventDefault();
          this.toggle();
          return;
        }

        if (!this.isActive) return;

        switch (e.key) {
          case 'Escape':    e.preventDefault(); this.close();         break;
          case 'ArrowDown': e.preventDefault(); this._selectNext();   break;
          case 'ArrowUp':   e.preventDefault(); this._selectPrev();   break;
          case 'Enter':     e.preventDefault(); this._execSelected(); break;
        }
      });

      const input = document.getElementById('command-input');
      if (input) {
        input.addEventListener('input', e => {
          clearTimeout(this._filterTimer);
          this._filterTimer = setTimeout(
            () => this._filterCommands(e.target.value),
            FILTER_DEBOUNCE_MS
          );
        });
      }
    }

    /* ── Open / close ───────────────────────────────────────── */

    toggle () { this.isActive ? this.close() : this.open(); }

    open () {
      const palette = document.getElementById('command-palette');
      const input   = document.getElementById('command-input');
      if (!palette || !input) return;

      this.isActive = true;
      palette.classList.add('active');
      input.value = '';
      this._filterCommands('');
      input.focus();
    }

    close () {
      const palette = document.getElementById('command-palette');
      if (!palette) return;

      this.isActive     = false;
      this.selectedIndex = 0;
      palette.classList.remove('active');
      clearTimeout(this._filterTimer);
    }

    /* ── Filtering & rendering ──────────────────────────────── */

    _filterCommands (query) {
      const q = query.trim().toLowerCase();
      this.filteredCommands = q
        ? this.commands.filter(cmd =>
            cmd.title.toLowerCase().includes(q)
            || cmd.description.toLowerCase().includes(q)
            || cmd.keywords.some(k => k.includes(q))
          )
        : [...this.commands];

      this.selectedIndex = 0;
      this._renderResults();
    }

    _renderResults () {
      const results = document.getElementById('command-results');
      if (!results) return;

      if (this.filteredCommands.length === 0) {
        results.innerHTML =
          '<div class="command-item"><div class="command-title">No commands found</div></div>';
        return;
      }

      results.innerHTML = this.filteredCommands
        .map((cmd, i) => `
          <div
            class="command-item${i === this.selectedIndex ? ' selected' : ''}"
            data-index="${i}"
            role="option"
            aria-selected="${i === this.selectedIndex}"
          >
            <div class="command-title">${this._escape(cmd.title)}</div>
            <div class="command-description">${this._escape(cmd.description)}</div>
          </div>
        `)
        .join('');

      results.querySelectorAll('.command-item').forEach((el, i) => {
        el.addEventListener('click', () => {
          this.selectedIndex = i;
          this._execSelected();
        });
        el.addEventListener('mouseenter', () => {
          this.selectedIndex = i;
          this._highlightSelected();
        });
      });
    }

    /* ── Navigation ─────────────────────────────────────────── */

    _selectNext () {
      if (this.filteredCommands.length === 0) return;
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
      this._renderResults();
    }

    _selectPrev () {
      if (this.filteredCommands.length === 0) return;
      this.selectedIndex =
        (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
      this._renderResults();
    }

    _highlightSelected () {
      const results = document.getElementById('command-results');
      if (!results) return;
      results.querySelectorAll('.command-item').forEach((el, i) => {
        const isSelected = i === this.selectedIndex;
        el.classList.toggle('selected', isSelected);
        el.setAttribute('aria-selected', isSelected);
      });
    }

    _execSelected () {
      const cmd = this.filteredCommands[this.selectedIndex];
      if (cmd?.action) {
        try { cmd.action(); } catch (err) {
          console.error('[CommandPalette] Command error:', err);
        }
        this.close();
      }
    }

    /* ── Actions ────────────────────────────────────────────── */

    async _copyEmail () {
      const email = 'contact@cytherai.com';
      const ok = await this._copyToClipboard(email);
      this._notify(ok ? 'Email copied to clipboard' : 'Could not copy \u2014 please copy: ' + email);
    }

    async _copyToClipboard (text) {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          return this._legacyCopy(text);
        }
      }
      return this._legacyCopy(text);
    }

    _legacyCopy (text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    _downloadReport () {
      if (!global.sealedArtifact) {
        this._notify('Artifact monitor not active on this page.');
        return;
      }
      const report = global.sealedArtifact.getReport();
      const blob   = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url    = URL.createObjectURL(blob);

      const a      = document.createElement('a');
      a.href       = url;
      a.download   = 'sealed-artifact-report.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this._notify('Report downloaded');
    }

    _verifyIntegrity () {
      if (!global.sealedArtifact) {
        this._notify('Artifact monitor not active on this page.');
        return;
      }
      const r = global.sealedArtifact.getReport();
      const sri = r.sriEnforced ? 'ENFORCED' : 'NOT DETECTED';
      this._notify(
        'BUILD: ' + r.buildHash + ' \u00B7 SRI: ' + sri + ' \u00B7 EXT: ' + r.externalRequests
      );
    }

    _showHistory () {
      this._notify(
        'REV 1.0 \u00B7 2026.03 \u00B7 Initial filing\n'
        + 'REV 1.4 \u00B7 2026.04 \u00B7 Validation readout updated\n'
        + 'REV 2.0 \u00B7 2026.04 \u00B7 Protocol & provenance added'
      );
    }

    _clearDocState () {
      if (global.cytheraiDocState) {
        global.cytheraiDocState.clear();
      } else {
        try { localStorage.removeItem('cytherai-doc-state'); } catch { /* empty */ }
      }
      this._notify('Document state cleared.');
    }

    /* ── Utilities ──────────────────────────────────────────── */

    _notify (message) {
      const existing = document.getElementById('cytherai-notify');
      if (existing) existing.remove();

      const note = document.createElement('div');
      note.id = 'cytherai-notify';
      note.style.cssText = [
        'position:fixed', 'bottom:2rem', 'right:2rem',
        'background:var(--paper-lifted,#F1EBE0)',
        'border:1px solid var(--brass,#7A5B1B)',
        'padding:1rem 1.5rem',
        'border-radius:4px',
        'font-family:var(--font-mono,monospace)',
        'font-size:0.875rem',
        'color:var(--ink,#171612)',
        'box-shadow:0 4px 12px rgba(23,22,18,.1)',
        'z-index:10001',
        'pointer-events:none',
        'white-space:pre-line',
      ].join(';');
      note.textContent = message;
      document.body.appendChild(note);
      setTimeout(() => { note.style.opacity = '0'; note.style.transition = 'opacity .3s'; }, 2000);
      setTimeout(() => note.remove(), 2400);
    }

    _escape (str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  /* ─── Bootstrap ──────────────────────────────────────────── */
  function boot () {
    global.commandPalette = new CommandPalette();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
