#!/bin/sh
# Build the published artifact: dist/ contains the site and nothing else.
#
# The repo doctrine is "supersede, never erase" — backup/, newC3/ and
# trajectory-engine/ are the design record and stay tracked. They must not
# reach the public origin: they carry superseded claims, the retired warm/gold
# register, an older homepage, and newC3/epoch04-preimage.txt, whose sha256 is
# the digest the floor prints as PREIMAGE SEALED. Publishing is therefore an
# explicit allowlist, never "upload the tree".
#
# POSIX/BSD. Run from anywhere: ./deploy.sh

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
DIST="$ROOT/dist"

# The allowlist. Adding a page means adding it HERE and to sw.js ASSETS.
FILES="index.html
contact.html
pages/brief.html
pages/privacy.html
pages/security.html
pages/terms.html
pages/runner.html
js/manifest.js
js/substrate.js
js/claims.js
js/ledger.js
js/instrument.js
js/site.js
css/cytherai.css
engine/trajectory-engine.js
engine/trajectory-engine.test.js
sw.js
manifest.webmanifest
icon.svg"

# content/record.js, profiles/disclosure.js and js/console.js are deliberately
# absent: no page loads them. They stay on disk for the separate engine project.

echo "[deploy] Building $DIST"
rm -rf "$DIST"

for f in $FILES; do
    [ -f "$ROOT/$f" ] || { echo "  ERROR: allowlisted $f not found" >&2; exit 1; }
    mkdir -p "$DIST/$(dirname "$f")"
    cp "$ROOT/$f" "$DIST/$f"
done

# Every precached asset must exist in the artifact, or install fails atomically.
MISSING=0
for a in $(sed -n '/^var ASSETS = \[/,/^\];/p' "$ROOT/sw.js" | sed -n "s/.*'\([^']*\)'.*/\1/p"); do
    [ -f "$DIST/$a" ] || { echo "  ERROR: sw.js precaches $a, absent from the artifact" >&2; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { echo "  ERROR: allowlist and sw.js ASSETS have drifted" >&2; exit 1; }

# The record must never be in the artifact.
for d in backup newC3 trajectory-engine docs awc-os; do
    [ ! -e "$DIST/$d" ] || { echo "  ERROR: $d reached the artifact" >&2; exit 1; }
done

echo "[deploy] $(find "$DIST" -type f | wc -l | tr -d ' ') files · $(du -sh "$DIST" | cut -f1)"
echo "[deploy] Publish the CONTENTS of dist/ as the origin root. Headers: docs/deploy.md"
