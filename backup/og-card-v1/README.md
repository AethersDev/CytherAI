# og-card-v1 — the derived link-preview plate, retired

The social card every page named as `og:image` from commit `88ccafb` until 2026-10-13: a density plate of the
canonical CytherAI mark (the Clifford orbit at `CytherManifest.CANON`, ink on cold paper, one lobe cobalt), DERIVED
by `render-og.py` from the manifest. It was replaced by the film's card (`tools/render-film.py`'s final frame with
the statement, `tools/render-og-film.py`) when the film became the front door. Its receipt, IMG-001, stands in
`docs/asset-promotion-log.md` with its output path moved here, and `tools/test-assets.py` still verifies these bytes
against it. Nothing here is served.

`render-og.py` is kept as it was, as the record of the method. It imports `pngout` and `canon` from its own
directory, which this snapshot does not carry, so it does not run here; copied back beside them in `tools/` it would
write `assets/og/og-card.png` and overwrite the current card.
