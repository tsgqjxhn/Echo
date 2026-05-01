"""Generate player sprite sheets for the roguelike game.

Top-down chibi hero, pixel-art style. 64x64 per frame.
Output dir: assets/sprites/player/
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw

# ---------- Palette ----------
TRANSPARENT = (0, 0, 0, 0)
OUTLINE     = (13, 27, 42, 255)      # dark navy outline
SKIN        = (245, 208, 169, 255)
SKIN_SHADE  = (210, 170, 130, 255)
HAIR        = (60, 40, 25, 255)
HAIR_HI     = (95, 65, 40, 255)

ARMOR       = (79, 195, 247, 255)    # matches old #4fc3f7
ARMOR_DARK  = (33, 110, 180, 255)
ARMOR_HI    = (179, 229, 252, 255)

GOLD        = (255, 215, 64, 255)
GOLD_DARK   = (200, 160, 30, 255)

CAPE        = (211, 47, 47, 255)
CAPE_DARK   = (130, 25, 25, 255)

STEEL       = (207, 216, 220, 255)
STEEL_DARK  = (120, 140, 150, 255)
GRIP        = (93, 64, 55, 255)

BOOT        = (50, 40, 40, 255)
SHADOW      = (0, 0, 0, 90)

W = H = 64
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "sprites" / "player"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------- Drawing helpers ----------
def new_frame() -> Image.Image:
    return Image.new("RGBA", (W, H), TRANSPARENT)


def shadow(d: ImageDraw.ImageDraw, cx: int, cy: int, rx: int = 14, ry: int = 5) -> None:
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=SHADOW)


def outlined_ellipse(d, box, fill, outline=OUTLINE):
    d.ellipse(box, fill=fill, outline=outline)


def outlined_rect(d, box, fill, outline=OUTLINE):
    d.rectangle(box, fill=fill, outline=outline)


# ---------- Hero parts (top-down 3/4 view, facing DOWN by default) ----------
def draw_legs(d, ox, oy, swing=0):
    # swing in pixels: + = right leg forward
    # Left leg
    lx = ox - 6
    rx = ox + 6
    # left leg position
    lyo = -swing
    ryo =  swing
    d.rectangle([lx - 3, oy + 4 + lyo, lx + 3, oy + 14 + lyo], fill=ARMOR_DARK, outline=OUTLINE)
    d.rectangle([rx - 3, oy + 4 + ryo, rx + 3, oy + 14 + ryo], fill=ARMOR_DARK, outline=OUTLINE)
    # boots
    d.rectangle([lx - 3, oy + 12 + lyo, lx + 3, oy + 16 + lyo], fill=BOOT, outline=OUTLINE)
    d.rectangle([rx - 3, oy + 12 + ryo, rx + 3, oy + 16 + ryo], fill=BOOT, outline=OUTLINE)


def draw_cape(d, ox, oy, sway=0):
    pts = [
        (ox - 11 + sway, oy - 4),
        (ox + 11 + sway, oy - 4),
        (ox + 9 + sway,  oy + 12),
        (ox + sway,      oy + 16),
        (ox - 9 + sway,  oy + 12),
    ]
    d.polygon(pts, fill=CAPE, outline=OUTLINE)
    # darker fold
    d.line([(ox + sway, oy - 4), (ox + sway, oy + 15)], fill=CAPE_DARK)


def draw_torso(d, ox, oy, squash=0):
    # squash: visual breathing (positive = wider/shorter)
    top = oy - 6 - squash // 2
    bot = oy + 6 + squash // 2
    left = ox - 9 - squash
    right = ox + 9 + squash
    d.rounded_rectangle([left, top, right, bot], radius=4, fill=ARMOR, outline=OUTLINE)
    # chest plate highlight
    d.rectangle([ox - 6, top + 2, ox + 6, top + 5], fill=ARMOR_HI)
    # gold belt
    d.rectangle([left + 1, bot - 3, right - 1, bot - 1], fill=GOLD, outline=GOLD_DARK)
    # gold cross emblem
    d.rectangle([ox - 1, top + 3, ox + 1, top + 8], fill=GOLD)
    d.rectangle([ox - 3, top + 5, ox + 3, top + 6], fill=GOLD)


def draw_arms(d, ox, oy, lx_off=0, ly_off=0, rx_off=0, ry_off=0):
    # left arm
    d.rounded_rectangle(
        [ox - 14 + lx_off, oy - 4 + ly_off, ox - 9 + lx_off, oy + 6 + ly_off],
        radius=2, fill=ARMOR, outline=OUTLINE,
    )
    # right arm
    d.rounded_rectangle(
        [ox + 9 + rx_off, oy - 4 + ry_off, ox + 14 + rx_off, oy + 6 + ry_off],
        radius=2, fill=ARMOR, outline=OUTLINE,
    )


def draw_head(d, ox, oy, face="down"):
    # Helmet
    d.ellipse([ox - 8, oy - 9, ox + 8, oy + 7], fill=ARMOR_DARK, outline=OUTLINE)
    # Face cutout
    if face == "down":
        d.ellipse([ox - 6, oy - 4, ox + 6, oy + 6], fill=SKIN, outline=OUTLINE)
        # eyes
        d.rectangle([ox - 4, oy, ox - 2, oy + 2], fill=OUTLINE)
        d.rectangle([ox + 2, oy, ox + 4, oy + 2], fill=OUTLINE)
        # mouth
        d.line([(ox - 2, oy + 4), (ox + 2, oy + 4)], fill=OUTLINE)
    elif face == "up":
        # back of head (hair)
        d.ellipse([ox - 6, oy - 4, ox + 6, oy + 6], fill=HAIR, outline=OUTLINE)
        d.ellipse([ox - 4, oy - 2, ox + 4, oy + 2], fill=HAIR_HI)
    elif face in ("left", "right"):
        # Keep front-facing face when strafing — no profile/hair occlusion.
        d.ellipse([ox - 6, oy - 4, ox + 6, oy + 6], fill=SKIN, outline=OUTLINE)
        d.rectangle([ox - 4, oy, ox - 2, oy + 2], fill=OUTLINE)
        d.rectangle([ox + 2, oy, ox + 4, oy + 2], fill=OUTLINE)
        d.line([(ox - 2, oy + 4), (ox + 2, oy + 4)], fill=OUTLINE)
    # Helmet top trim (gold)
    d.rectangle([ox - 8, oy - 9, ox + 8, oy - 7], fill=GOLD, outline=OUTLINE)
    # Helmet plume
    d.polygon([(ox - 1, oy - 13), (ox + 1, oy - 13), (ox + 2, oy - 8), (ox - 2, oy - 8)], fill=CAPE, outline=OUTLINE)


def draw_sword(d, hx, hy, angle_deg, length=18):
    # Draw a sword from grip (hx,hy) outward at angle (deg, 0=right, 90=down).
    a = math.radians(angle_deg)
    ex = hx + math.cos(a) * length
    ey = hy + math.sin(a) * length
    # Grip
    gx = hx - math.cos(a) * 3
    gy = hy - math.sin(a) * 3
    d.line([(gx, gy), (hx, hy)], fill=GRIP, width=3)
    # Crossguard (perpendicular)
    pa = a + math.pi / 2
    cx1 = hx + math.cos(pa) * 4
    cy1 = hy + math.sin(pa) * 4
    cx2 = hx - math.cos(pa) * 4
    cy2 = hy - math.sin(pa) * 4
    d.line([(cx1, cy1), (cx2, cy2)], fill=GOLD, width=2)
    # Blade
    d.line([(hx, hy), (ex, ey)], fill=STEEL, width=3)
    d.line([(hx, hy), (ex, ey)], fill=STEEL_DARK, width=1)


# ---------- Composite hero by direction ----------
def hero_idle(facing="down", breath=0) -> Image.Image:
    img = new_frame()
    d = ImageDraw.Draw(img)
    cx = W // 2
    cy = H // 2 + 6  # body baseline
    shadow(d, cx, H - 8)

    if facing == "up":
        draw_cape(d, cx, cy - 2)

    draw_legs(d, cx, cy + 6, swing=0)
    draw_torso(d, cx, cy, squash=breath)
    draw_arms(d, cx, cy)
    # Sword resting in right hand
    if facing in ("down", "left", "right"):
        draw_sword(d, cx + 13, cy + 4, 80, length=14)
    draw_head(d, cx, cy - 9 - breath, face=facing)
    return img


def hero_walk(facing, frame) -> Image.Image:
    img = new_frame()
    d = ImageDraw.Draw(img)
    cx = W // 2 + ({"left": -1, "right": 1}.get(facing, 0))
    cy = H // 2 + 6
    # body bob: frames 0,3 down; 1,4 mid; 2,5 up
    bob = [0, -1, -2, 0, -1, -2][frame % 6]
    swing = [3, 1, -2, -3, -1, 2][frame % 6]
    cape_sway = [-2, -1, 0, 2, 1, 0][frame % 6]

    shadow(d, cx, H - 8)

    if facing == "up":
        draw_cape(d, cx, cy - 2 + bob, sway=cape_sway)

    draw_legs(d, cx, cy + 6 + bob, swing=swing if facing in ("up", "down") else swing // 2)
    draw_torso(d, cx, cy + bob, squash=0)
    # arms swing opposite to legs
    arm = -swing
    draw_arms(d, cx, cy + bob, lx_off=0, ly_off=arm, rx_off=0, ry_off=-arm)
    if facing in ("down", "left", "right"):
        draw_sword(d, cx + 13, cy + 4 + bob - arm, 80, length=14)
    draw_head(d, cx, cy - 9 + bob, face=facing)
    return img


def hero_attack(frame, total=6) -> Image.Image:
    """Sword slash arc, facing down. Frames sweep right→left over the front."""
    img = new_frame()
    d = ImageDraw.Draw(img)
    cx = W // 2
    cy = H // 2 + 6

    shadow(d, cx, H - 8)
    # Slight forward lean on swing
    lean = [0, -1, -2, -1, 0, 0][frame] if frame < 6 else 0
    draw_legs(d, cx, cy + 6, swing=1)
    draw_torso(d, cx, cy + lean, squash=0)
    draw_arms(d, cx, cy + lean)
    draw_head(d, cx, cy - 9 + lean, face="down")

    # Sword sweep angle: -30° → 210° (right side, down-front, left side)
    t = frame / max(1, total - 1)
    angle = -30 + 240 * t
    # Hand position arcs in front
    ha = math.radians(angle)
    hx = cx + math.cos(ha) * 12
    hy = cy + 4 + math.sin(ha) * 10
    draw_sword(d, hx, hy, angle, length=20)

    # Swoosh trail
    if 1 <= frame <= 4:
        prev_a = -30 + 240 * ((frame - 1) / max(1, total - 1))
        for i in range(6):
            ia = math.radians(prev_a + (angle - prev_a) * (i / 5))
            r = 22
            sx = cx + math.cos(ia) * r
            sy = cy + 4 + math.sin(ia) * r * 0.85
            alpha = int(120 * (i / 5))
            d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 255, 255, alpha))
    return img


def hero_hurt(frame) -> Image.Image:
    base = hero_idle("down", breath=0)
    if frame == 0:
        # white flash: replace all non-transparent with white
        out = Image.new("RGBA", base.size, TRANSPARENT)
        px_in = base.load()
        px_out = out.load()
        for y in range(H):
            for x in range(W):
                _, _, _, a = px_in[x, y]
                if a > 0:
                    px_out[x, y] = (255, 255, 255, a)
        return out
    # red tint
    out = Image.new("RGBA", base.size, TRANSPARENT)
    px_in = base.load()
    px_out = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px_in[x, y]
            if a > 0:
                px_out[x, y] = (min(255, r // 2 + 200), g // 3, b // 3, a)
    return out


def hero_death(frame, total=8) -> Image.Image:
    img = new_frame()
    d = ImageDraw.Draw(img)
    cx = W // 2
    cy = H // 2 + 6

    # frame 0-2: stagger and tilt
    # frame 3-5: collapsed on ground
    # frame 6-7: fade with sparks
    if frame < 3:
        tilt = frame * 12  # rotation in deg
        breath = 0
        sub = hero_idle("down", breath=0)
        sub = sub.rotate(tilt, resample=Image.BILINEAR, center=(cx, cy + 6))
        img.alpha_composite(sub)
    else:
        # lying down - draw flat oval body
        shadow(d, cx, H - 8, rx=18, ry=6)
        # body horizontal
        d.ellipse([cx - 18, cy + 2, cx + 18, cy + 12], fill=ARMOR, outline=OUTLINE)
        d.rectangle([cx - 14, cy + 4, cx + 14, cy + 10], fill=ARMOR)
        d.ellipse([cx - 26, cy, cx - 12, cy + 12], fill=ARMOR_DARK, outline=OUTLINE)  # head fallen
        d.ellipse([cx - 24, cy + 2, cx - 14, cy + 10], fill=SKIN)
        # sword dropped
        draw_sword(d, cx + 18, cy + 8, 10, length=18)

        if frame >= 6:
            # fade out
            alpha = int(255 * (1 - (frame - 5) / 3))
            faded = Image.new("RGBA", img.size, TRANSPARENT)
            px_in = img.load()
            px_out = faded.load()
            for y in range(H):
                for x in range(W):
                    r, g, b, a = px_in[x, y]
                    if a > 0:
                        px_out[x, y] = (r, g, b, max(0, min(a, alpha)))
            img = faded
            d = ImageDraw.Draw(img)
            # ascending sparks
            for i, (sx, sy) in enumerate([(cx - 6, cy - 4), (cx + 4, cy - 8), (cx, cy - 12), (cx + 8, cy - 6)]):
                off = (frame - 5) * 3
                d.ellipse([sx - 1, sy - off - 1, sx + 1, sy - off + 1], fill=(255, 215, 64, alpha))
    return img


# ---------- Sheet assembly ----------
def make_sheet(frames: list[Image.Image], path: Path) -> None:
    sheet = Image.new("RGBA", (W * len(frames), H), TRANSPARENT)
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * W, 0))
    sheet.save(path)
    print(f"  wrote {path.name}  ({sheet.width}x{sheet.height}, {len(frames)} frames)")


def main() -> None:
    print(f"Generating sprites → {OUT_DIR}")

    # P-01 Idle (4 frames, breathing)
    idle = [hero_idle("down", breath=b) for b in (0, 1, 2, 1)]
    make_sheet(idle, OUT_DIR / "idle.png")

    # P-02 Walk × 4 directions × 6 frames
    for facing in ("down", "up", "left", "right"):
        frames = [hero_walk(facing, i) for i in range(6)]
        make_sheet(frames, OUT_DIR / f"walk_{facing}.png")

    # P-03 Attack (6 frames)
    atk = [hero_attack(i, total=6) for i in range(6)]
    make_sheet(atk, OUT_DIR / "attack.png")

    # P-04 Hurt (2 frames)
    make_sheet([hero_hurt(0), hero_hurt(1)], OUT_DIR / "hurt.png")

    # P-05 Death (8 frames)
    death = [hero_death(i, total=8) for i in range(8)]
    make_sheet(death, OUT_DIR / "death.png")

    print("Done.")


if __name__ == "__main__":
    main()
