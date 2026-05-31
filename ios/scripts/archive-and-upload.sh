#!/usr/bin/env bash
#
# Local archive → TestFlight for the native Markup iOS app.
# The fastest path to TestFlight when you're on a Mac with Xcode — no EAS needed.
#
# Prereqs:
#   - Apple Developer Program membership ($99/yr)
#   - An App Store Connect API key (.p8) with "App Manager" role
#   - The app record created in App Store Connect (bundle id com.appkon.markup.ios)
#
# Usage:
#   export ASC_KEY_ID=ABCD1234EF
#   export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   export APPLE_TEAM_ID=XXXXXXXXXX
#   export ASC_KEY_PATH=/absolute/path/AuthKey_ABCD1234EF.p8
#   ios/scripts/archive-and-upload.sh
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"          # → ios/
PROJECT="$HERE/MarkupApp/MarkupApp.xcodeproj"
EXPORT_PLIST="$HERE/MarkupApp/ExportOptions.plist"
OUT="${OUT:-$HOME/markup-build}"

: "${ASC_KEY_ID:?set ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}"
: "${APPLE_TEAM_ID:?set APPLE_TEAM_ID}"
: "${ASC_KEY_PATH:?set ASC_KEY_PATH (path to AuthKey_*.p8)}"

mkdir -p "$OUT" "$HOME/.appstoreconnect/private_keys"
cp "$ASC_KEY_PATH" "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"

echo "▸ Archiving…"
xcodebuild \
  -project "$PROJECT" \
  -scheme MarkupApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/Markup.xcarchive" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  archive

echo "▸ Exporting IPA…"
xcodebuild -exportArchive \
  -archivePath "$OUT/Markup.xcarchive" \
  -exportPath "$OUT/export" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

IPA="$(ls "$OUT/export/"*.ipa | head -1)"
echo "▸ Uploading $IPA to TestFlight…"
xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "✓ Done — check App Store Connect → TestFlight (processing takes a few minutes)."
