'use strict';
/**
 * profiles/disclosure.js — POSITIONING AS A REAL ENGINE DERIVATION GRAPH
 *
 * CytherAI's published positioning logic, executed by the engine's own
 * makeDerived / propagation machinery (not hand-written functions). The same
 * graph both (a) computes each exhibit's disclosure tier — so the badges are
 * genuinely engine-derived and cannot drift — and (b) backs the live §06 panel
 * where moving an input repropagates the whole chain, with INVALID flowing
 * through as genuine absence.
 *
 * These derivation functions are PUBLISHED CLAIMS. Changing them changes the
 * company's stated position, not demo tuning.
 *
 *   architecture = f(environment, dependency)
 *   validation   = f(architecture, evaluation)
 *   deployability= f(validation, environment)      (diamond: env feeds two nodes)
 *   disclosure   = f(deployability)                 → tier
 *
 * SECURITY BOUNDARY unchanged: genuinely restricted content is INVALID/absent
 * in content/record.js; a profile projects that absence, never hides a value.
 */
(function (global) {
  var E = global.CytherEngine || (typeof require !== 'undefined' ? require('../engine/trajectory-engine.js') : null);
  if (!E) throw new Error('disclosure.js: CytherEngine not loaded — engine must come first');
  var INVALID = E.INVALID, INDETERMINATE = E.INDETERMINATE;

  var TIER = { PUBLIC: 'Public Surface', QUALIFIED: 'Qualified Access', RESTRICTED: 'Restricted Appendix', DILIGENCE: 'Technical Diligence' };

  // input domains for the live panel (first value = default)
  var DOMAINS = {
    environment: ['cloud', 'air-gapped'],
    dependency: ['coupled', 'zero'],
    evaluation: ['ungated', 'gated'],
  };

  // ── the published derivation functions (over the engine's three-valued lattice) ──
  function fArch(a) { var env = a[0], dep = a[1]; if (env === INVALID || dep === INVALID) return INVALID; if (dep !== 'zero') return 'coupled'; return env === 'air-gapped' ? 'sovereign' : 'portable'; }
  function fVal(a) { var arch = a[0], evl = a[1]; if (arch === INVALID || evl === INVALID) return INVALID; if (evl !== 'gated') return INVALID; return arch === 'coupled' ? INDETERMINATE : 'log-verified'; }
  function fDeploy(a) { var val = a[0], env = a[1]; if (val === INVALID) return INVALID; if (val !== 'log-verified') return INDETERMINATE; return env === 'air-gapped' ? 'sovereign-ready' : 'deployable'; }
  function fDisc(a) { var d = a[0]; if (d === INVALID) return 'restricted'; if (d === INDETERMINATE) return 'qualified'; return 'public'; }

  // ── build the graph in a world: 3 source trajectories + 4 derived nodes ──
  function buildModel(world, eng, init) {
    eng.install('m', 'env', init.environment);
    eng.install('m', 'dep', init.dependency);
    eng.install('m', 'evl', init.evaluation);
    E.makeDerived(eng, world, 'm', 'architecture', [{ id: 'm', prop: 'env' }, { id: 'm', prop: 'dep' }], fArch);
    E.makeDerived(eng, world, 'm', 'validation', [{ id: 'm', prop: 'architecture' }, { id: 'm', prop: 'evl' }], fVal);
    E.makeDerived(eng, world, 'm', 'deployability', [{ id: 'm', prop: 'validation' }, { id: 'm', prop: 'env' }], fDeploy);
    E.makeDerived(eng, world, 'm', 'disclosure', [{ id: 'm', prop: 'deployability' }], fDisc);
    return { sources: ['env', 'dep', 'evl'], derived: ['architecture', 'validation', 'deployability', 'disclosure'] };
  }

  // ── tier of an exhibit, GENUINELY engine-derived from its facts ──
  function computeDisclosure(facts) {
    if (facts.restricted) return TIER.RESTRICTED;                 // content is INVALID/absent, gated out of band
    var world = E.makeWorld(), eng = E.makeEngine(world);
    buildModel(world, eng, { environment: facts.environment, dependency: facts.dependency, evaluation: facts.evaluation });
    var d = eng.whereIs('m', 'disclosure', 0);                    // sources are constant → value is the derived constant
    return d === 'public' ? TIER.PUBLIC : d === 'qualified' ? TIER.QUALIFIED : TIER.RESTRICTED;
  }

  function project(value) {
    if (value === INVALID) return { sealed: true, text: 'Sealed pending access grant' };
    if (value === INDETERMINATE) return { pending: true, text: '——' };
    return { value: value };
  }

  var api = { TIER, DOMAINS, fArch: fArch, fVal: fVal, fDeploy: fDeploy, fDisc: fDisc, buildModel: buildModel, computeDisclosure: computeDisclosure, project: project };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CytherProfiles = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
