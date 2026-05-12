#!/usr/bin/env python3
"""
压缩下载文件夹中的地图图片为超小体积 WebP，用于《问道长生》APK。
策略：缩小到游戏分辨率 1280x720 + WebP 极低质量(15) + 移除元数据。
"""
import os
import sys
from pathlib import Path
from PIL import Image

DOWNLOADS = Path.home() / "Downloads"
ASSETS_BASE = Path("frontend/public/games/xiuxian-v2/assets/maps")
TARGET_SIZE = (1280, 720)
QUALITY = 15  # 极低质量，最小体积

# 文件名映射：下载文件名 -> (目标子目录, 资源key)
MAP_FILES = [
    ("地图.png",  "world",       "ten_domains"),
    ("沧溟.png",  "regions",     "central"),
    ("离火.png",  "regions",     "south"),
    ("瘴雨.png",  "regions",     "kunyuan"),
    ("金沙.png",  "regions",     "west"),
    ("青木.png",  "regions",     "east"),
    ("雪魄.png",  "regions",     "north"),
    ("玄霜.png",  "regions",     "northwest"),
    ("雷狱.png",  "regions",     "northeast"),
    ("天元.png",  "regions",     "southeast"),
]

def compress(src: Path, dst: Path):
    img = Image.open(src).convert("RGB")
    # 保持比例缩放到最大 1280x720
    img.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)
    # WebP 最大压缩
    img.save(dst, "WEBP", quality=QUALITY, method=6, exact=False)
    return dst.stat().st_size

def main():
    total_before = 0
    total_after = 0
    for filename, subdir, key in MAP_FILES:
        src = DOWNLOADS / filename
        dst_dir = ASSETS_BASE / subdir
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / f"{key}.webp"
        if not src.exists():
            print(f"SKIP: {src} not found")
            continue
        before = src.stat().st_size
        after = compress(src, dst)
        total_before += before
        total_after += after
        ratio = after / before * 100
        print(f"{filename:6} {before/1024:7.1f}KB -> {after/1024:7.1f}KB ({ratio:5.1f}%)")
    print(f"\nTotal: {total_before/1024/1024:.2f}MB -> {total_after/1024/1024:.2f}MB ({total_after/total_before*100:.1f}%)")

if __name__ == "__main__":
    main()
