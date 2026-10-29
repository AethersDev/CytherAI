# Repository architecture

This guide describes the current tree, the runtime data flow, and the files that
must move together when the site changes. The repository is a zero-dependency
static site: source HTML, CSS, and JavaScript are served directly. There is no
framework, package graph, bundle, or server application.

The homepage is **the film** (since 2026-10-12): a twelve-second film, rendered offline and
silent, with its sentences as HTML over it; then **the passage** (since 2026-10-20), which the
scroll moves through: the film's final composition opens into ADII's scene, then AWC-OS's and
CytherCAD's, each with its words at its moments and one route into its evidence, and returns to
the film's world; then the invitation, over its last frame. Its predecessors are retired
whole, each a verbatim snapshot with every verifier that established its laws and its own
`verify.sh`: **THE UNHAPPENED** to `backup/unhappened-v1/` (commit `011ffd0`; this guide as
it stood for it is `git show 011ffd0:docs/architecture.md`), **the drawing set** to
`backup/drawing-set-v1/` (commit `c921f00`) and **instrument-v1** to `backup/instrument-v1/`
(commit `9d6cbdb`). Each is superseded as presentation and preserved as historical record;
nothing of their design is carried into the front door.

## System map

```mermaid
flowchart TD
  I["index.html — the film's sentences, the passage's words (the principle, the three systems), the close"] --> CSS2["css/film.css"]
  I --> F["js/film.js — the film, its cues, the passage, its stills, the worker"]
  F --> MED["film/ — two films, the passage, their posters and stills"]
  F --> SW["sw.js registration"]
  RF["tools/render-film.py · tools/render-passage.py (Blender, offline)"] -.-> MED

  RM["the rooms: adii/, awc-os/, cythercad/, their ar/ counterparts, the contact pages, pages/*.html, 404.html"] --> ROOM["css/room.css"]

  FN["flat/index.html, ar/flat.html — Both looked flat"] --> CSS2
  FN --> ECSS["css/flat.css"]
  FN --> EJS["js/flat.js — the sequence under the scroll, its words, its stills"]
  EJS --> EMED["flat/media/ — the sequence by orientation, its stills, the instrument's plates"]
  RE["tools/render-flat.py · tools/encode-flat.py (Blender and ffmpeg, offline; every fringe computed)"] -.-> EMED

  M["js/manifest.js — the record (no page loads it)"] --> B["js/instrument.js — the boundary engine (no page loads it)"]
  B --> TB["tools/test-boundary.js"]

  SRC["Tracked source"] --> SRI["generate-integrity.sh"]
  SRI --> ID["SRI attributes and build hash"]
  ID --> DEP["deploy.sh allowlist (deploy.paths)"]
  DEP --> DIST["dist/ public artifact"]
  DIST --> SW

  M --> PM["tools/project-manifest.py"] --> DM["data-m elements on the brief and CytherCAD's rooms"]
```

The front door loads one stylesheet and one deferred script, both with SRI; `js/film.js` reads no module and publishes
nothing. It is dark whatever the device's theme: light mode (`js/theme.js` and the header's switch) retired on
2026-10-20 to `backup/theme-switch-v1/`. No page loads the two record modules (THE EXCEPTION, the
last that did, retired on 2026-10-16 to `backup/exception-v1/`): the projector and the verifiers
run them under jsc, the manifest first. Their public surface is an inventory
(`tools/test-api.py`): every symbol is used by a tool, and a symbol with no caller fails.

| Module | Public API | Loaded by | Responsibility |
|---|---|---|---|
| `js/film.js` | — | `index.html`, `ar/index.html` | The film (source by orientation, cues, `still()`, `GUARD`), the passage (the scroll's moment through its stretches, seeks, its words' windows, the stills that stand in), `sw.js` registration and `take-over`; the films and the worker resolve against the site's root, so `ar/` shares them; DOM wiring behind `typeof document` |
| `js/flat.js` | — | `flat/index.html`, `ar/flat.html` | Both looked flat: the scroll's moment through its stretches, one seek at a time, its words' windows, a new viewport keeping the moment in the film and the reader's place past it, the sequence downloaded whole, the stills that stand in; the instrument (WebGL2): each pixel's ray traced through the glass to the steel, the stack's reflectance computed there (the renderer's constants and matrices, held to it under jsc), five plates blended at it, drawn only when pressed; DOM wiring behind `typeof document`, so it loads under jsc |
| `js/manifest.js` | `CytherManifest` | no page (jsc) | The public manifest: `project` (the `data-m` facts, for the projector), `MANIFEST`, `VALIDATION`, `CANON`, `ADMISSION_NONCE`, `CHECKSUM` for the verifiers and the derived assets (`tools/canon.py`) |
| `js/instrument.js` | `CytherInstrument` | no page (jsc) | The boundary engine: `biEngine`, `audit` and `judge`, for the verifiers. Pure, DOM-free; `tools/test-boundary.js` pins the seed-02 stream |

## Directory and ownership map

| Path | Role | Public artifact? | Change rule |
|---|---|---|---|
| `index.html` | The film's sentences, the passage's stretches and words (the principle, ADII, AWC-OS, CytherCAD, the return) and the close | Yes | Every HTML byte moves the build identity: re-stamp after any edit; it prints no projected figure since 2026-10-21 (`tools/test-projection.py`) |
| `ar/index.html`, `ar/contact.html`, `ar/adii.html`, `ar/awc-os.html`, `ar/cythercad.html` | The front door, the contact page and each system's evidence, in Arabic (AWC-OS with its Arabic film and text; ADII's run and CytherCAD's record in their original English) | Yes | Every HTML byte moves the build identity; the Arabic front door keeps the English one's cues, sections and figures (`tools/test-site.py`) |
| `fonts/` | IBM Plex Sans Arabic 300 and 400, with its licence | Yes | Shipped unmodified (the licence reserves the name "Plex"); precached |
| `css/film.css`, `js/film.js` | The front door's style and its script | Yes | Hashed (SRI); a change requires `./generate-integrity.sh` and re-stamping; reading ink over the film is a browser observation (CY-SEM-003) |
| `film/` | The two films with their final-frame posters, the passage in both orientations with its stills | Yes | Rendered by `tools/render-film.py` and `tools/render-passage.py` (from the film's own scene); every file the page names ships and every shipped file is named (`tools/test-site.py`) |
| `flat/`, `css/flat.css`, `js/flat.js` | Both looked flat (2026-10-25): its page, its sequence in both orientations, the stills that stand in for it and the instrument's plates; the Arabic page is `ar/flat.html` | Yes (the reviewed set) | Rendered by `tools/render-flat.py` (the scene is the script) and joined by `tools/encode-flat.py`, which reads the stills from `js/flat.js`; a new file under `flat/` ships once named in `REVIEWED_PUBLICATION`, and every media file the script names ships, and back (`tools/test-site.py`); the stylesheet and the script are hashed (SRI); `tools/probe-flat.py` is its browser check |
| `js/manifest.js`, `js/instrument.js` | The record and the boundary engine | No | Loaded by no page; the corpus binds their paths (`record_hash`, `kernel_hash`), so a change re-stamps |
| `css/room.css` | The rooms (2026-10-21): the front door's type, tokens, lockup and footer for the pages a visitor reaches from it | Yes | Hashed (SRI) and precached; its tokens must stay the front door's and its inks hold (`tools/test-site.py`, the rooms law) |
| `contact.html` | The contact room: three plain questions composed into one email draft for the visitor's own email app, the draft copied whole when no app opens, and a way back through the history, in the page's one inline script | Yes | Preserve the explicit `mailto:`/no-backend semantics unless hosting changes; never claim a message was sent; edit the script and its CSP hash follows |
| `pages/` | Brief and legal pages | Yes | Share navigation and CSS |
| `assets/` | Promoted deterministic images and icons | Selected files | Record provenance in `docs/asset-promotion-log.md`; add to `deploy.paths`; precache only if offline-critical |
| `tools/` | Generators, the film's Blender render scripts and zero-dependency test programs | No | Generators must reproduce committed bytes; tests must fail nonzero; a new harness file is added to `IDENTITY_COVERAGE` |
| `vaic/` | The VAIC-0 obligation corpus (`v3`, superseding `v2` and through it `v1` and `v0`, all kept as history), evaluator matrix, evidence ledger, release dispositions | No | Receipts append; admitted receipts are immutable across every lineage (`tools/test-vaic.py`) |
| `docs/` | Deployment contract and release record, asset provenance, architecture, the history rewrite | No | Evidence and operational instructions, never origin content |
| `backup/` | The record: the retired front doors whole with their verifiers, the design studies (`prototype/`, `newC3/`), the trajectory engine and its runner, the build plan of instrument-v1; indexed in `backup/README.md` | No | Historical record only; retire here, never delete, never deploy, never import from |
| `adii/` | ADII project page: the replay, its poster and fonts (shared with the homepage) | The reviewed set | Every URL its first publication served stays served but the team's CVs (withdrawn by the owner, 2026-10-30); a new file ships only once named in `REVIEWED_PUBLICATION` (`tools/test-site.py`) |
| `awc-os/` | AWC-OS's evidence as a room (2026-10-21; the evaluation gateway it replaced is `backup/before-rooms/awc-os/`), its films and their posters | The reviewed set | As `adii/`; `awc-os/live/` redirects to an ephemeral tunnel, is gitignored, and never ships; no deployment is claimed (the Alinma plan, cancelled 2026-10-19) |
| `cythercad/` | CytherCAD's evidence as a room (2026-10-21): its validation record, every figure a projection of `js/manifest.js` | The reviewed set | As `adii/`; the projector writes its figures and `tools/test-projection.py` holds it to print every validation identifier |
| `dist/` | Generated allowlisted release artifact | Generated | Rebuilt destructively by `deploy.sh`; never hand-edit |

## Homepage boot and steady state

`js/film.js` runs once the document is parsed.

1. It removes `no-js` (without the script, `.no-js` unveils the statement after 6 s, CSS). The
   statement is the `h1` and is exposed to assistive technology from the start, invisible but
   present; its links stay `visibility: hidden` until it appears. The film's text alternative is
   a `.sr` paragraph before it. The header's mark is the Cyther Seal, inline SVG, pixel-fitted at
   26 px (`tools/render-seal.py`); `tools/test-site.py` holds every inline seal to the computed one.
2. It picks the film and its poster by orientation (`film/film-landscape.mp4` or
   `film/film-portrait.mp4`) and plays it muted. Reduced motion skips straight to the still
   state with *Play the film* and downloads no film; a refused play, a media error, or no
   start within `GUARD` (6 s) does the same with *Replay*.
3. While the film plays, an 80 ms interval reads `currentTime` and shows each sentence in its
   window (`data-from`/`data-to`); the statement appears at 10.6 s. It also adds up how far
   the film has fallen behind real time since it started, while the page is visible (a hidden
   page's time does not count), so short pauses count together; past `STALL` (2 s) the film
   gives way to the still state at once: it drops its source, so the poster
   — its final frame — stands, and a late download cannot restart it; its caption leaves
   without a fade, so it never lies under the statement.
4. At the end (`ended`) `still()` stops the interval, holds the last frame, shows the whole
   statement and Replay. The film never restarts on its own.
5. Once the film is whole (or still), the passage downloads whole by a request of its own (`fetch`;
   the front doors' CSP admits `connect-src 'self'` for it), the video plays it from memory (`blob:`,
   asked to play and paused at once, as iOS shows a clip's frames only then), and it is shown once
   whole and the film still, under the film's element: its first frame is the film's last. (Asked
   of the video element, a paused clip's download is the browser's to defer: 2026-10-22,
   `tools/probe-passage.py`.) From then on the scroll names a moment, evenly (each stretch,
   `.passage`, is as tall as its seconds, `data-t`: 2 s a viewport, the stage's own pace), and the
   passage seeks to it, one seek at a time; each of its words (`.say`) fades in and out with the
   scroll in its window of those seconds. Past its end it holds its last frame, under the
   close. Until it is whole, under reduced motion or after a failed download, the film's
   element stands on the final frame, and past it on the still of each system's moment and of
   the return (`film/passage-*.jpg`, `STILLS`: each changes between two systems' words).
   Scrolling on past the film ends it; a page that opens past it (an anchor, a restored
   scroll) never plays it. A new viewport (a phone turned, a window resized) keeps the
   visitor's moment, not their offset: the page re-measures its stretches and scrolls to the
   moment the scroll last named.
6. Once the film is still, the service worker registers from the root and is asked to take
   over; its cache name carries the build hash. Its install fetches the precache past the HTTP
   cache (1.3 MB, the passage's stills among it), which on a first visit would take the link from the film as it starts.

At steady state nothing runs: no frame is requested (the page asks for one only while it
scrolls, to seek the passage), no media plays and no timer fires (CY-TEMP-001, `docs/deploy.md`
§5i). Replay, a scroll, or a turn of the device (the sources follow the orientation while
still) starts motion again.

## State and evidence boundaries

- Canonical facts come from `CytherManifest`: the validation figures of the brief and CytherCAD's rooms are
  projections, written into the pages by the projector; the record states what its run's own files show (corrected
  2026-10-21, `docs/deploy.md` §5ad), and the front doors print no figure.
- The film and the passage are pre-rendered illustrations. The page says so under the
  film (*A conceptual visualization. It measures no product.*); no motion on the front door
  claims to correspond to a system event, and nothing on it is computed in the browser.
- Each system's sentences are ones its shipped page states, with its condition beside them
  and a route to the evidence; the film's sentences are positioning.
- The page discloses no obligation, receipt or verdict; the VAIC corpus under `vaic/` is the
  record, and a receipt for a build cannot be inside that build.

## Routes

| Route | Runtime |
|---|---|
| `/` or `/index.html` | The film: `css/film.css` and `js/film.js`, both SRI'd; media from `film/` |
| `/ar/` | The film in Arabic: the same stylesheet, script and media |
| `/ar/contact.html` | The contact room in Arabic: `css/room.css` plus its one inline script, in Arabic |
| `/contact.html` | The contact room: `css/room.css` plus one inline script that composes the draft, copies it and goes back |
| `/adii/`, `/ar/adii.html` | ADII's evidence as a room, and its Arabic introduction: `css/room.css`, no script; their way back is `#adii-evidence` on the front door, the words that lead to them |
| `/awc-os/`, `/ar/awc-os.html` | AWC-OS's evidence as a room, in English and in Arabic, each with its own film: `css/room.css`, no script; their way back is `#awc-os-evidence` |
| `/cythercad/`, `/ar/cythercad.html` | CytherCAD's validation record as a room, and its Arabic introduction: `css/room.css`, no script, projected figures; their way back is `#cythercad-evidence` |
| `/pages/brief.html` | The capability brief as a room: CytherCAD's and SijilOS's records and qualified access (CytherCAD's record is also its own room) |
| `/pages/privacy.html` | The privacy policy as a room, its text as written |
| `/pages/security.html` | The security and disclosure policy as a room, its text as written |
| `/pages/terms.html` | The terms of service as a room, its text as written |
| `/404.html` | Host-configured error body, a room in English and Arabic with absolute URLs (served at any depth); the host must still return status 404 |
| `/robots.txt`, `/sitemap.xml` | For crawlers: every crawler admitted, and the pages meant to be found, by their canonical URLs (not the 404, nor AWC-OS's `noindex` rooms) |

## Integrity, deployment, and offline behavior

The release flow is fail-closed:

1. Edit source. After a manifest edit run `python3 tools/project-manifest.py`.
2. For any change to a served file (anything in `deploy.paths`), run
   `./generate-integrity.sh` (SRI over the requested resources, each URL versioned by its bytes,
   `?v=` the first 12 hex of their SHA-256, in the pages and the worker's precache; the 16-hex build identity
   over every `deploy.paths` byte, stamped into every HTML file and the worker cache
   name), then `python3 tools/vaic_restamp.py` once per transaction.
3. Run `./verify.sh`.
4. `./deploy.sh` deletes and rebuilds `dist/` from `deploy.paths`; it rejects a precached
   asset missing from the artifact and rejects the historical directories.
5. Observe the build in a browser: `.venv/bin/python tools/probe-ink.py dist <dir>` (CY-SEM-003) and
   `.venv/bin/python tools/probe-settle.py dist <dir>` (CY-TEMP-001), and append their receipts.
6. `./publish.sh` pushes the contents of `dist/` as the single-commit `gh-pages` branch
   GitHub Pages serves at `cytherai.com` (`CNAME`, `.nojekyll` are in the artifact), keeping the
   artifact it replaces as the local branch `rollback/<its build>`. It refuses any uncommitted
   change, a HEAD not on `master`, and a failing `./verify.sh`. Then `python3 tools/probe-origin.py
   dist <out.json>` observes the live origin (CY-ORIGIN-001). The origin contract and Pages'
   recorded limits are `docs/deploy.md` §1–§4, §7.

The service worker precaches the pages, the front door's script and stylesheet, the two
final-frame posters it stands on when the film cannot play (offline included), and the three
`adii/fonts/` files it draws its type with; films go to the network, never the cache. It
installs one build or
nothing (every fetch past the HTTP cache, the build stamp checked before commit), maps a
navigation to a directory it precached (`/`, `/ar/`) to its cached `index.html`, leaves every
page it did not precache (`adii/`, `awc-os/`) to the network, caches what else it fetches
past the HTTP cache too, and removes older caches on activate.
A new build's worker waits: it never takes over a page that may still be loading. Safari
checks for the update at the navigation itself, so a worker that skipped waiting answered a
returning reader's previous-build page, mid-load, with this build's modules, and the page
died of its own SRI check; Safari's script requests carry no integrity a worker could read,
and the page is not reliably among the worker's clients when it activates, so no rule inside
the worker can tell such a page apart. Instead the page decides: once its own script has
run and its film is still, `js/film.js` sends `take-over` to a waiting worker, and the next load is the
new build. A page from before this rule never asks; its tab moves to the new build once no
page of the old build is open. Reproduced, and the fix verified with a negative control, in
the iOS 26.5 simulator (`docs/deploy.md` §5g).

## Verification map

```sh
./verify.sh
```

Module parsing, the public API inventory, the boundary stream, the projection laws,
page/resource integration (everything a page or stylesheet fetches is a shipped file of this
origin, every link that stays on the site lands on one, every film the front door names ships,
and back), each page's least-privilege CSP, the retired register kept out of served files, the
privacy policy naming exactly what the site stores, SRI/build/cache identity, deployment
closure, the rooms law, the footers and the link previews, the derived-asset receipts (the film's included), and the VAIC-0
corpus (structure, retired-evidence resolution, every lineage, frozen obligation definitions,
fail-closed controls, a regression recordable as a FAIL). The retired front doors: `backup/unhappened-v1/verify.sh`,
`backup/drawing-set-v1/verify.sh`, `backup/instrument-v1/verify.sh`.

Browser-only validation remains required for: the film as rendered at desktop and phone
widths, each sentence in its window and the still state; reading ink over the film and its
local darkening at glyph support (CY-SEM-003; seeking a film needs a server that answers byte
ranges); the settled state (no frame, media or timer once settled); reduced motion and a
refused play; zero external requests; service-worker install/update/offline; Safari/WebKit
muted inline autoplay and VoiceOver.

## Change-impact recipes

- Add or remove a front-door script or stylesheet: `index.html`, `generate-integrity.sh`
  (RESOURCES), `deploy.paths`, `sw.js`, `tools/test-site.py` (the script list), `IDENTITY_COVERAGE`
  (`grammar_hash`), and this guide. Each page's `script-src` is exactly what it runs: `'self'` for its own
  scripts, a `sha256-` source per inline script (the contact pages' form script: edit it, and the hash
  `tools/test-site.py` computes must be the one in the page's CSP), `'none'` for none.
- Change the front door's words: change `index.html` and `ar/index.html` together. A cue, a section, a window or a
  figure in one and not the other fails `tools/test-site.py`; a figure is the projector's (`data-m`) on both. Re-render
  both cards (`python3 tools/render-og-film.py`, `… ar`) if the statement moves, and record both digests.
- Add a token: give it a value in `:root` in `css/film.css`; the ink law reads it. The front door has one theme.
- Re-render a film: `blender -b --factory-startup --python-exit-code 1 -P tools/render-film.py -- <l|p> anim <dir> …`
  (usage in the script's header; the published films used 64
  samples with `TL=24`/`TL=14` landscape/portrait), encode with
  `ffmpeg -framerate 24 -i <dir>/f%04d.png -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p
  -movflags +faststart <out>.mp4` (the master) and the last frame as its poster. The films are
  delivered lighter than their masters, because Safari starts a film only once it expects to play
  through: `ffmpeg -i <master> [-vf scale=1440:810:flags=lanczos] -c:v libx264 -preset veryslow
  -tune film -crf 29 -pix_fmt yuv420p -movflags +faststart -an film/film-<orientation>.mp4`
  (landscape scaled to 1440×810, about 2.7 Mbit/s; portrait at 810×1440, about 2.3 Mbit/s). The
  render frames of the published films were not kept; their CRF 23 masters are
  `git show e40fa72:film/film-<orientation>.mp4`. Replace the files under
  `film/`, regenerate integrity, and observe reading ink again: the ground under every caption
  has changed.
- Re-render the passage: it is rendered from the film's own scene, so its first frame stays the film's last. Build the
  scene, `blender -b --factory-startup --python-exit-code 1 -P tools/render-film.py -- <l|p> blend <dir> 1920x1080`
  (`1080x1920` portrait) `64`, then `TL=24` (`TL=14` portrait) `blender -b --factory-startup <dir>/film-<l|p>.blend
  --python-exit-code 1 -P tools/render-passage.py -- <l|p> anim <dir> 1920x1080 64` (`FROM=12` renders only what follows
  ADII's twelve seconds, which the script never changes), and encode its frames (f0288–f0887)
  with a keyframe every six (a scrubbed video seeks; each seek decodes from the keyframe before it):
  `ffmpeg -framerate 24 -start_number 288 -i <dir>/f%04d.png -vf scale=1440:810:flags=lanczos` (`810:1440`)
  `-c:v libx264 -preset veryslow -tune film -crf 29 -g 6 -keyint_min 6 -sc_threshold 0 -pix_fmt yuv420p -movflags
  +faststart -an film/passage-<orientation>.mp4`; its stills, `film/passage-<moment>-<orientation>.jpg`, are the frames
  at 8.0 s (adii, f0480), 15.42 s (awcos, f0658), 20.58 s (cad, f0782) and its last (close, f0887), named in `STILLS`
  (`js/film.js`) with the second each stands until.
  The pages' `data-t` name the passage's seconds (a stretch's first and last, a caption's window): move a moment in the
  script and move them with it, on both pages, keeping each stretch as tall as its seconds (50svh a second).
- Change the mark: never by hand. `python3 tools/render-seal.py` writes the icons;
  `python3 tools/render-seal.py svg SIZE INK GROUND` prints the inline seal for a page; record
  the digests in `docs/asset-promotion-log.md` (IMG-009) and re-render the social card.
- Make a page a room: link `css/room.css` (with an `integrity` attribute for `generate-integrity.sh` to fill), open with
  the front door's header (the computed seal lockup going home, the way back, the language link) and end with its
  footer; add it to `ROOMS` in `tools/test-site.py`, and an Arabic counterpart to the language-pair and `lang`/`dir`
  laws. Keep what the page carries (an artifact, its limits, whose work it is) verbatim, and retire the version it
  replaces to `backup/`. Its way back: an evidence room returns to the passage's words that lead to it (give that `.say`
  an id on both front doors, link it as `../#<id>`, and add the room to
  `test_each_evidence_room_returns_to_the_words_that_led_to_it`); a room with many ways in returns through the history
  (`navigation.canGoBack`), with a link for a visitor who arrived from elsewhere.
- Add a public page: navigation links/current-page state, build-hash meta, CSP, local
  icon/manifest references, its preview and canonical URL, `deploy.paths` (which is also the list
  `generate-integrity.sh` stamps and every per-page law in `tools/test-site.py` reads), `sitemap.xml` unless it asks
  not to be indexed (the sitemap law fails either way it drifts), and decide whether it belongs in `sw.js`.
- Add a claim to the front door: only as a shipped source states it, with its condition
  beside it and a link to the source, and only as the source's own run records it; a figure is a `data-m`
  projection (P3 in `tools/test-projection.py` names what each front door prints). An unsupported claim is dropped.
- Change manifest facts: review every `PROVISIONAL` marker, run the projector, regenerate
  integrity, and treat a genuine commitment as an owner-custody decision.
- Change an obligation: a new corpus version that supersedes the live one and carries every
  receipt verbatim (CARRIED_FORWARD or SUPERSEDED per row); re-stamp; never edit an
  admitted receipt.
- Retire a served file: move it whole into the declared snapshot, add it to `RETIRED`,
  remove it from `deploy.paths`; the receipts that cite it keep resolving.
