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
        "crops",
        "tiles",
        "machines/farm",
        "machines/factory",
        "trees",
        "livestock",
        "buildings/farm",
        "buildings/factory",
        "decor/farm",
        "decor/shop",
        "factory/conveyor",
        "factory/logistics",
        "items/raw",
        "items/goods",
        "shop/shelves",
        "shop/customers",
        "shop/bubbles",
        "logistics/vehicles",
        "logistics/maps",
        "ui/icons",
        "ui/backgrounds",
        "ui/widgets",
        "effects",
        "fonts",
    ]:
        (ASSETS / folder).mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)


def clear_old_rasters() -> None:
    if ASSETS.exists():
        for ext in ("*.webp", "*.png", "*.jpg", "*.jpeg"):
            for path in ASSETS.rglob(ext):
                if TMP in path.parents:
                    continue
                path.unlink()


def font(size: int, bold: bool = False, title: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if title:
        candidates += [Path("C:/Windows/Fonts/STZHONGS.TTF"), Path("C:/Windows/Fonts/Dengb.ttf")]
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
        subprocess.run([CWEBP, "-quiet", "-lossless", "-z", "9", "-mt", str(png), "-o", str(lossless)], check=True)
        chosen = lossy if lossy.stat().st_size <= lossless.stat().st_size else lossless
        shutil.move(str(chosen), out)
        for temp in (png, lossy, lossless):
            if temp.exists():
                temp.unlink()
    else:
        img.save(out, "WEBP", quality=1, method=6)
        png.unlink(missing_ok=True)


def gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    w, h = size
    t = Image.new("RGB", (1, 1), top).getpixel((0, 0))
    b = Image.new("RGB", (1, 1), bottom).getpixel((0, 0))
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        a = y / max(1, h - 1)
        c = tuple(int(t[i] * (1 - a) + b[i] * a) for i in range(3))
        for x in range(w):
            px[x, y] = (*c, 255)
    return img


def add_noise(img: Image.Image, seed: int, alpha: int = 18) -> None:
    rng = Random(seed)
    d = ImageDraw.Draw(img)
    w, h = img.size
    for _ in range((w * h) // 180):
        x, y = rng.randrange(w), rng.randrange(h)
        v = rng.randrange(120, 255)
        d.point((x, y), fill=(v, v, v, alpha))


def draw_crop(key: str, color: str, stage: int) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 48, 54, 60), fill=(25, 42, 26, 190))
    if stage == 0:
        d.ellipse((24, 40, 40, 54), fill=(110, 82, 44, 255))
        return img
    stem_h = 12 + stage * 8
    d.line((32, 51, 32, 51 - stem_h), fill=(80, 170, 82, 255), width=4)
    for i in range(stage + 1):
        y = 48 - i * 8
        d.ellipse((18, y - 8, 34, y + 4), fill=(78, 180, 85, 255))
        d.ellipse((30, y - 9, 47, y + 3), fill=(88, 196, 96, 255))
    if stage >= 3:
        fruit = Image.new("RGB", (1, 1), color).getpixel((0, 0))
        for ox, oy in [(-8, -28), (7, -24), (0, -34)]:
            if key in {"wheat", "corn"}:
                d.rounded_rectangle((32 + ox - 3, 51 - stem_h + oy, 32 + ox + 5, 51 - stem_h + oy + 16), radius=3, fill=fruit)
            elif key in {"apple", "orange"}:
                d.ellipse((32 + ox - 6, 51 - stem_h + oy - 6, 32 + ox + 6, 51 - stem_h + oy + 6), fill=fruit)
            else:
                d.ellipse((32 + ox - 5, 51 - stem_h + oy - 5, 32 + ox + 5, 51 - stem_h + oy + 5), fill=fruit)
    if stage == 4:
        img = img.convert("LA").convert("RGBA")
        overlay = Image.new("RGBA", img.size, (150, 105, 55, 65))
        img.alpha_composite(overlay)
    return img


def draw_tile(kind: str, seed: int) -> Image.Image:
    colors = {
        "soil": ("#6a4329", "#3a2417"),
        "path": ("#8b7658", "#51442f"),
        "water": ("#245f7a", "#113447"),
        "grass": ("#356b35", "#153515"),
        "fence": ("#7d5b37", "#332317"),
        "rock": ("#797f84", "#3d4248"),
    }
    img = gradient((32, 32), *colors[kind])
    d = ImageDraw.Draw(img)
    rng = Random(seed)
    if kind == "fence":
        d.rectangle((0, 11, 32, 15), fill=(120, 78, 45, 255))
        d.rectangle((0, 21, 32, 25), fill=(120, 78, 45, 255))
        for x in range(3, 32, 10):
            d.rectangle((x, 4, x + 4, 31), fill=(148, 97, 55, 255))
    elif kind == "water":
        for y in (10, 19, 27):
            d.arc((-5, y - 8, 18, y + 8), 200, 340, fill=(117, 221, 242, 130), width=1)
            d.arc((13, y - 9, 38, y + 7), 200, 340, fill=(117, 221, 242, 130), width=1)
    elif kind == "rock":
        d.polygon([(7, 22), (11, 8), (22, 5), (28, 18), (21, 27), (10, 28)], fill=(141, 148, 154, 255), outline=(65, 72, 78, 255))
    else:
        for _ in range(18):
            x, y = rng.randrange(32), rng.randrange(32)
            d.point((x, y), fill=(255, 255, 255, 45))
    return img


def make_tileset() -> None:
    kinds = ["soil", "path", "water", "grass", "fence", "rock"]
    img = Image.new("RGBA", (32 * 6, 32), (0, 0, 0, 0))
    for i, kind in enumerate(kinds):
        img.alpha_composite(draw_tile(kind, 100 + i), (32 * i, 0))
    save_webp(img, "tiles/farm_tileset.webp")


def draw_vehicle(size: tuple[int, int], body: str, seed: int, frame: int = 0) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bob = (frame % 2) * 2
    d.rounded_rectangle((w * 0.12, h * 0.38 + bob, w * 0.76, h * 0.72 + bob), radius=6, fill=body, outline=(20, 29, 38, 255), width=2)
    d.polygon([(w * 0.60, h * 0.38 + bob), (w * 0.82, h * 0.48 + bob), (w * 0.82, h * 0.72 + bob), (w * 0.60, h * 0.72 + bob)], fill=(64, 115, 150, 255), outline=(20, 29, 38, 255))
    for x in (w * 0.25, w * 0.70):
        d.ellipse((x - 8, h * 0.67 + bob, x + 8, h * 0.67 + bob + 16), fill=(20, 22, 26, 255))
        d.ellipse((x - 4, h * 0.71 + bob, x + 4, h * 0.71 + bob + 8), fill=(180, 185, 190, 255))
    return img


def draw_machine(size: tuple[int, int], color: str, state: str) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    state_overlay = {"idle": "#4b5563", "working": "#22d3ee", "broken": "#f87171", "upgrade": "#ffd700"}[state]
    d.rounded_rectangle((8, 14, w - 8, h - 8), radius=8, fill=color, outline=(26, 36, 48, 255), width=3)
    d.rectangle((18, 22, w - 18, 36), fill=(15, 25, 35, 220))
    d.ellipse((18, h - 32, 38, h - 12), fill=(22, 28, 34, 255))
    d.ellipse((w - 38, h - 32, w - 18, h - 12), fill=(22, 28, 34, 255))
    d.ellipse((w / 2 - 10, h / 2 - 10, w / 2 + 10, h / 2 + 10), fill=state_overlay)
    if state == "working":
        d.arc((w / 2 - 17, h / 2 - 17, w / 2 + 17, h / 2 + 17), 30, 310, fill=(255, 255, 255, 210), width=3)
    if state == "broken":
        d.line((20, 16, w - 18, h - 10), fill=(255, 220, 220, 220), width=3)
    if state == "upgrade":
        d.polygon([(w - 20, 9), (w - 10, 29), (w - 30, 29)], fill=(255, 215, 0, 255))
    return img


def draw_building(size: tuple[int, int], main: str, roof: str, seed: int, label: str = "") -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((w * 0.12, h * 0.82, w * 0.88, h * 0.96), fill=(0, 0, 0, 55))
    d.rectangle((w * 0.18, h * 0.40, w * 0.82, h * 0.82), fill=main, outline=(28, 36, 42, 255), width=3)
    d.polygon([(w * 0.12, h * 0.42), (w * 0.50, h * 0.16), (w * 0.88, h * 0.42)], fill=roof, outline=(28, 36, 42, 255))
    d.rectangle((w * 0.42, h * 0.58, w * 0.58, h * 0.82), fill=(65, 45, 33, 255))
    d.rectangle((w * 0.25, h * 0.50, w * 0.38, h * 0.63), fill=(95, 170, 190, 220))
    d.rectangle((w * 0.62, h * 0.50, w * 0.75, h * 0.63), fill=(95, 170, 190, 220))
    if label:
        d.text((w * 0.26, h * 0.28), label, font=font(max(10, w // 12), bold=True), fill=(255, 255, 255, 230))
    return img


def draw_item_icon(kind: str, color: str, seed: int, label: str = "") -> Image.Image:
    img = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rgb = Image.new("RGB", (1, 1), color).getpixel((0, 0))
    d.rounded_rectangle((3, 3, 45, 45), radius=8, fill=(18, 31, 42, 230), outline=(*rgb, 255), width=2)
    if kind == "bag":
        d.rounded_rectangle((14, 16, 34, 36), radius=3, fill=(*rgb, 255))
        d.arc((17, 10, 31, 24), 180, 360, fill=(230, 238, 245, 230), width=2)
    elif kind == "bottle":
        d.rectangle((20, 10, 28, 18), fill=(210, 240, 255, 230))
        d.rounded_rectangle((15, 17, 33, 38), radius=5, fill=(*rgb, 225))
    elif kind == "roll":
        d.ellipse((12, 16, 26, 32), fill=(*rgb, 255))
        d.rectangle((19, 16, 36, 32), fill=(*rgb, 255))
        d.ellipse((29, 16, 43, 32), fill=(245, 245, 245, 230))
    elif kind == "food":
        d.ellipse((11, 17, 37, 35), fill=(*rgb, 255), outline=(255, 255, 255, 130), width=2)
    else:
        d.polygon([(24, 8), (38, 20), (34, 38), (15, 40), (8, 21)], fill=(*rgb, 255))
    if label:
        d.text((18, 17), label[:1], font=font(14, bold=True), fill=(10, 18, 24, 255))
    return img


def draw_shelf(style: str, state: str) -> Image.Image:
    img = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    colors = {
        "wood": "#8b5a2b",
        "metal": "#7c8794",
        "cold": "#78d5ee",
        "display": "#d4a853",
    }
    c = colors[style]
    d.rounded_rectangle((8, 10, 56, 88), radius=6, fill=(28, 38, 48, 235), outline=c, width=3)
    for y in (32, 55, 78):
        d.rectangle((12, y, 52, y + 4), fill=c)
    if state in {"half", "full"}:
        rows = 2 if state == "half" else 3
        for row in range(rows):
            for col in range(3):
                x = 17 + col * 12
                y = 20 + row * 23
                d.rounded_rectangle((x, y, x + 8, y + 10), radius=2, fill=["#ffd166", "#4ade80", "#fb923c"][col])
    return img


def draw_customer(seed: int, palette: tuple[str, str, str]) -> Image.Image:
    rng = Random(seed)
    img = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 4, 22, 16), fill=(225, 185, 145, 255))
    d.pieslice((8, 2, 24, 14), 180, 360, fill=palette[0])
    d.rounded_rectangle((8, 17, 24, 36), radius=5, fill=palette[1])
    d.line((10, 36, 8 + rng.randint(0, 2), 46), fill=palette[2], width=4)
    d.line((22, 36, 24 - rng.randint(0, 2), 46), fill=palette[2], width=4)
    d.line((8, 22, 2, 31), fill=(225, 185, 145, 255), width=3)
    d.line((24, 22, 30, 31), fill=(225, 185, 145, 255), width=3)
    return img


def draw_background(kind: str) -> Image.Image:
    palettes = {
        "farm": ("#7ec850", "#1d4525"),
        "factory": ("#26394b", "#0d1720"),
        "shop": ("#ad6b3d", "#261711"),
        "loading": ("#1d6f52", "#101b2a"),
    }
    img = gradient((960, 540), *palettes[kind])
    d = ImageDraw.Draw(img)
    if kind == "farm":
        d.rectangle((0, 310, 960, 540), fill=(35, 92, 42, 245))
        for x in range(-40, 960, 95):
            d.polygon([(x, 315), (x + 80, 260), (x + 160, 315)], fill=(50, 114, 58, 230))
        for y in range(340, 540, 42):
            d.line((0, y, 960, y + 20), fill=(115, 83, 46, 135), width=4)
    elif kind == "factory":
        d.rectangle((0, 330, 960, 540), fill=(35, 42, 50, 255))
        for x in (130, 320, 560, 760):
            d.rectangle((x, 180, x + 110, 380), fill=(54, 68, 82, 230))
            d.rectangle((x + 75, 105, x + 95, 180), fill=(45, 52, 62, 255))
            d.ellipse((x + 60, 70, x + 125, 120), fill=(165, 180, 190, 70))
    elif kind == "shop":
        d.rectangle((0, 320, 960, 540), fill=(82, 48, 30, 255))
        for x in range(40, 960, 180):
            d.rounded_rectangle((x, 190, x + 120, 350), radius=8, fill=(125, 72, 42, 235), outline=(255, 210, 128, 120), width=3)
    else:
        d.text((210, 150), "垂直整合帝国", font=font(72, title=True), fill=(255, 245, 210, 255))
        d.text((286, 248), "Vertical Farm Empire", font=font(30, bold=True), fill=(205, 238, 255, 220))
    add_noise(img, len(kind) * 77, 13)
    return img


def draw_route_map() -> Image.Image:
    img = draw_background("farm")
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((74, 80, 264, 220), radius=18, fill=(31, 86, 44, 235), outline=(74, 222, 128, 255), width=5)
    d.rounded_rectangle((390, 260, 580, 405), radius=18, fill=(32, 55, 78, 235), outline=(96, 165, 250, 255), width=5)
    d.rounded_rectangle((700, 110, 890, 250), radius=18, fill=(105, 63, 36, 235), outline=(251, 146, 60, 255), width=5)
    d.line((264, 150, 390, 330, 700, 180), fill=(255, 230, 140, 240), width=14)
    for x, y, label in [(142, 130, "农场"), (458, 310, "工厂"), (768, 160, "商店")]:
        d.text((x, y), label, font=font(34, bold=True), fill=(255, 255, 255, 255))
    return img


def draw_ui_icon(key: str, color: str, label: str = "") -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rgb = Image.new("RGB", (1, 1), color).getpixel((0, 0))
    d.rounded_rectangle((2, 2, 30, 30), radius=8, fill=(18, 31, 42, 230), outline=(*rgb, 255), width=2)
    if key in {"gold", "save", "settings", "level", "time", "prestige"}:
        d.ellipse((9, 9, 23, 23), fill=(*rgb, 255))
    elif key in {"farm", "factory", "shop", "logistics"}:
        d.rectangle((8, 14, 24, 25), fill=(*rgb, 255))
        d.polygon([(7, 14), (16, 7), (25, 14)], fill=(240, 240, 240, 190))
    elif key in {"upgrades", "buffs", "overview"}:
        d.polygon([(16, 5), (27, 27), (16, 22), (5, 27)], fill=(*rgb, 255))
    else:
        d.polygon([(16, 6), (27, 15), (23, 27), (9, 27), (5, 15)], fill=(*rgb, 255))
    if label:
        d.text((11, 9), label[:1], font=font(10, bold=True), fill=(8, 16, 22, 255))
    return img


def create_rasters() -> None:
    crop_colors = {
        "wheat": "#e6c766",
        "carrot": "#f97316",
        "cabbage": "#7ccf77",
        "beet": "#a83d65",
        "apple": "#dc3545",
        "orange": "#fb923c",
        "tomato": "#ef4444",
        "corn": "#facc15",
    }
    for key, color in crop_colors.items():
        for stage in range(5):
            save_webp(draw_crop(key, color, stage), f"crops/{key}_{stage}.webp")
        save_webp(draw_item_icon("food", color, 10, ""), f"items/raw/{key}.webp")
    make_tileset()

    for machine, color in [("tractor", "#ef4444"), ("seeder", "#4ade80"), ("harvester", "#f59e0b")]:
        for frame in range(4):
            save_webp(draw_vehicle((64, 64), color, 20 + frame, frame), f"machines/farm/{machine}_{frame}.webp")

    for tree, color in [("apple", "#ef4444"), ("orange", "#fb923c")]:
        for stage in range(5):
            img = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rectangle((29, 42, 36, 88), fill=(103, 63, 35, 255))
            d.ellipse((12, 18, 54, 58), fill=(58, 126, 62, 255))
            if stage >= 2:
                fill = "#ffe5a0" if stage == 2 else color
                for x, y in [(24, 34), (39, 31), (33, 45), (18, 45)]:
                    d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=fill)
            if stage == 0:
                img = draw_crop(tree, color, 1).resize((64, 64), Image.Resampling.NEAREST)
                canvas = Image.new("RGBA", (64, 96), (0, 0, 0, 0))
                canvas.alpha_composite(img, (0, 28))
                img = canvas
            save_webp(img, f"trees/{tree}_{stage}.webp")

    for animal, pal in {
        "cow": ("#f5f5f5", "#333333"),
        "sheep": ("#eeeeee", "#665544"),
        "chicken": ("#f8d56b", "#e2432a"),
        "pig": ("#f7a9b8", "#bf6070"),
    }.items():
        for frame in range(4):
            img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.ellipse((5, 11 + frame % 2, 25, 25 + frame % 2), fill=pal[0], outline=pal[1], width=1)
            d.ellipse((18, 7, 30, 19), fill=pal[0], outline=pal[1], width=1)
            d.line((9, 24, 7, 30), fill=pal[1], width=2)
            d.line((21, 24, 23, 30), fill=pal[1], width=2)
            save_webp(img, f"livestock/{animal}_{frame}.webp")

    for name, main, roof, label in [
        ("barn", "#9a4d2f", "#6b2f22", "仓"),
        ("tool_shed", "#7a6347", "#4a3828", "具"),
        ("windmill", "#c9b58a", "#7b6a52", "风"),
        ("greenhouse", "#68d6b2", "#2d7c69", "温"),
        ("pump", "#5f8da9", "#334b5c", "泵"),
    ]:
        save_webp(draw_building((128, 128), main, roof, 50, label), f"buildings/farm/{name}.webp")

    for i, (name, color) in enumerate([
        ("scarecrow", "#d4a853"),
        ("cloud", "#eaf5ff"),
        ("mountain", "#697f7c"),
        ("canal", "#4fb5d8"),
        ("butterfly", "#c084fc"),
        ("dragonfly", "#22d3ee"),
        ("haystack", "#d9aa4f"),
        ("flowerbed", "#ef6f8f"),
    ]):
        save_webp(draw_item_icon("food", color, i), f"decor/farm/{name}.webp")

    for name, color in [
        ("mill", "#8b6f47"),
        ("juicer", "#fb923c"),
        ("textile", "#c084fc"),
        ("packaging", "#60a5fa"),
        ("boiler", "#f87171"),
        ("cold_storage", "#22d3ee"),
    ]:
        for state in ("idle", "working", "broken", "upgrade"):
            save_webp(draw_machine((64, 64), color, state), f"machines/factory/{name}_{state}.webp")

    for shape in ("straight", "turn", "split", "vertical"):
        for frame in range(3):
            img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle((2, 10, 30, 22), radius=4, fill=(55, 65, 75, 255), outline=(120, 132, 146, 255))
            for x in range(-20 + frame * 8, 32, 12):
                d.rectangle((x, 11, x + 6, 21), fill=(100, 116, 132, 255))
            if shape == "vertical":
                img = img.rotate(90)
            elif shape == "turn":
                d.pieslice((8, 8, 40, 40), 180, 270, outline=(120, 132, 146, 255), width=10)
            elif shape == "split":
                d.line((16, 16, 26, 6), fill=(120, 132, 146, 255), width=7)
            save_webp(img, f"factory/conveyor/{shape}_{frame}.webp")

    for name, main, roof, label in [
        ("plant", "#44566a", "#1f2937", "厂"),
        ("warehouse_raw", "#6a5a44", "#3a3024", "原"),
        ("warehouse_goods", "#5c6b8d", "#2b3855", "货"),
    ]:
        save_webp(draw_building((192, 192), main, roof, 70, label), f"buildings/factory/{name}.webp")
    for i, (name, color) in enumerate([("pallet_jack", "#f59e0b"), ("forklift", "#facc15"), ("robot_arm", "#60a5fa"), ("lift", "#94a3b8")]):
        save_webp(draw_vehicle((64, 64), color, i, i), f"factory/logistics/{name}.webp")

    goods = {
        "flour": ("bag", "#e6d2a3", "粉"),
        "carrot_juice": ("bottle", "#fb923c", "汁"),
        "sauerkraut": ("food", "#a6d672", "酸"),
        "cornmeal": ("bag", "#facc15", "玉"),
        "sugar": ("bag", "#f8fafc", "糖"),
        "tomato_sauce": ("bottle", "#ef4444", "酱"),
        "apple_juice": ("bottle", "#ef4444", "苹"),
        "orange_juice": ("bottle", "#f97316", "橙"),
        "apple_pie": ("food", "#d97706", "派"),
        "bread": ("food", "#c08446", "包"),
        "pizza": ("food", "#fb923c", "披"),
        "fruit_salad": ("food", "#4ade80", "果"),
    }
    for i, (key, (kind, color, label)) in enumerate(goods.items()):
        save_webp(draw_item_icon(kind, color, i, label), f"items/goods/{key}.webp")
    for key, color, label in [
        ("cloth_roll", "#c084fc", "布"),
        ("empty_bottle", "#b7efff", "瓶"),
        ("pallet", "#b78552", "托"),
        ("crate", "#d4a853", "箱"),
    ]:
        save_webp(draw_item_icon("roll", color, 90, label), f"items/goods/{key}.webp")

    for style in ("wood", "metal", "cold", "display"):
        for state in ("empty", "half", "full"):
            save_webp(draw_shelf(style, state), f"shop/shelves/{style}_{state}.webp")
    for i, pal in enumerate([
        ("#1f2937", "#60a5fa", "#2d3748"),
        ("#5b2d42", "#f472b6", "#4b5563"),
        ("#eeeeee", "#9ca3af", "#374151"),
        ("#4b3621", "#f59e0b", "#1f2937"),
        ("#2f4f2f", "#4ade80", "#334155"),
        ("#28384f", "#22d3ee", "#1e293b"),
        ("#45345d", "#c084fc", "#2b2d42"),
        ("#5e3427", "#fb923c", "#374151"),
    ], 1):
        save_webp(draw_customer(200 + i, pal), f"shop/customers/customer_{i:02d}.webp")
    for name, color in [("happy", "#4ade80"), ("neutral", "#facc15"), ("impatient", "#fb923c"), ("angry", "#f87171")]:
        save_webp(draw_ui_icon(name, color), f"shop/bubbles/{name}.webp")
    for i, (name, color) in enumerate([
        ("plant", "#4ade80"),
        ("fountain", "#22d3ee"),
        ("bench", "#b78552"),
        ("lamp", "#facc15"),
        ("lantern", "#f87171"),
        ("tree", "#4ade80"),
        ("poster", "#c084fc"),
        ("gift", "#fb923c"),
    ]):
        save_webp(draw_item_icon("food", color, i), f"decor/shop/{name}.webp")

    for vehicle, color, size in [
        ("van", "#60a5fa", (64, 32)),
        ("truck", "#f59e0b", (64, 32)),
        ("forklift", "#facc15", (64, 32)),
        ("bike", "#4ade80", (64, 32)),
    ]:
        for frame in range(4):
            save_webp(draw_vehicle(size, color, 300 + frame, frame), f"logistics/vehicles/{vehicle}_{frame}.webp")
    save_webp(draw_route_map(), "logistics/maps/route_map.webp")

    for key in ("farm", "factory", "shop", "loading"):
        save_webp(draw_background(key), f"ui/backgrounds/{key}.webp")
    for name, color in [("panel_wood", "#6b4d35"), ("panel_stone", "#4b5563"), ("panel_metal", "#475569"), ("button_primary", "#2563eb"), ("button_secondary", "#334155"), ("button_danger", "#dc2626"), ("progress_green", "#4ade80"), ("progress_blue", "#60a5fa"), ("progress_orange", "#fb923c"), ("progress_purple", "#c084fc"), ("modal_panel", "#1a2a3a")]:
        save_webp(draw_ui_icon(name, color), f"ui/widgets/{name}.webp")

    icon_names = [
        "gold", "diamond", "level", "settings", "save", "close", "arrow", "tag", "farm", "factory",
        "shop", "logistics", "upgrades", "buffs", "overview", "xp", "time", "prestige", "seed", "water",
        "fertilizer", "greenhouse", "tractor", "machine", "speed", "automation", "shelf", "ad", "decor",
        "truck", "truck_speed", "growth_boost", "production_boost", "customer_frenzy", "price_surge",
        "fuel", "inventory", "sell", "buy", "harvest", "collect", "route", "customer", "warning",
        "success", "info", "income", "factory_unlock", "shop_unlock", "logistics_unlock", "offline",
        "goods", "raw", "recipe", "stats",
    ]
    colors = ["#ffd700", "#22d3ee", "#c084fc", "#94a3b8", "#4ade80", "#f87171", "#60a5fa", "#fb923c"]
    for i, key in enumerate(icon_names):
        save_webp(draw_ui_icon(key, colors[i % len(colors)], ""), f"ui/icons/{key}.webp")


def write_svg(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def create_svgs() -> None:
    write_svg(
        ASSETS / "effects/coin_splash.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g fill="#ffd700"><circle cx="80" cy="82" r="20"/><circle cx="80" cy="82" r="12" fill="#fff2a3"/><g><circle cx="80" cy="82" r="7"><animate attributeName="cx" values="80;28;80" dur="1.1s" repeatCount="indefinite"/><animate attributeName="cy" values="82;35;82" dur="1.1s" repeatCount="indefinite"/></circle><circle cx="80" cy="82" r="6"><animate attributeName="cx" values="80;132;80" dur="1.2s" repeatCount="indefinite"/><animate attributeName="cy" values="82;42;82" dur="1.2s" repeatCount="indefinite"/></circle><circle cx="80" cy="82" r="5"><animate attributeName="cx" values="80;56;80" dur=".9s" repeatCount="indefinite"/><animate attributeName="cy" values="82;128;82" dur=".9s" repeatCount="indefinite"/></circle></g></g></svg>""",
    )
    write_svg(
        ASSETS / "effects/upgrade_aura.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><g fill="none" stroke="#4ade80" stroke-linecap="round"><circle cx="90" cy="90" r="34" stroke-width="5"><animate attributeName="r" values="34;78;34" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.15;1" dur="1.8s" repeatCount="indefinite"/></circle><path d="M90 18L104 70L158 90L104 110L90 162L76 110L22 90L76 70Z" stroke-width="4"><animateTransform attributeName="transform" type="rotate" from="0 90 90" to="360 90 90" dur="4s" repeatCount="indefinite"/></path></g></svg>""",
    )
    write_svg(
        ASSETS / "effects/steam_particle.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g fill="#d8eef5" opacity=".55"><circle cx="44" cy="92" r="10"><animate attributeName="cy" values="92;20;92" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".1;.7;.1" dur="2.4s" repeatCount="indefinite"/></circle><circle cx="72" cy="104" r="13"><animate attributeName="cy" values="104;28;104" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".05;.55;.05" dur="3s" repeatCount="indefinite"/></circle></g></svg>""",
    )
    write_svg(
        ASSETS / "effects/exp_stars.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><g fill="#c084fc"><path d="M80 10L88 48L126 56L91 72L98 110L80 82L62 110L69 72L34 56L72 48Z"><animate attributeName="opacity" values=".2;1;.2" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 16;0 -8;0 16" dur="1s" repeatCount="indefinite"/></path></g></svg>""",
    )
    write_svg(
        ASSETS / "effects/offline_rewards.svg",
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220"><rect width="420" height="220" rx="22" fill="#102032"/><g fill="#ffd700"><circle cx="82" cy="112" r="22"/><circle cx="338" cy="112" r="22"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="1.6s" repeatCount="indefinite"/></g><text x="210" y="102" fill="#e0e8f0" text-anchor="middle" font-size="28" font-family="sans-serif">欢迎回来</text><text x="210" y="142" fill="#22d3ee" text-anchor="middle" font-size="16" font-family="sans-serif">产业链仍在运转</text></svg>""",
    )


def copy_fonts() -> None:
    sources = {
        "EmpireBody.ttf": Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"),
        "EmpireTitle.ttf": Path("C:/Windows/Fonts/STZHONGS.TTF"),
    }
    for name, source in sources.items():
        if source.exists():
            shutil.copyfile(source, ASSETS / "fonts" / name)


def cleanup() -> None:
    if TMP.exists():
        shutil.rmtree(TMP)
    for ext in ("*.png", "*.jpg", "*.jpeg"):
        for path in ASSETS.rglob(ext):
            path.unlink()


def main() -> None:
    ensure_dirs()
    clear_old_rasters()
    create_rasters()
    create_svgs()
    copy_fonts()
    cleanup()


if __name__ == "__main__":
    main()
