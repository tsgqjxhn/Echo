"""Generate battlefield tile, boundary tile, and HUD ui elements."""
from __future__ import annotations

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "assets"
BG = ROOT / "backgrounds"
HUD = ROOT / "ui" / "hud"
PUZZLE = ROOT / "images" / "puzzle"
BG.mkdir(parents=True, exist_ok=True)
HUD.mkdir(parents=True, exist_ok=True)
PUZZLE.mkdir(parents=True, exist_ok=True)


def save(img, path):
    img.save(path)
    print(f"  wrote {path.relative_to(ROOT)}  ({img.width}x{img.height})")


# ---------------- Battlefield tile (128x128, tileable) ----------------
def make_tile(palette: tuple, name: str, accent_alpha=60):
    """Dark, subtly-textured 128x128 tile that loops cleanly."""
    size = 128
    img = Image.new("RGBA", (size, size), palette[0] + (255,))
    px = img.load()
    rng = random.Random(hash(name) & 0xFFFFFFFF)
    # Pixel noise — tone variation
    for y in range(size):
        for x in range(size):
            # blend two base tones based on noise
            n = (rng.random() - 0.5) * 0.18
            r0, g0, b0 = palette[0]
            r1, g1, b1 = palette[1]
            t = max(0, min(1, 0.5 + n))
            r = int(r0 * (1 - t) + r1 * t)
            g = int(g0 * (1 - t) + g1 * t)
            b = int(b0 * (1 - t) + b1 * t)
            px[x, y] = (r, g, b, 255)
    # Soft scattered specks (accent)
    d = ImageDraw.Draw(img, "RGBA")
    accent = palette[2] + (accent_alpha,)
    rng2 = random.Random((hash(name) ^ 0xA5A5A5) & 0xFFFFFFFF)
    for _ in range(40):
        x = rng2.randint(0, size - 1)
        y = rng2.randint(0, size - 1)
        r = rng2.randint(1, 3)
        d.ellipse([x - r, y - r, x + r, y + r], fill=accent)
    # Faint grid lines so movement is readable
    grid_alpha = 14
    grid = (255, 255, 255, grid_alpha)
    for k in (0, 64):
        d.line([(k, 0), (k, size)], fill=grid)
        d.line([(0, k), (size, k)], fill=grid)
    return img


def make_boundary_tile():
    """64x64 tile of red caution stripes; tile horizontally for borders."""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # diagonal stripes
    stripe = (220, 30, 30, 200)
    for off in range(-size, size * 2, 12):
        d.polygon([(off, 0), (off + 6, 0), (off + 6 + size, size), (off + size, size)],
                  fill=stripe)
    return img


# ---------------- HUD ----------------
def make_hpbar_bg(w=120, h=10):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2,
                        fill=(20, 20, 30, 220), outline=(60, 70, 90, 255))
    return img


def make_hpbar_fill(w=120, h=10, color_top=(120, 220, 110), color_bot=(40, 130, 60)):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(color_top[0] * (1 - t) + color_bot[0] * t)
        g = int(color_top[1] * (1 - t) + color_bot[1] * t)
        b = int(color_top[2] * (1 - t) + color_bot[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b, 255)
    # rounded corner mask
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=255)
    img.putalpha(mask)
    # highlight strip
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([2, 1, w - 3, 2], fill=(255, 255, 255, 110))
    return img


def make_xpbar_fill(w=120, h=6):
    return make_hpbar_fill(w, h, color_top=(140, 240, 250), color_bot=(0, 150, 180))


def make_joystick_base(size=90):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    # outer translucent ring with subtle gradient
    for r, a in [(size // 2 - 1, 80), (size // 2 - 4, 50), (size // 2 - 8, 30)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, a))
    d.ellipse([cx - size // 2 + 1, cy - size // 2 + 1, cx + size // 2 - 1, cy + size // 2 - 1],
              outline=(255, 255, 255, 150), width=2)
    # 4 directional arrows
    arrow = (255, 255, 255, 130)
    for ang_deg in (0, 90, 180, 270):
        a = math.radians(ang_deg)
        bx = cx + math.cos(a) * (size // 2 - 10)
        by = cy + math.sin(a) * (size // 2 - 10)
        # tiny triangle pointing outward
        ax = math.cos(a + math.pi)
        ay = math.sin(a + math.pi)
        px = math.cos(a + math.pi / 2)
        py = math.sin(a + math.pi / 2)
        d.polygon([
            (bx - ax * 4 + px * 3, by - ay * 4 + py * 3),
            (bx + ax * 2, by + ay * 2),
            (bx - ax * 4 - px * 3, by - ay * 4 - py * 3),
        ], fill=arrow)
    return img


def make_joystick_knob(size=36):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    # shadow
    d.ellipse([2, 4, size - 1, size - 1], fill=(0, 0, 0, 80))
    # body
    for r in range(size // 2 - 2, 0, -1):
        t = 1 - r / (size // 2 - 2)
        c = (
            int(220 + 35 * t),
            int(220 + 35 * t),
            int(230 + 25 * t),
            255,
        )
        d.ellipse([cx - r, cy - r - 1, cx + r, cy + r - 1], fill=c)
    # specular
    d.ellipse([cx - size // 4, cy - size // 3, cx + size // 8, cy - size // 6], fill=(255, 255, 255, 200))
    return img


def make_skill_button(size=70, color=(76, 175, 80), ready=True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    # outer halo for ready state
    if ready:
        for r, a in [(size // 2, 70), (size // 2 - 3, 110)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(color[0], color[1], color[2], a))
    # body
    body = color if ready else (110, 110, 120)
    d.ellipse([cx - size // 2 + 4, cy - size // 2 + 4, cx + size // 2 - 4, cy + size // 2 - 4],
              fill=body + (240,), outline=(0, 0, 0, 200), width=2)
    # specular highlight
    d.ellipse([cx - size // 4, cy - size // 2 + 8, cx + size // 6, cy - size // 4],
              fill=(255, 255, 255, 110))
    # inner ring
    d.ellipse([cx - size // 2 + 8, cy - size // 2 + 8, cx + size // 2 - 8, cy + size // 2 - 8],
              outline=(255, 255, 255, 90), width=2)
    # bolt icon (skill marker)
    bolt = (255, 255, 255, 235) if ready else (200, 200, 210, 200)
    d.polygon([
        (cx - 6, cy - 14),
        (cx + 4, cy - 4),
        (cx - 2, cy - 4),
        (cx + 6, cy + 14),
        (cx - 4, cy + 4),
        (cx + 2, cy + 4),
    ], fill=bolt)
    return img


def make_pause_button(w=60, h=30):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=8,
                        fill=(20, 20, 35, 200), outline=(255, 215, 64, 255), width=2)
    # two pause bars
    cx = w // 2
    d.rectangle([cx - 7, h // 2 - 7, cx - 3, h // 2 + 7], fill=(255, 215, 64, 255))
    d.rectangle([cx + 3, h // 2 - 7, cx + 7, h // 2 + 7], fill=(255, 215, 64, 255))
    return img


def make_card_bg(w=160, h=180, gold=False):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # base card
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=10,
                        fill=(40, 40, 60, 245),
                        outline=(255, 215, 64, 255) if gold else (90, 90, 120, 255), width=3)
    # inner gradient
    for y in range(8, h - 8):
        t = y / h
        a = int(80 - t * 40)
        d.line([(8, y), (w - 9, y)], fill=(80, 60, 110, max(0, a)))
    # gold corner ornaments if gold
    if gold:
        for cx, cy in [(8, 8), (w - 9, 8), (8, h - 9), (w - 9, h - 9)]:
            d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(255, 215, 64, 255))
    return img


def make_boss_hpbar_bg(w=240, h=14):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=6,
                        fill=(20, 10, 20, 230), outline=(220, 30, 30, 255), width=2)
    return img


def make_boss_hpbar_fill(w=240, h=14):
    return make_hpbar_fill(w, h, color_top=(255, 130, 90), color_bot=(180, 30, 30))


# ---------------- Puzzle elements ----------------
def make_puzzle_ball(size=16):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    d.ellipse([0, 0, size - 1, size - 1], fill=(150, 110, 30, 255), outline=(60, 40, 0, 255))
    d.ellipse([2, 2, size - 3, size - 3], fill=(255, 215, 64, 255))
    d.ellipse([cx - 4, cy - 5, cx, cy - 1], fill=(255, 255, 255, 220))
    return img


def make_puzzle_pin_h(w=75, h=6):
    img = Image.new("RGBA", (w, h + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # bar
    d.rounded_rectangle([0, 3, w - 1, h + 2], radius=2, fill=(180, 70, 70, 255), outline=(60, 20, 20, 255))
    d.rectangle([0, 3, w - 1, 4], fill=(240, 130, 130, 255))
    # arrow tips
    d.polygon([(0, 0), (10, 6), (0, h + 5)], fill=(220, 220, 220, 255))
    d.polygon([(w - 1, 0), (w - 11, 6), (w - 1, h + 5)], fill=(220, 220, 220, 255))
    return img


def make_puzzle_pin_v(w=6, h=60):
    img = Image.new("RGBA", (w + 6, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([3, 0, w + 2, h - 1], radius=2, fill=(70, 130, 180, 255), outline=(20, 50, 80, 255))
    d.rectangle([3, 0, 4, h - 1], fill=(140, 200, 250, 255))
    d.polygon([(0, 0), (6, 10), (w + 5, 0)], fill=(220, 220, 220, 255))
    d.polygon([(0, h - 1), (6, h - 11), (w + 5, h - 1)], fill=(220, 220, 220, 255))
    return img


def make_puzzle_lava(size=30):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    d.ellipse([0, 0, size - 1, size - 1], fill=(180, 30, 0, 255))
    d.ellipse([3, 3, size - 4, size - 4], fill=(255, 100, 0, 255))
    # flame tongues
    for i, ang in enumerate((-90, -45, 0, 45, 90, 135, 180, 225)):
        a = math.radians(ang)
        ex = cx + math.cos(a) * (size // 2 - 2)
        ey = cy + math.sin(a) * (size // 2 - 2)
        d.polygon([(cx + math.cos(a) * 4, cy + math.sin(a) * 4),
                   (cx + math.cos(a + 0.2) * (size // 2), cy + math.sin(a + 0.2) * (size // 2)),
                   (cx + math.cos(a - 0.2) * (size // 2), cy + math.sin(a - 0.2) * (size // 2))],
                  fill=(255, 200, 60, 220))
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 240, 150, 255))
    return img


def make_puzzle_spike(size=30):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = size // 2
    # base
    d.ellipse([2, size // 2 - 2, size - 3, size - 3], fill=(60, 60, 80, 255), outline=(20, 20, 30, 255))
    # spikes
    for i, ang in enumerate(range(-90, 270, 45)):
        a = math.radians(ang)
        x1 = cx + math.cos(a + 0.1) * 5
        y1 = cy + math.sin(a + 0.1) * 5
        x2 = cx + math.cos(a) * (size // 2 - 1)
        y2 = cy + math.sin(a) * (size // 2 - 1)
        x3 = cx + math.cos(a - 0.1) * 5
        y3 = cy + math.sin(a - 0.1) * 5
        d.polygon([(x1, y1), (x2, y2), (x3, y3)], fill=(200, 200, 220, 255), outline=(60, 60, 80, 255))
    # zap
    d.line([(cx - 4, cy - 3), (cx, cy + 1), (cx - 2, cy + 4), (cx + 4, cy + 1)],
           fill=(255, 230, 80, 255), width=2)
    return img


def make_puzzle_goal(w=60, h=30):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=6,
                        fill=(20, 60, 25, 230), outline=(120, 220, 120, 255), width=2)
    d.rounded_rectangle([3, 3, w - 4, h - 4], outline=(180, 255, 180, 200), width=1)
    # arrow indicator
    d.polygon([(w // 2 - 6, 8), (w // 2, 16), (w // 2 + 6, 8)], fill=(180, 255, 180, 220))
    return img


def main():
    print("Generating BG / HUD / Puzzle assets")

    # Battlefield themes
    themes = {
        "grass":   ((28, 56, 30),  (54, 88, 48),  (140, 200, 110)),
        "desert":  ((110, 86, 50), (148, 116, 70), (220, 200, 130)),
        "snow":    ((40, 60, 86),  (84, 110, 140), (220, 240, 255)),
        "dungeon": ((26, 26, 46),  (40, 38, 64),  (170, 100, 220)),
        "volcano": ((40, 12, 14),  (76, 22, 16),  (255, 110, 30)),
    }
    for name, palette in themes.items():
        save(make_tile(palette, name), BG / f"battlefield_{name}.png")
    save(make_boundary_tile(), BG / "boundary.png")

    # HUD
    save(make_hpbar_bg(120, 10), HUD / "hp_bg.png")
    save(make_hpbar_fill(120, 10, (120, 220, 110), (40, 130, 60)), HUD / "hp_fill_green.png")
    save(make_hpbar_fill(120, 10, (255, 130, 110), (180, 30, 30)), HUD / "hp_fill_red.png")
    save(make_xpbar_fill(120, 6), HUD / "xp_fill.png")
    save(make_joystick_base(90), HUD / "joystick_base.png")
    save(make_joystick_knob(36), HUD / "joystick_knob.png")
    save(make_skill_button(70, (76, 175, 80), True), HUD / "skill_ready.png")
    save(make_skill_button(70, (110, 110, 120), False), HUD / "skill_cooldown.png")
    save(make_pause_button(60, 30), HUD / "pause_btn.png")
    save(make_card_bg(160, 180, gold=False), HUD / "card_bg.png")
    save(make_card_bg(160, 180, gold=True), HUD / "card_bg_selected.png")
    save(make_boss_hpbar_bg(240, 14), HUD / "boss_hp_bg.png")
    save(make_boss_hpbar_fill(240, 14), HUD / "boss_hp_fill.png")

    # Puzzle
    save(make_puzzle_ball(16), PUZZLE / "ball.png")
    save(make_puzzle_pin_h(75, 6), PUZZLE / "pin_h.png")
    save(make_puzzle_pin_v(6, 60), PUZZLE / "pin_v.png")
    save(make_puzzle_lava(30), PUZZLE / "lava.png")
    save(make_puzzle_spike(30), PUZZLE / "spike.png")
    save(make_puzzle_goal(60, 30), PUZZLE / "goal.png")

    print("Done.")


if __name__ == "__main__":
    main()
