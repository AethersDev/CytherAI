# instrument-v1 — the retired world, whole

This directory is the CytherAI homepage as it stood from the P1–P9 build (2026-07) until
2026-09-16, when the drawing set became the front door. It is a verbatim snapshot of commit
`bf82377` — the last commit in which this world was complete and served at `/` — of every
file the world was made of and every verifier that established its laws. Nothing here is
served, precached or fingerprinted. Nothing here is to be edited: the snapshot is the record
of what the world was, and the receipts in `vaic/cytherai-obligations.v0.json` that cite
its files resolve through it (`tools/vaic_validate.py`, `RETIRED` / `ARCHIVES`).

## What the world was

A disclosure engine. One derived object — the canonical mark, a Clifford orbit whose four
parameters are digests of the public manifest — was the background as four plate-developed
exposure tiles; scroll moved a derived camera from far-field into the filament core; content
descended by epistemic distance; the reader kept a local, owner-erasable reading self-report
ledger; a bistable reading ink with hysteresis governed legibility over the composited
ground. `PRODUCTION_PLAN.md` at the repository root is its build specification; `docs/audit/`
holds the audits (00–08) that shaped it; `docs/deploy.md` §5–5b holds the browser
observations made against it. Its epochs are described in the root `CLAUDE.md` history and
in `docs/architecture.md` as they stood at `bf82377` (`git show bf82377:docs/architecture.md`).

| Path | What it is |
|---|---|
| `index.html` | the page: inline visual system, four exposure tiles, descent strata, the floor (claims, manifest rows, epochs, development receipt, obligations block, commitment chip), persistent instrument strip |
| `js/manifest.js` | the public manifest and derivation — the same file the drawing set still serves, as it was at the snapshot (it still exported `dcos`/`datan2` for the plates) |
| `js/substrate.js` | the world: plate development kernel (`developServer`), dsin-orbit camera anchors, `observe`, fork, minimap slider, reading model (`READING`, `readingGroundAt`) |
| `js/claims.js` | ten standing predicates: the six canonical ones the drawing set kept and the four world predicates — CL-04 SERIAL ≡ STATE, CL-06 / CL-06c reading ink on the ambient ground at every depth, CL-08 CAMERA ≡ DERIVATION |
| `js/ledger.js` | the reader self-report ledger (`READING SELF-REPORT`, `mailtoBody`) and intent-adaptive CTA |
| `js/instrument.js` | the boundary engine with its canvas / streaming-log wiring (`RUN PROPOSER`, `AUDIT`) |
| `js/site.js` | glue: one sleeping rAF loop, scroll → observe, hold-to-cross, floor renders, `verifyAdmissions` (CL-03), reading-ink hysteresis machine, minimap wiring |
| `js/develop-worker.js` | the dedicated Worker transport around `developServer` |
| `assets/plate/surface-terminal.png` | the promoted terminal exposure: plate 0's terminal raster at 1200×600, the first paint and `noscript`'s only mark (`docs/asset-promotion-log.md` SURFACE-TERMINAL) |
| `assets/og/og-card.png`, `css/cytherai.css`, `sw.js`, `deploy.paths`, `generate-integrity.sh`, `docs/asset-promotion-log.md` | the files the snapshot's verifiers read, as they were |
| `tools/test-develop.js` | the development trajectory law: fixed-step `DEV_BATCH`, genuine prefixes, `stateHash` checkpoints, Worker server ≡ direct kernel, `datan2` ≡ `Math.atan2` on the canonical orbit |
| `tools/test-exposure.js` | the executed tone-map and reading laws |
| `tools/test-motion.py` | MOT-001 (the ink flip: A1–A9) and MOT-002 (plate development: B-laws, B10b the served-module orbit scan, B14–B16), and A10, the subpage ink law, which the live `tools/test-site.py` now carries |
| `tools/test-poster.py`, `tools/promote-poster.{js,py}`, `tools/pngout.py` | `decode(P) == R_N`: the poster is the kernel's terminal raster, pixel for pixel |
| `tools/test-ledger.js` | the ledger's epistemic laws: `READING SELF-REPORT` prefix, authority not elevated |
| `tools/test-claims.js` | the ten-claim suite summary law (the live copy holds the six) |
| `tools/test-site.py`, `tools/vaic_validate.py`, `tools/test-api.py` | as they stood: the resource-profile contract (`dprCapFor` / `binTargetFor`) and the viewport-geometry law live in `test-site.py` here; the API inventory of the world's 83 symbols |
| `verify.sh` | runs the world's laws against this snapshot |

## The obligations this world carried

`vaic/cytherai-obligations.v0.json` was written against this world. Its receipts for
CY-EPI-001/002 (the reader ledger), CY-RES-001 (plate realization bounded by the resource
profile), and the Chrome observations for CY-SEM-001/002 were produced by the verifiers and
pages here; the browser obligations CY-GEO-001..003 (the persistent instrument on mobile),
CY-STATE-001..003 (world backing state, canonical/fork), CY-TOP-002 (encounter ordering),
CY-SEM-003 (reading ink on the composited plate ground) name mechanisms that exist only
here. Their observations are immutable history; whether each obligation binds the drawing
set is the corpus's transition to say (carried forward with a successor binding, or
superseded because the governing mechanism retired), never this directory's.

## Running the laws

```sh
backup/instrument-v1/verify.sh
```

All pass against the snapshot as of retirement (2026-09-16). The page itself can be opened
from a static server at `/backup/instrument-v1/index.html`; its SRI attributes name the
snapshot's own modules, so it runs as it did, minus the service worker.
