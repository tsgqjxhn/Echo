"""Generate damage number sprite sheets.

Each output PNG is a horizontal 0-9 strip, later converted to WebP.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "ui" / "hud"
TMP = OUT / "_tmp_damage_digits"
FONT = ROOT / "assets" / "fonts" / "NotoSerifSC-VF.ttf"

S = 4

SPECS = {
    "damage_normal": {
        "size": (24, 32),
        "font_size": 27,
        "fill": (255, 255, 255, 255),
        "stroke": (28, 28, 42, 230),
        "shadow": (0, 0, 0, 150),
    },
    "damage_crit": {
        "size": (30, 38),
        "font_size": 32,
        "fill": (255, 94, 42, 255),
        "stroke": (85, 10, 0, 240),
        "shadow": (255, 214, 64, 95),
    },
    "damage_heal": {
        "size": (24, 32),
        "font_size": 27,
        "fill": (98, 235, 132, 255),
        "stroke": (4, 70, 34, 230),
        "shadow": (0, 0, 0, 135),
    },
}


def draw_sheet(name: str, spec: dict):
    digit_w, digit_h = spec["size"]
    canvas = Image.new("RGBA", (digit_w * 10 * S, digit_h * S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(FONT), spec["font_size"] * S)

    for i in range(10):
        text = str(i)
        cell_x = i * digit_w * S
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=2 * S)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = cell_x + (digit_w * S - tw) // 2 - bbox[0]
        y = (digit_h * S - th) // 2 - bbox[1] - 1 * S

        # Soft glow / shadow first, crisp outlined number above.
        draw.text((x + 2 * S, y + 3 * S), text, font=font, fill=spec["shadow"], stroke_width=2 * S, stroke_fill=spec["shadow"])
        draw.text((x, y), text, font=font, fill=spec["fill"], stroke_width=2 * S, stroke_fill=spec["stroke"])

        if name == "damage_crit":
            draw.line(
                [(cell_x + 5 * S, 5 * S), (cell_x + 11 * S, 2 * S)],
                fill=(255, 225, 90, 190),
                width=1 * S,
            )

    canvas = canvas.resize((digit_w * 10, digit_h), Image.Resampling.LANCZOS)
    canvas.save(TMP / f"{name}.png", "PNG", optimize=True)


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    for name, spec in SPECS.items():
        draw_sheet(name, spec)
        print(f"wrote {TMP / (name + '.png')}")


if __name__ == "__main__":
    main()
