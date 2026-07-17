# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

Pure static site — no build system, no package manager, no bundler, no tests, no linter.
Serve with any static file server: `python3 -m http.server 8000` from the repo root.

Zero external requests, ever. The homepage CSP forbids inline `<script>`
(`script-src 'self'`); all homepage JS is in external modules. No node, no Chrome on
this machine — verify JS with `jsc`:
`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc`.
A ReferenceError on a browser global is a PASS for a parse check; SyntaxError is a fail.
Pure logic is guarded so it loads under jsc; DOM wiring is behind `typeof document`.

After changing any hashed resource, re-run `./generate-integrity.sh` (patches SRI +
the `build-hash` meta across the HTML files).

## Architecture — the substrate / disclosure engine

The homepage is a disclosure engine. One derived object — the canonical mark, a Clifford
orbit whose four parameters are digests of the public manifest — **is the world**: four
pre-rendered exposure tiles form the background, and scroll moves a derived camera from
far-field into the filament core (transform + opacity only; zero substrate rasters per
frame). Content descends by epistemic distance. Standing claims execute as predicates
against the page itself; the reader keeps a local, owner-erasable self-report ledger.

**The law, printed at the floor:** *The surface states. Depth conditions. Records
substantiate. Boundaries govern. The reader is a record. Nothing is stated that is not checked.*

**`index.html`** — inline `<style>` only; loads six modules `defer` with SRI, in order:

| Module | `window.*` | Role |
|---|---|---|
| `js/manifest.js` | `CytherManifest` | public manifest + deterministic derivation (fnv, dsin/dcos, admit, dsinOrbit, legibility, checksum) |
| `js/substrate.js` | `CytherSubstrate` | the world: native-sin tiles, dsin-orbit camera anchors, `observe`, fork |
| `js/claims.js` | `CytherClaims` | CL-01…CL-08 + CL-06b predicates; `CLAIMS n/9 HOLDING` |
| `js/ledger.js` | `CytherLedger` | reader self-report ledger, intent-adaptive CTA |
| `js/instrument.js` | `CytherInstrument` | hostile-proposer boundary instrument (feeds CL-05) |
| `js/site.js` | *(none)* | glue: one sleeping rAF loop, weight-field/waves, scroll→observe, hold-to-cross, floor renders, CL-03 verifier |

**Subpages** (`contact.html`, `pages/{brief,privacy,security,terms}.html`) share
`css/cytherai.css` — flat, cold, static, no JS (contact keeps its inline form script).

**Infra:** `sw.js` (cache-first, `CACHE='cytherai-substrate-v1'`), `manifest.webmanifest`,
`generate-integrity.sh` (SRI + build-hash). **Engine stack** (`engine/*`, `content/record.js`,
`profiles/disclosure.js`, `js/console.js`) is a separate project served only by
`pages/runner.html` — the homepage does not load it.

## Register rules (grep-enforced)

`var(--brass)`/gold/warm-paper tokens and the document register (`DOC-2026-001`) are retired.
Accent `#2036C7` marks state only. BANNED in shipped files: fake meters (`−540 M` style),
`CONDUCT RECEIPT` (it is a `READING SELF-REPORT`), `Append-only` (the ledger is
owner-erasable), `1e-12` (the compositing bound is `< 0.05 px · transform quantization`).
The commitment chip must keep: *"The page renders the commitment; it does not notarize it."*
PROVISIONAL manifest values (epoch history, counts, commitment preimage) live only in
`js/manifest.js`; replacing them is a data-only edit.

## Provenance

- **`PRODUCTION_PLAN.md`** is the authoritative build spec (supersedes any older design
  spec). Phases P1–P7, verification checklist §9.
- **`newC3/`** is the design record (concept prototypes → synthesis rev5 → substrate-demo).
  Do not modify it — supersede, never erase.
- **`backup/`** holds the retired surfaces: `graphite-v2/` (old engine-backed homepage),
  `dossier-v3/` (old shared CSS + the dossier IIFE modules).
