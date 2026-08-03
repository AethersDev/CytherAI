# Deployment contract

## Certification status

| | |
|---|---|
| **Repository status** | ✓ Production-hardened |
| **Execution status** | ✓ Verified in Chromium (Chrome 150, against the `dist/` artifact) |
| **Outstanding browser certification** | 2 WebKit-critical (W1–W2) · 6 WebKit-platform observations (W3–W8) |
| **Outstanding deployment certification** | Origin headers · HSTS · MIME · 404 behaviour |
| **Outstanding owner certification** | Epoch-04 commitment · Manifest sign-off · Accent-state accessibility decision |
| **Overall** | **Release candidate pending certification** |

The remaining work is certification, not construction. Class A items can
invalidate a public technical claim; Class B affect experience but not the
truthfulness of the site; Class C cannot be resolved inside the repository.

Not shipped. This file states what the repository cannot express: the response
headers the origin must send, the MIME types it must serve, and the gate that
must hold before the site is public.

**Artifact:** `./deploy.sh` → `dist/`. Publish the *contents* of `dist/` as the
origin root. `dist/` is gitignored and rebuilt from scratch on every run.
Never publish the working tree: `backup/`, `newC3/`, `trajectory-engine/`,
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
`Cache-Control: no-cache`; everything else may be cached (the cache name and
the SRI hashes both carry the build hash, so a build is atomic).

## 3. Redirects and error pages

- Serve `index.html` for `/`.
- No SPA-style catch-all rewrite. A wrong path must 404, not silently render the
  homepage — the site's claims are per-page and a rewritten URL would state
  something the reader did not request.
- A styled `404.html` does not exist yet (audit ADV-003, plan Phase 13; blocked
  on the domain decision). Until it does, the host default is acceptable.

## 4. Verification against a live origin

```
curl -sI https://HOST/ | grep -iE 'frame-ancestors|strict-transport|nosniff|referrer|permissions'
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/newC3/epoch04-preimage.txt   # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/backup/graphite-v2/index.html # expect 404
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/PRODUCTION_PLAN.md            # expect 404
curl -sI https://HOST/manifest.webmanifest | grep -i content-type                   # manifest+json
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

### OWNER DECISION REQUIRED

| # | Item |
|---|---|
| O1 | **Accent-state accessibility decision — see the measured options below.** |
| O2 | The epoch-04 commitment — see gate item 4 below |
| O3 | The `PROVISIONAL` manifest values |
| O4 | At 390px the `.optics` control transiently covers a zone label as content scrolls behind it. Same bottom chrome band the spec docks the reader ledger into, and it clears on scroll — recorded, not changed |

#### O1 in detail — measured, with options

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

Half 1 is a contained change. Half 2 is a register decision about whether the
accent is ever a text colour. Owner call; nothing has been changed.

### ORIGIN DEPLOYMENT REQUIRED

| # | Item |
|---|---|
| D1 | The §1 response headers, `curl -sI` verified on the live origin |
| D2 | HSTS on the final domain only |
| D3 | MIME types per §2 |
| D4 | 404 behaviour per §3 |

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
5. Standard battery green at the release commit; claims `10/10 HOLDING` in a
   served browser check.
6. The `PROVISIONAL` values in `js/manifest.js` (epoch history, counts,
   commitment preimage) reviewed by the owner. Shipping them knowingly is
   permitted — they are marked in source — but it must be a decision.
