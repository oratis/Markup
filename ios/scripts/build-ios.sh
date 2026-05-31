#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# build-ios.sh — iOS build helper (ported from luddi).
#
# iOS builds go through EAS (cloud) so we never maintain local certs/profiles.
# Native SwiftUI app → EAS *custom build* (xcodebuild on the EAS macOS worker).
#
#   simulator   —  cloud simulator .app (no signing)     profile: preview-simulator
#   production  —  cloud App Store .ipa  → eas submit     profile: production
#
# Prereqs:
#   1) Expo login:   eas login            (owner: hakkoai)
#   2) Apple creds:  eas credentials       (first time — EAS manages signing)
#   3) Apple Developer Program membership ($99/yr)
#
# Usage:
#   ./scripts/build-ios.sh                 # default: production
#   ./scripts/build-ios.sh simulator
#   ./scripts/build-ios.sh production --auto-submit   # build then eas submit
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$IOS_DIR"

MODE="${1:-production}"
EXTRA_ARGS=("${@:2}")

case "$MODE" in
  simulator)  PROFILE="preview-simulator" ;;
  production) PROFILE="production" ;;
  -h|--help|help) sed -n '2,22p' "$0"; exit 0 ;;
  *) echo "✗ Unknown mode: $MODE  (use: simulator | production)" >&2; exit 1 ;;
esac

EAS=(npx --yes eas-cli)

if ! "${EAS[@]}" whoami >/dev/null 2>&1; then
  echo "✗ Not logged in to Expo. Run: eas login   (owner: hakkoai)" >&2
  exit 1
fi

echo "==> iOS build  (mode: $MODE · profile: $PROFILE · build #$(./scripts/derive-build-number.sh))"
"${EAS[@]}" build --platform ios --profile "$PROFILE" --non-interactive
echo "✓ Build submitted — watch: https://expo.dev/accounts/hakkoai/projects/markup/builds"

AUTO_SUBMIT=0
for arg in "${EXTRA_ARGS[@]:-}"; do [[ "$arg" == "--auto-submit" ]] && AUTO_SUBMIT=1; done
if [[ "$MODE" == "production" && $AUTO_SUBMIT -eq 1 ]]; then
  echo "==> eas submit --latest"
  "${EAS[@]}" submit --platform ios --latest --non-interactive
  echo "✓ Submitted to App Store Connect. Promote to external testing:"
  echo "    python3 scripts/add-to-external-testing.py"
fi
