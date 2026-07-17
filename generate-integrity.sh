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
# substrate homepage modules + subpage stylesheet + engine stack (runner suite)
RESOURCES="css/cytherai.css js/manifest.js js/substrate.js js/claims.js js/ledger.js js/instrument.js js/site.js engine/trajectory-engine.js engine/trajectory-engine.test.js content/record.js profiles/disclosure.js js/console.js"

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
    # keep the no-JS colophon BUNDLE hash in lockstep with the meta (so it never re-rots)
    sed -i '' -E "s|(data-bundle-hash>)[^<]*(<)|\1${BUILD_HASH}\2|g" "$HTML"
    echo "  $HTML ✓"
done

echo "[integrity] Done. Build: $BUILD_HASH"
