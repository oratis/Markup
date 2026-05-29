#!/usr/bin/env python3
"""Generate the GitHub social-preview card (1280x640) for Markup.

Embeds the real app icon and renders the brand's indigo->purple gradient with a
parchment "reader" panel that shows the read-first idea at a glance.

Usage:
    python3 docs/assets/make-social-card.py
Outputs docs/assets/social-card.svg. Render to PNG with:
    qlmanage -t -s 1280 -o docs/assets docs/assets/social-card.svg
    # then rename social-card.svg.png -> social-card.png
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ICON = ROOT / "src-tauri/icons/128x128@2x.png"
OUT = ROOT / "docs/assets/social-card.svg"

icon_b64 = base64.b64encode(ICON.read_bytes()).decode()

FONT = "'Helvetica Neue', 'Arial', sans-serif"

# Parchment reader panel: a faux-rendered markdown document.
SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="640" viewBox="0 0 1280 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6f6cf2"/>
      <stop offset="0.55" stop-color="#3f37ac"/>
      <stop offset="1" stop-color="#272260"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.28" r="0.6">
      <stop offset="0" stop-color="#8f8cff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#8f8cff" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#0c0a2e" flood-opacity="0.45"/>
    </filter>
    <clipPath id="iconClip"><rect x="88" y="86" width="150" height="150" rx="34"/></clipPath>
  </defs>

  <rect width="1280" height="640" fill="url(#bg)"/>
  <rect width="1280" height="640" fill="url(#glow)"/>

  <!-- App icon (real, embedded) -->
  <image x="88" y="86" width="150" height="150" clip-path="url(#iconClip)"
         xlink:href="data:image/png;base64,{icon_b64}"/>

  <!-- Wordmark + tagline -->
  <text x="262" y="170" font-family="{FONT}" font-size="98" font-weight="800" fill="#ffffff" letter-spacing="-2">Markup</text>
  <text x="266" y="214" font-family="{FONT}" font-size="28" font-weight="500" fill="#cfceff">Read it like a web page.</text>

  <!-- One-liner -->
  <text x="90" y="320" font-family="{FONT}" font-size="40" font-weight="700" fill="#ffffff">A fast, native, open-source</text>
  <text x="90" y="372" font-family="{FONT}" font-size="40" font-weight="700" fill="#ffffff">Markdown editor for <tspan fill="#ffd9a8">macOS</tspan>.</text>

  <!-- Feature chips -->
  <g font-family="{FONT}" font-size="22" font-weight="600" fill="#eceaff">
    <g transform="translate(90,430)">
      <rect width="196" height="46" rx="23" fill="#ffffff" fill-opacity="0.14"/>
      <text x="24" y="30">Reader-first</text>
    </g>
    <g transform="translate(300,430)">
      <rect width="232" height="46" rx="23" fill="#ffffff" fill-opacity="0.14"/>
      <text x="24" y="30">Native · ~88 MB</text>
    </g>
    <g transform="translate(90,492)">
      <rect width="270" height="46" rx="23" fill="#ffffff" fill-opacity="0.14"/>
      <text x="24" y="30">Vault · backlinks · graph</text>
    </g>
    <g transform="translate(374,492)">
      <rect width="158" height="46" rx="23" fill="#ffffff" fill-opacity="0.14"/>
      <text x="24" y="30">Open · MIT</text>
    </g>
  </g>

  <!-- Footer -->
  <text x="92" y="586" font-family="{FONT}" font-size="24" font-weight="600" fill="#bfbdf5">★  github.com/oratis/Markup</text>

  <!-- Reader panel: parchment "rendered markdown" -->
  <g filter="url(#shadow)">
    <rect x="724" y="96" width="472" height="448" rx="20" fill="#f4edda"/>
  </g>
  <!-- window dots -->
  <circle cx="754" cy="128" r="6" fill="#e0584f"/>
  <circle cx="776" cy="128" r="6" fill="#e7a93c"/>
  <circle cx="798" cy="128" r="6" fill="#5fb45f"/>
  <!-- one-click export badge -->
  <rect x="1036" y="112" width="144" height="32" rx="16" fill="#1e2740"/>
  <text x="1108" y="133" font-family="'SF Mono','Menlo',monospace" font-size="16" font-weight="600" fill="#ffd9a8" text-anchor="middle">.md → .html</text>
  <!-- H1 -->
  <text x="754" y="196" font-family="{FONT}" font-size="38" font-weight="800" fill="#1e2740"># Markup</text>
  <rect x="754" y="214" width="412" height="2" fill="#d8cfb2"/>
  <!-- body lines -->
  <g fill="#5c6373">
    <rect x="754" y="240" width="384" height="11" rx="5.5"/>
    <rect x="754" y="264" width="412" height="11" rx="5.5"/>
    <rect x="754" y="288" width="300" height="11" rx="5.5"/>
  </g>
  <!-- H2 -->
  <text x="754" y="346" font-family="{FONT}" font-size="25" font-weight="700" fill="#2b3550">## Reader-first</text>
  <!-- code block -->
  <rect x="754" y="366" width="412" height="86" rx="10" fill="#1e2740"/>
  <g font-family="'SF Mono','Menlo',monospace" font-size="16">
    <text x="772" y="394" fill="#8ab4ff">press <tspan fill="#ffd9a8">E</tspan> to edit · <tspan fill="#ffd9a8">⌘/</tspan> for source</text>
    <text x="772" y="422" fill="#7fd6a3">[[wikilinks]] · backlinks · graph</text>
  </g>
  <!-- closing lines -->
  <g fill="#5c6373">
    <rect x="754" y="476" width="356" height="11" rx="5.5"/>
    <rect x="754" y="500" width="300" height="11" rx="5.5"/>
  </g>
</svg>
"""

OUT.write_text(SVG)
print(f"wrote {OUT} ({len(SVG)} bytes)")
