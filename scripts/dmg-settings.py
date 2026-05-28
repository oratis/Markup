# dmgbuild settings for the Markup DMG.
#
# Why dmgbuild: it writes the DMG's .DS_Store layout (icon size + window
# size + icon positions) directly, with NO Finder/AppleScript — so the
# large, centered icon layout is reproducible on a headless CI runner,
# which bundle_dmg.sh's Finder automation can't do.
#
# Usage:
#   DMG_APP=path/to/Markup.app dmgbuild -s scripts/dmg-settings.py "Markup" out.dmg

import os

app = os.environ.get(
    "DMG_APP", "src-tauri/target/release/bundle/macos/Markup.app"
)
app_name = os.path.basename(app)  # "Markup.app"

# Compression
format = "UDZO"

# Contents: the app + an /Applications drop target.
files = [app]
symlinks = {"Applications": "/Applications"}

# Window: 660 x 420 content area, positioned near the top-left of screen.
# window_rect = ((x, y), (width, height))
window_rect = ((200, 180), (660, 420))

# Big icons, comfortably centered: app on the left, Applications on the
# right, both on the window's vertical centerline.
icon_size = 128
text_size = 13
icon_locations = {
    app_name: (180, 210),
    "Applications": (480, 210),
}

# Use the app's own icon as the volume icon if present.
_icns = os.path.join(app, "Contents", "Resources", "icon.icns")
if os.path.exists(_icns):
    badge_icon = _icns
