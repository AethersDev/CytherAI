#!/bin/bash
# ══════════════════════════════════════════════════════════════
# CytherAI Integrity Generator
# Computes SRI hashes for all CSS/JS files, derives the build identity from the
# canonical served-artifact manifest (every deploy.paths file), then patches HTML
# files in-place with integrity attributes and build-hash meta.
#
# Usage: ./generate-integrity.sh        (run from project root)
# Dependencies: shasum, openssl, sed    (pre-installed on macOS)
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# Files to hash (paths relative to project root)
# substrate homepage modules + subpage stylesheet. The fingerprint must describe
# what is SERVED: a file no page requests cannot change what a reader receives, so
# it has no business moving the build hash. pages/runner.html and the engine it
# loads are a developer page — linked from nowhere, not in deploy.paths, not
# precached — and carry no SRI or build stamp.
RESOURCES="css/cytherai.css js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js"

# HTML files to patch (every served page)
HTML_FILES="index.html contact.html 404.html pages/brief.html pages/privacy.html pages/security.html pages/terms.html"

echo "[integrity] Computing SRI hashes..."

for FILE in $RESOURCES; do
    if [ ! -f "$FILE" ]; then
        echo "  ERROR: $FILE not found" >&2
        exit 1
    fi
done
while IFS= read -r P; do
    [ -z "$P" ] || [ -f "$P" ] || { echo "  ERROR: deploy.paths declares $P, which is not in the tree" >&2; exit 1; }
done < deploy.paths

# Compute SRI for each resource and patch HTML files
for FILE in $RESOURCES; do
    HASH=$(openssl dgst -sha384 -binary "$FILE" | openssl base64 -A)
    SRI="sha384-${HASH}"
    BASENAME=$(basename "$FILE")
    echo "  $FILE → ${SRI:0:24}..."

    # Patch all HTML files
    for HTML in $HTML_FILES; do
        if [ ! -f "$HTML" ]; then continue; fi
        sed -i '' -E "s|(href=\"[^\"]*${BASENAME}\"[^>]*) integrity=\"[^\"]*\"|\1 integrity=\"${SRI}\"|g" "$HTML"
        sed -i '' -E "s|(src=\"[^\"]*${BASENAME}\"[^>]*) integrity=\"[^\"]*\"|\1 integrity=\"${SRI}\"|g" "$HTML"
    done
done

# Build identity = first 16 hex chars of SHA-256 of the canonical served-artifact
# manifest: one `<sha256>  <path>` line per deploy.paths entry, byte-sorted, with
# the two fields this identity is stamped INTO (the build-hash meta, the sw.js
# CACHE hash) blanked before hashing. Every served first-party byte moves it —
# HTML, the worker, assets — not only the SRI-covered resources, so one identity
# names one served candidate. tools/vaic_validate.py recomputes the same
# projection (build_identity) and rejects a stale stamp.
served_manifest() {
    LC_ALL=C sort deploy.paths | while IFS= read -r P; do
        [ -n "$P" ] || continue
        case "$P" in
            *.html) H=$(sed -E 's|(<meta name="build-hash" content=")[^"]*(">)|\1\2|' "$P" | shasum -a 256 | awk '{print $1}') ;;
            sw.js)  H=$(sed -E "s|(var CACHE = 'cytherai-substrate-)[0-9A-F]*|\1|" "$P" | shasum -a 256 | awk '{print $1}') ;;
            *)      H=$(shasum -a 256 "$P" | awk '{print $1}') ;;
        esac
        printf '%s  %s\n' "$H" "$P"
    done
}
BUILD_HASH=$(served_manifest | shasum -a 256 | awk '{print $1}' | cut -c1-16 | tr '[:lower:]' '[:upper:]')
echo "[integrity] Build hash: $BUILD_HASH"

# Patch build-hash meta tag in all HTML files
echo "[integrity] Patching HTML files..."
for HTML in $HTML_FILES; do
    if [ ! -f "$HTML" ]; then
        echo "  SKIP: $HTML not found" >&2
        continue
    fi
    sed -i '' -E "s|(<meta name=\"build-hash\" content=\")[^\"]*(\">)|\1${BUILD_HASH}\2|g" "$HTML"
    # sed is a silent no-op on a file with no such tag: an unstamped page would
    # then claim provenance it does not carry. Assert the substitution landed.
    if ! grep -q "<meta name=\"build-hash\" content=\"${BUILD_HASH}\">" "$HTML"; then
        echo "  ERROR: $HTML has no build-hash meta to stamp" >&2
        exit 1
    fi
    echo "  $HTML ✓"
done

# Stamp the service-worker cache name: new build ⇒ new cache ⇒ atomic re-install.
# Replace ONLY the hex hash: a trailing -rN (worker-logic revision at an unchanged
# build) must survive, or a logic revision would be silently un-versioned here.
sed -i '' -E "s|(var CACHE = 'cytherai-substrate-)[0-9A-F]*|\1${BUILD_HASH}|" sw.js
echo "  sw.js ✓ (CACHE cytherai-substrate-${BUILD_HASH})"

echo "[integrity] Done. Build: $BUILD_HASH"
