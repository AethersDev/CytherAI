# Deployment contract

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

## 5. Safari matrix — the outstanding certification

Everything in the audit plan has been implemented and verified by executed
harnesses under JavaScriptCore. **No item below has been observed in a browser**,
because the build machine has none. This is the gate between "implementation
complete" and "certified". Run it on the staging origin, in Safari, and record
the result; several items exist specifically because a phase changed behaviour
that only rendering can confirm.

| # | Check | Why it is here |
|---|---|---|
| 1 | `pages/runner.html` shows `✓ 33 / 33 passed · exitCode 0` | P2 made all four scripts `type="module"`. Confirms Safari's module loading, SRI fetch on module scripts, and that inline modules are admitted under `script-src 'self' 'unsafe-inline'`. |
| 2 | Console is clean on all 7 pages | P4 tightened subpage CSP to `script-src 'none'` + `object-src`/`base-uri`. Any violation here is real. |
| 3 | Contact form submit opens the mail client | P4 deliberately did **not** add `form-action`. If the submit works, try adding `form-action 'self' mailto:;` and re-test; if it then fails, leave it off and keep the comment in `contact.html`. |
| 4 | Offline: load once online, quit, go offline, navigate to `/` | P6's fix. Must render the homepage, not the network-error page. Also navigate to an uncached path — must fail cleanly. |
| 5 | Storage shows exactly one cache, named for the current build hash | P6/P9. Confirms `activate` deletes prior generations and the new worker claims clients. |
| 6 | VoiceOver rotor: headings read surface → definition · architecture (2) · measurement · controlled · clearance (3) · floor | P7 changed three `h4`→`h3` and made two `.zone-label` divs into `h2`. |
| 7 | Tab from the address bar reveals the skip link on all 6 content pages | P7. |
| 8 | Hero, clearance cards and floor are visually unchanged | P7 pinned `.path h3` bottom margin and `.zone-label` weight/margin to keep the element swaps neutral. Any shift means a selector was missed. |
| 9 | Full descent: the reading hierarchy still reads as layered, and the ink flip at ~33% scroll looks deliberate | **P8 is the largest visual change in this series.** It moved the switch from 48% to 33% scroll and raised 33 declarations to a 66% ink floor. If the flip now feels early, that is the trade this bought — say so rather than reverting silently. |
| 10 | Claims panel reads `CLAIMS 10/10 HOLDING` | P8 added CL-06c. |
| 11 | Network tab is empty after load | CL-01, standing. |
| 12 | Fork + return to canonical; capture link reproduces the mark | PRODUCTION_PLAN §9. |
| 13 | Hold-to-cross in all three input modes (pointer hold, Enter/Space, AT double-activation) | PRODUCTION_PLAN §9. |
| 14 | Proposer + 10k audit; reduced-motion pass; 390px pass | PRODUCTION_PLAN §9. Mobile is untested at any width. |

## 6. Launch gate

All six must hold before the origin is public. Items 3, 4 and 6 are owner
decisions, not engineering steps.

1. The §5 Safari matrix has been run and recorded. Nothing below substitutes
   for it: every phase was verified by harness, none by a browser.
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
