'use strict';
/**
 * js/console.js — additive instrument layer (Observable Record).
 *
 * The static HTML is canonical. This script reads TRUE values about the bundle
 * into the header, fails LOUD if they drift from content/record.js, and upgrades
 * the §05 static SVG into a live canvas rendering of the REAL engine trajectory:
 * the committed past is drawn sealed, the future provisional, and asking the
 * engine to rewrite the sealed past throws the actual committed-prefix guard —
 * shown on the plot, not faked. With JS off, the static SVG + values stand.
 */
(function (global) {
  var E = global.CytherEngine, R = global.CytherRecord, P = global.CytherProfiles;
  var css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };

  addEventListener('keydown', function (e) { if (e.key === 'Tab') document.body.classList.add('kbd'); });
  addEventListener('mousedown', function () { document.body.classList.remove('kbd'); });
  function setAll(sel, t) { var n = document.querySelectorAll(sel); for (var i = 0; i < n.length; i++) n[i].textContent = t; }
  function mismatch(m) { var b = document.getElementById('mismatch'); if (b) { b.textContent = 'INTEGRITY MISMATCH — ' + m + ' · this page no longer matches its source of truth.'; b.style.display = 'block'; } }

  function boot() {
    var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (_) {} }

    var ext = 0;
    function setExt() { setAll('[data-ext]', String(ext)); }
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { try { if (new URL(e.name, location.href).origin !== location.origin) ext++; } catch (_) {} }); setExt(); }).observe({ type: 'resource', buffered: true }); } catch (_) {}
    setExt();

    var meta = document.querySelector('meta[name="build-hash"]');
    if (meta) { var ba = (document.querySelector('[data-bundle-hash]') || {}).textContent; if (ba && ba.trim() !== meta.content) mismatch('bundle hash: authored ' + ba.trim() + ' vs built ' + meta.content); setAll('[data-bundle-hash]', meta.content); }

    if (!E || !R || !P) return;

    var computed = R.buildHash();
    var authored = (document.querySelector('[data-record-hash]') || {}).textContent;
    if (authored && authored.trim() !== computed) mismatch('record hash: authored ' + authored.trim() + ' vs computed ' + computed);
    setAll('[data-record-hash]', computed);
    setAll('[data-rev]', R.revisionHistory.valueAt(Infinity).rev);
    setAll('[data-scope]', P.TIER.PUBLIC.toUpperCase());

    document.querySelectorAll('[data-recompute]').forEach(function (el) {
      function run() { var ok = R.buildHash() === computed; el.textContent = ok ? '[✓]' : '[✕]'; setTimeout(function () { el.textContent = '[recompute]'; }, 1200); }
      el.addEventListener('click', run);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
    });

    R.exhibits.forEach(function (x) {
      var tier = P.computeDisclosure(x.facts), el = document.querySelector('[data-tier="' + x.id + '"]');
      if (el && el.firstChild && el.firstChild.textContent.trim() !== tier) mismatch('exhibit ' + x.id + ' tier: authored "' + el.firstChild.textContent.trim() + '" vs derived "' + tier + '"');
    });

    wireRecordCanvas();
    wireModel();
  }

  /* ── §05 · the observable record: live canvas of the real trajectory ── */
  function wireRecordCanvas() {
    var fig = document.querySelector('[data-record]'); if (!fig) return;
    var canvas = fig.querySelector('[data-record-canvas]'), svg = fig.querySelector('svg.fallback');
    if (!canvas || !canvas.getContext) return;            // no canvas → keep the static SVG
    var ctx = canvas.getContext('2d');
    var stage = fig.querySelector('.stage'), out = fig.querySelector('[data-readout]'), fEl = fig.querySelector('[data-frontier]');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var w = E.makeWorld(), eng = E.makeEngine(w);
    eng.install('record', 'state', 'origin', [{ tau: 1, value: 'filed' }, { tau: 2, value: 'validated' }, { tau: 3, value: 'current' }]);
    var TMAX = 5, F = 3;
    var cur = eng.activate('record', 'state', 0).cursor; cur.observe(F);
    var log = function () { return w.getLog('record', 'state'); };
    var refusedAt = null;

    function levels() { var m = {}, i = 0, seen = function (v) { var k = String(v); if (!(k in m)) m[k] = i++; }; seen(log().initialValue); log().edges.forEach(function (e) { seen(e.to); }); m._n = i; return m; }
    function segs() { var L = log(), o = [], a = 0, v = L.initialValue; L.edges.forEach(function (e) { o.push({ a: a, b: e.tau, v: v }); a = e.tau; v = e.to; }); o.push({ a: a, b: TMAX, v: v }); return o; }

    function resize() { var r = stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = r.width * dpr; canvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { W: r.width, H: r.height }; }

    function draw() {
      var d = resize(), W = d.W, H = d.H, pad = 36;
      var lv = levels(), maxL = Math.max(1, lv._n - 1);
      var x = function (t) { return pad + (t / TMAX) * (W - 2 * pad); };
      var y = function (v) { return H - pad - (lv[String(v)] / maxL) * (H - 2 * pad); };
      var INK = css('--ink'), GRAY = css('--quiet'), SEAL = css('--seal'), GRID = css('--grid'), TINT = css('--seal-tint'), RED = css('--refuse');
      ctx.clearRect(0, 0, W, H);
      // blueprint grid
      ctx.strokeStyle = GRID; ctx.lineWidth = 1;
      for (var t = 0; t <= TMAX; t++) { ctx.beginPath(); ctx.moveTo(x(t), pad - 12); ctx.lineTo(x(t), H - pad + 12); ctx.stroke(); ctx.fillStyle = GRAY; ctx.font = '10px ' + css('--mono'); ctx.fillText('τ' + t, x(t) - 7, H - 12); }
      // sealed tint
      ctx.fillStyle = TINT; ctx.fillRect(x(0), pad - 12, x(F) - x(0), H - 2 * pad + 24);
      // split segments at F and draw
      var S = segs(), parts = [];
      S.forEach(function (s) { if (s.a < F && s.b > F) { parts.push({ a: s.a, b: F, v: s.v, sealed: true }, { a: F, b: s.b, v: s.v, sealed: false }); } else parts.push({ a: s.a, b: s.b, v: s.v, sealed: s.b <= F + 1e-9 }); });
      ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      for (var i = 0; i < parts.length; i++) {
        var s = parts[i], yy = y(s.v);
        function style(seal) { if (seal) { ctx.strokeStyle = INK; ctx.setLineDash([]); } else { ctx.strokeStyle = GRAY; ctx.setLineDash([5, 5]); } }
        if (i > 0) { style(parts[i - 1].sealed && s.sealed); ctx.beginPath(); ctx.moveTo(x(s.a), y(parts[i - 1].v)); ctx.lineTo(x(s.a), yy); ctx.stroke(); }
        style(s.sealed); ctx.beginPath(); ctx.moveTo(x(s.a), yy); ctx.lineTo(x(s.b), yy); ctx.stroke();
      }
      ctx.setLineDash([]);
      // frontier
      ctx.strokeStyle = SEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x(F), pad - 12); ctx.lineTo(x(F), H - pad + 12); ctx.stroke();
      ctx.fillStyle = SEAL; ctx.font = '10px ' + css('--mono'); ctx.fillText('F = ' + F.toFixed(1), x(F) + 6, pad - 2);
      // current sealed value label
      ctx.fillStyle = INK; ctx.font = '11px ' + css('--mono'); var cv = log().valueAt(F); ctx.fillText(String(cv), x(F) - ctx.measureText(String(cv)).width - 8, y(cv) - 8);
      // refusal marker
      if (refusedAt != null) { ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x(refusedAt), pad - 12); ctx.lineTo(x(refusedAt), H - pad + 12); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = RED; ctx.font = '12px ' + css('--mono'); ctx.fillText('✕', x(refusedAt) - 4, H / 2); }
      if (fEl) fEl.textContent = 'F = ' + F.toFixed(1);
    }

    function refused(verb, msg, extra) { out.innerHTML = '<span class="refused">✕ REFUSED</span> — ' + verb + ': <code>' + msg + '</code>. ' + (extra || '') + ' <a href="pages/runner.html" style="color:var(--seal);text-decoration:none;border-bottom:1px solid var(--rule)">reproduce →</a>'; }
    function accepted(verb, extra) { out.innerHTML = '<span class="accepted">✓ ACCEPTED</span> — ' + verb + '. ' + (extra || ''); }

    fig.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        if (act === 'rewrite') {
          var before = eng.whereIs('record', 'state', 1), threw = null;
          try { eng.rebase('record', 'state', 1.5, function () { return [{ tau: 1.6, value: 'ALTERED' }]; }); } catch (e) { threw = e.message; }
          var after = eng.whereIs('record', 'state', 1);
          refusedAt = 1.5;
          if (threw) refused('rewrite the sealed past', threw, 'Committed Prefix Preservation — value at τ=1 is "' + before + '" before and "' + after + '" after. A conventional store would have accepted this and lost its past.');
          draw();
        } else if (act === 'observe') {
          refusedAt = null; F = Math.min(F + 0.6, TMAX - 0.4); cur.observe(F);
          accepted('observe through τ=' + F.toFixed(1), 'More of the record is now sealed. Observation only ever moves the frontier forward.');
          draw();
        } else if (act === 'extend') {
          refusedAt = null; var ok = false, at = Math.min(F + 0.8, TMAX - 0.1);
          try { eng.rebase('record', 'state', F + 0.3, function () { return [{ tau: at, value: 'addendum' }]; }); ok = true; } catch (e) {}
          if (ok) accepted('extend the future (rebase at τ&gt;F)', 'The unobserved future is open — a provisional edge was appended. Only a rewrite of the sealed past is refused.');
          draw();
        }
      });
    });

    svg.style.display = 'none'; canvas.style.display = 'block';
    draw();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
  }

  /* ── §06 · positioning derivation graph (live engine propagation + definedness) ── */
  function wireModel() {
    var root = document.querySelector('[data-model]'); if (!root) return;
    var w = E.makeWorld(), eng = E.makeEngine(w);
    var model = P.buildModel(w, eng, { environment: P.DOMAINS.environment[0], dependency: P.DOMAINS.dependency[0], evaluation: P.DOMAINS.evaluation[0] });
    var key = { environment: 'env', dependency: 'dep', evaluation: 'evl' };
    var T = 1, NOW = 999, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function disp(v) { return v === E.INVALID ? 'absent' : v === E.INDETERMINATE ? 'pending' : String(v); }
    function cls(v) { return v === E.INVALID ? 'is-invalid' : v === E.INDETERMINATE ? 'is-pending' : 'is-value'; }
    function render(flash) {
      root.querySelectorAll('.src').forEach(function (b) {
        var s = b.getAttribute('data-src'), val = eng.whereIs('m', key[s], NOW);
        b.querySelector('[data-srcv]').textContent = val;
        b.setAttribute('aria-label', s + ': ' + val + ' — activate to cycle');   // live value in the accessible name
      });
      model.derived.forEach(function (n) {
        var v = eng.whereIs('m', n, NOW), el = root.querySelector('[data-node="' + n + '"]'), nv = el.querySelector('[data-nodev]');
        var c = cls(v);
        // disclosure is a terminal verdict: colour by VALENCE, not just definedness
        if (n === 'disclosure') c = v === 'public' ? 'is-value' : v === 'qualified' ? 'is-pending' : 'is-refuse';
        nv.textContent = disp(v); nv.className = 'nv ' + c;
        if (flash && flash[n] && !reduce) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      });
    }
    root.querySelectorAll('.src').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = btn.getAttribute('data-src'), dom = P.DOMAINS[s];
        var nx = dom[(dom.indexOf(eng.whereIs('m', key[s], NOW)) + 1) % dom.length];
        var before = {}; model.derived.forEach(function (n) { before[n] = eng.whereIs('m', n, NOW); });
        eng.rebase('m', key[s], T, function () { return [{ tau: T + 0.1, value: nx }]; }); T += 1;
        var flash = {}, changed = []; model.derived.forEach(function (n) { var a = eng.whereIs('m', n, NOW); if (a !== before[n]) { flash[n] = 1; changed.push(n + ' → ' + disp(a)); } });
        render(flash);
        root.querySelector('[data-model-readout]').innerHTML = '<b>' + s + '</b> → ' + nx + (changed.length ? ' &nbsp;·&nbsp; repropagated: ' + changed.join(' · ') : ' &nbsp;·&nbsp; no derived surface was emitted — edge-minimal');
      });
    });
    render(null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof globalThis !== 'undefined' ? globalThis : window);
