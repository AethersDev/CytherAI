#!/bin/sh
# The retired world's laws, run against this snapshot — the verifiers and the files they
# read are the ones committed at bf82377, the last commit in which the world was whole
# and the front door. Run from anywhere: backup/instrument-v1/verify.sh
set -eu
ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[instrument-v1] claims regression (ten claims, the world loaded)"
"$JSC" js/manifest.js js/substrate.js js/claims.js tools/test-claims.js
echo "[instrument-v1] ledger regression"
"$JSC" js/manifest.js js/ledger.js tools/test-ledger.js
echo "[instrument-v1] development trajectory law"
"$JSC" js/manifest.js js/substrate.js tools/test-develop.js
echo "[instrument-v1] exposure and reading laws"
"$JSC" js/manifest.js js/substrate.js js/claims.js tools/test-exposure.js
echo "[instrument-v1] motion and plate laws"
python3 tools/test-motion.py
echo "[instrument-v1] promoted terminal exposure"
python3 tools/test-poster.py
echo "[instrument-v1] resource policy and viewport geometry"
python3 tools/test-site.py SiteContractTests.test_performance_and_mobile_clearance_contract \
                           SiteContractTests.test_viewport_change_never_displays_a_geometrically_false_world
echo "[instrument-v1] the retired world's laws all pass against the snapshot"
