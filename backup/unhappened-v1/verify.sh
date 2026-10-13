#!/bin/sh
# THE UNHAPPENED's laws, run against this snapshot — the verifiers and the files they read are the
# ones committed at 011ffd0, the last commit in which THE UNHAPPENED was whole and the front door.
# Run from anywhere: backup/unhappened-v1/verify.sh
set -eu
ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

echo "[unhappened-v1] modules parse"
for file in js/manifest.js js/instrument.js js/trace.js js/unhappened.js; do "$JSC" "$file"; done
echo "[unhappened-v1] boundary engine"
"$JSC" js/manifest.js js/instrument.js tools/test-boundary.js
echo "[unhappened-v1] TRACE-1 — the Cyther Trace grammar"
"$JSC" js/manifest.js js/instrument.js js/trace.js tools/test-trace.js
echo "[unhappened-v1] manifest projection"
python3 tools/test-projection.py
echo "[unhappened-v1] THE UNHAPPENED's laws all pass against the snapshot"
