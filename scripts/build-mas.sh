#!/usr/bin/env bash
#
# Build a Mac App Store .pkg for Markup.
#
# This is the MAS counterpart to scripts/sign-and-notarize.sh (which is for
# the direct/notarized DMG). MAS is different: the app runs sandboxed, is
# signed with an *Apple Distribution* cert + an embedded provisioning
# profile, packaged with `productbuild` signed by a *Mac Installer
# Distribution* cert, and uploaded to App Store Connect (NOT notarized —
# the store reviews instead).
#
# PREREQUISITES (you do these once, see docs/app-store/MAS-publishing-plan.md §2):
#   1. Apple Developer Program active on the account.
#   2. App ID registered (App Sandbox capability) — matches the bundle id.
#   3. Three certs installed in the login keychain:
#        - "Apple Distribution: NAME (TEAMID)"
#        - "3rd Party Mac Developer Installer: NAME (TEAMID)"
#   4. A Mac App Store provisioning profile downloaded for the App ID.
#
# REQUIRED ENV:
#   MAS_APP_IDENTITY        e.g. "Apple Distribution: Foo (TEAMID)"
#   MAS_INSTALLER_IDENTITY  e.g. "3rd Party Mac Developer Installer: Foo (TEAMID)"
#   MAS_PROFILE             absolute path to the .provisionprofile
#
# USAGE:
#   MAS_APP_IDENTITY="Apple Distribution: …" \
#   MAS_INSTALLER_IDENTITY="3rd Party Mac Developer Installer: …" \
#   MAS_PROFILE="$HOME/markup_mas.provisionprofile" \
#   ./scripts/build-mas.sh
#
# OUTPUT: src-tauri/target/release/bundle/macos/Markup.pkg  (upload via
#   Transporter.app or `xcrun altool --upload-app -f Markup.pkg -t macos …`).

set -euo pipefail

cd "$(dirname "$0")/.."

: "${MAS_APP_IDENTITY:?set MAS_APP_IDENTITY (Apple Distribution cert)}"
: "${MAS_INSTALLER_IDENTITY:?set MAS_INSTALLER_IDENTITY (3rd Party Mac Developer Installer cert)}"
: "${MAS_PROFILE:?set MAS_PROFILE (path to .provisionprofile)}"

if [ ! -f "$MAS_PROFILE" ]; then
  echo "::error:: provisioning profile not found: $MAS_PROFILE" >&2
  exit 1
fi

# Universal (arm64 + x86_64). MAS requires Intel support unless the deployment
# target is macOS 12+ (ours is 10.15), so `tauri --target universal-apple-darwin`
# lipos both arches into one bundle; output lands under target/universal-apple-darwin/.
APP="src-tauri/target/universal-apple-darwin/release/bundle/macos/Markup.app"
ENTITLEMENTS="src-tauri/Entitlements.mas.plist"
PKG="src-tauri/target/universal-apple-darwin/release/bundle/macos/Markup.pkg"

echo "==> 1/5 Building sandboxed universal app (VITE_MARKUP_MAS=1, MAS entitlements)"
# Both arches must be present for the universal build — no-op if already added;
# works locally and on CI (rustup manages the toolchain in both).
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null 2>&1 || true
# --bundles app: we package the .pkg ourselves after signing.
# --config layers the MAS entitlements over tauri.conf.json.
VITE_MARKUP_MAS=1 pnpm tauri build \
  --target universal-apple-darwin \
  --bundles app \
  --config src-tauri/tauri.mas.conf.json

[ -d "$APP" ] || { echo "::error:: $APP missing — build failed" >&2; exit 1; }

echo "==> 2/5 Embedding provisioning profile"
cp "$MAS_PROFILE" "$APP/Contents/embedded.provisionprofile"

echo "==> 3/5 Signing nested code, then the app (Apple Distribution + sandbox entitlements)"
# Sign inner binaries/frameworks first (inside-out), then the bundle.
# Tauri's bundle has no Contents/Frameworks when tauri.conf.json sets
# "frameworks": [] — guard the find so a missing dir doesn't trip
# `set -o pipefail` (find exits non-zero on a nonexistent path).
if [ -d "$APP/Contents/Frameworks" ]; then
  find "$APP/Contents/Frameworks" -type f \( -name "*.dylib" -o -perm -111 \) 2>/dev/null | while read -r f; do
    codesign --force --timestamp --options runtime \
      --sign "$MAS_APP_IDENTITY" "$f" || true
  done
fi
codesign --force --timestamp \
  --entitlements "$ENTITLEMENTS" \
  --sign "$MAS_APP_IDENTITY" \
  "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "==> 4/5 Building installer package (productbuild + installer cert)"
rm -f "$PKG"
productbuild \
  --component "$APP" /Applications \
  --sign "$MAS_INSTALLER_IDENTITY" \
  "$PKG"

echo "==> 5/5 Done"
echo "    Package: $PKG"
echo ""
echo "Next: upload to App Store Connect, then submit for review:"
echo "  • Transporter.app  (drag $PKG in), or"
echo "  • xcrun altool --upload-app -f \"$PKG\" -t macos \\"
echo "        --apple-id YOUR_APPLE_ID --password APP_SPECIFIC_PASSWORD"
echo "  (a matching app record + Free price tier must already exist —"
echo "   see docs/app-store/MAS-publishing-plan.md §2.4)"
