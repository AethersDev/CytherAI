// trajectory-engine-v2.js
//
// Zero dependencies, single file. `node trajectory-engine-v2.js`.
//
// Built in three layers, in the order the dependencies actually run:
//
//   (2) THE LOG SUBSTRATE. Edges are chained ONCE at append, upstream of
//       every reader. A reader is a cursor holding only a tau-position.
//       valueAt() is a pure point query that touches no cursor. This is
//       the Architect's split -- it makes confluence structural and makes
//       both the from-chaining bug and the orient/observe bug impossible
//       to reintroduce.
//
//   (1) DEFINEDNESS AS EDGES. INVALID is a first-class value. A property's
//       domain is bounded by a birth edge (INVALID -> v) and a death edge
//       (v -> INVALID). "Termination" stops being an engine verb that can
//       drop transitions; it is an edge drained by the same cursor as any
//       other. This is layer (2)'s first non-toy proof: zero new mechanism.
//       INDETERMINATE distinguishes "exists, value not yet committed" from
//       INVALID "absent" -- a distinction the old undefined-or-throw model
//       could not make, and the one a derivation needs to answer "what does
//       AND do when an operand hasn't started yet."
//
//   (3) DERIVATION + REPARAMETRIZATION. derived(sources, f) computes its
//       surfaces from the merged source edges, emitting an edge only where
//       f's value actually changes (edge-minimality -- free, because the
//       log drops self-edges). Rebasing a source repropagates as a rebase
//       of the derived log: same drain -> truncate -> append. And the
//       covariance law: a pure-edge stream is invariant under any
//       order-preserving reparametrization phi, which sharpens projection
//       determinism into a theorem -- and draws the line that debounce
//       (which reads the METRIC of tau, not its order) cannot be a
//       canonical property and must live perceptual-side.
//
//   INVARIANT (Committed Prefix Preservation). No accepted operation may change
//   valueAt(tau) for any tau <= F, where F is the maximum consumed frontier over
//   the affected entity AND its transitive dependents. Equivalently: every newly
//   introduced value discontinuity must occur strictly after F. This is phrased
//   in observable semantics, not storage -- an implementation may rewrite future
//   segments, rebalance, or compress surfaces freely, provided the discontinuity
//   set at or before F is unchanged. The frontier rule an operation owes follows
//   from one question -- does it introduce a discontinuity at its own timestamp?
//       continuation  (no change at tau0):  tau0 >= F admissible  -- e.g. rebase
//       discontinuity (a change at tau0):   tau0 >  F required     -- e.g. terminate
//   rebase preserves valueAt at its cut and writes only strictly-future surfaces;
//   terminate writes a death (a change) at its cut. T6/T7/T8 are the witnesses.

'use strict';
// Fail-closed guard. Throws on violation -- browser-native and minifier-safe,
// replacing node:assert (absent in the browser; stripped by minifiers).
function invariant(cond, msg) { if (!cond) throw new Error(msg); }

// ===========================================================================
// 0. Values: ordinary values, plus two distinguished sentinels.
//    INVALID       -- the property does not exist here (before birth / after
//                     death). Strict bottom: it absorbs in derivations.
//    INDETERMINATE -- the property exists but has not committed a value yet.
//                     Kleene middle in boolean derivations.
// ===========================================================================
const INVALID = Symbol('INVALID');
const INDETERMINATE = Symbol('INDETERMINATE');

// Three-valued (Kleene) booleans lifted with INVALID as a strict bottom.
// eq(value, constant): compare a (possibly non-committed/absent) value to a
// concrete constant. and/or are Kleene, but any INVALID operand wins.
function eq(value, constant) {
    if (value === INVALID) return INVALID;
    if (value === INDETERMINATE) return INDETERMINATE;
    return value === constant;
}
function and(p, q) {
    if (p === INVALID || q === INVALID) return INVALID;
    if (p === false || q === false) return false;          // Kleene short-circuit
    if (p === true && q === true) return true;
    return INDETERMINATE;
}
function or(p, q) {
    if (p === INVALID || q === INVALID) return INVALID;
    if (p === true || q === true) return true;             // Kleene short-circuit
    if (p === false && q === false) return false;
    return INDETERMINATE;
}

// ===========================================================================
// (2) THE LOG SUBSTRATE
// ===========================================================================

// First index i with edges[i].tau > tau  (== count of edges with tau <= tau).
function seekAfter(edges, tau) {
    let lo = 0, hi = edges.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (edges[mid].tau <= tau) lo = mid + 1; else hi = mid;
    }
    return lo;
}

// First index i with edges[i].tau >= tau (== count of edges strictly before tau).
function seekFrom(edges, tau) {
    let lo = 0, hi = edges.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (edges[mid].tau < tau) lo = mid + 1; else hi = mid;
    }
    return lo;
}

// Chain a seed value through a sorted list of {tau, value} surfaces into
// {tau, from, to} edges. Chaining happens HERE, once. No reader chains.
function materialize(seedValue, surfaces) {
    let prev = seedValue;
    const out = [];
    for (const s of surfaces) {
        out.push({ tau: s.tau, from: prev, to: s.value });
        prev = s.value;
    }
    return out;
}

function edgeLog(initialValue) {
    // INVARIANT (committed-prefix immutability): edges is immutable up to the
    // consumption frontier of every cursor. Only the future -- strictly past
    // every cursor's position -- is rewritable, by truncateAfter+append. A
    // rebase enforces this by draining all cursors to the frontier FIRST.
    const edges = [];
    const journal = []; // audit trail of rebases/terminations; not value data.
    
    function append(newEdges) {
        for (const e of newEdges) {
            if (Object.is(e.from, e.to)) continue;             // edge-minimality
            const last = edges[edges.length - 1];
            invariant(!last || e.tau >= last.tau, 'append must be monotone in tau');
            edges.push(e);
        }
    }
    
    return {
        get edges() { return edges; },
        get initialValue() { return initialValue; },
        journal,
        append,
        
        // Drop the future. Returns dropped edges (for audit/contrast). Caller
        // is responsible for having drained every cursor to `tau` first, so
        // that what is dropped is provably unconsumed.
        truncateAfter(tau) {
            return edges.splice(seekAfter(edges, tau));
        },
        
        // Drop everything AT OR AFTER tau. Unlike truncateAfter, this also removes
        // an edge sitting exactly on tau -- needed when the value at tau itself is
        // being re-derived (a change landing precisely on the cut, e.g. a death).
        truncateFrom(tau) {
            return edges.splice(seekFrom(edges, tau));
        },
        
        // PURE. Binary search. Touches no cursor. Callable anytime, by anyone,
        // in any order, forever. This is the real "where am I" primitive.
        valueAt(tau) {
            const i = seekAfter(edges, tau);
            return i ? edges[i - 1].to : initialValue;
        },
        
        // The ONLY stateful thing. Born already positioned at tauStart; the
        // only operation it exposes is observe(). Construction is the single
        // moment its start position is set -- there is no second mutating
        // entry point for a bug to hide in.
        cursor(tauStart) {
            let i = seekAfter(edges, tauStart);
            return {
                // Forward-consuming. A backward tau is a safe no-op (returns [],
                // never advances, never rewinds) -- the position is the source of
                // truth, so the "phantom self-edge on rewind" failure mode of a
                // recompute-the-window model simply does not exist here.
                observe(tau) {
                    const out = [];
                    while (i < edges.length && edges[i].tau <= tau) out.push(edges[i++]);
                    return out;
                },
            };
        },
        
        recordJournal(entry) { journal.push(entry); },
    };
}

// World: per-(entity, prop) edge log.
function makeWorld() {
    const logs = new Map();
    const K = (id, p) => `${id}:${p}`;
    return {
        logs,
        getLog(id, prop) { return logs.get(K(id, prop)); },
        setLog(id, prop, log) { logs.set(K(id, prop), log); },
        hasLog(id, prop) { return logs.has(K(id, prop)); },
        deleteLog(id, prop) { logs.delete(K(id, prop)); },
    };
}

// Engine: owns construction, rebasing, cursor tracking, and dependency
// propagation. Never evaluates projections.
function makeEngine(world) {
    const cursorsByKey = new Map();     // key -> Set<tracked cursor>
    const dependentsByKey = new Map();  // sourceKey -> Set<derived node>
    // ===========================================================================
    // SINGLE WRITER PRINCIPLE: every trajectory has exactly one authority
    // responsible for its future evolution.
    //
    //   Primary trajectories: that authority is the lifecycle operations
    //   (install / installLifecycle / rebase / terminate).
    //   Derived trajectories: that authority is propagation (rebaseFrom),
    //   driven exclusively by the node's own sources.
    //
    // No operation may introduce a second authority for an existing
    // trajectory. There are two distinct ways a second authority can arise,
    // and they fail differently:
    //
    //   (a) DIRECT MUTATION on an already-owned trajectory (rebase, terminate,
    //       install, installLifecycle called on a derived key). This is a
    //       BOUNDED shadow: the illegitimate write is visible only until the
    //       next legitimate propagation through that node's real sources,
    //       which recomputes from scratch and overwrites it. After that one
    //       propagation, the trajectory is permanently correct again -- the
    //       corruption window is exactly one write, never longer.
    //
    //   (b) REDEFINING THE AUTHORITY ITSELF (calling makeDerived a second time
    //       on an existing key). This does not shadow-and-heal; it installs a
    //       SECOND, PERMANENTLY LIVE node alongside the first, each still
    //       wired to its own sources, each still firing on every change to
    //       them. The trajectory never becomes stably correct again -- its
    //       value perpetually flips between the two definitions depending on
    //       whichever source changed most recently. Direct mutation corrupts
    //       a value; redefinition corrupts who is allowed to determine it,
    //       which is why it is refused before either definition's machinery
    //       runs, not patched after the fact.
    //
    // derivedKeys is the implementation: keys marked here refuse (a) via
    // rebase/terminate/install/installLifecycle's own guards, and refuse (b)
    // via registerDerived refusing to mark an already-marked key a second time.
    const derivedKeys = new Set();
    const K = (id, p) => `${id}:${p}`;
    
    // The greatest frontier (max observed tau) of any live cursor on a key.
    // Rebase may not rewrite a future a cursor has already consumed, so the
    // rebase point must be >= this. The committed-prefix invariant, fail-closed.
    function maxFrontier(key) {
        let m = -Infinity;
        const set = cursorsByKey.get(key);
        if (set) for (const c of set) m = Math.max(m, c.lastObserved);
        return m;
    }
    
    const engine = {
        world,
        _K: K,
        _maxFrontier: maxFrontier,
        
        // Install a plain (always-defined) trajectory. Construction, like
        // makeDerived, happens exactly once per key -- not because of a second
        // writer (there's only ever one writer here), but because a key with
        // an existing log may already have committed history: re-installing
        // would silently discard it with no error, which is a Committed Prefix
        // Preservation violation, not a Single Writer one. Refused regardless
        // of whether anything has actually observed it yet, for the same
        // reason makeDerived's redefinition guard doesn't wait to see if the
        // first definition was ever used: there's no legitimate use for
        // calling a construction operation twice on one key. Evolving an
        // existing trajectory is what rebase/terminate are for.
        install(id, prop, initialValue, surfaces = []) {
            const key = K(id, prop);
            invariant(!world.hasLog(id, prop),
                   `cannot install "${key}" -- it already exists; construction happens once, re-installing would silently discard any committed history -- use rebase to evolve it instead`);
            const log = edgeLog(initialValue);
            log.append(materialize(initialValue, surfaces));
            world.setLog(id, prop, log);
            return log;
        },
        
        // (1) Install a trajectory with an explicit lifetime. Birth and death
        //     are ordinary edges into/out of INVALID.
        installLifecycle(id, prop, { tauBirth, initialValue, surfaces = [], tauDeath = Infinity }) {
            const key = K(id, prop);
            invariant(!world.hasLog(id, prop),
                   `cannot install "${key}" -- it already exists; construction happens once, re-installing would silently discard any committed history -- use rebase to evolve it instead`);
            const log = edgeLog(INVALID);
            const lastValue = surfaces.length ? surfaces[surfaces.length - 1].value : initialValue;
            log.append([
                { tau: tauBirth, from: INVALID, to: initialValue },
                ...materialize(initialValue, surfaces),
                ...(Number.isFinite(tauDeath) ? [{ tau: tauDeath, from: lastValue, to: INVALID }] : []),
            ]);
            world.setLog(id, prop, log);
            return log;
        },
        
        // "construct -> orient" as one atomic step: a positioned cursor plus
        // the current value (read PURELY, via valueAt -- no shared position).
        activate(id, prop, tauStart) {
            const log = world.getLog(id, prop);
            const raw = log.cursor(tauStart);
            const key = K(id, prop);
            if (!cursorsByKey.has(key)) cursorsByKey.set(key, new Set());
            const c = {
                entityId: id, prop,
                lastObserved: tauStart, // consumed frontier; starts at birth position
                observe(t) {
                    const ev = raw.observe(t);
                    if (t > this.lastObserved) this.lastObserved = t;
                    return ev;
                },
                release() { cursorsByKey.get(key)?.delete(c); },
            };
            cursorsByKey.get(key).add(c);
            return { cursor: c, value: log.valueAt(tauStart) };
        },
        
        // Pure orientation, callable anytime by anything.
        whereIs(id, prop, tau) { return world.getLog(id, prop).valueAt(tau); },
        
        // drain all cursors to frontier -> truncate future -> append new.
        // Because draining advances every cursor to exactly the truncation
        // point, drain-exhaustiveness is structural: everything past tauCurrent
        // is provably unconsumed, so replacing it can drop nothing.
        // Rewrite the FUTURE only: truncate strictly past tauCurrent, append the
        // new surfaces. The committed prefix (<= tauCurrent) is never touched, so
        // a consumer behind tauCurrent flows across the rebase and receives every
        // pre-rebase transition AND the new future through its own observe() --
        // edge-completeness is structural, not a drain. (If a caller wants to
        // route announcements synchronously, it does an explicit observe(tauCurrent)
        // BEFORE rebasing; that is a read, kept separate from the write.)
        rebase(id, prop, tauCurrent, makeSurfaces) {
            const key = K(id, prop);
            invariant(!derivedKeys.has(key),
                   `cannot rebase "${key}" directly -- it is a derived node, owned by its own rebaseFrom; ` +
                   `writing into it directly creates a second, uncoordinated writer that the next source-triggered propagation can silently overwrite`);
            const log = world.getLog(id, prop);
            // ---- VALIDATE EVERYTHING FIRST. No log is mutated until every check
            //      that can reject this operation has passed, so a rejected rebase
            //      (over-consumed frontier anywhere downstream, a dependency cycle,
            //      or an ill-formed surface) leaves the entire ledger untouched.
            invariant(tauCurrent >= maxFrontier(key), 'cannot rebase a future a cursor has already consumed');
            const plan = engine._planPropagation(key, tauCurrent); // cycle + all dependent frontiers
            // valueAt(tauCurrent) is invariant under truncating strictly past it,
            // so the seed and the surfaces can be computed/validated pre-mutation.
            const seed = log.valueAt(tauCurrent);
            const surfaces = makeSurfaces(seed, tauCurrent) || [];
            // Validate BOTH the lower bound AND the order between surfaces here,
            // pre-commit. Monotonicity was previously caught only by append's assert
            // -- which runs AFTER truncateAfter has already dropped the future, so an
            // unsorted makeSurfaces left the log half-rewritten. Hoisted, so the same
            // input is rejected with the ledger untouched.
            for (let i = 0; i < surfaces.length; i++) {
                invariant(surfaces[i].tau > tauCurrent, 'rebased surfaces must lie strictly in the future');
                invariant(i === 0 || surfaces[i].tau >= surfaces[i - 1].tau, 'rebased surfaces must be monotone in tau');
            }
            // ---- COMMIT. From here nothing can throw on a precondition. ----
            const droppedFuture = log.truncateAfter(tauCurrent);
            log.append(materialize(seed, surfaces));
            log.recordJournal({ kind: 'rebase', tau: tauCurrent, seed, droppedFuture, installed: surfaces });
            const dependentDropped = engine._runPropagation(plan, tauCurrent);
            return { droppedFuture, dependentDropped };
        },
        
        // Propagate a source change to every transitively-dependent derived
        // node EXACTLY ONCE, in dependency order -- instead of recursing into
        // each dependent depth-first. The recursive version had two failure
        // modes: (a) a true cycle in the dependency graph recursed without
        // bound; (b) a diamond (two derived nodes sharing a source, feeding a
        // third) fired the downstream node once per incoming path, each time
        // with whichever sibling hadn't been updated yet. Both are fixed by
        // the same mechanism: collect the full affected set with cycle
        // detection, then process it in topological order.
        // PLAN: pure. Collects the affected subgraph, detects cycles, verifies
        // every affected node's frontier, and produces a topological order --
        // WITHOUT mutating anything. Any rejection here happens before its caller
        // has touched a single log, which is what makes the whole operation atomic.
        _planPropagation(rootKey, tauCurrent) {
            const affected = new Map();   // key -> node, the full transitive closure
            const color = new Map();      // key -> 'gray' (in progress) | 'black' (done)
            
            function visit(key) {
                if (color.get(key) === 'black') return;
                if (color.get(key) === 'gray') {
                    throw new Error(`derivation cycle detected at "${key}" -- a derived node cannot (transitively) depend on itself`);
                }
                color.set(key, 'gray');
                const deps = dependentsByKey.get(key);
                if (deps) {
                    for (const node of deps) {
                        const nodeKey = K(node.id, node.prop);
                        affected.set(nodeKey, node);
                        visit(nodeKey);
                    }
                }
                color.set(key, 'black');
            }
            visit(rootKey);
            
            // Frontier check for the whole affected set, up front -- so a consumer
            // sitting ahead of tauCurrent ANYWHERE downstream rejects the operation
            // before the root is rewritten, not halfway through propagation.
            for (const k of affected.keys()) {
                invariant(tauCurrent >= maxFrontier(k),
                       `cannot rebase a future a cursor has already consumed (downstream node "${k}")`);
            }
            
            // Kahn's algorithm, restricted to edges between two affected nodes --
            // an edge from outside the affected set (the root itself, or an
            // untouched independent source) doesn't constrain order, since that
            // side is already current.
            const keys = [...affected.keys()];
            const inDegree = new Map(keys.map((k) => [k, 0]));
            const downstream = new Map(keys.map((k) => [k, []]));
            for (const [k, node] of affected) {
                for (const srcKey of node.sourceKeys) {
                    if (affected.has(srcKey)) {
                        downstream.get(srcKey).push(k);
                        inDegree.set(k, inDegree.get(k) + 1);
                    }
                }
            }
            const queue = keys.filter((k) => inDegree.get(k) === 0);
            const order = [];
            while (queue.length) {
                const k = queue.shift();
                order.push(k);
                for (const next of downstream.get(k)) {
                    inDegree.set(next, inDegree.get(next) - 1);
                    if (inDegree.get(next) === 0) queue.push(next);
                }
            }
            // visit() already proved acyclic, so Kahn must consume every node.
            // Asserted (not commented) because it costs nothing and a residual
            // cycle here would otherwise silently drop a node's recompute.
            invariant(order.length === keys.length, 'topological sort incomplete -- residual cycle in affected set');
            
            return { affected, order };
        },
        
        // APPLY: drives each node's rebaseFrom once, in dependency order. Called
        // only after the root has been committed and the plan has already proven
        // none of these can reject on a precondition.
        _runPropagation(plan, tauCurrent) {
            const dropped = [];
            for (const k of plan.order) dropped.push(...plan.affected.get(k).rebaseFrom(tauCurrent));
            return dropped;
        },
        
        
        // (1) Termination is sugar over an edge append -- drainable through the
        //     same cursor as any other transition, no special path. It also
        //     propagates, exactly like rebase: a derived node watching a source
        //     that dies must see that death, not keep reporting its last
        //     pre-death value forever. Idempotent: a second terminate appends
        //     INVALID->INVALID, dropped as a self-edge.
        terminate(id, prop, tauDeath) {
            const key = K(id, prop);
            invariant(!derivedKeys.has(key),
                   `cannot terminate "${key}" directly -- it is a derived node; its lifetime is determined by its sources ` +
                   `(when every path through f is forced to INVALID), not written directly -- a direct death here doesn't ` +
                   `stick: the next source-triggered propagation recomputes it fresh from f with no memory of this termination`);
            const log = world.getLog(id, prop);
            // Validate everything BEFORE appending the death edge, so a rejected
            // termination leaves the source alive and untouched rather than half-dead.
            // A death is a value DISCONTINUITY at tauDeath -- the edge changes
            // valueAt(tauDeath) -- so, unlike rebase (a continuation that preserves
            // valueAt at its cut and may sit AT a frontier), the death must land
            // STRICTLY after every consumed frontier it could touch: the source's own
            // (here) and every transitive dependent's (the loop below). At equality a
            // death would revise a committed valueAt. See Committed Prefix Preservation.
            invariant(tauDeath > maxFrontier(key), 'cannot terminate at or behind a consumed frontier');
            const plan = engine._planPropagation(key, tauDeath);
            for (const depKey of plan.affected.keys()) {
                invariant(tauDeath > maxFrontier(depKey), 'cannot terminate at or behind a downstream consumed frontier');
            }
            log.append([{ tau: tauDeath, from: log.valueAt(tauDeath), to: INVALID }]);
            log.recordJournal({ kind: 'terminate', tau: tauDeath });
            const dependentDropped = engine._runPropagation(plan, tauDeath);
            return { dependentDropped };
        },
        
        registerDependent(sourceKeys, node) {
            for (const sk of sourceKeys) {
                if (!dependentsByKey.has(sk)) dependentsByKey.set(sk, new Set());
                dependentsByKey.get(sk).add(node);
            }
        },
        
        // Marks a key as derived-owned -- rebase/terminate refuse to write to it
        // directly. Called once, by makeDerived, at the moment a derived log is
        // created.
        _isDerived: (key) => derivedKeys.has(key),
        
        // Marks a key as derived-owned -- rebase/install/terminate refuse to
        // write to it directly. Refuses to mark an already-derived key a
        // second time: redefining it would leave the FIRST definition's
        // registration in dependentsByKey stale but still live, which is the
        // same dual-writer hazard one level earlier -- the stale node's
        // rebaseFrom still fires on its own (now-orphaned) sources and writes
        // into whatever log currently sits at this key.
        registerDerived(key) {
            invariant(!derivedKeys.has(key),
                   `cannot redefine "${key}" -- it is already a derived node; the previous definition's registration would go stale but stay live`);
            derivedKeys.add(key);
        },
    };
    return engine;
}

// ===========================================================================
// (3) DERIVATION + REPARAMETRIZATION
// ===========================================================================

function breakpointsOf(sources, after = -Infinity) {
    const bps = new Set();
    for (const log of sources) for (const e of log.edges) if (e.tau > after) bps.add(e.tau);
    return [...bps].sort((a, b) => a - b);
}

// Compute the (initial, surfaces) of f over the sources. A surface is
// emitted ONLY where f's value changes -- edge-minimality. f receives the
// tuple of current source values, which may include INVALID/INDETERMINATE;
// the lattice in section 0 gives those a principled answer.
function deriveSurfaces(sources, f, after, seed) {
    const fromStart = after === undefined;
    const initial = fromStart ? f(sources.map((s) => s.valueAt(-Infinity))) : seed;
    let prev = initial;
    const surfaces = [];
    for (const tau of breakpointsOf(sources, fromStart ? -Infinity : after)) {
        const v = f(sources.map((s) => s.valueAt(tau)));
        if (!Object.is(v, prev)) { surfaces.push({ tau, value: v }); prev = v; }
    }
    return { initial, surfaces };
}

// A derived trajectory: a log whose content is a pure function of its
// sources' logs, kept consistent under source rebase via the SAME
// drain->truncate->append the engine uses.
function makeDerived(engine, world, id, prop, sourceRefs, f) {
    const key = engine._K(id, prop);
    invariant(!engine._isDerived(key),
           `cannot redefine "${key}" -- it is already a derived node; the previous definition's registration would go stale but stay live`);
    const sourceLogs = () => sourceRefs.map((r) => world.getLog(r.id, r.prop));
    const sourceKeys = sourceRefs.map((r) => engine._K(r.id, r.prop));
    
    const { initial, surfaces } = deriveSurfaces(sourceLogs(), f);
    const log = edgeLog(initial);
    log.append(materialize(initial, surfaces));
    world.setLog(id, prop, log);
    
    const node = {
        id, prop, sourceKeys,
        // Recomputes THIS node's own future from its current sources. Does
        // not cascade itself -- the engine's _propagate collects the whole
        // affected set up front and drives every node's rebaseFrom exactly
        // once, in dependency order.
        rebaseFrom(tauCurrent) {
            const key = engine._K(id, prop);
            invariant(tauCurrent >= engine._maxFrontier(key), 'cannot rebase a derived future a cursor has already consumed');
            const dlog = world.getLog(id, prop);
            // Truncate AT OR AFTER tauCurrent. An edge sitting exactly on the cut is
            // stale too: a source change landing precisely at tauCurrent -- a death
            // is the canonical case, but also any sibling source whose own edge
            // coincides with tauCurrent -- can invalidate it, so it must be
            // re-derived, not preserved. truncateAfter (strict >) kept it, which
            // stacked the boundary edge ON TOP of a stale edge and emitted a phantom
            // intermediate value the node never actually holds. After truncateFrom,
            // valueAt(tauCurrent) is the value strictly BEFORE the cut -- the correct
            // `from` for the boundary edge.
            const droppedFuture = dlog.truncateFrom(tauCurrent);
            const oldAtTau = dlog.valueAt(tauCurrent); // value just before the cut
            // Recompute f fresh against CURRENT source values at tauCurrent --
            // not dlog.valueAt(tauCurrent), which is this node's own pre-update
            // value. The two agree whenever the triggering change lies strictly
            // after tauCurrent (every ordinary rebase). They disagree when a
            // source changes exactly AT tauCurrent -- what a death edge does --
            // because breakpointsOf's strict tau > after excludes an edge sitting
            // exactly at the boundary.
            const seed = f(sourceLogs().map((s) => s.valueAt(tauCurrent)));
            const { surfaces: fut } = deriveSurfaces(sourceLogs(), f, tauCurrent, seed);
            // The boundary transition itself (oldAtTau -> seed) has to be an
            // explicit edge, not just a different starting point for chaining
            // the future -- otherwise a change that lands exactly at tauCurrent
            // with no further future surfaces is computed correctly into `seed`
            // and then never written anywhere. append()'s own self-edge drop
            // makes this a no-op in the ordinary case (oldAtTau === seed).
            dlog.append([{ tau: tauCurrent, from: oldAtTau, to: seed }, ...materialize(seed, fut)]);
            dlog.recordJournal({ kind: 'derived-rebase', tau: tauCurrent });
            return droppedFuture;
        },
    };
    engine.registerDependent(sourceKeys, node);
    engine.registerDerived(engine._K(id, prop));
    return node;
}

// Reparametrize a log through a strictly-increasing phi: ℝ -> ℝ. Order is
// preserved, so the result is a valid log carrying identical from/to values.
function reparametrize(log, phi) {
    const out = edgeLog(log.initialValue);
    out.append(log.edges.map((e) => ({ from: e.from, to: e.to, tau: phi(e.tau) })));
    return out;
}

// Debounce: a PERCEPTUAL-side post-processor. An edge survives only if the
// value it introduces persists at least `delta` (in whatever parametrization
// the events are expressed) before the next edge or `endTau`. It reads the
// METRIC of tau -- which is exactly why it cannot be a canonical property.
function debounce(events, delta, endTau) {
    const out = [];
    for (let i = 0; i < events.length; i++) {
        const nextTau = (i + 1 < events.length) ? events[i + 1].tau : endTau;
        if (nextTau - events[i].tau >= delta) out.push(events[i]);
    }
    return out;
}

// ---- exports: node (require) + browser (<script> -> globalThis.CytherEngine) ----
const __api = { INVALID, INDETERMINATE, eq, and, or, seekAfter, materialize, edgeLog, makeWorld, makeEngine, breakpointsOf, deriveSurfaces, makeDerived, reparametrize, debounce };
if (typeof module !== "undefined" && module.exports) module.exports = __api;
if (typeof globalThis !== "undefined") globalThis.CytherEngine = __api;
