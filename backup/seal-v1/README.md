# seal-v1 — the Cyther Seal, retired

The mark every page, icon and social card carried from 2026-10-13 until 2026-11-21: a path computed from SHA-256 of the word
`CytherAI`, a constrained walk on a 6×6 grid (77 proposals, 29 admitted, 48 refused), adopted from the owner's identity draft
(`cyther-seal-identity.html`, kept outside the repository). It was replaced by the CytherAI mark (`tools/render-mark.py`, from
the owner's sheet *A mark that counts itself*), and everything it produced moved here at the paths it had:
`tools/render-seal.py`, `icon.svg`, `favicon.ico`, `assets/icons/icon-{180,192,512,512-maskable}.png`, and the four cards whose
lockup was the seal beside the typed wordmark (`assets/og/og-card.jpg`, `og-card-ar.jpg`, `og-card-flat.png`,
`og-card-flat-ar.png`). Their receipts (IMG-009, IMG-019, IMG-020, IMG-017, IMG-018) stand in `docs/asset-promotion-log.md`
with their output paths moved here, and `tools/test-assets.py` still verifies these bytes against them. The corpus declares
this directory an archive (`tools/vaic_validate.py`), so a record that names `tools/render-seal.py` resolves here. Nothing
here is served.

`tools/render-seal.py` is kept as it was. It imports `pngout` from its own directory, which this snapshot does not carry, so it
does not run here as it stands.
