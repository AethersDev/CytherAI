# CytherAI — cytherai.com

The public site of CytherAI: a static site with no framework, package manager or build step, published by GitHub
Pages from the `gh-pages` branch. The front door is a twelve-second film with its sentences over it, in English (`/`)
and Arabic (`/ar/`), followed by the three systems.

## Layout

| Path | Role |
|---|---|
| `index.html`, `ar/`, `contact.html`, `404.html`, `pages/` | The pages |
| `css/`, `js/`, `fonts/`, `film/`, `assets/` | What the pages load (except `js/manifest.js` and `js/instrument.js`, the record and the boundary engine, which only the tools read) |
| `adii/`, `awc-os/` | The project pages |
| `sw.js`, `manifest.webmanifest`, `icon.svg`, `CNAME`, `.nojekyll` | The offline worker, the app manifest, the icon, the domain |
| `deploy.paths` | The served set, one file per line: nothing else is ever published |
| `verify.sh`, `generate-integrity.sh`, `deploy.sh`, `publish.sh` | Verify, stamp, build, publish |
| `tools/` | The test programs, the asset generators, the film's render scripts |
| `vaic/` | The verification corpus: obligations, receipts, release dispositions |
| `docs/` | The architecture, the release contract and its record, asset provenance |
| `backup/` | Everything retired, whole; indexed in `backup/README.md` |

## Working on it

```sh
git branch master origin/main # once, in a fresh clone: master is the admission lineage the guards walk
python3 -m http.server 8000   # serve the tree (it answers no byte ranges, so the films cannot seek)
./verify.sh                   # every check that needs no browser
```

After changing a served file: `./generate-integrity.sh`, then `python3 tools/vaic_restamp.py`, then `./verify.sh`.
The release steps and the browser checks are `docs/deploy.md`; how the parts fit, `docs/architecture.md`; the working
rules, `CLAUDE.md`. `./verify.sh` needs nothing installed (python3, shasum, openssl and JavaScriptCore ship with
macOS); the browser observations (`tools/probe-ink.py`, `tools/probe-settle.py`) drive Chrome over CDP with
`websocket-client`, in `.venv`, and `tools/probe-origin.py` checks the live origin. The site makes no external request.
The repository is public on GitHub: `backup/`, the record and the history are readable there; `deploy.paths` governs
only what the origin serves.
