# 00 — Repository Baseline

**Audit timestamp:** 2026-08-03T05:36:17Z → 2026-08-03T~06:00Z (UTC)
**Auditor:** Claude (read-only production + design audit; no application files modified)
**Scope:** working tree at `/Users/malek/Desktop/cytherwebsite`

---

## 1. Git state

| Item | Value |
|---|---|
| Commit SHA | `02deb5c7de1d5171e2af1c8baa20e59988605b2d` |
| Branch | `master` (repo config names `main` as PR default; no remote exists) |
| Working tree | Dirty by exactly one file: `M backup/.DS_Store` (Finder metadata, binary) |
| HEAD subject | `P9.2 — reading-law refinements across all four axes` |
| Remote | None (`git init` local-only, per PRODUCTION_PLAN.md §0) |

Recent history (context for provenance): `0758f9f substrate v1 · production` → `61db53e structural audit — production fixes` → `393f2c9 repo hygiene` → `2a8b160 P8 plate grammar` → `582b897 design record` → `0ceff13 P9` → `92de86f P9.1` → `02deb5c P9.2`.

Note: despite commit `393f2c9` ("untrack .DS_Store") and `.gitignore` containing `.DS_Store`, three `.DS_Store` files remain **tracked**: `backup/.DS_Store`, `newC3/.DS_Store`, `trajectory-engine/.DS_Store`. The single dirty file in the tree is one of these.

---

## 2. Technology inventory

| Dimension | Fact |
|---|---|
| Framework | None. Pure static site. Hand-written HTML5 + vanilla JS + CSS. |
| Language | JavaScript (classic scripts, IIFE modules exporting `window.*` globals; no ES modules, no TypeScript) |
| Package manager | None. No `package.json`, no lockfile, no `node_modules`. |
| Build system | None. One bash script, `generate-integrity.sh` (SRI + build-hash stamping; BSD sed, openssl, shasum). |
| Test framework | None site-wide. The separate engine project ships its own zero-dependency test file (`engine/trajectory-engine.test.js`, 33 tests) executed by `pages/runner.html` in-browser. |
| Lint / type-check | None. |
| JS verification harness | `jsc` (JavaScriptCore CLI, `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`) — project convention: SyntaxError = fail; ReferenceError on a browser global = pass. |
| Local serving | `python3 -m http.server 8000` from repo root. |
| Browser APIs used | Canvas 2D, `requestAnimationFrame`, Pointer Events, IntersectionObserver, MutationObserver, Resource Timing, Clipboard, `history.replaceState`, `sessionStorage`, Service Worker, `matchMedia(prefers-reduced-motion)`. |
| CSS features used | `color-mix(in srgb, …)`, `backdrop-filter`, CSS custom properties written per-frame from JS, `clamp()`, mask-composite, variable `font-weight` on system fonts. No external fonts, no images, no CDNs. |
| Offline | `sw.js` cache-first service worker; cache name carries the build hash (`cytherai-substrate-F15692A67C90783D`) so each build installs atomically. |
| Deployment | **Not represented in the repo.** No host config, no headers file, no CI, no deploy manifest, no robots.txt/sitemap. Hosting decision is explicitly still owed by the owner (PRODUCTION_PLAN.md §10). |

---

## 3. Repository structure

```
/                          shipped site root
├── index.html             homepage — the disclosure engine (671 ln, inline <style>, 6 deferred SRI-pinned modules)
├── contact.html           contact page (inline form script — the one allowed inline <script>)
├── pages/                 brief · privacy · security · terms (static, css/cytherai.css) · runner (engine test page)
├── js/                    manifest.js · substrate.js · claims.js · ledger.js · instrument.js · site.js  (homepage stack)
│   └── console.js         engine-stack file — referenced by NO html (see audit ARCH-001)
├── css/cytherai.css       subpage stylesheet (163 ln, cold flat register)
├── sw.js                  service worker (cache-first, build-stamped cache name)
├── manifest.webmanifest   PWA manifest (CytherAI, standalone, icon.svg)
├── icon.svg               favicon/PWA icon — retired warm-gold lambda mark (see audit ADV-001)
├── generate-integrity.sh  SRI + build-hash patcher (12 resources, 7 HTML files)
├── engine/                trajectory-engine.js (+ .test.js) — separate project, loaded only by pages/runner.html
├── content/record.js      engine-stack; referenced by NO html
├── profiles/disclosure.js engine-stack; referenced by NO html
├── PRODUCTION_PLAN.md     authoritative build spec (P1–P7 done; §9 checklist; §10 owner-owed data)
├── CLAUDE.md              project instructions (register rules, architecture map)
├── newC3/                 design record (prototypes → synthesis rev5 → substrate-demo → plate renderer) — DO NOT MODIFY
│   └── epoch04-preimage.txt   demo commitment preimage — sha256 equals the published epoch-04 digest (see audit DEF-002)
├── backup/                retired surfaces (graphite-v2 homepage, dossier-v3 css/js, 8 old brand-system HTML files)
├── trajectory-engine/     tracked v2 engine sandbox (5 HTML + v2 engine + design map) — not linked from the site
└── awc-os/                untracked, .gitignored (separate media project; out of audit scope)
```

Tracked file count: 52. Homepage payload (index.html + 6 modules): **127,017 bytes uncompressed, zero external requests**.

---

## 4. Route / page inventory

### Shipped (linked) routes

| Route | Source | JS | CSP script-src | Notes |
|---|---|---|---|---|
| `/` → `index.html` | 671 ln, inline style only | 6 external modules, `defer`, SRI + crossorigin | `'self'` (no inline) | The disclosure engine. Registers `sw.js` on load (`js/site.js:420`). |
| `/contact.html` | 315 ln | one inline script (validation, copy-email) | `'self' 'unsafe-inline'` | mailto:-action form; deployment note in comment (lines 33–44). |
| `/pages/brief.html` | 163 ln | none | `'self' 'unsafe-inline'` (unused) | DOC-2026-002 capability brief; archival-document register. |
| `/pages/privacy.html` | 92 ln | none | `'self' 'unsafe-inline'` (unused) | Legal prose, inline styles. |
| `/pages/security.html` | 97 ln | none | `'self' 'unsafe-inline'` (unused) | Disclosure policy. |
| `/pages/terms.html` | 78 ln | none | `'self' 'unsafe-inline'` (unused) | Legal prose. |
| `/pages/runner.html` | 90 ln | inline shim + engine + test (SRI) | `'self' 'unsafe-inline'` | Linked from nowhere in the shipped site (verified by grep); reachable by URL. **Currently reports false success — see DEF-001.** |

### Tracked but unlinked (would deploy if the whole tree is published)

- `backup/` — 14 HTML surfaces incl. `graphite-v2/index.html` (old homepage) and 8 retired brand-system pages carrying the banned warm/gold register (`d4af37`/`E7DFD1` hits confirmed by grep).
- `newC3/` — 9 prototype HTML files + `epoch04-preimage.txt`.
- `trajectory-engine/` — 5 HTML sandboxes (`homepage.html` is an older gold-accent homepage concept: `--you:#d9b65c`).

### Module load graph (homepage)

`js/manifest.js` (`CytherManifest`) → `js/substrate.js` (`CytherSubstrate`) → `js/claims.js` (`CytherClaims`) → `js/ledger.js` (`CytherLedger`) → `js/instrument.js` (`CytherInstrument`) → `js/site.js` (glue, no exports). All pure logic loads under jsc; DOM wiring guarded behind `typeof document`.

---

## 5. Validation commands executed, with results

All commands were non-destructive. Temp harness files were written to the session scratchpad (`$CLAUDE_JOB_DIR/tmp`), never into the repo.

| # | Command | Result |
|---|---|---|
| 1 | `git rev-parse HEAD; git status --porcelain; git log` | SHA `02deb5c…`; tree dirty only by `M backup/.DS_Store`. |
| 2 | `jsc <file>` for all 6 homepage modules + `js/console.js`, `content/record.js`, `profiles/disclosure.js`, `engine/trajectory-engine.js` | **PASS** — zero SyntaxErrors. (`console.js` throws ReferenceError `addEventListener`; `record.js`/`disclosure.js` throw their own fail-loud "engine must come first" Errors — expected without the engine preloaded.) |
| 3 | jsc claims harness (`manifest.js substrate.js claims.js ledger.js instrument.js` + scratch harness) | **All PASS**: checksum re-derives to published `75D1:89D1`; CL-03 (3 admissions re-derived, nonces 0/0/0 match); CL-06 worst 5.33:1 (dark ink, depth 48%, phase-locked); CL-06b text-lane 0.189 ≤ 0.57; CL-07 max \|dsin−sin\| 5.6e-8; CL-08 4 anchors re-derived ≡ canonical camera; CL-05 10,000 proposals · 35 admitted · 0 invalid (seed 02); collapsed-params camera all-finite with span floor 0.001; mailto body begins `READING SELF-REPORT` + carries `NOT INDEPENDENTLY VERIFIABLE`; diligence count excludes `PAGE_OPENED`. |
| 4 | SRI verification: `openssl dgst -sha384 -binary <file> \| openssl base64 -A` vs every `integrity=` attribute in all 7 HTML files | **All 12 resources match** (css ×5 refs, six js modules ×1, engine + test ×1 in runner.html; record.js/disclosure.js/console.js have 0 HTML refs). |
| 5 | Build-hash recompute (concat SRI fingerprint → sha256 → 16 hex) | Recomputed `F15692A67C90783D` = stamped meta in index.html = `sw.js` CACHE suffix. **Consistent.** But the meta exists **only in index.html** — the other 6 HTML files have no `build-hash` meta (script's sed silently no-ops; see DEF-004). |
| 6 | §9.2 grep `https?://` across shipped files | **0 matches** (zero external references). |
| 7 | §9.3 banned-register grep (`−540 · CONDUCT RECEIPT · Append-only · 1e-12 · --gold · d4af37 · 94\.5 · DOC-2026-001 · PROTOTYPE`) across `index.html css js contact.html pages sw.js` | **0 matches.** (Hits exist only inside `backup/`, `newC3/`, `trajectory-engine/` — the archived/record directories.) |
| 8 | `grep var(--brass)` | 17 usages across contact.html + 4 pages; `--brass` is defined in `css/cytherai.css:21` as an alias of `#2036C7` (renders correctly cold-blue; naming debt only). |
| 9 | HTTP smoke test: `python3 -m http.server 8123` + `curl` every sw.js ASSETS entry + `/` | **All 23 URLs return 200.** |
| 10 | Skip-link grep per page | Present: index.html, pages/brief.html, pages/runner.html. **Absent: contact.html, privacy, security, terms.** |
| 11 | Secondary-text WCAG harness (jsc, alpha-composited `color-mix` values vs `CytherSubstrate` ambient model) | At surface (#ECF0F4): 55% mixes = 3.88:1, 58% = 4.26:1 (below AA); 66%+ pass. At depth 1.44 (48% scroll, worst pre-flip): 80% body mixes = **4.03:1**, 70% = 3.40:1, 55% = 2.58:1 — all below AA 4.5:1. Primary reading ink (CL-06 model) at same depth: 5.33:1 (passes; CL-06 covers only primary ink by design). Full table in `01-production-audit.md` A11Y-001. |
| 12 | `shasum -a 256 newC3/epoch04-preimage.txt` | `c763fcd5faecb8c568c60f6b42f3b968babb95a5aa9c55593cf96e963187439d` — **exactly equals** the published epoch-04 commitment digest in `js/manifest.js:68`, while the floor prints "PREIMAGE SEALED". See DEF-002. |
| 13 | Engine test suite under jsc, replicating the runner.html shim | **`SyntaxError: Can't create duplicate variable: 'INDETERMINATE'`** — the test file's top-level `const {INVALID, INDETERMINATE, …}` collides with the engine's top-level `const` declarations in the shared classic-script global scope. Minimal repro confirmed (`const FOO` in file A + `const {FOO}` in file B → same error). See DEF-001. |
| 14 | Same suite with the engine wrapped in a scratch IIFE (repo untouched) | **33/33 PASS, 0 failures** — the suite itself is healthy; only the loading arrangement is broken. |

---

## 6. Inspection limitations (what was NOT executed)

Per the machine's constraints (no Node, no Chrome, no Playwright — PRODUCTION_PLAN.md §0), the following are **static inference only**, not executed evidence:

1. **No real-browser run.** The Safari manual checklist (PRODUCTION_PLAN.md §9 manual list: full-descent scroll, network-tab-empty, fork gestures, hold-to-cross variants, reduced-motion pass, mobile layout) was not performed. jsc executes JavaScriptCore — the same engine Safari uses — so JS-semantics findings (DEF-001) carry high confidence, but rendering, layout, compositing, gesture, and service-worker behavior were not observed.
2. **Service worker runtime** was not executed. REL-001 (root-navigation cache miss) is derived from the Cache API's exact-URL matching semantics, not from an observed failure.
3. **Visual output** (plate rendering, contrast as actually composited over the plate ink, envelope blur, corridor placement) was not screenshotted. The contrast harness (cmd 11) measures the *ambient CSS model* — the same model CL-06 uses — not per-pixel rendered ground.
4. `awc-os/` (untracked, gitignored, contains .pptx/.mp4 media) was not inspected beyond listing.
5. `backup/` and `newC3/` HTML was characterized by grep, not read exhaustively (they are the frozen design record).
6. `js/console.js`, `content/record.js`, `profiles/disclosure.js` internals were not deep-read (they are dead from every shipped page — verified by grep — and belong to the separate engine project).
7. Real-device performance/memory (4 full-viewport canvases + retained density fields) was not measured.

---

## 7. Current baseline risks (summary — details and IDs in 01-production-audit.md)

1. **`pages/runner.html` is a false-positive verification page** (DEF-001, executed evidence): the test script never parses, and the summary displays "✓ 0 / 0 passed · mutation-verified". For a site whose law is *nothing is stated that is not checked*, this is the highest-priority defect.
2. **The epoch-04 commitment preimage is public in the tree** while the page prints "PREIMAGE SEALED" (DEF-002, executed sha256 match). Marked PROVISIONAL in code, but it is a launch gate.
3. **No deployment layer exists in the repo**: publishing the tree as-is would ship 20+ retired/prototype HTML surfaces (including old gold-register branding), the preimage file, and no server security headers (SEC-001/SEC-003).
4. **Secondary-text contrast falls below WCAG AA** in the pre-flip descent band, measured against the site's own ambient model (A11Y-001).
5. **Offline navigation to `/` misses the precache** under the exact-match Cache API semantics (REL-001).
6. Assorted low-severity debt: build-hash meta only on index.html, privacy-policy wording vs `sessionStorage`, dead precache entries, `--brass` alias, missing skip links, tracked `.DS_Store` files.

The homepage engine itself — derivation, claims, admission, SRI, register, external-request hygiene — **verified clean across every executed check**.
