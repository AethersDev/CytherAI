# backup/ — the record

Everything the site no longer uses lives here, whole: nothing is served, precached or loaded by a served page, and
`deploy.sh` refuses any of it in the artifact. Supersede, never erase: retire into this directory, do not delete.

| Path | What it is |
|---|---|
| `instrument-v1/` | The substrate front door, whole, with the verifiers that established its laws (commit `9d6cbdb`); its own README and `verify.sh` |
| `drawing-set-v1/` | The drawing set, whole (commit `c921f00`); its own README and `verify.sh` |
| `unhappened-v1/` | THE UNHAPPENED, whole (commit `011ffd0`); its own README and `verify.sh` |
| `drawing-set-demo.html` | The demo the drawing set was approved from; it loads `drawing-set-v1/`'s modules |
| `PRODUCTION_PLAN.md` | The build spec of instrument-v1 (phases P1–P9) |
| `newC3/` | The design record before instrument-v1: concept prototypes → synthesis rev5 → substrate-demo, and the epoch-04 preimage |
| `prototype/` | The homepage design studies (`crossing/`, `glass/`, `section/`, `research/`), THE UNHAPPENED v1, v2 and v4, and the comparison harness (`compare/`) |
| `graphite-v2/` | The older engine-backed homepage, with the three modules only it loaded |
| `dossier-v3/` | The old shared subpage CSS and the dossier modules |
| `brand-studies/` | The identity and dossier drafts of July 2026 (commit `517070b`) |
| `icon-v1/`, `og-card-v1/` | The orbit icon family and social plate, with their generators (replaced by the Cyther Seal and the film's card, 2026-10-13) |
| `project-pages/` | The ADII and AWC-OS pages as first published, before curation |
| `awc-os-v1/` | The AWC-OS page, its script, its two films and its competition deck as served until 2026-10-19, when the Alinma plan was cancelled: the films then lost their closing production line and the deck left the site; its own README |
| `exception-v1/` | THE EXCEPTION, published at `/exception/` from 2026-10-04 to 2026-10-16: the page, the two modules as it loaded them (their integrity holds), its fonts with their licence, the icon |
| `audit/` | The instrument-v1 audit record, 00–08 |
| `trajectory-engine/` | The engine's `-v2.js` dev source, its prototypes, the v-next design map, and its last source with the browser suite (`engine/`, `pages/runner.html`) |

The three retired front doors' laws run against their snapshots: `backup/<name>/verify.sh`. The engine's suite runs
in a browser from `trajectory-engine/pages/runner.html`, and THE EXCEPTION from `exception-v1/exception/`, each
served from the repository root.

## Moved here on 2026-10-16

The repository was reorganized so its root holds only the site, its release tooling and its docs. Every move was a
rename, the bytes unchanged (`git log --follow` crosses it). Older records cite the old paths, which were true when
they were written: `docs/deploy.md`, the audit record, the snapshots' READMEs and the evidence ledger. Resolve them
here.

| Was | Now |
|---|---|
| `PRODUCTION_PLAN.md` | `backup/PRODUCTION_PLAN.md` |
| `newC3/` | `backup/newC3/` |
| `prototype/<study>/` | `backup/prototype/<study>/` |
| `engine/` | `backup/trajectory-engine/engine/` |
| `pages/runner.html` | `backup/trajectory-engine/pages/runner.html` |
| `backup/<draft>.html` (seven identity and dossier drafts) | `backup/brand-studies/<draft>.html` |
| `backup/lambda-crown-brand-system 2.html` | `backup/brand-studies/lambda-crown-brand-system-2.html` |
| `docs/audit/` | `backup/audit/` |
| `exception/` (retired, with copies of `js/manifest.js` and `js/instrument.js` as it loaded them) | `backup/exception-v1/exception/` |

The studies reached the live site by relative links from `prototype/` (`../../pages/…`, `../../js/…`); to run one as
it was, check out its last commit before the move. `prototype/compare/v3.html` also loaded the owner's untracked
`prototype/unhappened-3/`, which was never committed; it lives with the owner's other studies, outside the
repository.
