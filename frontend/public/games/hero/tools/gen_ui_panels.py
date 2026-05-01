"""Generate UI button textures + 9-slice panel backgrounds.

Outputs (PNG, transparent edges where appropriate):
  ui/panels/panel_dark.png      — base panel (160x160, can be 9-sliced via CSS border-image)
  ui/panels/panel_gold.png      — modal panel with gold trim (200x200)
  ui/buttons/btn_primary.png        — blue button (160x44)
  ui/buttons/btn_primary_pressed.png
  ui/buttons/btn_gold.png           — gold button
  ui/buttons/btn_gold_pressed.png
  ui/buttons/btn_danger.png         — red button
  ui/buttons/btn_back.png           — outlined back button (80x32)
  ui/buttons/btn_tab.png            — tab idle
  ui/buttons/btn_tab_active.png     — tab active
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

UI = Path(__file__).resolve().parent.parent / "assets" / "ui"
PANEL = UI / "panels"
BTN = UI / "buttons"
PANEL.mkdir(parents=True, exist_ok=True)
BTN.mkdir(parents=True, exist_ok=True)


def save(img, path):
    img.save(path)
    print(f"  wrote {path.relative_to(UI.parent)}  ({img.width}x{img.height})")


def linear_v(w, h, top, bot):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        a = int(top[3] * (1 - t) + bot[3] * t) if len(top) > 3 else 255
        for x in range(w):
            px[x, y] = (r, g, b, a)
    return img


def make_panel(w, h, gold=False):
    """Panel background suitable for CSS border-image 9-slice with slice ~24px."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # base
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=14,
                        fill=(20, 22, 38, 240),
                        outline=(255, 215, 64, 255) if gold else (90, 100, 130, 255),
                        width=3)
    # inner soft gradient
    grad = linear_v(w - 16, h - 16, (60, 60, 100, 0), (20, 20, 40, 110))
    img.alpha_composite(grad, (8, 8))
    # gold corner ornaments
    if gold:
        for cx, cy in ((10, 10), (w - 11, 10), (10, h - 11), (w - 11, h - 11)):
            d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(255, 215, 64, 255))
            d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, 200))
        # top + bottom decorative line
        d.line([(20, 5), (w - 21, 5)], fill=(255, 215, 64, 180))
        d.line([(20, h - 6), (w - 21, h - 6)], fill=(255, 215, 64, 180))
    # subtle inner border
    d.rounded_rectangle([6, 6, w - 7, h - 7], radius=10,
                        outline=(255, 255, 255, 50), width=1)
    return img


def make_button(w, h, base, edge, *, pressed=False, glow=False):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # outer glow / shadow
    if glow:
        for r, a in ((4, 50), (3, 90), (2, 130)):
            sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            sd = ImageDraw.Draw(sh, "RGBA")
            sd.rounded_rectangle([r, r, w - r - 1, h - r - 1], radius=10,
                                 fill=(base[0], base[1], base[2], a))
            sh = sh.filter(ImageFilter.GaussianBlur(2))
            img.alpha_composite(sh)
    # body gradient
    top_col = tuple(min(255, int(c * (0.7 if pressed else 1.15))) for c in base) + (255,)
    bot_col = tuple(min(255, int(c * (0.5 if pressed else 0.75))) for c in base) + (255,)
    grad = linear_v(w - 4, h - 4, top_col, bot_col)
    # mask to rounded
    mask = Image.new("L", (w - 4, h - 4), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, w - 5, h - 5], radius=10, fill=255)
    grad.putalpha(mask)
    img.alpha_composite(grad, (2, 2))
    # outline
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius=10,
                        outline=edge + (255,), width=2)
    # top highlight
    if not pressed:
        d.rounded_rectangle([4, 3, w - 5, h // 3], radius=8,
                            fill=(255, 255, 255, 60))
    return img


def make_back_button(w=80, h=30):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius=8,
                        fill=(20, 22, 38, 200), outline=(120, 130, 160, 255), width=2)
    d.polygon([(12, h // 2 - 5), (12, h // 2 + 5), (6, h // 2)], fill=(220, 220, 230, 230))
    return img


def make_tab(w=120, h=32, active=False):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    if active:
        d.rounded_rectangle([1, 1, w - 2, h - 2], radius=6,
                            fill=(60, 50, 20, 255), outline=(255, 215, 64, 255), width=2)
        d.line([(8, h - 4), (w - 9, h - 4)], fill=(255, 215, 64, 220), width=2)
    else:
        d.rounded_rectangle([1, 1, w - 2, h - 2], radius=6,
                            fill=(28, 30, 50, 230), outline=(80, 88, 110, 255), width=1)
    return img


def main():
    print("Generating UI panels + buttons")

    save(make_panel(160, 160, gold=False), PANEL / "panel_dark.png")
    save(make_panel(200, 200, gold=True), PANEL / "panel_gold.png")

    save(make_button(160, 44, base=(33, 110, 220), edge=(13, 60, 140)),
         BTN / "btn_primary.png")
    save(make_button(160, 44, base=(33, 110, 220), edge=(13, 60, 140), pressed=True),
         BTN / "btn_primary_pressed.png")
    save(make_button(160, 44, base=(220, 170, 30), edge=(120, 90, 10), glow=True),
         BTN / "btn_gold.png")
    save(make_button(160, 44, base=(220, 170, 30), edge=(120, 90, 10), pressed=True),
         BTN / "btn_gold_pressed.png")
    save(make_button(160, 44, base=(200, 50, 50), edge=(110, 20, 20)),
         BTN / "btn_danger.png")

    save(make_back_button(80, 30), BTN / "btn_back.png")
    save(make_tab(120, 32, active=False), BTN / "btn_tab.png")
    save(make_tab(120, 32, active=True), BTN / "btn_tab_active.png")
    print("Done.")


if __name__ == "__main__":
    main()
