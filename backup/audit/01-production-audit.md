# 01 — Production Audit

**Baseline:** commit `02deb5c7de1d5171e2af1c8baa20e59988605b2d` (see `00-repository-baseline.md` for commands and raw results).
**Evidence statuses used:** `executed` (command run in this audit, result recorded) · `statically verified` (exact code/spec reading, no runtime) · `hypothesis` (plausible, unproven — never presented as established).

Severity scale: Critical (breaks the product's core promise) · High · Medium · Low · Info.

---

## Section 1 — Demonstrated defects

### DEF-001 · `pages/runner.html` reports verification success while running zero tests

- **Classification:** Correctness / trust integrity
- **Severity:** High (Critical relative to the page's own purpose)
- **Confidence:** High
- **Evidence status:** **Executed** (jsc = JavaScriptCore, the engine Safari uses; plus a minimal two-file repro; plus a bypassed run proving the suite itself is healthy). A live-browser confirmation was not performed — see baseline §6.1.
- **Evidence:**
  - `engine/trajectory-engine.js:60-61` declares top-level `const INVALID`, `const INDETERMINATE` (and more at line 619).
  - `engine/trajectory-engine.test.js:3` re-declares them: `const { INVALID, INDETERMINATE, … } = require('./trajectory-engine.js');`
  - Both load as **classic scripts** in `pages/runner.html` (script tags near the file end), and classic scripts share the global lexical environment — the second script fails at parse time. Executed: `jsc shim.js engine.js test.js` → `SyntaxError: Can't create duplicate variable: 'INDETERMINATE'`. Minimal repro (`const FOO` / `const {FOO}` in two files) throws identically.
  - `pages/runner.html` summary script: `var ok=(f===0&&code===0)` with no `p>0` guard → with zero tests parsed, it renders **“✓  0 / 0 passed · exitCode 0  ·  mutation-verified”**.
  - Counter-evidence that the suite is fine: wrapped in a scratch IIFE, **33/33 tests PASS, 0 failures** (executed).
- **Reproduction:** `jsc /tmp/shim.js engine/trajectory-engine.js engine/trajectory-engine.test.js` with a shim replicating runner.html's inline `require`/`assert` (or simply open `pages/runner.html` in Safari and observe an empty `#out` with a green summary).
- **Consequence:** The page whose entire function is “reproduce the result” displays a green, affirmative verification banner backed by zero executed assertions. It directly violates the site's printed law (*Nothing is stated that is not checked*) and would mislead any diligence reader who finds the URL.
- **Recommended correction (minimal):** load the three scripts in `pages/runner.html` as ES modules (`type="module"` on the shim, engine, and test tags — module top-level `const` is module-scoped; the engine already exports via `globalThis.CytherEngine` when `module` is undefined, and the shim's `window.require` remains reachable), make the summary script a module too so it runs after them in document order, and guard the summary: `ok = (p > 0 && f === 0 && code === 0)`. Do not modify `engine/trajectory-engine.js` or the test file (shared with the engine project).
- **Files affected:** `pages/runner.html` only.
- **Verification:** serve locally, open in Safari: expect 33 PASS lines and “✓ 33 / 33 passed”. Also re-run the jsc harness. Temporarily falsify one assertion in a scratch copy to confirm the red path.
- **Regression risk:** Low — page is self-contained; SRI attributes are unaffected (resource bytes unchanged).
- **Dependencies:** none.
- **Blocks production:** **Yes** — or, minimally, the page must be excluded from the deploy until fixed (it is currently reachable but unlinked).

### DEF-002 · Epoch-04 commitment preimage is public while the page prints "PREIMAGE SEALED"

- **Classification:** Security / data integrity of the disclosure record
- **Severity:** High for public launch; Info for local development (the value is explicitly PROVISIONAL)
- **Confidence:** High
- **Evidence status:** **Executed** — `shasum -a 256 newC3/epoch04-preimage.txt` = `c763fcd5faecb8c568c60f6b42f3b968babb95a5aa9c55593cf96e963187439d`, byte-identical to the digest at `js/manifest.js:68`. The floor chip renders `PREIMAGE SEALED` (`js/site.js:359`).
- **Evidence:** `js/manifest.js:63-70` (COMMITMENTS, comment admits "PROVISIONAL digest (newC3/epoch04-preimage.txt demo preimage)"); `newC3/epoch04-preimage.txt` is git-tracked; PRODUCTION_PLAN.md §7.2 requires "real one replaces it before launch".
- **Reproduction:** run the shasum above; compare to `CytherManifest.COMMITMENTS[0].digest`.
- **Consequence:** If the tree deploys as-is, any reader can fetch `/newC3/epoch04-preimage.txt` and open the "sealed" commitment — the pre-registration ceremony is theater, which is precisely the failure mode the site's register exists to prevent.
- **Recommended correction:** two independent controls: (a) deploy allowlist excludes `newC3/` entirely (see SEC-003 — `newC3/` must not be modified in-repo); (b) at launch, the owner replaces the digest in `js/manifest.js` with a commitment whose preimage exists only privately (data-only edit, already designed for).
- **Files affected:** deploy manifest (new file); later `js/manifest.js` (owner data edit).
- **Verification:** after deploy config exists: confirm `/newC3/epoch04-preimage.txt` is not in the published artifact; grep the artifact for the digest's preimage text.
- **Regression risk:** none (exclusion only).
- **Dependencies:** SEC-003 (deploy manifest).
- **Blocks production:** **Yes** (launch gate; not a code defect today).

### DEF-003 · Privacy policy states "No cookies or local storage tokens" while the homepage writes `sessionStorage`

- **Classification:** Correctness of stated claims (register/trust)
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** Statically verified
- **Evidence:** `pages/privacy.html` §2 bullet "No cookies or local storage tokens" vs `js/site.js:108` (`sessionStorage.getItem("cy-optics")`) and `js/site.js:113` (`sessionStorage.setItem("cy-optics", …)`) — the reader-optics preference (WORLD·BALANCED·READ), session-scoped, never transmitted.
- **Reproduction:** read both files; or in a browser, click an optics button and inspect Storage.
- **Consequence:** A technically-literate diligence reader (this site's exact audience) can falsify a privacy claim in ten seconds. The data itself is harmless; the discrepancy is what costs trust.
- **Recommended correction:** amend the privacy bullet to state the fact precisely, e.g. "No cookies. No persistent storage. One session-scoped display preference (reading-optics mode) is kept in `sessionStorage` on your device and never transmitted; it dies with the tab." Keep the feature (it is P9-specified). Alternative (not recommended): drop persistence and let optics reset per load.
- **Files affected:** `pages/privacy.html` (text-only edit).
- **Verification:** re-read; grep for the old bullet.
- **Regression risk:** none.
- **Dependencies:** none.
- **Blocks production:** No (but trivially cheap; do before launch).

### DEF-004 · `build-hash` meta exists only in `index.html`; the integrity script silently no-ops on the other six HTML files

- **Classification:** Build/provenance tooling
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** **Executed** — `grep -h build-hash *.html pages/*.html | uniq -c` → exactly 1 occurrence (index.html:12). `generate-integrity.sh:57` uses `sed … s|(<meta name="build-hash"…` which replaces only an *existing* tag; contact.html and all five pages/ files lack the tag, so the loop's "✓" per file is misleading. CLAUDE.md states the script "patches SRI + the `build-hash` meta across the HTML files".
- **Consequence:** Subpages cannot be provenance-checked against a build; the tooling reports success for work it did not do.
- **Recommended correction:** add `<meta name="build-hash" content="">` to the `<head>` of contact.html and pages/{brief,privacy,security,terms,runner}.html, then run `./generate-integrity.sh` once (this is the sanctioned mutation path). Optionally make the script fail loudly when a target file lacks the tag (fail-loud matches the house doctrine).
- **Files affected:** `contact.html`, `pages/brief.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`, `pages/runner.html`, optionally `generate-integrity.sh`.
- **Verification:** `grep -c build-hash` per file = 1 with identical content; script exits 0; sw.js CACHE unchanged (resource bytes unchanged → same hash).
- **Regression risk:** Low. Note the meta content differs from the old empty string only after the script run.
- **Dependencies:** none.
- **Blocks production:** No.

### DEF-005 · CLAUDE.md architecture claim is stale: three "engine stack" files are served by no page

- **Classification:** Documentation ↔ repository divergence
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** **Executed** — `grep -rln "record.js\|disclosure.js\|console.js" index.html contact.html pages/*.html` → no matches. `pages/runner.html` loads only `engine/trajectory-engine.js` + `engine/trajectory-engine.test.js`.
- **Evidence:** CLAUDE.md ("Engine stack (`engine/*`, `content/record.js`, `profiles/disclosure.js`, `js/console.js`) … served only by `pages/runner.html`") vs runner.html script tags. The three files are nonetheless precached by `sw.js:28-30` and fingerprinted by `generate-integrity.sh:14`.
- **Consequence:** ~24 KB of dead precache per visitor; the build hash is coupled to files no page loads (an edit to dead code forces a full cache re-install for every client); the project doc misleads future sessions.
- **Recommended correction:** see ARCH-001 (single change set: prune sw.js ASSETS + generate-integrity RESOURCES + correct the CLAUDE.md sentence; files stay on disk untouched — they belong to the engine project).
- **Blocks production:** No.

---

## Section 2 — Production hardening

### SEC-001 · No server-layer security headers exist or are documented anywhere

- **Classification:** Security (deployment)
- **Severity:** Medium
- **Confidence:** High that the repo contains nothing; the live impact is **hypothesis** (host unknown — hosting is explicitly undecided, PRODUCTION_PLAN.md §10)
- **Evidence status:** Statically verified (absence)
- **Evidence:** CSP exists only as `<meta http-equiv>` (`index.html:15` and each subpage head). `frame-ancestors` **cannot** be delivered via meta-CSP (spec-ignored), so nothing prevents framing/clickjacking. No `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` anywhere; no `_headers`/nginx/Netlify/Caddy config in the tree.
- **Consequence:** The homepage (whose interactive elements include mailto CTAs and a hold-to-cross control) can be embedded and overlaid by a hostile page; downgrade/MIME risks are host-default.
- **Recommended correction:** add a deployment document (and, once a host is chosen, its native config) specifying: `Content-Security-Policy: frame-ancestors 'none'` (header-level; keep meta CSP as defense-in-depth), `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. The doc lives in `docs/` (not shipped).
- **Files affected:** new `docs/deploy.md` (+ host config file when host chosen).
- **Verification:** once hosted: `curl -sI https://host/ | grep -i strict-transport\|frame\|nosniff`.
- **Regression risk:** Low. HSTS is effectively irreversible for the max-age — set only on the final domain.
- **Dependencies:** hosting decision (open question).
- **Blocks production:** Yes at the "public launch" gate (headers must exist on the live origin); No for the repo itself.

### SEC-002 · Subpage CSPs grant `'unsafe-inline'` script on pages that contain no scripts, and omit `base-uri` / `form-action` / `object-src`

- **Classification:** Security (defense-in-depth)
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** Statically verified
- **Evidence:** `pages/brief.html:11`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html` all carry `script-src 'self' 'unsafe-inline'` with zero `<script>` in the body; all five subpages + `contact.html:11` omit `object-src`, `base-uri`, `form-action` (index.html:15 has all three). `pages/runner.html` CSP is thinner still (no `img-src`/`font-src`, acceptable via default-src).
- **Consequence:** Any future HTML-injection foothold on those pages executes script freely; base tag injection could retarget relative URLs. All theoretical today (no dynamic content), which is why severity is Low.
- **Recommended correction:** on the four script-free pages: `script-src 'none'`; everywhere add `object-src 'none'; base-uri 'self'`. `form-action`: index keeps `'self'`; contact.html's form posts to `mailto:` — add `form-action 'self' mailto:` there (verify in Safari that the mailto form still opens; if a host header CSP is added later it must match).
- **Files affected:** `contact.html`, `pages/{brief,privacy,security,terms}.html` (meta tag only).
- **Verification:** load each page locally with the console open — zero CSP violations; submit the contact form — mail client opens.
- **Regression risk:** Low-medium on contact.html only (mailto form-action behavior varies by browser — test before shipping; if it breaks, omit `form-action` there and note why).
- **Dependencies:** none.
- **Blocks production:** No.

### SEC-003 · No deploy manifest: publishing the tree ships 20+ retired/prototype surfaces, old gold-register branding, and the commitment preimage

- **Classification:** Security / register integrity (deployment)
- **Severity:** Medium
- **Confidence:** High (that the surfaces are tracked and reachable); the exposure is conditional on deploy method
- **Evidence status:** Executed (inventory + grep): 23 unlinked HTML files across `backup/` (14), `newC3/` (9 — wait: 9 HTML + preimage), `trajectory-engine/` (5); `grep -rl "d4af37\|E7DFD1\|--gold\|DOC-2026-001"` hits 8 files in `backup/`; `trajectory-engine/homepage.html` uses gold accent `--you:#d9b65c`.
- **Consequence:** URL-guessing or a search-engine crawl exposes superseded claims, retired branding, the old homepage, and DEF-002's preimage — dissolving the carefully governed disclosure boundary. The repo doctrine ("supersede, never erase") is right for *history*; it must not leak into the *published artifact*.
- **Recommended correction:** create an explicit publish allowlist (a `deploy-manifest.txt` + a tiny `deploy.sh` that rsyncs only: `index.html contact.html pages/ js/ css/ engine/trajectory-engine.js engine/trajectory-engine.test.js sw.js manifest.webmanifest icon.svg` — mirroring exactly the sw.js ASSETS + runner needs), or equivalently a host-level publish directory. Never publish `backup/`, `newC3/`, `trajectory-engine/`, `content/`, `profiles/`, `js/console.js` (after ARCH-001), `docs/`, `PRODUCTION_PLAN.md`, `CLAUDE.md`.
- **Files affected:** new `deploy-manifest.txt` / `deploy.sh` (or docs/deploy.md instructions); no tracked site file changes.
- **Verification:** build the artifact directory; `diff` its file list against the allowlist; curl the staging origin for `/backup/graphite-v2/index.html` and `/newC3/epoch04-preimage.txt` → 404.
- **Regression risk:** none to the site; the script must be BSD-portable (`rsync`, no GNU-isms).
- **Dependencies:** none; unblocks DEF-002 control (a).
- **Blocks production:** **Yes** (launch gate).

### REL-001 · Offline navigation to `/` misses the service-worker precache

- **Classification:** Reliability (offline behavior)
- **Severity:** Medium (the SW's whole purpose), Low (site works fine online without it)
- **Confidence:** Medium-high
- **Evidence status:** Statically verified against Cache API semantics; **not** browser-executed (see baseline §6.2)
- **Evidence:** `sw.js:9` precaches the key `'index.html'` (resolves to `<scope>/index.html`); a user navigation to the origin root produces a request for `<scope>/` — `caches.match(e.request)` (`sw.js:69`) is exact-URL matching, so the precached entry does not answer it. The runtime-cache branch (`sw.js:72-79`) papers over this only after a successful online visit to `/` in the same cache generation. Additionally the `fetch(e.request)` promise has no `.catch`, so a fully-offline miss rejects `respondWith` → browser network-error page. `manifest.webmanifest` `start_url: "index.html"` is exact and unaffected (PWA launches hit the precache).
- **Reproduction (when a browser is available):** visit site online once with a *fresh* cache generation but never request `/` (e.g. land on `/index.html`), go offline, navigate to `/` → error page.
- **Recommended correction (smallest):** in the fetch handler, resolve navigations to the cached index: `if (e.request.mode === 'navigate') { e.respondWith(caches.match(e.request).then(r => r || caches.match(new URL(e.request.url).pathname.replace(/\/$/, '/index.html').slice(1)) || fetch(e.request))); return; }` — or simpler and sufficient for this site's flat layout: try `caches.match(e.request, { ignoreSearch: true })`, and on miss for a navigation, fall back to `caches.match('index.html')` only for the root path. Keep the atomic-cache design untouched. Add a `.catch` returning `Response.error()` (or a tiny cached offline note) so the failure is at least deliberate.
- **Files affected:** `sw.js` only (then run `./generate-integrity.sh`? — **No**: sw.js is not in RESOURCES; but changing sw.js without a new CACHE name means updated logic + old cache. The script stamps CACHE from resource hashes only. Correct procedure: bump the CACHE name manually or run the script after any resource change; for a sw-only change, append a suffix such as `-r2` to CACHE manually and document it.)
- **Verification:** Safari → devtools → Application/Storage: confirm new cache name installs, old deleted; offline navigation to `/` and `/index.html` both render.
- **Regression risk:** Medium — service workers fail subtly; keep the change minimal and test the update path (old cache deleted on activate).
- **Dependencies:** none.
- **Blocks production:** No (online behavior is unaffected).

### REL-002 · Contact form's `mailto:` POST is a known-fragile transport

- **Classification:** Reliability / product
- **Severity:** Low (explicitly documented in-file as a zero-dependency fallback)
- **Confidence:** High
- **Evidence status:** Statically verified — `contact.html:45-51` (`action="mailto:contact@cytherai.com" method="POST" enctype="text/plain"`) plus the deployment note at `contact.html:33-44` prescribing a self-hosted endpoint for production.
- **Consequence:** On systems with no configured mail client (managed desktops, many mobile browsers), submission does nothing after the "OPENING MAIL CLIENT…" message; the user's typed message is stranded in the page. The JS feedback (contact.html:276-283) does tell them to email directly — a designed degraded state.
- **Recommended correction:** keep for v1 (it honors zero-external-requests); at production, implement the file's own deployment note: a same-origin form handler (host function), keeping `connect-src 'none'` intact by using a plain form POST to `'self'`. Additionally, surface the failure mode *before* submission: a small note "requires a configured mail client — or email contact@cytherai.com directly" (the copy-email button already exists).
- **Files affected:** `contact.html` (note text now; action swap at deploy).
- **Verification:** manual submit test on a machine with and without a mail client.
- **Regression risk:** Low.
- **Dependencies:** hosting decision.
- **Blocks production:** No.

### A11Y-001 · Secondary text falls below WCAG AA against the site's own ambient model

- **Classification:** Accessibility (contrast)
- **Severity:** Medium
- **Confidence:** High for the ambient-model numbers (executed); Medium for real-world impact (the rendered ground also includes plate ink and the `.env` envelope, un-measured — baseline §6.3)
- **Evidence status:** **Executed** (jsc harness compositing the `color-mix(in srgb, var(--ink) N%, transparent)` values over `CytherSubstrate.bgRgbAt(d)` — the exact model CL-06 uses)
- **Evidence:** index.html uses ink alphas 28–88% across ~40 rules (e.g. `.coords` 55% at :96, `.legend`/`th` 58% at :151/:155, `.locked-note` 45% at :200, `.dek` 80% at :84). Measured ratios:

  | Element (alpha) | Surface d=0 (#ECF0F4) | Worst pre-flip d=1.44 (48% scroll) |
  |---|---|---|
  | `.dek`, `.def .d-body` (80%) | 8.89:1 ✓ | **4.03:1 ✗** |
  | `.strip` (72%) | 6.76:1 ✓ | **3.52:1 ✗** |
  | `.zone-label` (70%) | 6.32:1 ✓ | **3.40:1 ✗** |
  | `.sys .facts` (66%) | 5.52:1 ✓ | **3.16:1 ✗** |
  | `.legend`, `th` (58%) | **4.26:1 ✗** | 2.73:1 ✗ |
  | `.coords`, labels (55%) | **3.88:1 ✗** | 2.58:1 ✗ |
  | `.locked-note` (45%) | **2.88:1 ✗** | 2.15:1 ✗ |

  Primary reading ink (the CL-06 predicate) is phase-locked and passes at every depth (worst 5.33:1, executed). The P9.2 commit already lifted these mixes under `[data-ink="light"]` (index.html:330-342) — the uncovered band is **dark-ink text between ~35% and 48% scroll**, plus the 45–58% strata at the surface. Decorative glyphs (`td.na` em-dashes 28%, `.r-arrow` 40%) are WCAG-exempt incidental text.
- **Reproduction:** `jsc js/manifest.js js/substrate.js <harness>` (harness preserved in the audit record, baseline §5 cmd 11).
- **Consequence:** Low-vision readers lose the metadata layer (zone labels, table headers, legend, coordinates) entirely, and even body text dips under AA exactly where the descent is most atmospheric.
- **Recommended correction (design-preserving):** keep the four-layer hierarchy but raise its floors: (a) surface phase — raise 45%→60%, 55%→62%, 58%→65% (all remain visibly quieter than 80% body ink); (b) pre-flip band — add a `body[data-phase="surface"]`-scoped… (the phase attr is "surface" until the flip; instead) add depth-conditioned lifts mirroring the existing `[data-ink="light"]` block for dark ink at depth, e.g. drive a `--mixLift` custom property from `readingUpdate()` when `d > 1.0`, or simply extend the membrane earlier. Choose in implementation the variant that keeps CL-06's model honest; then **extend the executed harness into the claims** (optionally a CL-06c "secondary text ≥ 4.5:1 or exempt") so the fix cannot silently regress.
- **Files affected:** `index.html` (style block), possibly `js/site.js` (one custom property write), `js/claims.js` if CL-06c is added, then `./generate-integrity.sh`.
- **Verification:** re-run the harness across d∈[0,3] for every shipped alpha; manual Safari sweep.
- **Regression risk:** Medium — this touches the P9 reading law's tuned hierarchy; make the numeric change minimal and re-run all claims.
- **Dependencies:** none.
- **Blocks production:** No (but strongly recommended before launch — AA is the floor the site's own register implies).

### A11Y-002 · Skip links missing on four of seven pages

- **Classification:** Accessibility (keyboard)
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** **Executed** grep — present in index.html, brief.html, runner.html; absent in contact.html, privacy.html, security.html, terms.html (all four have `<main id="main-content">` targets already; css class `.skip-link` exists in the shared stylesheet `css/cytherai.css:41-43`).
- **Recommended correction:** add `<a class="skip-link" href="#main-content">Skip to main content</a>` as first body child on the four pages (copy the brief.html pattern verbatim).
- **Files affected:** `contact.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`.
- **Verification:** Tab from address bar on each page → skip link appears first.
- **Regression risk:** none. **Dependencies:** none. **Blocks production:** No.

### A11Y-003 · Heading structure skips levels and the sealed stratum has no accessible heading

- **Classification:** Accessibility (structure)
- **Severity:** Low
- **Confidence:** High
- **Evidence status:** Statically verified
- **Evidence:** index.html: `h1` (thesis, :421) → `h2` per stratum → clearance cards jump to `h4` (:577, :581, :587) with no `h3` ancestor in that section; the sealed section's only title-like text is the `aria-hidden` ghost (:553), leaving the section navigable only via its `aria-label` (:551); the floor section (:596) has no heading element at all (the law is a `div`).
- **Consequence:** Screen-reader heading navigation presents a jumpy outline; the controlled stratum — a key beat of the descent — is invisible in the headings rota.
- **Recommended correction:** change the three `.path h4` to `h3` (pure element swap; class-based styles unaffected); give sealed and floor a visually-integrated real heading (e.g. make the existing `.zone-label` text an `h2` with its current classes, or add an sr-only `h2`). Keep visual output pixel-identical.
- **Files affected:** `index.html` only, then `./generate-integrity.sh` (no resource change — HTML is not SRI'd; no rerun needed).
- **Verification:** VoiceOver rotor headings list reads Surface → Definition → Architecture → Measurement → Controlled → Clearance → Floor.
- **Regression risk:** Low (verify no `h4`-specific styling: `.path h4` selector must be updated in the style block :212).
- **Dependencies:** none. **Blocks production:** No.

### A11Y-004 · Fork interaction has no keyboard path (view-state parity note)

- **Classification:** Accessibility (input parity)
- **Severity:** Info
- **Confidence:** High
- **Evidence status:** Statically verified — `js/substrate.js:413-438` (pointer drag only); the FORK toggle button is keyboard-reachable but toggling without a pointer changes nothing; `RETURN TO CANONICAL` and capture remain fully accessible; forking is decorative exploration, not content access.
- **Recommended correction (optional):** arrow-key nudges of P[0..3] while fork mode is on (a few lines in the existing keydown surface). Not required for AA.
- **Blocks production:** No.

### PERF-001 · Four full-viewport composited canvases + retained density fields — memory envelope unmeasured on low-end devices

- **Classification:** Performance (memory)
- **Severity:** Low
- **Confidence:** Low-medium (hypothesis — no device measurement performed)
- **Evidence status:** Hypothesis, with statically verified sizing math
- **Evidence:** `js/substrate.js:183` caps DPR at 2 (1.6 under 800px width); at 1440×900@2x the four `#world` tiles hold ≈ 83 MB of canvas backing plus `will-change` compositor layers (index.html:43); retained `fields[]` (`substrate.js:341`) keep 4 × bw×bh Float32 ≈ 11.5 MB at the 720k-cell cap. Desktop-fine; older iPhones under memory pressure may evict/repaint.
- **Existing mitigations (verified):** adaptive batch develop (`substrate.js:333-336`), lobe buffers freed after develop (only `total` retained), single sleeping rAF loop (`site.js:21-30`), zero per-scroll rasterization, height-only resize suppression (`substrate.js:458-467`).
- **Recommended action:** measure before changing anything (Safari on an actual device; Web Inspector memory timeline). If pressure is real: lower the ≤640px DPR cap to 1.25 and/or drop `will-change` from tiles with `o=0`. Do not restructure the plate pipeline for a hypothesis.
- **Blocks production:** No.

---

## Section 3 — Architectural debt

### ARCH-001 · Dead precache + dead fingerprint entries (`content/record.js`, `profiles/disclosure.js`, `js/console.js`)

- Severity Low · Confidence High · **Executed** evidence (grep — zero HTML references; sw.js:28-30 precaches them; generate-integrity.sh:14 fingerprints them). Consequence: every visitor downloads ~24 KB of dead code into cache; edits to dead files force global cache re-installs; CLAUDE.md misdescribes the serving graph (DEF-005).
- **Correction:** remove the three entries from `sw.js` ASSETS and from `RESOURCES` in `generate-integrity.sh`; run `./generate-integrity.sh` (build hash changes → new cache name → atomic re-install, by design); correct the CLAUDE.md sentence to "engine/* is served only by pages/runner.html; content/record.js, profiles/disclosure.js, js/console.js are retained on disk for the engine project and served by nothing."
- Files: `sw.js`, `generate-integrity.sh`, `CLAUDE.md`, all 7 HTML (SRI/meta restamp side-effect). Verification: smoke-test asset list; runner.html loads; new CACHE name. Regression risk: Low. Blocks production: No.

### ARCH-002 · Retired `--brass` token survives as an alias with 17 live usages

- Severity Low · Confidence High · **Executed** grep. `css/cytherai.css:21` (`--brass:#2036C7`) + 17 inline `var(--brass)` in contact.html and pages/*. Renders correctly (alias to accent); the *name* contradicts CLAUDE.md's "brass … retired". Also `--seal` aliases the same value with zero subpage usages outside runner.html's own palette.
- **Correction:** mechanical replace `var(--brass)` → `var(--accent)` across the five subpages; delete the `--brass` (and unused `--seal`) aliases from cytherai.css; run integrity script (css hash changes).
- Regression risk: near-zero (identical computed color). Blocks production: No.

### ARCH-003 · Subpage styling is inline-attribute-heavy and partially duplicated

- Severity Low · Confidence High · Statically verified. `pages/brief.html:13-19` re-declares `.doc-section`/`.section-label`/`.section-title`/`.section-body` already present in `css/cytherai.css:71-84` (with drifted values: 20px vs clamp(22px,3vw,30px) title). Legal pages carry ~40 repeated inline style attributes each (`style="font-size:1.1rem; color:var(--ink); margin:2.5rem 0 1rem"` on every h2). Two stray `border-radius` values (contact.html:129 `4px`, :181 `8px`; security.html:40 panel `4px`) violate the otherwise-universal sharp-corner geometry.
- **Correction (when touched):** move repeated inline styles into semantic classes in cytherai.css; delete brief.html's duplicate block after confirming which values are canonical; remove the three stray border-radii (flat register has none). Do this opportunistically per the "reduce slop where you touch" doctrine, not as a standalone rewrite.
- Blocks production: No.

### ARCH-004 · `.js-year` class implies script-updated years; nothing updates them

- Severity Info · Confidence High · Statically verified — `contact.html:202`, all four pages' footers: `<span class="js-year">2026</span>`; no script references the class. Correction: rename to nothing (drop the class) or wire it in contact's existing script; the static "2026" is currently correct.
- Blocks production: No.

### ARCH-005 · Three `.DS_Store` files tracked; one keeps the working tree perpetually dirty

- Severity Info · Confidence High · **Executed** (`git ls-files | grep DS_Store`; `git status`). Correction: `git rm --cached backup/.DS_Store newC3/.DS_Store trajectory-engine/.DS_Store` (files remain on disk; .gitignore already covers them). Restores a clean-tree baseline for all future verification.
- Blocks production: No.

### ARCH-006 · Subpage navigation dead-ends

- Severity Low · Confidence High · Statically verified. Subpage top nav contains only the brand link (contact.html:15-20, same pattern all pages); footers list Security/Privacy/Terms but omit Brief and Contact (contact.html:203-207 etc.); no `aria-current` in any top nav; from privacy you cannot reach the brief or contact without going home. index.html's footer (index.html:661) is the only complete nav on the site.
- **Correction:** add the `.nav-links` list (the CSS for it already exists unused at `css/cytherai.css:54-56`!) to each subpage nav with Brief · Contact · Security · Privacy · Terms and `aria-current="page"` on self. This is also ADV-005; the CSS being present-but-unused suggests it was always intended.
- Blocks production: No.

---

## Section 4 — Product & design advancement (optional; never mix into correctness commits)

### ADV-001 · Replace `icon.svg` — the last shipped artifact of the retired warm-gold register

- Severity Medium (brand coherence) · Confidence High · **Executed/statically verified**: `icon.svg` is a Georgia-serif italic λ in `#7A5B1B` (gold-brown) on `#E7DFD1` (warm paper) with corner registration marks — the retired lambda-crown identity (its source lives in `backup/lambda-crown-brand-system.html`). It is the favicon and PWA icon of every page, against `theme_color #101620` / cold-blue register. PRODUCTION_PLAN §1 said "icon.svg stays as-is" — a deliberate deferral, now the single loudest visual inconsistency.
- **Correction:** derive the new icon from the canonical mark itself (render the orbit's far-field silhouette to a small SVG/PNG at build time — "derived, not designed" extends to the icon), or adopt a minimal geometric mark in `#101620`/`#2036C7` on `#ECF0F4`. See generation pack `04-generation-prompt-pack.md` IMG-002. Update `manifest.webmanifest` icons + add a maskable variant.
- Blocks production: No (but do it before any public share — the favicon is the first pixel anyone sees).

### ADV-002 · No `og:image`, `og:url`, canonical URL, or Twitter card

- Severity Low · Confidence High · **Executed** grep (0 matches). A shared link renders textless-imageless. The mark — the entire visual thesis — never travels. Correction: add `og:image` (1200×630, see IMG-001), `og:url` + `<link rel="canonical">` (needs final domain), `twitter:card summary_large_image`. Note: the homepage colophon's "no images" claim (index.html:634) concerns the page's own rendering; an og:image is fetched by scrapers, not by the page — no CL-01 impact; keep the image out of the page itself.
- Dependencies: final domain decision; IMG-001 asset. Blocks production: No.

### ADV-003 · `robots.txt` and `sitemap.xml` absent

- Severity Info · **Executed** (ls). Correction at deploy: robots.txt allowing `/`, disallowing nothing that ships (the allowlist already excludes archives); sitemap listing the six content pages. Dependencies: SEC-003, domain. Blocks production: No.

### ADV-004 · No 404 / offline page

- Severity Info · Statically verified (host-dependent). A wrong URL on this site currently yields the host default — off-register. Correction: a one-file `404.html` in the flat cold register ("NO RECORD AT THIS PATH · the index is at /"), host-configured; optionally the SW offline fallback (REL-001) reuses it. Blocks production: No.

### ADV-005 · Complete the subpage navigation (= ARCH-006 correction, product framing)

### ADV-006 · Self-hosted contact endpoint (= REL-002 deployment note, product framing)

- Both inherit their evidence and corrections from the linked findings; listed here so product planning sees them.

---

## Areas inspected where NO issue was found

Stating these explicitly so silence elsewhere is not mistaken for coverage:

1. **Derivation integrity (executed):** canonical checksum re-derives bit-identically (`75D1:89D1`); all three published admission nonces re-derive; CL-01…CL-08 + CL-06b predicates all hold under jsc against shipped data; boundary instrument emits 0 invalid programs across 10k seeded proposals; dsin determinism 5.6e-8.
2. **Subresource integrity (executed):** every `integrity=` attribute in all 7 HTML files matches the current file bytes; build hash recomputes exactly; sw.js CACHE name carries the same hash.
3. **External-request hygiene (executed):** zero `http(s)://` references in shipped files; CSP `connect-src 'none'`; no fonts/images/CDNs; CL-01's runtime check is well-formed.
4. **Register compliance (executed):** all banned strings absent from shipped files; the commitment chip sentence present verbatim; gauge shows true observables only; ledger register (READING SELF-REPORT, owner-erasable, NOT INDEPENDENTLY VERIFIABLE) correct in code and copy.
5. **XSS surfaces (statically verified):** `location.hash` parsing admits only finite numbers (`site.js:384-386, 422-425`); all `innerHTML` sinks (`gauge`, `biLog`, `rlLog`, epoch chips) receive only internally-generated strings — the hostile proposer's junk tokens are drawn from charcodes 33–46, which cannot form markup; manifest/claims/floor rows are built via `textContent`.
6. **Engine correctness (executed):** 33/33 property tests pass (under scratch harness); Committed Prefix Preservation witnesses V1–V4 hold.
7. **Interaction accessibility of the boundary (statically verified):** hold-to-cross has pointer, keyboard (keydown/keyup, no-repeat), blur-cancel, and an AT double-activation click path (`site.js:265-296`); optics buttons use `aria-pressed`; the ledger header manages `aria-expanded`; decorative canvases are `aria-hidden`; thesis/wave glyph splitting preserves accessible names via `aria-label` + `aria-hidden` spans (`site.js:140-152, 186-190`).
8. **Reduced motion (statically verified):** guarded in all four movers — weight field, waves (`site.js:161, 191`), instrument streaming → 4000-proposal synchronous run (`instrument.js:160-167`), plate develop appears whole (`substrate.js:333-339`); CSS transitions gated at index.html:31, 198.
9. **Gesture safety (statically verified):** `pointercancel` releases the fork lock (`substrate.js:434-437`); long-press cancelled by >12px movement; `setPointerCapture` on hold-to-cross; body scroll lock only while forking.
10. **Service-worker update model (statically verified):** build-stamped immutable cache + delete-on-activate is a sound atomic-update design; SRI cannot desync within a cache generation. (The two REL findings are gaps *within* this sound design, not against it.)
11. **Contact form (statically verified):** validation mirrors native constraints, no external calls, honest degraded-state messaging, clipboard fallback chain.
12. **Meta/PWA (statically verified):** webmanifest valid and register-consistent (except the icon, ADV-001); `viewport` does not disable zoom; `lang="en"` everywhere; `color-scheme` declared.
13. **jsc parse (executed):** all ten first-party JS files parse clean.

## Count summary

| Category | Critical | High | Medium | Low | Info | Total |
|---|---|---|---|---|---|---|
| Demonstrated defects (DEF) | 0 | 2 | 0 | 3 | 0 | 5 |
| Security hardening (SEC) | 0 | 0 | 2 | 1 | 0 | 3 |
| Reliability (REL) | 0 | 0 | 1 | 1 | 0 | 2 |
| Accessibility (A11Y) | 0 | 0 | 1 | 2 | 1 | 4 |
| Performance (PERF) | 0 | 0 | 0 | 1 | 0 | 1 |
| Architecture (ARCH) | 0 | 0 | 0 | 3 | 3 | 6 |
| Advancement (ADV) | 0 | 0 | 1 | 2 | 3 | 6 |
| **Total** | **0** | **2** | **5** | **13** | **7** | **27** |

**Production-blocking:** DEF-001 (runner false verification), DEF-002 + SEC-003 (preimage exposure / deploy allowlist), SEC-001 (live-origin headers — at launch). Everything else ships.
