#!/bin/sh
# Reproducible zero-dependency repository verification.
# Browser-only checks (engine runner, layout, service worker) remain in the
# browser matrix documented in docs/deploy.md.

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[verify] homepage modules parse"
for file in js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js; do
    "$JSC" "$file"
done

echo "[verify] claims regression"
"$JSC" js/manifest.js js/substrate.js js/claims.js tools/test-claims.js

echo "[verify] ledger regression"
"$JSC" js/manifest.js js/ledger.js tools/test-ledger.js

echo "[verify] development trajectory law"
"$JSC" js/manifest.js js/substrate.js tools/test-develop.js

echo "[verify] exposure and reading laws"
"$JSC" js/manifest.js js/substrate.js js/claims.js tools/test-exposure.js

echo "[verify] site/release integration"
python3 tools/test-site.py

echo "[verify] motion and plate laws"
python3 tools/test-motion.py

echo "[verify] promoted terminal exposure"
python3 tools/test-poster.py

echo "[verify] VAIC-0 corpus structure and fail-closed controls"
python3 tools/vaic_validate.py
python3 tools/test-vaic.py

echo "[verify] all non-browser checks pass"
