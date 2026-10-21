# Production asset promotion log

One entry per asset promoted into the deployment artifact. Studies never ship;
every shipped asset is **DERIVED** (deterministically produced from
canonical repository state), **COMPUTED** (deterministically produced from a
fixed input the receipt names, not from repository state) or **ILLUSTRATIVE**
(claim-free imagery whose status is stated in adjacent HTML). Every entry records the reproduction
command and the output digest; a promoted asset with no receipt is a defect.
`tools/test-assets.py` (a `./verify.sh` stage) re-reads these receipts: every output's
bytes must match its digest and size, every live DERIVED entry's state checksum and
canonical parameters must equal the current manifest's, and every served file under
`assets/` and `film/`, the icon, and every icon and card the web manifest and the pages
name must have an entry.

An entry is the record of a promotion. Those of retired assets (OG-CARD-V1, ICON-V1,
SURFACE-TERMINAL, MOT-001/002) stand as written: the tools they name retired with them
(`backup/README.md` maps every path that moved), a retired DERIVED entry stays bound to the
state it records, and their Deployment lines describe the build identity of their day; since
2026-09-08 it has been a projection of every served byte.

---

## OG-CARD — the link-preview plate

| | |
|---|---|
| Asset ID | IMG-008 |
| Source | The front door's film: its final frame, `film/final-landscape.jpg` (the last frame of `tools/render-film.py`'s landscape render), and the statement it ends on |
| Classification | **ILLUSTRATIVE** — a frame of the film, a conceptual visualization; every page that names it says so in `og:image:alt` |
| Command | `python3 tools/render-og-film.py` (headless Chrome renders `tools/og-card.html` at 1200×630, device scale 1, from a local server on 127.0.0.1) |
| Canonical inputs | None — the composition, the frame and the fonts (`adii/fonts/`) are tracked files. |
| Method | The frame covers the card (centred, 45 px cropped top and bottom); the darkening the front door sets behind its statement (a top band and a radial veil, lower left); the identity's primary lockup: the Cyther Seal pixel-fitted at 34 px (`tools/render-seal.py`) left of the wordmark (Public Sans 720/340); *Let AI change things. Keep control of what changes.* in Newsreader 300, 60 px, `#ece7dc` with the front door's text-shadow. Until 2026-10-13 the wordmark carried a warm ✳ instead of the seal (612,765 bytes, `ade67c693e77d62263acea0e230e9cd3b0c09d640ec74abfb11a38c43abc7d15`). |
| Output | `assets/og/og-card.png` · 1200×630 · 612,212 bytes |
| SHA-256 | `7433e5b37b8a91b40ec86a5f3878b3dad7ce2214c323257a814432c7e8e18e6e` |
| Determinism | Run twice on Google Chrome 155.0.8059.40 (macOS, Apple Silicon); byte-identical output both runs. Another Chrome or machine may rasterize differently; the receipt binds these bytes, not the renderer. |
| Acceptance checks | 1200×630 PNG; the statement and the wordmark whole inside the 1.91:1 frame; the ring and the current visible right of the statement. A square centre crop keeps the ring and the current and cuts the statement's left edge. |
| Deployment | `deploy.sh` allowlist only, at the path the previous card had, so the six pages that name it (`index.html`, `contact.html`, `pages/brief.html`, `pages/{privacy,security,terms}.html`) keep their `og:image` URL. Not precached, not in the SRI fingerprint; no page requests it. |
| Supersedes | IMG-001, the derived orbit plate, retired whole to `backup/og-card-v1/` on 2026-10-13 (below) |
| Owner sign-off | PENDING |

---

## OG-CARD-AR — the Arabic link-preview plate

| | |
|---|---|
| Asset ID | IMG-010 |
| Source | The English card's composition (IMG-008) with the Arabic front door's statement (`ar/index.html`) |
| Classification | **ILLUSTRATIVE** — a frame of the film, a conceptual visualization; both Arabic pages say so in `og:image:alt` |
| Command | `python3 tools/render-og-film.py ar` (headless Chrome renders `tools/og-card-ar.html` at 1200×630, device scale 1, from a local server on 127.0.0.1) |
| Canonical inputs | None — the composition, the frame and the fonts (`adii/fonts/`, `fonts/`) are tracked files. |
| Method | IMG-008's frame, darkening and lockup (the lockup stays left to right, as the identity draws it); *دع الذكاء الاصطناعي يغيّر الأشياء. واحتفظ بزمام ما يتغيّر.* in IBM Plex Sans Arabic 300, 58 px, line height 1.4, right-aligned, kept over the frame's dark left side where it reads, `#ece7dc` with the front door's text-shadow. |
| Output | `assets/og/og-card-ar.png` · 1200×630 · 606,626 bytes |
| SHA-256 | `b0c7765545a846d0a2bff8062e7eb615a160d419518a70e69635b4875fcfc3af` |
| Determinism | Run twice on Google Chrome 155.0.8059.40 (macOS, Apple Silicon); byte-identical output both runs. Another Chrome or machine may rasterize differently; the receipt binds these bytes, not the renderer. |
| Acceptance checks | 1200×630 PNG; the statement and the wordmark whole inside the 1.91:1 frame, the Arabic joined and its marks unclipped; the ring and the current visible right of the statement. |
| Deployment | `deploy.sh` allowlist only; named by `ar/index.html` and `ar/contact.html`. Not precached, not in the SRI fingerprint; no page requests it. |
| Supersedes | Nothing; added 2026-10-14 with the Arabic front door. |
| Owner sign-off | PENDING |

---

## FILM — the front door's film and its final composition

| | |
|---|---|
| Asset ID | IMG-011 |
| Source | `tools/render-film.py` (Blender 5.1, Cycles on the Apple GPU), rendered offline once per orientation |
| Classification | **ILLUSTRATIVE** — a conceptual visualization; the page says so under the film (*A conceptual visualization. It measures no product.*) and claims no correspondence to a system event |
| Command | `TL=24 blender -b -P tools/render-film.py -- l anim <dir> 1920x1080 64` and `TL=14 … -- p anim <dir> 1080x1920 64`; the frames encoded as the CRF 23 master (`ffmpeg -framerate 24 -i <dir>/f%04d.png -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart`), its last frame kept as the poster; the delivered film re-encoded from the master: `ffmpeg -i <master> [-vf scale=1440:810:flags=lanczos] -c:v libx264 -preset veryslow -tune film -crf 29 -pix_fmt yuv420p -movflags +faststart -an` (docs/architecture.md, docs/deploy.md §5n) |
| Canonical inputs | None — the scene is the script. |
| Output | `film/film-landscape.mp4` · 1440×810, 12 s, H.264 High · 4,081,008 bytes; `film/film-portrait.mp4` · 810×1440, 12 s · 3,502,599 bytes; `film/final-landscape.jpg` · 1920×1080 · 273,896 bytes; `film/final-portrait.jpg` · 810×1440 · 155,883 bytes |
| SHA-256 | film-landscape.mp4 `fb5d1ce53e76e96846418b9f4be21b067be43bc89412ec3a281ba02494899972` · film-portrait.mp4 `cfddb2b23d1019ae487a08db4a2bb59323c99bc6ad4771748ddd620ef6bb9d37` · final-landscape.jpg `a070f7443f547eead2ec1ed8ebddc80c9b3bf561cb3587e7ebed0fc1750c8c7c` · final-portrait.jpg `2682827ce8a62f83e93c31fc39a339f0b192993415bba80354cf724dab3e78bf` |
| Determinism | **Not reproducible byte for byte.** Cycles sampled under a wall-clock limit (`TL`, seconds per frame), so another machine or load samples differently; the render frames were not kept. The CRF 23 masters are `git show e40fa72:film/film-<orientation>.mp4`, and the delivered films are reproducible from them by the command above, given the same x264. The receipt binds these bytes, not the renderer. |
| Acceptance checks | Every `moov` before its `mdat` (faststart); each poster is its film's last frame (PSNR of the poster, scaled to the film, against the film's decoded last frame: 39.1 dB landscape, 39.3 dB portrait; 2026-10-18). Reading ink over the film is the browser obligation CY-SEM-003, re-observed on every build. |
| Deployment | `deploy.sh` allowlist; `js/film.js` names the films by orientation; the posters are precached by `sw.js` (the still composition stands offline). `tools/test-site.py` holds every film the page names to `deploy.paths`, and back. |
| Commit | the film was published on 2026-10-12 and re-encoded lighter on 2026-10-13 (`git log -- film/film-landscape.mp4`) |
| Owner sign-off | PENDING |

---

## SYSTEMS — the three sequences

| | |
|---|---|
| Retired | ADII's sequence, 2026-10-20: the passage (PASSAGE, IMG-013) took its place on the front door; its bytes moved whole to `backup/adii-sequence-v1/` and its outputs below with them. AWC-OS's and CytherCAD's, later on 2026-10-20, when the passage extended through both systems and back to the film's world: their bytes and their generator moved whole to `backup/system-sequences-v1/`, and their outputs below with them. No sequence is served. |
| Asset ID | IMG-012 |
| Source | `tools/render-systems.py` (Blender 5.1, Cycles on the Apple GPU; now `backup/system-sequences-v1/render-systems.py`), one six-second sequence per system in the film's materials |
| Classification | **ILLUSTRATIVE** — each shows only what its system's shipped page states (the script's header); the front door gives each its source |
| Command | `TL=10 blender -b --factory-startup --python-exit-code 1 -P tools/render-systems.py -- <adii\|awcos\|cad> anim <dir> 1280x720 48` (AWC-OS and CytherCAD re-rendered so on 2026-10-19, Blender 5.1.2; ADII's is the 2026-10-12 render, without the two flags); the frames encoded with `ffmpeg -framerate 24 -i <dir>/f%04d.png -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart`, the last frame kept as the poster |
| Canonical inputs | None — the scenes are the script. |
| Output | `backup/adii-sequence-v1/sys-adii.mp4` · 1280×720, 6 s · 718,353 bytes; `backup/system-sequences-v1/sys-awcos.mp4` · 600,935 bytes; `backup/system-sequences-v1/sys-cad.mp4` · 721,469 bytes; `backup/adii-sequence-v1/sys-adii.jpg` · 1280×720 · 78,273 bytes; `backup/system-sequences-v1/sys-awcos.jpg` · 86,745 bytes; `backup/system-sequences-v1/sys-cad.jpg` · 78,928 bytes |
| SHA-256 | sys-adii.mp4 `7179b4fe9e9bdffaeb2765093a89b46cf6058e97191d7b0a1e29ed5dddc9a4a3` · sys-awcos.mp4 `b66120352ceb42d62148a481169db04516224957ee7e86f36214cc59d55258fe` · sys-cad.mp4 `3e8d19d1d369bcbaa6ff20743ccb507a677467f459bb2b954b92022d7888d39a` · sys-adii.jpg `edabf54454f253a10df668303441cb2727f0a8810ee716714063bd1b1fcf1ff9` · sys-awcos.jpg `aedfee9f0b4ecb0d89a88d00b7e2a32a072936d05b3f9a22539560881fde8030` · sys-cad.jpg `11a4bc1885aa67a5ff63a3325aa4076d935d2426ca126da46e79143a2478b283` |
| Determinism | **Not reproducible byte for byte**, as IMG-011: Cycles under a wall-clock limit, frames not kept. The receipt binds these bytes. |
| Acceptance checks | Faststart; each poster is its sequence's last frame (PSNR 43.9 dB ADII, 2026-10-18; 44.0 dB AWC-OS, 43.0 dB CytherCAD, 2026-10-19). No moving slab or token meets another: their boxes, checked 96 times a second, never intersect (2026-10-19); the published motion failed it. The defects that check found, recorded 2026-10-18 and fixed in the script and re-rendered on 2026-10-19: in AWC-OS's, the pale alternative shared the refused slab's lane and passed through it (3.90–4.17 s), and the refused slab now rises out of its lane and steps back from it; in CytherCAD's, two refused tokens shared a row (≈ 82 % overlap, so the poster showed two of three), later tokens passed through resting refused ones, and consecutive passing tokens clipped at the ring; the refused now stop on rows of their own, 0.56 apart, stepped back out of the stream, and a passing token leaves the ring as it reaches it. Over the motion they share, the re-renders read 47 dB against the 2026-10-12 renders. Those renders: `git show baba8d0:film/sys-awcos.mp4` (and `.jpg`, and `sys-cad`): AWC-OS 594,267 bytes `a9c6526d…`, its poster `66a85294…`; CytherCAD 715,829 bytes `f327e24a…`, its poster `eca8e93d…`. |
| Deployment | Until 2026-10-20: `deploy.sh` allowlist; each `<video class="seq">` named its poster and `data-src`; warmed one at a time once the passage was whole (`js/film.js`; before that day, once the film was still). |
| Commit | published on 2026-10-12 (`git log -- film/sys-adii.mp4`) |
| Owner sign-off | PENDING |

---

## PASSAGE — the film's final composition through the three systems and back

| | |
|---|---|
| Asset ID | IMG-013 |
| Source | `tools/render-passage.py` (Blender 5.1.2, Cycles on the Apple GPU), rendered from the film's own scene (`tools/render-film.py -- <l\|p> blend`), so its first frame is the film's last |
| Classification | **ILLUSTRATIVE** — labelled on the page (*01 · ADII · A conceptual illustration*, *02 · AWC-OS · …*, *03 · CytherCAD · …*), each system followed by its route to its evidence (*See what this is based on →*, `adii/#run`; *See the demonstration →*, `awc-os/`; *Read the validation record →*, `pages/brief.html`); scrubbed by the scroll, never played |
| Premise ledger | What it shows, against what each system's shipped page states. ADII (`adii/`): a row of daily values, the last about half the others — the run's chart, *nearly flat, then a sharp drop on Aug 18*, *↓51% against the 14 days before*; a correction proposed from outside the row that waits — *The AI that proposes a fix can't approve it*; two separate checks before it crosses — *Two programs outside the model decide whether the change is allowed and whether it holds*, the sign-off's *Authorizer … Allowed* and *Validator … Accepted* before the answer *Fix it*; the authorizer's light on the one slot — *within what ADII may change here*; the validator's scan along the whole row — *It rebuilt the data from a frozen copy with the change applied*; the corrected value level with the rest — *the rebuild stays level*. The wrong value stepping back behind the correction is the illustration of a replacement and claims nothing about ADII's storage. AWC-OS (`awc-os/`): a rule that does not move and a proposal refused at it, its alternative passing — the engine's verdicts *EXECUTED · REFUSED · BLOCKED*, the refusal with its alternative (*REFUSED. Halal alternative: …*), and *No rule was relaxed*; the opening, the jaws and the programs' shapes are the illustration and claim nothing about AWC-OS's rules or interface. CytherCAD (`pages/brief.html`): a shape built into a part operation by operation (base, step, bore) and its dimensions drawn after it is built — *Constrained decoding enforces geometric validity at generation time*, *Kernel-backed verification confirms dimensional accuracy post-generation*; the part is illustrative, not one of the benchmark's. The scene continues from AWC-OS's, but the page introduces CytherCAD as the shape comes to rest, before it takes any form: the systems share a principle, and the passage claims no product connection between them (the owner, 2026-10-20). The line is the film's ring seen edge on, and the refused slab is the film's, never moved: in the return it still stops short of the ring. |
| Command | `blender -b --factory-startup --python-exit-code 1 -P tools/render-film.py -- l blend <dir> 1920x1080 64` (portrait `p … 1080x1920 64`), then `TL=24 blender -b --factory-startup <dir>/film-l.blend --python-exit-code 1 -P tools/render-passage.py -- l anim <dir> 1920x1080 64` (portrait `TL=14 … film-p.blend … -- p anim <dir> 1080x1920 64`): ADII's twelve seconds (f0288–f0575) rendered first, the rest (f0576–f0887) with `FROM=12`, by a script that changes nothing before 12.0 s (the scene's state compared at twelve frames from f0288 to f0575: no difference); the 600 frames encoded `ffmpeg -framerate 24 -start_number 288 -i <dir>/f%04d.png -vf scale=1440:810:flags=lanczos -c:v libx264 -preset veryslow -tune film -crf 29 -g 6 -keyint_min 6 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart -an` (portrait `scale=810:1440`); each still its frame, `-vf scale=… -q:v 3`: ADII's at 8.0 s (f0480), AWC-OS's at 15.42 s (f0658), CytherCAD's at 20.58 s (f0782), the return's the last (f0887) |
| Canonical inputs | None — the scene is the film's script and this one. |
| Output | `film/passage-landscape.mp4` · 1440×810, 25 s, H.264 High, a keyframe every 6 frames · 1,698,659 bytes; `film/passage-portrait.mp4` · 810×1440, 25 s · 1,569,783 bytes; `film/passage-adii-landscape.jpg` · 1440×810 · 39,775 bytes; `film/passage-adii-portrait.jpg` · 810×1440 · 40,259 bytes; `film/passage-awcos-landscape.jpg` · 21,528 bytes; `film/passage-awcos-portrait.jpg` · 21,854 bytes; `film/passage-cad-landscape.jpg` · 26,616 bytes; `film/passage-cad-portrait.jpg` · 26,472 bytes; `film/passage-close-landscape.jpg` · 120,480 bytes; `film/passage-close-portrait.jpg` · 101,586 bytes |
| SHA-256 | passage-landscape.mp4 `b9b0bdf36474b801766c5d3443c2f8f818f418250d296ad666fbf046f06957e1` · passage-portrait.mp4 `1483e1e6885a9b6de842ec8c54c58ce6d5959ba0f20e6e047ac96a2b412e607e` · passage-adii-landscape.jpg `550b922802b7c086ef439305b7603ac6e52ab14114da86654f4dc573d14209c2` · passage-adii-portrait.jpg `4f6cfec1bf260844696555fa92adf63a23e0ac6db08592732310969da9329a39` · passage-awcos-landscape.jpg `94aba65f6d088c659903b08a77963606d1d17ccdea0582171eec6f9851aa13a5` · passage-awcos-portrait.jpg `1c652a39dd6278d10eccaa7df7151372b789bdd1beda7bd97a4aa20b2f00f6cb` · passage-cad-landscape.jpg `9d58762194a45491035be7e5e101e73f481060f22043a560336b5c8db5090909` · passage-cad-portrait.jpg `a7b569a0942e8601ea5171d80dbc6a082d99c45ff06a4feb6204a65deceb7952` · passage-close-landscape.jpg `b87324accab684d278b1b806a6e8b5b8807cf71d81d98990581d96f08f644d4d` · passage-close-portrait.jpg `0bf5b91591e6c9e9db4c4b47ab5d6dac0ffac3616e4a86bfc5794898142d8e7a` |
| Determinism | **Not reproducible byte for byte**, as IMG-011: Cycles under a wall-clock limit (`TL`), frames not kept. The receipt binds these bytes. The ADII stills are reproduced byte for byte from their frame by the command above. |
| Acceptance checks | Every `moov` before its `mdat` (faststart); 100 keyframes in 600 frames (25.0 s, H.264 High). Its first frame is the film's last, unchanged: the delivered first frame is pixel-identical to the twelve-second encode's (PSNR ∞), which this receipt measured on 2026-10-20 (the render against the film's final-frame posters 48.2 dB landscape, 35.7 dB portrait at the poster's size; delivered against the film's decoded last frame 37.0 dB and 35.5 dB). The two renders meet without a seam: f0575, the first render's last, against f0576, the second's first, reads 46.9 dB landscape and 48.8 dB portrait, as close as two neighbouring frames of one render (f0574 against f0575: 47.3 and 49.8 dB); nothing before 12.0 s changed in the scene (its evaluated state compared at twelve frames from f0288 to f0575, both orientations), and the landscape scene is the same under the script both orientations finished with (eight frames from f0576 to f0887; the one edit made while the landscape rendered lifted the portrait's AWC-OS frame). The line holds its place: in the decoded landscape frames its brightest column is x = 683 of 1440 at 2.58, 4.17, 5.83, 11.96, 13.0, 14.0, 15.42, 16.5, 17.5, 19.0, 20.58 and 21.0 s, through ADII, AWC-OS and CytherCAD (the ring's centre as Blender projects it from the film's last frame); in portrait its row is y = 749 of 1440 through ADII, rises to 504 for AWC-OS (so the refused program waits above the words) and is 749 again from 19.0 s. Above the opening the line runs out of the frame (the ring's top projects above it), so the boundary never reads as a post with an end. No solid piece passes through another in any of the 600 frames: an oriented-box test of every moving piece against every other and against every piece of the halves (their offsets read from the scene), the film's rings tested as rings, the ring's tube against every solid, and the camera's clearance from every solid and the ring, 1.38 landscape and 1.01 portrait at the closest (2026-10-20); it found the refused program in a fin's sweep as the structure closed, fixed before the render. The stills are the frames at 8.0 s, 15.42 s, 20.58 s and the last; ADII's are reproduced byte for byte from their frame. Reading ink over the passage's words is CY-SEM-003, re-observed on every build. |
| Deployment | `deploy.sh` allowlist; `js/film.js` names the passage by orientation and its stills in `STILLS`, each with the second it stands until; the stills are precached by `sw.js` (the passage's moments stand offline); the passages go to the network uncached, as all media. `tools/test-site.py` holds every file the page names to `deploy.paths`, and back. |
| History | 2026-10-20, build `86CD52B68E33C36A`: the first twelve seconds alone, ADII's (`film/passage-landscape.mp4` 1,045,732 bytes `56f71044…`, `film/passage-portrait.mp4` 952,673 bytes `a8950df6…`; their stills, the ADII stills above, were `film/passage-<orientation>.jpg`); `git show b9af466:film/passage-landscape.mp4`. Extended the same day through AWC-OS and CytherCAD and back to the film's world at the owner's decision; the first twelve seconds' frames are those renders' own. |
| Supersedes | ADII's sequence (IMG-012's `sys-adii`), retired whole to `backup/adii-sequence-v1/`; AWC-OS's and CytherCAD's (IMG-012's `sys-awcos`, `sys-cad`), retired whole with their generator to `backup/system-sequences-v1/` |
| Owner sign-off | PENDING |
---

## ADII-POSTER — the recorded run's last frame

| | |
|---|---|
| Asset ID | IMG-014 |
| Source | `adii/replay.mp4`, ADII's recorded run: a screen recording of its interface, 68 seconds, without sound, served with `adii/` since its first reviewed publication (`1fca6ae`, 2026-10-04) |
| Classification | **COMPUTED** — a frame taken from the fixed input above, the recording's last; every page that shows or names it states its status beside it (a research project; one recorded run) |
| Command | Not recorded when it was first published; it is the recording's last frame, the answer *Fix it* and the sign-off of the investigator, the authorizer and the validator |
| Canonical inputs | None — the recording is a tracked file. |
| Output | `adii/poster.jpg` · 1920×1080 · 101,602 bytes |
| SHA-256 | `128222d879b66d1f8a5ba23f50ebb41b48ae1e34073eba18d073d087f44b205e` |
| Determinism | **Not reproducible byte for byte**: its extraction command was not kept. Against the recording's decoded last frame it reads 47.6 dB (2026-10-21); the receipt binds these bytes. |
| Acceptance checks | 1920×1080 JPEG; the recording's last frame (above). |
| Deployment | `deploy.sh` allowlist, in ADII's reviewed publication set (`tools/test-site.py`); the recording's poster on `adii/` and on its Arabic introduction (`ar/adii.html`), and both pages' link preview (`og:image`), receipted from 2026-10-21 when a page outside `adii/` first named it. |
| Owner sign-off | PENDING |

---

## AWC-OS-POSTERS — a frame of each AWC-OS film, the engine's trace marked EXECUTED

| | |
|---|---|
| Asset ID | IMG-015 |
| Source | `awc-os/media/AWC_OS_film_en.mp4` and `awc-os/media/AWC_OS_film_ar.mp4`, AWC-OS's films (85 s, music, no speech), with their closing production line masked since 2026-10-19 (`backup/awc-os-v1/`) |
| Classification | **COMPUTED** — one frame of each fixed input above, at 52.0 s: the engine's trace of the zakat computation, marked EXECUTED (in Arabic, نُفِّذ), above the phone that asked for it. Chosen over the refusal at 34 s, whose card names the halal alternative's Alinma product: a poster and a link preview would put that name first, and the Alinma plan is cancelled (2026-10-19). Every page that shows or names it states its status beside it (a hackathon demonstration; no deployment is claimed) |
| Command | `ffmpeg -ss 52 -i awc-os/media/AWC_OS_film_<en\|ar>.mp4 -frames:v 1 -q:v 3 awc-os/media/poster-<en\|ar>.jpg` (ffmpeg 9.0.2) |
| Canonical inputs | None — the films are tracked files. |
| Output | `awc-os/media/poster-en.jpg` · 1280×720 · 50,354 bytes; `awc-os/media/poster-ar.jpg` · 1280×720 · 49,046 bytes |
| SHA-256 | poster-en.jpg `daeef2c7e70648b960e65c6b4143515e80be60dd5e8ab3b909a1f69f63c04b95` · poster-ar.jpg `8adc59c94029ebb8b59b72045847c9e7e6f874c4e39f61f1c75d0a3bb68288f0` |
| Determinism | Reproduced byte for byte by the command above (2026-10-21, ffmpeg 9.0.2). |
| Acceptance checks | 1280×720 JPEG, the films' own size; each its film's frame at 52.0 s (above). |
| Deployment | `deploy.sh` allowlist, in AWC-OS's reviewed publication set (`tools/test-site.py`); each film's poster in its room (`awc-os/` English, `ar/awc-os.html` Arabic), and that room's link preview (`og:image`), from 2026-10-21. |
| Owner sign-off | PENDING |

---

## OG-CARD-V1 — the derived link-preview plate, retired

| | |
|---|---|
| Retired | 2026-10-13: served as `assets/og/og-card.png` from `4f09d81` until the film's card (IMG-008) replaced it; the bytes and their generator moved whole to `backup/og-card-v1/`. The receipt below stands as written, its output path moved with the bytes. |
| Asset ID | IMG-001 |
| Source study | `docs/audit/generation-studies/img/IMG-001-og-composition-study.png` (visual-work, round 1, approved composition) — framing reference only; no study pixel ships |
| Classification | **DERIVED** |
| Command | `python3 tools/render-og.py` (renderer rev 1; now `backup/og-card-v1/render-og.py`, kept as the record of the method: it imports `pngout` and `canon` from its own directory, which the snapshot does not carry) |
| Canonical inputs | `CytherManifest.CANON = [-1.7515999999999998, 1.85944, -0.98268, -0.6072]` and admission nonce 0, read from `js/manifest.js` (sha256 `84b0fee171f2029f7494dc4916bf4cb520d2f139da4074f1ba04dd4ac3d878f9`) by executing it under jsc — never hand-copied. State checksum `75D1:89D1`. |
| Method | dsin/dcos orbit recurrence (engine-invariant; Python port verified bit-identical to jsc), plate-0 grammar of `js/substrate.js` verbatim: angular-lobe anchor inks with rot 0.12, log tonemap with gamma 1.5, dark core on light paper, alpha over `#ECF0F4`. 2400×1260 source, 12,000,000 iterations, then exact 2×2 box-mean downsample. The 2× source is never written to disk. |
| Output | `backup/og-card-v1/og-card.png` · 1200×630 · 355,054 bytes |
| SHA-256 | `bd59c137b1c5eb29bacf9347b149f73a703079c2b61d96233b6c418953ab1d9d` |
| Determinism | Run twice; byte-identical output both runs. |
| Acceptance checks | Left-45% lane and bottom-12% band: every 24px block mean L ≥ 229 (`#E0E6EF` floor) — measured pure paper, min block L 239.4. Core = the lobe-convergence point (the orbit origin, where the four angular ink anchors meet): (0.671 W, 0.505 H), 48px box mean L 170.8 against paper 239.4. Palette: warm 0.00%, off-cold-hue 0.00%, accent (saturated cold hue) 4.58% ≤ 8%. Crops 1.91:1, centered 1:1, centered 4:5: convergence core inside each with ≥ 40px margin; quiet fraction ≥ 30%. |
| Recorded diagnostics | The aggregate deep-ink centroid sits at (938, 271) and the darkest 48px sliver at (990, 210) — the orbit's upper-right rim caustic. The composition core is the convergence point, which is a derived quantity of the plate grammar; the mass asymmetry is the real object's geometry and matches the approved round-1 framing study. |
| Deployment | `deploy.sh` allowlist only. Not in `sw.js` ASSETS: the card is fetched by link scrapers, never by any page — precaching 355 KB for a resource the browser never requests has no offline value. Not in the SRI fingerprint: `generate-integrity.sh` covers the nine JS/CSS resources; images cannot move the build hash. The homepage runtime makes no request for this file. |
| Commit | `4f09d81` |
| Owner sign-off | PENDING |

---

## ICON — the Cyther Seal

| | |
|---|---|
| Asset ID | IMG-009 |
| Source | The Cyther Seal identity (`cyther-seal-identity.html`, a draft the owner adopted on 2026-10-13: "for the seal chose what ever version that is more aligned with the whole website then apply it"): the principal mark, the solid seal |
| Classification | **COMPUTED** |
| Command | `python3 tools/render-seal.py` |
| Fixed input | The word `CytherAI`: SHA-256 `9db0cc58ca67af9c2f718a3fe85403455c16cda52e4f49f73f2a3d7eba07befe`, read two bits at a time; a constrained walk on a 6×6 grid: 77 proposals, 29 admitted, 48 refused; the published path `00 01 11 21 20 30 40 50 51 52 53 54 44 43 33 32 22 12 02 03 04 05 15 25 35 34 24 14 13 23`, which the script refuses to run without. |
| Method | `icon.svg`: the identity's pixel-fitted seal on a 32-unit grid (u = 2, crispEdges), so it is sharp at 16 and 32 px. The PNGs: the seal full-bleed in ink `#ECE7DC` with its path in ground `#07070A`, a square-capped, mitred polyline on whole pixels at the vector seal's proportions (180: stroke 10, spacing 22; 192: 11, 24; 512: 28, 64); the maskable 512 keeps its path inside the central 80% circle (stroke 23, spacing 53). No warm: the identity keeps warm for the end cell of the open line only. |
| Outputs | `icon.svg` · `assets/icons/icon-180.png` (apple-touch) · `icon-192.png`, `icon-512.png` (web manifest, `any`), `icon-512-maskable.png` (web manifest, `maskable`) |
| SHA-256 | svg `0e293384f3f81f6a68ea8deb2d1a51ea2b03dee30f2b9385bf777343f394a2f2` · 180 `3525ea646b48ba55ef4fa8ae86c0ef588150def4a39b529590cbb636eb786b07` · 192 `5b35146f6a916a44285c8f1068c2e8fe5c1c5b16474d76ab4736ab5e7f630469` · 512 `f23ff1cb401544e819a354aec0c15acb43ff41af1697adf990f2ded44ca686c1` · maskable `988f49c2a82743262a2e9021a9cfd19137fa2f39d028387c10f01bae397b8352` |
| Determinism | Run twice; all five outputs byte-identical (no anti-aliased pixel, fixed zlib through `tools/pngout.py`). |
| Acceptance checks | The computed path equals the published one (the script exits otherwise); 512 maskable: half-diagonal of the path 203.6 px ≤ 204.8 px (40% of the side); every seal inline on a page equals the computed one (`tools/test-site.py`). |
| Deployment | `deploy.sh` allowlist (`icon-512-maskable.png` added). `sw.js` ASSETS keeps `icon.svg`, the favicon every page links; the rasters are fetched by the OS at install or pin time. |
| Supersedes | IMG-002, the derived orbit filament, retired whole to `backup/icon-v1/` on 2026-10-13 (below) |
| Owner sign-off | The adoption above |

---

## ICON-V1 — the derived mark, retired

| | |
|---|---|
| Retired | 2026-10-13: served as `icon.svg` and `assets/icons/icon-{180,192,512}.png` from `6dbc9a1` until the Cyther Seal (IMG-009) replaced them; the bytes and `derive-icon.py` moved whole to `backup/icon-v1/`. The receipt below stands as written, its output paths moved with the bytes. |
|---|---|
| Asset ID | IMG-002 |
| Source study | `docs/audit/generation-studies/img/IMG-002-icon-study-rev2.png` (visual-work, round 2, accepted as SVG derivation reference) — geometric reference only; no study pixel ships |
| Classification | **DERIVED** |
| Command | `python3 tools/derive-icon.py` (rev 1; now `backup/icon-v1/derive-icon.py`, kept as the record of the method: it imports `pngout` and `canon` from its own directory, which the snapshot does not carry) |
| Canonical inputs | `CytherManifest.CANON` and admission nonce 0 via jsc from `js/manifest.js`; state checksum `75D1:89D1` |
| Method | The silhouette is the **densest filament of the canonical mark**: dsin-orbit density field at 384-grid (4,000,000 iterations), cells above the 95th percentile of occupied density, largest connected component — the orbit's right rim caustic, a sweeping band with a dense knot. Regularized by Euclidean-disk morphology (close 3 / dilate 16 / open 18; the opening radius constructs the minimum stroke width), hole-filled, traced (Moore), simplified (Douglas–Peucker 2.0), smoothed (Chaikin ×2, DP 0.6), placed into the central 76% of a 512 viewBox. Rasters are scanline even-odd fills of the same polygon, 4×4 supersampled, ink on opaque paper. |
| Outputs | `backup/icon-v1/icon.svg` (replaced the retired warm-gold lambda — closed ADV-001) · `backup/icon-v1/assets/icons/icon-180.png` (apple-touch) · `icon-192.png`, `icon-512.png` (web-manifest, `any` + `maskable`) |
| SHA-256 | svg `884d04d844768cc653ac8315d141966dddee54127053eab705189b019bf2552b` · 180 `7351a474f52eba33eb04d26a96b2136f897bf096e1cb6fc32506e722f85615b0` · 192 `daa09fb19742c55ffd79fe177fdd1d27082b28d8f9e3f55317824565deb939f8` · 512 `24dcbaee5a902979d5edcd6825cb29b5026dded9552d608203f9768241f82998` |
| Determinism | Run twice; all four outputs byte-identical. |
| Acceptance checks | 16×16 single-bit reduction: **1** four-connected component at thresholds 0.25 / 0.50 / 0.75 (the round-2 study split 21+13 at midpoint — this is the test that had to pass). 32×32: 1 / 1 / 1. Minimum stroke width: disk opening at r=25 (floor 50px = 9.8% of viewBox) keeps 99.5% of ink in one component; construction gives ≈54px = 10.6%. Margins ≥ 12% all sides. Circular mask: rmax 200.3 ≤ 256 (no clipping), and ≤ 204.8 — inside the 40% maskable safe zone, so `purpose: maskable` is mechanically true. Monochrome: paper + ink only, no accent anywhere (removability is trivial). Ink coverage 12.3% of viewBox. |
| Deployment | `deploy.sh` allowlist (3 raster additions; icon.svg already listed). Rasters are not precached: `sw.js` ASSETS keeps `icon.svg` (the favicon every page links) — the PNGs are fetched by the OS at install/pin time, not by any page. |
| Commit | `6dbc9a1` |
| Owner sign-off | PENDING |

---

## EXHIBIT-A — the constraint boundary, retired

| | |
|---|---|
| Retired | 2026-10-21: served as `assets/brief/exhibit-a-boundary.svg` until the cold-paper pages became rooms of the front door (`css/room.css`), at the owner's direction (*do the brief, the legal pages and the 404*); the bytes and their generator moved whole to `backup/cold-paper-v1/`. The receipt below stands as written, its output path moved with the bytes. |
| Asset ID | IMG-003 |
| Source study | `docs/audit/generation-studies/img/IMG-003-exhibit-a-composition-study.png` (visual-work, round 1) — composition reference only; no study pixel ships |
| Classification | **ILLUSTRATIVE** — the adjacent caption states it: `FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT` |
| Command | `python3 tools/gen-exhibit-a.py` (LCG seed 11, grid 32px) |
| Canonical inputs | None — a fixed algorithm and seed; the SVG is a pure function of the script. |
| Method | SVG, 2560×800 (16:5): `#E0E6EF` ground; 1px hairline grid at ink opacity 0.12; eight open rejected rectilinear fragments (ink, opacity 0.14–0.25) thinning toward the left; exactly one closed axis-aligned cobalt ring — a rectangle with non-overlapping castellation notches, simple by construction. SVG chosen over PNG: rectilinear hairlines are resolution-independent, the file is 3 KB against ~100 KB raster, CSP `img-src 'self'` admits it, and `.svg` MIME is already in the deployment contract. |
| Output | `backup/cold-paper-v1/assets/brief/exhibit-a-boundary.svg` · displayed in `pages/brief.html` §02 Exhibit A above the record type line |
| SHA-256 | `ab3dbd18f85403eafce10c070ffd461e17c248c0d936d2a87fef34b6ad0335ca` |
| Determinism | Pure text generation, no clock, no environment; two runs byte-identical. |
| Acceptance checks | Exactly one accent element; the ring is closed, axis-aligned, spur-free and non-self-intersecting (segment-pair receipt); ring bbox inside the right 40% and clear of the top/bottom 15%; 8 fragments (window 8–12), all open, all axis-aligned, none left of x=640 — the left 25% label lane carries grid only; palette closed over {`#E0E6EF`, `#101620`, `#2036C7`}; no text, no curve commands, no arrows. |
| Deployment | `deploy.sh` allowlist (24 files). Not precached — the brief is not an offline-critical surface and the figure is decoration on it. |
| Commit | `c3e7d82` |
| Owner sign-off | PENDING |

---

## EXHIBIT-B — the event strata, retired

| | |
|---|---|
| Retired | 2026-10-21: served as `assets/brief/exhibit-b-strata.png` until the cold-paper pages became rooms of the front door (`css/room.css`), at the owner's direction (*do the brief, the legal pages and the 404*); the bytes and their generator moved whole to `backup/cold-paper-v1/`. The receipt below stands as written, its output path moved with the bytes. |
| Asset ID | IMG-004 |
| Source study | `docs/audit/generation-studies/img/IMG-004-exhibit-b-composition-study.png` (visual-work, round 1) — composition reference only; no study pixel ships |
| Classification | **ILLUSTRATIVE** — captioned `FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT` |
| Command | `python3 tools/gen-exhibit-b.py` (integer-hash stipple, seed 5) |
| Canonical inputs | None — fixed algorithm and seed. |
| Method | PNG, 2560×800: nine horizontal strata of per-pixel Bernoulli stipple under a deterministic integer hash — accumulation, not gradient; every pixel is exactly one of four colours. Coverage ramp 0.015 → 0.92 top-to-bottom; boundaries are piecewise-linear deposition lines (±9px, control points every 160px); stratum 8 of 9 is thin (48px nominal) and cobalt. |
| Output | `backup/cold-paper-v1/assets/brief/exhibit-b-strata.png` · 247,669 bytes · displayed in `pages/brief.html` §03 Exhibit B above the record type line |
| SHA-256 | `ff344466b0cfb4c48c8326144e4687012bc9b83d25165c0736316feb85c72149` |
| Determinism | Pure integer arithmetic, no clock; two runs byte-identical. |
| Acceptance checks | Nine strata, ink coverage strictly increasing downward (0.015 / 0.040 / 0.089 / 0.159 / 0.259 / 0.399 / 0.549 / 0.698 / 0.921); accent pixels 86,305 in the lower third and **0** above it; every stratum present at both 64px edge columns at ≥ 40% of its interior coverage (no truncation); palette exactly {`#E0E6EF`, `#3A4658`, `#101620`, `#2036C7`} — 4 colours total, which also proves stipple-not-gradient. |
| Deployment | `deploy.sh` allowlist (25 files). Not precached, same reasoning as Exhibit A. |
| Commit | `1917a41` |
| Owner sign-off | PENDING |

---

## EMPTY-PLATE — the 404 emblem, retired

| | |
|---|---|
| Retired | 2026-10-21: served as `assets/error/plate-empty.svg` until the cold-paper pages became rooms of the front door (`css/room.css`), at the owner's direction (*do the brief, the legal pages and the 404*); the bytes and their generator moved whole to `backup/cold-paper-v1/`. The receipt below stands as written, its output path moved with the bytes. |
| Asset ID | IMG-005 |
| Source study | `docs/audit/generation-studies/img/IMG-005-empty-plate-candidate.png` (visual-work, round 1) — reference only; the 1024px study is not upscaled and does not ship |
| Classification | **ILLUSTRATIVE** — decorative on `404.html` (`alt=""`); the explanation is live HTML |
| Command | `python3 tools/gen-empty-plate.py` (LCG seed 3) |
| Canonical inputs | None — fixed algorithm and seed. |
| Method | Transparent SVG, 1200×1200: one square hairline frame (720×720 = 60%, ink at 0.16, 2px stroke) and 200 fixed-seed stipple deposits entering from the frame's lower-left corner and dying out before the center. No accent — nothing is verified on an empty plate. CSS supplies the cold-paper ground. |
| Output | `backup/cold-paper-v1/assets/error/plate-empty.svg` · displayed on the new `404.html` |
| SHA-256 | `274b9c7ef354b50a50e8c840a9a03558b8ffad5b85019d9d88dad93f6641ab65` |
| Determinism | Pure LCG; two runs byte-identical. |
| Acceptance checks | 200 deposits (window 180–220), all inside the frame; nearest deposit 133px from center (floor 110) — the center is genuinely empty; drift density strictly decreasing (95/54/51 per band); one stroked element (the frame); no accent; no opaque ground. |
| Deployment | `deploy.sh` allowlist (27 files, with `404.html`). `404.html` joins `generate-integrity.sh` HTML_FILES — it carries the build-hash meta and the stylesheet SRI like every shipped page; this does not move the build hash (the fingerprint is the nine JS/CSS resources). Not precached: the offline reader is served by the worker's cached routes; a styled 404 is origin behaviour, which must be verified live (docs/deploy.md §3–4). |
| Commit | `5c20d99` |
| Owner sign-off | PENDING |

---

## SURFACE-TERMINAL — the promoted terminal exposure

| | |
|---|---|
| Asset ID | IMG-006 |
| Source study | None. The image is not composed; it is the plate the page's own kernel develops. |
| Classification | **DERIVED** |
| Command | `python3 tools/promote-poster.py` — which runs `jsc js/manifest.js js/substrate.js tools/promote-poster.js` and encodes what comes back |
| Producer binding | The pixels come from the repository's substrate kernel, not a second renderer: `js/manifest.js` sha256 `df0ad2da86d3011a4e86dcf7c5b42498acdfb67cc084e27d3abeb286bef6e20b`, `js/substrate.js` sha256 `45fbe61e865ffbbdda9b9d166750fb2c8eb7a4f6dc49b43c5d7c22615565fa6d`, `tools/promote-poster.js` sha256 `79f7c2e1ab45377fe1713e6c83880b5a0a3a78b4b943ecb08b0275f66811cee2`. The Python step is a lossless container writer and receipt printer; it computes no pixel. |
| Provenance chain | manifest → kernel → terminal development state D_N → terminal raster R_N → encoded poster P. Recorded below at every edge. |
| Canonical inputs | `CytherManifest.CANON = [-1.7515999999999998, 1.85944, -0.98268, -0.6072]`, admission nonce 0, state checksum `75D1:89D1`, epoch 3 — read by executing `js/manifest.js` under jsc, never hand-copied. |
| Method | Plate 0 (`ZOOMS[0]` 1.3, `PLATE[0]` anchor inks, rot 0.12, and the luminous exposure `floor` 0.16 / `gain` 0.65 / `satQ` 0.997) developed by `developStep` at the fixed `DEV_BATCH` of 60,000 iterations to its terminal state, then `tonemapInto` — the same function the page calls — into a `Uint8ClampedArray`, whose round-half-even clamping is part of the exposure law. Every recurrence is `dsin`/`dcos`/`datan2` (§8.1), so D_N and R_N are engine-invariant: jsc and Chrome produce the identical raster (measured 2026-09-09, rgba FNV `5f13f462` at a 800×343 probe frame). Plate 0 is now the LUMINOUS end of the exposure order: it emits onto the unexposed field rather than depositing ink on paper, so the promoted raster is mostly transparent and its alpha carries the accumulation. `#poster` composites it `plus-lighter`, exactly as the tile it stands in for, or the swap at D_N would step in brightness by the ground beneath it. |
| Reference frame | 1200×600. A real viewport frame whose bin raster is exactly `BIN_TGT` (720,000 cells) — the most the runtime ever develops — at the widest aspect the page presents it. |
| Terminal state | step 15 · 900,000 deposits · 900,000 iterations · max density 128 · density hash (FNV-1a over the field and counters) `ef4bf18f` |
| Terminal raster R_N | 1200×600 RGBA · sha256 `c3acb1b07cc336145e2f40e91f0056745ef686cc18c1b423f1969896c302c190` |
| Encoder | `tools/pngout.py write_png(alpha=True)` — PNG colour type 6, 8-bit, filter 0 on every row, zlib level 9, no ancillary chunks. Lossless by construction: the poster is the canonical representation of a generated plate, not a bandwidth optimisation, so there is no gap between "the plate" and "an approximation shown until the real one arrives". |
| Output | `backup/instrument-v1/assets/plate/surface-terminal.png` · 1200×600 · 393,801 bytes — retired with instrument-v1 (2026-09-16); the drawing set has no plate and the file left `deploy.paths`; bytes, digest and provenance unchanged |
| SHA-256 | `d28fcea417bca3fb881449ba5e15a8c4848337fb063a0233fa9f1f810df94298` |
| Determinism | Run twice; byte-identical output both runs (`tools/test-poster.py`). |
| Acceptance checks | `python3 tools/test-poster.py`, five gates: producer determinism; **decode(P) == R_N pixel for pixel** (the load-bearing proof — not an equality between the PNG digest and the kernel's FNV checkpoint, which identify different objects); a change to any declared derivation input (`normalizeManifest`: epoch, derived, revision, disclosed, indexed, controlled, validation, not_claimed) moves the raster and makes these bytes stale, while a presentation-only manifest field does not; a one-bit pixel edit, a corrupted file, and a substituted valid image (`og-card.png`) each fail verification; the promotion log and deployment contract record this artifact. |
| Presentation | A CSS `background-image` on `#poster` inside `#world`, under the tiles, shown only for viewport aspects in [1, 2] — the window where a `cover` fit **is** the exact crop the developed plate would show, because vertical world extent is constant across landscape frames and horizontal extent scales with aspect. Outside that window it is not shown at all, and because a `display:none` element's background is never fetched, the aspect window is also the download rule. `js/substrate.js` removes it the moment plate 0 reaches D_N and never restores it: a fork or a redevelopment is a different world and the poster cannot speak for it. |
| Deployment | `deploy.sh` allowlist (28 files). **Not** in `sw.js` ASSETS: 394 KB at install time to save a few hundred milliseconds on a warm cache is a bad trade (the file grew with the denser plate of `docs/audit/07` and again with the luminous exposure — a bigger poster simply wins the race less often, which is the intended failure mode), and its absence degrades exactly to the previous behaviour — the reader's own plate develops. On a cold or slow connection the poster loses the race and is removed before it paints, which is the intended failure mode. Not in the SRI fingerprint (images cannot carry SRI); it does move the build identity, which since 2026-09-08 is a projection of every served byte. |
| Commit | promoted on branch `visual-pass`; `git log --follow -- assets/plate/surface-terminal.png` names the commit |
| Owner sign-off | PENDING |

---

## MOT-001 / MOT-002 — motion conformance (no asset; no implementation change)

The two accepted motion studies are verification references. The shipped
implementation was checked against their laws by `tools/test-motion.py`
(13 mechanical assertions) and **required no change**:

- **MOT-001, the ink flip** — bistable with a 0.09 hysteresis gap
  (`READING` read from `js/substrate.js` under jsc); the retained-state
  machine in `js/site.js` is authoritative; zero border-radius anywhere in
  `index.html`; membrane softness is `mask-image` attenuation; none of the
  43 `data-ink`/`data-phase` rules moves layout — colour and background
  only; the flip is a 0.25s controlled crossfade. No illegible interpolated
  midpoint exists in the model: the storyboard's panel-3 crossfade wording
  was retired in round 2, and the implementation is what the study was
  corrected toward.
- **MOT-002, plate development** — the exposure order runs luminous → ink,
  and the two kinds are laws in opposite senses. The INK plates (2–3)
  darken monotonically with density for every anchor at exposure ceilings
  10/100/1000 and never exceed paper luminance — ink cannot emit. The
  LUMINOUS plates (0–1) brighten monotonically over the unexposed field,
  deposit nothing at all below their declared threshold, and are bounded
  by their own white core. The mirror names the plates by kind, not by
  index: the earlier mirror was pinned to indices 0–1 and kept reporting
  PASS after those plates became luminous, testing nothing.
  the cobalt anchor is hue, not luminance (L 60 vs paper 239); the shipped
  plate render (`assets/og/og-card.png`, same grammar) shows a radial
  profile rising monotonically out of the core — no bloom ring
  (165→207→216→220→222); reduced motion develops whole plates and
  tonemaps only at completion; development never touches the camera
  anchors. The monotonic-core and radial-profile receipts from the
  round-2 verification harness now live in the maintained tree as
  `tools/test-motion.py`.

Run: `python3 tools/test-motion.py` — exits nonzero on any breach.
