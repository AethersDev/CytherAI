'use strict';
const assert = require('node:assert/strict');
const { INVALID, INDETERMINATE, eq, and, or, seekAfter, materialize, edgeLog, makeWorld, makeEngine, breakpointsOf, deriveSurfaces, makeDerived, reparametrize, debounce } = require('./trajectory-engine.js');

// ===========================================================================
// TESTS
// ===========================================================================

const seq = (events) => events.map((e) => [e.from, e.to]); // value stream, tau-agnostic

// ---- (2) substrate ----

function T1_orient_observe_noninterference() {
    // The bug the Architect caught, now structurally impossible: orient is
    // valueAt (pure), observe is the cursor (stateful). They cannot interfere.
    const log = edgeLog('A');
    log.append(materialize('A', [{ tau: 0.2, value: 'B' }, { tau: 0.5, value: 'C' }, { tau: 0.8, value: 'D' }]));
    
    const cur = log.cursor(0.0);
    cur.observe(0.9); // consume everything
    
    // The old shared-cursor orient returned 'D' here. valueAt is pure:
    assert.equal(log.valueAt(0.4), 'B', 'valueAt is a point query, not "latest consumed"');
    assert.equal(log.valueAt(0.6), 'C');
    assert.equal(log.valueAt(0.1), 'A');
    assert.equal(log.valueAt(1.0), 'D');
    
    // Arbitrary interleaving of point queries and a fresh cursor's consumption
    // -- order cannot matter, because valueAt holds no position.
    const c2 = log.cursor(0.3);
    assert.equal(log.valueAt(0.0), 'A');
    c2.observe(0.55);
    assert.equal(log.valueAt(0.0), 'A');
    assert.equal(log.valueAt(0.9), 'D');
    
    console.log('PASS  T1  orient(valueAt)/observe non-interference (old sketch returned D@0.4; now B, order-free)');
}

function T2_from_chaining_multicrossing() {
    // One observe window straddling two crossings: `from` must chain.
    // The original kernel returned S->B for the second; chaining-at-append
    // makes that impossible.
    const log = edgeLog('S');
    log.append(materialize('S', [{ tau: 0.5, value: 'A' }, { tau: 0.6, value: 'B' }]));
    const cur = log.cursor(0.0);
    const ev = cur.observe(0.7);
    assert.deepEqual(seq(ev), [['S', 'A'], ['A', 'B']], 'second edge.from must be A, not S');
    console.log('PASS  T2  from-chaining across a multi-crossing window (chained once at append)');
}

function T3_confluence_structural() {
    // Two cursors born at the same tau over the same log are identical by
    // construction; a cursor born mid-stream matches the tail of an earlier one.
    const log = edgeLog('x');
    log.append(materialize('x', [{ tau: 0.2, value: 'y' }, { tau: 0.5, value: 'z' }, { tau: 0.8, value: 'w' }]));
    const checkpoints = [0.1, 0.3, 0.4, 0.6, 0.7, 0.9, 1.0];
    
    const a = log.cursor(0.0), b = log.cursor(0.0);
    const ea = [], eb = [];
    for (const t of checkpoints) { ea.push(...a.observe(t)); eb.push(...b.observe(t)); }
    assert.deepEqual(ea, eb, 'co-born cursors produce identical streams');
    
    const late = log.cursor(0.4);
    const elate = [];
    for (const t of checkpoints.filter((t) => t > 0.4)) elate.push(...late.observe(t));
    assert.deepEqual(elate, ea.filter((e) => e.tau > 0.4), 'mid-stream cursor == tail of full cursor (projection independence, free)');
    
    console.log('PASS  T3  confluence + projection independence are structural, not asserted');
}

function T4_backward_observe_is_noop() {
    // Non-monotone observe: a no-op, not a phantom. The cursor position is the
    // source of truth, so it cannot rewind and cannot re-fire.
    const log = edgeLog('none');
    log.append(materialize('none', [{ tau: 0.3, value: 'focus' }, { tau: 0.8, value: 'none' }]));
    const cur = log.cursor(0.4); // already past 0.3
    assert.deepEqual(cur.observe(0.2), [], 'backward observe yields nothing and does not rewind');
    assert.deepEqual(seq(cur.observe(0.9)), [['focus', 'none']], 'forward still correct after a backward call; no phantom self-edge');
    console.log('PASS  T4  backward observe is a safe no-op (the rewind-phantom class is removed, not guarded)');
}

function T5_rebase_completeness_and_future_rewrite() {
    const world = makeWorld();
    const engine = makeEngine(world);
    engine.install('panel', 'role', 'button', [{ tau: 0.52, value: 'region' }, { tau: 0.80, value: 'menu' }]);
    
    const { cursor, value } = engine.activate('panel', 'role', 0.0);
    assert.equal(value, 'button', 'activate orients via pure valueAt');
    assert.deepEqual(cursor.observe(0.4), [], 'nothing crossed yet; cursor frontier now 0.4');
    
    // Rebase at 0.55: ahead of the consumer's frontier (0.4) and after the
    // still-unobserved 0.52 crossing. Only the future (>0.55) is rewritten.
    const { droppedFuture } = engine.rebase('panel', 'role', 0.55,
                                            (seed) => { assert.equal(seed, 'region'); return [{ tau: 0.70, value: 'dialog' }]; });
    
    assert.deepEqual(seq(droppedFuture), [['region', 'menu']], 'the old FUTURE (0.80 menu) is truncated, not silently kept');
    
    // The consumer, still at 0.4, flows across the rebase: it receives the
    // pre-rebase 0.52 transition (committed, never deleted) AND the new 0.70,
    // in order, old 0.80 gone. Nothing dropped, nothing duplicated -- and this
    // came through its own observe(), not a drain return.
    assert.deepEqual(seq(cursor.observe(0.9)),
                     [['button', 'region'], ['region', 'dialog']],
                     'consumer behind the rebase point loses no transition and sees the rewritten future');
    assert.equal(world.getLog('panel', 'role').valueAt(0.6), 'region', 'committed prefix preserved');
    assert.equal(world.getLog('panel', 'role').valueAt(1.0), 'dialog');
    
    // Fail-closed: rebasing a future a cursor has already consumed is refused.
    engine.install('z', 'q', 'a', [{ tau: 0.5, value: 'b' }]);
    const cz = engine.activate('z', 'q', 0.0).cursor;
    cz.observe(0.9); // frontier now 0.9
    assert.throws(() => engine.rebase('z', 'q', 0.6, () => []), /already consumed/,
                  'committed-prefix invariant is guarded');
    
    console.log('PASS  T5  rebase rewrites only the future; consumer-behind loses nothing; over-consumed rebase refused');
}

function T6_terminate_frontier_guard() {
    // Committed-prefix immutability, death side. A death is a value DISCONTINUITY
    // at tauDeath, so terminate must land STRICTLY after every consumed frontier --
    // tighter than rebase's >= (T5), which preserves the value at its cut. Before
    // the guard, terminate's _planPropagation checked only DEPENDENTS, never the
    // dying log's OWN cursors; a tauDeath >= the last edge's tau is append-legal
    // yet can sit behind a cursor whose frontier ran past it (observe advances the
    // frontier with or without an edge out there). Now refused on both sides.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('x', 'p', 'on', [{ tau: 0.5, value: 'mid' }]);
    const cur = engine.activate('x', 'p', 0.0).cursor;
    cur.observe(0.9); // frontier 0.9 -- past the last edge (0.5), no edge out there
    
    // tauDeath 0.6: append-legal (>= 0.5) but BEHIND the cursor (0.9).
    assert.throws(() => engine.terminate('x', 'p', 0.6), /consumed frontier/,
                  'a death at or behind a consumed frontier must be refused, not appended');
    assert.equal(engine.whereIs('x', 'p', 1.0), 'mid', 'the rejected terminate left the source alive and untouched');
    assert.deepEqual(cur.observe(1.0), [], 'no phantom past-tau death reaches the cursor');
    
    // The guard is a floor, not a wall: a death STRICTLY ahead of every frontier
    // still lands (the cursor's frontier is now 1.0, so the death must clear it).
    engine.terminate('x', 'p', 1.1);
    assert.equal(engine.whereIs('x', 'p', 1.5), INVALID, 'a death ahead of the frontier still terminates');
    console.log('PASS  T6  terminate refuses a death at or behind a consumed frontier (death is a discontinuity -- strictly future, unlike rebase)');
}

function T7_rebase_atomic_on_unsorted_surfaces() {
    // validate-then-commit, completed. The pre-commit check used to verify only
    // each surface's lower bound (> tauCurrent), not order BETWEEN surfaces, so an
    // unsorted makeSurfaces passed validation, truncateAfter dropped the future,
    // the first surface appended, and append's monotone assert threw on the second
    // -- leaving the log half-rewritten. The order check is now hoisted pre-commit.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('y', 'q', 'a', [{ tau: 0.5, value: 'b' }, { tau: 0.9, value: 'c' }]);
    const before = world.getLog('y', 'q').edges.map((e) => [e.tau, e.to]);
    
    // Both surfaces lie strictly after tauCurrent (0.6) -- the old lower-bound
    // check passed them -- but they are out of order.
    assert.throws(
                  () => engine.rebase('y', 'q', 0.6, () => [{ tau: 0.95, value: 'Z' }, { tau: 0.80, value: 'Y' }]),
                  /monotone/,
                  'unsorted rebase surfaces must be rejected',
                  );
    assert.deepEqual(world.getLog('y', 'q').edges.map((e) => [e.tau, e.to]), before,
                     'a rejected rebase must leave the source log exactly as it was -- not truncated, not half-appended');
    console.log('PASS  T7  rebase rejects unsorted surfaces before mutating (validate-then-commit closed on malformed input)');
}

function T8_frontier_boundary_continuation_vs_discontinuity() {
    // The boundary the >= / > distinction exists for: an operation landing EXACTLY
    // on a consumed frontier. rebase is a CONTINUATION -- it preserves valueAt at
    // the cut -- so equality is admissible. terminate is a DISCONTINUITY -- the
    // death changes valueAt at the cut -- so equality must be refused, else a
    // committed point query is silently revised. Witness for Committed Prefix
    // Preservation at tau == F, on both the source's own frontier and a dependent's.
    
    // (a) rebase AT the frontier: admitted, committed value preserved.
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('x', 'p', 'on', [{ tau: 0.5, value: 'mid' }]);
        const cur = engine.activate('x', 'p', 0.0).cursor;
        cur.observe(0.5); // frontier exactly 0.5
        engine.rebase('x', 'p', 0.5, () => [{ tau: 0.8, value: 'late' }]);
        assert.equal(engine.whereIs('x', 'p', 0.5), 'mid', 'rebase at the frontier preserves valueAt(F) -- it is a continuation');
        assert.equal(engine.whereIs('x', 'p', 0.9), 'late', 'and its strictly-future rewrite still applies');
    }
    
    // (b) terminate AT the frontier: refused, committed value untouched.
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('x', 'p', 'on', [{ tau: 0.5, value: 'mid' }]);
        const cur = engine.activate('x', 'p', 0.0).cursor;
        cur.observe(0.5); // frontier exactly 0.5
        assert.throws(() => engine.terminate('x', 'p', 0.5), /consumed frontier/,
                      'terminate at the frontier is refused -- a death there would revise a committed valueAt(F)');
        assert.equal(engine.whereIs('x', 'p', 0.5), 'mid', 'the committed value at F is unchanged');
        assert.deepEqual(cur.observe(1.0), [], 'and no at-frontier death is delivered after the fact');
    }
    
    // (c) terminate at a DEPENDENT's exact frontier: refused downstream too -- the
    //     death repropagates as a discontinuity at the dependent, so it must clear
    //     the dependent frontier as well, not only the source's.
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('s', 'v', 'a');
        makeDerived(engine, world, 'd', 'o', [{ id: 's', prop: 'v' }], ([v]) => v);
        engine.activate('d', 'o', 0.0).cursor.observe(0.7); // dependent frontier 0.7
        assert.throws(() => engine.terminate('s', 'v', 0.7), /downstream consumed frontier/,
                      'a death at a dependent consumer\'s exact frontier is refused');
    }
    
    console.log('PASS  T8  frontier boundary: rebase (continuation) admits tau==F, terminate (discontinuity) requires tau>F -- source and dependent');
}

// ---- (1) definedness as edges ----

function O1_terminate_is_an_edge() {
    // Symmetric counterpart of T5, at the other end of the lifecycle.
    // engine.terminate appends a death edge -> drained exactly once.
    const wE = makeWorld(), eE = makeEngine(wE);
    eE.install('x', 'p', 'on');
    const cE = eE.activate('x', 'p', 0.0).cursor;
    cE.observe(0.4);
    eE.terminate('x', 'p', 0.5);
    const deathEvents = cE.observe(0.6);
    assert.deepEqual(seq(deathEvents), [['on', INVALID]], 'death is a VALID->INVALID edge, drained like any other, exactly once');
    
    // Contrast: the "naive terminate" (delete the log) drops it entirely.
    const wN = makeWorld(), eN = makeEngine(wN);
    eN.install('x', 'p', 'on');
    const cN = eN.activate('x', 'p', 0.0).cursor;
    cN.observe(0.4);
    wN.deleteLog('x', 'p'); // naive: no edge, no drain
    let naiveDeath = null;
    try { naiveDeath = cN.observe(0.6); } catch { naiveDeath = 'threw'; }
    assert.notDeepEqual(naiveDeath, [['on', INVALID]], 'naive terminate cannot produce the death transition -- the asymmetry T5 fixed for rebase, fixed here too');
    
    console.log('PASS  O1  terminate dissolved into an edge (engine: 1 death event; naive deleteLog: none)');
}

function O2_three_regimes() {
    const world = makeWorld(), engine = makeEngine(world);
    engine.installLifecycle('w', 's', { tauBirth: 0.1, initialValue: INDETERMINATE, surfaces: [{ tau: 0.4, value: 'ready' }], tauDeath: 0.9 });
    const v = (t) => engine.whereIs('w', 's', t);
    assert.equal(v(0.05), INVALID, 'before birth: absent');
    assert.equal(v(0.2), INDETERMINATE, 'born but uncommitted: indeterminate, NOT absent');
    assert.equal(v(0.5), 'ready', 'committed value');
    assert.equal(v(0.95), INVALID, 'after death: absent again');
    console.log('PASS  O2  INVALID / INDETERMINATE / value are three distinct regimes the old model collapsed');
}

function O3_full_lifecycle_one_cursor() {
    // One cursor, one observe-mechanism, drains birth + indeterminacy +
    // value changes + death. Zero new code path -- this is layer (2) proving
    // it absorbs layer (1).
    const world = makeWorld(), engine = makeEngine(world);
    engine.installLifecycle('widget', 'state', {
        tauBirth: 0.1, initialValue: INDETERMINATE,
        surfaces: [{ tau: 0.4, value: 'ready' }, { tau: 0.7, value: 'busy' }],
        tauDeath: 0.9,
    });
    const cur = engine.activate('widget', 'state', 0.0).cursor;
    const ev = cur.observe(1.0);
    assert.deepEqual(seq(ev), [
        [INVALID, INDETERMINATE],   // birth
        [INDETERMINATE, 'ready'],   // first commitment
        ['ready', 'busy'],          // value change
        ['busy', INVALID],          // death
    ], 'the whole lifetime is one chained edge stream through the ordinary cursor');
    console.log('PASS  O3  birth->indeterminate->value->death drained by the same cursor (no new mechanism)');
}

// ---- (3) derivation + reparametrization ----

// interactable = (role == 'button') AND (focus == 'enabled'), over the lattice.
const interactable = ([role, focus]) => and(eq(role, 'button'), eq(focus, 'enabled'));

function D1_edge_minimality() {
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('btn', 'role', 'other', [{ tau: 0.3, value: 'button' }, { tau: 0.7, value: 'other' }]);
    engine.install('btn', 'focus', 'disabled', [{ tau: 0.5, value: 'enabled' }]);
    makeDerived(engine, world, 'btn', 'interactable', [{ id: 'btn', prop: 'role' }, { id: 'btn', prop: 'focus' }], interactable);
    
    const dlog = world.getLog('btn', 'interactable');
    // role flips button<->other at 0.3 and 0.7, but while focus is disabled
    // interactable stays false -- so NO edge at 0.3. It only changes at 0.5
    // (focus enables, role already button) and 0.7 (role leaves button).
    assert.deepEqual(dlog.edges.map((e) => e.tau), [0.5, 0.7], 'an edge must EARN its existence by changing the projection');
    assert.deepEqual(seq(dlog.edges), [[false, true], [true, false]]);
    assert.equal(dlog.initialValue, false);
    console.log('PASS  D1  edge-minimality: source crossing at 0.3 emits no derived edge (free, via self-edge drop)');
}

function D2_dependency_repropagation() {
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('btn', 'role', 'other', [{ tau: 0.3, value: 'button' }, { tau: 0.7, value: 'other' }]);
    engine.install('btn', 'focus', 'disabled', [{ tau: 0.5, value: 'enabled' }]);
    makeDerived(engine, world, 'btn', 'interactable', [{ id: 'btn', prop: 'role' }, { id: 'btn', prop: 'focus' }], interactable);
    
    const dcur = engine.activate('btn', 'interactable', 0.0).cursor;
    assert.deepEqual(seq(dcur.observe(0.6)), [[false, true]], 'becomes interactable at 0.5');
    
    // Rebase a SOURCE: focus disables again at 0.65. This must repropagate
    // into the derived trajectory as a derived rebase at the same tau.
    engine.rebase('btn', 'focus', 0.6, (seed) => { assert.equal(seed, 'enabled'); return [{ tau: 0.65, value: 'disabled' }]; });
    
    const dlog = world.getLog('btn', 'interactable');
    assert.deepEqual(dlog.edges.map((e) => e.tau), [0.5, 0.65], 'derived future rewritten: interactable lost at 0.65, old 0.7 edge gone');
    assert.deepEqual(seq(dcur.observe(1.0)), [[true, false]], 'the derived consumer sees exactly the new 0.65 transition (drain->truncate->append on the derived log too)');
    console.log('PASS  D2  source rebase repropagates as a derived rebase through the identical machinery');
}

function D2b_no_drop_behind_a_source_rebase() {
    // The un-masking test: a derived consumer NOT advanced before a source
    // rebase must still receive its pre-rebase transitions on its own
    // observe(), plus the rewritten future. (The pre-fix engine drained derived
    // consumers during repropagation and discarded those events -- this is the
    // exact case that hid it, now asserted.)
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('btn', 'role', 'other', [{ tau: 0.3, value: 'button' }, { tau: 0.7, value: 'other' }]);
    engine.install('btn', 'focus', 'disabled', [{ tau: 0.5, value: 'enabled' }]);
    makeDerived(engine, world, 'btn', 'interactable', [{ id: 'btn', prop: 'role' }, { id: 'btn', prop: 'focus' }], interactable);
    
    const dcur = engine.activate('btn', 'interactable', 0.0).cursor; // left at frontier 0.0
    engine.rebase('btn', 'focus', 0.6, () => [{ tau: 0.65, value: 'disabled' }]);
    
    assert.deepEqual(seq(dcur.observe(1.0)), [[false, true], [true, false]],
                     'consumer behind a source rebase loses nothing across repropagation (0.5 AND 0.65 both delivered)');
    console.log('PASS  D2b no transition dropped for a consumer left behind a source rebase');
}

function D3_definedness_propagates_through_derivation() {
    // INVALID flows through f: an affordance does not exist until its sources
    // do. This is layer (1) x layer (3), for free.
    const world = makeWorld(), engine = makeEngine(world);
    engine.installLifecycle('btn', 'role', { tauBirth: 0.2, initialValue: 'button' });
    engine.installLifecycle('btn', 'focus', { tauBirth: 0.2, initialValue: 'enabled' });
    makeDerived(engine, world, 'btn', 'interactable', [{ id: 'btn', prop: 'role' }, { id: 'btn', prop: 'focus' }], interactable);
    
    const dlog = world.getLog('btn', 'interactable');
    assert.equal(dlog.valueAt(0.1), INVALID, 'before sources are born, the affordance is INVALID (absent), not false');
    assert.equal(dlog.valueAt(0.3), true, 'once both sources commit, it becomes determinate');
    console.log('PASS  D3  definedness propagates: derived value is INVALID until its sources exist');
}

function R1_reparametrization_covariance() {
    // A pure-edge stream is invariant under any order-preserving phi.
    const log = edgeLog(false);
    log.append(materialize(false, [{ tau: 0.5, value: true }, { tau: 0.7, value: false }]));
    const phi = (t) => t * t; // strictly increasing on [0, inf)
    
    const canon = log.cursor(0.0).observe(1.0);
    const rep = reparametrize(log, phi);
    const warped = rep.cursor(0.0).observe(phi(1.0));
    
    assert.deepEqual(seq(warped), seq(canon), 'value stream is identical -- it depends only on surface ORDER');
    assert.deepEqual(warped.map((e) => e.tau), canon.map((e) => phi(e.tau)), 'taus are exactly the phi-image of the canonical taus');
    console.log('PASS  R1  projection determinism sharpened to a covariance law (stream is phi-invariant)');
}

function R2_debounce_is_not_canonical() {
    // Debounce reads the METRIC of tau, so it is NOT phi-invariant -- proof
    // that it cannot live on the canonical side.
    const log = edgeLog('x');
    log.append(materialize('x', [{ tau: 0.30, value: 'A' }, { tau: 0.42, value: 'B' }, { tau: 0.90, value: 'C' }]));
    const phi = (t) => t * t;
    const delta = 0.1;
    
    const canonEvents = log.cursor(0.0).observe(1.0);
    const repEvents = reparametrize(log, phi).cursor(0.0).observe(phi(1.0));
    
    // Raw streams ARE covariant (same values), per R1:
    assert.deepEqual(seq(repEvents), seq(canonEvents), 'raw streams covariant');
    
    // Debounced streams are NOT: under phi the gap before 'A' compresses below
    // delta, so 'A' survives canonically but is debounced away after phi.
    const debCanon = debounce(canonEvents, delta, 1.0);
    const debRep = debounce(repEvents, delta, phi(1.0));
    
    assert.ok(seq(debCanon).some((p) => p[1] === 'A'), 'A survives debounce in canonical time');
    assert.ok(!seq(debRep).some((p) => p[1] === 'A'), 'A does NOT survive debounce after phi');
    assert.notDeepEqual(seq(debRep), seq(debCanon), 'debounced stream changed under an order-preserving reparametrization');
    console.log('PASS  R2  debounce is metric-dependent => cannot be canonical (must be a perceptual-side transducer)');
}

// ---- generative: promote R1 from one fixture to a property ----

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomMonotonePhi(rng) {
    const family = Math.floor(rng() * 3);
    if (family === 0) {
        const a = 0.3 + rng() * 3, b = rng() * 2;
        return { phi: (t) => a * t + b, label: `affine(a=${a.toFixed(2)},b=${b.toFixed(2)})` };
    }
    if (family === 1) {
        const k = 1 + rng() * 2;
        return { phi: (t) => Math.pow(t, k), label: `power(k=${k.toFixed(2)})` };
    }
    const rate = 0.5 + rng() * 2;
    return { phi: (t) => Math.exp(rate * t) - 1, label: `exp(rate=${rate.toFixed(2)})` };
}

function randomLog(rng, valuePool) {
    const initial = valuePool[Math.floor(rng() * valuePool.length)];
    const n = 1 + Math.floor(rng() * 7);
    let tau = 0;
    const surfaces = [];
    for (let i = 0; i < n; i++) {
        tau += 0.05 + rng() * 0.5;
        surfaces.push({ tau, value: valuePool[Math.floor(rng() * valuePool.length)] });
    }
    const log = edgeLog(initial);
    log.append(materialize(initial, surfaces));
    return { log, maxTau: tau };
}

function R3_covariance_generative() {
    const SEED = 0xC0FFEE;
    const TRIALS = 300;
    const rng = mulberry32(SEED);
    const valuePool = [true, false, 'A', 'B', 'C', 0, 1, 2];
    
    for (let trial = 0; trial < TRIALS; trial++) {
        const { log, maxTau } = randomLog(rng, valuePool);
        const { phi, label } = randomMonotonePhi(rng);
        const observeTau = maxTau + 1;
        
        const canon = log.cursor(0.0).observe(observeTau);
        const warped = reparametrize(log, phi).cursor(0.0).observe(phi(observeTau));
        
        assert.deepEqual(seq(warped), seq(canon),
                         `trial ${trial} (seed ${SEED}, phi=${label}): value stream diverged under reparametrization`);
        assert.deepEqual(warped.map((e) => e.tau), canon.map((e) => phi(e.tau)),
                         `trial ${trial} (seed ${SEED}, phi=${label}): warped taus are not exactly the phi-image of canonical taus`);
    }
    console.log(`PASS  R3  phi-covariance holds across ${TRIALS} random (log, phi) pairs, 3 phi families, seed 0x${SEED.toString(16)} (example promoted to property)`);
}

// ---- (4) propagation hardening: cycles, diamonds, terminate ----

function P1_cycle_is_detected_not_infinite() {
    // Two derived nodes registered as each other's dependent. The OLD
    // recursive _propagate recursed without bound (RangeError: Maximum call
    // stack size exceeded) the moment anything tried to rebase either side.
    // The new one must detect it and fail with a clear error instead.
    // Triggered through an external plain property ('seed') rather than by
    // rebasing 'd' directly -- P9 closed that as a dual-writer hazard, so the
    // cycle now needs a legitimate entry point from outside it, same as it
    // would in practice (a cycle is reached by propagation, never authored
    // into directly).
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('x', 'seed', 0);                          // external trigger
    engine.install('x', 'd', 0);                             // placeholder so c can initially depend on it
    makeDerived(engine, world, 'x', 'c', [{ id: 'x', prop: 'd' }, { id: 'x', prop: 'seed' }], ([d]) => d);
    makeDerived(engine, world, 'x', 'd', [{ id: 'x', prop: 'c' }], ([c]) => c); // now cyclic: c<->d
    
    assert.throws(
                  () => engine.rebase('x', 'seed', 0.0, () => [{ tau: 1.0, value: 99 }]),
                  /derivation cycle detected/,
                  'a true dependency cycle must fail loud and clean, not stack-overflow',
                  );
    console.log('PASS  P1  derivation cycle throws a clear error instead of recursing without bound');
}

function P2_diamond_fires_exactly_once() {
    // x -> a, x -> b, [a,b] -> c. The OLD recursive _propagate fired c once
    // per incoming edge (twice here), the second time with stale data from
    // whichever sibling hadn't been processed yet on the first pass.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('x', 'v', 0);
    makeDerived(engine, world, 'x', 'a', [{ id: 'x', prop: 'v' }], ([v]) => v > 0);
    makeDerived(engine, world, 'x', 'b', [{ id: 'x', prop: 'v' }], ([v]) => v > -5);
    makeDerived(engine, world, 'x', 'c', [{ id: 'x', prop: 'a' }, { id: 'x', prop: 'b' }], ([a, b]) => a && b);
    
    engine.rebase('x', 'v', 0.0, () => [{ tau: 1.0, value: 10 }]);
    
    const clog = world.getLog('x', 'c');
    assert.equal(clog.journal.length, 1, 'c must recompute exactly once per source rebase, not once per incoming path');
    assert.equal(clog.journal[0].kind, 'derived-rebase');
    console.log('PASS  P2  diamond dependency fires the shared descendant exactly once (topological order, not per-edge recursion)');
}

function P3_terminate_propagates_to_derived() {
    // The asymmetry O1 fixed for a property's OWN log (death is an edge, not
    // a delete) did not, by itself, reach derived consumers: the old
    // terminate() never called _propagate, so a derived node watching a
    // source that died kept reporting its last pre-death value forever.
    // Uses the Kleene-aware `interactable` (eq/and), not a plain ===
    // comparison -- a plain comparison can never produce INVALID regardless
    // of what the kernel does, which is its own trap, distinct from this one.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('btn', 'role', 'button');
    engine.install('btn', 'focus', 'enabled');
    makeDerived(engine, world, 'btn', 'interactable',
                [{ id: 'btn', prop: 'role' }, { id: 'btn', prop: 'focus' }], interactable);
    
    assert.equal(engine.whereIs('btn', 'interactable', 5.0), true, 'interactable before the source dies');
    engine.terminate('btn', 'focus', 1.0);
    assert.equal(engine.whereIs('btn', 'focus', 5.0), INVALID, 'the source itself correctly dies');
    assert.equal(engine.whereIs('btn', 'interactable', 5.0), INVALID,
                 'a derived node must inherit INVALID when a source it depends on dies, not keep its last value forever');
    console.log('PASS  P3  terminate propagates to derived consumers (death is no longer a propagation dead end)');
}

function P4_rejected_propagation_is_atomic() {
    // A propagation that gets rejected -- by a dependency cycle or by a
    // downstream cursor sitting ahead of the rebase point -- must leave EVERY
    // log exactly as it was. P1 proved the cycle throws; it did not prove the
    // root survived the throw. It did not: the root was rewritten and THEN the
    // cycle (a static graph property) was noticed. Same for the frontier guard,
    // which only fired after the root had already been truncated and appended.
    
    // (a) cycle rejection leaves every log in the cycle, and the trigger, untouched
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('x', 'seed', 0);                          // external trigger
        engine.install('x', 'd', 0);
        makeDerived(engine, world, 'x', 'c', [{ id: 'x', prop: 'd' }, { id: 'x', prop: 'seed' }], ([d]) => d);
        makeDerived(engine, world, 'x', 'd', [{ id: 'x', prop: 'c' }], ([c]) => c); // cyclic: c<->d
        const snap = () => ({
            seed: world.getLog('x', 'seed').edges.map((e) => e.tau),
            c: world.getLog('x', 'c').edges.map((e) => e.tau),
            d: world.getLog('x', 'd').edges.map((e) => e.tau),
        });
        const before = snap();
        assert.throws(() => engine.rebase('x', 'seed', 0.0, () => [{ tau: 1.0, value: 99 }]), /cycle detected/);
        assert.deepEqual(snap(), before, 'a cycle-rejected rebase must not have mutated the trigger or any node in the cycle');
    }
    
    // (b) frontier rejection (a derived consumer ahead of the rebase) leaves
    //     the root's future intact
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('X', 'v', 0, [{ tau: 0.5, value: 1 }, { tau: 0.9, value: 2 }]);
        makeDerived(engine, world, 'A', 'out', [{ id: 'X', prop: 'v' }], ([v]) => v);
        engine.activate('A', 'out', 0.0).cursor.observe(0.8); // derived frontier 0.8
        assert.equal(engine.whereIs('X', 'v', 1.0), 2);
        assert.throws(() => engine.rebase('X', 'v', 0.6, () => []), /already consumed/);
        assert.equal(engine.whereIs('X', 'v', 1.0), 2,
                     'a frontier-rejected rebase must not have truncated the root future');
    }
    
    // (c) termination rejected by a downstream cycle leaves the trigger alive
    {
        const world = makeWorld(), engine = makeEngine(world);
        engine.install('x', 'seed', 0);
        engine.install('x', 'd', 0);
        makeDerived(engine, world, 'x', 'c', [{ id: 'x', prop: 'd' }, { id: 'x', prop: 'seed' }], ([d]) => d);
        makeDerived(engine, world, 'x', 'd', [{ id: 'x', prop: 'c' }], ([c]) => c); // cyclic
        assert.throws(() => engine.terminate('x', 'seed', 1.0), /cycle detected/);
        assert.notEqual(engine.whereIs('x', 'seed', 2.0), INVALID,
                        'a cycle-rejected terminate must not have killed the source');
    }
    
    console.log('PASS  P4  a rejected propagation (cycle / frontier) leaves every log untouched -- validate-then-commit');
}

function P5_coincident_tau_emits_no_phantom() {
    // A source death lands on the EXACT tau another source transitions. The
    // derived node depended on both. Pre-fix, rebaseFrom truncated strictly
    // after the cut, so the derived edge sitting exactly on tauDeath survived
    // and the boundary edge stacked on top of it -- emitting an intermediate
    // value the node never actually holds. The phi-sweep can't reach this: it
    // only varies a single trajectory's metric, never collides two events on
    // one tau.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('e', 'p', 'p0', [{ tau: 1.0, value: 'p1' }]); // p flips at 1.0
    engine.install('e', 'q', 'q0');
    makeDerived(engine, world, 'e', 'c',
                [{ id: 'e', prop: 'p' }, { id: 'e', prop: 'q' }],
                ([p, q]) => (q === INVALID ? INVALID : p)); // c = p, but INVALID once q dies
    
    const cur = engine.activate('e', 'c', 0.0).cursor;
    engine.terminate('e', 'q', 1.0); // q dies at the same instant p flips
    
    // Just before 1.0 c = p0; at 1.0 q is dead so c = INVALID. p1 never surfaces.
    assert.deepEqual(seq(cur.observe(2.0)), [['p0', INVALID]],
                     'derived node must transition p0 -> INVALID once, with no phantom p1 intermediate');
    assert.equal(world.getLog('e', 'c').edges.filter((e) => e.tau === 1.0).length, 1,
                 'exactly one derived edge on the coincident tau, not a stale edge plus a boundary edge');
    assert.equal(engine.whereIs('e', 'c', 2.0), INVALID, 'and it lands on INVALID');
    console.log('PASS  P5  coincident-tau death emits no phantom intermediate (boundary replaces the stale on-cut edge)');
}

function P6_coincident_birth_static() {
    // The coincidence axis the phi-sweep is blind to, simplest cell: two sources
    // born at the EXACT same tau, derived over both. The affordance must go from
    // INVALID (absent) straight to its committed value in one edge -- never a
    // phantom false/INDETERMINATE from one source being seen born before the
    // other. breakpointsOf dedups the shared tau, so f is evaluated once at the
    // joint birth and INVALID->true is a single self-edge-free transition.
    const world = makeWorld(), engine = makeEngine(world);
    engine.installLifecycle('e', 'role', { tauBirth: 1.0, initialValue: 'button' });
    engine.installLifecycle('e', 'focus', { tauBirth: 1.0, initialValue: 'enabled' });
    makeDerived(engine, world, 'e', 'interactable',
                [{ id: 'e', prop: 'role' }, { id: 'e', prop: 'focus' }], interactable);
    
    const cur = engine.activate('e', 'interactable', 0.0).cursor;
    assert.deepEqual(seq(cur.observe(2.0)), [[INVALID, true]],
                     'joint birth yields one INVALID->true edge, no phantom intermediate');
    assert.deepEqual(world.getLog('e', 'interactable').edges.map((e) => e.tau), [1.0],
                     'exactly one derived edge on the shared birth tau');
    console.log('PASS  P6  coincident birth (static): two sources born on one tau give a single clean derived transition');
}

function P7_coincident_birth_via_propagation() {
    // The birth-analog of P5. A source is BORN (INVALID->value) via rebase at the
    // exact tau a sibling transitions, with a derived node depending on both. P5
    // proved truncateFrom handles a coincident DEATH on the cut; this proves the
    // same on-cut re-derivation handles a coincident BIRTH -- the fix is
    // indifferent to which kind of edge lands on the boundary.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('e', 'p', 'p0', [{ tau: 1.0, value: 'p1' }]);              // p flips p0->p1 at 1.0
    engine.installLifecycle('e', 'q', { tauBirth: 5.0, initialValue: 'q0' }); // q born far ahead
    makeDerived(engine, world, 'e', 'c',
                [{ id: 'e', prop: 'p' }, { id: 'e', prop: 'q' }],
                ([p, q]) => (q === INVALID ? INVALID : p));                             // c = p once q is alive, else absent
    
    const cur = engine.activate('e', 'c', 0.0).cursor;
    // Rebase q so its birth lands exactly on 1.0, coincident with p's flip.
    engine.rebase('e', 'q', 0.5, (seed) => { assert.equal(seed, INVALID); return [{ tau: 1.0, value: 'q0' }]; });
    
    assert.deepEqual(seq(cur.observe(2.0)), [[INVALID, 'p1']],
                     'c is absent until q is born, then commits to p1 directly -- p0 never surfaces in c');
    assert.equal(world.getLog('e', 'c').edges.filter((e) => e.tau === 1.0).length, 1,
                 'exactly one derived edge on the coincident birth tau, no stale-plus-boundary stack');
    console.log('PASS  P7  coincident birth via propagation emits no phantom (truncateFrom is birth/death-agnostic)');
}

function P8_coincident_derived_recomputes() {
    // Two derived nodes whose recomputes land on the SAME tau within one
    // propagation, feeding a shared descendant. P2 proved the descendant fires
    // once (topological order, not per incoming path); this adds the coincident-tau
    // dimension P2 lacks -- both parents transition on one tau, and the child must
    // still emit a single clean edge there, not a phantom from seeing one parent
    // move before the other.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('x', 'v', 0);
    makeDerived(engine, world, 'x', 'a', [{ id: 'x', prop: 'v' }], ([v]) => v > 0);
    makeDerived(engine, world, 'x', 'b', [{ id: 'x', prop: 'v' }], ([v]) => v > 5);
    makeDerived(engine, world, 'x', 'c', [{ id: 'x', prop: 'a' }, { id: 'x', prop: 'b' }], ([a, b]) => a && b);
    
    const cur = engine.activate('x', 'c', 0.0).cursor;
    engine.rebase('x', 'v', 0.5, () => [{ tau: 1.0, value: 10 }]); // a and b both move at 1.0
    
    assert.deepEqual(seq(cur.observe(2.0)), [[false, true]],
                     'the shared descendant emits one false->true edge on the coincident tau');
    const clog = world.getLog('x', 'c');
    assert.equal(clog.edges.filter((e) => e.tau === 1.0).length, 1, 'exactly one descendant edge on the coincident tau');
    assert.equal(clog.journal.filter((j) => j.kind === 'derived-rebase').length, 1,
                 'the descendant recomputes exactly once, not once per coincident parent');
    console.log('PASS  P8  coincident derived recomputes: shared descendant fires once and emits no phantom on the joint tau');
}

function P9_derived_node_refuses_direct_mutation() {
    // The gap V2 found, isolated: a derived node's log has exactly one
    // intended writer, its own rebaseFrom. Calling rebase/terminate directly
    // on a derived key is a second writer that doesn't coordinate with the
    // first -- a direct termination doesn't stick, because the very next
    // source-triggered propagation recomputes the node fresh from f with no
    // memory of having been killed, silently "resurrecting" it. Closed by
    // refusing the second writer outright, not by teaching rebaseFrom to
    // remember a termination that didn't come through its sources.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('e', 'p', 'a');
    makeDerived(engine, world, 'e', 'd', [{ id: 'e', prop: 'p' }], ([p]) => p);
    
    assert.throws(() => engine.terminate('e', 'd', 1.0), /derived node/,
                  'direct terminate on a derived key must be refused, not silently written and later overwritten');
    assert.throws(() => engine.rebase('e', 'd', 1.0, () => [{ tau: 2.0, value: 'z' }]), /derived node/,
                  'direct rebase on a derived key must be refused for the same reason');
    assert.equal(engine.whereIs('e', 'd', 5.0), 'a', 'both refusals left the derived node untouched');
    
    // The legitimate path still works: derived definedness flows from the
    // SOURCE dying, and -- unlike a direct termination -- correctly survives
    // further unrelated propagation, because it's recomputed from a source
    // that is genuinely, permanently INVALID, not from a borrowed death edge.
    engine.terminate('e', 'p', 2.0);
    assert.equal(engine.whereIs('e', 'd', 5.0), INVALID, 'death via the source still works');
    engine.install('e', 'unrelated', 'x');
    engine.rebase('e', 'unrelated', 3.0, () => [{ tau: 4.0, value: 'y' }]); // triggers no propagation to d, but nothing should resurrect it either
    assert.equal(engine.whereIs('e', 'd', 5.0), INVALID, 'source-driven death is not resurrected by unrelated activity');
    console.log('PASS  P9  derived nodes refuse direct rebase/terminate (single writer); source-driven death still works and sticks');
}

function P10_single_writer_closes_all_entry_points() {
    // P9 closed rebase/terminate. install/installLifecycle had the identical
    // hole -- never guarded, so install could silently overwrite a derived
    // log, which the next propagation would just as silently overwrite back.
    // A third, distinct entry point: calling makeDerived a SECOND time on an
    // already-derived key leaves the first definition's registration in
    // dependentsByKey stale but still live, so changing the first
    // definition's (now orphaned) sources still writes into whatever log
    // currently sits at that key. All three are the same principle: a
    // trajectory has exactly one mutation authority, checked at every door,
    // not just the two this conversation happened to find first.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('e', 'p1', 'a');
    engine.install('e', 'p2', 'x');
    makeDerived(engine, world, 'e', 'd', [{ id: 'e', prop: 'p1' }], ([p1]) => p1);
    
    assert.throws(() => engine.install('e', 'd', 'smuggled'), /already exists/,
                  'install must refuse to write directly to a derived key');
    assert.throws(() => engine.installLifecycle('e', 'd', { tauBirth: 0, initialValue: 'smuggled' }), /already exists/,
                  'installLifecycle must refuse the same way');
    assert.throws(() => makeDerived(engine, world, 'e', 'd', [{ id: 'e', prop: 'p2' }], ([p2]) => p2),
                  /already a derived node/,
                  'redefining an existing derived key must be refused, not leave the first definition stale');
    
    assert.equal(engine.whereIs('e', 'd', 5.0), 'a', 'all three refusals left the derived node untouched');
    engine.rebase('e', 'p1', 1.0, () => [{ tau: 2.0, value: 'b' }]); // the REAL, still-live source
    assert.equal(engine.whereIs('e', 'd', 5.0), 'b', 'and the legitimate source still drives it correctly');
    console.log('PASS  P10 single writer enforced at every entry point: install, installLifecycle, rebase, terminate, and makeDerived redefinition');
}

function P11_install_refuses_reconstruction_of_existing_key() {
    // A DIFFERENT invariant than Single Writer: there's only one writer here
    // (install), it just never checked whether it was about to discard real
    // committed history. Re-installing over an existing primary key wiped a
    // cursor's already-observed past with zero error -- a Committed Prefix
    // Preservation violation that none of V1/V2/V3 could ever catch, because
    // their generators explicitly skip the install step whenever the key
    // already exists. The fuzzer-blindness was structural, not bad luck.
    const world = makeWorld(), engine = makeEngine(world);
    engine.install('e', 'p', 'a', [{ tau: 1.0, value: 'b' }]);
    const cur = engine.activate('e', 'p', 0.0).cursor;
    cur.observe(5.0); // commits the a->b transition into this observer's history
    
    assert.throws(() => engine.install('e', 'p', 'WIPED'), /already exists/,
                  'install must refuse to reconstruct an existing key, observed or not');
    assert.throws(() => engine.installLifecycle('e', 'p', { tauBirth: 0, initialValue: 'WIPED' }), /already exists/,
                  'installLifecycle must refuse the same way');
    assert.equal(engine.whereIs('e', 'p', 5.0), 'b', 'both refusals left the committed history untouched');
    console.log('PASS  P11 install/installLifecycle refuse to reconstruct an existing key -- construction happens once, evolution goes through rebase/terminate');
}

function V4_release_unblocks_liveness_property() {
    // V1-V3 all check ONE safety oracle: nothing committed is ever rewritten.
    // A kernel that rejected every mutation would pass that oracle vacuously
    // while completely failing the reason release() exists. This checks a
    // LIVENESS property instead: a mutation rejected SOLELY by one observer's
    // frontier must become acceptable the instant that exact observer
    // releases. Two shapes -- the binding observer sits directly on the
    // mutated key, and the harder case, where it sits on a DERIVED node and
    // releasing it must unblock a rebase on one of that node's SOURCES
    // (through _planPropagation's downstream check, not the direct one).
    const MASTER = 0x1143;
    const TRIALS = 200;
    let directCases = 0, derivedCases = 0;
    
    for (let trial = 0; trial < TRIALS; trial++) {
        const rng = mulberry32(MASTER + trial);
        
        // Shape 1: the binding observer sits directly on the mutated key.
        {
            const world = makeWorld(), engine = makeEngine(world);
            engine.install('s', 'v', 0, [{ tau: 1.0, value: 1 }, { tau: 3.0, value: 2 }]);
            const { cursor } = engine.activate('s', 'v', 0.0);
            const bindingFrontier = 0.5 + rng() * 2;
            cursor.observe(bindingFrontier);
            const attemptTau = bindingFrontier - (0.05 + rng() * 0.3); // strictly behind it
            
            assert.throws(() => engine.rebase('s', 'v', attemptTau, () => []),
                          /already consumed/, 'rejected while the binding observer is live');
            
            cursor.release();
            engine.rebase('s', 'v', attemptTau, () => [{ tau: attemptTau + 0.5, value: 99 }]);
            assert.equal(engine.whereIs('s', 'v', attemptTau + 0.5), 99,
                         'the identical mutation must succeed once the sole binding observer released');
            directCases++;
        }
        
        // Shape 2: the binding observer sits on a derived node; releasing it
        // must unblock a rebase on the SOURCE the derived node depends on.
        {
            const world = makeWorld(), engine = makeEngine(world);
            engine.install('s2', 'x', 'a', [{ tau: 1.0, value: 'b' }]);
            makeDerived(engine, world, 's2', 'out', [{ id: 's2', prop: 'x' }], ([x]) => x);
            const { cursor } = engine.activate('s2', 'out', 0.0);
            const bindingFrontier = 0.5 + rng() * 1.5;
            cursor.observe(bindingFrontier);
            const attemptTau = bindingFrontier - (0.05 + rng() * 0.3);
            
            assert.throws(() => engine.rebase('s2', 'x', attemptTau, () => []),
                          /downstream/, 'a source rebase must be rejected while a derived observer sits ahead of it');
            
            cursor.release();
            engine.rebase('s2', 'x', attemptTau, () => [{ tau: attemptTau + 0.5, value: 'c' }]);
            assert.equal(engine.whereIs('s2', 'x', attemptTau + 0.5), 'c',
                         'the source rebase must succeed once the binding DERIVED observer released');
            assert.equal(engine.whereIs('s2', 'out', attemptTau + 0.5), 'c',
                         'and propagation through to the derived node must complete too, not just the source write');
            derivedCases++;
        }
    }
    
    console.log(`PASS  V4  release is a genuine liveness witness across ${TRIALS} trials (${directCases} direct-binding, ${derivedCases} derived-binding-blocks-source): every mutation rejected solely by one observer's frontier became acceptable the instant that exact observer released, on both the mutated key itself and through propagation to a derived dependent`);
}

// ---- (V) verification layer: Committed Prefix Preservation as a property ----
// T6/T7/T8 prove each guard is NECESSARY (revert it, its witness fails). They do
// not prove COVERAGE -- they speak only about operations that exist. This makes
// the law those guards serve a property over a large space of adversarially
// generated executions, so an operation that violates it is caught even before
// anyone writes its specific witness. Stated implementation-independently:
//
//   For every key k and its COMMITTED observation frontier F (the sup of cursor
//   frontiers on k), every accepted-or-rejected operation preserves the
//   observable (initialValue, discontinuity set restricted to (-inf, F]).
//
// "Committed" is load-bearing: an op may freely rewrite the trajectory below an F
// no observer has reached -- that is exactly what rebase does. The bound is the
// committed frontier, never an arbitrary tau. The generator is biased toward
// boundary states (equality with frontiers, coincident taus, terminate-after-
// rebase, derive-over-lifecycle-sources) because those are the information-dense
// cells; uniform random would idle in the trajectory interior.

// Observable of a log restricted to (-inf, F]: initial value + the canonical
// (edge-minimal) discontinuity set at or before F. edge-minimality already makes
// this set unique, so two snapshots are deep-equal iff the observable matches.
function prefixBelow(log, F) {
    return { init: log.initialValue, cuts: log.edges.filter((e) => e.tau <= F).map((e) => [e.tau, e.from, e.to]) };
}

// Snapshot every existing key's committed prefix, capturing the F used so the
// after-comparison comes back to the SAME bound (a mutation never moves F).
function snapshotCommitted(world, engine) {
    const snap = new Map();
    for (const [k, log] of world.logs) snap.set(k, { F: engine._maxFrontier(k), observable: prefixBelow(log, engine._maxFrontier(k)) });
    return snap;
}

function V1_committed_prefix_preservation_property() {
    const MASTER = 0x5EED;
    const TRIALS = 200, STEPS = 50;
    const valuePool = ['a', 'b', 'c', true, false];
    const sourceProps = ['p0', 'p1', 'p2'];
    const derivedFns = [
        { arity: 2, f: ([a, b]) => and(eq(a, 'a'), eq(b, 'b')) },
        { arity: 2, f: ([a, b]) => or(eq(a, 'a'), eq(b, 'c')) },
        { arity: 1, f: ([a]) => a },
        { arity: 2, f: ([a, b]) => ((a === INVALID || b === INVALID) ? INVALID : (a === b)) },
    ];
    
    let accepted = 0, rejected = 0, observed = 0;
    
    for (let trial = 0; trial < TRIALS; trial++) {
        const rng = mulberry32(MASTER + trial);
        const world = makeWorld(), engine = makeEngine(world);
        const cursors = new Map(); // key -> activated observer (so _maxFrontier sees it)
        const trace = [];
        
        const live = () => [...world.logs.keys()];
        const interestingTaus = () => {
            const out = new Set();
            for (const [k, log] of world.logs) { out.add(engine._maxFrontier(k)); for (const e of log.edges) out.add(e.tau); }
            return [...out].filter((t) => Number.isFinite(t));
        };
        // Adversarial: mostly an existing edge/frontier tau (forces equality and
        // cross-key coincidence); sometimes just past a frontier; rarely fresh.
        const pickTau = () => {
            const pool = interestingTaus();
            const r = rng();
            if (pool.length && r < 0.70) return pool[Math.floor(rng() * pool.length)];
            if (pool.length && r < 0.85) return pool[Math.floor(rng() * pool.length)] + 0.1 + rng();
            return rng() * 4;
        };
        const sortedSurfaces = (afterTau, n) => {
            let tau = afterTau; const out = [];
            for (let i = 0; i < n; i++) { tau += 0.05 + rng() * 0.6; out.push({ tau, value: valuePool[Math.floor(rng() * valuePool.length)] }); }
            return out;
        };
        
        for (let step = 0; step < STEPS; step++) {
            const r = rng();
            let op = null;
            
            if (r < 0.25) {                                   // install a base source (if absent)
                const prop = sourceProps[Math.floor(rng() * sourceProps.length)];
                if (world.logs.has(engine._K('e', prop))) continue;
                if (rng() < 0.5) {
                    op = () => engine.install('e', prop, valuePool[Math.floor(rng() * valuePool.length)], sortedSurfaces(rng() * 0.5, Math.floor(rng() * 4)));
                } else {
                    const birth = rng() * 1.5, surf = sortedSurfaces(birth, Math.floor(rng() * 3));
                    const death = rng() < 0.6 ? (surf.length ? surf[surf.length - 1].tau : birth) + 0.3 + rng() : Infinity;
                    op = () => engine.installLifecycle('e', prop, { tauBirth: birth, initialValue: valuePool[Math.floor(rng() * valuePool.length)], surfaces: surf, tauDeath: death });
                }
                trace.push(`install ${prop}`);
            } else if (r < 0.40) {                            // derive over base sources (no cycles possible)
                const srcs = sourceProps.filter((p) => world.logs.has(engine._K('e', p)));
                const dname = ['d0', 'd1'].find((d) => !world.logs.has(engine._K('e', d)));
                const spec = derivedFns[Math.floor(rng() * derivedFns.length)];
                if (!dname || srcs.length < spec.arity) continue;
                const refs = srcs.slice(0, spec.arity).map((p) => ({ id: 'e', prop: p }));
                op = () => makeDerived(engine, world, 'e', dname, refs, spec.f);
                trace.push(`derive ${dname}<-${refs.map((x) => x.prop).join(',')}`);
            } else if (r < 0.60) {                            // observe -- advances a committed frontier; not a mutation
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                if (!cursors.has(k)) cursors.set(k, engine.activate(id, prop, 0.0).cursor);
                cursors.get(k).observe(pickTau());
                observed++;
                continue;                                       // no oracle check around a pure observe
            } else if (r < 0.80) {                            // rebase (10% of the time with unsorted surfaces -> rejection path)
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauCurrent = pickTau(), unsorted = rng() < 0.1;
                op = () => engine.rebase(id, prop, tauCurrent, () => {
                    const s = sortedSurfaces(tauCurrent, 1 + Math.floor(rng() * 3));
                    if (unsorted && s.length >= 2) { const t = s[0].tau; s[0].tau = s[1].tau; s[1].tau = t; }
                    return s;
                });
                trace.push(`rebase ${prop}@${tauCurrent.toFixed(2)}`);
            } else {                                          // terminate
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauDeath = pickTau();
                op = () => engine.terminate(id, prop, tauDeath);
                trace.push(`terminate ${prop}@${tauDeath.toFixed(2)}`);
            }
            
            if (!op) continue;
            
            // ORACLE: the committed prefix of EVERY key is invariant across the op,
            // whether the op is accepted or rejected (a rejection is atomic, so it
            // preserves everything; an acceptance preserves everything at-or-before F).
            const before = snapshotCommitted(world, engine);
            let threw = false;
            try { op(); } catch (e) { threw = true; }
            if (threw) rejected++; else accepted++;
            
            for (const [k, snapBefore] of before) {
                const log = world.logs.get(k);
                assert.ok(log, `key ${k} vanished across an op (no op deletes logs)`);
                assert.deepEqual(prefixBelow(log, snapBefore.F), snapBefore.observable,
                                 `Committed Prefix Preservation violated\n  trial ${trial} (seed 0x${(MASTER + trial).toString(16)}), step ${step}, op: ${trace[trace.length - 1]}\n  key ${k}, F=${snapBefore.F}\n  before cuts: ${JSON.stringify(snapBefore.observable.cuts)}\n  after  cuts: ${JSON.stringify(prefixBelow(log, snapBefore.F).cuts)}`);
            }
        }
    }
    
    console.log(`PASS  V1  committed prefix preserved across ${TRIALS}x${STEPS} adversarial ops (seed 0x${MASTER.toString(16)}; ${accepted} accepted / ${rejected} rejected mutations / ${observed} observes) -- the law T6/T7/T8 witness, now checked as a property`);
}

function V2_committed_prefix_preservation_deep_property() {
    // V1's generator picks derive sources only from sourceProps -- d0/d1 are
    // never eligible as a SOURCE for another derive, so no V1 run can ever
    // construct a derived-on-derived chain or a third-level diamond consumer.
    // That is exactly the depth the cycle, diamond-fan-in, and multi-hop
    // frontier bugs earlier in this kernel's history lived at. Same oracle,
    // same generator shape; the derive step's pool now includes already-
    // created derived names too. Still no cycles are constructible: a name
    // is created once and the pool only ever offers things that already
    // exist, so dependency edges can only point from a brand-new name to
    // something already in the world, never the reverse.
    const MASTER = 0xD33D;
    const TRIALS = 200, STEPS = 60;
    const valuePool = ['a', 'b', 'c', true, false];
    const sourceProps = ['p0', 'p1', 'p2'];
    const derivedNames = ['d0', 'd1', 'd2', 'd3'];
    const derivedFns = [
        { arity: 2, f: ([a, b]) => and(eq(a, 'a'), eq(b, 'b')) },
        { arity: 2, f: ([a, b]) => or(eq(a, 'a'), eq(b, 'c')) },
        { arity: 1, f: ([a]) => a },
        { arity: 2, f: ([a, b]) => ((a === INVALID || b === INVALID) ? INVALID : (a === b)) },
    ];
    
    let accepted = 0, rejected = 0, observed = 0, maxDepthSeen = 0;
    
    for (let trial = 0; trial < TRIALS; trial++) {
        const rng = mulberry32(MASTER + trial);
        const world = makeWorld(), engine = makeEngine(world);
        const cursors = new Map();
        const trace = [];
        const depthOf = new Map(); // key -> dependency depth, for reporting only
        
        const live = () => [...world.logs.keys()];
        const interestingTaus = () => {
            const out = new Set();
            for (const [k, log] of world.logs) { out.add(engine._maxFrontier(k)); for (const e of log.edges) out.add(e.tau); }
            return [...out].filter((t) => Number.isFinite(t));
        };
        const pickTau = () => {
            const pool = interestingTaus();
            const r = rng();
            if (pool.length && r < 0.70) return pool[Math.floor(rng() * pool.length)];
            if (pool.length && r < 0.85) return pool[Math.floor(rng() * pool.length)] + 0.1 + rng();
            return rng() * 4;
        };
        const sortedSurfaces = (afterTau, n) => {
            let tau = afterTau; const out = [];
            for (let i = 0; i < n; i++) { tau += 0.05 + rng() * 0.6; out.push({ tau, value: valuePool[Math.floor(rng() * valuePool.length)] }); }
            return out;
        };
        const sampleDistinct = (arr, n) => {
            const pool = [...arr], out = [];
            for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
            return out;
        };
        
        for (let step = 0; step < STEPS; step++) {
            const r = rng();
            let op = null;
            
            if (r < 0.20) {                                 // install a base source (if absent)
                const prop = sourceProps[Math.floor(rng() * sourceProps.length)];
                if (world.logs.has(engine._K('e', prop))) continue;
                if (rng() < 0.5) {
                    op = () => engine.install('e', prop, valuePool[Math.floor(rng() * valuePool.length)], sortedSurfaces(rng() * 0.5, Math.floor(rng() * 4)));
                } else {
                    const birth = rng() * 1.5, surf = sortedSurfaces(birth, Math.floor(rng() * 3));
                    const death = rng() < 0.6 ? (surf.length ? surf[surf.length - 1].tau : birth) + 0.3 + rng() : Infinity;
                    op = () => engine.installLifecycle('e', prop, { tauBirth: birth, initialValue: valuePool[Math.floor(rng() * valuePool.length)], surfaces: surf, tauDeath: death });
                }
                trace.push(`install ${prop}`);
                depthOf.set(`e:${prop}`, 0);
            } else if (r < 0.45) {                           // derive -- from base OR already-derived nodes
                const pool = [...sourceProps, ...derivedNames].filter((p) => world.logs.has(engine._K('e', p)));
                const dname = derivedNames.find((d) => !world.logs.has(engine._K('e', d)));
                const spec = derivedFns[Math.floor(rng() * derivedFns.length)];
                if (!dname || pool.length < spec.arity) continue;
                const chosen = sampleDistinct(pool, spec.arity);
                const refs = chosen.map((p) => ({ id: 'e', prop: p }));
                const depth = 1 + Math.max(...chosen.map((p) => depthOf.get(`e:${p}`) ?? 0));
                op = () => makeDerived(engine, world, 'e', dname, refs, spec.f);
                trace.push(`derive ${dname}<-${chosen.join(',')} (depth ${depth})`);
                depthOf.set(`e:${dname}`, depth);
                maxDepthSeen = Math.max(maxDepthSeen, depth);
            } else if (r < 0.60) {                           // observe -- not a mutation
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                if (!cursors.has(k)) cursors.set(k, engine.activate(id, prop, 0.0).cursor);
                cursors.get(k).observe(pickTau());
                observed++;
                continue;
            } else if (r < 0.80) {                           // rebase
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauCurrent = pickTau(), unsorted = rng() < 0.1;
                op = () => engine.rebase(id, prop, tauCurrent, () => {
                    const s = sortedSurfaces(tauCurrent, 1 + Math.floor(rng() * 3));
                    if (unsorted && s.length >= 2) { const t = s[0].tau; s[0].tau = s[1].tau; s[1].tau = t; }
                    return s;
                });
                trace.push(`rebase ${prop}@${tauCurrent.toFixed(2)}`);
            } else {                                          // terminate
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauDeath = pickTau();
                op = () => engine.terminate(id, prop, tauDeath);
                trace.push(`terminate ${prop}@${tauDeath.toFixed(2)}`);
            }
            
            if (!op) continue;
            
            const before = snapshotCommitted(world, engine);
            let threw = false;
            try { op(); } catch (e) { threw = true; }
            if (threw) rejected++; else accepted++;
            
            for (const [k, snapBefore] of before) {
                const log = world.logs.get(k);
                assert.ok(log, `key ${k} vanished across an op (no op deletes logs)`);
                assert.deepEqual(prefixBelow(log, snapBefore.F), snapBefore.observable,
                                 `Committed Prefix Preservation violated (deep)\n  trial ${trial} (seed 0x${(MASTER + trial).toString(16)}), step ${step}, op: ${trace[trace.length - 1]}\n  key ${k}, F=${snapBefore.F}\n  before cuts: ${JSON.stringify(snapBefore.observable.cuts)}\n  after  cuts: ${JSON.stringify(prefixBelow(log, snapBefore.F).cuts)}`);
            }
        }
    }
    
    console.log(`PASS  V2  committed prefix preserved with derived-on-derived chains to depth ${maxDepthSeen} across ${TRIALS}x${STEPS} ops (seed 0x${MASTER.toString(16)}; ${accepted} accepted / ${rejected} rejected / ${observed} observes) -- closes V1's depth-1-only generator gap`);
}

function V3_committed_prefix_preservation_multi_observer_property() {
    // V1 -> V2 widened the GRAPH topology the generator could reach. This
    // widens an orthogonal axis: V1 and V2 both ever track at most ONE cursor
    // per key, reused for every observe -- so maxFrontier(key) is, in every
    // run so far, just "that one cursor's position," never a true max over
    // several simultaneously-live, independently-advancing observers. The
    // assertion doesn't change (checking invariance up to max(Fi) already
    // entails checking it up to each Fi individually). What changes is
    // whether the engine's OWN maxFrontier computation, and every guard built
    // on it, is ever exercised with more than one live cursor per key --
    // including a cursor releasing mid-trial, which should legitimately let
    // the region it alone was holding become rewritable again, not leave a
    // phantom constraint behind.
    const MASTER = 0x0B53;
    const TRIALS = 200, STEPS = 70;
    const valuePool = ['a', 'b', 'c', true, false];
    const sourceProps = ['p0', 'p1', 'p2'];
    const derivedNames = ['d0', 'd1', 'd2', 'd3'];
    const derivedFns = [
        { arity: 2, f: ([a, b]) => and(eq(a, 'a'), eq(b, 'b')) },
        { arity: 2, f: ([a, b]) => or(eq(a, 'a'), eq(b, 'c')) },
        { arity: 1, f: ([a]) => a },
        { arity: 2, f: ([a, b]) => ((a === INVALID || b === INVALID) ? INVALID : (a === b)) },
    ];
    
    let accepted = 0, rejected = 0, observed = 0, activated = 0, released = 0, maxObserversSeen = 0;
    
    for (let trial = 0; trial < TRIALS; trial++) {
        const rng = mulberry32(MASTER + trial);
        const world = makeWorld(), engine = makeEngine(world);
        const observersByKey = new Map(); // key -> array of live activated cursors (can be > 1)
        const depthOf = new Map();
        
        const live = () => [...world.logs.keys()];
        const interestingTaus = () => {
            const out = new Set();
            for (const [k, log] of world.logs) { out.add(engine._maxFrontier(k)); for (const e of log.edges) out.add(e.tau); }
            return [...out].filter((t) => Number.isFinite(t));
        };
        const pickTau = () => {
            const pool = interestingTaus();
            const r = rng();
            if (pool.length && r < 0.70) return pool[Math.floor(rng() * pool.length)];
            if (pool.length && r < 0.85) return pool[Math.floor(rng() * pool.length)] + 0.1 + rng();
            return rng() * 4;
        };
        const sortedSurfaces = (afterTau, n) => {
            let tau = afterTau; const out = [];
            for (let i = 0; i < n; i++) { tau += 0.05 + rng() * 0.6; out.push({ tau, value: valuePool[Math.floor(rng() * valuePool.length)] }); }
            return out;
        };
        const sampleDistinct = (arr, n) => {
            const pool = [...arr], out = [];
            for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
            return out;
        };
        
        for (let step = 0; step < STEPS; step++) {
            const r = rng();
            let op = null;
            
            if (r < 0.15) {                                   // install a base source
                const prop = sourceProps[Math.floor(rng() * sourceProps.length)];
                if (world.logs.has(engine._K('e', prop))) continue;
                if (rng() < 0.5) {
                    op = () => engine.install('e', prop, valuePool[Math.floor(rng() * valuePool.length)], sortedSurfaces(rng() * 0.5, Math.floor(rng() * 4)));
                } else {
                    const birth = rng() * 1.5, surf = sortedSurfaces(birth, Math.floor(rng() * 3));
                    const death = rng() < 0.6 ? (surf.length ? surf[surf.length - 1].tau : birth) + 0.3 + rng() : Infinity;
                    op = () => engine.installLifecycle('e', prop, { tauBirth: birth, initialValue: valuePool[Math.floor(rng() * valuePool.length)], surfaces: surf, tauDeath: death });
                }
                depthOf.set(`e:${prop}`, 0);
            } else if (r < 0.40) {                             // derive, base or already-derived (V2's depth extension)
                const pool = [...sourceProps, ...derivedNames].filter((p) => world.logs.has(engine._K('e', p)));
                const dname = derivedNames.find((d) => !world.logs.has(engine._K('e', d)));
                const spec = derivedFns[Math.floor(rng() * derivedFns.length)];
                if (!dname || pool.length < spec.arity) continue;
                const chosen = sampleDistinct(pool, spec.arity);
                const refs = chosen.map((p) => ({ id: 'e', prop: p }));
                const depth = 1 + Math.max(...chosen.map((p) => depthOf.get(`e:${p}`) ?? 0));
                op = () => makeDerived(engine, world, 'e', dname, refs, spec.f);
                depthOf.set(`e:${dname}`, depth);
            } else if (r < 0.55) {                             // activate an ADDITIONAL cursor on some key (not exclusive)
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const startTau = rng() < 0.5 ? 0.0 : pickTau();
                const { cursor } = engine.activate(id, prop, startTau);
                if (!observersByKey.has(k)) observersByKey.set(k, []);
                observersByKey.get(k).push(cursor);
                maxObserversSeen = Math.max(maxObserversSeen, observersByKey.get(k).length);
                activated++;
                continue;
            } else if (r < 0.75) {                             // observe -- pick ONE of possibly several live observers on a key
                const ks = [...observersByKey.keys()].filter((k) => observersByKey.get(k).length);
                if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)];
                const arr = observersByKey.get(k);
                arr[Math.floor(rng() * arr.length)].observe(pickTau());
                observed++;
                continue;
            } else if (r < 0.80) {                             // release one observer -- its constraint must actually vanish
                const ks = [...observersByKey.keys()].filter((k) => observersByKey.get(k).length);
                if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)];
                const arr = observersByKey.get(k);
                const idx = Math.floor(rng() * arr.length);
                arr[idx].release();
                arr.splice(idx, 1);
                released++;
                continue;
            } else if (r < 0.92) {                             // rebase (10% of the time with unsorted surfaces)
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauCurrent = pickTau(), unsorted = rng() < 0.1;
                op = () => engine.rebase(id, prop, tauCurrent, () => {
                    const s = sortedSurfaces(tauCurrent, 1 + Math.floor(rng() * 3));
                    if (unsorted && s.length >= 2) { const t = s[0].tau; s[0].tau = s[1].tau; s[1].tau = t; }
                    return s;
                });
            } else {                                           // terminate
                const ks = live(); if (!ks.length) continue;
                const k = ks[Math.floor(rng() * ks.length)], [id, prop] = k.split(':');
                const tauDeath = pickTau();
                op = () => engine.terminate(id, prop, tauDeath);
            }
            
            if (!op) continue;
            
            // ORACLE: unchanged from V1/V2. The novelty is entirely upstream of
            // this point -- a key's F is now, for the first time, sometimes a
            // genuine max over several live cursors rather than one cursor's own
            // position, and sometimes drops mid-trial because the constraining
            // observer was released.
            const before = snapshotCommitted(world, engine);
            let threw = false;
            try { op(); } catch (e) { threw = true; }
            if (threw) rejected++; else accepted++;
            
            for (const [k, snapBefore] of before) {
                const log = world.logs.get(k);
                assert.ok(log, `key ${k} vanished across an op (no op deletes logs)`);
                assert.deepEqual(prefixBelow(log, snapBefore.F), snapBefore.observable,
                                 `Committed Prefix Preservation violated (multi-observer)\n  trial ${trial} (seed 0x${(MASTER + trial).toString(16)}), step ${step}\n  key ${k}, F=${snapBefore.F}\n  before cuts: ${JSON.stringify(snapBefore.observable.cuts)}\n  after  cuts: ${JSON.stringify(prefixBelow(log, snapBefore.F).cuts)}`);
            }
        }
    }
    
    console.log(`PASS  V3  committed prefix preserved with up to ${maxObserversSeen} simultaneous observers on one key across ${TRIALS}x${STEPS} ops (seed 0x${MASTER.toString(16)}; ${accepted} accepted / ${rejected} rejected / ${observed} observes / ${activated} activations / ${released} releases) -- maxFrontier exercised as a genuine max, and as a genuine drop on release`);
}

// ---------------------------------------------------------------------------
function run() {
    const tests = [
        T1_orient_observe_noninterference,
        T2_from_chaining_multicrossing,
        T3_confluence_structural,
        T4_backward_observe_is_noop,
        T5_rebase_completeness_and_future_rewrite,
        T6_terminate_frontier_guard,
        T7_rebase_atomic_on_unsorted_surfaces,
        T8_frontier_boundary_continuation_vs_discontinuity,
        O1_terminate_is_an_edge,
        O2_three_regimes,
        O3_full_lifecycle_one_cursor,
        D1_edge_minimality,
        D2_dependency_repropagation,
        D2b_no_drop_behind_a_source_rebase,
        D3_definedness_propagates_through_derivation,
        R1_reparametrization_covariance,
        R2_debounce_is_not_canonical,
        R3_covariance_generative,
        P1_cycle_is_detected_not_infinite,
        P2_diamond_fires_exactly_once,
        P3_terminate_propagates_to_derived,
        P4_rejected_propagation_is_atomic,
        P5_coincident_tau_emits_no_phantom,
        P6_coincident_birth_static,
        P7_coincident_birth_via_propagation,
        P8_coincident_derived_recomputes,
        P9_derived_node_refuses_direct_mutation,
        P10_single_writer_closes_all_entry_points,
        P11_install_refuses_reconstruction_of_existing_key,
        V1_committed_prefix_preservation_property,
        V2_committed_prefix_preservation_deep_property,
        V3_committed_prefix_preservation_multi_observer_property,
        V4_release_unblocks_liveness_property,
    ];
    let failed = false;
    for (const t of tests) {
        try { t(); }
        catch (err) { failed = true; console.error(`FAIL  ${t.name}`); console.error(err); }
    }
    process.exitCode = failed ? 1 : 0;
}

run();
