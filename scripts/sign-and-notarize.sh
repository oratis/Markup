#!/usr/bin/env bash
#
# Spike 0.4: sign + notarize a release build of Markup.
#
# This script does NOT run automatically. It needs interactive input the
# first time (Apple ID app-specific password). Run it manually after the
# release build finishes:
#
#   ./scripts/sign-and-notarize.sh
#
# Prereqs (do these once, in order):
#  1. Enroll in Apple Developer Program ($99/yr) — already done.
#  2. In https://developer.apple.com/account/resources/certificates/list,
#     create a "Developer ID Application" certificate. Download the .cer,
#     double-click it to import into "login" keychain.
#  3. Find your TEAM_ID at https://developer.apple.com/account, top right.
#  4. Generate an app-specific password at https://appleid.apple.com →
#     "Sign-In and Security" → "App-Specific Passwords". Name it
#     "markup-notarize". Copy the password (xxxx-xxxx-xxxx-xxxx).
#  5. Run this once to store credentials in keychain (skip if already done):
#       xcrun notarytool store-credentials "AC_PASSWORD" \
#         --apple-id "wangharp@gmail.com" \
#         --team-id "<YOUR_TEAM_ID>" \
#         --password "<APP_SPECIFIC_PASSWORD>"
#
# Then this script can be run unattended.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

. "$HOME/.cargo/env"

# ---- 1. Build the release artifact ----
echo "==> Building release..."
pnpm tauri build --target x86_64-apple-darwin

# Locate artifacts
APP_PATH="src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Markup.app"
DMG_DIR="src-tauri/target/x86_64-apple-darwin/release/bundle/dmg"
DMG_PATH="$(ls -t "$DMG_DIR"/*.dmg 2>/dev/null | head -1 || true)"

if [ ! -d "$APP_PATH" ]; then
  echo "ERROR: $APP_PATH not found — build failed?"
  exit 1
fi

# ---- 2. Find signing identity ----
SIGNING_ID="${MARKUP_SIGNING_ID:-}"
if [ -z "$SIGNING_ID" ]; then
  SIGNING_ID="$(security find-identity -v -p codesigning | grep 'Developer ID Application' | head -1 | sed -E 's/.*\) ([A-F0-9]+) "(.+)"/\2/')"
fi

if [ -z "$SIGNING_ID" ]; then
  echo "ERROR: no Developer ID Application certificate found in keychain."
  echo "Download from https://developer.apple.com/account/resources/certificates"
  echo "or set MARKUP_SIGNING_ID env var manually."
  exit 1
fi
echo "==> Signing identity: $SIGNING_ID"

# ---- 3. (Re-)sign the .app with hardened runtime ----
echo "==> Signing $APP_PATH..."
codesign --force --deep --options runtime \
  --entitlements src-tauri/Entitlements.plist \
  --sign "$SIGNING_ID" \
  --timestamp \
  "$APP_PATH"

# ---- 4. Verify ----
echo "==> Verifying signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
spctl --assess --type execute --verbose "$APP_PATH" || true

# ---- 5. Submit for notarization ----
if [ -z "$DMG_PATH" ]; then
  echo "WARN: no DMG found; notarizing the .app directly via zip"
  ZIP_PATH="$(mktemp -d)/Markup.zip"
  /usr/bin/ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"
  TARGET="$ZIP_PATH"
else
  echo "==> Will notarize: $DMG_PATH"
  TARGET="$DMG_PATH"
fi

echo "==> Submitting to notarytool (may take 5-15 min)..."
xcrun notarytool submit "$TARGET" \
  --keychain-profile "AC_PASSWORD" \
  --wait

# ---- 6. Staple ----
if [ -n "$DMG_PATH" ]; then
  echo "==> Stapling DMG..."
  xcrun stapler staple "$DMG_PATH"
fi
echo "==> Stapling .app..."
xcrun stapler staple "$APP_PATH"

# ---- 7. Final verify ----
echo "==> Final spctl assessment..."
spctl --assess --type execute --verbose=2 "$APP_PATH"

echo
echo "✓ Done. Artifacts:"
echo "    $APP_PATH"
[ -n "$DMG_PATH" ] && echo "    $DMG_PATH"
