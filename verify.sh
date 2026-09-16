#!/bin/sh
# Reproducible zero-dependency repository verification.
# Browser-only checks (layout, service worker, the seal and FIG. 1 as rendered) remain
# in the browser matrix documented in docs/deploy.md. The retired world's laws run
# against their snapshot with backup/instrument-v1/verify.sh.

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[verify] homepage modules parse"
for file in js/manifest.js js/instrument.js js/claims.js js/drawing-set.js; do
    "$JSC" "$file"
done

echo "[verify] public API inventory"
python3 tools/test-api.py

echo "[verify] claims regression"
"$JSC" js/manifest.js js/claims.js tools/test-claims.js

echo "[verify] boundary engine"
"$JSC" js/manifest.js js/instrument.js tools/test-boundary.js

echo "[verify] drawing set — the object, its edge, the claims split"
"$JSC" js/manifest.js js/instrument.js js/claims.js js/drawing-set.js tools/test-drawing-set.js

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
