# Deployment contract

> **Front door changed 2026-10-12.** The homepage is now the film (`index.html`, `js/film.js`,
> `css/film.css`, `film/`; `docs/architecture.md`). THE UNHAPPENED it replaced is retired whole
> to `backup/unhappened-v1/`; its Chrome record is §5d and §5g and stands as written. The film's
> own Chrome observation is §5i.
>
> **Front door changed 2026-10-04.** The homepage became THE UNHAPPENED (`index.html`,
> `js/unhappened.js`, `js/trace.js`). The drawing set it replaced is
> retired whole to `backup/drawing-set-v1/`; its Chrome record is §5c and stands as written.
> Before it, the front door changed on 2026-09-16 from instrument-v1 (retired whole to
> `backup/instrument-v1/`), and every browser observation in the certification block, §5,
> §5a and §5b was made against that world. All of these are the history of the worlds they
> observed, not evidence about this one. THE UNHAPPENED's own Chrome observation is §5d;
> Safari, VoiceOver, a physical phone and the origin remain the owner's. §1–§4 and §6
> (headers, MIME, redirects, live-origin verification, the launch gate) are the contract for
> any front door and remain in force.

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

The 22b2955/665739b Chromium record below remains true of those commits, but it
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
Chromium-observed source commit:      22b2955
Release-candidate repository commit:  665739b
Repository delta:     ten generated study PNGs removed from assets/; no
                      runtime, deployment, integrity, service-worker, HTML,
                      CSS, or JS file changed
Artifact equivalence: rebuilt dist/ contains 19 files; every file SHA-256
                      identical to the 22b2955 Chromium-observed baseline;
                      build hash remains C4F7059DAC405AE6; integrity
                      regeneration is idempotent
Conclusion:           Chrome certification evidence from 22b2955 remains
                      applicable to 665739b because the complete
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
| `Content-Security-Policy` | `frame-ancestors 'none'` | `frame-ancestors` is **ignored** in a `<meta>` CSP, so the per-page meta policies cannot deliver it. Without it the homepage — the glass that takes a press-and-drag, the contact CTAs — can be framed and overlaid. Header-level only; keep the meta CSP as defense in depth. |
| `X-Content-Type-Options` | `nosniff` | The site serves JS with SRI; MIME sniffing must not be able to reinterpret a response. |
| `Referrer-Policy` | `no-referrer` | The site makes zero external requests by design; referrers must not leak on outbound clicks either. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Nothing on the site uses these. Say so at the origin. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **Final domain only.** Effectively irreversible for the max-age — do not set on a staging host or a domain whose subdomains are not all HTTPS. |

**On GitHub Pages (accepted by the owner, 2026-10-04 — §7).** Pages sends none of these
headers and cannot be configured to. The contract on Pages is therefore: `Referrer-Policy` is
carried by every page itself (`<meta name="referrer" content="no-referrer">`); the other four
are accepted as absent, each for the reason recorded in §7 and in
`vaic/release-dispositions.v0.json`. **HTTPS is not one of them:** Pages can redirect HTTP to
HTTPS ("Enforce HTTPS"), so on Pages the contract requires it (§3, §4).

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
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://HOST/                # 301 https://HOST/
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

#### SAFARI 27.0 OBSERVED (2026-08-05, safaridriver against the built artifact, commit ff20fa8)

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
pre-P8 tree (aaec088) fails at five sample depths against four now, and P8
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
harness against `917bebf` (the build before `docs/audit/07`):

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

## 5d. THE UNHAPPENED — Chrome observed, 2026-10-04

Build `33EF803E25246693`, the artifact `dist/` served as an origin root, HeadlessChrome 154
over CDP (`vaic/evidence/current-browser-observations.v0.json#unhappened_settle_33EF803E25246693`
and `#reading_ink_33EF803E25246693`; the receipts bind CY-TEMP-001 and CY-SEM-003 in
`vaic/cytherai-obligations.v2.json`). Frame requests are counted by wrapping
`requestAnimationFrame` before any page script; reading ink is measured against the ground
actually composited beneath it — the frame loop frozen, one capture with every glyph's fill
transparent (the ground), one with every fill magenta (glyph support) — at every
glyph-support pixel, one sample per section.

| Profile | Settle after the end | Frames in 3 s once settled | Scroll wakes, resettles | Reading-ink elements · worst | External requests | Console errors | Horizontal overflow | Offline reload through the worker |
|---|---:|---:|---|---|---|---:|---|---|
| 1440×900 | 2.31 s | 0 | yes | 142 · worst 5.01:1 | 0 of 22 | 0 | none | same build |
| 390×844 · dpr 3 | 1.79 s | 0 | yes | 132 · worst 4.85:1 | 0 of 22 | 0 | none | same build |
| 320×844 · dpr 2 | 1.54 s | 0 | yes | 132 · worst 4.83:1 | 0 of 22 | 0 | none | — |
| 1440×900 · reduced motion | 1.03 s | 0 | yes | 142 · worst 5.01:1 | 0 of 11 | 0 | none | — |
| 1440×900 · no WebGL | 0.0 s | 0 | yes | 61 · worst 5.24:1 | 0 of 11 | 0 | none | — |

Also observed: the four modules execute under SRI; the worker installs exactly one build
(`caches.keys()` is `cytherai-substrate-33EF803E25246693`) and controls the page after a
reload; with the server stopped, a reload renders the same build from the worker. The two
`data-m` marks print `0.00%` and `10.00%`, equal to `CytherManifest.project`, none outlined;
every claim renders with its condition and source. The opening runs once (≈4.4 s) and is
skipped under reduced motion and without WebGL. A forged `#trace=00000003.5.DEADBEEF` is
refused (`#unsent`); a press-and-drag on the glass produces `#trace=D7CF8F5E.1.7A60A047`
within 1.8 s, the link replays in a fresh page, and its receipt is carried to the end as
*sent to you · TRACE-1*.

**Fixed before this build, named here so the record is not more optimistic by omission.**
The first run of the harness (build `82B60586F9858C49`, a provisional candidate never
committed) measured the white law line inside the pane at 1.13–1.67:1 at its worst glyph
pixels (medians 1.2–3.2:1) on every profile, the HUD's quiet ink at 4.11:1 on desktop and
down to 1.79:1 over the pane's interior, and a bead behind *Most proposals* at 3.72:1 where
the left scrim had already faded. The law now reads in ink on a soft paper veil
(and, without WebGL, in the copy column), the HUD is `--ink2` over a bottom band of the scrim,
and the scrim keeps ≥ .46 of paper across the whole copy column. The HUD also printed
"1 proposed operations"; it now agrees in number.

**Release candidate, build `D215BA534299A451` (2026-10-04).** The review of the acceptance moment and the
release checks, against the same harness extended (`#unhappened_settle_D215BA534299A451`,
`#reading_ink_D215BA534299A451`; receipts on CY-TEMP-001 and CY-SEM-003):

| Profile | Settle | Frames in 3 s once settled | Reading-ink elements · worst | External requests | Console errors | Offline reload |
|---|---:|---:|---|---|---:|---|
| 1440×900 | 1.8 s | 0 | 143 · worst 5.01:1 | 0 of 22 | 0 | same build |
| 390×844 · dpr 3 | 1.54 s | 0 | 133 · worst 4.85:1 | 0 of 22 | 0 | same build |
| 320×844 · dpr 2 | 1.54 s | 0 | 133 · worst 4.83:1 | 0 of 22 | 0 | — |
| 1440×900 · reduced motion | 1.03 s | 0 | 143 · worst 5.01:1 | 0 of 11 | 0 | — |
| 1440×900 · no WebGL | 0.0 s | 0 | 122 · worst 5.24:1 | 0 of 11 | 0 | — |

- **Acceptance.** Scene 3 thins the rain, watches one proposer at a fixed place, recedes the
  pane's memory and follows that proposer's next real accepted step from strike to vertex.
  The black candidates were invisible before this build in every scene: their lines wrote no
  distance, so depth of field blurred them as if they lay at the floor behind them. They now
  render as v4 intended, black under the pane. Copy: *An accepted step is not yet an admitted
  program.* Whether a stranger reads it so is §5e, not a harness.
- **Without a mouse.** Keyboard: 20 stops, every one with a focus ring and fully visible (a
  focused section scrolls to its centre), the studio last; ← reads *REFUSED · AXIS ORDER · t…*, ↑ reads
  *ADMITTED · PRG-354F2E1…*, through `#receipt` (`role="status"`); Esc clears. Touch (390×844): a tap on a trace
  reads the same receipt the keys do and proposes nothing; a drag on the glass proposes.
- **200% zoom.** 720×450 and 640×360 CSS px: no copy clipped in any section, no overflow (the
  first run found four sections clipped at 640×360; a short-viewport rule fixed them).
- **No WebGL.** The cover is captioned with the three relations; the law reads in the copy
  column; reading ink ≥ 5.24:1 including the captions.
- **The artifact.** 9 pages, 33 local references, none broken; every film, CV, deck and
  image answers.
- **Upgrade from the live site.** A visitor holding the live build (`9236E6A692F915D4`, `0c839ac adii: full names and CVs`, its worker
  and cache): the first load after this build is deployed is still the old build from its
  cache; the new worker installs in 2.0 s, the old cache is deleted, and the next load is
  `D215BA534299A451` with every module executing and no console error.
- **Referrer.** Every page now withholds the referrer itself (`no-referrer`), the one §1
  header GitHub Pages cannot send and a page can.

**Open, named:** CY-TEMP-002 (the three transitions, human-reviewed) and CY-ORIGIN-001 (§7)
are NOT_EVALUATED; Safari/WebKit, VoiceOver, a physical phone, 200% zoom and 120 Hz
scrolling remain the owner's.

## 5g. Hardening pass — iOS Simulator, long sessions, weak devices, 2026-10-04

The concept frozen; one production-engineering pass. Build `A93820E17D59245C` (Chrome battery
§5d-style, receipts on CY-SEM-003 and CY-TEMP-001; `vaic/evidence/current-browser-observations.v0.json#hardening_A93820E17D59245C`
for everything below, each part naming the build it was measured on). iOS WebKit was run in
the iOS 26.5 Simulator (Xcode 27.0: iPhone 17, 17e, 17 Pro Max, Air) against a test copy of the
artifact that differs only by an injected diagnostics script and `connect-src 'self'`.

**Found and fixed.**

- **iOS startup was blank for seconds.** Shader compilation blocked the page: on a cold iPhone
  17 Pro Max the scene program's link alone took 2.4 s, first paint came at 6.5 s and the copy at
  11.6 s. The nine programs now compile on the driver's threads
  (`KHR_parallel_shader_compile`, available in WebKit and Chrome) and are queried only when
  finished; past 600 ms the opening is given up so initialisation never poses as silence; the
  canvas stays invisible until its first frame. Cold iPhone Air: first paint 2.6 s, copy 3.5 s,
  studio 4.2 s (simulator launch included). Chrome: first studio frame at 79 ms.
- **A returning iOS reader could get a dead page at every deploy.** Safari checks for the
  worker update at the navigation itself; a new worker that skipped waiting took over the
  previous-build page mid-load and answered its module requests with the new bytes, which then
  failed SRI. Two worker-side fixes were tried and rejected on evidence: serving by
  `request.integrity` (Safari sends an empty one for a parser-inserted deferred script) and
  serving pages open at activation from the previous cache (failed with differing module
  bytes). The fix is the standard one: a new worker waits, and a page whose modules have all run
  lets it in (`take-over`). With module bytes differing between builds, the old policy lost 3 of
  6 first visits; the waiting policy kept 9 of 9, every reload running. Cost: a tab holding a
  page from before this build stays on that build across reloads and moves on in its next
  session (Chrome, observed: reload = old build, next session = new, no error). The live build's
  own upgrade (from the drawing set) went through the old policy.
- **If the scripts never run, the copy now shows anyway**: the opening's hiding unveils itself
  after 6 s (CSS).
- **The HUD covered the copy on short iPhones** once "Your proposer" appeared under Safari's
  toolbar. The copy now clears the HUD at its measured height and pins to `100svh`; zero
  overlaps since, on every device and section.
- **A weak or software GPU ran a slideshow** (3–8 fps, frames to 965 ms). The governor now judges
  by the second, steps resolution down within seconds, and a device still under ~11 fps at the
  lowest resolution gets the paper cover (`starve()`), which reads as intended.
- **An unattended tab never rested**, and after ~48,000 refusals the pane's memory saturated
  into a solid cobalt field. After two minutes without input the rain now stops and the page
  rests; any input brings it back.
- **A tap on the glass made a proposal**, so a thumb landing to scroll could seed one. Only a
  drag proposes now; a tap reads.
- **Headings** now carry their system's name for assistive technology.

**Measured and left alone.** Frame times are flat: Chrome p99 ≤ 18.6 ms in every minute of a
20-minute session (57,723 operations, 204 programs, no frame over 33 ms), p99 18.3 ms and worst
29.5 ms in the 1.5 s after each of 184 admissions, 18.2 ms while hovering receipts over an
8,000-trace history; iOS Simulator ≈ 60 fps per scene, p99 17–23 ms. The JS heap moves between
7 and 30 MB with no trend; listeners stay at 11. The 6,000-cell prism cap holds about 565
programs (about an hour of continuous heavy rain). With the CPU slowed 6× Chrome still holds
p99 18.3 ms. The accessibility tree: one h1 and eight h2 in order, banner/navigation/main, all
20 interactive elements named, every factual statement present as text, the receipt region
polite.

**Addendum, build `8E49D942927C5361`: scene 3 on phones.** Reported by the owner: the accepted
step in *Only the valid crosses* did not show on a phone. Its close camera was tuned on desktop;
a portrait phone sees about a third of the width, and the phone's upward lens shift put the
watched place at the top edge, under the header, with the middle of the screen empty. Scene 3
now has a phone framing (further back, the place lowered into the open middle), and short wide
screens (a phone on its side) keep the desktop veil so the studio stays visible beside the
copy; only short narrow ones (200% zoom) are veiled whole. Observed: the candidate, its beads
and receipts in frame at 390×844, 320×700, 844×390 and on the iPhone 17e simulator (390×699);
reading ink ≥ 4.88:1 in every profile, 5.07:1 in landscape and 5.05:1 at 1280×520; the full
battery green (`#unhappened_settle_8E49D942927C5361`, `#reading_ink_8E49D942927C5361`).

**Still the owner's.** A physical iPhone (thermal throttling, real GPU, touch feel, Low Power
Mode, rotation), Safari on macOS (its automation is off on this Mac), VoiceOver, 120 Hz. There is
no sound to check: production has none.

## 5h. THE EXCEPTION — published as an experiment, 2026-10-04

`exception/` ships beside the front door and does not replace it; the homepage links it from
the nav ("Try it"), its closing section ("Would you let it happen? →") and its footer. Two
encounters: *Draw* releases a drawing to this site's real boundary engine (refused at operation
6, CROSSES; the alternative admitted, kernel-verified, `PRG-9FD9BC52`), and *Correct* holds a
number against evidence as a labelled illustration with constructed figures. Execute and Record
are parked until each has a defensible case.

**Status, stated plainly: understanding has not been tested.** No unfamiliar reader has used it
yet. The test stays optional and does not gate the release; when it is run (pick either
encounter, note whether they try the other unprompted, then ask "What does CytherAI build?"),
its answers are recorded here verbatim with the build they saw.

Build `5627D34CD6B86545`: both encounters run from the served path under SRI on desktop and
phone with no console error and nothing off-site; the homepage battery green with the new links
(reading ink ≥ 4.88:1 over 150 elements on desktop, "Try it" in the tab order, 10 pages and 35
local references resolving, none broken).

## 5i. The film — Chrome observed, 2026-10-12

Build `B068554A3A562886`, the artifact `dist/` served as an origin root by a static server that
answers byte ranges (as GitHub Pages does; `python3 -m http.server` does not, and a film cannot
seek there), HeadlessChrome 155 over CDP
(`vaic/evidence/current-browser-observations.v0.json#reading_ink_B068554A3A562886` and
`#film_settle_B068554A3A562886`; the receipts bind CY-SEM-003 and CY-TEMP-001 in
`vaic/cytherai-obligations.v3.json`). Reading ink: the film held at twelve declared seconds
(every seek confirmed to land, or the run stops), the still state and each section in view;
one capture with every glyph's fill transparent (the ground actually composited beneath it,
darkening and text-shadow included), one with every fill magenta (glyph support), WCAG 2.1
contrast at every glyph-support pixel. Settling: frame requests and timer callbacks counted
from before any page script, and the media playing, for 3 s once the film and every sequence
have ended.

| Profile | Film to still | Frames · timers · media in 3 s once settled | A sequence scrolled back plays, then resettles | Reading-ink elements · worst | External requests | Console errors | Horizontal overflow |
|---|---:|---|---|---|---|---:|---|
| 1440×900 | 11.35 s | 0 · 0 · 0 | yes | 134 · worst 5.17:1 | 0 of 17 | 0 | none |
| 390×844 · dpr 3 | 11.1 s | 0 · 0 · 0 | yes | 128 · worst 4.81:1 | 0 of 16 | 0 | none |
| 320×844 · dpr 2 | 11.1 s | 0 · 0 · 0 | yes | 126 · worst 4.75:1 | 0 of 16 | 0 | none |
| 1440×900 · reduced motion | at once | 0 · 0 · 0 | posters held, by design | — | 0 of 13 | 0 | none |

Also observed: the worker installs exactly one build (`caches.keys()` is
`cytherai-substrate-B068554A3A562886`) and controls the page after a reload; with the server
stopped, a reload renders the same build from the worker, in the still state, the statement
visible over the cached final composition, all three fonts loaded, and no console error
besides the unreachable film. Each sequence played when it came into view; the statement,
its links and Replay stand at the end; the page names no film that does not ship.

**Fixed before this build, named here so the record is not more optimistic by omission.** The
first measurement (on the study, the same day) found seven elements below 4.5:1 over bright
film: the header on phones (to 1.12:1), the conceptual-visualization line (to 1.0:1) and
Replay (2.21:1) along the film's lower edge, and the principle over the final composition (to
1.24:1). Localized darkening under the header, along the lower edge, behind Replay and behind
the principle fixed them; the captions and the statement already held. An earlier run of the
probe against a server without byte ranges never sought the film, so its captions were
measured over the opening frame only; it is not evidence. A reviewer also found the phone
document 479 px wide (a caption's darkening reached past the screen) while the harness
reported no overflow: it compared the width with `innerWidth`, which mobile emulation widens
to the content. The film section now clips its decoration, and every overflow figure here is
measured against the emulated width.

**The live origin (2026-10-12, after publishing).** CY-ORIGIN-001 PASS
(`#origin_closure_B068554A3A562886`): 53 of 53 served paths redirect from http to the same
https path and serve bytes identical to the artifact; every hidden path (THE UNHAPPENED's
snapshot and modules, the render scripts and the study included) is 404 with the styled body;
every film answers a byte range (206); the worker is `cytherai-substrate-B068554A3A562886`;
the header absences are exactly the limits accepted in §7. The film suite against
`https://cytherai.com/` passed on desktop and phone. On the first, cold-CDN fetch the phone's
vertical film started about 4 s after load and played slower than real time while it
buffered (it ended about 15 s after load); its sentences stayed in step with it, and the
replay ran at full speed. A mid-film stall is not covered by `GUARD`, which only gives way
when the film has not started: a refinement to weigh, not a defect against any obligation.

**Open, named:** Safari/WebKit muted inline autoplay, a physical phone (including iOS Low Power Mode, which
refuses autoplay and must show the still state), VoiceOver and a slow real network remain the
owner's (§5f). No unfamiliar viewer has yet been asked to say what the film shows.

## 5j. The stall fallback, the film's social card and a production audit — 2026-10-13

Build `7384EF28FD9CCBCB`, `dist/` served as an origin root with byte ranges, HeadlessChrome 155.0.8059.40 over CDP unless
stated (`vaic/evidence/current-browser-observations.v0.json#film_stall_7384EF28FD9CCBCB`,
`#film_settle_7384EF28FD9CCBCB`, `#reading_ink_7384EF28FD9CCBCB`, `#production_audit_7384EF28FD9CCBCB`).

**A film that starts and then stalls.** A reviewer read in `js/film.js` that the startup guard was cleared once playback
began and nothing handled a later stall; the live build confirmed it (§5i: the phone film stopped at 0.5 s on a cold CDN).
The film now gives way to its final composition and the whole statement when it stops advancing for `STALL` (2 s) while
the page is visible; it drops its source, so its poster stands and a late download cannot pull the visitor back; Replay
stays theirs. The sequences rest on their posters the same way. A test server that starves one file part way
(`stallserve.py`) showed, against the live build `B068554A3A562886` first, the failure: the film held a frame at 3.72 s
with its caption and no statement for as long as it was watched, the sequence held a frame at 1.42 s. Against this build:

| Case | Stopped advancing | Gave way | Then |
|---|---:|---:|---|
| The film starves at 35% (bytes released at 14 s) | 3.64 s | 5.45 s | the poster and the statement, 0 timers in 3 s, still after the bytes arrive; Replay plays the film |
| A sequence starves at 30% | 1.29 s | 3.6 s | rests on its poster, stays so scrolled away and back, 0 timers |
| The film starves while the page is hidden | — | 2.07 s after the page is visible | nothing while hidden (4 s) |

A screenshot of the first build of the fix caught the stopped caption fading out under the statement; captions now leave
without a fade once the page is still. A first settling run then counted one timer callback after a replayed sequence:
the sequences' watch noticed on its next 250 ms tick that nothing played. It now stops on the last pause or end, and the
page settles with its media (0 frames, 0 timers, 0 playing media in four profiles). Reading ink across 388 element samples,
worst 4.75:1; the probe holds the film at its declared seconds by reporting the page hidden, whose time the stall rule
does not count.

**The phone on Chrome's throttling presets** (390×844, worker bypassed, cache disabled):

| Connection | First sentence | What the visitor gets | Still at |
|---|---:|---|---:|
| Fast 4G | 1.31 | the whole film | 12.74 s |
| Slow 4G | — | the final composition and the statement, no film | 3.36 s |
| 3G | — | the final composition and the statement, no film | 4.12 s |

Below about 5 Mbit/s the vertical film cannot keep pace with real time (7.4 MB over 12 s); those visitors get the message
within about four seconds rather than a stuttering film.

**The social card** is now the film's last frame with its statement (`tools/render-og-film.py`, `assets/og/og-card.png`,
IMG-008, ILLUSTRATIVE); the orbit plate it replaced is `backup/og-card-v1/` with its receipt. Every page that names it
asks X for the large card (`twitter:card`); X's own markup documentation answered HTTP 402 and was not read.

**Audit, the same build.**
- iOS Safari 26.5 (Simulator, iPhone 16 Pro Max, an instrumented test copy reporting to a local server): the vertical film
  autoplays muted and inline, each sentence in its window, still at 12 s, no error; the sequences play in view and hold.
  The wordmark's ✳ rendered as a green colour-emoji tile; U+FE0E now asks for the text glyph, and it renders warm.
- A returning visitor (the live build's worker in place, then this build, `js/film.js` bytes differing): in Chrome and in
  iOS Safari the next load is the old build intact from its worker, the one after is this build, its script runs, no error.
- Accessibility: the statement, the page's only `h1`, was absent from the accessibility tree for the film's first 11 s;
  it is present from the start now, its links waiting for it. The silent film had no text alternative (WCAG 2.1 1.2.1);
  a screen-reader-only paragraph describes it and carries its three sentences. Twelve Tab stops, each visible and outlined.
- 200% zoom (720×450, 640×360), a phone on its side (844×390) and a small phone (320×568): no overflow, nothing outside the
  viewport, no overlap.
- `manifest.webmanifest` carried the light theme and background colours; both are `#07070a`.

**The live origin (2026-10-13, after publishing).** CY-ORIGIN-001 PASS (`#origin_closure_7384EF28FD9CCBCB`): 53 of 53 served paths redirect from http and serve the artifact's bytes (the new social card included); every hidden path is 404 with the styled body (the retired card and the render scripts included); every film answers a byte range; the worker is `cytherai-substrate-7384EF28FD9CCBCB`. Release CERTIFIED.

**Open, named:** macOS Safari (`safaridriver` needs the owner's admin password), a physical phone (Low Power Mode refuses
autoplay; the still state is built for it), VoiceOver as heard, and a first-time viewer.

## 5k. The Cyther Seal — 2026-10-13

Build `D163C64D2D9485FE` (`#seal_adoption_D163C64D2D9485FE`, `#reading_ink_D163C64D2D9485FE`,
`#film_settle_D163C64D2D9485FE`). The owner adopted the seal identity (`cyther-seal-identity.html`, a draft) and asked
for "whatever version is more aligned with the whole website". The primary lockup was chosen: the solid seal, in the
site's own ink and ground, left of the wordmark, in place of the ✳. The draft's "inline · replaces the asterisk" lockup
paints the whole seal warm, which its own colour rule forbids ("never the colour of the whole seal on ground"); warm
stays the site's accent for labels and the film's current.

- **Computed, not drawn.** The identity's published Python, its in-page JavaScript and `tools/render-seal.py` give the
  same path from SHA-256("CytherAI"): 77 proposals, 29 admitted, 48 refused, 30 of 36 cells. The script refuses to run if
  its path ever differs from the published one; `tools/test-site.py` requires every inline seal (the front door, six
  subpages, the card) to equal the computed one, and catches a one-cell move.
- **Where it is.** The front door's header (pixel-fitted, 26 px), the cold-paper subpages' nav (16 px, paper ink), the
  social card (34 px), the favicon (the 32-unit fitted seal) and the app icons (180, 192, 512 and a maskable 512 whose
  path stays inside the central 80% circle). The orbit icon family and its generator are retired to `backup/icon-v1/`.
- **Found before this build.** The first candidate set the header link as a flex row with a gap, which split the
  wordmark into "cyther ai"; the gap is the seal's own margin now.
- **Unchanged behaviour, re-observed.** Reading ink across 349 element samples, worst 4.75:1; 0 frames, timers or
  playing media once settled in four profiles; the stall fallback passes its three cases.
- **The live origin.** CY-ORIGIN-001 PASS (`#origin_closure_D163C64D2D9485FE`): 54 of 54 served paths redirect from http and serve the artifact's bytes (the maskable icon included); every hidden path is 404 (the retired icons and the seal's generator included). Release CERTIFIED.
- **iOS Safari.** On the iOS 26.5 Simulator (iPhone 16 Pro Max) the seal renders crisp on the front door and on the cold-paper brief; the film plays and settles, no error. One run of the Chrome playback suite logged a single connection reset from the local test server; a re-run was clean in every scenario.

## 5l. The sequences on a phone — 2026-10-13

Build `C9EF337977140EDC` (`#sequence_warmup_C9EF337977140EDC`, `#reading_ink_C9EF337977140EDC`,
`#film_settle_C9EF337977140EDC`). The owner saw ADII's and CytherCAD's sequences frozen on a phone while AWC-OS's
played. Chrome, even throttled to Slow 4G, played all three; iOS Safari did not, and the reason is how it loads video: it
downloads a clip only once asked to play it, and buffers all of it before the first frame moves. A sequence asked on
arrival therefore sat on its poster, which is its last frame, for the whole download, and the live build's start limit
could abandon it for good. At 1.8 Mbit/s (an instrumented test copy in the iOS Simulator, iOS 26.5 on an iPhone 16 Pro Max
image, the sequences rate-limited by the test server, the page scrolled by script at 16, 23 and 31 s; this is simulator
evidence, not a physical iPhone's):

| Sequence | Size | Live build `D163C64D2D9485FE`: still for | This build: playing after |
|---|---:|---:|---:|
| ADII | 0.72 MB | 3.5 s | 0.1 s |
| AWC-OS | 0.59 MB | 2.5 s | 0.2 s |
| CytherCAD | 0.72 MB | 3.1 s | 0.2 s |

Once the film is still, the three are warmed in turn: each is started muted off screen and paused as it plays, and the
next waits until the last is wholly buffered. (That did not keep a sequence being watched off a link shared with one
warming, as this section first said: a sequence arriving in view loaded beside the clip warming, and beside one scrolled
past mid-download. A reviewer found it; §5m.) A
slow start is never a failure; a sequence that has moved and then stalls rests on its poster and tries again on its next
arrival. Two attempts were discarded on the way: an early-download hint, which iOS ignored, and warming without waiting,
which slowed the watched sequence on Slow 4G. Chrome on Slow 4G now plays all three through, scrolled to during the film or
after it. Reading ink across 349 element samples, worst 4.75:1; 0 frames, timers or playing media once settled.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_C9EF337977140EDC`), 54 of 54 served paths matching the artifact. Release CERTIFIED.

## 5m. One download at a time — 2026-10-13

Build `E7D99F9F08D3BC89` (`#sequence_download_slot_E7D99F9F08D3BC89`, `#reading_ink_E7D99F9F08D3BC89`,
`#film_settle_E7D99F9F08D3BC89`). A reviewer read in `js/film.js` that a sequence arriving in view loaded and played on its
own, outside the warm-up queue, so two downloads could overlap and §5l's "never shares a slow link" was too broad. A
probe that records, every 100 ms, each moment two or more sequences hold a source not yet wholly buffered confirmed it
on the live build, and found a second path: a sequence scrolled past mid-download kept downloading beside the next.

The sequences now share one download slot. A sequence arriving in view takes it from a clip warming off screen, which
drops its download and goes back in the queue; it never takes it from another sequence in view, and waits behind it.
A free slot goes first to a sequence in view still waiting, then to the next to warm. The film is outside the queue: a
sequence scrolled to while the film is still loading downloads beside it.

**Chrome, Slow 4G** (Chrome's preset caps the whole link; cache disabled, worker bypassed; seconds after arrival):

| Scenario | Live build `C9EF337977140EDC` | This build |
|---|---|---|
| Phone, straight to CytherCAD as the warm-up begins | 2 downloading at once; first frame 1.29 s, ended 8.23 s | 1; 1.04 s, ended 6.97 s |
| Phone, past ADII and AWC-OS (0.6 s each) to CytherCAD | 3 at once; first frame 1.28 s, 4.9 of 6 s in 9 s, never ended | 1; 0.51 s, ended 6.7 s |
| Desktop 1440×900, ADII and AWC-OS both in view | 2 at once; ADII 1.03 → 8.76 s, AWC-OS 1.55 → 8.76 s | 1; ADII 1.03 → 7.23 s, AWC-OS waits: 5.69 → 11.61 s |
| Phone, each system after the film | — | 1; ADII 0.52, AWC-OS 0.26, CytherCAD 0.26 s, each ended |
| Phone, ADII 4 s after load, then on | — | 1; 0.26, 0.25, 0.25 s, each ended |

The cost is named: with two sequences in view on a slow link, the second now waits for the first (AWC-OS began at 5.7 s
rather than 1.6 s) while the first plays at its own pace instead of both sharing the link and stuttering. On a fast link
a clip of 0.6–0.7 MB arrives in a fraction of a second and the wait does not show.

**iOS Simulator** (iOS 26.5, an iPhone 16 Pro Max image; an instrumented test copy, the sequences served at 225 KB/s in
all, one link shared by every download; the page scrolled by script; simulator evidence, not a physical iPhone's):

| Walk | Live build `C9EF337977140EDC` | This build |
|---|---|---|
| Each system after the film (in view at 16, 23, 31 s) | playing 0.1, 0.2, 0.2 s after arrival | 0.1, 0.2, 0.2 s |
| Straight to CytherCAD at 13 s, as the warm-up begins; then ADII, AWC-OS | CytherCAD playing after 6.6 s, sharing the link with the warm-up, and not ended 11 s after arrival; the others 0.2 s | CytherCAD after 3.6 s, alone (iOS downloads a cold clip whole before it moves: 0.72 MB at 1.8 Mbit/s), ended at 22.7 s; the others 0.2 s |

Runs were discarded on the way, none admitted: a shell loop that passed no arguments opened a broken address in the
simulator during two runs; a tab left by one batch posted into the next one's log; a port reused from an earlier upgrade
test was still controlled by that test's service worker, which served an old build in place of the copy under test. Each
run now quits Safari first, takes a port never used before, and counts only the page it opened and the build it served.

**Unchanged behaviour, re-observed.** The stall fallback passes its three cases: the film starved at 35% gives way 2.0 s
after it stops; a starved sequence rests on its poster within `STALL` + 1.5 s at each of two arrivals, with 0 timer
callbacks once everything has stopped; the film starved while the page is hidden gives way 2.04 s after it is shown.
Settling: 0 frames, timers or playing media once still in four profiles; the worker caches exactly this build and serves
it with the server stopped. Reading ink across 349 element samples, worst 4.75:1. The playback suite (desktop, phone,
reduced motion, a refused play, a play that never starts) behaves as before. Accessibility and zoom were not re-run: no
markup or style changed.

**Open, named:** a physical iPhone (its radio, Low Power Mode, memory and thermal limits). Every iOS figure in §5l and here
is the Simulator's.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_E7D99F9F08D3BC89`), 54 of 54 served paths matching the artifact. Release CERTIFIED.

## 5n. The film on a real connection — 2026-10-13

Build `3C3C51BEDEAB3A59` (`#film_delivery_3C3C51BEDEAB3A59`, `#reading_ink_3C3C51BEDEAB3A59`,
`#film_settle_3C3C51BEDEAB3A59`). The owner reported that the film did not play in Safari or on an iPhone. The live
site in the iOS Simulator showed the same: the page gave way to the final composition and the statement without the
film ever moving. The cause was the films' weight against the link, not this morning's sequence change (the film's code
did not move):

- **The link.** From the owner's network the origin delivered a film at 3.9 to 9.5 Mbit/s on one connection and about
  6.8 Mbit/s on two. The films were encoded at 4.95 Mbit/s (phone) and 8.09 Mbit/s (desktop): the desktop film arrived
  slower than it plays, the phone film barely faster.
- **Safari.** iOS Safari starts a film only once it expects to play it through without stopping; it then never
  stopped. With the start limit lifted (an instrumented test copy, the film rate-limited by the test server), the
  shipped phone film began 12.1 s after load at 3.2 Mbit/s and 19.1 s at 2.4 Mbit/s. `GUARD` gave it 3 s, so at 4
  Mbit/s and below the visitor never saw it.

The fix is a lighter film and a start limit a real link can meet. Both films are re-encoded from their CRF 23 masters
(the render frames were not kept): the desktop film at 1440×810, 2.72 Mbit/s, 4.1 MB (from 12.1 MB); the phone film at
810×1440, 2.34 Mbit/s, 3.5 MB (from 7.4 MB); x264 `veryslow`, `-tune film`, CRF 29. Against the masters, VMAF 86.0 and
91.1; at a 1:1 crop the difference is a slightly softer motion blur. `GUARD` is 6 s.

**iOS Simulator** (iOS 26.5, an iPhone 16 Pro Max image; an instrumented test copy, the films and sequences served at
the stated rate in all; simulator evidence, not a physical iPhone's or Safari on a Mac):

| Link | Phone film, live build `E7D99F9F08D3BC89` | Phone film, this build | Desktop film in iOS WebKit, live build | Desktop film, this build |
|---|---|---|---|---|
| 5 Mbit/s | moving at 4.5 s, played through | — | — | — |
| 4 Mbit/s | never moved; still at 5.0 s | moving at 3.5 s, played through | never moved; still at 5.0 s | moving at 3.0 s, played through |
| 3.2 Mbit/s | never moved; still at 3.5 s | moving at 4.0 s, played through | never moved; still at 3.0 s | moving at 4.0 s, played through |
| 2.4 Mbit/s | — | moving at 4.0 s, played through | — | — |

(Seconds from the page's first script. The desktop film was played in iOS Safari by a test copy, because Safari on a Mac
cannot be driven here; both are WebKit, and the Mac remains the owner's to see.)

**A download turn that stuck.** While this was tested, the stall case for a sequence failed once: on its second
arrival AWC-OS never got the download turn, and stayed on its poster. Media events logged across 17 runs showed why. A
clip that arrives in one piece may report its progress (and suspend) before Chrome has parsed it, its buffered range
still empty, and never again: 3 of 68 loads, all in one run. The turn then stayed on a clip already whole; the next
arrival dropped that clip, and the turn stuck on one in view. The live build `E7D99F9F08D3BC89` has the same code (and
`C9EF337977140EDC`'s warm-up the same wait). Of 35 loads that completed, a full-buffer `progress` was seen in 32 and a
full-buffer `progress` or `canplaythrough` in all 35, so the turn is now also released on `canplaythrough`. A probe that
makes the race certain (every video's `buffered` reads empty until the clip has fired `canplaythrough`) warms only ADII
before the change, and all three after it.

**Chrome** (the phone, its throttling presets, worker bypassed, cache disabled) starts a film with little buffered and
plays it as it arrives, so the cost of the lighter film and the longer limit falls here, and is named: on Fast 4G the
whole film, as before (first sentence 1.32 s); on Slow 4G (1.6 Mbit/s) the film now plays through rather than giving way
at 3.6 s, but slower than real time, ending 21 s after load with its sentences in step (the statement readable at 19.8 s);
on 3G the statement at 7.4 s rather than 4.6 s, after `GUARD`'s 6 s.

**Unchanged behaviour, re-observed.** The stall fallback passes its three cases. Settling: 0 frames, timers or playing
media once still in four profiles; the worker caches exactly this build and serves it with the server stopped. Reading
ink over the re-encoded films across 349 element samples, worst 4.86:1. The sequences on Slow 4G: never more than one
download at once, after a jump, a skim, two in view and after the film. The playback suite as before; a play that never
starts gives way after 6 s.

**Open, named:** Safari on a Mac and a physical iPhone, as the owner sees them; below about 2.4 Mbit/s the film still
gives way to the statement after 6 s, by design.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_3C3C51BEDEAB3A59`), 54 of 54 served paths matching the artifact. Release CERTIFIED.

## 5o. The first visit — 2026-10-13

Build `FD22B035CA263E92` (`#film_first_visit_FD22B035CA263E92`, `#reading_ink_FD22B035CA263E92`,
`#film_settle_FD22B035CA263E92`). With `3C3C51BEDEAB3A59` live, the site in the iOS Simulator played the film for a
returning visitor, on the first load after the release and the next, every sentence in turn and then the statement; on a
newly created simulated iPhone, a first visit, it showed the film's first frame and gave way after `GUARD`. On a first
visit the worker registered as soon as the script ran, and its install fetched the precache past the HTTP cache (0.70
MB: the posters, the fonts, the pages) beside the film as it started; the simulator runs above had rate-limited only
the media, so they never saw it. The worker now registers once the film is still. A first visit with every file on one
shared link (an instrumented test copy in the iOS Simulator):

| Link | `3C3C51BEDEAB3A59` (worker at once) | This build (worker once still) |
|---|---|---|
| 4 Mbit/s | film moving at 5.6 s, played through | moving at 4.0 s, played through |
| 3.2 Mbit/s | never moved; still at 6.0 s | moving at 5.0 s, played through |

Everything else re-observed on this build, unchanged: in the iOS Simulator both films start in 3–4 s at 2.4–4 Mbit/s and
play through; Chrome's presets as in §5n; the stall fallback's three cases; settling, 0 frames, timers or playing media
in four profiles, the worker caching exactly this build once the film is still and serving it with the server stopped;
reading ink across 349 element samples, worst 4.86:1; the sequences, never more than one download at once, and the
warm-up past a clip that arrives in one piece; the playback suite.

**Open, named:** Safari on a Mac and a physical iPhone, as the owner sees them. A returning visitor's first load after a
release still installs the new worker beside the film (Safari checks for it at the navigation itself). Below about 3
Mbit/s on a first visit the film may give way to the statement after 6 s, by design.

## 5e. CY-TEMP-002 — the unfamiliar-viewer review (protocol)

> **Superseded on 2026-10-12 with THE UNHAPPENED.** CY-TEMP-002 governed motion that
> corresponds to the engine's own transitions; the film claims no such correspondence (it is
> labelled a conceptual visualization), so the obligation is SUPERSEDED in `v3` and this
> protocol stands as written for the retired front door.

CY-TEMP-002 is HUMAN_REVIEWED: no harness can establish that a stranger tells acceptance from
admission. Run it against the exact release candidate (its `<meta name="build-hash">`); a later
byte change expires it like any other receipt.

1. **Who.** Someone who has not seen the site and is told nothing about it. One per sitting.
2. **Setup.** A private window, the site fresh, the opening allowed to run. They scroll at
   their own pace. Note the device, browser and build. Do not explain anything, before or
   during.
3. **Ask, once they reach *Inside your walls*:**
   - *"Show me something that was refused."* Expected: a bead that stops at the glass, or its
     cobalt mark.
   - *"Show me something that got through. Was it finished?"* Expected: a black bead
     crossing, or the black outline under the glass, and *not finished / not real yet*.
   - *"When did something become real?"* Expected: a white solid rising out of its shadow on
     the floor, after a program completed.
4. **Result.** PASS only if all three are answered without prompting. If a black outline or a
   crossed bead is called real, admitted or done, acceptance is still being read as admission:
   FAIL. Refine scene 3 again and review the new build.
5. **Record.** Their words verbatim, the build, device, browser and date, and any prompt that
   was needed. The record is an observation in the evidence ledger
   (`human_review_<build>`) and a `HUMAN_PERCEPTUAL_EVALUATOR` · `HUMAN_REVIEWED` receipt on
   CY-TEMP-002 (`verification_identity: EXTERNAL`). The reviewer is not named.

## 5f. The owner's device checks

What a headless browser cannot stand in for, against the same build, appended as observed:

| Check | What to confirm |
|---|---|
| Safari (macOS) | the film autoplays muted and inline; each sentence appears in its window; it ends on the still composition with the statement and Replay; Develop → Console shows no error |
| iPhone Safari | the vertical film plays inline (not full screen); in Low Power Mode, where autoplay is refused, the still composition and the whole statement stand at once; each sequence plays as it comes into view |
| Android Chrome | as iPhone; the statement's links are reachable with the thumb |
| Keyboard only | Tab reaches *The three systems ↓*, the statement's links, Replay, each system's route, *Talk to us* and the footer; the focus ring is visible throughout |
| VoiceOver (macOS and iOS) | the statement is read as the page's heading; the three systems' headings and copy in order; the films are silent and hidden from it |
| A slow real network | a film that has not started within 3 s gives way to the still composition, and Replay plays it once it can |
| 200% zoom (⌘+) | the statement, the captions and the systems' copy unclipped |

## 6. Launch gate

All six must hold before the origin is public. Items 3, 4 and 6 are owner
decisions, not engineering steps.

1. The §5 WEBKIT-SPECIFIC residual (W1–W8) has been run in Safari and recorded.
   The Chrome pass closed everything else observable in a browser; what remains
   is genuinely engine-specific, not merely unobserved.
2. `./deploy.sh` succeeds and `find dist -type f` is exactly the allowlist;
   the three 404 checks in §4 pass on staging.
3. The origin sends the §1 headers (`curl -sI` verified), or, on GitHub Pages, exactly the
   limits accepted in §7 and nothing more: every page withholds the referrer, and HTTP
   redirects to HTTPS.
4. **Owner decision — the front-door claims.** Each states only what a shipped source
   states, with its condition beside it: ADII as a research project with no published
   results and no claimed deployment (`adii/`), AWC-OS as a demonstration on an evaluation
   machine (`awc-os/`), CytherCAD's invalid rate against its DeepCAD baseline on an external
   benchmark and its on-prem, air-gapped condition (`pages/brief.html`). The film's sentences
   are positioning beside the line *A conceptual visualization. It measures no product.*
   The owner confirms each source is current before launch. (The epoch-04 commitment left the front door with the drawing set;
   its record is §5c and `backup/drawing-set-v1/`.)
5. `./verify.sh` green at the release commit; the browser-only runner reports 33/33; the
   served homepage settles and stops (§5i) with zero external requests.
6. The `PROVISIONAL` values in `js/manifest.js` (the disclosure tuple and its counts)
   reviewed by the owner. None is printed on the front door; they drive the checksum and
   the derived icon (the social card is the film's frame since 2026-10-13). Shipping them knowingly is permitted — they are
   marked in source — but it must be a decision.

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

**OWNER DECISION — accepted, 2026-10-04: the site stays on GitHub Pages, and Pages' limits are
accepted.** Recorded in `vaic/release-dispositions.v0.json` (subject `CY-ORIGIN-001`,
`ACCEPTED_LIMITATION`). What is accepted, and why each is acceptable here:

| Pages cannot | Accepted because |
|---|---|
| send `frame-ancestors` | the site has no authenticated or state-changing action to be tricked into; contact composes a `mailto:` |
| send `X-Content-Type-Options: nosniff` | every script is same-origin and pinned by SRI; there are no user uploads to reinterpret |
| send `Permissions-Policy` | nothing on the site requests camera, microphone or location |
| send `Strict-Transport-Security` for a custom domain | it serves a valid certificate (Let's Encrypt, renewed by Pages); HTTP must redirect to HTTPS instead — not accepted as absent |
| serve `no-cache` for `index.html` and `sw.js` (it sends `max-age=600`) | the worker installs one build or nothing; a returning reader sees at most ten minutes of the previous build, never a mixed one |
| serve `.js` as `text/javascript` (it sends `application/javascript`) | both are JavaScript MIME types every browser executes, module scripts included |

`Referrer-Policy` is not accepted as absent: every page withholds the referrer itself, pinned
by `tools/test-site.py`. The §1 contract is unchanged for any origin that can send headers;
moving to one (a `_headers` file on Cloudflare Pages or Netlify, or a proxy in front of Pages)
needs no new decision.

**Observed against the amended contract, 2026-10-04 (build `D215BA534299A451`;
`vaic/evidence/current-browser-observations.v0.json#origin_closure_D215BA534299A451`).** All 39
served files are byte-identical to the tested artifact; the hidden paths and a miss return 404
with the styled body; the manifest is `application/manifest+json`; the worker's cache is this
build's; headless Chrome on desktop and phone runs it with zero external requests, no console
error, and no frame requested once settled. **One defect: HTTP is not redirected** —
`http://cytherai.com/` serves the page with `200`. That is the *Enforce HTTPS* setting
(repository Settings → Pages), the owner's to switch on; until it is on, the observation is a
recorded FAIL (`OPEN_DEFECT` in the register) and CY-ORIGIN-001 stays NOT_EVALUATED. Once it
is on, re-run §4: `curl -sI http://cytherai.com/` must answer `301` to `https://`.

**Resolved, 2026-10-05 (build `5627D34CD6B86545`; `#origin_closure_5627D34CD6B86545`).** The owner
switched on *Enforce HTTPS*. The origin was observed again against the amended contract, over
every served path: all 41 answer `301` from `http://` to the same `https://` path and serve bytes
identical to the artifact; the hidden paths (including `prototype/exception/`) and a miss return
`404` with the styled body; the worker's cache is this build's; all ten pages withhold the
referrer; the certificate is valid to 2026-12-14; `www` in either scheme lands on
`https://cytherai.com/`. CY-ORIGIN-001 now carries a PASS receipt (ORIGIN_HARNESS, exhaustive over
the declared closure, the harness outside the recorded verification set). The release stays
NOT_CERTIFIED for one reason only: CY-TEMP-002, the human-reviewed reading of the three
transitions (§5e), has not been run.

The rollback artifact is the previous `gh-pages` commit, kept as the local branch
`rollback/9236E6A692F915D4` (`git push --force origin rollback/9236E6A692F915D4:gh-pages`).

## Next work — external certification and owner attestation

Construction is finished; nothing below is a repository change.

1. Run W1–W8 in Safari/WebKit as a **differential** against the Chrome record —
   record divergence only.
2. Deploy the exact candidate bytes to the intended origin.
3. Verify headers, HSTS, MIME behaviour and 404 handling there (§1–§4).
4. Confirm every front-door claim against its current source (gate item 4).
5. Sign off every `PROVISIONAL` manifest value at exactly its declared
   evidentiary status.
6. Re-run the complete release battery **only if candidate bytes change**.
7. Tag the exact certified commit.
