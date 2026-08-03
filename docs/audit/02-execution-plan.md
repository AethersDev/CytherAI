# 02 — Execution Plan (for a fresh Claude Opus session)

**Input state:** commit `02deb5c7de1d5171e2af1c8baa20e59988605b2d`, branch `master`, tree dirty only by `M backup/.DS_Store`.
**Authority chain:** PRODUCTION_PLAN.md governs design; CLAUDE.md governs register + workflow; this plan converts `01-production-audit.md` into ordered work. Where this plan and the audit disagree, re-read the audit's evidence first.

**Standing rules for every phase (do not restate per phase):**

- Never modify `newC3/`, `backup/`, `trajectory-engine/`, `engine/trajectory-engine.js`, `engine/trajectory-engine.test.js`, `content/record.js`, `profiles/disclosure.js`, `js/console.js`, `PRODUCTION_PLAN.md`, or anything in `awc-os/`.
- After changing any file listed in `generate-integrity.sh` RESOURCES, run `./generate-integrity.sh` in the same change set. After changing only `sw.js`, bump the CACHE suffix manually (e.g. `-r2`) since the script derives the hash from RESOURCES only.
- Verify JS with `jsc` (`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`): SyntaxError = fail; ReferenceError on a browser global = pass. Scratch harnesses go to the session scratchpad, never into the repo.
- The **standard battery** (run at the end of every phase, ~1 min):
  1. `jsc js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js` — no SyntaxError.
  2. jsc claims harness (recreate from audit baseline §5 cmd 3) — all predicates PASS, checksum `75D1:89D1` unless a manifest data edit was intended.
  3. SRI check: every `integrity=` attribute matches `openssl dgst -sha384 -binary <f> | openssl base64 -A`.
  4. Register grep: `grep -rnE '−540|CONDUCT RECEIPT|Append-only|1e-12|--gold|d4af37|94\.5|DOC-2026-001|PROTOTYPE' index.html css js contact.html pages sw.js` → 0.
  5. External-ref grep: `grep -rnE 'https?://' index.html contact.html pages css js sw.js manifest.webmanifest` → 0.
  6. Serve (`python3 -m http.server 8000`) + curl the sw.js ASSETS list → all 200.
- Commit per phase, message format below; one phase = one commit unless a phase says otherwise. Do not fold unrelated cleanups into a phase.
- **Stop condition (global):** any standard-battery failure you did not intentionally cause → stop, diagnose, do not proceed to the next phase.

---

## MANDATORY PHASES

### Phase 0 — Repo hygiene: restore a clean, reproducible baseline

- **Objective:** a clean `git status` so every later diff is exactly the phase's work.
- **Closes:** ARCH-005.
- **Preconditions:** none.
- **Sequence:**
  1. `git rm --cached backup/.DS_Store newC3/.DS_Store trajectory-engine/.DS_Store` (files stay on disk; `.gitignore` already covers them).
  2. Run the standard battery to record the baseline (expect: all green; this re-executes the audit's evidence).
- **Files changed:** index only (three deletions from tracking). **Must not change:** any file content.
- **Validation:** `git status --porcelain` → only the three staged deletions; `git ls-files | grep DS_Store` → empty after commit.
- **Regression tests:** standard battery.
- **Observable result:** clean tree; battery green.
- **Rollback:** `git reset HEAD~1` (files were never deleted from disk).
- **Definition of done:** clean status; battery recorded green in the commit body.
- **Commit:** `hygiene — untrack .DS_Store residue; clean-tree baseline for the audit plan`

### Phase 1 — Build provenance: stamp build-hash across all HTML

- **Objective:** every shipped HTML file carries the build hash; the integrity script can no longer silently no-op.
- **Closes:** DEF-004.
- **Preconditions:** Phase 0.
- **Sequence:**
  1. Insert `<meta name="build-hash" content="">` into the `<head>` of `contact.html`, `pages/brief.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`, `pages/runner.html` (mirror index.html:12 placement).
  2. In `generate-integrity.sh`, after the meta-patch loop, add a fail-loud check: `grep -q 'name="build-hash" content="'"$BUILD_HASH"'"' "$HTML" || { echo "  ERROR: $HTML missing build-hash meta" >&2; exit 1; }`.
  3. `./generate-integrity.sh` — expect exit 0, all 7 files ✓.
- **Files changed:** the 6 HTML files, `generate-integrity.sh`. **Must not change:** `sw.js` CACHE (resources unchanged → same hash `F15692A67C90783D`), any `js/*`, `css/*`.
- **Validation:** `grep -h 'build-hash' index.html contact.html pages/*.html | sort -u` → exactly one line, content `F15692A67C90783D`; standard battery.
- **Regression tests:** SRI check (attributes must be untouched — the sed patterns are file-targeted; diff must show only meta lines).
- **Observable result:** 7/7 pages provenance-stamped.
- **Rollback:** `git checkout -- .` before commit; `git revert` after.
- **Stop:** if the script rewrites any `integrity=` attribute to a new value → resources changed unexpectedly → stop and diff.
- **Commit:** `DEF-004 — build-hash meta on every shipped page; integrity script fails loud on a missing tag`

### Phase 2 — Fix the false-positive verification page

- **Objective:** `pages/runner.html` actually runs the 33-test suite and can never report success with zero tests.
- **Closes:** DEF-001.
- **Preconditions:** Phase 0. Read the audit DEF-001 evidence first.
- **Sequence:**
  1. In `pages/runner.html`, add `type="module"` to three scripts: the inline shim, the `engine/trajectory-engine.js` tag, and the `engine/trajectory-engine.test.js` tag. (Module top-level `const` is module-scoped — this alone removes the collision. The engine's `typeof module` guard is safe in an ES module — `module` is undefined there — and it still assigns `globalThis.CytherEngine`. The test's `require(...)` resolves to the shim's `window.require`.)
  2. Make the summary script a module as well (modules execute in document order after parsing, so it runs after the tests) and guard it: `var ok = (p > 0 && f === 0 && code === 0);` — also change its failure text to cover the zero-test case, e.g. `p === 0 ? '✕ 0 tests executed — suite failed to load' : …`.
  3. Note: `defer`-like timing of modules means the shim must still run before the engine — keep document order; do not add `async`.
  4. Verify under jsc that nothing in the two engine files breaks as modules is impossible (jsc CLI runs classic scripts) — instead verify in Safari (step below), and re-run the audit's scratch-IIFE jsc harness to confirm the suite still passes 33/33 in isolation.
- **Files changed:** `pages/runner.html` only. **Must not change:** `engine/*` (shared with the engine project), SRI attributes (resource bytes unchanged).
- **Validation commands:** `python3 -m http.server 8000` → open `http://localhost:8000/pages/runner.html` in Safari: expect 33 green PASS lines and `✓ 33 / 33 passed · exitCode 0`. Then a red-path check: copy runner.html + engine to a scratch dir outside the repo, falsify one assertion, confirm the summary goes red; delete the scratch.
- **Regression tests:** standard battery; confirm runner.html's two SRI attributes still match (`openssl dgst`).
- **Observable result:** a working, honestly-labeled verification page.
- **Rollback:** `git revert` the commit.
- **Stop conditions:** if Safari shows a CSP violation for module scripts (it should not — `script-src 'self' 'unsafe-inline'` covers them) or an SRI failure → stop, do not weaken CSP or drop SRI to make it pass.
- **Commit:** `DEF-001 — runner.html: module-scope the suite so it executes; summary can no longer pass with zero tests`

### Phase 3 — Deploy artifact: allowlist, preimage exclusion, headers spec

- **Objective:** a deterministic published artifact that ships only the site, and a written contract for the server headers the repo cannot express.
- **Closes:** SEC-003, DEF-002 (control a), SEC-001 (spec half). DEF-002's control (b) — the real commitment digest — stays owner-owed (deferred register).
- **Preconditions:** Phases 0–2.
- **Sequence:**
  1. Create `deploy.sh` (repo root, `chmod +x`, BSD-portable) that rsyncs an allowlist into `dist/`: `index.html contact.html pages/ js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js css/ engine/trajectory-engine.js engine/trajectory-engine.test.js sw.js manifest.webmanifest icon.svg` — *nothing else*. (`js/console.js` is intentionally absent — dead; see Phase 9. `dist/` gets a `.gitignore` entry.)
  2. Create `docs/deploy.md`: header contract (`Content-Security-Policy: frame-ancestors 'none'`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` **final domain only**, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`), MIME notes (`.webmanifest → application/manifest+json`, `sw.js` served with `Service-Worker-Allowed` not needed at root), and the launch gate checklist (see gate section below).
  3. Add `dist/` to `.gitignore`.
- **Files changed:** new `deploy.sh`, new `docs/deploy.md`, `.gitignore` (+1 line). **Must not change:** any shipped file; `newC3/` and `backup/` stay in the repo untouched (they are the record; they are simply not published).
- **Validation:** `./deploy.sh && find dist -type f | sort` → exactly the allowlist; `test ! -e dist/newC3 && test ! -e dist/backup && test ! -e dist/trajectory-engine`; `cd dist && python3 -m http.server 8001` → curl the sw ASSETS list → all 200; curl `/newC3/epoch04-preimage.txt` → 404.
- **Regression tests:** standard battery (unchanged site files).
- **Observable result:** `dist/` is the complete, minimal, publishable site.
- **Rollback:** delete `dist/`, revert commit.
- **Stop:** if any sw ASSET 404s from `dist/` — the allowlist and ASSETS have drifted; fix the allowlist, never sw.js, in this phase.
- **Commit:** `SEC-003 — deploy allowlist: the published artifact is the site, not the archive; headers contract in docs/deploy.md`

### Phase 4 — Subpage CSP tightening

- **Objective:** subpages carry the strictest CSP their content allows.
- **Closes:** SEC-002.
- **Preconditions:** Phase 0.
- **Sequence:**
  1. `pages/brief.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`: change `script-src 'self' 'unsafe-inline'` → `script-src 'none'`; append `; object-src 'none'; base-uri 'self'`.
  2. `contact.html`: keep `script-src 'self' 'unsafe-inline'` (its inline script is sanctioned by CLAUDE.md); append `; object-src 'none'; base-uri 'self'`. Attempt `form-action 'self' mailto:` and TEST the form submit in Safari; if the mail client no longer opens, drop the `form-action` directive and add an HTML comment stating why.
  3. `pages/runner.html`: append `; object-src 'none'; base-uri 'self'`.
- **Files changed:** those 6 HTML files (meta line each). **Must not change:** index.html CSP (already strictest), any JS/CSS.
- **Validation:** open each page locally with the console open → zero CSP violations; contact form submit opens mail client; runner still passes 33/33.
- **Regression tests:** standard battery.
- **Observable result:** identical rendering, tighter policy.
- **Rollback:** revert commit.
- **Stop:** any CSP violation in console you cannot attribute → stop; do not paper over with a broader source list.
- **Commit:** `SEC-002 — subpage CSP: script-src 'none' where no script exists; object-src/base-uri everywhere`

### Phase 5 — Claims integrity: privacy wording matches the code

- **Objective:** every statement on the privacy page is checkably true.
- **Closes:** DEF-003.
- **Preconditions:** none.
- **Sequence:** in `pages/privacy.html` §2, replace the bullet `No cookies or local storage tokens` with: `No cookies. No persistent storage. One session-scoped display preference (the reading-optics mode) lives in sessionStorage on your device, is never transmitted, and dies with the tab.` Adjust §1 if needed for consistency (it is not — form/mail only; leave it).
- **Files changed:** `pages/privacy.html` (one bullet). **Must not change:** `js/site.js` (the feature is P9-specified; do not delete it to "fix" the sentence).
- **Validation:** re-read the page; `grep -c "local storage tokens" pages/privacy.html` → 0; standard battery.
- **Observable result:** policy text states exactly what `js/site.js:108-113` does.
- **Rollback:** revert. **Stop:** n/a.
- **Commit:** `DEF-003 — privacy states the sessionStorage fact; nothing claimed that the code contradicts`

### Phase 6 — Service worker: root navigation + deliberate offline failure

- **Objective:** offline navigation to `/` serves the precached index; uncached offline requests fail deliberately, not accidentally.
- **Closes:** REL-001; documents REL-002's state (no code change for the form).
- **Preconditions:** Phase 0. Read sw.js:60-83 and the audit REL-001 first.
- **Sequence:**
  1. In the fetch handler, before the generic path: `if (e.request.mode === 'navigate') { var u = new URL(e.request.url); if (u.pathname === '/' || u.pathname.endsWith('/')) { e.respondWith(caches.match(u.pathname + 'index.html').then(function (r) { return r || fetch(e.request); }).catch(function () { return caches.match('index.html'); })); return; } }` — smallest change honoring the flat layout; do not add a global navigation fallback that could mask real 404s.
  2. Append `.catch(function () { return Response.error(); })` to the network branch so an offline miss rejects deliberately.
  3. Manually bump the cache suffix: `var CACHE = 'cytherai-substrate-F15692A67C90783D-r2';` with a comment `/* -rN: sw-logic revision; base stays the resource build hash */`.
- **Files changed:** `sw.js` only. **Must not change:** ASSETS list (Phase 9 owns that), `generate-integrity.sh`.
- **Validation (Safari):** load site → Storage shows the `-r2` cache and the old one deleted; offline → navigate to `http://localhost:8000/` → homepage renders; offline navigate to an uncached path → clean failure. `jsc sw.js` → ReferenceError on `self` (pass).
- **Regression tests:** standard battery; online reload works; claims all HOLDING (CL-01 unaffected — SW serves same-origin only).
- **Observable result:** offline root navigation works after any single online visit.
- **Rollback:** revert; the next activate deletes the `-r2` cache for returning clients automatically? — No: reverting re-installs the old name; verify activate cleans `-r2`. It does (`names.filter(n => n !== CACHE)`).
- **Stop:** any doubt about update atomicity → stop and re-read sw.js:60-62's invariant comment before proceeding.
- **Commit:** `REL-001 — sw: root navigations resolve to the precached index; offline misses fail deliberately`

### Phase 7 — Accessibility: skip links + heading outline

- **Objective:** keyboard/SR navigation is complete on every page.
- **Closes:** A11Y-002, A11Y-003.
- **Preconditions:** Phase 0.
- **Sequence:**
  1. Copy brief.html's skip link (`<a class="skip-link" href="#main-content">Skip to main content</a>`) as first body child into `contact.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`.
  2. index.html: change the three `.path h4` (lines ~577–587) to `h3`, and update the style selector `.path h4` (index.html:212) to `.path h3` in the same edit.
  3. index.html: give the sealed and floor sections real headings without visual change — wrap the existing zone-label text: `<h2 class="zone-label env" …>` for `#sealed`'s label (:552) and `#floor`'s (:597); confirm `.zone-label`'s styles neutralize h2 defaults (`font-size/margin` are set; add `font-weight:inherit` if Safari shows bolding).
- **Files changed:** `index.html`, `contact.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`. **Must not change:** any JS (zone detection uses section ids, not headings — `js/site.js:34-42` unaffected).
- **Validation:** VoiceOver rotor: headings list = thesis h1 → six h2 strata (definition/architecture/measurement/sealed/clearance/floor) → h3s under architecture/clearance; Tab-from-URL-bar shows the skip link on all 6 content pages; visual diff of the hero/clearance/floor is pixel-identical (screenshot compare by eye).
- **Regression tests:** standard battery.
- **Rollback:** revert. **Stop:** any visible layout change from the h4→h3 swap → the selector edit was missed.
- **Commit:** `A11Y-002/003 — skip links on every page; heading outline matches the descent`

### Phase 8 — Accessibility: secondary-text contrast floors

- **Objective:** every meaningful text layer ≥ 4.5:1 at every depth against the ambient model, without flattening the four-layer hierarchy.
- **Closes:** A11Y-001.
- **Preconditions:** Phases 0, 7. **Read first:** audit A11Y-001 table; index.html:288-352 (the P9 reading-law CSS); `js/site.js:56-83`; `js/substrate.js:137-157`.
- **Sequence:**
  1. Recreate the audit's contrast harness in the scratchpad; extend it to sweep every shipped alpha × d∈[0,3] step 0.01 under the phase-correct ink (dark below SW_DOWN, light above SW_UP, membrane in flip).
  2. Surface phase: raise floors — 45%→60%, 55%→62%, 58%→65% (keep 66/70/72/80 as-is at surface; they pass). Preserve the *ordering* of layers.
  3. Pre-flip band (the executed failure at d≈1.0–1.44): the cleanest design-preserving fix is to lower `READING.SW_DOWN`/`SW_UP` so the ink flips before the ambient mid-greys swallow dark ink — try SW_DOWN 1.20 / SW_UP 1.11 in the harness FIRST; CL-06 must still pass (it re-derives from these constants — `js/substrate.js:144`, checked at `js/claims.js:40-55`). If the earlier flip degrades the visual (membrane appears sooner), the alternative is a `body`-level depth-conditioned mix lift mirroring index.html:330-342 for dark ink, driven by a `data-band` attribute set in `readingUpdate()` when `d > 1.0`. Choose whichever passes the harness with the smaller diff; record the choice and the new worst-case numbers in the style-block comment (house style: constants carry their derivation).
  4. Optional but recommended: add CL-06c (`SECONDARY INK ≥4.5:1 OR EXEMPT`) to `js/claims.js` encoding the harness — the fix then self-verifies on every page load. If added, footer text auto-updates (`CLAIMS n/10`); check CLAUDE.md's "n/9" sentence and update it in the same commit.
  5. Run `./generate-integrity.sh` (js/css bytes changed).
- **Files changed:** `index.html` (style), possibly `js/substrate.js` (READING constants) or `js/site.js` (band attr), optionally `js/claims.js`, then all 7 HTML via integrity restamp, `sw.js` (new CACHE via script), possibly `CLAUDE.md` (claim count). **Must not change:** the plate renderer, ambient keyframes (BGS/PANELS/ACCENTS are locked §4.1).
- **Validation:** harness sweep → zero meaningful-text failures (decorative 28%/40% exempt, documented); jsc claims harness → all HOLDING including CL-06 with its *new* worst-case detail; manual Safari descent — the hierarchy must still read as four layers.
- **Regression tests:** full standard battery + CL-06/CL-06b specifically.
- **Observable result:** AA-clean descent; claims table proves it live.
- **Rollback:** revert commit (integrity restamp reverts with it).
- **Stop conditions:** CL-06 INVALID at any depth → the constants and CSS have diverged — stop and reconcile; any locked token (§4.1) would need changing → stop, that requires owner sign-off.
- **Commit:** `A11Y-001 — reading-law floors: secondary ink holds AA at every depth; harness numbers in the style block`

### Phase 9 — Prune dead precache; correct the architecture doc

- **Objective:** the cache, the fingerprint, and the documentation all describe the same serving graph.
- **Closes:** ARCH-001, DEF-005.
- **Preconditions:** Phases 0–8 (do this late — it changes the build hash).
- **Sequence:**
  1. `sw.js`: remove `content/record.js`, `profiles/disclosure.js`, `js/console.js` from ASSETS (three lines).
  2. `generate-integrity.sh`: remove the same three from RESOURCES.
  3. `./generate-integrity.sh` → new build hash stamps all 7 HTML + sw.js CACHE (drop the `-r2` suffix now — the base hash itself changes; keep the `-rN` comment convention for future sw-only edits).
  4. CLAUDE.md: correct the engine-stack sentence: engine/* served only by pages/runner.html; record.js/disclosure.js/console.js retained on disk for the engine project, served by nothing.
- **Files changed:** `sw.js`, `generate-integrity.sh`, `CLAUDE.md`, all 7 HTML (restamp). **Must not change:** the three dead files themselves (they stay on disk).
- **Validation:** standard battery; serve → sw ASSETS all 200; `pages/runner.html` still 33/33 (its two files remain hashed + cached); new CACHE name ≠ old.
- **Rollback:** revert (restamp reverts too).
- **Stop:** runner.html failing after the prune → you removed an engine file by mistake.
- **Commit:** `ARCH-001 — precache and fingerprint describe only what is served; CLAUDE.md matches the graph`

### Phase 10 (recommended) — Retire the `--brass` alias

- **Objective:** the retired token name no longer appears in shipped files.
- **Closes:** ARCH-002.
- **Sequence:** replace all 17 `var(--brass)` → `var(--accent)` in `contact.html`, `pages/{brief,privacy,security,terms}.html`; delete `--brass` and the unused `--seal` from `css/cytherai.css:21`; `./generate-integrity.sh` (css changed).
- **Files changed:** 5 HTML, `css/cytherai.css`, restamp side-effects. **Must not change:** `pages/runner.html` (its `--seal` is its own local palette).
- **Validation:** `grep -rn "brass" index.html contact.html pages css js` → 0; visual check: identical colors (both were `#2036C7`).
- **Commit:** `ARCH-002 — --brass retired in fact, not just in intent; accent is the only signal token`

---

## OPTIONAL ADVANCEMENT PHASES (separate track; never mixed with the above)

### Phase 11 — Subpage navigation completeness (ADV-005 / ARCH-006, + ARCH-004)

Add the `.nav-links` list (CSS already exists unused at `css/cytherai.css:54-56`) to each subpage nav: Brief · Contact · Security · Privacy · Terms, `aria-current="page"` on self; add Brief + Contact to subpage footers; drop the dead `.js-year` class (keep the static year). Files: `contact.html`, 4 pages. Validation: every page reaches every page in one click; `aria-current` styling renders (already styled :56). Commit: `ADV-005 — no dead ends: every public page reaches every public page`.

### Phase 12 — Derived icon (ADV-001)

Preferred path: a scratch jsc/canvas script renders the canonical orbit far-field to a 512 monochrome path/bitmap → hand-reduce to `icon.svg` (cold: `#101620` on `#ECF0F4`, accent `#2036C7` only if it survives 16px). Alternative: adopt a generated concept from `04-generation-prompt-pack.md` IMG-002 after owner review. Update `manifest.webmanifest` (add a `maskable` purpose entry), keep filename `icon.svg` (precache + integrity untouched — icon.svg is not in RESOURCES; sw ASSETS name unchanged, but bytes change → bump CACHE `-rN`). Validation: favicon renders at 16/32px; PWA install icon correct; register grep clean (no warm hexes). **Owner sign-off required before commit** (brand identity). Commit: `ADV-001 — the icon is the mark: derived, cold, current`.

### Phase 13 — Link-preview + crawler surface (ADV-002, ADV-003, ADV-004)

Requires the final domain (open question Q1). Add `og:image` (asset per IMG-001, stored `assets/og/og-card.png`, referenced from index.html + subpages), `og:url`, `<link rel="canonical">`, `twitter:card`; create `404.html` in the flat register; `robots.txt` + `sitemap.xml` into `deploy.sh`'s allowlist; host 404 mapping per `docs/deploy.md`. Note: og:image lives outside the page render — the colophon's "no images" claim (index.html:634) stays true; state this in the commit body. Validation: a link-preview debugger shows the card; curl a junk path on staging → styled 404. Commit: `ADV-002/003/004 — the mark travels: link preview, canonical, crawler files, 404`.

### Phase 14 — Contact transport (ADV-006 / REL-002)

Requires hosting with a form endpoint (Q2). Implement the deployment note at contact.html:33-44: same-origin POST handler; keep `connect-src 'none'` (plain form POST, no fetch); on success redirect to a static `contact-received.html` in-register; keep mailto + copy-email as the no-JS fallback path. Validation: submit round-trip on staging; CSP clean. Commit: `ADV-006 — contact transmits without a mail client; zero external requests preserved`.

### Phase 15 (opportunistic, no standalone commit) — Inline-style consolidation (ARCH-003)

Whenever a later change touches a subpage: hoist its repeated inline styles into `css/cytherai.css` classes, delete brief.html's duplicated `<style>` rules, remove the three stray `border-radius` (contact.html:129, :181; security.html:40). Report net line delta per the house doctrine.

---

## Dependency graph

```
P0 hygiene
 ├─→ P1 build-hash ──→ (independent)
 ├─→ P2 runner fix ──────────────┐
 ├─→ P3 deploy artifact ─────────┤
 ├─→ P4 subpage CSP              ├─→ LAUNCH GATE
 ├─→ P5 privacy wording          │
 ├─→ P6 sw navigation            │
 ├─→ P7 skip/headings ─→ P8 contrast
 └────────────────────→ P9 precache prune (after P8; changes build hash last)
                               └─→ P10 --brass
P11..P15 optional; P13 blocked on Q1 (domain); P14 blocked on Q2 (host); P12 blocked on owner sign-off.
Owner-owed (outside any phase): real epoch-04 commitment (DEF-002b), real manifest data (plan §10).
```

## Critical path (to a publishable artifact)

**P0 → P2 → P3** (plus the owner replacing the epoch-04 digest). Everything else improves the artifact; these three make publishing non-false.

## Production-readiness gate (all must hold before the site goes public)

1. `pages/runner.html` shows 33/33 in Safari (P2).
2. `dist/` contains exactly the allowlist; `/newC3/epoch04-preimage.txt` 404s on staging (P3).
3. Host serves the `docs/deploy.md` headers; `curl -sI` verified (SEC-001).
4. Owner has replaced the epoch-04 digest with one whose preimage is private (`js/manifest.js` data edit), OR the commitment chip is removed from the shipped manifest data until then. The page must not print `PREIMAGE SEALED` about an open preimage.
5. Standard battery green at the release commit; claims 9/9 (or 10/10) HOLDING in a served browser check.
6. PROVISIONAL manifest values reviewed by the owner — shipping them knowingly is permitted (they are marked in source), but the owner must decide, not default.

## Final complete verification sequence (release candidate)

```
git status --porcelain                    # empty
./generate-integrity.sh                   # exit 0, idempotent (second run = no diff)
git diff --exit-code                      # proves idempotence
jsc <6 modules>                           # parse
jsc claims harness                        # 9(10)/9(10) PASS, checksum matches source
jsc contrast sweep harness                # zero meaningful-text AA failures (post-P8)
SRI + build-hash greps                    # all match, 7/7 pages
register + external-ref greps             # 0 matches
./deploy.sh && (cd dist && python3 -m http.server 8001)
curl every sw ASSET → 200; /newC3/… → 404; /backup/… → 404
Safari manual list (PRODUCTION_PLAN.md §9): descent, claims HOLDING, network tab empty,
  fork+return, capture link, hold-to-cross ×3 input modes, proposer + 10k audit,
  reduced-motion pass, 390px pass, runner 33/33, offline root navigation (post-P6)
```

## Deferred-work register

| Item | Source | Why deferred |
|---|---|---|
| Real epoch-01/02 history, real counts, real commitment preimage, real claims-ledger IDs | PRODUCTION_PLAN §10, DEF-002b | Owner-supplied data; data-only edits in `js/manifest.js` |
| PERF-001 device memory measurement | audit PERF-001 | Needs a physical device session; no change without measurement |
| ARCH-003 subpage style consolidation | audit ARCH-003 | Opportunistic only (P15) |
| A11Y-004 keyboard fork nudges | audit A11Y-004 | Optional parity nicety |
| Arabic projection, co-derived mark, per-system geology pages, command palette, WebCrypto conduct chain | PRODUCTION_PLAN §2.4 | Explicitly out of scope phase-2 items |
| `trajectory-engine/` v2 sandbox disposition (archive into backup/ vs keep) | audit SEC-003 context | Owner call; publishing is already prevented by P3 |
| Real PGP key for security.html's "available upon request" | pages/security.html | Owner-owned credential |

## Open questions (could not be resolved from the repository)

1. **Q1 — Final domain + host.** No hosting target exists anywhere in the repo (PRODUCTION_PLAN §10 confirms undecided). Blocks canonical/og:url, HSTS, 404 mapping, robots/sitemap.
2. **Q2 — Contact transport decision.** The file prescribes a same-origin handler "for production" — whether v-launch keeps mailto or waits for a host function is an owner call.
3. **Q3 — Is `pages/runner.html` meant to be publicly linked?** It is shipped and reachable but linked from nowhere. If it is part of the public trust story, link it (e.g. from the floor colophon); if not, consider whether it belongs in the deploy artifact at all. The audit fixed its correctness either way.
4. **Q4 — Epoch-04 launch semantics.** Should the commitment chip ship at launch with a *new real* digest, or be withheld until the first real pre-registration event? Both are data-only edits; the current demo state cannot ship.
5. **Q5 — `awc-os/`** shares the working tree but is gitignored: confirm it never enters any deploy path from this directory.
