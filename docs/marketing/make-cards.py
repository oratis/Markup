#!/usr/bin/env python3
"""Generate the launch video's branded title + end cards (1280x720 SVGs).

Run from the repo root:  python3 docs/marketing/make-cards.py
Writes title.svg / end.svg into docs/marketing/.build/ (rendered to PNG by
build-launch-video.sh via sharp). Mirrors the social-card brand (indigo->purple
gradient + the real app icon).
"""
import base64, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
ICON = ROOT / "src-tauri/icons/128x128@2x.png"
OUT = ROOT / "docs/marketing/.build"
OUT.mkdir(parents=True, exist_ok=True)
icon_b64 = base64.b64encode(ICON.read_bytes()).decode()
FONT = "'Helvetica Neue','Arial',sans-serif"

defs = f"""
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6f6cf2"/><stop offset="0.55" stop-color="#3f37ac"/><stop offset="1" stop-color="#272260"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.32" r="0.7">
      <stop offset="0" stop-color="#8f8cff" stop-opacity="0.5"/><stop offset="1" stop-color="#8f8cff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ic"><rect x="555" y="120" width="170" height="170" rx="38"/></clipPath>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#glow)"/>
"""

title = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720">
  {defs}
  <image x="555" y="120" width="170" height="170" clip-path="url(#ic)" xlink:href="data:image/png;base64,{icon_b64}"/>
  <text x="640" y="420" font-family="{FONT}" font-size="120" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-2">Markup</text>
  <text x="640" y="480" font-family="{FONT}" font-size="34" font-weight="600" fill="#d7d6f5" text-anchor="middle">A native, open-source Markdown editor for macOS</text>
  <text x="640" y="540" font-family="{FONT}" font-size="26" font-weight="500" fill="#bfbdf5" text-anchor="middle">Read it like a web page. Edit on demand.</text>
</svg>"""

end = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720">
  {defs}
  <image x="555" y="120" width="170" height="170" clip-path="url(#ic)" xlink:href="data:image/png;base64,{icon_b64}"/>
  <text x="640" y="410" font-family="{FONT}" font-size="104" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-2">Markup</text>
  <text x="640" y="466" font-family="{FONT}" font-size="30" font-weight="600" fill="#d7d6f5" text-anchor="middle">Free · Open source · MIT</text>
  <g transform="translate(415,520)">
    <rect width="450" height="64" rx="32" fill="#ffffff" fill-opacity="0.15"/>
    <text x="225" y="42" font-family="{FONT}" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">★  github.com/oratis/Markup</text>
  </g>
</svg>"""

(OUT/"title.svg").write_text(title)
(OUT/"end.svg").write_text(end)
print(f"wrote {OUT}/title.svg and {OUT}/end.svg")
