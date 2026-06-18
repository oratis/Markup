#!/usr/bin/env python3
"""Compose App Store marketing screenshots for Markup (iOS).

Takes the raw device captures in marketing/MarkupScreenshots/ and renders them
onto branded 1320×2868 canvases (App Store "6.9-inch display" size) with a
headline caption, a subline, and the screenshot framed with rounded corners +
a soft shadow. The iOS status bar / TestFlight banner is cropped off the top.

Run:  python3 marketing/scripts/make-screenshots.py
Out:  marketing/app-store/screenshots/ios-6.9/NN_slug.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))            # repo root
SRC = os.path.join(ROOT, "marketing", "MarkupScreenshots")
OUT = os.path.join(ROOT, "marketing", "app-store", "screenshots", "ios-6.9")
os.makedirs(OUT, exist_ok=True)

# App Store "6.9-inch display" canvas (iPhone 16 Pro Max class). Apple accepts
# this size for every iPhone slot.
W, H = 1320, 2868

# Brand palette: navy → indigo gradient, light text, blue wordmark/accent.
GRAD_TOP = (13, 19, 38)       # #0D1326 deep navy
GRAD_BOTTOM = (37, 26, 74)    # #251A4A indigo
WORDMARK = (110, 168, 255)    # #6EA8FF
HEADLINE = (255, 255, 255)
SUBLINE = (183, 193, 214)     # #B7C1D6

CROP_TOP = 132                # drop the iOS status bar / "◀ TestFlight" band
CARD_W = 1040
CARD_TOP = 612
CARD_RADIUS = 46

# (source, headline (\n = line break), subline, output slug). Strongest first —
# the App Store shows the first 2–3 in search results.
SHOTS = [
    ("IMG_4042.PNG", "Read Markdown,\nbeautifully rendered",
     "Code, math, diagrams, tables — in tabs", "01_read"),
    ("IMG_4041.PNG", "Open any GitHub repo\nas a vault",
     "Read the whole repo — offline", "02_github-vault"),
    ("IMG_4039.PNG", "Bring your own folder\nor GitHub repo",
     "iCloud, Files, or GitHub — nothing to import", "03_bring-your-own"),
    ("IMG_4038.PNG", "A reader-first\nMarkdown app",
     "Light, dark & sepia themes", "04_reader-first"),
    ("IMG_4040.PNG", "Works with Files\n& iCloud Drive",
     "Private by default — your notes stay yours", "05_files-icloud"),
]


def load_font(size, bold=False):
    """Prefer SF Pro (the iOS system font); fall back to Helvetica/Arial."""
    sf = "/System/Library/Fonts/SFNS.ttf"
    if os.path.exists(sf):
        try:
            f = ImageFont.truetype(sf, size)
            try:
                f.set_variation_by_name("Bold" if bold else "Regular")
            except Exception:
                pass
            return f
        except Exception:
            pass
    cands = (["/System/Library/Fonts/Supplemental/Arial Bold.ttf"] if bold
             else ["/System/Library/Fonts/Supplemental/Arial.ttf"])
    cands += ["/System/Library/Fonts/Helvetica.ttc"]
    for p in cands:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(
            int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def rounded(img, radius):
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def centered(draw, text, font, y, fill):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)
    asc, desc = font.getmetrics()
    return y + asc + desc


def compose(src_name, headline, subline, slug):
    canvas = gradient(W, H, GRAD_TOP, GRAD_BOTTOM).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    wm = load_font(46, bold=True)
    centered(draw, "Markup", wm, 84, WORDMARK)

    hf = load_font(98, bold=True)
    y = 196
    for line in headline.split("\n"):
        y = centered(draw, line, hf, y, HEADLINE) + 6
    sf = load_font(46, bold=False)
    y += 14
    for line in subline.split("\n"):
        y = centered(draw, line, sf, y, SUBLINE) + 4

    shot = Image.open(os.path.join(SRC, src_name)).convert("RGB")
    shot = shot.crop((0, CROP_TOP, shot.width, shot.height))
    card_h = round(CARD_W * shot.height / shot.width)
    shot = shot.resize((CARD_W, card_h), Image.LANCZOS)
    card = rounded(shot, CARD_RADIUS)
    x = (W - CARD_W) // 2
    yc = CARD_TOP

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x, yc + 30, x + CARD_W, yc + card_h + 30], radius=CARD_RADIUS,
        fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.alpha_composite(card, (x, yc))
    # Hairline rim so dark-mode screenshots separate from the dark gradient.
    ImageDraw.Draw(canvas).rounded_rectangle(
        [x, yc, x + CARD_W - 1, yc + card_h - 1], radius=CARD_RADIUS,
        outline=(255, 255, 255, 48), width=2)

    out = os.path.join(OUT, f"{slug}.png")
    canvas.convert("RGB").save(out, "PNG")
    return out


if __name__ == "__main__":
    for s in SHOTS:
        print("wrote", compose(*s))
