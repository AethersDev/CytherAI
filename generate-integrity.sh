#!/bin/bash
# ══════════════════════════════════════════════════════════════
# CytherAI Integrity Generator
# Computes SRI hashes for all CSS/JS files, then patches HTML
# files in-place with integrity attributes and build-hash meta.
#
# Usage: ./generate-integrity.sh        (run from project root)
# Dependencies: shasum, openssl, sed    (pre-installed on macOS)
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# Files to hash (paths relative to project root)
# substrate homepage modules + subpage stylesheet + the two files runner.html loads.
# The fingerprint must describe what is SERVED: a file no page requests cannot
# change what a reader receives, so it has no business moving the build hash.
RESOURCES="css/cytherai.css js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js engine/trajectory-engine.js engine/trajectory-engine.test.js"

# HTML files to patch
HTML_FILES="index.html contact.html pages/brief.html pages/privacy.html pages/security.html pages/terms.html pages/runner.html"

echo "[integrity] Computing SRI hashes..."

FINGERPRINT=""

for FILE in $RESOURCES; do
    if [ ! -f "$FILE" ]; then
        echo "  ERROR: $FILE not found" >&2
        exit 1
    fi
done

# Compute SRI for each resource and patch HTML files
for FILE in $RESOURCES; do
    HASH=$(openssl dgst -sha384 -binary "$FILE" | openssl base64 -A)
    SRI="sha384-${HASH}"
    FINGERPRINT="${FINGERPRINT}${SRI}"
    BASENAME=$(basename "$FILE")
    echo "  $FILE → ${SRI:0:24}..."

    # Patch all HTML files
    for HTML in $HTML_FILES; do
        if [ ! -f "$HTML" ]; then continue; fi
        sed -i '' -E "s|(href=\"[^\"]*${BASENAME}\"[^>]*) integrity=\"[^\"]*\"|\1 integrity=\"${SRI}\"|g" "$HTML"
        sed -i '' -E "s|(src=\"[^\"]*${BASENAME}\"[^>]*) integrity=\"[^\"]*\"|\1 integrity=\"${SRI}\"|g" "$HTML"
    done
done

# Build hash = first 16 hex chars of SHA-256 of concatenated SRI values
BUILD_HASH=$(printf '%s' "$FINGERPRINT" | openssl dgst -sha256 -hex | awk '{print $NF}' | cut -c1-16 | tr '[:lower:]' '[:upper:]')
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
