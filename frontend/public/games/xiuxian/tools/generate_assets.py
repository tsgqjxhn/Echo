from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
TMP = ASSETS / "_tmp_png"
CWEBP = shutil.which("cwebp")


def ensure_dirs() -> None:
    for folder in [
        "characters/cultivators",
        "characters/combat",
        "characters/npc",
        "characters/auction",
        "effects",
        "items/pills",
        "items/materials",
        "items/techniques",
        "maps",
        "nodes",
        "enemies",
        "ui",
        "icons/nav",
        "icons/status",
        "fonts",
    ]:
        (ASSETS / folder).mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)


def clear_old_rasters() -> None:
    for ext in ("*.webp", "*.png", "*.jpg", "*.jpeg"):
        for path in ASSETS.rglob(ext):
            if TMP in path.parents:
                continue
            path.unlink()


def font(size: int, bold: bool = False, serif: bool = False, calligraphy: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if calligraphy:
        candidates += [Path("C:/Windows/Fonts/STXINGKA.TTF"), Path("C:/Windows/Fonts/FZSTK.TTF")]
    elif serif:
        candidates += [Path("C:/Windows/Fonts/NotoSerifSC-VF.ttf"), Path("C:/Windows/Fonts/STSONG.TTF")]
    elif bold:
        candidates += [Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"), Path("C:/Windows/Fonts/Dengb.ttf")]
    else:
        candidates += [Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"), Path("C:/Windows/Fonts/Deng.ttf")]
    for item in candidates:
        if item.exists():
            return ImageFont.truetype(str(item), size=size)
    return ImageFont.load_default()


def save_webp(img: Image.Image, rel: str) -> None:
    out = ASSETS / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    png = TMP / (out.stem + ".png")
    lossy = TMP / (out.stem + ".lossy.webp")
    lossless = TMP / (out.stem + ".lossless.webp")
    img.save(png)
    if CWEBP:
        subprocess.run(
            [
                CWEBP,
                "-quiet",
                "-q",
                "0",
                "-m",
                "6",
                "-pass",
                "10",
                "-segments",
                "1",
                "-sns",
                "0",
                "-alpha_q",
                "0",
                "-mt",
                str(png),
                "-o",
                str(lossy),
            ],
            check=True,
        )
        subprocess.run(
            [CWEBP, "-quiet", "-lossless", "-z", "9", "-mt", str(png), "-o", str(lossless)],
            check=True,
        )
        chosen = lossy if lossy.stat().st_size <= lossless.stat().st_size else lossless
        shutil.move(str(chosen), out)
        for temp in (png, lossy, lossless):
            if temp.exists():
                temp.unlink()
    else:
        img.save(out, "WEBP", quality=1, method=6)
        png.unlink(missing_ok=True)


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b, 255)
    return img


def draw_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, radius: float, color: tuple[int, int, int, int]) -> None:
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = radius if i % 2 == 0 else radius * 0.42
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    draw.polygon(pts, fill=color)


def add_noise(img: Image.Image, seed: int, alpha: int = 20) -> None:
    rng = Random(seed)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    w, h = img.size
    for _ in range((w * h) // 160):
        x, y = rng.randrange(w), rng.randrange(h)
        c = rng.randrange(180, 255)
        d.point((x, y), fill=(c, c, c, alpha))
    img.alpha_composite(overlay)


def draw_character(size: tuple[int, int], colors: tuple[str, str, str], seed: int, weapon: str = "sword") -> Image.Image:
    rng = Random(seed)
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    aura = Image.new("RGBA", size, (0, 0, 0, 0))
    ad = ImageDraw.Draw(aura)
    ad.ellipse((w * 0.14, h * 0.08, w * 0.86, h * 0.94), fill=(*Image.new("RGB", (1, 1), colors[0]).getpixel((0, 0)), 40))
    aura = aura.filter(ImageFilter.GaussianBlur(max(10, w // 18)))
    img.alpha_composite(aura)

    skin = (226, 196, 164, 255)
    robe = Image.new("RGBA", size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(robe)
    cx = w / 2
    rd.polygon([(cx - w * 0.24, h * 0.42), (cx + w * 0.24, h * 0.42), (cx + w * 0.34, h * 0.91), (cx - w * 0.34, h * 0.91)], fill=colors[1])
    rd.polygon([(cx - w * 0.17, h * 0.44), (cx, h * 0.63), (cx + w * 0.17, h * 0.44), (cx + w * 0.08, h * 0.86), (cx - w * 0.08, h * 0.86)], fill=colors[2])
    rd.line((cx - w * 0.26, h * 0.56, cx + w * 0.26, h * 0.56), fill=(230, 210, 150, 210), width=max(2, w // 45))
    img.alpha_composite(robe)

    d.ellipse((cx - w * 0.105, h * 0.22, cx + w * 0.105, h * 0.39), fill=skin)
    d.pieslice((cx - w * 0.13, h * 0.19, cx + w * 0.13, h * 0.35), 180, 360, fill=(34, 28, 35, 255))
    d.rectangle((cx - w * 0.04, h * 0.16, cx + w * 0.04, h * 0.24), fill=(34, 28, 35, 255))
    d.ellipse((cx - w * 0.05, h * 0.165, cx + w * 0.05, h * 0.25), fill=(30, 25, 32, 255))
    for ex in (-0.04, 0.04):
        d.ellipse((cx + w * ex - 2, h * 0.30 - 2, cx + w * ex + 2, h * 0.30 + 2), fill=(30, 28, 32, 255))
    d.arc((cx - w * 0.045, h * 0.325, cx + w * 0.045, h * 0.36), 5, 175, fill=(120, 70, 70, 255), width=1)

    hand_y = h * 0.53 + rng.randint(-4, 4)
    d.ellipse((cx - w * 0.34, hand_y, cx - w * 0.28, hand_y + h * 0.045), fill=skin)
    d.ellipse((cx + w * 0.28, hand_y, cx + w * 0.34, hand_y + h * 0.045), fill=skin)
    if weapon == "sword":
        d.line((cx + w * 0.28, h * 0.24, cx - w * 0.20, h * 0.76), fill=(230, 230, 224, 240), width=max(2, w // 45))
        d.line((cx + w * 0.25, h * 0.52, cx + w * 0.37, h * 0.58), fill=(212, 168, 83, 255), width=max(3, w // 35))
    elif weapon == "staff":
        d.line((cx + w * 0.28, h * 0.17, cx + w * 0.20, h * 0.86), fill=(140, 98, 56, 255), width=max(4, w // 32))
        draw_star(d, cx + w * 0.28, h * 0.17, w * 0.05, (212, 168, 83, 245))
    elif weapon == "talisman":
        d.rounded_rectangle((cx + w * 0.22, h * 0.44, cx + w * 0.38, h * 0.62), radius=6, fill=(224, 202, 130, 255))
        d.line((cx + w * 0.25, h * 0.49, cx + w * 0.35, h * 0.55), fill=(135, 42, 43, 255), width=2)
    else:
        d.ellipse((cx + w * 0.18, h * 0.43, cx + w * 0.36, h * 0.61), outline=(230, 210, 150, 255), width=max(3, w // 32))
    return img


def draw_avatar(size: tuple[int, int], colors: tuple[str, str, str], seed: int) -> Image.Image:
    img = draw_character((300, 300), colors, seed, "staff")
    crop = img.crop((45, 45, 255, 255)).resize(size, Image.Resampling.LANCZOS)
    bg = Image.new("RGBA", size, (18, 18, 30, 255))
    d = ImageDraw.Draw(bg)
    d.ellipse((4, 4, size[0] - 4, size[1] - 4), fill=colors[0], outline=(212, 168, 83, 255), width=4)
    bg.alpha_composite(crop)
    return bg


def draw_icon(size: int, palette: tuple[str, str, str], kind: str, seed: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 2, size - 2, size - 2), radius=size // 6, fill=(16, 18, 31, 230), outline=palette[0], width=max(1, size // 24))
    cx = cy = size / 2
    if kind == "pill":
        d.ellipse((size * 0.22, size * 0.22, size * 0.78, size * 0.78), fill=palette[1], outline=palette[2], width=max(2, size // 16))
        d.arc((size * 0.30, size * 0.25, size * 0.70, size * 0.70), 200, 340, fill=(255, 255, 255, 180), width=max(1, size // 22))
    elif kind == "herb":
        d.line((cx, size * 0.74, cx, size * 0.30), fill=palette[1], width=max(2, size // 16))
        for sx in (-1, 1):
            x0 = cx + sx * size * 0.02
            x1 = cx + sx * size * 0.28
            d.ellipse((min(x0, x1), size * 0.24, max(x0, x1), size * 0.48), fill=palette[2])
            x0 = cx - sx * size * 0.28
            x1 = cx - sx * size * 0.02
            d.ellipse((min(x0, x1), size * 0.38, max(x0, x1), size * 0.62), fill=palette[1])
    elif kind == "stone":
        pts = [(cx, size * 0.14), (size * 0.80, size * 0.38), (size * 0.64, size * 0.82), (size * 0.30, size * 0.78), (size * 0.17, size * 0.36)]
        d.polygon(pts, fill=palette[1], outline=palette[2])
        d.line((size * 0.30, size * 0.33, size * 0.64, size * 0.82), fill=(255, 255, 255, 105), width=max(1, size // 22))
    elif kind == "book":
        d.rounded_rectangle((size * 0.24, size * 0.16, size * 0.78, size * 0.84), radius=5, fill=palette[1], outline=palette[2], width=2)
        d.rectangle((size * 0.29, size * 0.16, size * 0.36, size * 0.84), fill=(255, 255, 255, 55))
        d.line((size * 0.45, size * 0.34, size * 0.68, size * 0.34), fill=(255, 245, 200, 200), width=2)
        d.line((size * 0.45, size * 0.48, size * 0.68, size * 0.48), fill=(255, 245, 200, 200), width=2)
    else:
        draw_star(d, cx, cy, size * 0.28, (*Image.new("RGB", (1, 1), palette[1]).getpixel((0, 0)), 255))
    return img


def draw_map(size: tuple[int, int], top: str, bottom: str, seed: int, mood: str) -> Image.Image:
    img = gradient(size, Image.new("RGB", (1, 1), top).getpixel((0, 0)), Image.new("RGB", (1, 1), bottom).getpixel((0, 0)))
    rng = Random(seed)
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img)
    w, h = size
    if mood in {"forest", "village"}:
        for _ in range(38):
            x = rng.randint(-20, w + 20)
            y = rng.randint(int(h * 0.38), int(h * 0.92))
            c = rng.choice([(32, 92, 66, 220), (45, 116, 76, 220), (70, 122, 58, 210)])
            d.polygon([(x, y - 70), (x - 42, y + 18), (x + 42, y + 18)], fill=c)
            d.rectangle((x - 5, y + 15, x + 5, y + 58), fill=(84, 54, 32, 190))
    elif mood == "mine":
        for i in range(6):
            y = h * (0.45 + i * 0.08)
            d.polygon([(0, y + rng.randint(-20, 20)), (w * 0.30, y - 80), (w * 0.65, y - 35), (w, y - 90), (w, h), (0, h)], fill=(50 + i * 12, 48 + i * 10, 58 + i * 8, 210))
        for _ in range(20):
            draw_star(d, rng.randint(20, w - 20), rng.randint(80, h - 40), rng.randint(4, 9), (98, 204, 225, 140))
    elif mood == "ruins":
        for _ in range(10):
            x = rng.randint(40, w - 80)
            d.rectangle((x, h * 0.45, x + rng.randint(22, 48), h * 0.86), fill=(92, 86, 92, 210))
            d.arc((x - 15, h * 0.38, x + 60, h * 0.58), 180, 360, fill=(132, 122, 110, 230), width=5)
    elif mood == "abyss":
        for _ in range(24):
            x = rng.randint(0, w)
            y = rng.randint(50, h - 50)
            d.ellipse((x - 80, y - 18, x + 80, y + 18), fill=(84, 20, 110, 70))
        d.polygon([(0, h * 0.78), (w * 0.3, h * 0.55), (w * 0.6, h * 0.83), (w, h * 0.52), (w, h), (0, h)], fill=(13, 8, 22, 230))
    else:
        for _ in range(70):
            draw_star(d, rng.randint(0, w), rng.randint(0, h), rng.randint(2, 6), (210, 190, 255, rng.randint(80, 190)))
        d.ellipse((w * 0.34, h * 0.24, w * 0.66, h * 0.56), outline=(166, 120, 255, 180), width=8)
    add_noise(img, seed, 12)
    return img


def draw_world_map() -> Image.Image:
    img = draw_map((1200, 700), "#223345", "#0a0a12", 906, "chaos")
    d = ImageDraw.Draw(img)
    points = [
        (170, 210, "外门村庄", "#5cb85c"),
        (350, 160, "灵兽森林", "#1abc9c"),
        (520, 330, "灵矿山脉", "#8d8b94"),
        (720, 245, "远古遗迹", "#d4a853"),
        (900, 430, "深渊秘境", "#9b59b6"),
        (1040, 170, "混沌虚空", "#5bc0de"),
    ]
    route = [(x, y) for x, y, _, _ in points]
    d.line(route, fill=(212, 168, 83, 180), width=6, joint="curve")
    label_font = font(28, serif=True)
    for x, y, label, color in points:
        d.ellipse((x - 42, y - 42, x + 42, y + 42), fill=color, outline=(236, 220, 150, 240), width=4)
        d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=(10, 10, 18, 230))
        d.text((x - 54, y + 52), label, font=label_font, fill=(232, 226, 210, 255))
    d.text((50, 42), "问道长生 · 山海图", font=font(54, serif=True, calligraphy=True), fill=(236, 205, 122, 255))
    return img


def draw_enemy(size: tuple[int, int], palette: tuple[str, str, str], seed: int, shape: str) -> Image.Image:
    rng = Random(seed)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = size
    aura = Image.new("RGBA", size, (0, 0, 0, 0))
    ad = ImageDraw.Draw(aura)
    ad.ellipse((w * 0.12, h * 0.12, w * 0.88, h * 0.88), fill=(*Image.new("RGB", (1, 1), palette[0]).getpixel((0, 0)), 45))
    aura = aura.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(aura)
    if shape in {"wolf", "fox", "rabbit"}:
        d.ellipse((w * 0.22, h * 0.36, w * 0.78, h * 0.72), fill=palette[1], outline=palette[2], width=4)
        d.polygon([(w * 0.33, h * 0.37), (w * 0.40, h * 0.18), (w * 0.47, h * 0.39)], fill=palette[1])
        d.polygon([(w * 0.55, h * 0.39), (w * 0.64, h * 0.18), (w * 0.69, h * 0.39)], fill=palette[1])
        d.ellipse((w * 0.38, h * 0.48, w * 0.44, h * 0.54), fill=(255, 236, 160, 255))
        d.ellipse((w * 0.58, h * 0.48, w * 0.64, h * 0.54), fill=(255, 236, 160, 255))
    elif shape in {"snake", "python"}:
        for i in range(9):
            x = w * (0.18 + i * 0.08)
            y = h * (0.58 + math.sin(i * 1.2) * 0.12)
            d.ellipse((x - 24, y - 18, x + 24, y + 18), fill=palette[1], outline=palette[2])
        d.ellipse((w * 0.68, h * 0.38, w * 0.86, h * 0.56), fill=palette[1], outline=palette[2], width=3)
    elif shape in {"stone", "puppet"}:
        for _ in range(8):
            x = rng.randint(30, w - 60)
            y = rng.randint(42, h - 70)
            r = rng.randint(24, 42)
            d.rounded_rectangle((x, y, x + r, y + r), radius=8, fill=palette[1], outline=palette[2], width=3)
        d.ellipse((w * 0.38, h * 0.32, w * 0.46, h * 0.40), fill=(245, 80, 80, 255))
        d.ellipse((w * 0.56, h * 0.32, w * 0.64, h * 0.40), fill=(245, 80, 80, 255))
    else:
        points = []
        for i in range(12):
            a = i * math.pi * 2 / 12
            r = w * (0.24 if i % 2 else 0.38)
            points.append((w / 2 + math.cos(a) * r, h / 2 + math.sin(a) * r))
        d.polygon(points, fill=palette[1], outline=palette[2])
        d.ellipse((w * 0.36, h * 0.38, w * 0.64, h * 0.66), fill=(20, 16, 28, 230))
        draw_star(d, w / 2, h / 2, w * 0.08, (236, 210, 120, 255))
    return img


def draw_effect(size: tuple[int, int], palette: tuple[str, str, str], seed: int, mode: str) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = size
    rng = Random(seed)
    center = (w / 2, h / 2)
    for r in range(min(w, h) // 2, 8, -12):
        alpha = int(120 * (1 - r / (min(w, h) / 2)))
        d.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), outline=(*Image.new("RGB", (1, 1), palette[0]).getpixel((0, 0)), alpha), width=5)
    for _ in range(26):
        a = rng.random() * math.pi * 2
        r1 = rng.randint(18, min(w, h) // 2 - 6)
        x = center[0] + math.cos(a) * r1
        y = center[1] + math.sin(a) * r1
        if mode == "lightning":
            d.line((center[0], 0, x, y, center[0] + rng.randint(-80, 80), h), fill=palette[1], width=rng.randint(2, 5))
        else:
            draw_star(d, x, y, rng.randint(4, 10), (*Image.new("RGB", (1, 1), palette[1]).getpixel((0, 0)), 180))
    return img.filter(ImageFilter.GaussianBlur(0.3))


def create_rasters() -> None:
    cultivators = [
        ("lianqi", ("#5bc0de", "#243b61", "#d4a853"), "sword"),
        ("zhuji", ("#5cb85c", "#1f5136", "#bfe7b0"), "staff"),
        ("jindan", ("#d4a853", "#60421f", "#fff0a8"), "orb"),
        ("yuanying", ("#9b59b6", "#3f2456", "#e2c4ff"), "talisman"),
        ("huashen", ("#e74c3c", "#501d23", "#ffd0bd"), "staff"),
    ]
    for i, (name, colors, weapon) in enumerate(cultivators):
        save_webp(draw_character((400, 600), colors, 100 + i, weapon), f"characters/cultivators/{name}.webp")
    combat = [
        ("sword", ("#d4a853", "#1d2c4d", "#e8e6e3"), "sword"),
        ("body", ("#d9534f", "#40242a", "#f1c18e"), "orb"),
        ("qi", ("#5bc0de", "#182f4d", "#a8f0ff"), "staff"),
        ("talisman", ("#9b59b6", "#2c203d", "#f2df8a"), "talisman"),
    ]
    for i, (name, colors, weapon) in enumerate(combat):
        save_webp(draw_character((400, 600), colors, 200 + i, weapon), f"characters/combat/{name}.webp")
    npc_colors = [
        ("#d4a853", "#3b2a1e", "#f5dd9d"),
        ("#5b8dd9", "#1e304d", "#b7d6ff"),
        ("#5cb85c", "#1e4330", "#c0efbc"),
        ("#9b59b6", "#312142", "#efcfff"),
        ("#d9534f", "#462025", "#ffd0c8"),
        ("#5bc0de", "#173a42", "#c9f6ff"),
        ("#aaa", "#282c36", "#efefef"),
        ("#e67e22", "#4c2f1a", "#ffd1a2"),
        ("#1abc9c", "#183f39", "#bdfcef"),
        ("#f1c40f", "#4d4316", "#fff2a8"),
    ]
    for i, colors in enumerate(npc_colors, 1):
        save_webp(draw_character((300, 500), colors, 300 + i, ["sword", "staff", "talisman", "orb"][i % 4]), f"characters/npc/npc_{i:02d}.webp")
    for i, colors in enumerate(npc_colors[:8], 1):
        save_webp(draw_avatar((128, 128), colors, 400 + i), f"characters/auction/bidder_{i:02d}.webp")

    for i, colors in enumerate([
        ("#d4a853", "#fff0a8", "#8c6b26"),
        ("#5bc0de", "#cbf7ff", "#23536a"),
        ("#9b59b6", "#f0cfff", "#4c2d5f"),
        ("#d9534f", "#ffd0c8", "#7d2328"),
        ("#5cb85c", "#d9ffd1", "#1f5b2b"),
        ("#e67e22", "#ffd2a0", "#794218"),
    ], 1):
        save_webp(draw_effect((200, 200), colors, 500 + i, "aura"), f"effects/realm_aura_{i:02d}.webp")
    save_webp(draw_effect((800, 450), ("#5bc0de", "#e8fbff", "#281f5c"), 520, "lightning"), "effects/tribulation_overlay.webp")
    particles = Image.new("RGBA", (96, 32), (0, 0, 0, 0))
    pd = ImageDraw.Draw(particles)
    for i, c in enumerate([(212, 168, 83, 255), (91, 141, 217, 255), (155, 89, 182, 255)]):
        ox = i * 32
        for r in (12, 7, 3):
            pd.ellipse((ox + 16 - r, 16 - r, ox + 16 + r, 16 + r), fill=(c[0], c[1], c[2], max(50, c[3] - r * 10)))
    save_webp(particles, "effects/aura_particles.webp")

    pill_keys = [
        "juqi_dan",
        "zhuji_dan",
        "jiangchen_dan",
        "dingshen_dan",
        "butian_dan",
        "feisheng_dan",
        "xiulian_dan",
        "julingshi_dan",
        "huixue_dan",
        "huti_dan",
    ]
    pill_palettes = [
        ("#5bc0de", "#9be7ff", "#23536a"),
        ("#5cb85c", "#a2f0a2", "#1f5b2b"),
        ("#d4a853", "#ffe082", "#8c6b26"),
        ("#9b59b6", "#d8a5ff", "#4c2d5f"),
        ("#e67e22", "#ffbf80", "#794218"),
        ("#e74c3c", "#ff9f9a", "#7d2328"),
        ("#aaa", "#f3f1df", "#555"),
        ("#5bc0de", "#66fff0", "#23536a"),
        ("#d9534f", "#ffb5b3", "#7d2328"),
        ("#8e7b54", "#e8ddba", "#5f5130"),
    ]
    for i, key in enumerate(pill_keys):
        save_webp(draw_icon(64, pill_palettes[i], "pill", 600 + i), f"items/pills/{key}.webp")

    material_kinds = {
        "lingshi": ("stone", ("#5bc0de", "#b4f8ff", "#1d6473")),
        "lingcao": ("herb", ("#5cb85c", "#61c970", "#d4ffd1")),
        "tiannian_lingyao": ("herb", ("#d4a853", "#d1a640", "#fff2b0")),
        "kuangmai": ("stone", ("#888", "#a9a8ba", "#4d4c5c")),
        "longwen_heijin": ("stone", ("#d4a853", "#22242f", "#d4a853")),
        "hundun_yuanshi": ("stone", ("#9b59b6", "#6f4fa8", "#e0c7ff")),
    }
    for i, (key, (kind, pal)) in enumerate(material_kinds.items()):
        save_webp(draw_icon(64, pal, kind, 700 + i), f"items/materials/{key}.webp")
    save_webp(draw_icon(128, material_kinds["lingshi"][1], "stone", 710), "items/materials/lingshi_large.webp")

    for i, (school, pal) in enumerate({
        "sword": ("#d4a853", "#334a78", "#fff0a8"),
        "body": ("#d9534f", "#65313a", "#ffc6b2"),
        "qi": ("#5bc0de", "#22606f", "#d4fbff"),
        "talisman": ("#9b59b6", "#65428c", "#f3e19c"),
    }.items()):
        save_webp(draw_icon(64, pal, "book", 800 + i), f"items/techniques/{school}.webp")

    zone_defs = [
        ("z_village", "#567350", "#18261f", 900, "village"),
        ("z_forest", "#1f5f49", "#081d18", 901, "forest"),
        ("z_mine", "#4b5265", "#12141f", 902, "mine"),
        ("z_ruins", "#766a62", "#1f1a1c", 903, "ruins"),
        ("z_abyss", "#2b103d", "#05040a", 904, "abyss"),
        ("z_chaos", "#161936", "#03030b", 905, "chaos"),
    ]
    for key, top, bottom, seed, mood in zone_defs:
        save_webp(draw_map((800, 400), top, bottom, seed, mood), f"maps/{key}.webp")
    save_webp(draw_world_map(), "maps/world_map.webp")

    for i, (key, kind, pal) in enumerate([
        ("node_gather", "herb", ("#5cb85c", "#61c970", "#d4ffd1")),
        ("node_event", "star", ("#9b59b6", "#d8a5ff", "#4c2d5f")),
        ("node_combat", "star", ("#d9534f", "#ff9f9a", "#7d2328")),
        ("node_treasure", "stone", ("#d4a853", "#ffe082", "#8c6b26")),
    ]):
        save_webp(draw_icon(48, pal, kind, 930 + i), f"nodes/{key}.webp")
    save_webp(draw_map((96, 96), "#1f2330", "#0a0a12", 940, "chaos").filter(ImageFilter.GaussianBlur(4)), "nodes/fog_tile.webp")

    enemy_defs = [
        ("wild_wolf", ("#6f7b85", "#4e5660", "#aeb6c0"), "wolf"),
        ("poison_snake", ("#5cb85c", "#295b35", "#b8f0a8"), "snake"),
        ("spirit_rabbit", ("#f0f0f0", "#cfdbe7", "#ffffff"), "rabbit"),
        ("red_fox", ("#e67e22", "#b85222", "#ffd0a3"), "fox"),
        ("giant_python", ("#426b43", "#234b2d", "#a2d79b"), "python"),
        ("stone_demon", ("#8d8b94", "#565461", "#c0bdc8"), "stone"),
        ("vein_snake", ("#5bc0de", "#2e6270", "#d2f7ff"), "snake"),
        ("puppet_guard", ("#d4a853", "#76633d", "#fff0a8"), "puppet"),
        ("undead_cultivator", ("#9b59b6", "#393147", "#d8c5f0"), "dark"),
        ("abyss_spider", ("#d9534f", "#3d1720", "#ff8c85"), "dark"),
        ("void_walker", ("#5bc0de", "#151f40", "#9eefff"), "dark"),
        ("chaos_behemoth", ("#e67e22", "#30213d", "#ffd099"), "dark"),
        ("void_lord", ("#9b59b6", "#120c20", "#e5c4ff"), "dark"),
    ]
    for i, (key, pal, shape) in enumerate(enemy_defs):
        save_webp(draw_enemy((200, 200), pal, 1000 + i, shape), f"enemies/{key}.webp")

    save_webp(draw_map((400, 120), "#211c25", "#07070f", 1100, "chaos"), "ui/logo_base.webp")
    logo = Image.open(ASSETS / "ui/logo_base.webp").convert("RGBA")
    ld = ImageDraw.Draw(logo)
    ld.text((42, 20), "问道长生", font=font(46, serif=True, calligraphy=True), fill=(236, 205, 122, 255))
    ld.text((126, 80), "Cultivation Idle", font=font(14), fill=(160, 150, 128, 255))
    save_webp(logo, "ui/game_logo.webp")
    (ASSETS / "ui/logo_base.webp").unlink(missing_ok=True)

    tile = gradient((256, 256), (40, 36, 32), (15, 16, 23)).convert("RGBA")
    add_noise(tile, 1200, 30)
    save_webp(tile, "ui/paper_ink_tile.webp")
    jade = gradient((256, 256), (20, 70, 58), (10, 20, 26)).convert("RGBA")
    add_noise(jade, 1201, 24)
    save_webp(jade, "ui/jade_tile.webp")

    for i, (key, pal) in enumerate({
        "qingyun": ("#5b8dd9", "#223d67", "#d8e8ff"),
        "tiangang": ("#d9534f", "#4c2428", "#ffd0c8"),
        "lingxu": ("#5bc0de", "#1d5661", "#d6fbff"),
        "xuantian": ("#9b59b6", "#382348", "#f0d3ff"),
    }.items()):
        save_webp(draw_icon(128, pal, "star", 1300 + i), f"ui/sect_badge_{key}.webp")

    for i, (key, pal) in enumerate({
        "array_01": ("#5bc0de", "#76eaff", "#23536a"),
        "array_02": ("#5cb85c", "#95ed9b", "#1f5b2b"),
        "array_03": ("#d4a853", "#ffe082", "#8c6b26"),
        "array_04": ("#9b59b6", "#d8a5ff", "#4c2d5f"),
        "array_05": ("#e74c3c", "#ff9f9a", "#7d2328"),
    }.items()):
        save_webp(draw_effect((300, 300), pal, 1400 + i, "aura"), f"ui/{key}.webp")
    save_webp(draw_map((400, 250), "#386f42", "#101b14", 1500, "forest"), "ui/herb_garden_01.webp")
    save_webp(draw_map((400, 250), "#54735d", "#111b20", 1501, "village"), "ui/herb_garden_02.webp")

    for name, color in [("panel_9patch", "#2f2b3b"), ("button_primary", "#d4a853"), ("button_secondary", "#2b3650"), ("button_danger", "#8a2f35")]:
        img = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((1, 1, 94, 46), radius=8, fill=color, outline="#d4a853" if name == "panel_9patch" else "#0a0a12", width=2)
        save_webp(img, f"ui/{name}.webp")

    event_keys = [
        ("e_wounded_cultivator", "#4d4a59", "#17171f", "ruins"),
        ("e_spirit_spring", "#5bc0de", "#102931", "forest"),
        ("e_sect_trial", "#d4a853", "#211b12", "ruins"),
        ("e_demonic_beast", "#d9534f", "#16080a", "abyss"),
        ("e_hidden_cave", "#5b8dd9", "#101421", "mine"),
        ("e_trader", "#e67e22", "#21160b", "village"),
        ("e_heavenly_tribulation", "#d4a853", "#10132a", "chaos"),
        ("e_demonic_cultivator", "#9b59b6", "#120817", "abyss"),
        ("e_ancient_tomb", "#766a62", "#141012", "ruins"),
    ]
    for i, (key, top, bottom, mood) in enumerate(event_keys):
        save_webp(draw_map((400, 250), top, bottom, 1600 + i, mood), f"ui/event_{key}.webp")


def write_svg(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def create_svgs() -> None:
    nav = {
        "cultivation": "M12 3C8 7 7 11 12 21C17 11 16 7 12 3Z M12 8C10 11 10 14 12 18C14 14 14 11 12 8Z",
        "cave": "M3 21H21L18 9L12 3L6 9L3 21Z M8 21V14C8 11 16 11 16 14V21",
        "techniques": "M6 4H18V20H6Z M9 4V20 M11 8H16 M11 12H16",
        "alchemy": "M7 10H17L16 20H8Z M9 6H15 M12 3V10 M9 20C8 22 16 22 15 20",
        "exploration": "M4 6L10 3L20 6L14 9L4 6Z M4 6V17L14 21V9 M20 6V17L14 21",
        "inventory": "M5 8H19V20H5Z M8 8V6C8 3 16 3 16 6V8",
        "shop": "M5 9H19L18 21H6Z M7 9L9 3H15L17 9 M9 14H15",
        "sect": "M12 3L21 8L12 13L3 8Z M6 10V16C8 19 16 19 18 16V10",
        "auction": "M7 7H17V13H7Z M9 13L5 20H19L15 13 M10 4H14",
        "settings": "M12 8A4 4 0 1 0 12 16A4 4 0 0 0 12 8Z M12 2V5 M12 19V22 M2 12H5 M19 12H22 M4.9 4.9L7 7 M17 17L19.1 19.1 M19.1 4.9L17 7 M7 17L4.9 19.1",
    }
    for key, path_data in nav.items():
        write_svg(
            ASSETS / f"icons/nav/{key}.svg",
            f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="{path_data}" fill="none" stroke="#d4a853" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>""",
        )
    status = {
        "realm": ("#d4a853", "M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9Z"),
        "cultivation": ("#5cb85c", "M12 3C7 7 7 13 12 21C17 13 17 7 12 3Z"),
        "rate": ("#5bc0de", "M4 14L10 14L8 21L20 10L14 10L16 3Z"),
        "stones": ("#d4a853", "M12 2L20 8L17 20H7L4 8Z"),
        "spirit": ("#9b59b6", "M12 2C7 7 5 13 12 22C19 13 17 7 12 2Z M12 8A4 4 0 1 0 12 16A4 4 0 0 0 12 8Z"),
    }
    for key, (color, path_data) in status.items():
        write_svg(
            ASSETS / f"icons/status/{key}.svg",
            f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="{path_data}" fill="{color}" opacity=".9"/></svg>""",
        )
    for key, color in [("gold", "#d4a853"), ("blue", "#5bc0de"), ("purple", "#9b59b6")]:
        write_svg(
            ASSETS / f"effects/breakthrough_success_{key}.svg",
            f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#05050a" opacity=".08"/>
<g fill="none" stroke="{color}" stroke-linecap="round">
<circle cx="200" cy="200" r="48" stroke-width="5"><animate attributeName="r" values="48;168;48" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.05;1" dur="2.4s" repeatCount="indefinite"/></circle>
<circle cx="200" cy="200" r="96" stroke-width="2" stroke-dasharray="10 14"><animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="5s" repeatCount="indefinite"/></circle>
<path d="M200 60L220 170L340 200L220 230L200 340L180 230L60 200L180 170Z" stroke-width="4"><animate attributeName="opacity" values=".25;1;.25" dur="1.8s" repeatCount="indefinite"/></path>
</g></svg>""",
        )
    write_svg(
        ASSETS / "effects/breakthrough_failure.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#0a0406" opacity=".25"/>
<g fill="none" stroke="#d9534f" stroke-linecap="round" stroke-linejoin="round">
<path d="M92 80L168 166L130 198L220 318L198 218L278 198L218 156L306 70" stroke-width="8"><animate attributeName="opacity" values="1;.25;1" dur="1.2s" repeatCount="indefinite"/></path>
<circle cx="200" cy="210" r="112" stroke-width="3" stroke-dasharray="6 18"><animateTransform attributeName="transform" type="rotate" from="0 200 210" to="-360 200 210" dur="3s" repeatCount="indefinite"/></circle>
</g></svg>""",
    )
    write_svg(
        ASSETS / "ui/alchemy_furnace.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
<defs><radialGradient id="g" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#5bc0de"/><stop offset=".55" stop-color="#1f4252"/><stop offset="1" stop-color="#11121e"/></radialGradient></defs>
<ellipse cx="100" cy="106" rx="52" ry="16" fill="#d4a853" opacity=".9"/>
<path d="M54 106C54 78 146 78 146 106L132 222C130 244 70 244 68 222Z" fill="url(#g)" stroke="#d4a853" stroke-width="5"/>
<path d="M68 228L50 270M132 228L150 270M78 238H122" stroke="#d4a853" stroke-width="8" stroke-linecap="round"/>
<g>
<path d="M78 256C84 230 98 232 100 205C124 228 130 244 122 266C112 286 86 282 78 256Z" fill="#e74c3c"><animate attributeName="d" values="M78 256C84 230 98 232 100 205C124 228 130 244 122 266C112 286 86 282 78 256Z;M75 260C88 238 92 225 110 205C120 232 136 242 123 266C108 288 86 280 75 260Z;M78 256C84 230 98 232 100 205C124 228 130 244 122 266C112 286 86 282 78 256Z" dur=".8s" repeatCount="indefinite"/></path>
<path d="M91 264C96 244 105 242 106 226C118 244 120 254 116 268C110 280 96 278 91 264Z" fill="#ffd36a"/>
</g></svg>""",
    )
    write_svg(
        ASSETS / "ui/border_ink.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" preserveAspectRatio="none"><path d="M4 8C22 2 38 8 58 5C80 2 96 5 116 9V52C92 58 78 52 58 56C36 60 21 54 4 52Z" fill="none" stroke="#d4a853" stroke-width="2" opacity=".75"/></svg>""",
    )


def copy_fonts() -> None:
    sources = {
        "NotoSerifSC-VF.ttf": Path("C:/Windows/Fonts/NotoSerifSC-VF.ttf"),
        "NotoSansSC-VF.ttf": Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"),
        "STXingkai.ttf": Path("C:/Windows/Fonts/STXINGKA.TTF"),
    }
    for name, source in sources.items():
        if source.exists():
            shutil.copyfile(source, ASSETS / "fonts" / name)


def cleanup() -> None:
    if TMP.exists():
        shutil.rmtree(TMP)
    for png in ASSETS.rglob("*.png"):
        png.unlink()
    for jpg in ASSETS.rglob("*.jpg"):
        jpg.unlink()
    for jpeg in ASSETS.rglob("*.jpeg"):
        jpeg.unlink()


def main() -> None:
    ensure_dirs()
    clear_old_rasters()
    create_rasters()
    create_svgs()
    copy_fonts()
    cleanup()


if __name__ == "__main__":
    main()
