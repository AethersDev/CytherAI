# unhappened-v1 — THE UNHAPPENED, whole

This directory is the CytherAI homepage as it stood from 2026-10-04, when THE UNHAPPENED replaced
the drawing set, until 2026-10-12, when the film became the front door. It is a verbatim snapshot of
commit `011ffd0` — the last commit in which THE UNHAPPENED was complete and served at `/` — of every
file it was made of and every verifier that established its laws. Nothing here is served, precached
or fingerprinted. Nothing here is to be edited: the snapshot is the record of what THE UNHAPPENED
was, and the receipts in `vaic/cytherai-obligations.v2.json` that cite its files resolve through it
(`tools/vaic_validate.py`, `RETIRED` / `ARCHIVES`).

It is preserved as history, not kept as a component library. The pane, the beads, the Cyther Trace,
the shadows and the porcelain were the design expression of a live boundary engine judging in the
browser; none of them is carried into the front door that superseded it.

## What THE UNHAPPENED was

A pane of glass over an empty floor, rendered in WebGL2. Every bead was one proposed operation judged
in the browser by `CytherInstrument.biEngine` as it struck the pane: refused (it ceased, a cobalt
ghost flashed and the pane kept a Cyther Trace, TRACE-1), accepted (it crossed, still black, into a
candidate profile with no consequence) or admitted (its profile landed on the floor as a hard shadow
and porcelain extruded from it). Ten scenes carried the copy; scenes 4–7 named CytherCAD, ADII,
AWC-OS and SijilOS with the condition each claim held under. When nothing was changing nothing
rendered (`settled()`); a visitor's drag seeded their own proposer, replayable from `#trace=`. Its
design record is the root `CLAUDE.md` as it stood at `011ffd0` (`git show 011ffd0:CLAUDE.md`) and
`prototype/unhappened-4/`, the version promoted on 2026-10-04.

| Path | What it is |
|---|---|
| `index.html` | the ten scenes, the HUD, the no-WebGL cover, inline visual system |
| `js/manifest.js` | the public manifest and derivation, as it was at the snapshot |
| `js/instrument.js` | the boundary engine (`biEngine`, `judge`, `audit`), as it was |
| `js/trace.js` | TRACE-1, the Cyther Trace: one drawing of a receipt (`code` → GLSL, `svg`) |
| `js/unhappened.js` | the studio: the world, the bays, the GPU passes, the story, the readout, `settled`/`wake`, worker registration |
| `sw.js`, `deploy.paths`, `generate-integrity.sh`, `pages/brief.html`, `vaic/cytherai-obligations.v2.json` | the files the snapshot's verifiers and page read, as they were |
| `tools/test-trace.js` | TRACE-1's grammar, pinned |
| `tools/test-boundary.js` | the boundary engine's laws, as they were |
| `tools/test-projection.py`, `tools/project-manifest.py` | the manifest projection laws, with the front door's two marks |
| `tools/test-site.py`, `tools/test-api.py`, `tools/vaic_validate.py` | as they stood: the site contract (scene/section parity, module order, the take-over message), the API inventory, the validator |
| `verify.sh` | runs THE UNHAPPENED's laws against this snapshot |

## The obligations it carried

`vaic/cytherai-obligations.v2.json` was written against it: five obligations carried forward from
the drawing set and re-bound to its surfaces (reading ink over the studio, the artifact allowlist,
the settled halt, motion corresponding to the engine's transitions, the origin), fourteen
superseded. Its receipts — the automated site receipts, the Chrome observations of reading ink and
of the settled halt, and the origin closure — were produced against the pages here. Whether each
obligation binds the front door that superseded it is the next corpus's transition to say, never
this directory's.

## Running the laws

```sh
backup/unhappened-v1/verify.sh
```

All pass against the snapshot as of retirement (2026-10-12). The page can be opened from a static
server at `/backup/unhappened-v1/index.html`; its SRI attributes name the snapshot's own modules.
Its type is loaded from `adii/fonts/` relative to the page, which the snapshot does not carry, so it
falls back to system type there.
