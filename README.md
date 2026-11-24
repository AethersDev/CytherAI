# CytherAI — cytherai.com

The public site of CytherAI: a static site with no framework, package manager or build step, published by GitHub
Pages from the `gh-pages` branch. The front door is Nightfall, a film of 15.125 seconds with the statement over it as
HTML, in English (`/`) and Arabic (`/ar/`), followed by the three systems.

## Layout

| Path | Role |
|---|---|
| `index.html`, `ar/`, `contact.html`, `404.html`, `pages/` | The pages |
| `css/`, `js/`, `fonts/`, `film/`, `assets/` | What the pages load (except `js/manifest.js` and `js/instrument.js`, the record and the boundary engine, which only the tools read) |
| `adii/`, `awc-os/`, `cythercad/` | The three systems' rooms |
| `flat/` | *Both looked flat*: two steel blocks tested with optical flats, every fringe computed; its sequence, stills and the instrument's plates |
| `sw.js`, `manifest.webmanifest`, `icon.svg`, `CNAME`, `.nojekyll` | The offline worker, the app manifest, the icon, the domain |
| `deploy.paths` | The served set, one file per line: nothing else is ever published |
| `verify.sh`, `generate-integrity.sh`, `deploy.sh`, `publish.sh` | Verify, stamp, build, publish |
| `tools/` | The tests, the browser probes, the recorder, the asset generators |
| `vaic/` | The verification corpus: obligations, receipts, release dispositions |
| `docs/` | The architecture, the release contract and its record, operations, asset provenance |
| `backup/` | Everything retired, whole; indexed in `backup/README.md`. Not the place to look for how the site works today |

## Working on it

```sh
git branch master origin/main    # once, in a fresh clone: master is the admission lineage the guards walk
git fetch --unshallow            # only if the clone is shallow: the history guards refuse one
./verify.sh                      # every check that needs no browser; read-only
./deploy.sh && ruby -run -e httpd dist -p 8000    # the built site on a server that answers byte ranges, as the films need
```

`python3 -m http.server` answers no byte ranges: the films cannot seek on it, and Safari plays none. `./verify.sh` needs
nothing installed (python3, shasum, openssl, git and JavaScriptCore ship with macOS). The browser probes drive Chrome over
CDP and need one package:

```sh
python3 -m venv .venv && .venv/bin/pip install websocket-client==1.9.2    # the version the probes last ran with
```

## Changing something

How the parts fit, and what else moves when one does, is `docs/architecture.md` (its last section is a recipe per kind of
change: a page, the words, a card, the mark, the film, the passage). The working rules and their reasons are `CLAUDE.md`.

## Releasing

```sh
./generate-integrity.sh && python3 tools/vaic_restamp.py && ./verify.sh     # after any change to a served file
./deploy.sh
.venv/bin/python tools/probe-ink.py dist <dir>                              # the two observations judged before publication
.venv/bin/python tools/probe-settle.py dist <dir>
python3 tools/vaic_record.py <dir>/ink.json <dir>/settle.json "<what changed>"
# commit, merge into master (the merge admits the record), push
./publish.sh                                                                # refuses whatever is not ready, and says what
./deploy.sh && python3 tools/probe-origin.py dist <out.json> --record       # once Pages serves it; then commit that
```

The steps in full, and what each refuses, are `docs/architecture.md` (*Integrity, deployment, and offline behavior*). Whether
the stamped candidate is certified is never written down by hand: `python3 tools/vaic_validate.py` says. `docs/deploy.md`
is the contract with the host (§1 to §4, §7) and the dated record of every build (§5 onward); its older entries describe
front doors that are retired.

## Restoring, and running it

```sh
./publish.sh --restore <build>    # serve a kept artifact again; git ls-remote origin 'refs/heads/rollback/*' lists them
```

`docs/operations.md`: the host, the domain, the mailboxes, monitoring, restoring a build, and what only the owner can settle.

The site makes no external request. The repository is public on GitHub: `backup/`, the record and the history are readable
there; `deploy.paths` governs only what the origin serves.
