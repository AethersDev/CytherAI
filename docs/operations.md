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
   pages it lists are indexed. AWC-OS's rooms stay `noindex` until you confirm the team's and the hackathon's permissions and item 10 is done (the owner, 2026-11-06): then it is a two-line change and the sitemap, and the Alinma references on those pages become searchable. `noindex` is no security boundary. Its field data (Core Web Vitals) appears
   there once enough visitors have come; until then there is none, and none is claimed.
9. **A booking link, as a second way to reach you** (the owner, 2026-11-06: keep the email composer, build no form backend, add
   *Schedule a technical discussion* as a secondary action). It needs the link and the provider's name: the visitor's details
   reach that provider once they follow it, so both privacy policies must name it (`tools/test-site.py` holds the two to the
   same providers).
10. **The public repositories, which the site now sends readers to** (the re-check of 2026-11-06, `docs/deploy.md` §5ai).
    `cytheraii/aws-os_mvp`, which this account can read and not write: its README still calls
    `cytherai.com/awc-os/` a *live instance* while the site says the MVP runs on an evaluation machine, lists an
    `OPERATIONS.md` it does not contain, and the repository has no description (`docs/deploy.md` §5ag gives the exact change).
    Do this before item 8's indexing, which sends readers to it. `cytheraii/barker-quotient`: its GitHub description still
    carries the superseded title and *first minimal k=6 covering set*, which its own README withdraws. `AethersDev/menumind`:
    no licence file, and its README answers a brief (2.3, 2.4) a reader will not know. `AethersDev/adii_team`: it names
    neither CytherAI nor Group 05, and the bootcamp the site names is your statement, not the repository's.
11. **Cloudflare: approved in principle (the owner, 2026-11-06), not cleared to switch on.** Keep the records DNS only until
    both of these are settled. Read 2026-11-06; observe again before relying on them.
    - *The certificate.* Pages issues and renews its own Let's Encrypt certificate; the current one expires **2026-12-14**.
      GitHub's documentation says nothing about proxies. Two community reports of September and October 2026 describe this
      exact setup ([#208641](https://github.com/orgs/community/discussions/208641), [#210196](https://github.com/orgs/community/discussions/210196)):
      renewal stuck in `bad_authz`, HTTP 526 for every visitor under Full (strict), no answer from GitHub staff, and in one
      still stuck about 13 hours after returning to DNS only. They are users' reports, not GitHub's statement. Cloudflare's
      Free plan cannot override the host, SNI or DNS to route around it (Origin Rules). Full, not strict, keeps a site up on an
      expired certificate and stops authenticating the origin.
    - *Video.* Cloudflare's CDN terms (last updated 2026-09-28): unless you are an Enterprise customer, specific Paid Services
      are what "you must use in order to serve video and other large files via the CDN", and it may "disable or limit" the CDN
      if it suspects otherwise. Video is 90% of this site's served bytes (30.7 of 34.1 MB).
    - *The next step that risks nothing:* put `dist/` on a Cloudflare Workers or Pages preview, with no DNS change, and test it
      (`curl -r 100-199`, the iOS Simulator). Those have no origin certificate, take headers from a `_headers` file in the
      repository, and the terms say the Developer Platform "can be used to host content" and name it as how to serve video. Open
      questions: an open Workers SDK report says static assets answer no byte ranges, which iOS needs for the film, and
      the terms do not say whether the free tier counts.
    - *Whichever way it goes:* the free plan moves the nameservers from Namecheap, so Proton's MX, SPF, DKIM and DMARC records
      must be copied first, and any verification TXT records (Cloudflare's scan "is not guaranteed to find all"). Use Zone
      Analytics, from edge logs with no script ("at least the last 30 days"; it counts crawlers and threats too), and set Web
      Analytics to Disable: its automatic setup is "enabled by default" and injects a script. Turn off Email Address Obfuscation
      (on by default; it rewrites addresses and injects a script) and do not use Bot Fight Mode (its JavaScript detections insert
      a script and cannot be disabled). The headers are §1's (`docs/deploy.md`), with HSTS's max-age raised in steps.
      `tools/probe-origin.py` fails on any byte a proxy changes. Before the switch, both privacy policies must drop *no analytics*
      and name Cloudflare, which processes visitors' network metadata at its edge: one release, ahead of the switch.
12. **Legal review of the privacy policy and terms, in both languages.** `ar/privacy.html`, `ar/terms.html` and the terms' new
    section 4 were drafted on 2026-11-06 and no lawyer has read them. Have a Saudi lawyer review them and decide whether a clause
    should say which language governs (none does). **Neither language yet holds what SDAIA's own documents ask of a notice**
    (read 2026-11-06: Article 4 of the PDPL's Implementing Regulation; *Elaboration and Developing Privacy Policy Guideline*,
    v1.0, August 2024). The policy does not give: the controller's legal name, phone number and postal address; the legal basis
    for processing; whether giving the data is mandatory or optional; how to withdraw consent; who receives the data and where
    it is stored, inside or outside the Kingdom (mail is at Proton, and *we do not share* sits beside the host's logs); how it is
    destroyed; the rights to a copy, to withdraw, to complain to SDAIA and to compensation; a complaints mechanism. Several of these
    are facts only you hold, and none is filled in here. On language, the guideline says a policy "shall be designed in a language
    suitable for the target audience"; Article 4(7)'s "appropriate language" concerns a data subject who lacks legal capacity;
    neither says Arabic is mandatory. The terms' section 5 also cites "model accuracy, parameter counts", which this site no
    longer prints. Nothing on this site claims compliance with the PDPL.
13. **What the About page leaves out, by your direction** (2026-11-06): a photo, the company's stage and registration, and a
    careers section. An investor or candidate will ask for them, and only you can give them. The legal name also fills the
    first gap in item 12.
14. **The film's order.** It shows ADII, AWC-OS, then CytherCAD, while the brief leads with CytherCAD. The page says which is
    which in words (each system's status); changing the order means rendering the passage again.
15. **Both looked flat under your own finger** (`docs/deploy.md` §5ai). Nothing here has swiped it on WebKit or a real phone: try
    the glass, and a scroll past it, upright and on its side. A swipe that starts on the glass lifts it by design, and one beside it
    scrolls. If that catches people in practice, the alternatives are in §5ai; each costs new words on the page.

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

  Right after a publish, Pages can take several minutes to switch every file. A check that finds some files still at
  the previous build is early, not a defect: wait and run it again. On 2026-10-21 the first check of `9BD0C72EFFCAE053`
  found 11 of 63 files still the previous build's (the two new files answered with the old 404); minutes later all 63
  matched.
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
