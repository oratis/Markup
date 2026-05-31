#!/usr/bin/env bash
#
# Derive a monotonic iOS build number (CFBundleVersion) from the marketing
# version (CFBundleShortVersionString), so the build number is never
# hand-maintained. Ported from luddi's app.config.ts buildNumber().
#
#   build = MAJOR*100000 + MINOR*1000 + PATCH*10 + SUB + IOS_BUILD_BUMP
#   0.1.0 → 1000 · 0.1.1 → 1010 · 0.2.0 → 2000 · 1.0.0 → 100000
#
# Source of truth = MARKETING_VERSION in the Xcode target (or override via
# MARKETING_VERSION_OVERRIDE). IOS_BUILD_BUMP (default 0) lets a retry rebuild
# the same semver with a fresh build number — Apple rejects duplicates.
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"            # → ios/
PBXPROJ="$HERE/MarkupApp/MarkupApp.xcodeproj/project.pbxproj"

VERSION="${MARKETING_VERSION_OVERRIDE:-$(grep -m1 'MARKETING_VERSION = ' "$PBXPROJ" | sed -E 's/.*= ([0-9.]+);/\1/')}"

IFS='.' read -r M m p s <<EOF
$VERSION
EOF
M=${M:-0}; m=${m:-0}; p=${p:-0}; s=${s:-0}

if [ "$m" -ge 100 ] || [ "$p" -ge 100 ] || [ "$s" -ge 10 ]; then
  echo "version segment overflow: $VERSION (minor/patch < 100, sub < 10)" >&2
  exit 1
fi

echo $(( M * 100000 + m * 1000 + p * 10 + s + ${IOS_BUILD_BUMP:-0} ))
