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

        if (isMeta && e.key === 'k') {
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
          this._renderResults();
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

    _copyEmail () {
      const email = 'contact@cytherai.com';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(email)
          .then(() => this._notify('Email copied to clipboard'))
          .catch(() => this._notify(`Copy failed \u2014 please copy: ${email}`));
      } else {
        this._legacyCopy(email);
        this._notify('Email copied to clipboard');
      }
    }

    _legacyCopy (text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* silent */ }
      document.body.removeChild(ta);
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

    /* ── Utilities ──────────────────────────────────────────── */

    _notify (message) {
      const note = document.createElement('div');
      note.style.cssText = [
        'position:fixed', 'bottom:2rem', 'right:2rem',
        'background:var(--bg-elevated,#0a0a0f)',
        'border:1px solid var(--gold,#d4af37)',
        'padding:1rem 1.5rem',
        'border-radius:4px',
        'font-family:var(--font-mono,monospace)',
        'font-size:0.875rem',
        'color:var(--gold-bright,#e8c84a)',
        'box-shadow:0 10px 30px rgba(0,0,0,.5)',
        'z-index:10001',
        'pointer-events:none',
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

  global.CommandPalette = CommandPalette;

})(window);
