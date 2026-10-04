#!/bin/sh
# The retired drawing set's laws, run against this snapshot — the verifiers and the files they
# read are the ones committed at 99b167a, the last commit in which the drawing set was whole
# and the front door. Run from anywhere: backup/drawing-set-v1/verify.sh
set -eu
ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[drawing-set-v1] modules parse"
for file in js/manifest.js js/instrument.js js/claims.js js/drawing-set.js; do "$JSC" "$file"; done
echo "[drawing-set-v1] claims regression (the six canonical claims)"
"$JSC" js/manifest.js js/claims.js tools/test-claims.js
echo "[drawing-set-v1] boundary engine"
"$JSC" js/manifest.js js/instrument.js tools/test-boundary.js
echo "[drawing-set-v1] the drawing set — the object, its edge, the claims split"
"$JSC" js/manifest.js js/instrument.js js/claims.js js/drawing-set.js tools/test-drawing-set.js
echo "[drawing-set-v1] manifest projection and the Sheet 7 disclosure"
python3 tools/test-projection.py
echo "[drawing-set-v1] the retired drawing set's laws all pass against the snapshot"
