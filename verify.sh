#!/bin/sh
# Reproducible zero-dependency repository verification.
# Browser-only checks (layout, service worker, the film and reading ink as rendered) remain in the
# browser matrix documented in docs/deploy.md. The retired front doors' laws run against
# their snapshots: backup/instrument-v1/verify.sh, backup/drawing-set-v1/verify.sh and
# backup/unhappened-v1/verify.sh.

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[verify] every served script parses (deploy.paths' .js, checkSyntax: parsed, not run)"
"$JSC" -e "$(sed -n 's/.*\.js$/checkSyntax("&");/p' deploy.paths)"

echo "[verify] public API inventory"
python3 tools/test-api.py

echo "[verify] boundary engine"
"$JSC" js/manifest.js js/instrument.js tools/test-boundary.js

echo "[verify] manifest projection"
python3 tools/test-projection.py

echo "[verify] site/release integration"
python3 tools/test-site.py

echo "[verify] derived asset receipts"
python3 tools/test-assets.py

echo "[verify] VAIC-0 corpus structure and fail-closed controls"
python3 tools/vaic_validate.py
python3 tools/test-vaic.py

echo "[verify] all non-browser checks pass"
