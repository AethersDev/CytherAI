# cold-paper-v1 — the capability brief, the legal pages and the 404 as served until 2026-10-21

`pages/brief.html`, `pages/privacy.html`, `pages/security.html`, `pages/terms.html`, `404.html` and the stylesheet they
shared, `css/cytherai.css`, byte for byte as the live build `502593FFB37C9DEE` served them (commit `776a7ed`), with the
three figures only they showed and the generators that drew them:

- `assets/brief/exhibit-a-boundary.svg` (IMG-003) and `assets/brief/exhibit-b-strata.png` (IMG-004), the brief's
  *FIGURE — ILLUSTRATIVE · NOT A MEASUREMENT*, from `tools/gen-exhibit-a.py` and `tools/gen-exhibit-b.py`;
- `assets/error/plate-empty.svg` (IMG-005), the 404's empty plate, from `tools/gen-empty-plate.py`.

The design was the cold-paper subpages': light paper and cobalt, system fonts, a bar of links under a scope line
(*PRIVACY · PUBLIC SURFACE*), *LEGAL* stamps, and the document register the front door had left behind (*DOC-2026-002 ·
Capability Brief*, section stamps, *EXHIBIT A*, record ids, *Disclosure: Public Surface*; the 404's *404 · No Record*,
*HTTP 404 · EMPTY PLATE*). Three laws held it in `tools/test-site.py`: the bar's links and its marked current page
(`test_public_navigation_is_complete_and_marks_current_page`), every subpage ink at 4.5:1 on every paper ground
(`test_subpage_inks_hold_aa_on_every_subpage_ground`), and the paper seal in the seal law; read them at `776a7ed`.

Superseded on 2026-10-21, at the owner's direction (*do the brief, the legal pages and the 404, then one review of
titles and link previews*), by rooms of the front door (`css/room.css`): the legal pages carry their text word for word
(only the frame changed; their visible text was compared before and after), the brief carries every fact of its two
records and its access without the document register or the figures, and the 404 says in English and Arabic that nothing
is published at the address. Their receipts stand in `docs/asset-promotion-log.md`, retired, their outputs moved here.

The pages' links are relative to their served paths (`../css/cytherai.css`, `../assets/…`), so they open from this
folder; the 404's are absolute (it was served at any depth), so open it at `776a7ed`. Not served, precached or named by
any served page.
