# Operations — cytherai.com

The site is static: no server of its own, no database, no form backend. What can break it lies outside the repository —
the host, the domain, the mailboxes, and the accounts that control them. This page names each part, what was observed of
it, how to tell when the site is broken, how to restore it, and what only the owner can settle. The build, release and
verification record is `docs/deploy.md`; this is the handover for whoever runs the site day to day.

Observed 2026-10-21 from the owner's Mac (`dig`, `whois`, `openssl s_client`, `curl`); observe again before relying on it.

## The moving parts

| Part | Where | Observed 2026-10-21 |
|---|---|---|
| Hosting | GitHub Pages: repository `AethersDev/CytherAI`, branch `gh-pages`, written only by `./publish.sh` | `cytherai.com` resolves to GitHub Pages' four addresses (185.199.108.153 to .111.153); no IPv6 (AAAA) records |
| `www` | CNAME `aethersdev.github.io`; Pages redirects it to `https://cytherai.com/` | `docs/deploy.md` §7 |
| HTTPS | Let's Encrypt, issued and renewed by Pages; *Enforce HTTPS* on (2026-10-05) | certificate valid 2026-09-15 to 2026-12-14, for `cytherai.com` and `www.cytherai.com` |
| Domain | Registered at Namecheap; DNS at Namecheap (`dns1/dns2.registrar-servers.com`) | created 2025-08-28, **expires 2027-08-28**; transfer lock on (`clientTransferProhibited`); whether auto-renew is on cannot be seen from outside |
| Mail | Proton Mail: MX `mail.protonmail.ch` (10) and `mailsec.protonmail.ch` (20); SPF `include:_spf.protonmail.ch ~all`; DKIM through Proton; DMARC `p=quarantine` | the site names three addresses: `contact@` (every page), `nda@` (the brief and CytherCAD's room), `security@` (the security policy) |
| GitHub domain verification | a TXT record `_github-pages-challenge-AethersDev.cytherai.com`, added from GitHub → Settings → Pages | **not found**: the domain is not verified for the account. Verification is GitHub's protection against another account taking over the custom domain |

## What only the owner can settle

No repository change settles these. Until each is done, the handover is complete only at the limits stated here.

1. **Name the operator**: the person who gets the alerts, reads the three mailboxes, and holds the accounts below.
2. **The three mailboxes**: confirm in Proton that `contact@`, `nda@` and `security@` each exist (as an address or an
   alias) and reach someone, and say how often each is read. `pages/security.html` promises an acknowledgement within
   48 hours; only a mailbox someone reads keeps that promise.
3. **The delivery test** (`docs/deploy.md` §5f): send and receive one realistic English and one realistic Arabic message
   through *Open email draft*, each with one long answer, from the phone and from the Mac; once through *Copy the message*
   into webmail. Confirm that each arrives whole and that a reply reaches the sender. The page's part is verified
   (§5ad): the draft and the copied text are exactly what was typed. A realistic Arabic message makes a draft link of
   about 3,800 characters, a long one about 9,800, so test the clients visitors use. The copy route has no length limit.
4. **Verify the domain on GitHub**: Settings → Pages → *Add a domain* → `cytherai.com`, then add the TXT record GitHub
   gives at Namecheap, and keep it there.
5. **Renewal**: turn on auto-renew at Namecheap with a payment method that will still work in August 2027. The domain's
   expiry would take down the site and all three mailboxes at once.
6. **Account recovery**: two-factor authentication on GitHub, Namecheap and Proton, with each one's recovery codes stored
   offline. Note where each is kept, not the codes themselves. GitHub is reached over SSH as the host alias `github-work`
   (`git remote -v`).
7. **Monitoring with alerts**: choose a monitor and point its alerts at the operator (below).
8. **Search Console**: verify `https://cytherai.com/` (a DNS TXT record at Namecheap), submit `sitemap.xml`, and confirm the
   pages it lists are indexed. Decide whether AWC-OS's rooms stay `noindex`. Its field data (Core Web Vitals) appears
   there once enough visitors have come; until then there is none, and none is claimed.

## How to tell the site is broken

- **Every few minutes (availability)**: a hosted uptime monitor that fetches pages and matches their words, not only a
  200 status. Suggested checks:
  - `https://cytherai.com/` contains *Keep control of what changes.*
  - `https://cytherai.com/ar/` contains *واحتفظ بزمام ما يتغيّر.*
  - `https://cytherai.com/adii/` contains *Built by Group 05*
  - `https://cytherai.com/cythercad/` contains *own test of April 2026*
  - `https://cytherai.com/contact.html` contains `contact@cytherai.com`
  - `https://cytherai.com/no-such-page` answers 404

  Alerts go by email and text to the operator. This is the only part that runs somewhere other than the owner's machines.
- **After every publish, and weekly (integrity)**: the origin check against the released commit. Every served file must
  be byte-identical to the release, every page must answer over HTTPS, HTTP must redirect, the hidden paths must 404,
  and TLS and the worker must match:

  ```sh
  git worktree add /tmp/cytherai-release production
  cd /tmp/cytherai-release && ./deploy.sh && python3 tools/probe-origin.py dist /tmp/origin.json   # exit 0: PASS
  cd - && git worktree remove /tmp/cytherai-release
  ```

  A takeover, a stale or partial deploy, a lost HTTPS setting or an expired certificate all fail it. It checks bytes,
  not behaviour. The behaviour of those bytes, including links that take a click and words readable over the film, was
  verified in the browser before release (`docs/deploy.md`). A new browser version is the one thing it cannot see, so
  run the owner's device checks (§5f) again after a major browser release.

## How to restore it

`./publish.sh` keeps the artifact it replaces as the local branch `rollback/<build>`. To serve the previous build again:

```sh
git branch --list 'rollback/*'
git push --force origin rollback/<build>:gh-pages
```

Then run the origin check above against that build's commit. **Rehearsed 2026-10-21, outside production**:
`rollback/16109F1BC4218636`, the newest kept artifact, was restored from its branch into a local origin (`git archive`).
Both front doors played and settled in every profile, and its worker installed that build's cache and served an offline
reload (`tools/probe-settle.py`: PASS). The force-push itself was not rehearsed, since the owner runs every push. If
GitHub Pages itself is down, nothing in the repository restores it. The artifact is static (`dist/`, `deploy.paths`), so
any static host can serve it; the decision to move is the owner's (`docs/deploy.md` §7).
