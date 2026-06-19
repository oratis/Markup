#!/usr/bin/env python3
"""Compose App Store marketing screenshots for Markup (iOS + iPad + macOS).

Frames the raw device/app captures onto branded gradient canvases at the App
Store sizes, with a wordmark, a headline, a subline, and the screenshot framed
with rounded corners + a soft shadow + a hairline rim. Portrait (iPhone) and
landscape (iPad / Mac) are handled by the same composer — the screenshot is
scaled to fit the area below the caption.

Run:  python3 marketing/scripts/make-screenshots.py
Out:  marketing/app-store/screenshots/{ios-6.9,ipad-13,mac}/NN_slug.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS_DIR = os.path.join(ROOT, "marketing")
OUT_ROOT = os.path.join(ROOT, "marketing", "app-store", "screenshots")

# Brand palette: navy → indigo gradient, light text, blue wordmark.
GRAD_TOP = (13, 19, 38)
GRAD_BOTTOM = (37, 26, 74)
WORDMARK = (110, 168, 255)
HEADLINE = (255, 255, 255)
SUBLINE = (183, 193, 214)


def load_font(size, bold=False):
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


def gradient(w, h):
    img = Image.new("RGB", (w, h), GRAD_TOP)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(
            int(GRAD_TOP[i] + (GRAD_BOTTOM[i] - GRAD_TOP[i]) * t) for i in range(3)))
    return img


def rounded(img, radius):
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def centered(draw, text, font, y, fill, W):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)
    asc, desc = font.getmetrics()
    return y + asc + desc


def compose(src_path, headline, subline, out_path, W, H,
            wm_size, hl_size, sub_size, side, crop=None):
    canvas = gradient(W, H).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    top_pad = round(H * 0.045)
    y = centered(draw, "Markup", load_font(wm_size, True), top_pad, WORDMARK, W) + round(H * 0.018)
    hf = load_font(hl_size, True)
    for line in headline.split("\n"):
        y = centered(draw, line, hf, y, HEADLINE, W) + 4
    y += round(H * 0.012)
    sf = load_font(sub_size, False)
    for line in subline.split("\n"):
        y = centered(draw, line, sf, y, SUBLINE, W) + 4

    shot = Image.open(src_path).convert("RGB")
    if crop:
        shot = shot.crop(crop)
    box_top = y + round(H * 0.03)
    box_h = H - box_top - round(H * 0.05)
    box_w = W - 2 * side
    scale = min(box_w / shot.width, box_h / shot.height)
    cw, ch = round(shot.width * scale), round(shot.height * scale)
    shot = shot.resize((cw, ch), Image.LANCZOS)
    radius = max(20, round(min(cw, ch) * 0.022))
    card = rounded(shot, radius)
    x = (W - cw) // 2
    yc = box_top + (box_h - ch) // 2

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x, yc + round(H * 0.012), x + cw, yc + ch + round(H * 0.012)],
        radius=radius, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.alpha_composite(card, (x, yc))
    ImageDraw.Draw(canvas).rounded_rectangle(
        [x, yc, x + cw - 1, yc + ch - 1], radius=radius, outline=(255, 255, 255, 48), width=2)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert("RGB").save(out_path, "PNG")
    return out_path


# ---- iPhone 6.9" (1320×2868, portrait) ----
IPHONE = dict(folder="MarkupScreenshots-iphone", out="ios-6.9", W=1320, H=2868,
              wm=46, hl=98, sub=46, side=140, crop=(0, 132, 1290, 2796))
IPHONE_SHOTS = [
    ("IMG_4042.PNG", "Read Markdown,\nbeautifully rendered", "Code, math, diagrams, tables — in tabs", "01_read"),
    ("IMG_4041.PNG", "Open any GitHub repo\nas a vault", "Read the whole repo — offline", "02_github-vault"),
    ("IMG_4039.PNG", "Bring your own folder\nor GitHub repo", "iCloud, Files, or GitHub — nothing to import", "03_bring-your-own"),
    ("IMG_4038.PNG", "A reader-first\nMarkdown app", "Light, dark & sepia themes", "04_reader-first"),
    ("IMG_4040.PNG", "Works with Files\n& iCloud Drive", "Private by default — your notes stay yours", "05_files-icloud"),
]

# ---- iPad 13" landscape (2752×2064) ----
IPAD = dict(folder="MarkupScreenshots-ipad", out="ipad-13", W=2752, H=2064,
            wm=54, hl=112, sub=54, side=190, crop=(0, 52, 2388, 1668))
IPAD_SHOTS = [
    ("IMG_0203.PNG", "Read your vault on iPad", "Sidebar and reader, side by side", "01_split-read"),
    ("IMG_0202.PNG", "Open any GitHub repo as a vault", "Sign in, pick a repo, one tap to mount", "02_github-vault"),
    ("IMG_0204.PNG", "Light, dark & sepia", "Your reading, your way", "03_themes"),
    ("IMG_0205.PNG", "Pull the latest from GitHub", "Refresh your repo vault in place", "04_refresh"),
    ("IMG_0200.PNG", "A reader-first Markdown app", "Code, math, diagrams, tables", "05_reader-first"),
]

# ---- Mac (2880×1800, landscape) ----
MAC = dict(folder="MarkupScreenshots-mac", out="mac", W=2880, H=1800,
           wm=54, hl=110, sub=52, side=170, crop=None)
MAC_SHOTS = [
    ("screenshot-20260618-205806.png", "Your Markdown,\nbeautifully rendered", "Sidebar, reader, and a live outline", "01_reader", None),
    ("screenshot-20260618-210215.png", "Plain Markdown, always", "No proprietary format — it's just your .md", "02_markdown", None),
    ("screenshot-20260618-210532.png", "Jump to any file", "Fuzzy quick-open across your vault", "03_quick-open", None),
    ("screenshot-20260618-205855.png", "A command for everything", "Tabs, sections, canvases — from the keyboard", "04_commands", None),
    # 210149 has a Chrome window behind the app — crop to the app window (right portion).
    ("screenshot-20260618-210149.png", "Navigate big docs with ease", "Outline, search, tags & backlinks", "05_navigate", (1990, 150, 3456, 1994)),
]


def run(cfg, shots, per_shot_crop=False):
    for s in shots:
        if per_shot_crop:
            src, hl, sub, slug, crop = s
            crop = crop if crop is not None else cfg["crop"]
        else:
            src, hl, sub, slug = s
            crop = cfg["crop"]
        out = compose(
            os.path.join(SHOTS_DIR, cfg["folder"], src), hl, sub,
            os.path.join(OUT_ROOT, cfg["out"], f"{slug}.png"),
            cfg["W"], cfg["H"], cfg["wm"], cfg["hl"], cfg["sub"], cfg["side"], crop)
        print("wrote", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    run(IPHONE, IPHONE_SHOTS)
    run(IPAD, IPAD_SHOTS)
    run(MAC, MAC_SHOTS, per_shot_crop=True)
