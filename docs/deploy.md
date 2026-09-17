# Deployment contract

> **Front door changed 2026-09-16.** The homepage is now the drawing set (`index.html`,
> `js/drawing-set.js`; `docs/architecture.md`). Every browser observation recorded below
> — the certification block, §5 (Chrome observed / WebKit residual), §5a (the promoted
> terminal exposure), §5b (CY-SEM-003 on the composited plate ground) — was made against
> instrument-v1, now retired whole to `backup/instrument-v1/`. Those records stand as
> written: they are the history of that world, not evidence about this one. The drawing
> set's own qualification (integrity, restamp, Chrome, Safari, mobile, zero-external) is
> the last step of the migration and is recorded when it is made, not before. §1–§4 and
> §6 (headers, MIME, redirects, live-origin verification, the launch gate) are the
> contract for any front door and remain in force.

## Certification status

```
Engineering implementation       COMPLETE (incl. performance-audit remediation)
Current-candidate browser check  PARTIAL — in-app browser: engine 33/33,
                                 claims 10/10, responsive footer and resize pass
Chromium certification           OPEN — prior CDP record predates current bytes
WebKit differential checks       OPEN — prior record predates current bytes
Origin certification             OPEN — bytes and deployed paths changed
Epoch-04 owner decision          OPEN
Manifest owner sign-off          OPEN
Asset promotion sign-off         OPEN — docs/asset-promotion-log.md
```

The d1281d6/bdebc59 Chromium record below remains true of those commits, but it
does not certify this tree. The performance-remediation track changed HTML and
three hashed JS modules; the current build identity is `F1FF314DEC2C4717`.
A local in-app-browser battery re-ran the current observable core with device-size
emulation — all pass: engine 33/33 (exitCode 0, mutation-verified); homepage claims
10/10 and admission verified; footer clearance with zero horizontal overflow at
320/375/390/430 px; and a same-width height change preserved canvas backings
without restarting exposure. The current non-browser battery passes claims 8/8,
ledger 9/9, site integration 7/7, 15 motion/performance checks, and the 27-file
artifact rebuild. Service-worker lifecycle, full interactive accessibility,
Chromium and WebKit matrices remain open for these bytes. Known defects and their dispositions are registered in `vaic/release-dispositions.v0.json`, which `tools/test-site.py` gates: a FAIL recorded in the evidence ledger must be named there, so this block cannot become more optimistic by omission. This local evidence is
useful but is not promoted to full browser certification for the new candidate.

### Release-candidate artifact equivalence

```
Chromium-observed source commit:      d1281d6
Release-candidate repository commit:  bdebc59
Repository delta:     ten generated study PNGs removed from assets/; no
                      runtime, deployment, integrity, service-worker, HTML,
                      CSS, or JS file changed
Artifact equivalence: rebuilt dist/ contains 19 files; every file SHA-256
                      identical to the d1281d6 Chromium-observed baseline;
                      build hash remains C4F7059DAC405AE6; integrity
                      regeneration is idempotent
Conclusion:           Chrome certification evidence from d1281d6 remains
                      applicable to bdebc59 because the complete
                      browser-consumed artifact is byte-identical
```

The equivalence proof is per-file. Reproduce the manifest from inside `dist/`:

```
find . -type f -print0 | sort -z | xargs -0 shasum -a 256
```

Safari differential and origin certification run against the rebuilt `dist/`
of the release-candidate commit.

The remaining work is certification, not construction. Class A items can
invalidate a public technical claim; Class B affect experience but not the
truthfulness of the site; Class C cannot be resolved inside the repository.

Not shipped. This file states what the repository cannot express: the response
headers the origin must send, the MIME types it must serve, and the gate that
must hold before the site is public.

**Artifact:** `./deploy.sh` → `dist/`. Publish the *contents* of `dist/` as the
origin root. `dist/` is gitignored and rebuilt from scratch on every run.
Never publish the working tree: `backup/`, `newC3/`,
`docs/`, `PRODUCTION_PLAN.md`, `CLAUDE.md`, `generate-integrity.sh` and
`deploy.sh` itself are excluded by construction (allowlist, not denylist).

---

## 1. Response headers (all responses)

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` | `frame-ancestors` is **ignored** in a `<meta>` CSP, so the per-page meta policies cannot deliver it. Without it the homepage — hold-to-cross control, mailto CTAs — can be framed and overlaid. Header-level only; keep the meta CSP as defense in depth. |
| `X-Content-Type-Options` | `nosniff` | The site serves JS with SRI; MIME sniffing must not be able to reinterpret a response. |
| `Referrer-Policy` | `no-referrer` | The site makes zero external requests by design; referrers must not leak on outbound clicks either. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Nothing on the site uses these. Say so at the origin. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **Final domain only.** Effectively irreversible for the max-age — do not set on a staging host or a domain whose subdomains are not all HTTPS. |

Do **not** add a header-level `Content-Security-Policy` that duplicates the page
policies. `index.html` ships the strictest one it can (`script-src 'self'`, no
inline); a coarser origin-wide header would only weaken the reading. The origin
contributes exactly the directive the meta cannot carry.

## 2. MIME types

| Extension | Type |
|---|---|
| `.webmanifest` | `application/manifest+json` |
| `.svg` | `image/svg+xml` |
| `.js` | `text/javascript` |
| `.css` | `text/css` |

`sw.js` is served from the origin root, so its scope is `/` by default — no
`Service-Worker-Allowed` header is needed. It must **not** be served with a
long `Cache-Control` max-age: the worker is the mechanism by which a new build
reaches returning readers. Serve `sw.js` and `index.html` with
`Cache-Control: no-cache`; everything else may be cached. A build is atomic
because the worker makes it so, not because of the headers: install fetches every
asset past the HTTP cache (`cache: 'reload'`) and commits the set only if
`index.html`'s build stamp is the cache's own — otherwise install fails and the
previous build keeps serving — and the fetch handler reads this build's cache alone.
Without that, a returning reader's browser hands the new worker the previous build's
modules as fresh, and the new `index.html`'s SRI refuses them on every load until
the HTTP cache expires (reproduced in Chrome 151 before the fix).

## 3. Redirects and error pages

- Serve `index.html` for `/`.
- No SPA-style catch-all rewrite. A wrong path must 404, not silently render the
  homepage — the site's claims are per-page and a rewritten URL would state
  something the reader did not request.
- `404.html` exists in the artifact (closes ADV-003). Configure the origin to
  serve it **with status 404** for path misses. Its URLs are absolute, so it
  renders correctly at any depth. Local existence proves nothing about the
  origin: verify the miss behaviour with the §4 checks.

## 4. Verification against a live origin

```
curl -sI https://HOST/ | grep -iE 'frame-ancestors|strict-transport|nosniff|referrer|permissions'
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/newC3/epoch04-preimage.txt   # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/backup/graphite-v2/index.html # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/PRODUCTION_PLAN.md            # expect 404
curl -sI https://HOST/manifest.webmanifest | grep -i content-type                   # manifest+json
curl -s https://HOST/definitely-missing | grep -q "No record at this path"          # styled 404 body
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/definitely-missing            # AND status 404
```

## 5. Browser matrix — Chrome observed, WebKit residual

A Chrome 150 pass was executed against the **`dist/` artifact** (not the source
tree) driven over the DevTools Protocol: eight routes, service-worker lifecycle
with the origin genuinely killed, keyboard and focus, four viewport sizes,
rendered-colour contrast sampled across the whole descent, and every live
control. Each item below carries its status.

Chrome cannot certify WebKit. Items marked **WEBKIT-SPECIFIC** are the residual
and are the only reason this matrix is not closed.

### CHROME OBSERVED — PASS

| # | Check | Evidence |
|---|---|---|
| 1 | All 8 routes load from `dist/` | 0 console errors, 0 exceptions, 0 CSP violations, 0 failed loads, on first load and on hard reload |
| 2 | Network posture | one host contacted (`127.0.0.1:8200`), 19 distinct URLs, **0 external requests** |
| 3 | SRI is enforced on module scripts | negative control: one appended byte in `engine/trajectory-engine.js` → "Failed to find a valid digest in the 'integrity' attribute", module blocked |
| 4 | `runner.html` executes its four module scripts | all four report `type=module`; 33 PASS lines, 0 FAIL, `✓ 33 / 33 passed · exitCode 0`, `CytherEngine` present |
| 5 | The zero-test guard is honest under real failure | same negative control → `✕ 0 tests executed — the suite failed to load`, class `bad`. DEF-001 cannot silently return |
| 6 | Direct navigation and refresh on every route | title stable, no new console output on reload |
| 7 | Service worker installs and activates | scope `/`, state `activated`, cache name == build hash, 18 entries |
| 8 | REL-001 scenario reproduced and fixed | landed on `/index.html` only (`"/"` never cached — confirmed absent), **killed the server** (`curl` → 000), navigated to `/` → homepage rendered, `CLAIMS 10/10 HOLDING`. CDP offline emulation was not trusted: it does not appear to cover the worker's own fetches |
| 9 | Offline uncached path fails deliberately | Chrome network-error page, never the homepage |
| 10 | Offline subresources | `runner.html` offline → 33/33 |
| 11 | Update path | new build served → worker updated, old cache deleted, exactly one cache remains; offline root still works on the new generation |
| 12 | Skip link | first Tab on all 6 content pages → `a.skip-link` at (12,12), visible, accent focus ring |
| 13 | Heading outline | h1 → 7×h2 → 5×h3, **no level skips**, single h1 |
| 14 | Focus | every sampled control accepts focus; `:focus-visible` rule live |
| 15 | CSP is genuinely enforced | positive control: injected inline `<script>` blocked on both `index.html` (`script-src 'self'`) and `privacy.html` (`script-src 'none'`), violation logged |
| 16 | Claims recompute live | 10/10 HOLDING with real detail; instrument audit 1500 proposals / 7 admitted / **0 invalid** |
| 17 | Ledger | records, labels, `clear()` empties it, **does not survive reload**, `sessionStorage`/`localStorage` both empty — matches the privacy text exactly |
| 18 | Optics | all three modes set `body[data-optics]`, persist to `sessionStorage`, and drive `#world` opacity (1.00 / 0.72 / 0.51) |
| 19 | Hold-to-cross, three input modes | pointer hold, Enter keydown→keyup, and AT double-activation each cross and each record exactly one act |
| 20 | Fork → capture → reproduce → reset | drag forked to `−1.536 +2.006 −0.906 −0.660`; capture wrote `#d=0.000&m=…`; reloading that link reproduced the mark exactly with `LOCAL FORK — VISITOR FORK OF THE PUBLIC CHECKSUM`; reset restored canonical |
| 21 | Reduced motion | media matched, `scroll-behavior: auto`, claims 10/10, instrument synchronous, 0 console errors |
| 22 | Responsive | 390×844, 768×1024, 1024×768, 1440×900 — no horizontal overflow, no centre-column obstruction |
| 23 | Rendered contrast of every ink layer | worst **4.63:1** at d=0.90, sampled every 5% of the descent over elements actually in the viewport, ground = the real paint stack. CL-06c's model predicted a 4.51:1 floor and the rendered measurement agrees |

Four defects were found and fixed during this pass: the `runner.html` favicon
404; the `.env::before` bleed widening the mobile layout viewport to 421px; the
core-sample map covering body text at 390px; and the phase-material lists
having drifted apart, which left `.chrome`/`.strip`/`.optics button` on paper
backgrounds at depth and `.core .lbl` at 1.36:1 through the whole flip band.

### CHROME OBSERVED — FAIL

None outstanding.

### WEBKIT-SPECIFIC — STILL REQUIRES SAFARI

Run this as a **differential certification, not a second checklist.** Chrome has
already established the baseline; Safari's job is to answer two questions only:

1. Does WebKit disagree with Chromium?
2. If it does, is the disagreement a bug, a compatibility difference, or purely
   a rendering difference?

Anything Chrome already settled does not need re-running — record only divergence.

**Class A — release blockers.** These two can invalidate a claim the site makes
about itself, so they are mandatory Safari observations.

| # | Check | Why Chrome cannot settle it |
|---|---|---|
| W1 | Inline `<script type="module">` admitted under `script-src 'self' 'unsafe-inline'` | CSP/module interaction is engine-specific; Chrome admits it, WebKit must be confirmed. If it fails, `runner.html` shows the honest 0-test message rather than a false pass |
| W2 | SRI on **module** fetches | Chrome enforces it (proven above). WebKit's module-script integrity path is a separate implementation |

**Class B — platform behaviour.** Observed, but a platform-specific fallback
here would not invalidate the architecture.

| # | Check | Why Chrome cannot settle it |
|---|---|---|
| W3 | `mailto:` form submission actually opening a mail client | No mail client exists in headless Chrome. Chrome confirms only that the submit dispatches and is not CSP-blocked |
| W4 | `form-action 'self' mailto:` | Deliberately omitted (see the comment in `contact.html`). Decide it on Safari: add it, submit, and keep it only if the mail client still opens |
| W5 | Continuous `font-weight` kinetics (`.thesis .g`, `[data-wave]`) | Variable-weight animation is a WebKit text-rendering path; correctness here is visual, not measurable over CDP |
| W6 | Service-worker and viewport behaviour where WebKit differs | Notably `100vh`/dynamic viewport on iOS Safari and WebKit's SW update timing |
| W7 | VoiceOver rotor announcement | The heading DOM is verified; how VoiceOver reads it is AT-specific |
| W8 | Plate rendering fidelity | Canvas output was screenshotted in Chrome and looks correct; WebKit compositing of `backdrop-filter` + `mask-composite` is its own path |

#### SAFARI 27.0 OBSERVED (2026-08-05, safaridriver against the built artifact, commit 07a4221)

Driven over WebDriver against `dist/` served on localhost, with a
tampered-byte negative control on a second port. Divergence from the Chrome
record: **none observed** in the automated set.

| # | Result |
|---|---|
| **W1** | **PASS.** `runner.html`'s inline module executes under the CSP: `✓ 33 / 33 passed · exitCode 0 · mutation-verified` in WebKit. |
| **W2** | **PASS, both directions.** Positive: all six SRI'd modules execute; `CLAIMS 10/10 HOLDING` computed live in WebKit. Negative: one byte appended to `engine/trajectory-engine.js` → the module is refused and the runner shows the honest `✕ 0 tests executed — the suite failed to load`. WebKit enforces integrity on module fetches. |
| W5 | **Partial.** Static weight rendering matches the model exactly (thesis glyphs at 250; `.sec-h` at 340 = core-phase 310 + at-rest 30). Pointer-driven kinetics remain a visual observation. |
| W6 | **PASS (macOS).** Service worker activates on localhost; exactly one cache, named `cytherai-substrate-87C2467252E7272A`. iOS dynamic-viewport behaviour not covered by this pass. |
| **W8** | **PASS by observation.** At depth (gauge ×2.42, 46%): phase-changed panels ground light ink, the flip membrane holds, masked envelopes composite, the plate renders behind, the minimap and reticle draw, and the strip prints `CANONICAL STATE · EPOCH 03 · 75D1:89D1 · ADMISSION VERIFIED`. Narrow-window census: exactly two visible fixed surfaces, no horizontal overflow. |

Remaining interactive: W3 (real `mailto:` handoff), W4 (form-action decision,
contingent on W3), W7 (VoiceOver), and the pointer-driven half of W5.
One environment observation, not a site defect: Safari's automatic Reader
engaged on the homepage at wide windows in the test profile — user-setting
controlled, content-neutral, worth one glance at launch.

### OWNER DECISION REQUIRED

| # | Item |
|---|---|
| ~~O1~~ | **CLOSED** — accent-state accessibility decision taken and implemented; see below. |
| O2 | The epoch-04 commitment — see gate item 4 below |
| O3 | The `PROVISIONAL` manifest values |
| O4 | At 390px the `.optics` control transiently covers a zone label as content scrolls behind it. Same bottom chrome band the spec docks the reader ledger into, and it clears on scroll — recorded, not changed |

#### O1 — CLOSED. What was measured, and what was decided

**The finding.** Accent-coloured text drops below AA in the mid-descent: worst
**2.14:1** at d=1.20. Verified **pre-existing, not a P8 regression** — the
pre-P8 tree (770d8c5) fails at five sample depths against four now, and P8
improved the worst case from 1.88:1 to 2.49:1.

**The cause.** `BGS` and `ACCENTS` are both locked (§4.1) and their luminance
ramps *cross* in the middle of the descent: the ambient falls from light to
dark while the accent rises from #2036C7 to #7FA0FF. Where they meet, the
accent is not separable from anything derived from the ambient.

**What this rules out.** Moving state onto an accent-coloured rule or border
does **not** help. Measured as a non-text indicator against the 3:1 threshold
of WCAG 1.4.11, the accent still fails in the same band — 2.14:1 on panels at
d=1.20, and 1.34:1 against the raw ambient at d=1.50. The channel is the
problem, not the role it plays.

**What works.** Ink is the one channel already proven to hold at every depth
(CL-06 worst 8.27:1 at full strength). Three ink-drawn cues were prototyped in
Chrome and measured across the descent; all three pass both thresholds with
large margins, and none touches a locked token:

| Candidate | worst text | worst cue | verdict |
|---|---|---|---|
| shipped — accent text | 2.14:1 | 2.14:1 | both fail |
| **A** inverse fill (ink surface, counter-ink text) | 14.98:1 | 10.72:1 | **pass** |
| **B** ink text + 2px ink underline | 10.72:1 | 10.72:1 | **pass** |
| **C** ink text + enclosing ink hairline | 10.72:1 | 10.72:1 | **pass** |

**The decision has two halves, and only the first is settled by the above.**

1. *Selected-state controls* (`.optics button[aria-pressed="true"]`,
   `body.crossed .b-state`). The Constitution requires that accent **marks**
   state; it does not require that state be carried **solely** by
   accent-coloured text. Adopting A, B or C keeps the accent as a mark while
   the load-bearing cue becomes ink. Note the state is already exposed
   non-visually via `aria-pressed`.
2. *Accent-coloured prose* — roughly twenty rules (`.zone-label b`, `.gauge b`,
   `.legend .lv`, `td .mk`, `.m-v.ok`, `.ep .st`, `.eyebrow`, …). Here the
   words themselves are the content, so a non-colour cue cannot rescue them.
   Either those runs stop being accent-coloured (ink plus the weight they
   already carry), or the `ACCENTS` ramp changes — and the ramp is locked.

**Decision taken (owner, this review): B for state, ink + existing weight for prose.**

Implemented:

* Selected state on the optics control is now full-strength ink text plus a 2px
  ink underline — worst 10.72:1 at every depth, and the rule follows the ink
  phase (dark at the surface, light through the flip). `aria-pressed` already
  carried the state non-visually.
* Twenty accent text rules were measured across the whole descent, taking the
  minimum over **every** matching element (an earlier first-match-only scan
  wrongly cleared `.zone-label b`, `th.cy`, `td .mk` and `td.cy`). The fourteen
  that can appear inside the crossing band now carry ink, keeping the weight
  that already marked them; three transient ones (`.copied`, `.rl-log b`,
  `.bi-log .adm`) were forced on screen at d=1.08 to measure rather than assume,
  and also failed at 1.9:1.
* Six rules keep the accent because they provably never enter the band where
  they appear, each annotated in the stylesheet with its measured minimum:
  `.eyebrow` 7.60:1, `.rung .r-impl.disclosed` 4.78:1, `.sys .o-val` 5.60:1,
  `.bi-head b` 5.30:1, `.manifest .m-v.acc` 5.01:1, `footer a:hover` 7.90:1.
  These are safe by **position**, which a reflow can undo — re-run the scoped
  harness after any layout change.
* Accent retained on all 11 fill/border/hover-affordance uses. No locked token
  changed; `ACCENTS` and `BGS` are untouched.

Result: accent text below AA — **0 samples**. Ink layers unchanged at 4.63:1
worst. O1 is closed.

The most useful thing this produced is not the fix but the constraint it
exposed, which should govern any future colour work:

> **The accent ramp is not a universally usable contrast channel through the
> descent.** Because the locked background and accent luminance curves cross,
> turning accent text into an accent border merely moves the same failure from
> text contrast (1.4.3) to non-text contrast (1.4.11). Essential information
> belongs on the ink channel, which is proven at every depth.

#### N1 — accent borders (non-blocking interpretation item, tracked separately)

Two accent borders sit under 3:1 in the crossing band: `.path-featured` and
`#coreRect`. This is **not** a launch blocker, and it is not automatically a
violation: WCAG 1.4.11 applies where visual information is *required* to
identify a component or its state, or where a graphical object is *necessary*
to understand the content. A coloured border does not attract the 3:1 boundary
merely by existing, and W3C techniques are advisory examples rather than
mandatory implementations — compliance is with the success criterion's
functional requirement.

The deciding test: *remove the accent from the border. Is information lost that
identifies the object, its state, or the meaning of the graphic?*

Applied:

* **`.path-featured`** — each clearance card names itself in text (`PATH 1 ·
  OPEN`, `PATH 2 · QUALIFIED`, `PATH 3 · CONTROLLED`), carries its own heading,
  and two carry their own CTA. The accent border visually weights the middle
  path; it encodes no name or state not already written. **Supplemental.**
* **`#coreRect`** — the graphic is labelled `POSITION IN FORM`, and the gauge
  states `DEPTH nn%` continuously and unconditionally. The rectangle is a second
  rendering of a reading always available as text. **Supplemental.** Worth
  noting that the minimap does become less legible in the band, which is a
  quality observation rather than an information loss.

Both therefore pass as supplemental and the documented exception is defensible.
Re-apply the test if either card or the minimap ever becomes the sole carrier of
a state — that is the condition that would promote this to a blocker.

### ORIGIN DEPLOYMENT REQUIRED

| # | Item |
|---|---|
| D1 | The §1 response headers, `curl -sI` verified on the live origin |
| D2 | HSTS on the final domain only |
| D3 | MIME types per §2 |
| D4 | 404 behaviour per §3 |

## 5a. Promoted terminal exposure — Chrome observed, 2026-09-08

Build `B2F25BCB98E56EDC`, Chrome 141 headless (SwiftShader), device scale factor 1.
These are **browser observations**, not repository proofs; `tools/test-poster.py`
proves the offline half of the chain and exits nonzero on any breach.

| # | Check | Observed |
|---|---|---|
| P1 | Kernel equivalence — the browser's own kernel developed plate 0 at a 1200×600 frame and tonemapped it | terminal step 15; sha256 `86be0b3d…8d188df3`, **identical** to the offline producer under jsc and to the decoded shipped PNG. `decode(P) == R_N` holds in the browser. |
| P2 | Displayed plate vs promoted raster | Canvas 2D stores **premultiplied** alpha, so `getImageData` read-back deviates by up to 12 levels on 11.36% of samples — every pixel of the plate is partially transparent (0 fully opaque pixels) and unpremultiplying amplifies quantisation. Compared in premultiplied space, which is what the compositor stores and shows: **max \|Δ\| = 0 over every sample**, alpha exact. The displayed plate is byte-identical to the promoted raster; the read-back delta is an artefact of the read-back. |
| P3 | Swap at equivalence | The poster is removed in the same frame plate 0 reaches D_N. No intermediate state is drawn over it on first load. |
| P4 | No poster authority under FORK | Removed after first development; still removed after FORK + arrow nudges + Escape (status `LOCAL FORK`), and after REDEVELOP. Removal is permanent. |
| P5 | `noscript` | With JavaScript disabled the poster remains and is the page's canonical mark — a truthful static representation of the same terminal plate. Decorative inside `#world` (`aria-hidden`), consistent with the existing accessibility model: the page states in text everything the world shows. |
| P6 | Aspect window (JS disabled, so the poster is never removed) | `display:block` at 1440×900 (1.60), 1200×600 (2.00), 1024×768 (1.33); `display:none` at 390×844 (0.46) and 2560×1080 (2.37). Shown exactly where a `cover` fit is the exact crop the developed plate would show, and — because a `display:none` element's background is never fetched — never downloaded elsewhere. |
| P7 | Presentation architecture, A/B | **A** (poster → streamed development) composites the partial plate over the finished poster: at t+200–450 ms the mark reads darker and dirtier than its terminal state, then resolves — a visible finished→wrong→finished regression. **B** (shipped: poster → terminal canvas; REDEVELOP exposes the trajectory) is correct in every frame from t+200 ms. B is what ships. |


## 5b. CY-SEM-003 — composited reading ground, Chrome observed, 2026-09-09

Build `C27AD347DF88A823`, Chrome 141 headless (SwiftShader). Method: for every line box
of every reading element in view (`.thesis, .dek, .sec-h, .d-body, .law, .b-sub`,
obtained from a Range so multi-line elements are measured per line), the element's own
computed colour is composited over **each background pixel beneath that line** — the page
rendered with those elements hidden, so the ground is the real paint stack including
plate, envelope and panel material — and the WCAG 2.1 ratio is taken. This measures the
criterion WCAG actually states (text colour against background colour); antialiased glyph
pixels are not the criterion and are not used.

**This is a SAMPLED observation.** It licenses nothing about depths, viewports, optics
modes or states it did not visit. `CY-SEM-003` carries no receipt: the numbers below are
evidence for the owner to admit or reject, not a self-admitted verdict.

| viewport | stop | phase | lines | bg px | worst | p01 | median | % below 4.5 | worst element |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 1440×900 | surface | surface | 60 | 306,938 | 2.51:1 | 5.62:1 | 12.07:1 | 0.23% | `.dek` |
| 1440×900 | definition | surface | 8 | 93,654 | 4.99:1 | 5.69:1 | 10.04:1 | 0.00% | `.d-body` |
| 1440×900 | architecture | surface | 2 | 51,894 | 5.96:1 | 6.18:1 | 9.41:1 | 0.00% | `.sec-h` |
| 1440×900 | measurement | flip | 2 | 40,392 | 10.82:1 | 10.82:1 | 11.29:1 | 0.00% | `.sec-h` |
| 1440×900 | clearance | flip | 2 | 65,286 | 12.57:1 | 12.71:1 | 13.35:1 | 0.00% | `.sec-h` |
| 1440×900 | floor | depth | 7 | 100,530 | 4.33:1 | 5.38:1 | 6.82:1 | 0.00% | `.law` |
| 1200×600 | surface | surface | 60 | 273,413 | 2.22:1 | 5.63:1 | 11.85:1 | 0.15% | `.dek` |
| 1200×600 | definition | surface | 8 | 88,020 | 5.22:1 | 5.83:1 | 9.61:1 | 0.00% | `.d-body` |
| 1200×600 | architecture | surface | 2 | 46,104 | 7.46:1 | 7.88:1 | 10.04:1 | 0.00% | `.sec-h` |
| 1200×600 | measurement | flip | 2 | 35,853 | 10.69:1 | 10.85:1 | 11.16:1 | 0.00% | `.sec-h` |
| 1200×600 | clearance | flip | 2 | 58,089 | 12.41:1 | 12.57:1 | 12.74:1 | 0.00% | `.sec-h` |
| 1200×600 | floor | flip | 7 | 91,074 | 3.73:1 | 4.62:1 | 6.21:1 | 0.50% | `.law` |
| 390×844 | surface | surface | 65 | 122,994 | 2.07:1 | 4.54:1 | 10.55:1 | 0.94% | `.dek` |
| 390×844 | definition | surface | 13 | 56,667 | 1.00:1 | 2.94:1 | 7.76:1 | 1.40% | `.d-body` |
| 390×844 | architecture | surface | 2 | 16,560 | 6.49:1 | 6.84:1 | 10.56:1 | 0.00% | `.sec-h` |
| 390×844 | measurement | flip | 2 | 12,870 | 10.69:1 | 10.69:1 | 10.69:1 | 0.00% | `.sec-h` |
| 390×844 | clearance | flip | 3 | 20,670 | 12.73:1 | 12.73:1 | 13.08:1 | 0.00% | `.sec-h` |
| 390×844 | floor | depth | 7 | 34,294 | 3.01:1 | 4.48:1 | 6.29:1 | 1.04% | `.law` |

**Reading: the obligation would FAIL as sampled.** Six of eighteen samples contain
background beneath text at less than 4.5:1, worst 1.00:1 — ink and ground identical — on
mobile `.d-body`. Everything in the flip and controlled strata is comfortable (10–13:1);
the exposure is on the pale surface paper and on the floor's `.law`.

**It is a pre-existing defect, widened by the tone change, not created by it.** The same
harness against `69550d8` (the build before `docs/audit/07`):

| sample | before · worst / % below | after · worst / % below |
|---|---|---|
| 1440×900 surface | 2.57:1 / 0.09% | 2.51:1 / 0.23% |
| 1440×900 floor | 4.75:1 / 0.00% | 4.33:1 / 0.00% |
| 390×844 surface | 2.10:1 / 0.32% | 2.07:1 / 0.94% |
| 390×844 definition | **1.00:1 / 1.41%** | **1.00:1 / 1.40%** |
| 390×844 floor | 3.55:1 / 0.08% | 3.01:1 / 1.04% |

(The 1200×600 rows of the earlier build are omitted: that run never reached a developed,
scrolled state, so its numbers are not comparable and are not reported as if they were.)

The worst values barely moved; the affected *area* grew. The structural cause is not the
tone curve: the legibility envelope (`.env`) wraps zone labels and section headings, and
the reading paragraphs — `.dek`, `.d-body`, `.law` — sit directly on the plate with no
density-conditioned ground at all. Lowering the gamma again would shrink the symptom and
leave the hole. Naming it is what `CY-SEM-003` is for; closing it is a change to the
reading exposure and is the owner's to direct.

## 5c. The drawing set — Chrome observed, 2026-09-16

Build `EF57500CC99E3711`, the artifact `dist/` served as an origin root, HeadlessChrome 152
over CDP (`vaic/evidence/current-browser-observations.v0.json#canonical_settle_EF57500CC99E3711`
and `#epoch_reproduction_EF57500CC99E3711`; the receipts bind CY-SEM-001/002 in
`vaic/cytherai-obligations.v1.json`).

| Viewport | Settle | Three samples | Checksum sites | External requests | Console errors | Horizontal overflow | Offline reload through the worker |
|---|---:|---|---|---|---:|---|---|
| 1440×900 | 6.2 s | `CLAIMS 11/11 HOLDING` ×3 | 9 / 9 equal the derivation | 0 of 8 | 0 | none | same build, 11/11 |
| 390×844 | 5.6 s | ×3 | 9 / 9 | 0 of 8 | 0 | none | same build, 11/11 |
| 320×844 | 5.1 s | ×3 | 9 / 9 | 0 of 8 | 0 | none | same build, 11/11 |
| 1440×900 · reduced motion | 1.5 s | ×3 | 9 / 9 | 0 of 8 | 0 | none | — |

Also observed: the worker installs one build (`caches.keys()` is exactly
`cytherai-substrate-EF57500CC99E3711`, the page is controlled on first load); DS-04 finds
the redrawn seal pixel-identical to the stamped one on all seven title blocks; DS-01's
serial equals the parameters; CL-03 re-derives the three admissions and the revisions list
prints every epoch's checksum; FIG. 1 settles on `PRG-446DF7E6 · PROGRAM 3 OF 7 · LARGEST
ADMITTED` (the object `tools/test-drawing-set.js` pins); the keyboard edge (ArrowUp ×3 →
ARG RANGE, back to −3 → admitted, Enter → `PRG-F8FD3FB1` is the drawing, DS-05 restated)
matches the pinned limits; Sheet 7 discloses `9 OWED · 10 SUPERSEDED`.

**Open, named:**

- Safari/WebKit, VoiceOver, a physical phone, 120 Hz scrolling — the owner's observations,
  as before; append-only, and admission does not wait on them.
- CY-ORIGIN-001 on GitHub Pages: §7.

**Addendum, build `9236E6A692F915D4` (2026-09-17).** Two changes after an outside read of
the live set: every title block carries a seven-link sheet index (`#s1`–`#s7`, the current
sheet marked `aria-current`) so a visitor landing mid-set can cross it — drawing sets have
one; and the FIG. 1 edge handle's hit area is a 28 px `::after` around the unchanged 14 px
mark, with the four text controls under the figure lifted to 24 px (WCAG 2.5.8), pinned by
`tools/test-site.py`. The same bounded observation re-ran against the artifact as an origin
root — 1440×900 / 390×844 / 320×844 / reduced motion, three samples `CLAIMS 11/11 HOLDING`
each, 9/9 checksum sites, 0 external requests, 0 console errors, no overflow, offline reload
through the worker on the same build — plus: clicking `5` from sheet 1 lands sheet 5 at the
top; `elementFromPoint` 12 px from the handle's centre hits the handle in all four
directions. CY-SEM-001/002 re-bound (`#canonical_settle_9236E6A692F915D4`,
`#epoch_reproduction_9236E6A692F915D4`). Safari/WebKit, VoiceOver, a physical phone and
120 Hz remain the owner's.

## 6. Launch gate

All six must hold before the origin is public. Items 3, 4 and 6 are owner
decisions, not engineering steps.

1. The §5 WEBKIT-SPECIFIC residual (W1–W8) has been run in Safari and recorded.
   The Chrome pass closed everything else observable in a browser; what remains
   is genuinely engine-specific, not merely unobserved.
2. `./deploy.sh` succeeds and `find dist -type f` is exactly the allowlist;
   the three 404 checks in §4 pass on staging.
3. The origin sends the §1 headers (`curl -sI` verified).
4. **Owner decision — the epoch-04 commitment.** The chip no longer claims a
   seal it does not have: it prints `COMMITMENTS[0].status`, currently
   `PREIMAGE PUBLIC · DEMONSTRATION`, which is true —
   `newC3/epoch04-preimage.txt` hashes to the published digest, and the deploy
   allowlist keeps that file off the origin but does not make the preimage
   secret. Launch may proceed on that honest statement. To ship an actual
   pre-registration instead, replace digest, date and status in `js/manifest.js`
   (data-only) once the preimage exists in the owner's custody alone **and**
   appears in no history intended for public release — note that the current
   preimage is in the git history, so a real seal needs a fresh preimage, not
   a deletion. Restoring `PREIMAGE SEALED` before that is true re-opens the
   defect this replaced.
5. `./verify.sh` green at the release commit; the browser-only runner reports
   33/33 and the served homepage reports claims `10/10 HOLDING`.
6. The `PROVISIONAL` values in `js/manifest.js` (epoch history, counts,
   commitment preimage) reviewed by the owner. Shipping them knowingly is
   permitted — they are marked in source — but it must be a decision.

---

## 7. Publishing — GitHub Pages

The origin is GitHub Pages serving the `gh-pages` branch of `origin`, with `CNAME`
(`cytherai.com`) and `.nojekyll` shipped in the artifact — both are in `deploy.paths`, so
they are in the build identity and `deploy.sh` ships them. `./publish.sh` builds `dist/`
and force-pushes its contents as a single-commit `gh-pages`; it refuses a served file
with uncommitted changes, a HEAD not reachable from `master` (publishing is for admitted
states), and a failing `./verify.sh`. The branch is an artifact, not a record: the record
is this repository, and each publish commit names the build and the source commit.

**Disposition — headers.** Pages cannot send the §1 headers (`frame-ancestors`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy`, HSTS is Pages' own) and sets
`Cache-Control: max-age=600` on every response, so the §2 `no-cache` for `sw.js` and
`index.html` is not achievable there. Recorded, not hidden: the per-page meta CSP stands
(minus `frame-ancestors`, which a meta cannot carry); the atomic-install worker means a
stale HTTP cache costs a returning reader at most ten minutes of the previous build and
never a half-installed one. CY-ORIGIN-001 (`ORIGIN_MATCHES` the certified artifact and
origin contract) therefore cannot PASS on Pages as the contract is written; it stays
NOT_EVALUATED until either the origin can send the headers or the contract records Pages'
limits as accepted. That decision is the owner's, and it is a release-disposition entry,
not an edit to the obligation.

## Next work — external certification and owner attestation

Construction is finished; nothing below is a repository change.

1. Run W1–W8 in Safari/WebKit as a **differential** against the Chrome record —
   record divergence only.
2. Deploy the exact candidate bytes to the intended origin.
3. Verify headers, HSTS, MIME behaviour and 404 handling there (§1–§4).
4. Decide whether epoch-04 remains an explicitly public demonstration or is
   supplemented by a fresh genuine commitment (gate item 4).
5. Sign off every `PROVISIONAL` manifest value at exactly its declared
   evidentiary status.
6. Re-run the complete release battery **only if candidate bytes change**.
7. Tag the exact certified commit.
