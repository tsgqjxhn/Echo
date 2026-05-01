from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "backgrounds"
TMP = OUT / "_tmp_campaign_maps"


MAPS = [
    # tuple: (kind, filename, low_color, high_color, motif, draw_path)
    # `draw_path=False` skips the campaign trail / stage node markers.
    ("rainforest", "battlefield_rainforest.webp", (18, 76, 48), (44, 150, 82), "canopy", False),
    ("swamp", "battlefield_swamp.webp", (30, 54, 48), (76, 118, 72), "swamp", True),
    ("desert", "battlefield_desert.webp", (122, 84, 42), (220, 168, 82), "dunes", True),
    ("snow", "battlefield_snow.webp", (64, 92, 120), (210, 232, 245), "snow", True),
    ("volcano", "battlefield_volcano.webp", (58, 22, 24), (210, 64, 28), "lava", True),
]


def run_cwebp(png: Path, out: Path) -> None:
    cwebp = shutil.which("cwebp")
    if not cwebp:
        raise RuntimeError("cwebp not found")
    lossy = out.with_suffix(".lossy.webp")
    lossless = out.with_suffix(".lossless.webp")
    for p in (lossy, lossless, out):
        if p.exists():
            p.unlink()
    subprocess.run(
        [
            cwebp, "-q", "0", "-m", "6", "-pass", "10", "-alpha_q", "0",
            "-af", "-metadata", "none", str(png), "-o", str(lossy)
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        [cwebp, "-lossless", "-z", "9", "-metadata", "none", str(png), "-o", str(lossless)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    best = min((lossy, lossless), key=lambda p: p.stat().st_size)
    best.replace(out)
    for p in (lossy, lossless):
        if p.exists():
            p.unlink()
    png.unlink()


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def draw_base(draw: ImageDraw.ImageDraw, w: int, h: int, c1, c2) -> None:
    for y in range(h):
        t = y / max(1, h - 1)
        col = tuple(lerp(c1[i], c2[i], t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=col)


def draw_map(kind: str, low, high, motif: str, draw_path: bool = True) -> Image.Image:
    w, h = 480, 240
    img = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw_base(draw, w, h, low, high)

    if motif == "canopy":
        for i in range(42):
            x = (i * 43) % (w + 60) - 30
            y = 18 + (i * 29) % 150
            r = 20 + (i * 7) % 34
            col = (18 + i % 3 * 12, 96 + i % 5 * 12, 52 + i % 4 * 10, 210)
            draw.ellipse((x - r, y - r, x + r, y + r), fill=col)
        for x in range(0, w, 38):
            draw.line([(x, 0), (x + 80, h)], fill=(10, 70, 45, 130), width=3)
        draw.polygon([(0, 180), (120, 135), (250, 172), (360, 125), (480, 170), (480, 240), (0, 240)], fill=(12, 58, 38, 230))
    elif motif == "swamp":
        for i in range(18):
            x = 20 + (i * 73) % 460
            y = 40 + (i * 37) % 170
            draw.ellipse((x - 52, y - 13, x + 52, y + 13), fill=(38, 82, 70, 180), outline=(88, 130, 92, 180))
        for i in range(28):
            x = (i * 47) % w
            draw.line([(x, 32 + i % 5 * 8), (x + 20, 92 + i % 7 * 14)], fill=(66, 104, 72, 160), width=2)
        draw.polygon([(0, 164), (95, 148), (186, 174), (294, 138), (480, 160), (480, 240), (0, 240)], fill=(26, 50, 42, 235))
    elif motif == "dunes":
        for i in range(7):
            y = 52 + i * 24
            amp = 18 + i * 3
            pts = [(x, y + math.sin((x + i * 31) / 56) * amp) for x in range(-20, w + 21, 20)]
            draw.line(pts, fill=(246, 198, 104, 130), width=3)
        draw.polygon([(0, 168), (120, 130), (250, 176), (365, 124), (480, 170), (480, 240), (0, 240)], fill=(144, 92, 44, 230))
        for i in range(6):
            x = 50 + i * 75
            draw.polygon([(x, 70), (x + 22, 132), (x - 18, 132)], fill=(104, 72, 52, 160))
    elif motif == "snow":
        for i in range(7):
            base = 130 + i * 8
            draw.polygon([(i * 80 - 60, base), (i * 80 + 35, 44 + i % 3 * 10), (i * 80 + 132, base)], fill=(150, 178, 205, 210))
            draw.polygon([(i * 80 + 15, 58 + i % 3 * 10), (i * 80 + 35, 44 + i % 3 * 10), (i * 80 + 58, 58 + i % 3 * 10)], fill=(232, 244, 252, 230))
        for i in range(70):
            x = (i * 67) % w
            y = (i * 31) % h
            draw.rectangle((x, y, x + 2, y + 2), fill=(245, 252, 255, 190))
        draw.polygon([(0, 176), (140, 150), (285, 184), (480, 148), (480, 240), (0, 240)], fill=(210, 230, 240, 238))
    elif motif == "lava":
        for i in range(9):
            x = i * 65 - 40
            draw.polygon([(x, 164), (x + 50, 64 + i % 2 * 18), (x + 115, 164)], fill=(70, 34, 36, 225), outline=(22, 16, 20, 180))
        for i in range(8):
            x = 20 + i * 62
            draw.line([(x, 160), (x + 42, 210), (x + 80, 168)], fill=(250, 82, 22, 220), width=6)
            draw.line([(x, 161), (x + 42, 209), (x + 80, 169)], fill=(255, 190, 45, 190), width=2)
        for i in range(24):
            x = (i * 89) % w
            y = 20 + (i * 41) % 140
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 90, 28, 180))

    if draw_path:
        # Road / campaign path with stage-node markers.
        path = [(44, 196), (130, 156), (220, 176), (314, 132), (426, 164)]
        draw.line(path, fill=(245, 218, 132, 190), width=8)
        draw.line(path, fill=(60, 38, 30, 190), width=2)
        for x, y in path:
            draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 230, 120, 230), outline=(70, 42, 24, 230))

    img = img.filter(ImageFilter.SHARPEN)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    for stem, filename, low, high, motif, draw_path in MAPS:
        img = draw_map(stem, low, high, motif, draw_path)
        png = TMP / f"{stem}.png"
        img.save(png, "PNG", optimize=True)
        run_cwebp(png, OUT / filename)
    if TMP.exists():
        TMP.rmdir()


if __name__ == "__main__":
    main()
