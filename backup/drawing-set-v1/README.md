# drawing-set-v1 — the retired drawing set, whole

This directory is the CytherAI homepage as it stood from 2026-09-16, when the drawing set
replaced instrument-v1, until 2026-10-04, when THE UNHAPPENED became the front door. It is a
verbatim snapshot of commit `99b167a` — the last commit in which the drawing set was complete
and served at `/` — of every file it was made of and every verifier that established its laws.
Nothing here is served, precached or fingerprinted. Nothing here is to be edited: the snapshot
is the record of what the drawing set was, and the receipts in `vaic/cytherai-obligations.v1.json`
that cite its files resolve through it (`tools/vaic_validate.py`, `RETIRED` / `ARCHIVES`).

It is preserved as history, not kept as a component library. Its seal, sheets, title blocks,
claim rows, revisions and obligations disclosure were the design expression of its evidence;
none of them is carried into the front door that superseded it.

## What the drawing set was

An engineering drawing set: seven sheets inside one border, each with zone strips, a notes
block and a title block (drawn from the public manifest's state checksum, checked by the
standing claims, approved by a seal derived from the disclosed state). FIG. 1 streamed the
boundary engine of the record and inked the largest program the run admitted (`PRG-446DF7E6`);
one edge of it could be adjusted, every position judged; FIG. 1c opened an atlas of two coupled
edge edits. Sheet 6 carried eleven standing claims (`6 CL · 5 DS`) and the revisions list;
Sheet 7 disclosed every VAIC obligation, projected from the corpus. Its design record is
`backup/drawing-set-demo.html` (the approved demo, which now loads this snapshot's modules) and
the root `CLAUDE.md` as it stood at `99b167a` (`git show 99b167a:CLAUDE.md`).

| Path | What it is |
|---|---|
| `index.html` | the seven sheets, inline visual system, Sheet 7 obligations block |
| `js/manifest.js` | the public manifest and derivation, as it was at the snapshot |
| `js/instrument.js` | the boundary engine (`biEngine`, `judge`, `audit`), as it was |
| `js/claims.js` | the six canonical standing predicates and the claims registry |
| `js/drawing-set.js` | the set: frames, title blocks, seal, FIG. 1, the adjustable edge, the atlas, DS-01..05, worker registration |
| `sw.js`, `deploy.paths`, `generate-integrity.sh`, `css/cytherai.css`, `pages/brief.html`, `vaic/cytherai-obligations.v1.json` | the files the snapshot's verifiers and page read, as they were |
| `tools/test-drawing-set.js` | the object, its edge and limits (−3 admitted · −4 ARG RANGE · +2 CROSSES), the atlas |
| `tools/test-claims.js` | the six-claim suite summary law |
| `tools/test-boundary.js` | the boundary engine's laws, as they were |
| `tools/test-projection.py`, `tools/test-projection.js`, `tools/project-manifest.py`, `tools/project-obligations.py` | the manifest projection laws and the Sheet 7 projection |
| `tools/test-site.py`, `tools/test-api.py`, `tools/vaic_validate.py` | as they stood: the site contract, the API inventory, the validator |
| `verify.sh` | runs the drawing set's laws against this snapshot |

## The obligations it carried

`vaic/cytherai-obligations.v1.json` was written against this set: nine obligations carried
forward from instrument-v1 and re-bound to its surfaces, ten superseded with instrument-v1. Its
receipts — the automated claims and site receipts, and the Chrome observations that bound
CY-SEM-001/002 — were produced by the verifiers and pages here. Whether each obligation binds
the front door that superseded it is the next corpus's transition to say, never this
directory's.

## Running the laws

```sh
backup/drawing-set-v1/verify.sh
```

All pass against the snapshot as of retirement (2026-10-04). The page can be opened from a
static server at `/backup/drawing-set-v1/index.html`; its SRI attributes name the snapshot's own
modules, so it runs as it did, minus the service worker.
