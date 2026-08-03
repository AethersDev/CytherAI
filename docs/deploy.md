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

## 5. Launch gate

All six must hold before the origin is public. Items 3, 4 and 6 are owner
decisions, not engineering steps.

1. `pages/runner.html` shows `✓ 33 / 33 passed · exitCode 0` in Safari.
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
5. Standard battery green at the release commit; claims `9/9 HOLDING` in a
   served browser check.
6. The `PROVISIONAL` values in `js/manifest.js` (epoch history, counts,
   commitment preimage) reviewed by the owner. Shipping them knowingly is
   permitted — they are marked in source — but it must be a decision.
