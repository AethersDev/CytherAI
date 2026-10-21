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
Never publish the working tree: `backup/`, `docs/`, `README.md`, `CLAUDE.md`,
`generate-integrity.sh` and `deploy.sh` itself are excluded by construction
(allowlist, not denylist).

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
reaches returning readers. Serve `sw.js` and every page (each `.html` in `deploy.paths`:
both front doors and every subpage name `?v=` resources by their integrity) with
`Cache-Control: no-cache`; long caching only for the `?v=` resources and the media, whose
bytes do not change under one URL. A cached page could otherwise name integrity values for
bytes the server no longer serves, and a reader who only ever visits a subpage never
registers the worker that would protect them. A build is atomic
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
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/backup/newC3/epoch04-preimage.txt # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/backup/graphite-v2/index.html # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/CLAUDE.md                     # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/exception/                    # expect 404 (retired 2026-10-16)
curl -sI https://HOST/manifest.webmanifest | grep -i content-type                   # manifest+json
curl -s https://HOST/definitely-missing | grep -q "No record at this path"          # styled 404 body
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/definitely-missing            # AND status 404
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://HOST/                # 301 https://HOST/
```

The whole check is `tools/probe-origin.py` (committed 2026-10-18; it was a scratch script): every
`deploy.paths` file over http (301 to the same https path) and over https, byte for byte against a
`./deploy.sh` build of the admitted commit; `/` against `index.html`; the hidden paths (404, styled body);
MIME; a byte range on every film; the worker's generation; TLS; the `www` host; the headers on the root; the
referrer meta on every page as served. `./deploy.sh && python3 tools/probe-origin.py dist <out.json>`; exit 0
is PASS, and its observation is CY-ORIGIN-001's evidence.

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
| W1 | *Retired 2026-10-16 with the engine's runner* (`backup/trajectory-engine/pages/runner.html`): inline `<script type="module">` under `script-src 'self' 'unsafe-inline'`. No served page has an inline module; the contact pages' one inline script is admitted by its hash | — |
| W2 | *Retired with the module front doors*: SRI on **module** fetches. The front door's scripts are classic `defer` scripts with SRI | — |

**Class B — platform behaviour.** Observed, but a platform-specific fallback
here would not invalidate the architecture.

| # | Check | Why Chrome cannot settle it |
|---|---|---|
| W3 | `mailto:` form submission actually opening a mail client | No mail client exists in headless Chrome. Chrome confirms only that the submit dispatches and is not CSP-blocked |
| W4 | `form-action 'self' mailto:` | Deliberately omitted (see the comment in `contact.html`). Decide it on Safari: add it, submit, and keep it only if the mail client still opens |
| W5 | *Retired with instrument-v1* (`backup/instrument-v1/`): continuous `font-weight` kinetics (`.thesis .g`, `[data-wave]`) | — |
| W6 | Service-worker and viewport behaviour where WebKit differs | Notably `100vh`/dynamic viewport on iOS Safari and WebKit's SW update timing |
| W7 | VoiceOver rotor announcement | The heading DOM is verified; how VoiceOver reads it is AT-specific |
| W8 | *Retired with instrument-v1*: plate rendering fidelity (`backdrop-filter` + `mask-composite`) | — |

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

**After publishing.** With `3C3C51BEDEAB3A59` live, the settled simulator, a returning visitor, played the film on the
first load after the release and the next. With this build live, the same simulator made a first-time visitor (Safari
quit, its website data and HTTP cache moved aside) played it too: each sentence in turn, the statement at 16 s, the link
measured just before at 1 MB in 1.6 s. Of three first visits on newly created simulated iPhones, two gave way to the
statement and one played the film; none of them counts as a measure of the site, because a new simulator's own
first-boot downloads take the link (1 MB in 43.7 s while one ran, 1.9 s with none).

**Open, named:** Safari on a Mac and a physical iPhone, as the owner sees them. A returning visitor's first load after a
release still installs the new worker beside the film (Safari checks for it at the navigation itself). Below about 3
Mbit/s on a first visit the film may give way to the statement after 6 s, by design.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_FD22B035CA263E92`), 54 of 54 served paths matching the artifact. Release CERTIFIED.

## 5p. Short pauses count together — 2026-10-13

Build `B466667CA05CD04F` (`#film_interruption_budget_B466667CA05CD04F`, `#reading_ink_B466667CA05CD04F`,
`#film_settle_B466667CA05CD04F`). A reviewer read in `js/film.js` that the stall clock reset whenever the film advanced,
so pauses shorter than `STALL` never added up: on Chrome's Slow 4G preset `FD22B035CA263E92` played the 12 s film over
21 s, the statement readable at 19.8 s. The film now gives way once it has fallen `STALL` (2 s) behind real time in all
while the page is visible: the wall time since it started, less the film time played, a hidden page's time excluded. A
single 2 s stop still gives way at 2 s. Replay keeps the same rule, as it kept the continuous one.

Before the change, the cost was checked: in every iOS run recorded on `FD22B035CA263E92` (2.4–4 Mbit/s, first visits
included) the film, once started, never fell more than 0.07 s behind real time, because Safari starts a film only once it
expects to play it through. A 2 s budget cannot take the film from those visitors.

**Chrome** (the phone, its throttling presets, worker bypassed, cache disabled):

| Preset | `FD22B035CA263E92` | This build |
|---|---|---|
| Fast 4G | the whole film; still at 12.85 s | the whole film; still at 12.9 s |
| Slow 4G | first sentence 3.86 s; the film played through, slowly; statement readable at 19.81 s | first sentence 3.89 s; gave way with the film at 4.6 s; statement readable at 9.79 s |
| 3G | the statement at 7.42 s, no film | the statement at 7.66 s, no film |

**iOS Simulator** (an instrumented test copy; simulator evidence, not a physical iPhone's): with the budget in place both
films still play through, the phone film moving at 4.1–4.6 s at 2.4–4 Mbit/s, the desktop film (played in iOS Safari) at
3.5–4.5 s at 3.2–4 Mbit/s, and a first visit with every file on the link at 4.1–4.7 s.

**Unchanged behaviour, re-observed.** The stall fallback's three cases; settling, 0 frames, timers or playing media in
four profiles, the worker caching exactly this build; reading ink across 349 element samples, worst 4.86:1; the
sequences, never more than one download at once, and the warm-up past a clip that arrives in one piece; the playback
suite, Replay included. (Its sample labels drift on desktop, because each screenshot takes time; measured without them,
the film advances at 1.0× the page's clock.)

**After publishing.** On the live site in the settled simulator, a returning visitor (two loads, the first possibly
the previous build from its worker) and a first-time visitor (Safari quit, its website data and HTTP cache moved aside)
each saw the whole film, sentence by sentence; the link measured before each at 1 MB in 1.0–1.8 s. The blank first
seconds in two of the runs are Safari launching cold: each run quits it first.

**Open, named:** Safari on a Mac and a physical iPhone.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_B466667CA05CD04F`), 54 of 54 served paths matching the artifact. Release CERTIFIED.

## 5q. Arabic and light mode — 2026-10-14

Build `2874B365763AE0ED` (`#arabic_and_light_2874B365763AE0ED`, `#reading_ink_2874B365763AE0ED`, `#film_settle_2874B365763AE0ED`). The owner asked for
an Arabic version "with professional implementation and consideration of everything like RTL", and a light mode. Their
choices: the front door and the contact page in Arabic, published as drafted and refined afterwards; the film dark in
light mode, everything below it light; light mode by the device's setting, with a switch whose choice is remembered.

**Arabic.** `ar/index.html` and `ar/contact.html`, `lang="ar" dir="rtl"`, each paired with its English page by
`hreflang` and a visible link marked with the language it leads to. The copy is Modern Standard Arabic for Saudi
investors, each claim as the English one states it and as its shipped source does: the CytherCAD sentence names
Text2CAD-192 as the external benchmark CytherAI does not operate, as the brief does. The figures are the projector's
(Western digits). Links to pages that exist only in English (the brief, ADII, the legal pages) say so (بالإنجليزية);
AWC-OS's page already opens in Arabic. Product names stay in Latin script, marked `lang="en"` so a screen reader says
them right, and isolated so a name like Text2CAD-192 never breaks or reorders. The type is IBM Plex Sans Arabic 300 and
400 (`fonts/`), shipped unmodified: its licence reserves the name "Plex", and subsetting would have saved 17 KB a
weight. Arabic is never letter-spaced or upper-cased, which breaks its joins; its lines are taller for its marks; its
headings and captions are balanced. The stylesheet is logical (`inset-inline`), so the English page is unchanged and
the Arabic one mirrors, the darkening behind its sentences included; the lockup stays left to right, as the identity
draws it. Arrows point the way the text reads (← ↖). The films and the worker resolve against the site's root, so
`/ar/` shares them. The Arabic card (`assets/og/og-card-ar.png`, IMG-010) is the English card's composition with the
Arabic statement. `tools/test-site.py` now requires the Arabic front door to carry exactly the English one's cues,
sections, sequences and figures, each Arabic page to be `ar`/`rtl`, and each pair to name the other.

**Light mode.** `js/theme.js` runs in the head, before the page paints: the remembered choice, or else the device's
setting, as `data-theme`; the header's switch (`aria-pressed`) toggles it, and choosing the device's own theme forgets
the choice. The principle, the systems and the close take light tokens; the film, the header and the sentences over it
stay dark. A first run caught the light sections' headings nearly invisible: they inherited the page's cream ink, set
once on the body; the light sections now set their own ink. Every ink holds 4.5:1 on its ground in both themes
(`tools/test-site.py`).

**Offline, in Arabic.** The worker matched a navigation's key only for the root: `/` read the precached `index.html`,
but `/ar/` asked the network. A visitor whose worker was installed from the English page and who then opened `/ar/`
offline reached the browser's error page (reproduced on the candidate before the fix). Every directory now reads its
precached index; the same visit renders the Arabic page, still, its statement visible.

**Observed on this build** (HeadlessChrome 155 over CDP unless stated):

| | `/` | `/ar/` |
|---|---|---|
| Reading ink, dark (3 viewports) | 365 samples, worst 4.86:1 | 403 samples, worst 5.36:1 |
| Reading ink, light (3 viewports) | 365 samples, worst 4.90:1 | 403 samples, worst 5.36:1 |
| Settled: frames · timers · playing media, 4 profiles | 0 · 0 · 0 | 0 · 0 · 0 |
| The worker: this build, control after reload, offline reload | yes | yes (registered at the root from `/ar/`) |
| Playback: the film, Replay, reduced motion, a refused play, a play that never starts | as before | the same, its captions in Arabic |
| Accessibility: the statement a heading from the first moment; Tab stops on screen, visible, outlined | 15 stops | 15 stops; names in Arabic |
| 200% zoom, a phone on its side, a small phone: overflow, overlaps | none | none |
| Sequences on Slow 4G: at most one download; the warm-up past a clip arriving in one piece | — | yes; all three warmed |

The switch, in both languages, from either device setting: dark (or light) with nothing remembered, a click to the
other, remembered; a reload keeps it, and the first frame painted is already that theme; a second click returns to
the device's theme and forgets. The light sections' headings are `#121118` on `#f3f1ec`. On both contact pages the
page's own validation (what the browser accepts and the page refuses: a name of one letter, `a@b`, a short message)
refuses three fields in the page's language, the Arabic counting them in the plural; with every field empty the
browser's own validation stops the form first, in both. The stall fallback passes its three cases. In the iOS
Simulator (iOS 26.5, an iPhone 16 Pro Max image; simulator evidence, not a physical iPhone's) `/ar/` plays the film
with its Arabic captions, balanced, and reaches its still state; the arrows render as text, not emoji; the light
appearance leaves the film dark, as designed.

**After publishing.** `https://cytherai.com/ar/` and `/ar/contact.html` serve the artifact's bytes (and `http://…/ar/`
redirects to them). On the live site in the iOS Simulator, a first-time visitor (Safari's website data moved aside),
the device set to light: `/ar/` played the whole film, its Arabic captions in turn, and reached its statement; the film
stayed dark, as designed.

**Open, named:** a native Arabic reader's review of the copy (the owner's, as agreed), VoiceOver in Arabic as heard,
Safari on a Mac and a physical iPhone.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_2874B365763AE0ED`), 61 of 61 served paths matching the artifact. Release CERTIFIED.

## 5r. The Arabic release reviewed — 2026-10-14

Build `E6B35C3BEFAE718A` (`#arabic_review_E6B35C3BEFAE718A`, `#reading_ink_E6B35C3BEFAE718A`, `#film_settle_E6B35C3BEFAE718A`).

**A returning visitor's first Arabic page lost its stylesheet.** A reviewer opened the live `/ar/` (`2874B365763AE0ED`) in
a browser that had visited before: no stylesheet applied, the headings in Times, the page 1,288 px wide at 390, while
the theme switch worked. The live stylesheet matched its integrity. Reproduced exactly with a worker installed by the
English-only build `B466667CA05CD04F`: that worker answers from its cache by URL; `/ar/` was not in its cache and came
new from the network, but `../css/film.css` and `../js/film.js` were, and it answered them with the old bytes, which
the page's integrity refused (the console names the old digests). `/ar/contact.html` lost `css/cytherai.css` the same
way; `js/theme.js`, new to that cache, came from the network and worked. Reloading could not help: the new worker
waits for the page's script to let it in, and that script had been refused.

Every integrity-checked URL now names its bytes (`?v=`, the first 12 hex of their SHA-256), stamped by
`generate-integrity.sh` into the pages and into the worker's precache alike. No older worker has cached such a URL, so
it fetches the matching bytes, and the fix reaches visitors whose old worker is already installed: it travels in the
new page's URLs, not in the worker. `tools/test-site.py` requires every such URL, in every page and in the precache, to
name its file's current bytes (a stale version fails it).

| Upgrade | `/ar/` | `/ar/contact.html` |
|---|---|---|
| Worker from `B466667CA05CD04F`, then the live `2874B365763AE0ED` | no stylesheet, Times, 1,288 px | no stylesheet, Times |
| Worker from `B466667CA05CD04F`, then this build | whole: stylesheet, the Arabic type, 390 px, no console error | whole |
| Worker from `2874B365763AE0ED`, then this build | whole | whole |

**The copy, corrected as the review asked.** CytherCAD's condition said complete privacy (بخصوصية تامة) and isolation
from any network (عن أي شبكة), stronger than "private and air-gapped"; it now reads يعمل داخل المنشأة، في بيئة خاصة ومعزولة
عن الشبكات الخارجية. ADII: «صحّحه، أو اتركه كما هو، أو أحِل المسألة للمراجعة» for "fix it, leave it, or escalate it",
and «ما إذا كان يجتاز التحقق» for "whether it holds". AWC-OS: «حُجب مقترح لأنه لم يستوفِ شرطًا من شروطه», as its own
Arabic page puts it (فشل تأكيده). CytherCAD's heading: «من وصفٍ لغوي إلى شكلٍ هندسي صالح», since هندسة alone also means
engineering. The brand links carried `lang="en"` around an Arabic label; the links no longer claim English (their
name is the Arabic label), and on the contact page the Latin brand text carries `lang="en"` itself. The contact page's hand-off reads «جارٍ فتح برنامج البريد لإكمال الإرسال», then that the page cannot verify
delivery; its navigation and footer say which of their links lead to English pages. The new navigation label sat above its links (each link
carries vertical padding, the label none); the navigation now centres its items, and the English subpages render
pixel for pixel as before (the contact page and the brief, at 1440 and 390 px).

**Re-observed on this build**, every check of §5q: reading ink over both front doors in both themes at three viewports,
1,534 element samples in all, worst 4.86:1 (`/`, the principle's label on a phone) and 5.36:1 (`/ar/`); 0 frames, timers or
playing media once settled in four profiles of each page, the worker caching exactly this build and serving it with
the server stopped; playback, accessibility (every Tab stop on screen, visible, outlined) and zoom in both languages,
no console error; the stall fallback's three cases; the sequences from `/ar/`, one download at a time, the warm-up past a
clip that arrives in one piece; `/ar/` offline for a visitor whose worker came from the English page; the theme switch;
both contact pages refusing in their own language.

**After publishing.** In a fresh Chrome on the live site, the worker installed from the English page, `/ar/` and
`/ar/contact.html` load whole at 390 px: the stylesheet applied, the Arabic type, nothing overflowing, the narrowed
CytherCAD line. Their console differs from the English pages' in one way, named here: under the worker Chrome requests
each Arabic font a second time (and the English serif, which the Arabic page does not use), every request answered from
the worker's cache, and warns that the preload went unused; on a first visit, where the preload matters, each font is
requested once and nothing warns. No byte crosses the network for it; it is left open. The contact pages' mixed-content
notice is the `mailto:` form, by design, in both languages.

**A returning visitor's switchover** (the reviewer saw it on the live site, reproduced here). A visitor whose worker is
from the previous build gets that build on their first load of `/ar/`, complete and styled, its old wording included,
and again on a reload while the film plays; once a page's film is still it lets the new worker in, and the next load is
this build. Measured in Chrome, the worker from `2874B365763AE0ED` and this build served: first load and an immediate
reload `2874B365763AE0ED` (the old CytherCAD line), the same page once still `2874B365763AE0ED`, the reload after that
`E6B35C3BEFAE718A` (the narrowed line). That is the worker's design (§5j: it never takes over a page that may still be
loading); the cost is one load, or two for a visitor who reloads during the film.

**The Arabic copy, reviewed.** A second review read the rest of the Arabic against the English and found no further
correction to make; it advised leaving the wording settled rather than changing it for preference.

**Open, named:** VoiceOver in Arabic as heard, Safari on a Mac and a physical iPhone.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_E6B35C3BEFAE718A`), 61 of 61 served paths matching the artifact. Release CERTIFIED.

## 5s. The repository reorganized; THE EXCEPTION retired — 2026-10-16

Build `B76DECC774B9AFBB` (`#reading_ink_B76DECC774B9AFBB`, `#film_settle_B76DECC774B9AFBB`).

**The repository holds the site, its release tooling and its record.** Retired material moved whole into `backup/`
(renames only; `backup/README.md` maps every path), the owner's untracked studies moved out to
`~/Desktop/cyther-studies/`, and `README.md` is the entry point. That alone moved no served byte: `E6B35C3BEFAE718A`
stayed live and certified, its 61 files byte-identical.

**THE EXCEPTION retired**, at the owner's direction. Linked from no page since 2026-10-12, it was the last page to load
`js/manifest.js` and `js/instrument.js`; the four files leave the served set (57 files), `/exception/` answers the
styled 404, and the page lives whole in `backup/exception-v1/`, with the modules as it loaded them, so its integrity
holds: opened from the repository root it loads its engine and its type with no console error. The modules stay at
their paths, which the corpus binds; their surface lost `fnv` (THE EXCEPTION's only call to it), and `judge` is
verifier surface (`tools/test-boundary.js`). `tools/test-api.py` now fails if a page loads either module again. The
front door's code, styles and media are unchanged; the build moved because the served set did.

**Every served script parses.** `./verify.sh` checks each `.js` in `deploy.paths` with jsc's `checkSyntax`, so `sw.js`
and `awc-os/awc-os.js`, never parsed before, now are: a syntax error appended to `awc-os/awc-os.js` fails it, and the
step it replaces let that through.

Re-observed on this build (Chrome 155.0.8059.82): reading ink over the film on both front doors, dark and light, at
three viewports, 1,534 element samples, none below 4.5:1, worst 4.86:1 (CY-SEM-003 PASS); both pages settle to no
frame, timer or playing media in every profile, the worker caching this build and serving it offline (CY-TEMP-001
PASS).

The retired branches are tagged `archive/<name>` (`docs/history-rewrite-2026-10-13.md`), the five that were on GitHub
there too; removing the branches themselves waits for the owner's permission.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_B76DECC774B9AFBB`), 57 of 57 served paths matching the artifact. Release CERTIFIED.

## 5t. The production audit implemented — 2026-10-18; the Alinma plan withdrawn — 2026-10-19

Build `39E089F84EA28E7D` (`#reading_ink_39E089F84EA28E7D`, `#film_settle_39E089F84EA28E7D`). A structural audit of
`4d55f21` (82 findings: 6 Medium, 45 Low, 31 Info) was implemented; what follows is what changed for a reader and
for the record, and what stays open.

**For a reader.** The privacy policy describes what the site stores today: the `theme` key in localStorage (kept only
when the visitor's choice differs from the device's setting) and the worker's cache, no longer a retired build's
session key and ledger. ADII's recorded run and both AWC-OS films have their text beside them (a `<details>` under
each video: WCAG 1.2.1). On AWC-OS, copper status text holds 5.7:1 (it read 3.66:1), the language toggle says which
language is pressed, fixed English and Arabic text is marked with its language, and the "Measured failure retained"
callout carries its Arabic without the script. The contact pages refuse with their own messages (the browser's
validation no longer pre-empts them, so the consent message is reachable), a focused refused field keeps a focus ring,
field edges hold 3:1, and their one inline script runs under its `sha256-` instead of `'unsafe-inline'`. The brief's
two exhibits are headings; ADII's page has a `main` landmark; each front door is one `main` (the film's stage, the
principle, the systems, the close) and a `footer` landmark, pixel-identical in 18 of 24 views measured against
`B76DECC774B9AFBB` and within raster noise (60–118 dB PSNR) in the other six. The stage's height falls back to
`100vh` where `svh` is unknown. A sequence whose download fails rests on its poster and frees the download slot: with
`sys-adii.mp4` missing, the previous build never requested the other two; this one warms them (Chrome 155). The
worker leaves pages it did not precache to the network and caches nothing from the HTTP cache's copy.

**For the record.** The ledger can now record a regression: a `FAIL` appended after a history of `PASS` is a `FAIL`,
not an `INVALID` corpus (reproduced with restamp and a failing harness before the fix, `VALID` after). Restamp writes
what its command observed (the 56 files `deploy.paths` now declares, the two tests it runs, `deploy.sh` included), not
the previous receipt's text ("27 files", 66 times). A
record or policy that moves under one build expires its receipts instead of invalidating them; two `EXTERNAL`
observations of one build are two receipts; a `PASS` cannot cite an observation of a `FAIL`; a row cannot leave
release judgment by changing its scope; admitted obligation definitions are frozen; malformed input of every kind the
audit found is `INVALID`, never `INTERNAL_ERROR`. The page list is `deploy.paths` (no second list in
`generate-integrity.sh`), page references resolve against the shipped set, every page's CSP is pinned to least
privilege, and the register rules are a test. The browser probes are committed (`tools/probe-ink.py`,
`tools/probe-settle.py`, rebuilt from their recorded methods and calibrated against `B76DECC774B9AFBB`'s record to the
sample) and so is the origin's (`tools/probe-origin.py`); `./publish.sh` keeps the artifact it replaces as
`rollback/<build>` (§7) and refuses any uncommitted change. The film's ten media have receipts (IMG-011, IMG-012).

Observed on this build (Chrome 155.0.8059.82): reading ink over the film on both front doors, dark and light, at three
viewports, 1,534 element samples, none below 4.5:1, worst 4.86:1, unchanged to the sample from the previous build
(CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile, the worker caching this
build and serving it offline (CY-TEMP-001 PASS).

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_39E089F84EA28E7D`), 56 of 56 served paths matching the artifact.

**Open, and the owner's.** The AWC-OS and CytherCAD sequences have recorded animation defects (IMG-012): a re-render.
The ADII CVs publish four people's phone numbers and personal email addresses; whether they consented is not recorded.
No browser floor is declared; below Safari 15.4 and Chrome 108 the stage now keeps its height, and an engine
whose wiring throws keeps the statement's no-script unveil.

**AWC-OS, the Alinma plan cancelled (2026-10-19, the owner).** Both AWC-OS films said, under *That's the
constitution.*, "LIVE ON THIS PHONE · DESIGNED FOR PRODUCTION INSIDE ALINMA'S INFRASTRUCTURE — READY TO LEARN FROM FIVE
MILLION CUSTOMERS" (in Arabic in the Arabic film), a production claim the page's own text had already withdrawn; the
transcripts made it visible. The line is masked over its whole path (66.5–72 s; audio unchanged, the rest of each film
at 53.4–60.4 dB PSNR against the original); the competition deck, whose slides 5 and 11 present the plan, and the link
to the unmasked 4K film on YouTube are withdrawn, and the deck's URL is among the paths `tools/probe-origin.py`
requires to 404. The page, its films and the deck as they were: `backup/awc-os-v1/`. Kept, because they happened: the
hackathon (AMAD 2026, Alinma Bank × Tuwaiq Academy) and the demonstration's halal alternative, a named Alinma product.
The YouTube video is the owner's to change.

## 5u. Two sequences re-rendered; the ADII CVs kept — 2026-10-19

Build `EAA945BC838E9BBC` (`#reading_ink_EAA945BC838E9BBC`, `#film_settle_EAA945BC838E9BBC`).

**The sequences' recorded defects are fixed** (IMG-012), in `tools/render-systems.py`, and both are re-rendered. In
AWC-OS's, the refused program, turned back, now also rises out of its lane and steps back from it, so the compliant
alternative passes in the lane it left: it had stayed in the lane and the alternative passed through it (3.90–4.17 s).
In CytherCAD's, the three refused tokens now stop on rows of their own, 0.56 apart, stepped back out of the stream,
and a passing token leaves the ring as it reaches it: two refused tokens had shared a row and merged (the poster showed
two of the three), later tokens passed through resting refused ones, and consecutive passing tokens clipped at the ring,
which the audit did not report. A check of every moving slab's and token's box, 96 times a second, finds those
intersections in the published motion and none in the new. Rendered with Blender 5.1.2 (`--factory-startup`, Cycles on
the Apple GPU, 48 samples, `TL=10`, about 12.5 minutes a sequence), encoded as before; over the motion they share, 47 dB
against the 2026-10-12 renders, which stay at `git show baba8d0:film/sys-<name>.mp4`.

**The ADII CVs stay published, contact details included** (the owner, 2026-10-19): they belong to the ADII team's own
page. The open question of §5t is closed by that decision.

Observed on this build (Chrome 155.0.8059.82): reading ink over the film on both front doors, dark and light, at three
viewports, 1,534 element samples, none below 4.5:1, worst 4.86:1 (CY-SEM-003 PASS); both pages settle to no frame,
timer or playing media in every profile, every re-rendered sequence playing to its last frame, the worker caching this
build and serving it offline (CY-TEMP-001 PASS).

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_EAA945BC838E9BBC`), 56 of 56 served paths matching the artifact.

## 5v. The passage: the film opens into ADII — 2026-10-20

Build `86CD52B68E33C36A` (`#reading_ink_86CD52B68E33C36A`, `#film_settle_86CD52B68E33C36A`).

**The owner's direction, *The Shape of Permission*** (2026-10-20, pasted): make the film's strongest moment — the change
that stops while everything else continues — the organizing idea of the whole site, and produce one complete transition
first, the opening film into ADII, with its copy, motion, phone composition and route to its real evidence; extend the
grammar through AWC-OS, CytherCAD and the close only if it succeeds. This build is that first piece; the owner judges it.

**What the visitor sees.** The statement stands over the film's final composition as before. As they scroll, the passage
(`tools/render-passage.py`, IMG-013), scrubbed by the scroll and never played, continues the film's own scene from its
last frame: the camera moves into the plane of the ring the refused slab never crossed, so the ring narrows to a single
line that stays where it stood (it is the ring seen edge on, the camera in its plane); the two halves of the structure
part around it, the refused slab suspended where it stopped, and a run of the structure's ceramic tiles is left standing
and comes forward as a row of fifteen values, one visibly wrong — the last, at the line, about half the rest, as the
recorded run's last day was (*↓51%*). A correction arrives from the proposing side and stops a fraction short of the
line, where the refused slab stopped; the authorizer's light traces the one slot it may change, the validator's scan
leaves the line and runs the row, the slot holds, and only then does the correction cross and take the wrong value's
place, which steps back behind it. Phones get the same scene in the film's portrait composition: the line horizontal,
the values stacked above it, the correction and the refused slab waiting under it side by side.

**Its words** arrive at the foot of the frame, below the scene, each held while its moment holds (`.beat`, `data-t`): the
principle; *01 · ADII · A conceptual illustration*, *A number looks wrong.* with the sentence on what ADII answers; *Changing
it is a separate decision.* as the correction waits; the two programs as the checks run; the condition and *See what
this is based on →* once it has crossed, to `adii/#run`, the recorded run itself (`tools/test-site.py` now requires a
link's fragment to name an element of the page it lands on). A screen-reader paragraph describes the illustration. In
Arabic, the same beats and moments.

**Its mechanics** (`js/film.js`). The passage downloads once the film is still (asked to play and paused at once: iOS
fetches only then), ahead of the sequences, and shows once whole, under the film's element: its first frame is the film's
last (the render against the film's final-frame posters: 48.2 dB landscape, 35.7 dB portrait at the poster's size, where
the film's own last frame reads 37.1 dB; delivered, the two encodings differ by their noise, and the passage fades in
over 0.4 s), so nothing changes where it takes over. The scroll then names a moment, interpolated through each beat's
hold, and the passage seeks to it, one seek at a time; a keyframe every six frames keeps every seek short (measured on
the film's own frames: in headless Chrome each seek landed within one display frame, 18.6 ms at most; in the iOS
Simulator, 14 ms median and 17 ms at the 90th percentile; at the film's 250-frame interval, 23–36 ms median and up to
66 ms in Chrome). Until it is whole, under reduced motion, or after a failed download, the film's element stands on the
final frame, and past the principle on the still of ADII's moment. A visitor who scrolls on past the film ends it, and a page
that opens past it (an anchor, a restored scroll) never plays it. Nothing runs while the scroll is still (CY-TEMP-001):
a frame is asked for only as the page scrolls.

**Checked.** No solid piece passes through another in any of its 288 frames: an oriented-box test of every moving piece
against every other and against every piece of the parting halves, the film's rings tested as rings (the first test,
treating each as a disc, flagged the tiles in their holes). It found one real defect before the render, now fixed: the
correction had existed from the first frame at its starting place, inside the film's left half. Rendered with Blender 5.1.2,
Cycles on the Apple GPU at the film's own settings (64 samples, `TL=24` landscape, `TL=14` portrait); delivered at 1440×810
and 810×1440, 1,045,732 and 952,673 bytes (0.69 and 0.63 Mbit/s), each with its still of 40 KB.

**Retired.** ADII's six-second sequence, whole, to `backup/adii-sequence-v1/` (IMG-012's ADII outputs moved with it), and
its branch of `tools/render-systems.py` (`git show 102fdf9:tools/render-systems.py`).

**Open, for the owner.** The creative question the direction asks: does the visitor feel still inside the same world while
understanding more about the company? AWC-OS, CytherCAD and the close keep their cards until that is answered; the deeper
pages keep their own design. The device checks (§5f) now include the passage on an iPhone.

**Reading ink over the passage, found and fixed before it was recorded.** The first probe of this build's passage failed
on phones and in Arabic on the desktop: the current runs through the words' band on a phone, and a tall Arabic block's
first line reached the current's glow, so the small warm labels and the dim condition fell to 2.18–3.0:1 over its light
(the film's soft radial darkening was not made for words over a bright line). The passage's words now carry their own
darkness, opaque under them and soft at its edges, and sit lower, 10vh from the foot of the frame, below the scene.

Observed on this build (Chrome 155.0.8059.85): reading ink over the film and the passage on both front doors, dark and
light, at three viewports, 1,488 element samples, none below 4.5:1, worst 4.9:1 (the film's statement on a phone; the
passage's words 6.11:1 at worst) (CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every
profile once the scroll stops, the passage following the scroll to the frame its anchors name (11.782 s at the last beat,
exactly) and, under reduced motion, never loading while ADII's still stands; every sequence played to its last frame;
the worker caching this build and serving it offline (CY-TEMP-001 PASS). The settle probe now lets a scroll be answered
(one frame) before its quiet window, and under reduced motion requires the stimulus to start no media and no timer:
written before the page answered a scroll at all, it had counted that answer as motion.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_86CD52B68E33C36A`), 58 of 58 served paths matching the artifact.

## 5w. The passage's pace made even — 2026-10-20

Build `EB79D2894F4F8A29` (`#reading_ink_EB79D2894F4F8A29`, `#film_settle_EB79D2894F4F8A29`).

**The owner, on the live passage:** *it's lagging and not even smooth when scrolling down, which should be smooth and
easy to follow the rhythm.* Measured before anything changed, by a harness that scrolls the passage at a constant speed
and records each frame the browser presents (`requestVideoFrameCallback`): the decoder was not the cause. At a viewport a
second, headless Chrome presented 49.8 frames a second and the iOS Simulator's WebKit 39.8, about a frame behind the
scroll; encoding every frame as a keyframe, or WebKit's `fastSeek`, changed neither. The cause was the pace: each beat
held the scene still while its words were read and the 90svh between beats then carried it on, so a viewport of scroll
moved the scene anywhere from 0.45 s (while *Changing it is a separate decision.* held) to 3.1 s (as the structure
parted), a sevenfold swing between nothing answering the scroll and a rush.

**Now** a viewport of scroll moves the scene 2 s throughout, the stage's own pace (its 100svh are the passage's first
two): the principle's stretch and ADII's (`.passage`, `data-t`) are each as tall as their seconds, and each caption
(`.say`, `data-t`, its window of those seconds) is fixed at the foot of the frame and fades in and out with the scroll.
The fade is the scroll's, not a timed transition: with a timed fade on those fixed captions WebKit missed 16–24 frames
(over 25 ms) in a pass of 200–400, without it 1–3; switching the video's seeking off did not remove them, removing the
fade did. The darkness under the words is a shadow, not a filter. The passage now downloads as soon as
the film is whole, so it is ready when the statement is; and its last words leave as the next system rises (the
passage's seconds run on past its end for the words alone, the scene holding its last frame), so nothing stays shown
under a later section. Measured on this build, a viewport a second: Chrome presents 59.7 frames a second on the desktop
and on a phone, every display frame, none late; the iOS Simulator 47.6, every frame of the scene, 2 late, the longest
hold on one frame 46 ms (it was 100). The passage's media are unchanged (IMG-013).

**The probes followed the page.** Each now samples the passage at the middle of each caption's window, the moment the
page's own stretches name for that scroll; the reading-ink probe first refused a sample 30 % into the last window
(its fade was not done) and was right to.

Observed on this build (Chrome 155.0.8059.85): reading ink over the film and the passage on both front doors, dark and
light, at three viewports, 1,488 element samples, none below 4.5:1, worst 4.9:1 (the film's statement on a phone)
(CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile once the scroll stops, the
passage at the last words showing exactly the frame they name (12.0 s) and, under reduced motion, never loading while
ADII's still stands; every sequence played to its last frame; the worker caching this build and serving it offline
(CY-TEMP-001 PASS).

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_EB79D2894F4F8A29`), 58 of 58 served paths matching the artifact.

## 5x. The passage through AWC-OS and CytherCAD, and back — 2026-10-20

Build `983A5A948DF4EF1B` (`#reading_ink_983A5A948DF4EF1B`, `#film_settle_983A5A948DF4EF1B`).

**The owner's decision** (2026-10-20, pasted), reviewing `EB79D2894F4F8A29` on the live site at the desktop and at
390 × 844: keep the passage and extend its visual continuity to the rest of the site, each remaining system a shorter,
distinct beat. *AWC-OS: one fixed rule, one changed proposal* — the boundary stays as ADII's row recedes; a program is
refused and its compliant alternative passes through the same opening; the rule visibly unchanged; one headline, one
concise explanation, then the evidence route; the existing corrected motion supplies the central event. *CytherCAD: the
payoff* — a permitted construction becomes the finished part, its shape, bore and dimensions clear, the most satisfying
moment of completion on the site; the validation figure beside its named benchmark, without another sequence of caption
stops. *The close: return to the opening's wider world* — pull back from the part into a composition that recalls the
opening; any refused component carried into it must remain visibly refused; then *Tell us what must never happen.* The
owner also corrected a status (the reviewed build was already committed and served live, `b9af466`) and declined to
endorse frame-rate figures measured from screenshots and discrete scrolls, or a claim of smoothness on their iPhone or
Mac Safari: §5w's figures are this repository's harness in headless Chrome and the iOS Simulator, not a device's.

**The owner's two further decisions** (the same day, on the plan before the footage was finished): *remove the theme
switch from the cinematic homepage* — once the systems and the close moved over the passage it changed only the footer,
a promise of an alternate view the page did not keep; the passage keeps its deliberately lit environment under either
device theme, the subpages their own treatment, and the header the brand, the language and a direct route past the
opening. And *make the change of subject from AWC-OS to CytherCAD unmistakable*: a seamless transformation could imply
that AWC-OS's financial program feeds CytherCAD, or that the two are stages of one product; the site has established a
shared principle, not a product connection. So AWC-OS completes its event (the alternative has crossed the unchanged
opening), CytherCAD is introduced before the shape takes any recognizable geometry, and its description-to-shape
sentence stands at that transition — by the words' timing, without another render. Caption stops stay reading windows,
never pauses in the scroll's mapping, and the closing invitation stays available once the scene settles, however fast
the visitor came. Further creative changes wait for the owner's review of the finished footage: does each system become
understandable at the moment its action becomes visible, and does the return feel like an ending?

**What the visitor sees.** The passage (IMG-013) is now twenty-five seconds, its first twelve ADII's frames unchanged.
From ADII's settled row the camera rises along the line, which stays where it stood, and the row sinks out of the frame;
on the line, an opening: two warm jaws that never move. A program arrives from the proposing side, too tall for the
opening, and stops a fraction short of it, where the film's slab stopped; its light goes out and it is set aside, up and
back out of the lane, as AWC-OS's corrected sequence set its refused program aside; its alternative, lower, passes
through the same opening. Beyond the line the shape comes to rest and, once CytherCAD's words have arrived, is built
into a part: it thickens into a base, a step grows on its far end, a bore is drilled through it, it turns, and its
length, its height and the bore's diameter are drawn on it, while the refused program turns back out of the frame. Then the camera returns to where the film ended: the line opens into the ring, the
structure closes back toward it with ADII's corrected row, the jaws and the part standing beside it, and the slab the
film refused still stops short of it. The close stands over that last frame, where the film's statement stood. Phones
get the film's portrait composition: the line horizontal, the proposals rising to it from below; for AWC-OS the frame
lifts the line to 0.35 of the height so the refused program waits above the words (0.42–0.57 of the frame).

**Its words.** AWC-OS: *02 · AWC-OS · A conceptual illustration*, *Not every answer is allowed.* with the card's
explanation over the arrival and the refusal (12.95–14.5 s), then its condition and *See the demonstration →*
(`awc-os/`) as the alternative crosses (14.6–15.7 s: it is wholly through the line at 15.50 s and clear of the jaws at
15.70, from the script's own motion); the card's second paragraph (*In the demonstration, a proposal was blocked …*) is
dropped for the one explanation. CytherCAD: *03 · CytherCAD · A conceptual illustration*, *Language in. Valid geometry
out.* with its description-to-shape sentence from 15.8 s, fully shown at 16.05, as the shape comes to rest and before it
takes any form (its light goes out from 16.0 and it thickens imperceptibly at first; the step, the first recognizable
geometry, begins at 16.8); then, as its dimensions are drawn, the figure with its benchmark (*0.00% invalid rate on
Text2CAD-192, against 10.00% for DeepCAD …*, still the front door's only `data-m` marks), its condition and *Read the
validation record →* (19.2–21.4 s). Two stops each, against ADII's four; each system's stretch is shorter (4 s and 5 s of
scroll, two viewports and two and a half, against ADII's seven seconds). Each stretch has its screen-reader description;
CytherCAD's begins *another application of the principle* and never says the program becomes the part. In Arabic, the
same windows and words (the cards' Arabic).

**Its mechanics** (`js/film.js`). The sequences and their machinery are gone: no IntersectionObserver, no download slot,
no warming. The passage is the only scene below the film: it downloads once the film is whole (or still) and is sought
by the scroll, never played. Under reduced motion, before it is whole, or after a failed download, the film's element
stands on the still of the moment: the film's final frame, then ADII's, AWC-OS's, CytherCAD's, and the return's (the
passage's last frame), each changing between two systems' words, never under them (`STILLS`, with the second each
stands until). The close is a viewport tall, static in the page's flow, its words where the statement stood, on the
captions' darkness: no window governs it, so it is there whenever the visitor arrives. The header's theme switch and
`js/theme.js` are retired (`backup/theme-switch-v1/`); the page is dark under either device setting, the privacy policy
no longer describes a stored theme (a choice saved before is no longer read), and `tools/test-site.py` holds the front
door to one environment. The header's route past the opening (*The three systems ↓*), hidden below 480px while the switch
took its room, now shows on any phone 360px wide or more (measured: 40px clear of the wordmark at 360px in English;
in Arabic it fits at 320).

**Checked before the render.** The script changes nothing before 12.0 s: the scene's evaluated state (every object's
world matrix and visibility, the camera's shifts and focus, every keyed material value, every light) compared with the
first render's script at twelve frames from f0288 to f0575, no difference, in both orientations. No solid piece passes
through another in any of the 600 frames: the oriented-box test now reads the halves' offsets from the scene, covers the
new pieces (the programs, the step, the jaws and the dimensions while lit), the ring's tube against every solid, and the
camera's clearance (1.38 landscape and 1.01 portrait at the closest, both from the ring). It found one real defect, fixed
before the render: as the structure closed, a fin swept through the refused program's resting place (23.25–23.92 s); the
program is now set aside beyond the fins' reach (radius 3.21 against their 3.08). Previews found three more, fixed: the
line visibly ended just above the opening (the ring's top in frame: the boundary looked like a post one could go around),
so the lane sits lower and further back and the line runs out of the frame; in CytherCAD the camera came within 0.3 of
the ring and its near edge blurred into a band, so the part is larger and the camera stays 1.4 away; on a phone the
refused program waited in the words' band, so the portrait frame lifts for AWC-OS. Rendered with Blender 5.1.2 at the
film's settings (64 samples, `TL=24` landscape, `TL=14` portrait).

**Measured on the delivered media** (IMG-013): 1440×810 and 810×1440, 25 s, 100 keyframes in 600 frames, 1,698,659 and
1,569,783 bytes (0.54 and 0.50 Mbit/s, lighter than the twelve-second passage's 0.69 and 0.63: AWC-OS's and CytherCAD's
frames are mostly dark ground). Its first frame is pixel-identical to the twelve-second encode's, so the hand-off from the
film is unchanged; the two renders join at 12.0 s without a seam (46.9 and 48.8 dB across the join, against 47.3 and 49.8
between neighbouring frames of one render); the line stands at column 683 of 1440 at every sampled moment from 2.58 s to
21.0 s in landscape, and in portrait on row 749 through ADII, 504 for AWC-OS and 749 again from 19.0 s. The new stills
weigh 21.5 KB (AWC-OS), 26.6 KB (CytherCAD) and 120.5 KB (the return) in landscape, about the same in portrait; with them
the worker's precache is 1.29 MB (0.98 MB before; the note in `js/film.js` that said 0.7 MB was already stale).

**Retired.** AWC-OS's and CytherCAD's six-second sequences with their posters, and `tools/render-systems.py`, whole, to
`backup/system-sequences-v1/` (IMG-012's outputs moved with them); light mode, `js/theme.js` with the switch and the
light tokens, to `backup/theme-switch-v1/`.

**Open, for the owner.** The review of the finished footage, landscape and portrait: does each system become
understandable at the moment its action becomes visible, and does the return to the opening feel like an ending? The
device checks (§5f) now include the whole passage on an iPhone.

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting (the page the same in both), at three viewports, 1,400 element samples, none
below 4.5:1, worst 4.9:1 (the film's statement on a phone, as before); AWC-OS's and CytherCAD's words 6.11:1 at worst,
the close and the footer 6.11:1 (CY-SEM-003 PASS). Both pages settle to no frame, timer or playing media in every profile
once the scroll stops; at CytherCAD's figure the passage shows exactly the frame its moment names (20.3 s), and under
reduced motion it never loads while CytherCAD's still stands; a scroll back into the passage is answered with one frame
and no media or timer, and the page settles again; nothing overflows sideways at any viewport; the worker caches this
build and serves it offline (CY-TEMP-001 PASS). The settle probe's stimulus is now that scroll: with no sequence left,
nothing plays on the page below the film.

Smoothness, re-measured with §5w's harness (the passage scrolled at a constant speed, every presented frame recorded):
the scene moves 2 s a viewport through all five stretches; headless Chrome presents 59.9 frames a second at a viewport a
second and 59.7 at two, on the desktop and on a phone, every display frame, none late, the longest hold on one frame
16.8 ms; the iOS Simulator's WebKit presents 47.7 a second at a viewport a second (the scene's 48: every frame of it), 3
display frames late in 12.5 s, the longest hold 46 ms as before, and 59.5 at two viewports a second, the longest hold 35
ms. As the owner noted of §5w's figures, these are the harness's, in headless Chrome and the iOS Simulator, not a
phone's or a Mac's in hand.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_983A5A948DF4EF1B`), 59 of 59 served paths matching the artifact.

## 5y. AWC-OS's condition and route held with its words — 2026-10-21

Build `73B4CD7CEF71A0F3` (`#reading_ink_73B4CD7CEF71A0F3`, `#film_settle_73B4CD7CEF71A0F3`).

**The owner's review** (2026-10-21, pasted), of the live `983A5A948DF4EF1B` at the desktop and at 390 × 844 (a review of
the composition and its scroll-linked presentation, not a device's smoothness): the completed passage works as one
continuous world, and the return feels like an ending; keep the footage, the transitions and the ending. AWC-OS says its
idea (the opening fixed, the oversized proposal set aside, the smaller alternative through the same opening);
CytherCAD's name and description arrive before the shape develops, and the bore and dimensions make the result
concrete; the return gives *Tell us what must never happen.* a conclusion to sit beneath. One correction: AWC-OS's
condition-and-route caption (14.6–15.7 s) showed for 0.55 of a screen of scroll and was fully opaque for 0.30 — too
little to notice the qualification, read it, recognize the link and stop. Keep the condition and the evidence link
present throughout AWC-OS's explanation, a stable, subordinate pair beneath the main copy; keep the even pace and the
shorter treatment; no new frames, no new scene, no longer passage; if the copy grows too tall on a phone, shorten the
explanation, keeping its three outcomes, never the type.

**Now** AWC-OS's words are one caption for its whole window, 12.95–15.7 s (1.375 screens of scroll, 1.125 fully shown):
the label, the headline and the explanation, then the condition and *See the demonstration →* beneath them, quiet. The
pair alone would have pushed the caption's darkness over the refused program where it waits below the opening (by 61px
at 390 × 844, 28px at 1440 × 900, measured), so:

- the explanation is shorter, its three outcomes kept: *The AI proposes a financial program; a separate engine runs
  it, refuses it with an allowed alternative, or blocks it.* (the card's was *The AI proposes a financial program. A
  separate engine checks it against the rules: it can run, be refused with an allowed alternative, or be blocked.*).
  `awc-os/` states each part: the model's program goes to *AWCOSCore (canonical interpreter …) → EXECUTED · REFUSED ·
  BLOCKED*, and *the engine returned BLOCKED*. The Arabic follows it in the reviewers' words: *يقترح الذكاء الاصطناعي
  برنامجًا ماليًا، فيُنفّذه محرّك مستقل، أو يرفضه مع بديل مسموح به، أو يحجبه.*
- on a phone 360px wide or more the headline takes one line (*Not every answer is allowed.* fits at its 28px from 360
  to 430px, in both languages); narrower, it keeps its designed break rather than split *is / allowed*;
- a condition and its link sit 8px apart instead of 14, one quiet unit (ADII's and CytherCAD's pairs too).

No type is smaller, and nothing else on the page moved; the stills still change between two systems' words (AWC-OS's
until 15.75 s).

**Measured** (the caption's solid darkness, its box grown by its 14/22px inset and 22px shadow spread, against the refused
program where it waits at the opening, its place in the frame from the render's own camera mapped through
`object-fit: cover`): at 1440 × 900 clear by 4px, and at 390 × 844 clear by 1px in English and 12px over its lower edge
in Arabic, both within the darkness's soft edge; the old first caption alone was clear there by 66px and 34px. On screens
shorter or narrower than the frame was composed for, the caption sits over the program's lower part, the opening and the
gap it stops short of still in view: 1280 × 720 by 52px (the old first caption was clear by 10px), 375 × 667 by 58px (the
old one already covered it by 25px), 320 × 844 by 76px (the old one was clear by 34px). The words' window is 2.75 s of
the scene where the condition and route had 1.1 s: 1.375 screens of scroll, 1.125 fully shown, against 0.55 and 0.30.

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting, at three viewports, 1,400 element samples, none below 4.5:1, worst 4.9:1 (the
film's statement on a phone, as before); AWC-OS's caption 6.11:1 at worst, its condition (CY-SEM-003 PASS). Both pages
settle to no frame, timer or playing media in every profile once the scroll stops; at CytherCAD's figure the passage
shows exactly the frame its moment names, and under reduced motion CytherCAD's still stands; a scroll back into the
passage is answered with one frame and no media or timer; the worker caches this build and serves it offline
(CY-TEMP-001 PASS).

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_73B4CD7CEF71A0F3`), 59 of 59 served paths matching the artifact.

## 5z. The first route out of the film: ADII's evidence, the contact page, and back — 2026-10-21

Build `B8E83779898CD5AB` (`#reading_ink_B8E83779898CD5AB`, `#film_settle_B8E83779898CD5AB`).

**The owner's direction** (2026-10-21, pasted): the passage is done, but the paths out of it have not had the same
treatment. Each evidence destination needs a composed arrival (where the link lands, what appears first, how much there
is to read, how to return or make contact), its artifact and its limits intact, quieter than the front door and sharing
its type, identity and care; *Talk to us* needs an arrival that continues *Tell us what must never happen.*, easy to
describe the system, the proposed use and the unacceptable outcome without a long questionnaire, and then a real
delivery check; Arabic needs an introduction to each system's evidence before the visitor crosses into English; and the
site's identity must hold outside the cinematic page (shared-link previews, titles, the contact screen, the missing
page), with no remnants of an earlier design. First, one complete route, homepage → ADII evidence → contact → return, at
desktop and phone sizes, in English and Arabic, with the real evidence; then AWC-OS and CytherCAD.

**Found, before anything changed.** *See what this is based on →* landed on `adii/#run`, the recording, 498px (desktop)
and 623px (phone) below the page's top: past its headline and past its limitation (*A research project … no deployment is
claimed*). The page kept the light design of its first publication, an ADII logo in place of the company's, and a
footer reading *ADII · Group 05 · 2026*; *← CytherAI* returned to the top of the front door, not to the passage. *Talk to
us ↗* opened the mail app directly. The contact page, like the brief, the legal pages and the 404, still spoke the retired
document register in system fonts: *COMMUNICATION PROTOCOL · Initiate Contact*, a *Transmission Protocol* table, name,
email, organisation, message and a consent box; *DOC-2026-002 · Capability Brief*; *404 · No Record*.

**Now: the rooms** (`css/room.css`). The pages a visitor reaches from the front door are rooms of it: its type, its tokens
(the room adds a lifted ground and a field's edge), its seal lockup going home and its footer, dark in either device
theme, no motion, the artifact the loudest thing in the room.

- **ADII's evidence** (`adii/`) opens on its arrival: *01 · ADII · The recorded run*, *A number looked wrong. Changing it
  was a separate decision.*, what the run shows in four sentences taken from its own text (the revenue drop, the staging
  filter ADII traced it to, its answer *Fix it* given only after the authorizer allowed the change and the validator
  accepted it on a rebuild from a frozen copy, and *The AI that proposed it didn't approve it*), then its limitation,
  beside the recording; on a phone the headline, the limitation and the recording come first (the recording's foot at
  557 of 844px; at 568 of 900 on the desktop), and what it shows follows. Under it, *Tell us what must never happen →*
  and *← Back to the passage* (`../#adii`, where the visitor left); then the run as text and the team with their CVs,
  verbatim. The *Group 05* footer gives way to the company's.
- **The Arabic introduction** (`ar/adii.html`): the same arrival in Arabic, the recording (its interface in English, said
  so), and a marked link to the English text and team; the Arabic front door's route lands here instead of on the English
  page.
- **The contact room** (`contact.html`, `ar/contact.html`) continues *Tell us what must never happen.* with three short
  answers, the system, what AI would do in it, and what must never happen, composed into one readable email for the
  visitor's own mail app (subject *What must never happen: <the system>*, the three answers labelled in the body). The
  transport stays `mailto:` by design: nothing passes through the site, which keeps nothing and never says a message was
  sent (*This page sends nothing and cannot see whether it arrives*); without the script the form posts the three answers
  to `mailto:`. Name, email, organisation and the consent box are gone (the visitor's own mail account carries who they
  are, and nothing reaches the site to consent to); the other addresses (security, NDA, a PGP key on request) stay,
  quietly. *Talk to us →* on both front doors now lands here; *← The three systems* returns to the passage.
- `pages/privacy.html` describes the contact page as it is now; the ADII poster, named as a link preview from outside
  `adii/` for the first time, has its receipt (IMG-014). The pages the rooms replaced are `backup/before-rooms/`.

**Checked.** `tools/test-site.py` holds each room to its stylesheet, its home lockup and its footer, the room's tokens to
the front door's, and its inks (≥ 4.5:1 on the ground and the lifted ground; a field's edge ≥ 3:1); each fails on its
mutation in a throwaway copy (a token drifting from the front door's, a field's edge below 3:1, a room without its footer,
a room on the old stylesheet). The new pages join the seal, language-pair and `lang`/`dir` laws. In a browser, both
contact rooms composed the email above from three filled answers (English and Arabic), and no room logged an error or
overflowed at 1440 × 900 or 390 × 844. Mail for cytherai.com is routed (MX `mail.protonmail.ch`, SPF Proton's).

**Open, for the owner.** The real delivery check: send one message from the contact page on your phone and on your Mac,
in each language, and confirm it arrives at contact@cytherai.com. A very long Arabic answer makes a long link (three
short ones already make 1,239 characters, every Arabic letter percent-encoded), which some mail apps cut. The review of
the route itself. The *Group 05* footer is gone from ADII's page: say if it should stay. Next, in rooms: AWC-OS's
demonstration, CytherCAD's validation record, the legal pages and the 404, with one review of titles, previews and naming
across them.

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting, at three viewports, 1,400 element samples, none below 4.5:1, worst 4.9:1
(CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile once the scroll stops, and the
worker caches this build and serves it offline (CY-TEMP-001 PASS). The rooms' inks are flat colours on flat grounds,
held by the static law above rather than a capture.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_B8E83779898CD5AB`), 61 of 61 served paths matching the artifact.

## 5aa. The owner's review of the first route: authorship, the draft, the way back, and links that take a click — 2026-10-21

Build `16109F1BC4218636` (`#reading_ink_16109F1BC4218636`, `#film_settle_16109F1BC4218636`). It replaces build
`9FB00C1E35255378`, the review's first answer, which was never committed; its provisional receipts were discarded unadmitted.

**The review** (the owner, 2026-10-21, pasted; a decision on the approach §5z describes, not yet an inspection of its
pages): keep the dark rooms, the three-question contact form and the CytherAI navigation. The darkness is an
art-direction choice, not a consequence of the retired warm-paper colours (as my report had argued): the visitor keeps
the passage's world, and the quieter layout and the stillness give the change of pace. The shared identity must keep
ADII's authorship explicit: the evidence page must make clear whose research and recorded run the visitor is seeing.
Keep the form free of name, email and organisation (the email gives a reply address, not necessarily a useful name or
organisation; the conversation can establish those) and free of a consent box, provided the privacy description matches
what the page does: what it does with the answers and when they leave the browser. §5z's *nothing reaches the site to
consent to* was too broad: consent is not the only privacy consideration, and the host's logs are separate from the form.
Plain questions; a button that names the next step, *Open email draft*, not *Send*, with *Your email app will open with
these answers. Review the draft and send it there.* near it; if no email app opens, the contact address and an easy way to
copy the composed message. And *Back to the passage* must restore ADII's position without replaying the opening or making
the visitor find their place. Opening a correctly composed draft and confirming its receipt are separate checks; the
second stays the owner's.

**Found, before anything changed.** The rooms' way back, `../#adii`, landed on the top of ADII's stretch, passage second
5, where no words show (its first fade in from 5 s), three and a half screens before the words the visitor had left by
(*See what this is based on →*, 11.2–12.8 s). Below 400 px the header's way back was hidden, and the Arabic page had no
other. The browser's own Back was exact while Chrome kept the page in its back-forward cache; without it, a return to the
top replayed the film (the landing's *Talk to us →*, then Back: the film from 0).

**Now.**
- **Whose work it is.** Under ADII's headline: *Built by Group 05: Malek Alhazmi, Joorie Alsakran, Ibrahem Altowalah and
  Nasser Alzaid.* and *Their roles and CVs ↓* (the team section, now `#team`); in Arabic *من بناء فريق Group 05*, the names in
  Latin, each kept whole on its line. Both come from the page as first published (its *Group 05* label and its *Built by*
  list); the company's footer stays, and the team section and CVs are unchanged.
- **The draft.** The review's three questions (in Arabic *على أي نظام تعمل؟* · *ماذا تريد أن يفعل الذكاء الاصطناعي؟* ·
  *ما الذي يجب ألّا يحدث أبدًا؟*), the first with an example; *Open email draft* with the review's sentence under it; then
  *If no email app opens, copy the message and send it to contact@cytherai.com from any account.* and *Copy the message*,
  which copies the draft whole (the address, the subject and the three answers) and says so in a status line. The draft's
  body is the three questions, each followed by its answer.
- **Privacy, as implemented.** The contact page says the answers stay in the browser until the draft opens and that it
  neither sends nor stores them; `pages/privacy.html` says when they leave it (to the visitor's own email app as a draft,
  and to CytherAI only if the visitor sends it, with the address and name their mail account adds), that *Copy the
  message* puts them on the device's clipboard and nowhere else, and that loading any page is logged by the host apart
  from the answers: the site is served by GitHub Pages, which logs and stores each visitor's IP address for security
  purposes, as GitHub states (docs.github.com, *About GitHub Pages*, *Data collection*, read 2026-10-21).
- **The way back.** ADII's route words on both front doors carry an id, `adii-evidence`; both rooms link to it (the
  header's way back, and one under the arrival, in Arabic too), and `js/film.js` brings their moment on arrival, the
  middle of their window (12 s), as keyboard focus already did: the evidence moment, not the exact scroll the visitor
  left from (corrected 2026-10-21 on the owner's live review, §5ab: left at 4,248 px, back at 4,320 px). A reload or a
  return through the history keeps the scroll the browser restores, and a return through the history never plays the
  film, even to the top. The contact page, reached from many places, goes back through the history when the visitor came
  from this site (`navigation.canGoBack`, which counts only this origin's pages) and otherwise to the three systems. The
  header's way back shows at every phone width (the narrowest gap at 360 px: 58 px).

**Checked.**
- `tools/test-site.py`: a law that each evidence room's links to its front door name the passage's words whose route
  leads to the room. In a throwaway copy it fails on each of four mutations (the old `#adii`; a bare `./`; the id moved to
  ADII's first words; the Arabic id removed) and passes on a no-op control and on the restored copy. 27 tests pass.
- Chrome 155, headless, English and Arabic at 1440 × 900 and 390 × 844: the rooms' way back lands at 12.0 s, ADII's
  condition and route shown whole, the film still (before: 5 s, no words). The browser's Back from ADII's evidence
  restores the same moment with and without the back-forward cache; without it, Back to the top now shows the statement
  still (before: the film replayed). Keyboard Tab still brings each route's moment, at the same scrolls as the live build.
  The contact pages composed the draft from three answers in each language; the copied message read back from the
  clipboard whole, and the status line said so. *← Back* returned through the history to the front door's statement, and
  to `#systems` when the page was opened directly. `navigation.canGoBack` was false for a page opened directly or from
  another origin, and true from this one.
- iOS Simulator (Safari, iOS 26.5; not a phone): the Navigation API is present, `canGoBack` true from this origin and false
  from another; `/#adii-evidence` and `/ar/#adii-evidence` land on ADII's route words, without the film, at 3 s and 10 s.
- The rooms at 1440 × 900 and 390 × 844: no console error, no overflow. ADII's recording ends at 610 of 900 px on the
  desktop and 640 of 844 on the phone, so the headline, the byline, the limit and the run share the first screen.

**Observed, not changed.** In headless Chrome at phone size, opening the Arabic front door at a fragment directly (typed,
or from another app: `/ar/#systems`, and `/ar/#adii` on the live build) did not scroll to it; following the same link from
a page did (6 of 6), and the English door and the desktop were unaffected. The rooms' way back does not depend on it
(`js/film.js` brings the words' moment). Not reproduced on a device.

**The passage's links took no click or tap** (the owner, 2026-10-21, after the review: *in the main page the three system
links are not clickable*). Found: from build `EB79D2894F4F8A29` (2026-10-20), which fixed the passage's words to the foot
of the frame inside their stretches, each stretch made a stacking context (`.passage{position:relative;z-index:2}`) that
held its words inside it, and the next stretch, transparent and later in the page, lay over them. At each link's moment
the pointer met `section#awc-os` over *See what this is based on →*, `section#cythercad` over *See the demonstration →* and
`section#return` over *Read the validation record →*, in both languages at 1440 × 900 and 390 × 844, and a real click or
tap did nothing; ADII's link had been dead to the pointer since 2026-10-20, AWC-OS's and CytherCAD's since they joined the
passage on 2026-10-21. Keyboard focus reached all three throughout, and every check of mine had followed links by
keyboard or by script, which no covering layer stops. Now the stretches make no stacking context and the words keep
their own z-index (`.passage{position:relative}`), and `tools/test-site.py` holds it: a stretch's rules, by class or by id,
may set nothing that makes one (it fails on the old z-index, on an isolation, on a transform, and on words without their
own z-index, in a throwaway copy; it passes the control). Checked with real input (Chrome 155: the pointer's target at each
control's centre, `elementFromPoint`, and a real mouse press on the desktop, a real touch on the phone): every link and
control a visitor can see on both front doors (the statement, each system's link at its moment, the close, the footer) and
in the four rooms is the one the pointer reaches, at 1440 × 900 and 390 × 844, and all twelve presses on the systems' links
open their pages (on the live build's code: 12 covered, 12 presses that did nothing, nothing else covered). The passage
looks as it did: under reduced motion its screens at seven moments, in both languages at both sizes (28), match the live
build's to within one level in 255 (the live build against itself varies as much).

**Open, for the owner.** The delivery check, unchanged from §5z: on your phone and on your Mac, in each language, *Open
email draft*, send, and confirm the message arrives at contact@cytherai.com; on a device with no email app, *Copy the
message* into webmail. The review of this exact build end to end: attribution, the limitation, the draft and its
fallback, and the way back to the passage.

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting, at three viewports, 1,400 element samples, none below 4.5:1, worst 4.9:1
(CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile once the scroll stops, and the
worker caches this build and serves it offline (CY-TEMP-001 PASS). The rooms' inks are flat colours on flat grounds, held
by the rooms law in `tools/test-site.py` rather than a capture.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_16109F1BC4218636`), 61 of 61 served paths matching the artifact.

## 5ab. AWC-OS's and CytherCAD's evidence as rooms — 2026-10-21

Build `502593FFB37C9DEE` (`#reading_ink_502593FFB37C9DEE`, `#film_settle_502593FFB37C9DEE`). It replaces build
`588FDDD6D3EEC588`, never committed, whose CytherCAD pages named `js/manifest.js` in a comment: `tools/test-api.py` holds
that no served page names the record, and the comments now name `CytherManifest`, as the brief's does; its provisional
receipts were discarded unadmitted.

**The review** (the owner, 2026-10-21, pasted: an independent live review of build `16109F1BC4218636`, desktop, in an
in-app browser): the first route works, by clicks at visible coordinates (each system's link, ADII's authorship under its
headline, ADII to contact, the draft, contact's Back to ADII, ADII's return with its caption shown and the film still);
keep the design and the corrections. One correction to my report: *the same scroll position as when they left* is
stronger than the implementation; the reviewer left at 4,248 px and came back at 4,320 px, because the way back lands on
the middle of the caption's window: describe it as *returns to the evidence moment* (corrected in §5aa, in the return
law's docstring and in CLAUDE.md). And the remaining work: *the other two destinations have not received this treatment.*
AWC-OS's link still took an English visitor into the older Arabic-first evaluation page, with its original home link and
mailto invitation; CytherCAD's still landed at the general brief's cover, before its record: the next bounded extension
of the chosen design, not a reason to reopen the film or invent another concept. The reviewer did not repeat the
language and device matrix, the clipboard, contrast, the release suite, real email delivery, a physical iPhone or
VoiceOver.

**Now.**
- **AWC-OS** (`awc-os/`, English; `ar/awc-os.html`, Arabic, each with its own film: the page it replaces was bilingual,
  so both films and both texts are originals). The arrival: *02 · AWC-OS · The demonstration*, *Not every answer was
  allowed.*, *Developed by Al-Baseera (البصيرة) and presented at the AMAD 2026 FinTech Hackathon (Alinma Bank × Tuwaiq
  Academy)* (the film's own closing card), what the demonstration shows in three sentences from the page's own text and
  the film's (the engine runs, refuses with a Sharia-compliant alternative, or blocks; the 5% interest request refused
  before it reaches the customer; the zakat computed exactly, SAR 4,226.25, its trace opened; the over-promising takaful
  program BLOCKED and no rule relaxed), and its limit (*A hackathon demonstration: the MVP runs on an evaluation machine,
  not on deployed hosting, and the iPhone demo runs offline. No deployment is claimed.*), beside its film. Then, verbatim:
  how it decides (the pipeline, the shared Swift engine, the three verdicts, the measured failure retained, *unauthorized
  answers fail safely*), the four demonstration paths with the live MVP's note (its live session now asked for through
  the contact page, not a mailto), the film as text, and its source. The gateway's language toggle (`awc-os.js`) retired
  with it to `backup/before-rooms/awc-os/`; `noindex` stays, as the gateway had it. The posters (IMG-015) are each film's
  frame at 52.0 s, the engine's trace marked EXECUTED: the refusal at 34 s was the obvious frame, but its card names the
  halal alternative's Alinma product, and a poster and a link preview would put that name first (the Alinma plan is
  cancelled); the films and their text keep it, as the owner decided on 2026-10-19.
- **CytherCAD** (`cythercad/`, a room of its own; `ar/cythercad.html`, its Arabic introduction with the record in its
  original English). The arrival: *03 · CytherCAD · The validation record*, *0.00% invalid on an external benchmark,
  against 10.00% for DeepCAD.* (projected), what CytherCAD does (the brief's own description, and *on-prem, private and
  air-gapped*), what the figures establish (*Text2CAD-192 is an external, published benchmark that CytherAI does not
  operate, and DeepCAD's figure is the one published with the Text2CAD benchmark. The invalid rate is the share of
  generated CAD sequences that are invalid: whether the output builds, not whether it is the part described. The other
  figures come from CytherAI's own logs.*), beside the validation summary (the key outcome and the six figures, all
  projections). The meaning of the invalid rate and the source of DeepCAD's figure were checked against the benchmark's
  paper (Text2CAD, arXiv 2409.17106v1, §5.1: *The Invalidity Ratio (IR) is calculated to measure the proportion of
  invalid CAD sequences*; Table 1: DeepCAD 10.00, Text2CAD 0.93; read 2026-10-21). Then the record as the brief states it.
  `tools/project-manifest.py` writes both rooms, and `tools/test-projection.py` holds each to print every validation
  identifier. The brief keeps its own Exhibit A, unchanged.
- **The routes and the way back.** *Read the validation record →* lands on `cythercad/`; the Arabic front door's AWC-OS
  and CytherCAD routes land on their Arabic rooms (no longer on the English gateway and the English brief, marked
  بالإنجليزية). AWC-OS's and CytherCAD's route words on both front doors carry ids (`awc-os-evidence`,
  `cythercad-evidence`); each room's way back names them, and `tools/test-site.py` holds all six evidence rooms to it.

**Checked.**
- `tools/test-site.py` (28 tests), `tools/test-projection.py` and `tools/test-assets.py` pass. The extended laws fail, in a
  throwaway copy, on five mutations (the Arabic AWC-OS way back to its stretch, not its words; CytherCAD's way back to
  AWC-OS's words; the Arabic CytherCAD room on the old stylesheet; a validation row dropped from the CytherCAD room; the
  Arabic AWC-OS room without its marked English link), and pass on a no-op control and on the restored copy.
- Chrome 155, real input (`elementFromPoint` at each control's centre, a real mouse press on the desktop, a real touch on
  the phone), at 1440 × 900 and 390 × 844: every link and control a visitor can see on both front doors and in all eight
  rooms is the one the pointer reaches; the twelve presses on the systems' links open the right rooms (English routes
  the English rooms, Arabic routes the Arabic rooms); each of the six evidence rooms' *Back to the passage*, pressed,
  returns to its evidence moment (12.0 s, 14.325 s, 20.3 s), that caption alone shown and the film still.
- The rooms at 1440 × 900 and 390 × 844: no console error, no sideways overflow (CytherCAD's key outcome first ran 94 px
  past a phone's width, in a cell that never wrapped, and stands on its own line now); each artifact in the first screen
  (AWC-OS's film ends at 613 of 900 px and 607 of 844; CytherCAD's record beside its arrival, and after its limit on a
  phone). ADII's and the contact rooms are the same height as before.

**For the owner.** The posters' frame (the trace, not the refusal) is a choice you may reverse. The CytherCAD record as
published carries two things worth your eye: *Dimensional Accuracy ±3mm (n=35)* 99% above *±5mm (n=35)* 97% (a wider
tolerance usually passes at least as many), and *Status: Production-validated*; both are printed as the record states
them. *DeepCAD's figure is the one published with the Text2CAD benchmark* is my addition from the benchmark's paper; if
CytherCAD's 0.00% was measured on a different set of prompts from that published figure (a *-192* set, against the
paper's test set), say so on the page or tell me and I will. Still to come in rooms: the brief, the legal pages and the
404, with one review of titles, previews and naming. (Answered in §5ad, 2026-10-21, from the runs' own records: none of
the three stood as printed, and the record was corrected.)

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting, at three viewports, 1,400 element samples, none below 4.5:1, worst 4.9:1
(CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile once the scroll stops, and the
worker caches this build and serves it offline (CY-TEMP-001 PASS). The rooms' inks are flat colours on flat grounds, held
by the rooms law in `tools/test-site.py` rather than a capture.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_502593FFB37C9DEE`), 65 of 65 served paths matching the artifact.

## 5ac. The brief, the legal pages and the 404 as rooms, and one review of titles and link previews — 2026-10-21

Build `9D49A66EBBC940D3`, superseded before it was admitted by `937C44578B6186B4` (§5ad): its observations below were
provisional receipts, discarded with the build, and the same probes were run again on its successor.

**The direction** (the owner, 2026-10-21): *do the brief, the legal pages and the 404, then one review of titles and
link previews.*

**Found, before anything changed.** The five pages still wore the cold-paper design (`css/cytherai.css`): light paper,
system fonts, a bar of links under a scope line (*PRIVACY · PUBLIC SURFACE*), *LEGAL* stamps and inline styles, which
their policies admitted with `style-src 'unsafe-inline'`. The brief spoke the retired document register (*DOC-2026-002 ·
Capability Brief*, section stamps *§01 … 04 / 04*, *EXHIBIT A*, record ids, *Disclosure: Public Surface*) beside two
illustrative figures; the 404 said *404 · No Record* over an *EMPTY PLATE*. Titles followed three patterns (*X —
CytherAI*, *X | CytherAI*, *404 · No Record | CytherAI*), and the front doors' title was the film study's working name,
*CytherAI — Everything changes. One thing holds.*, which the page never said (its statement, its card and its
description say *Let AI change things. Keep control of what changes.*). Previews differed: the rooms carried no
`twitter:card`, so a shared link fell back to the small card; ADII's declared no image size; no page named the site
(`og:site_name`); only the front doors declared their language; the cold pages' theme was paper (`#ECF0F4`). Once the
evidence routes moved to the rooms, the brief was linked only from the cold pages' bar and the 404.

**Now.**
- **The legal pages** (`pages/privacy.html`, `security.html`, `terms.html`) are rooms: the front door's lockup, *← The
  three systems*, their label (*Legal*, *Security*), their title, their dates, and their text word for word (the visible
  text from the title to the end compared before and after: identical, 550, 224 and 350 words); only the frame changed.
- **The brief** (`pages/brief.html`) is a room: *Two systems, and the record behind each.*, what it covers and what is
  under qualified review, the architectural constraints, CytherCAD's record (every row, the validation summary with
  every figure projected, and a link to its own room for what the figures establish), SijilOS's record (every row), and
  qualified access (*Request a briefing*, the NDA address). Twenty-two facts of the old brief, each found in the new.
  The document register and the illustrative figures are gone; the section ids are the document's, so its links land.
- **The 404** is a room served at any depth (every URL absolute), in English and Arabic: *Nothing is published at this
  address.*, why that may be, and the ways on (the three systems, the contact page; the Arabic front door and contact).
- **Retired whole** to `backup/cold-paper-v1/`: the five pages as served, `css/cytherai.css`, the brief's two figures
  and the 404's plate with their generators (their receipts, IMG-003, IMG-004 and IMG-005, marked retired, their
  outputs moved with the bytes). `generate-integrity.sh`, `deploy.paths` and `sw.js` no longer name the stylesheet.
- **The way round.** *← The three systems* now lands on the passage's first words (`#principle`, an id on both front
  doors that `js/film.js` brings, as with the evidence words), and so does the contact room's fallback, which landed on
  a wordless second before. Every page's footer names the brief, the contact page, security, privacy and terms (in
  Arabic: الموجز among the English pages), and marks the one it is.
- **Titles and link previews, reviewed once.** Every title is *… — CytherAI*; the front doors lead with the name and
  their own statement (*CytherAI — Let AI change things. Keep control of what changes.*, and in Arabic the Arabic
  statement). Every shareable page previews with `og:site_name` CytherAI, its title, a description, its own URL, its
  language (`og:locale`, with the other as alternate where a pair exists), the large card, and an image of this site
  whose declared size and type are its real ones (ADII's poster now declares 1920 × 1080); every theme is the ground.
  The 404 carries no preview: it is served at every missing path and is not a page anyone shares.

**Checked.**
- `tools/test-site.py` (28 tests): the rooms law now covers the brief, the legal pages and the 404; two laws retire with
  the cold-paper design (the bar's navigation, the subpage inks) and one replaces the bar (every footer names the site
  and marks its page); the seal law reads every page as dark; the policy law no longer admits inline style; and a new
  law holds titles and previews (the declared image sizes read from the files). In a throwaway copy, eight mutations
  fail (the old front-door title; an image size that is not the image's; a page without the large card; an Arabic page
  previewed as English; a footer without the brief; the privacy page not marking itself; inline style admitted again;
  the 404 on another stylesheet) and the control and the restored copy pass. `tools/test-projection.py`,
  `tools/test-assets.py` and `tools/test-api.py` pass.
- Chrome 155, the five pages at 1440 × 900 and 390 × 844 (the 404 served, as GitHub Pages serves it, at
  `/no/such/deep/page`): the room's stylesheet and fonts load at any depth, no sideways overflow, no console error
  besides the 404's own status.

- Chrome 155, real input (a real mouse press on the desktop, a real touch on the phone): from the brief, the three legal
  pages, the 404 (both its English and its Arabic way) and the contact rooms arrived at directly, *The three systems*
  lands on the passage's first words (3.2 s, *One principle. Three systems.* shown alone, the film still), in both
  languages at both sizes; the six evidence rooms still return to their moments; every link and control a visitor can
  see, on both front doors and all thirteen rooms, is the one the pointer reaches, and the twelve presses on the
  systems' links open the right rooms.
- The register law now refuses any document number (`DOC-20xx-nnn`), so the brief's cannot return: it fails on
  *DOC-2026-002* put back in a throwaway copy and passes the restored one.

**For the owner.** The front doors' title changed from the film study's name to the page's statement: say if the
study's line should stay. The AWC-OS rooms keep `noindex`, as the evaluation gateway had it; every other page may be
indexed. Previews are cached by the services that show them (Slack, LinkedIn, iMessage, X): a page shared before this
build may show its old card until the service refetches it.

Observed on this build (Chrome 155.0.8059.85, 2026-10-21): reading ink over the film and the passage on both front doors,
under a dark and a light device setting, at three viewports, 1,412 element samples (the footer's *Brief* among them),
none below 4.5:1, worst 4.9:1 (CY-SEM-003 PASS); both pages settle to no frame, timer or playing media in every profile
once the scroll stops, and the worker caches this build and serves it offline (CY-TEMP-001 PASS). The rooms' inks are
flat colours on flat grounds, held by the rooms law in `tools/test-site.py` rather than a capture.

## 5ad. The production handover reviewed: the records behind two systems' claims, the journey observed again, load, search and operations — 2026-10-21

Build `9BD0C72EFFCAE053` (`#reading_ink_9BD0C72EFFCAE053`, `#film_settle_9BD0C72EFFCAE053`). It supersedes
`9D49A66EBBC940D3` (§5ac), which was never admitted.

**The direction.** The owner pasted a review on 2026-10-21. It kept the design and named six things to close before the
production handover could be called complete:
1. the strength of CytherCAD's claims;
2. mail that reaches a person;
3. device and accessibility evidence on this experience;
4. a load baseline;
5. deliberate search visibility;
6. an operational handover.

Then the candidate is released through the existing process.

**1. CytherCAD's record, checked against its runs' own files.** Read on 2026-10-21, read-only, from two sources:
- the CytherCAD repositories on the owner's Mac (`~/Desktop/cythercad`, `~/Desktop/cythercad_v1.1`): `docs/v11_status.md` of 2026-04-09, the April result files under `archive/legacy_evals/sprint/` (their checksums of 2026-05-11 match), `CHANGELOG.md`, `eval/`, and `docs/BENCHMARK_LEDGER.md` of 2026-07-19;
- the Text2CAD paper (arXiv 2409.17106v1, §5 and Table 1).

The six rows came unchanged from the owner's page of 2026-04-16 (`6f61ef5`), and none had been checked against a run
before. §5ab transcribed them. Its room's *Text2CAD-192 is an external, published benchmark that CytherAI does not
operate* was my own transcription of the brief's *External · Published · Not operated by CytherAI*.

| As printed until now | What the records show | Now |
|---|---|---|
| *0.00% invalid rate on Text2CAD-192, … an external benchmark CytherAI does not operate* | CytherAI chose 192 descriptions from the Text2CAD dataset: 48 for each of four kinds of operation, 12 of each at each of its four levels of detail. CytherAI ran the test on 2026-04-16 (`text2cad_v3_final.json`): one part per description from each of its two ways of reading one. Invalid: 0 of 192 on one way, 1 of 192 on the other (a program left incomplete). Valid meant the program ran and the kernel's topology check passed. Until 2026-05-06 a part whose fillet or boolean step failed kept its earlier shape and counted as valid (`CHANGELOG.md`). Not run again since | *In CytherAI's own test of April 2026, 1 of 384 parts was invalid*, with its conditions beside it, in the rooms and the brief (projected, `T2C192-INV-1-384`; the Arabic room's word order derived from the same string). The front doors print no figure |
| *against 10.00% for DeepCAD* (and Text2CAD's 0.93%) | The Text2CAD paper's own test: expert-level descriptions only, its own test set (size not given) and its own check, with DeepCAD driven through a layer its authors trained. Copied as constants | Withdrawn. The room says figures published for other systems come from another test and are not compared. The owner's ledger of 2026-07-19 says rows of different protocols are never ranked against each other |
| *GVR · Constrained Beam (n=100) 100%* | No such run. Beam figures elsewhere are V1.0 runs whose outputs were identical; on v1.1, 0 of 200 valid under beam (2026-05-06) | Withdrawn |
| *GVR · Completion (n=100) 100%* | No source names the row. The nearest run is 100 of 100 on 100 descriptions CytherAI wrote, after its decoding had been adjusted on failures seen on those same descriptions | Withdrawn |
| *Dimensional Accuracy ±3mm / ±5mm (n=35) 99% / 97%* | The source reads ≥3 mm and ≥5 mm *compliance*: with a manufacturing minimum of 3 or 5 mm set, 426 of 427 and 416 of 425 generated dimension values met it, over 50 generations without a description each. This is not accuracy against a requested size, and there is no n of 35. A stricter minimum is met less often, hence the inversion the review saw | Withdrawn |
| *Multi-Op Accuracy · Encoder (n=35) 91%* | 32 of 35 outputs used two or more operations. That is a rate, not an accuracy, and the raw output is not on record | Withdrawn |
| *Status: Production-validated* | No source uses the phrase. No deployment, customer or pilot is on record; the records of May and August 2026 say none exists | Withdrawn |
| *Verified: Log + external benchmark* · *Benchmark source: Text2CAD-192 · External · Published · Not operated by CytherAI* | The test is CytherAI's | *Verified: CytherAI's evaluation log* · *Test set: 192 descriptions chosen by CytherAI from the Text2CAD dataset (Khan et al., NeurIPS 2024)* |
| *Parameters: 16.1M* | That is the S configuration. The test ran the 5.5M XS decoder, which the records name as the production choice | Withdrawn |
| *Kernel-backed verification confirms dimensional accuracy post-generation* (the front door: *checks the dimensions afterwards*) | The kernel checks that the solid is valid. CytherCAD's own decks say it does not take exact dimensions from free text | *checks the geometry after generation* (the front door: *checks the result afterwards*) |

What the records support is kept: *on-prem, private and air-gapped* (the v1.1 server's air-gap mode, done in April 2026)
and the methodology line. The six rows as first printed stand in `backup/cold-paper-v1/pages/brief.html`. The record's
checksum moves from `75D1:89D1` to `5290:7C3B`. No served asset derives from it, and the retired derived assets keep the
state they record.

**SijilOS's record, checked the same way.** It was not in the review, but the same rule applies. Read on 2026-10-21 in
`~/Projects/SijilOS`, in the owner's SijilOS documents, and on zatca.gov.sa.

| As printed until now | What the records show | Now |
|---|---|---|
| *ZATCA Phase 1 · Kingdom of Saudi Arabia · Certified compliant · April 2025* | ZATCA does not certify Phase 1 solutions. Its e-invoicing FAQ asks *Should my electronic system be certified by ZATCA or a 3rd party for Phase 1?* and answers *No*. The earliest SijilOS code on the owner's Mac is from February 2026, and the owner's deck of May 2026 asks to *initiate ZATCA portal registration* | Withdrawn. In its place: *It produces the QR code that ZATCA's Phase 1 e-invoicing rules require* (the code does) |
| *Live beta · 2 production environments* | The owner's roadmap of March 2026 says *Phase 1 blocks go-live*, with every audit issue open. The deck of May 2026 asks to *approve Phase A pilot* | Withdrawn. In its place: *No certification, deployment or pilot is claimed* |
| *Event-Sourced Ledger Engine* · *Event-sourced · Immutable log* · *Stores intent over time rather than current state* · *Financial-grade* | Orders are edited in place and read as the source of truth beside the event log; the roadmap says events and tables are both treated as the source of truth. Nothing enforces the log's immutability, and financial issues are open in the audit tracker | Withdrawn. In its place: *Offline-First Ledger*, *On-device · Offline-first* |
| *Zero core cloud dependency · Full offline operation* · *On-prem · Offline-first* | The code imports only Apple's frameworks and makes no network call | Kept: *running on the device and fully offline-capable, with no cloud service at its core* |

**2. The visitor's journey, observed again on this build.** Chrome 156, headless, with real input only: CDP mouse, touch
and key events, and `elementFromPoint` for what a pointer would reach.
- **The film's stop (WCAG 2.2.2).** The film moves on its own for 12 s, once. The header's *The three systems ↓* is in
  view and on top from its first frame. It was pressed at 0.3 s, 5 s and 9.5 s, in both languages: by mouse and by
  keyboard (two Tabs, then Enter) at 1440 × 900, and by touch at 390 × 844, 18 presses in all. Each stopped the film
  (the still state, nothing playing, its source dropped) and landed on the three systems.
  - Below 360 px the header drops the route to save room. There a swipe, the wheel, Space or PageDown each stop the film,
    which yields once the page is a quarter screen down; ArrowDown's 40 px steps take several presses.
  - Reduced motion never plays it.
  - Evaluated: a way to stop the film exists throughout playback at every width, so no *Skip film* control was added. The
    one remaining judgment is that the route names where it goes, not that it stops the film.
- **Keyboard.** Once the statement stands, each front door has 15 tab stops, each one shown when focused and with a
  visible focus ring. Every route opens its room on Enter, and its way back returns to its moment with the film still. The
  contact room's *← Back* returns through the history, from the back-forward cache.
- **Reduced motion, and autoplay refused** (`play()` rejected, as in Low Power Mode). At both sizes and in both languages,
  the still state and the whole statement appear at once and Replay is offered (*Play the film* under reduced motion).
  Past the film, each system's still stands at its moment, with nothing playing.
- **A phone turned mid-film.** The portrait film plays on in the landscape window and fills it, softer but with its words
  legible. At its end the landscape composition and the statement stand.
- **Zoom.** At 200 % (720 × 450) all fifteen pages fit with nothing cut. At 400 % (320 × 256) every page reflows without
  sideways scroll, but the passage's fixed words reached past the top of the window, where nothing could scroll them back:
  - AWC-OS's words, by 88 px in English and 94 px in Arabic;
  - CytherCAD's English words, by 22 px;
  - and the smallest phone on its side (568 × 270) cut AWC-OS's Arabic words by 12 px.

  Now, in a window at most 300 px tall (or 359 px wide and 360 px tall), the words scroll within themselves on their own
  ground. At every other size their computed style is unchanged, checked at 1440 × 900, 390 × 844, 844 × 390,
  667 × 325, 568 × 320 and 360 × 640. The statement and the close are whole at 400 %.
- **The contact draft.** A realistic message was typed into each field with real input, in English and in Arabic, and
  again with a middle answer four times as long. The draft that *Open email draft* hands over and the text that *Copy the
  message* copies are exactly what was typed, subject and body. Pressing the draft leaves the page where it is.
  - Draft links: 1,262 and 3,218 characters in English, 3,834 and 9,756 in Arabic, since each Arabic letter becomes six
    characters.
  - Whether every visitor's email app accepts the longer drafts is for the delivery test to show (§5f). The copy route
    carries any length.
- **Not observed here; the owner's (§5f):** native Safari, a physical iPhone, VoiceOver in both languages, a slow real
  network, and mail arriving.

**3. Load, measured in the lab.** No visitor data is collected, and none is claimed. Chrome 155 ran with Lighthouse's
presets as DevTools applies them:
- *desktop*: 10 Mbps, 40 ms, CPU 1×, 1440 × 900;
- *slow 4G*: 1.47 Mbps, 562 ms, CPU 4×, 390 × 844.

Each was measured on a first visit (empty cache, no worker) and on the return, against this build served locally and
against the live origin (`502593FFB37C9DEE`, whose film and script are this build's).

| Profile, visit | First paint | Film starts | Statement | LCP (element) | CLS | Longest interaction |
|---|---|---|---|---|---|---|
| Desktop, first, this build | 0.24–0.25 s | 0.41 s | 11.0 s | 11.7 s (the statement) | 0 | ≤ 32 ms |
| Desktop, return, this build | 0.04–0.06 s | 0.14–0.16 s | 10.8 s | 11.4–11.5 s (the statement) | 0 | ≤ 24 ms |
| Desktop, first, live | 1.3–3.1 s | 1.6–4.1 s | 12.2–14.8 s | 12.8–15.4 s (the statement) | 0 | ≤ 40 ms |
| Desktop, return, live | 0.06–0.07 s | 0.04–0.06 s | 10.7 s | 11.3 s (the statement) | 0 | 16 ms |
| Slow 4G, first, this build | 1.5–1.6 s | 3.0–3.1 s | 7.7–8.2 s, the film stalled | 4.3 s (a film sentence) | ≤ 0.0002 | ≤ 32 ms |
| Slow 4G, return, this build | 0.08–0.10 s | 1.0 s | 6.2 s, the film stalled | 2.1 s (a film sentence) | 0 | ≤ 32 ms |
| Slow 4G, first, live | 2.6–3.0 s | 4.3–5.6 s | 9.5–10.8 s, the film stalled | 5.5–6.7 s (a film sentence) | 0 | ≤ 32 ms |
| Slow 4G, return, live | 0.09–0.10 s | 0.08–0.10 s | 9.3–9.8 s, the film stalled | 4.4–9.8 s (a film sentence) | 0 | ≤ 32 ms |

Each range covers both front doors. The longest interaction is the lab's stand-in for INP: two Tabs, then a press on the
header's route, read from the page's Event Timing entries. A first visit on the desktop receives 6.3 MB in its window
(the film, then the passage, whole by 5 s on this build).

- **LCP.** By Chrome's measure, LCP is the statement. It appears when the film reaches it (10.6 s of film), or earlier
  when a stalled film gives way to the still composition. So LCP stays above the 2.5 s mark by design, not by waiting.
  What a visitor waits for is the film's first frame and the header's route, at the *film starts* column.
- **Slow 4G.** The film cannot keep pace on slow 4G. The stall rule (`STALL`, 2 s behind) gives way to the still
  composition and the statement, as designed (§5n). The passage then loads behind the stills.
- **Field data.** The PageSpeed Insights API refused the query (its shared daily quota, 2026-10-21), so none was read.
  Search Console's Core Web Vitals report is the owner's (`docs/operations.md`).

**4. Search.**
- Every shareable page names its canonical URL, which is its `og:url` (the directory for an index page).
- `robots.txt` admits every crawler and names `sitemap.xml`. The sitemap lists twelve pages; it leaves out the 404 and
  AWC-OS's two `noindex` rooms, which keep the evaluation gateway's setting (the owner's decision).
- Language pairs already name each other both ways (`test_each_language_names_the_other`).
- `tools/test-site.py` holds the canonical link to `og:url`, and the sitemap to the indexable pages.

**5. Operations.** `docs/operations.md` records:
- the moving parts as observed: GitHub Pages; Namecheap DNS and registration to 2027-08-28, with the transfer lock on; the
  Let's Encrypt certificate to 2026-12-14; Proton Mail with SPF, DKIM and DMARC; and no GitHub domain-verification record;
- what only the owner can settle;
- a monitor that checks the pages' words, not only their status;
- the origin check after every publish and weekly;
- the restore.

The restore was rehearsed outside production. `rollback/16109F1BC4218636` was restored from its branch (`git archive`)
into a local origin and ran as the site: `tools/probe-settle.py` PASS on both front doors, its worker installed and
serving offline.

**Checked.**
- `tools/test-site.py` (29 tests: the preview law now requires the canonical link; a new law holds the sitemap and
  robots.txt). In a throwaway copy, nine mutations fail and the control passes:
  - a page without its canonical link;
  - a canonical naming the `index.html` variant;
  - two canonical links;
  - the sitemap missing a page;
  - the sitemap listing a `noindex` page;
  - the sitemap listing the 404;
  - a listed page turned `noindex`;
  - robots.txt without the sitemap;
  - robots.txt withholding everything.
- `tools/test-projection.py`. P3 now holds the front doors to no projection. P5 refuses the withdrawn names
  (`outcome:cad`, `…:deepcad`). P7 now searches for every value the record holds, printed or not. Four mutations fail and
  the control passes:
  - a figure put back on a front door;
  - the withdrawn comparison put back in the room (the projector refuses it);
  - the Arabic figure typed as a literal (the old P7 missed it);
  - the English figure typed as a literal in the brief.
- `tools/test-assets.py` and `tools/test-api.py` pass.

**For the owner.**
- **Claims.** CytherCAD's and SijilOS's records are corrected to what their own records show. Before any CytherCAD figure
  returns to the front door, run a current evaluation (the 192 descriptions under today's check, with its protocol
  published). Restore a withdrawn row only with the run that supports it.
- **The rest of the review is yours,** in `docs/operations.md`: the mail and its monitoring, the device pass, Search
  Console and AWC-OS's `noindex`, the domain's verification and renewal, and account recovery.

Observed on this build (Chrome 156.0.8078.48, 2026-10-21):
- **Reading ink** over the film and the passage on both front doors, under a dark and a light device setting at three
  viewports: 1,358 element samples, none below 4.5:1, worst 4.9:1 (CY-SEM-003 PASS).
- **Settling:** both pages settle to no frame, timer or playing media in every profile once the scroll stops, and the
  worker caches this build and serves it offline (CY-TEMP-001 PASS).
- **Real input:** 16 landings on the passage's first words; the 12 evidence moments; 50 sweeps of everything a visitor
  can see, none covered; and the 12 presses on the systems' links, each opening its room.
- **The pass above:** 18 presses that stop the film; Space and PageDown, typed, stopping it in 8 of 8 cases at 400 % and on
  the desktop; the keyboard routes; reduced motion and refused autoplay in 8 of 8 cases; 30 page-zooms with nothing cut;
  the contact drafts.
- **All fifteen pages** at 1440 × 900 and 390 × 844: no sideways overflow, and no console error besides the 404's own
  status.

The live origin's check (CY-ORIGIN-001) follows the owner's publish.

The live origin: CY-ORIGIN-001 PASS (`#origin_closure_9BD0C72EFFCAE053`), 63 of 63 served paths matching the artifact.

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
| iPhone Safari | the vertical film plays inline (not full screen); in Low Power Mode, where autoplay is refused, the still composition and the whole statement stand at once, and past the principle each system's still stands for the passage; scrolling on from the statement moves the passage frame by frame through ADII, AWC-OS and CytherCAD and back to the film's world, with no jump where it takes over from the film; the close stands over its last frame |
| Android Chrome | as iPhone; the statement's links are reachable with the thumb |
| Keyboard only | Tab reaches *The three systems ↓*, the statement's links, Replay, each system's route in the passage (*See what this is based on →*, *See the demonstration →*, *Read the validation record →*: its words shown when it has focus), *Talk to us* and the footer; the focus ring is visible throughout |
| Mouse and touch | each link the page shows takes a click on the Mac and a tap on the phone: the statement's, each system's in the passage while its words are shown, the close's and the footer's (keyboard focus and a script's click pass under a covering layer; a pointer does not) |
| VoiceOver (macOS and iOS), in English and in Arabic | the statement is read as the page's heading; the principle and each system's description, headings and copy in order, then the close; the films and the passage are silent and hidden from it |
| A slow real network | a film that has not started within 6 s (`GUARD`), or falls 2 s behind real time (`STALL`), gives way to the still composition, and Replay plays it once it can |
| The route out of the film | from the passage, each system's link opens its evidence with its headline, its limit and its artifact in the first screen: *See what this is based on →* ADII's recorded run, with *Built by Group 05* and the team's names; *See the demonstration →* AWC-OS's film, with *Developed by Al-Baseera*; *Read the validation record →* CytherCAD's record, every figure as the record states it (Arabic: each route its Arabic room). Each room's *← Back to the passage* (and the header's *← The passage*) returns to that system's evidence moment, its link shown, the film not replayed; *Tell us what must never happen →* opens the contact page; with three answers filled, *Open email draft* opens your email app with a draft holding them: review it, send it, and confirm it arrives at contact@cytherai.com (once from the phone, once from the Mac, once in Arabic); where no email app opens, *Copy the message* and paste it into a new email from any account; the contact page's *← Back* returns where you came from, and the browser's Back returns to the passage without replaying the film |
| Link previews | paste a room's link (ADII's, AWC-OS's, CytherCAD's, the brief's) into iMessage or Slack: each shows its own card, its title ending *— CytherAI*, and the large image (a service that saw the link before may show the old card until it refetches) |
| 200% zoom (⌘+) | the statement, the captions, the passage's words and the close unclipped |
| 400% zoom (⌘+ to 400% in a 1280 px window) | every page reflows to one column with no sideways scroll; on the front door the passage's longer words scroll within themselves rather than lose their first lines (§5ad) |
| The mail arrives (`docs/operations.md`) | one realistic English and one realistic Arabic message, each with one long answer, through *Open email draft* on the phone and on the Mac, and once through *Copy the message* into webmail: each arrives at contact@cytherai.com whole, and a reply from there reaches the sender; the same for `nda@` and `security@` |

## 6. Launch gate

All six must hold before the origin is public. Items 3, 4 and 6 are owner
decisions, not engineering steps.

1. The owner's device checks (§5f) and the WebKit residual that still targets a shipped
   mechanism (W3, W4, W6, W7; W1, W2, W5 and W8 retired with what they observed) have been
   run in Safari and recorded. The Chrome pass closes everything else observable in a
   browser; what remains is genuinely engine-specific, not merely unobserved.
2. `./deploy.sh` succeeds and `find dist -type f` is exactly the allowlist;
   the §4 checks (`tools/probe-origin.py`) pass on the origin.
3. The origin sends the §1 headers (`curl -sI` verified), or, on GitHub Pages, exactly the
   limits accepted in §7 and nothing more: every page withholds the referrer, and HTTP
   redirects to HTTPS.
4. **Owner decision — the front-door claims.** Each states only what a shipped source
   states, with its condition beside it: ADII as a research project with no published
   results and no claimed deployment (`adii/`), AWC-OS as a demonstration on an evaluation
   machine (`awc-os/`), CytherCAD by its on-prem, air-gapped condition, with its record stated as its own runs record
   it (`cythercad/`, `pages/brief.html`; corrected 2026-10-21, §5ad: the front door prints no figure and nothing is
   compared with DeepCAD, whose figure, stated until then against an "external benchmark", was another test). The film's sentences
   are positioning beside the line *A conceptual visualization. It measures no product.*
   The owner confirms each source is current before launch. (The epoch-04 commitment left the front door with the drawing set;
   its record is §5c and `backup/drawing-set-v1/`.)
5. `./verify.sh` green at the release commit; the served homepage settles and stops (§5i)
   with zero external requests. (The trajectory engine's browser runner left this gate on
   2026-10-16 with the engine, retired to `backup/trajectory-engine/`: no page loads it.)
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

**Rollback.** `./publish.sh` keeps the artifact it replaces: before it force-pushes, it fetches the live `gh-pages`
and keeps it as the local branch `rollback/<the build it serves>` (from 2026-10-18; until then this section named
`rollback/9236E6A692F915D4`, the drawing set's build of 2026-09-17, two front doors before the film, and kept no newer artifact).
To restore the previous build: `git branch --list 'rollback/*'`, then
`git push --force origin rollback/<build>:gh-pages`, then `tools/probe-origin.py` against a build of that
commit. Re-running `./publish.sh` from an older release commit is refused: the history guard fails there, because
receipts admitted since are absent at that commit.

**A fresh clone.** The admission lineage is the local `master` (`CANONICAL_REF`), which tracks `origin/main`; a
fresh clone has `main` and no `master`, and `./verify.sh` fails until it exists: `git branch master origin/main`.
`./publish.sh` refuses any uncommitted change to a tracked file, so the `./verify.sh` it runs judges the
verifiers and the corpus of the commit it names.

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
