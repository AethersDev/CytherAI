#!/bin/sh
# Publish the artifact: build dist/ from the allowlist and push its contents as the
# gh-pages branch of origin, which GitHub Pages serves at cytherai.com (CNAME).
#
# What it refuses, and why:
#   · a served file with uncommitted changes — the origin would carry bytes no commit
#     records; the build identity would name a state nobody can check out;
#   · a HEAD that is not on the canonical lineage (master) — merging is the act of
#     admission, and the public origin serves admitted states only;
#   · a failing ./verify.sh — the artifact must be the one the corpus was stamped for.
#
# Pages sets Cache-Control: max-age=600 on every response and cannot serve the no-cache
# the contract asks for sw.js and index.html (docs/deploy.md §2, §7); the worker installs
# one build or nothing, so a stale HTTP cache costs a reader at most ten minutes, never a
# half-installed build. The gh-pages history is a single commit per publish — the branch
# is an artifact, not a record; the record is this repository.
#
# POSIX/BSD. Run from anywhere: ./publish.sh

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
CANONICAL_REF=refs/heads/master

dirty=$(git status --porcelain -- $(cat deploy.paths) deploy.paths)
[ -z "$dirty" ] || { echo "[publish] REFUSED: served files with uncommitted changes:"; echo "$dirty"; exit 1; }
git merge-base --is-ancestor HEAD "$CANONICAL_REF" || {
    echo "[publish] REFUSED: HEAD $(git rev-parse --short HEAD) is not admitted (not reachable from $CANONICAL_REF)"; exit 1; }

./verify.sh >/dev/null || { echo "[publish] REFUSED: ./verify.sh failed"; exit 1; }
./deploy.sh

BUILD=$(sed -n 's/.*<meta name="build-hash" content="\([0-9A-F]*\)">.*/\1/p' index.html)
REMOTE=$(git remote get-url origin)
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
    commit -q -m "publish $BUILD ($(git -C "$ROOT" rev-parse --short HEAD))"
git push --force "$REMOTE" gh-pages:gh-pages
echo "[publish] $BUILD is gh-pages at $REMOTE · https://$(cat CNAME)/ serves it once Pages rebuilds"
