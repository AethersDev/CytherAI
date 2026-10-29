#!/bin/sh
# Publish the artifact: build dist/ from the allowlist and push its contents as the
# gh-pages branch of origin, which GitHub Pages serves at cytherai.com (CNAME).
#
# What it refuses, and why:
#   · any uncommitted change to a tracked file, or a deploy.paths file git does not track
#     (untracked or ignored: deploy.sh would ship it all the same) — the origin would carry
#     bytes no commit records, or ./verify.sh would judge a verifier or a corpus no commit
#     records: either way the build would name a state nobody can check out and re-verify;
#   · a HEAD that is not on the canonical lineage (master) — merging is the act of
#     admission, and the public origin serves admitted states only;
#   · a failing ./verify.sh — the artifact must be the one the corpus was stamped for.
#
# Pages sets Cache-Control: max-age=600 on every response and cannot serve the no-cache
# the contract asks for sw.js and index.html (docs/deploy.md §2, §7); the worker installs
# one build or nothing, so a stale HTTP cache costs a reader at most ten minutes, never a
# half-installed build. The gh-pages history is a single commit per publish — the branch
# is an artifact, not a record; the record is this repository. The artifact it replaces is
# kept as the local branch rollback/<its build>: that is the rollback (docs/deploy.md §7).
#
# POSIX/BSD. Run from anywhere: ./publish.sh

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
CANONICAL_REF=refs/heads/master
unset DIST   # deploy.sh's test override: the artifact built is the one pushed, ./dist

dirty=$(git status --porcelain --untracked-files=no)
[ -z "$dirty" ] || { echo "[publish] REFUSED: uncommitted changes:"; echo "$dirty"; exit 1; }
git ls-files --error-unmatch -- $(cat deploy.paths) >/dev/null || {
    echo "[publish] REFUSED: deploy.paths names a file no commit records (above)"; exit 1; }
git merge-base --is-ancestor HEAD "$CANONICAL_REF" || {
    echo "[publish] REFUSED: HEAD $(git rev-parse --short HEAD) is not admitted (not reachable from $CANONICAL_REF)"; exit 1; }

./verify.sh >/dev/null || { echo "[publish] REFUSED: ./verify.sh failed"; exit 1; }
./deploy.sh

BUILD=$(sed -n 's/.*<meta name="build-hash" content="\([0-9A-F]*\)">.*/\1/p' index.html)
REMOTE=$(git remote get-url origin)
# the artifact about to be replaced is the rollback: keep it, named by the build it serves
git fetch -q origin gh-pages
OUTGOING=$(git show FETCH_HEAD:index.html | sed -n 's/.*<meta name="build-hash" content="\([0-9A-F]*\)">.*/\1/p')
[ -n "$OUTGOING" ] || { echo "[publish] REFUSED: the live gh-pages names no build; nothing to roll back to"; exit 1; }
git branch -f "rollback/$OUTGOING" FETCH_HEAD
echo "[publish] the outgoing artifact $OUTGOING is rollback/$OUTGOING"
CNAME=$(cat CNAME)
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
    commit -q -m "publish $BUILD ($(git -C "$ROOT" rev-parse --short HEAD))"
git push --force "$REMOTE" gh-pages:gh-pages
echo "[publish] $BUILD is gh-pages at $REMOTE · https://$CNAME/ serves it once Pages rebuilds"
