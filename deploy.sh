#!/bin/sh
# Build the published artifact: dist/ contains the site and nothing else.
#
# The repo doctrine is "supersede, never erase" — backup/ and newC3/ are the
# design record and stay tracked. They must not reach the public origin: they
# carry superseded claims, the retired warm/gold register, older homepages and
# their modules, the engine's dev source, and newC3/epoch04-preimage.txt, whose
# sha256 is the digest the floor prints as PREIMAGE SEALED. Publishing is
# therefore an explicit allowlist, never "upload the tree".
#
# POSIX/BSD. Run from anywhere: ./deploy.sh

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
# overridable so a test can build the artifact without touching the working tree
DIST="${DIST:-$ROOT/dist}"

# The allowlist is DECLARED ONCE, in deploy.paths, and is read by both operations
# that depend on it: this copy, and the artifact identity in tools/vaic_validate.py.
# One declaration means the shipped set and the hashed set cannot drift apart.
# EVIDENCE: artifact-source-allowlist
FILES=$(cat "$ROOT/deploy.paths")

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
for d in backup newC3 docs awc-os; do
    [ ! -e "$DIST/$d" ] || { echo "  ERROR: $d reached the artifact" >&2; exit 1; }
done

echo "[deploy] $(find "$DIST" -type f | wc -l | tr -d ' ') files · $(du -sh "$DIST" | cut -f1)"
echo "[deploy] Publish the CONTENTS of dist/ as the origin root. Headers: docs/deploy.md"
