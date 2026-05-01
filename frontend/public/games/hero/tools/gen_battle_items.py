from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SHOP_DIR = ROOT / "assets" / "images" / "shop"
HUD_DIR = ROOT / "assets" / "ui" / "hud"


def find_cwebp() -> str:
    found = shutil.which("cwebp")
    if found:
        return found
    winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget.exists():
        matches = list(winget.glob("Google.Libwebp_*/*/bin/cwebp.exe"))
        if matches:
            return str(matches[0])
    known = Path(
        r"C:\Users\EricWeston\AppData\Local\Microsoft\WinGet\Packages"
        r"\Google.Libwebp_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\libwebp-1.6.0-windows-x64\bin\cwebp.exe"
    )
    if known.exists():
        return str(known)
    raise FileNotFoundError("cwebp.exe not found")


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    scale = 4
    img = Image.new("RGBA", (64 * scale, 64 * scale), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def downsample(img: Image.Image) -> Image.Image:
    return img.resize((64, 64), Image.Resampling.LANCZOS)


def circle_badge(draw: ImageDraw.ImageDraw, fill: str, outline: str) -> None:
    draw.ellipse((18, 18, 238, 238), fill=fill, outline=outline, width=8)
    draw.ellipse((34, 34, 222, 222), outline=(255, 255, 255, 70), width=4)


def draw_cross(draw: ImageDraw.ImageDraw, fill: str) -> None:
    draw.rounded_rectangle((108, 62, 148, 194), radius=10, fill=fill)
    draw.rounded_rectangle((62, 108, 194, 148), radius=10, fill=fill)


def icon_blood_pack() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#7a1720", "#ff6b6b")
    d.rounded_rectangle((78, 54, 178, 204), radius=22, fill="#f7f2e8", outline="#311016", width=6)
    d.rounded_rectangle((92, 38, 164, 70), radius=10, fill="#d7d9d0", outline="#311016", width=5)
    d.rectangle((96, 106, 160, 170), fill="#d7263d")
    draw_cross(d, "#fff4f4")
    return downsample(img)


def icon_sedative() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#17325d", "#56c6ff")
    d.rounded_rectangle((66, 104, 192, 148), radius=18, fill="#e9f8ff", outline="#09213d", width=6)
    d.rounded_rectangle((66, 104, 128, 148), radius=18, fill="#35a7ff")
    d.line((130, 112, 130, 140), fill="#09213d", width=5)
    d.arc((88, 54, 168, 134), 205, 340, fill="#ffffff", width=8)
    d.polygon([(170, 66), (192, 74), (176, 92)], fill="#ffffff")
    return downsample(img)


def icon_puppet() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#4d331d", "#d09a52")
    d.rounded_rectangle((80, 64, 176, 184), radius=20, fill="#b97a3c", outline="#2b1b12", width=6)
    d.ellipse((92, 80, 116, 104), fill="#1e130d")
    d.ellipse((140, 80, 164, 104), fill="#1e130d")
    d.arc((100, 104, 156, 146), 15, 165, fill="#2b1b12", width=6)
    d.line((128, 38, 128, 64), fill="#2b1b12", width=7)
    d.line((56, 118, 80, 132), fill="#d09a52", width=11)
    d.line((176, 132, 204, 112), fill="#d09a52", width=11)
    d.line((100, 184, 82, 218), fill="#d09a52", width=11)
    d.line((156, 184, 174, 218), fill="#d09a52", width=11)
    return downsample(img)


def icon_smoke_bomb() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#1d2f2c", "#97f0c7")
    d.ellipse((80, 130, 176, 210), fill="#20232a", outline="#0a0d10", width=6)
    d.rectangle((112, 104, 144, 140), fill="#39434a")
    d.line((128, 104, 172, 54), fill="#ffe082", width=8)
    d.arc((158, 28, 214, 84), 110, 260, fill="#f9ffbf", width=7)
    for box in [(54, 64, 130, 128), (114, 52, 194, 126), (98, 26, 160, 82)]:
        d.ellipse(box, fill=(199, 232, 221, 190))
    return downsample(img)


def icon_rebirth_charm() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#4b2811", "#ffd166")
    d.rounded_rectangle((76, 42, 180, 214), radius=16, fill="#f3d58a", outline="#3d210c", width=7)
    d.polygon([(128, 70), (148, 116), (198, 122), (158, 150), (170, 198), (128, 172), (86, 198), (98, 150), (58, 122), (108, 116)], fill="#d94b2b")
    d.ellipse((108, 92, 148, 132), fill="#ffd166")
    d.line((100, 42, 156, 214), fill=(255, 255, 255, 70), width=6)
    return downsample(img)


def icon_backpack() -> Image.Image:
    img, d = canvas()
    circle_badge(d, "#182442", "#8fb3ff")
    d.rounded_rectangle((72, 88, 184, 206), radius=24, fill="#5b6d8d", outline="#111827", width=7)
    d.rounded_rectangle((92, 56, 164, 108), radius=20, outline="#cbd8ff", width=9)
    d.rounded_rectangle((92, 118, 164, 166), radius=12, fill="#2f3d59", outline="#d8e3ff", width=5)
    d.line((72, 118, 184, 118), fill="#111827", width=5)
    d.ellipse((120, 134, 136, 150), fill="#ffd166")
    return downsample(img)


ASSETS = {
    SHOP_DIR / "blood_pack.webp": icon_blood_pack,
    SHOP_DIR / "sedative.webp": icon_sedative,
    SHOP_DIR / "puppet.webp": icon_puppet,
    SHOP_DIR / "smoke_bomb.webp": icon_smoke_bomb,
    SHOP_DIR / "rebirth_charm.webp": icon_rebirth_charm,
    HUD_DIR / "backpack.webp": icon_backpack,
}


def encode_webp(cwebp: str, png: Path, out: Path) -> None:
    candidates = [out.with_suffix(".lossy.webp"), out.with_suffix(".lossless.webp")]
    commands = [
        [cwebp, "-q", "0", "-m", "6", "-pass", "10", "-mt", "-alpha_q", "0", "-af", "-metadata", "none", str(png), "-o", str(candidates[0])],
        [cwebp, "-lossless", "-z", "9", "-metadata", "none", str(png), "-o", str(candidates[1])],
    ]
    for cmd in commands:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    best = min(candidates, key=lambda p: p.stat().st_size)
    if out.exists():
        out.unlink()
    best.replace(out)
    for candidate in candidates:
        if candidate.exists():
            candidate.unlink()


def main() -> None:
    cwebp = find_cwebp()
    SHOP_DIR.mkdir(parents=True, exist_ok=True)
    HUD_DIR.mkdir(parents=True, exist_ok=True)
    for out, factory in ASSETS.items():
        png = out.with_suffix(".tmp.png")
        factory().save(png)
        encode_webp(cwebp, png, out)
        png.unlink(missing_ok=True)
        print(f"{out.relative_to(ROOT)} {out.stat().st_size} bytes")


if __name__ == "__main__":
    main()
