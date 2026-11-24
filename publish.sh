#!/bin/sh
# Publish the artifact: build it from the allowlist, in a directory of this run's own, and push
# its contents as the gh-pages branch of origin, which GitHub Pages serves at cytherai.com (CNAME).
#
# What it refuses, and why:
#   · any uncommitted change to a tracked file, or a deploy.paths file git does not track
#     (untracked or ignored: deploy.sh would ship it all the same) — the origin would carry
#     bytes no commit records, or ./verify.sh would judge a verifier or a corpus no commit
#     records: either way the build would name a state nobody can check out and re-verify;
#   · a HEAD that is not on the canonical lineage (master) — merging is the act of
#     admission, and the public origin serves admitted states only;
#   · a failing ./verify.sh — the artifact must be the one the corpus was stamped for;
#   · a record with no current PASS for an obligation judged before publication (the reading
#     ink and the settled state, observed in a browser): ./verify.sh passes on any well-formed
#     record, whatever it says, so until the audit of 2026-11-24 a clean, admitted commit whose
#     browser observations had expired could be published. The origin's own obligation is
#     judged after the publish, of the live site (tools/probe-origin.py --record);
#   · a gh-pages at origin that has moved since this run fetched it: the push is leased to the
#     commit it fetched, so two publishers cannot silently replace each other's artifact.
#
# Pages sets Cache-Control: max-age=600 on every response and cannot serve the no-cache
# the contract asks for sw.js and index.html (docs/deploy.md §2, §7); the worker installs
# one build or nothing, so a stale HTTP cache costs a reader at most ten minutes, never a
# half-installed build. The gh-pages history is a single commit per publish — the branch
# is an artifact, not a record; the record is this repository. The artifact it replaces is
# kept as the branch rollback/<its build>, here and at origin, so another checkout can restore
# it: that is the rollback (docs/deploy.md §7).
#
# ./publish.sh --restore <build> serves a kept artifact again, from this checkout or any other: rollback/<build> as
# origin keeps it (or, for an artifact replaced before 2026-11-24, as this checkout does), pushed under the same lease,
# the artifact it replaces kept in its turn. It builds and verifies nothing: the bytes are the ones that were served.
#
# POSIX/BSD. Run from anywhere: ./publish.sh   ·   ./publish.sh --restore <build>

set -eu

ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"
CANONICAL_REF=refs/heads/master
REMOTE=$(git remote get-url origin)

# the artifact about to be replaced is the rollback: keep it, named by the build it serves, here and at origin
keep_outgoing() {
    git fetch -q origin gh-pages
    TIP=$(git rev-parse FETCH_HEAD)
    OUTGOING=$(git show "$TIP:index.html" | sed -n 's/.*<meta name="build-hash" content="\([0-9A-F]*\)">.*/\1/p')
    [ -n "$OUTGOING" ] || { echo "[publish] REFUSED: the live gh-pages names no build; nothing to roll back to"; exit 1; }
    git branch -f "rollback/$OUTGOING" "$TIP"
    git push -q --force "$REMOTE" "$TIP:refs/heads/rollback/$OUTGOING"
    echo "[publish] the outgoing artifact $OUTGOING is rollback/$OUTGOING, here and at origin"
}
# every push of gh-pages is leased to the commit keep_outgoing fetched: if it has moved since, someone else published
moved() {
    echo "[publish] REFUSED: gh-pages at origin is no longer $TIP, the artifact this run set out to replace: someone published since."
    echo "[publish] nothing was replaced. Look at what is live, then run this again if it should still follow."; exit 1
}

if [ "${1:-}" = --restore ]; then
    [ -n "${2:-}" ] || { echo "usage: ./publish.sh --restore <build>   (git ls-remote origin 'refs/heads/rollback/*' lists what origin keeps)"; exit 1; }
    if git fetch -q origin "refs/heads/rollback/$2" 2>/dev/null; then BACK=$(git rev-parse FETCH_HEAD)
    else BACK=$(git rev-parse --verify --quiet "refs/heads/rollback/$2") || { echo "[publish] REFUSED: no rollback/$2 at origin or here"; exit 1; }
    fi
    keep_outgoing
    git push --force-with-lease="gh-pages:$TIP" "$REMOTE" "$BACK:refs/heads/gh-pages" || moved
    echo "[publish] $2 is gh-pages at $REMOTE again · check the origin against a build of its commit (tools/probe-origin.py)"
    exit 0
fi

dirty=$(git status --porcelain --untracked-files=no)
[ -z "$dirty" ] || { echo "[publish] REFUSED: uncommitted changes:"; echo "$dirty"; exit 1; }
git ls-files --error-unmatch -- $(cat deploy.paths) >/dev/null || {
    echo "[publish] REFUSED: deploy.paths names a file no commit records (above)"; exit 1; }
git merge-base --is-ancestor HEAD "$CANONICAL_REF" || {
    echo "[publish] REFUSED: HEAD $(git rev-parse --short HEAD) is not admitted (not reachable from $CANONICAL_REF)"; exit 1; }

./verify.sh >/dev/null || { echo "[publish] REFUSED: ./verify.sh failed"; exit 1; }
GATE=$(python3 tools/vaic_validate.py --json | python3 -c 'import json, sys; s = json.load(sys.stdin); print(s["projection"], *s["projection_open"])')
[ "$GATE" = VALID ] || { echo "[publish] REFUSED: the record's projection is ${GATE%% *}; no current PASS for:${GATE#"${GATE%% *}"}"
                         echo "[publish] observe this build in a browser and record it first (tools/probe-ink.py, tools/probe-settle.py, tools/vaic_record.py)"; exit 1; }

OUT=$(mktemp -d "${TMPDIR:-/tmp}/cytherai-publish.XXXXXX")   # this run's own: two publishes from one checkout share no directory
trap 'rm -rf "$OUT"' EXIT
./deploy.sh "$OUT/site"

BUILD=$(sed -n 's/.*<meta name="build-hash" content="\([0-9A-F]*\)">.*/\1/p' index.html)
keep_outgoing
CNAME=$(cat CNAME)
cd "$OUT/site"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
    commit -q -m "publish $BUILD ($(git -C "$ROOT" rev-parse --short HEAD)), replacing $OUTGOING"
git push --force-with-lease="gh-pages:$TIP" "$REMOTE" gh-pages:gh-pages || moved
echo "[publish] $BUILD is gh-pages at $REMOTE · https://$CNAME/ serves it once Pages rebuilds"
