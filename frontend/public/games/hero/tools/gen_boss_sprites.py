"""Generate Boss sprite sheets for the four BOSS_TYPES.

Each boss has at minimum: idle, attack/skill, death.
Output: assets/sprites/bosses/<id>_<action>.png
IDs map to BOSS_TYPES indices: skull_king, fire_demon, ice_giant, shadow_dragon.
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites" / "bosses"
OUT.mkdir(parents=True, exist_ok=True)

T = (0, 0, 0, 0)
OUTLINE = (10, 10, 16, 255)
SHADOW = (0, 0, 0, 110)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)


def new_img(size: int) -> Image.Image:
    return Image.new("RGBA", (size, size), T)


def shadow(d, size, ry=8):
    cx = size // 2
    cy = size - 8
    rx = size // 3
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=SHADOW)


def make_sheet(frames, path):
    if not frames:
        return
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h), T)
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * w, 0))
    sheet.save(path)
    print(f"  wrote {path.name}  ({sheet.width}x{sheet.height}, {len(frames)} frames)")


def fade_alpha(img: Image.Image, scale: float) -> Image.Image:
    out = Image.new("RGBA", img.size, T)
    pin = img.load()
    pout = out.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pin[x, y]
            if a > 0:
                pout[x, y] = (r, g, b, max(0, min(255, int(a * scale))))
    return out


def tint(img: Image.Image, color, strength=0.5):
    out = Image.new("RGBA", img.size, T)
    pin = img.load()
    pout = out.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pin[x, y]
            if a > 0:
                nr = int(r * (1 - strength) + color[0] * strength)
                ng = int(g * (1 - strength) + color[1] * strength)
                nb = int(b * (1 - strength) + color[2] * strength)
                pout[x, y] = (nr, ng, nb, a)
    return out


# ============== B-01 Skull King (128) ==============
SK_BONE = (235, 232, 215, 255)
SK_BONE_DK = (160, 155, 138, 255)
SK_ROBE = (45, 30, 60, 255)
SK_ROBE_HI = (85, 55, 110, 255)
SK_GOLD = (240, 200, 60, 255)
SK_EYE = (80, 220, 255, 255)


def skull_king_draw(d, size, breath=0, eye_glow=0, raise_arms=False, weapon_angle=80):
    cx = size // 2
    base_y = size - 14
    shadow(d, size, ry=10)
    # robe (wide bottom)
    d.polygon([
        (cx - 30, base_y - 50 + breath),
        (cx + 30, base_y - 50 + breath),
        (cx + 38, base_y),
        (cx - 38, base_y),
    ], fill=SK_ROBE, outline=OUTLINE)
    # robe highlight stripes
    for i in (-22, 0, 22):
        d.line([(cx + i, base_y - 48 + breath), (cx + i + 2, base_y - 4)], fill=SK_ROBE_HI)
    # gold trim
    d.line([(cx - 38, base_y - 2), (cx + 38, base_y - 2)], fill=SK_GOLD, width=2)
    # arms
    if raise_arms:
        d.rounded_rectangle([cx - 38, base_y - 60, cx - 28, base_y - 30], radius=4, fill=SK_BONE, outline=OUTLINE)
        d.rounded_rectangle([cx + 28, base_y - 60, cx + 38, base_y - 30], radius=4, fill=SK_BONE, outline=OUTLINE)
    else:
        d.rounded_rectangle([cx - 32, base_y - 50 + breath, cx - 22, base_y - 18], radius=4, fill=SK_BONE, outline=OUTLINE)
        d.rounded_rectangle([cx + 22, base_y - 50 + breath, cx + 32, base_y - 18], radius=4, fill=SK_BONE, outline=OUTLINE)
    # weapon (giant scythe)
    a = math.radians(weapon_angle)
    hx = cx + 28
    hy = base_y - 30
    ex = hx + math.cos(a) * 45
    ey = hy + math.sin(a) * 45
    d.line([(hx, hy), (ex, ey)], fill=(120, 80, 40, 255), width=4)
    # blade
    pa = a - math.pi / 2
    bx = ex + math.cos(pa) * 24
    by = ey + math.sin(pa) * 24
    bx2 = ex + math.cos(a) * 6
    by2 = ey + math.sin(a) * 6
    d.polygon([(ex, ey), (bx, by), (bx2, by2)], fill=(200, 200, 220, 255), outline=OUTLINE)
    # skull (large)
    sy = base_y - 80 + breath
    # crown
    d.polygon([
        (cx - 22, sy + 5), (cx - 18, sy - 8), (cx - 12, sy + 2),
        (cx - 6, sy - 12), (cx, sy + 2), (cx + 6, sy - 12),
        (cx + 12, sy + 2), (cx + 18, sy - 8), (cx + 22, sy + 5),
    ], fill=SK_GOLD, outline=OUTLINE)
    # crown gems
    d.ellipse([cx - 7, sy - 9, cx - 4, sy - 6], fill=(220, 60, 60, 255))
    d.ellipse([cx + 4, sy - 9, cx + 7, sy - 6], fill=(60, 220, 60, 255))
    # skull dome
    d.ellipse([cx - 22, sy + 2, cx + 22, sy + 32], fill=SK_BONE, outline=OUTLINE)
    # cracks
    d.line([(cx - 16, sy + 6), (cx - 10, sy + 14)], fill=SK_BONE_DK)
    d.line([(cx + 6, sy + 4), (cx + 14, sy + 12)], fill=SK_BONE_DK)
    # jaw
    d.rounded_rectangle([cx - 16, sy + 26, cx + 16, sy + 42], radius=3, fill=SK_BONE, outline=OUTLINE)
    # eye sockets (with glow)
    e_intensity = 200 + min(55, eye_glow * 40)
    eye_color = (int(SK_EYE[0] * e_intensity / 255), int(SK_EYE[1] * e_intensity / 255), int(SK_EYE[2] * e_intensity / 255), 255)
    d.ellipse([cx - 14, sy + 12, cx - 5, sy + 22], fill=BLACK)
    d.ellipse([cx + 5, sy + 12, cx + 14, sy + 22], fill=BLACK)
    d.ellipse([cx - 12, sy + 14, cx - 7, sy + 19], fill=eye_color)
    d.ellipse([cx + 7, sy + 14, cx + 12, sy + 19], fill=eye_color)
    # nose hole
    d.polygon([(cx - 3, sy + 22), (cx + 3, sy + 22), (cx, sy + 27)], fill=BLACK)
    # teeth
    for tx in (-12, -8, -4, 0, 4, 8, 12):
        d.rectangle([cx + tx - 1, sy + 30, cx + tx + 1, sy + 38], fill=BLACK)


def skull_king_idle(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    breath = [0, -1, -2, -1, 0, 1][frame % 6]
    skull_king_draw(d, 128, breath=breath, eye_glow=frame % 6)
    return img


def skull_king_attack(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    angles = [-30, 30, 80, 110, 130, 80]
    skull_king_draw(d, 128, breath=-2, eye_glow=4, weapon_angle=angles[frame % 6])
    if 1 <= frame <= 4:
        # slash arc
        cx = 64
        cy = 128 - 14 - 30
        for i in range(8):
            t = i / 8
            ang = math.radians(angles[(frame - 1) % 6] + (angles[frame % 6] - angles[(frame - 1) % 6]) * t)
            r = 50
            sx = cx + 28 + math.cos(ang) * r
            sy = cy + math.sin(ang) * r
            alpha = int(180 * t)
            d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 200, 250, alpha))
    return img


def skull_king_charge(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    skull_king_draw(d, 128, breath=-3 + frame, eye_glow=8)
    # red speed lines / aura
    for i in range(6):
        a = math.radians(i * 60 + frame * 30)
        r = 50 + frame * 4
        sx = 64 + math.cos(a) * r
        sy = 64 + math.sin(a) * r
        d.line([(sx, sy), (sx + math.cos(a) * 8, sy + math.sin(a) * 8)],
               fill=(255, 30, 30, 200), width=2)
    return img


def skull_king_summon(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    skull_king_draw(d, 128, breath=-1, eye_glow=8, raise_arms=True)
    # rising bones
    cx = 64
    base_y = 128 - 14
    for i, off in enumerate([(-30, 0), (30, 0), (-50, -10), (50, -10)]):
        h_off = frame * 6
        bx = cx + off[0]
        by = base_y + off[1] - h_off
        d.rectangle([bx - 2, by - 8, bx + 2, by + 8], fill=SK_BONE, outline=OUTLINE)
        d.ellipse([bx - 4, by - 12, bx + 4, by - 4], fill=SK_BONE, outline=OUTLINE)
    return img


def boss_death(idle_supplier, total=8):
    base = idle_supplier(0)
    w, h = base.size
    frames = []
    for i in range(total):
        if i < 2:
            f = idle_supplier(0)
            f = tint(f, (255, 255, 255), strength=0.5 if i == 0 else 0.2)
            frames.append(f)
        elif i < 5:
            tilt = (i - 2) * 25
            f = idle_supplier(0).rotate(-tilt, resample=Image.BILINEAR, center=(w // 2, h - 14))
            frames.append(f)
        else:
            sub = idle_supplier(0).rotate(-90, resample=Image.BILINEAR, center=(w // 2, h - 14))
            scale = 1 - (i - 4) / 4
            sub = fade_alpha(sub, scale)
            frames.append(sub)
    return frames


# ============== B-02 Fire Demon (128) ==============
FD_BODY = (140, 30, 20, 255)
FD_BODY_HI = (220, 60, 30, 255)
FD_BODY_DK = (70, 15, 10, 255)
FD_HORN = (50, 25, 15, 255)
FD_FIRE = (255, 160, 40, 255)
FD_FIRE_HI = (255, 230, 80, 255)
FD_EYE = (255, 240, 80, 255)


def fire_demon_draw(d, size, breath=0, fire_phase=0, mouth_open=False, arms_up=False):
    cx = size // 2
    base_y = size - 14
    shadow(d, size, ry=10)
    # fire aura at feet
    for i in range(8):
        a = math.radians(i * 45 + fire_phase * 20)
        r = 28 + (fire_phase % 3) * 2
        fx = cx + math.cos(a) * r
        fy = base_y + math.sin(a) * 4
        d.ellipse([fx - 4, fy - 10, fx + 4, fy + 2], fill=(FD_FIRE[0], FD_FIRE[1], FD_FIRE[2], 160))
        d.ellipse([fx - 2, fy - 8, fx + 2, fy], fill=FD_FIRE_HI)
    # legs
    d.rounded_rectangle([cx - 16, base_y - 24, cx - 4, base_y - 4], radius=3, fill=FD_BODY_DK, outline=OUTLINE)
    d.rounded_rectangle([cx + 4, base_y - 24, cx + 16, base_y - 4], radius=3, fill=FD_BODY_DK, outline=OUTLINE)
    # body (muscular)
    d.rounded_rectangle([cx - 28, base_y - 60 + breath, cx + 28, base_y - 22], radius=8, fill=FD_BODY, outline=OUTLINE)
    # chest highlights
    d.line([(cx, base_y - 58 + breath), (cx, base_y - 24)], fill=FD_BODY_DK, width=2)
    d.ellipse([cx - 18, base_y - 50 + breath, cx - 8, base_y - 38], fill=FD_BODY_HI)
    d.ellipse([cx + 8, base_y - 50 + breath, cx + 18, base_y - 38], fill=FD_BODY_HI)
    # arms
    if arms_up:
        d.rounded_rectangle([cx - 38, base_y - 76, cx - 28, base_y - 40], radius=4, fill=FD_BODY, outline=OUTLINE)
        d.rounded_rectangle([cx + 28, base_y - 76, cx + 38, base_y - 40], radius=4, fill=FD_BODY, outline=OUTLINE)
        # claws
        for k in range(3):
            d.polygon([(cx - 38 + k * 4, base_y - 78), (cx - 36 + k * 4, base_y - 84), (cx - 34 + k * 4, base_y - 78)],
                      fill=FD_HORN, outline=OUTLINE)
            d.polygon([(cx + 30 + k * 4, base_y - 78), (cx + 32 + k * 4, base_y - 84), (cx + 34 + k * 4, base_y - 78)],
                      fill=FD_HORN, outline=OUTLINE)
    else:
        d.rounded_rectangle([cx - 36, base_y - 56 + breath, cx - 26, base_y - 26], radius=4, fill=FD_BODY, outline=OUTLINE)
        d.rounded_rectangle([cx + 26, base_y - 56 + breath, cx + 36, base_y - 26], radius=4, fill=FD_BODY, outline=OUTLINE)
    # head
    sy = base_y - 90 + breath
    d.ellipse([cx - 22, sy, cx + 22, sy + 30], fill=FD_BODY, outline=OUTLINE)
    d.ellipse([cx - 18, sy + 3, cx - 5, sy + 14], fill=FD_BODY_HI)
    # horns (curved)
    d.polygon([(cx - 20, sy + 5), (cx - 30, sy - 12), (cx - 14, sy + 4)], fill=FD_HORN, outline=OUTLINE)
    d.polygon([(cx + 20, sy + 5), (cx + 30, sy - 12), (cx + 14, sy + 4)], fill=FD_HORN, outline=OUTLINE)
    # eyes
    d.rectangle([cx - 11, sy + 12, cx - 5, sy + 17], fill=FD_EYE)
    d.rectangle([cx + 5, sy + 12, cx + 11, sy + 17], fill=FD_EYE)
    d.rectangle([cx - 9, sy + 14, cx - 7, sy + 16], fill=BLACK)
    d.rectangle([cx + 7, sy + 14, cx + 9, sy + 16], fill=BLACK)
    # mouth
    if mouth_open:
        d.ellipse([cx - 10, sy + 20, cx + 10, sy + 30], fill=(180, 30, 30, 255), outline=OUTLINE)
        # fangs
        d.polygon([(cx - 6, sy + 21), (cx - 4, sy + 27), (cx - 2, sy + 21)], fill=WHITE)
        d.polygon([(cx + 2, sy + 21), (cx + 4, sy + 27), (cx + 6, sy + 21)], fill=WHITE)
        # fire breath
        d.ellipse([cx - 6, sy + 28, cx + 6, sy + 38], fill=FD_FIRE_HI)
    else:
        d.line([(cx - 6, sy + 24), (cx - 3, sy + 26), (cx, sy + 23), (cx + 3, sy + 26), (cx + 6, sy + 24)], fill=BLACK)


def fire_demon_idle(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    breath = [0, -1, -2, -1, 0, 1][frame % 6]
    fire_demon_draw(d, 128, breath=breath, fire_phase=frame)
    return img


def fire_demon_fireball(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    fire_demon_draw(d, 128, breath=-2, fire_phase=frame, mouth_open=(frame >= 2), arms_up=True)
    if frame >= 2:
        # central fireball forming
        cx, cy = 64, 50
        for r, c in [(20, (FD_FIRE[0], FD_FIRE[1], FD_FIRE[2], 100)),
                     (14, (FD_FIRE[0], FD_FIRE[1], FD_FIRE[2], 200)),
                     (8, FD_FIRE_HI),
                     (4, WHITE)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    return img


def fire_demon_aoe(frame):
    img = new_img(128)
    d = ImageDraw.Draw(img)
    fire_demon_draw(d, 128, breath=-1, fire_phase=frame, arms_up=True)
    # expanding ring of fire
    r = 30 + frame * 18
    cx, cy = 64, 110
    for i in range(16):
        a = math.radians(i * 22.5)
        fx = cx + math.cos(a) * r
        fy = cy + math.sin(a) * r * 0.4
        d.ellipse([fx - 5, fy - 10, fx + 5, fy + 2], fill=(FD_FIRE[0], FD_FIRE[1], FD_FIRE[2], 200))
        d.ellipse([fx - 3, fy - 8, fx + 3, fy], fill=FD_FIRE_HI)
    return img


# ============== B-03 Ice Giant (160) ==============
IG_ICE = (170, 220, 240, 255)
IG_ICE_DK = (90, 150, 180, 255)
IG_ICE_HI = (220, 245, 255, 255)
IG_ARMOR = (80, 120, 160, 255)
IG_EYE = (100, 230, 255, 255)


def ice_giant_draw(d, size, breath=0, raise_arms=False, stomp_phase=0):
    cx = size // 2
    base_y = size - 14
    shadow(d, size, ry=14)
    # legs (huge)
    d.rounded_rectangle([cx - 28, base_y - 36, cx - 8, base_y - 4], radius=6, fill=IG_ICE_DK, outline=OUTLINE)
    d.rounded_rectangle([cx + 8, base_y - 36, cx + 28, base_y - 4], radius=6, fill=IG_ICE_DK, outline=OUTLINE)
    # ice spike on knees
    d.polygon([(cx - 22, base_y - 28), (cx - 18, base_y - 38), (cx - 14, base_y - 28)], fill=IG_ICE_HI, outline=OUTLINE)
    d.polygon([(cx + 14, base_y - 28), (cx + 18, base_y - 38), (cx + 22, base_y - 28)], fill=IG_ICE_HI, outline=OUTLINE)
    # body (massive)
    d.rounded_rectangle([cx - 44, base_y - 90 + breath, cx + 44, base_y - 36], radius=10, fill=IG_ICE, outline=OUTLINE)
    # body shading
    d.line([(cx, base_y - 88 + breath), (cx, base_y - 38)], fill=IG_ICE_DK)
    d.ellipse([cx - 30, base_y - 80 + breath, cx - 14, base_y - 60], fill=IG_ICE_HI)
    d.ellipse([cx + 14, base_y - 80 + breath, cx + 30, base_y - 60], fill=IG_ICE_HI)
    # armor belt
    d.rectangle([cx - 44, base_y - 42, cx + 44, base_y - 36], fill=IG_ARMOR, outline=OUTLINE)
    # arms (massive)
    if raise_arms:
        d.rounded_rectangle([cx - 60, base_y - 110, cx - 44, base_y - 70], radius=6, fill=IG_ICE, outline=OUTLINE)
        d.rounded_rectangle([cx + 44, base_y - 110, cx + 60, base_y - 70], radius=6, fill=IG_ICE, outline=OUTLINE)
        # ice fists
        d.ellipse([cx - 64, base_y - 122, cx - 40, base_y - 100], fill=IG_ICE_HI, outline=OUTLINE)
        d.ellipse([cx + 40, base_y - 122, cx + 64, base_y - 100], fill=IG_ICE_HI, outline=OUTLINE)
    else:
        d.rounded_rectangle([cx - 60, base_y - 84 + breath, cx - 44, base_y - 40], radius=6, fill=IG_ICE, outline=OUTLINE)
        d.rounded_rectangle([cx + 44, base_y - 84 + breath, cx + 60, base_y - 40], radius=6, fill=IG_ICE, outline=OUTLINE)
        # fists
        d.ellipse([cx - 64, base_y - 50, cx - 40, base_y - 28], fill=IG_ICE_HI, outline=OUTLINE)
        d.ellipse([cx + 40, base_y - 50, cx + 64, base_y - 28], fill=IG_ICE_HI, outline=OUTLINE)
    # shoulder spikes
    for off in (-50, -38, 38, 50):
        d.polygon([(cx + off - 3, base_y - 88 + breath),
                   (cx + off, base_y - 105 + breath),
                   (cx + off + 3, base_y - 88 + breath)],
                  fill=IG_ICE_HI, outline=OUTLINE)
    # head
    sy = base_y - 122 + breath
    d.rounded_rectangle([cx - 24, sy, cx + 24, sy + 30], radius=6, fill=IG_ICE, outline=OUTLINE)
    # ice crown (frozen spikes)
    for i, off in enumerate((-18, -8, 0, 8, 18)):
        h = 8 + (i % 2) * 4
        d.polygon([(cx + off - 3, sy + 2), (cx + off, sy - h), (cx + off + 3, sy + 2)],
                  fill=IG_ICE_HI, outline=OUTLINE)
    # eyes (cyan glow)
    d.rectangle([cx - 12, sy + 12, cx - 6, sy + 18], fill=IG_EYE)
    d.rectangle([cx + 6, sy + 12, cx + 12, sy + 18], fill=IG_EYE)
    d.rectangle([cx - 10, sy + 14, cx - 8, sy + 16], fill=BLACK)
    d.rectangle([cx + 8, sy + 14, cx + 10, sy + 16], fill=BLACK)
    # ice beard
    d.polygon([(cx - 14, sy + 22), (cx - 8, sy + 30), (cx - 10, sy + 24)], fill=IG_ICE_HI, outline=OUTLINE)
    d.polygon([(cx + 14, sy + 22), (cx + 8, sy + 30), (cx + 10, sy + 24)], fill=IG_ICE_HI, outline=OUTLINE)
    d.polygon([(cx - 4, sy + 22), (cx + 4, sy + 22), (cx, sy + 32)], fill=IG_ICE_HI, outline=OUTLINE)
    # stomp shockwave
    if stomp_phase > 0:
        for i in range(stomp_phase):
            r = 30 + i * 18
            d.ellipse([cx - r, base_y - 4 - 6, cx + r, base_y + 6 - 6],
                      outline=(IG_EYE[0], IG_EYE[1], IG_EYE[2], max(0, 200 - i * 60)), width=2)


def ice_giant_idle(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    breath = [0, -1, -2, -1, 0, 1][frame % 6]
    ice_giant_draw(d, 160, breath=breath)
    return img


def ice_giant_ice_wall(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    ice_giant_draw(d, 160, breath=-1, raise_arms=True)
    # spawning ice walls
    for i in range(4):
        x = 30 + i * 35
        h = min(50, frame * 14)
        y = 160 - 14 - h
        d.polygon([(x, 160 - 14), (x + 24, 160 - 14), (x + 18, y), (x + 6, y - 6)],
                  fill=IG_ICE, outline=OUTLINE)
        d.polygon([(x + 4, y + 4), (x + 12, y - 4), (x + 18, y + 6)], fill=IG_ICE_HI)
    return img


def ice_giant_stomp(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    bob = -3 if frame < 2 else 4 if frame == 2 else 0
    ice_giant_draw(d, 160, breath=bob, raise_arms=(frame < 2), stomp_phase=max(0, frame - 2))
    return img


# ============== B-04 Shadow Dragon (160) ==============
SD_BODY = (35, 15, 60, 255)
SD_BODY_HI = (90, 40, 150, 255)
SD_BODY_DK = (15, 5, 30, 255)
SD_WING = (60, 20, 100, 255)
SD_WING_HI = (130, 80, 200, 255)
SD_EYE = (255, 60, 60, 255)
SD_GLOW = (180, 80, 220, 255)


def shadow_dragon_draw(d, size, breath=0, wing_phase=0, mouth_open=False, fly_offset=0):
    cx = size // 2
    base_y = size - 14 - fly_offset
    shadow(d, size, ry=12)
    # wings (back layer)
    wing_spread = math.sin(wing_phase * 0.6) * 10
    # left wing
    d.polygon([
        (cx - 20, base_y - 70 + breath),
        (cx - 70 - wing_spread, base_y - 80 + breath),
        (cx - 75 - wing_spread, base_y - 50),
        (cx - 50 - wing_spread, base_y - 40),
        (cx - 30, base_y - 50 + breath),
    ], fill=SD_WING, outline=OUTLINE)
    # wing membrane lines
    for i in range(3):
        d.line([(cx - 25, base_y - 60 + breath),
                (cx - 60 - wing_spread + i * 4, base_y - 70 + i * 8 + breath)],
               fill=SD_WING_HI, width=1)
    # right wing
    d.polygon([
        (cx + 20, base_y - 70 + breath),
        (cx + 70 + wing_spread, base_y - 80 + breath),
        (cx + 75 + wing_spread, base_y - 50),
        (cx + 50 + wing_spread, base_y - 40),
        (cx + 30, base_y - 50 + breath),
    ], fill=SD_WING, outline=OUTLINE)
    for i in range(3):
        d.line([(cx + 25, base_y - 60 + breath),
                (cx + 60 + wing_spread - i * 4, base_y - 70 + i * 8 + breath)],
               fill=SD_WING_HI, width=1)
    # tail
    for i, t in enumerate([0.0, 0.25, 0.5, 0.75, 1.0]):
        tx = cx + 30 + t * 50
        ty = base_y - 26 + math.sin(t * 4 + wing_phase * 0.3) * 8
        r = int(10 - t * 7)
        d.ellipse([tx - r, ty - r, tx + r, ty + r], fill=SD_BODY, outline=OUTLINE)
    # tail tip spikes
    d.polygon([(cx + 78, base_y - 26), (cx + 86, base_y - 32), (cx + 80, base_y - 22)],
              fill=SD_BODY_HI, outline=OUTLINE)
    # legs
    d.ellipse([cx - 22, base_y - 24, cx - 8, base_y - 4], fill=SD_BODY_DK, outline=OUTLINE)
    d.ellipse([cx + 8, base_y - 24, cx + 22, base_y - 4], fill=SD_BODY_DK, outline=OUTLINE)
    # claws
    for k in range(3):
        d.polygon([(cx - 22 + k * 5, base_y - 4), (cx - 20 + k * 5, base_y), (cx - 18 + k * 5, base_y - 4)],
                  fill=(220, 220, 230, 255), outline=OUTLINE)
        d.polygon([(cx + 8 + k * 5, base_y - 4), (cx + 10 + k * 5, base_y), (cx + 12 + k * 5, base_y - 4)],
                  fill=(220, 220, 230, 255), outline=OUTLINE)
    # body / chest
    d.ellipse([cx - 32, base_y - 64 + breath, cx + 32, base_y - 18], fill=SD_BODY, outline=OUTLINE)
    # belly scales
    d.ellipse([cx - 18, base_y - 50 + breath, cx + 18, base_y - 22], fill=SD_BODY_HI)
    for i, ly in enumerate((-44, -36, -28)):
        d.line([(cx - 14, base_y + ly + breath), (cx + 14, base_y + ly + breath)], fill=SD_BODY_DK)
    # neck
    d.polygon([
        (cx - 14, base_y - 60 + breath),
        (cx + 14, base_y - 60 + breath),
        (cx + 10, base_y - 96 + breath),
        (cx - 10, base_y - 96 + breath),
    ], fill=SD_BODY, outline=OUTLINE)
    # head
    sy = base_y - 116 + breath
    d.ellipse([cx - 18, sy, cx + 18, sy + 26], fill=SD_BODY, outline=OUTLINE)
    # snout
    d.polygon([(cx - 8, sy + 14), (cx - 22, sy + 14), (cx - 16, sy + 24)], fill=SD_BODY, outline=OUTLINE)
    # horns (large curved)
    d.polygon([(cx - 14, sy + 2), (cx - 22, sy - 14), (cx - 8, sy - 2)], fill=SD_BODY_DK, outline=OUTLINE)
    d.polygon([(cx + 14, sy + 2), (cx + 22, sy - 14), (cx + 8, sy - 2)], fill=SD_BODY_DK, outline=OUTLINE)
    d.polygon([(cx - 6, sy - 2), (cx - 4, sy - 14), (cx, sy - 4)], fill=SD_BODY_DK, outline=OUTLINE)
    d.polygon([(cx + 6, sy - 2), (cx + 4, sy - 14), (cx, sy - 4)], fill=SD_BODY_DK, outline=OUTLINE)
    # eyes
    d.rectangle([cx - 10, sy + 8, cx - 4, sy + 13], fill=SD_EYE)
    d.rectangle([cx + 4, sy + 8, cx + 10, sy + 13], fill=SD_EYE)
    d.rectangle([cx - 8, sy + 10, cx - 6, sy + 12], fill=BLACK)
    d.rectangle([cx + 6, sy + 10, cx + 8, sy + 12], fill=BLACK)
    # mouth
    if mouth_open:
        d.polygon([(cx - 22, sy + 16), (cx - 6, sy + 18), (cx - 16, sy + 26)], fill=(180, 30, 30, 255), outline=OUTLINE)
        # teeth
        d.polygon([(cx - 18, sy + 18), (cx - 16, sy + 22), (cx - 14, sy + 18)], fill=WHITE)
        d.polygon([(cx - 12, sy + 18), (cx - 10, sy + 22), (cx - 8, sy + 18)], fill=WHITE)
        # purple breath glow
        d.ellipse([cx - 30, sy + 14, cx - 14, sy + 26], fill=(SD_GLOW[0], SD_GLOW[1], SD_GLOW[2], 180))
    else:
        d.line([(cx - 20, sy + 18), (cx - 6, sy + 18)], fill=BLACK)


def shadow_dragon_idle(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    breath = [0, -1, -2, -1, 0, 1][frame % 6]
    shadow_dragon_draw(d, 160, breath=breath, wing_phase=frame)
    return img


def shadow_dragon_breath(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    shadow_dragon_draw(d, 160, breath=-1, wing_phase=frame, mouth_open=(frame >= 2))
    if frame >= 2:
        # cone of purple breath
        for i in range(20):
            t = i / 20
            x = 80 - 22 - t * 70
            y = 160 - 14 - 116 + 22 + math.sin(t * 6 + frame) * 8
            r = int(2 + t * 8)
            alpha = int(220 - t * 150)
            d.ellipse([x - r, y - r, x + r, y + r],
                      fill=(SD_GLOW[0], SD_GLOW[1], SD_GLOW[2], alpha))
    return img


def shadow_dragon_fly(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    fly_off = [0, 6, 12, 6][frame % 4]
    shadow_dragon_draw(d, 160, breath=-2, wing_phase=frame * 2, fly_offset=fly_off)
    return img


def shadow_dragon_summon(frame):
    img = new_img(160)
    d = ImageDraw.Draw(img)
    shadow_dragon_draw(d, 160, breath=-1, wing_phase=frame, mouth_open=False)
    # ritual circle
    cx = 80
    cy = 160 - 14 - 4
    r = 30 + frame * 4
    for i in range(12):
        a = math.radians(i * 30 + frame * 15)
        sx = cx + math.cos(a) * r
        sy = cy + math.sin(a) * r * 0.4
        d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(SD_GLOW[0], SD_GLOW[1], SD_GLOW[2], 220))
    return img


def main():
    print(f"Generating bosses → {OUT}")

    # B-01 Skull King (128, prefix: skull_king)
    make_sheet([skull_king_idle(i) for i in range(6)], OUT / "skull_king_idle.png")
    make_sheet([skull_king_attack(i) for i in range(6)], OUT / "skull_king_attack.png")
    make_sheet([skull_king_charge(i) for i in range(4)], OUT / "skull_king_charge.png")
    make_sheet([skull_king_summon(i) for i in range(4)], OUT / "skull_king_summon.png")
    make_sheet(boss_death(skull_king_idle, total=8), OUT / "skull_king_death.png")

    # B-02 Fire Demon (128, prefix: fire_demon)
    make_sheet([fire_demon_idle(i) for i in range(6)], OUT / "fire_demon_idle.png")
    make_sheet([fire_demon_fireball(i) for i in range(4)], OUT / "fire_demon_fireball.png")
    make_sheet([fire_demon_aoe(i) for i in range(4)], OUT / "fire_demon_aoe.png")
    make_sheet(boss_death(fire_demon_idle, total=8), OUT / "fire_demon_death.png")

    # B-03 Ice Giant (160, prefix: ice_giant)
    make_sheet([ice_giant_idle(i) for i in range(6)], OUT / "ice_giant_idle.png")
    make_sheet([ice_giant_ice_wall(i) for i in range(4)], OUT / "ice_giant_ice_wall.png")
    make_sheet([ice_giant_stomp(i) for i in range(6)], OUT / "ice_giant_stomp.png")
    make_sheet(boss_death(ice_giant_idle, total=8), OUT / "ice_giant_death.png")

    # B-04 Shadow Dragon (160, prefix: shadow_dragon)
    make_sheet([shadow_dragon_idle(i) for i in range(6)], OUT / "shadow_dragon_idle.png")
    make_sheet([shadow_dragon_breath(i) for i in range(6)], OUT / "shadow_dragon_breath.png")
    make_sheet([shadow_dragon_fly(i) for i in range(4)], OUT / "shadow_dragon_fly.png")
    make_sheet([shadow_dragon_summon(i) for i in range(4)], OUT / "shadow_dragon_summon.png")
    make_sheet(boss_death(shadow_dragon_idle, total=10), OUT / "shadow_dragon_death.png")

    print("Done.")


if __name__ == "__main__":
    main()
