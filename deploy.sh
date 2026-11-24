#!/bin/sh
# Build the published artifact: dist/ contains the site and nothing else.
#
# The repo doctrine is "supersede, never erase" — backup/ is the design record
# and stays tracked. It must not reach the public origin: it carries superseded
# claims, the retired warm/gold register, older homepages and their modules, the
# engine's dev source, and backup/newC3/epoch04-preimage.txt, whose sha256 is the
# digest the retired floor printed as PREIMAGE SEALED. Publishing is therefore an
# explicit allowlist, never "upload the tree".
#
# Nothing is removed until a whole new artifact stands in the old one's place, and only what
# this script built is ever removed (the audit of 2026-11-24). Until then the destination was
# removed first: a missing source left no artifact at all, and the destination came from
# the environment (DIST), so a value inherited from another tool named what was removed.
#
# POSIX/BSD. Run from anywhere: ./deploy.sh [destination]
#   destination   where to build, for a test or a publish that must not touch ./dist

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
DIST="${1:-$ROOT/dist}"
DIST="${DIST%/}"
SUMS="$DIST.sha256"   # beside the artifact, never in it: what this script built there, a line a file, by its bytes
sums() { (cd "$1" && find . ! -type d ! -name .DS_Store -exec shasum -a 256 {} + | LC_ALL=C sort); }

# The allowlist is DECLARED ONCE, in deploy.paths, and is read by both operations
# that depend on it: this copy, and the artifact identity in tools/vaic_validate.py.
# One declaration means the shipped set and the hashed set cannot drift apart.
# EVIDENCE: artifact-source-allowlist
FILES=$(cat "$ROOT/deploy.paths")

for f in $FILES; do
    [ -f "$ROOT/$f" ] || { echo "  ERROR: allowlisted $f not found" >&2; exit 1; }
done

# The destination is this script's to replace only if it is absent or, to the byte, what this script last built
# there (the Finder's .DS_Store aside). Anything else is left whole. Until the review of 2026-11-24 an artifact was
# known by its files' names, and a directory holding only an unrelated index.html passed for one.
if [ -e "$DIST" ] || [ -L "$DIST" ]; then
    [ -d "$DIST" ] && [ ! -L "$DIST" ] && [ -f "$SUMS" ] && sums "$DIST" | cmp -s - "$SUMS" || {
        echo "  ERROR: $DIST is not, to the byte, what this script last built there, so it is left as it is." >&2
        echo "  To build there, rename it aside and run this again; what it holds stays to be looked at:  mv \"$DIST\" \"$DIST.aside\"" >&2
        exit 1; }
fi

echo "[deploy] Building $DIST"
mkdir -p "$(dirname "$DIST")"
NEW="$DIST.new.$$"
mkdir "$NEW"
trap 'rm -rf "$NEW" "$NEW.sha256"' EXIT

for f in $FILES; do
    mkdir -p "$NEW/$(dirname "$f")"
    cp "$ROOT/$f" "$NEW/$f"
done

# Every precached asset must exist in the artifact, or install fails atomically.
MISSING=0
for a in $(sed -n '/^var ASSETS = \[/,/^\];/p' "$ROOT/sw.js" | sed -n "s/.*'\([^']*\)'.*/\1/p"); do
    [ -f "$NEW/${a%%\?*}" ] || { echo "  ERROR: sw.js precaches $a, absent from the artifact" >&2; MISSING=1; }   # ?v= names the bytes, not the path
done
[ "$MISSING" -eq 0 ] || { echo "  ERROR: allowlist and sw.js ASSETS have drifted" >&2; exit 1; }

# The record must never be in the artifact, nor the AWC-OS live-MVP redirect (an ephemeral
# tunnel). The project pages ship only their reviewed set, pinned in tools/test-site.py.
for d in backup docs awc-os/live; do
    [ ! -e "$NEW/$d" ] || { echo "  ERROR: $d reached the artifact" >&2; exit 1; }
done

# Two renames, and only then is the old artifact removed: at every instant a whole artifact stands on disk, the old one
# at $DIST or beside it as $OLD. (Until the review of 2026-11-24 the old one was removed first: stopped there, neither stood.)
sums "$NEW" > "$NEW.sha256"
OLD="$DIST.old.$$"
[ ! -d "$DIST" ] || mv "$DIST" "$OLD"
mv "$NEW" "$DIST" || { [ ! -d "$OLD" ] || mv "$OLD" "$DIST"; exit 1; }
mv "$NEW.sha256" "$SUMS"
trap - EXIT
rm -rf "$OLD"

echo "[deploy] $(find "$DIST" -type f | wc -l | tr -d ' ') files · $(du -sh "$DIST" | cut -f1)"
echo "[deploy] Publish the CONTENTS of dist/ as the origin root. Headers: docs/deploy.md"
