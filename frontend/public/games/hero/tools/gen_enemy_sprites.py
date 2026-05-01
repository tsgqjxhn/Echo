"""Generate enemy sprite sheets.

Front-facing chibi pixel-art (matches player). Horizontal frame strips, RGBA.
Output: assets/sprites/enemies/<id>_<action>.png
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites" / "enemies"
OUT.mkdir(parents=True, exist_ok=True)

T = (0, 0, 0, 0)
OUTLINE = (13, 14, 22, 255)
SHADOW = (0, 0, 0, 90)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
BLOOD = (180, 30, 30, 255)


def new_img(size: int) -> Image.Image:
    return Image.new("RGBA", (size, size), T)


def shadow(d, size, ry=4):
    cx = size // 2
    cy = size - 5
    rx = size // 4
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=SHADOW)


def make_sheet(frames: list[Image.Image], path: Path) -> None:
    if not frames:
        return
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h), T)
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * w, 0))
    sheet.save(path)
    print(f"  wrote {path.name}  ({sheet.width}x{sheet.height}, {len(frames)} frames)")


def fade_to_dust(img: Image.Image, alpha: int) -> Image.Image:
    out = Image.new("RGBA", img.size, T)
    pin = img.load()
    pout = out.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pin[x, y]
            if a > 0:
                pout[x, y] = (r, g, b, max(0, min(a, alpha)))
    return out


def lay_flat(base: Image.Image) -> Image.Image:
    """Squash a standing sprite vertically to imply a corpse on the ground."""
    w, h = base.size
    sq_h = max(8, h // 2)
    s = base.resize((w, sq_h), resample=Image.BILINEAR)
    out = Image.new("RGBA", base.size, T)
    out.alpha_composite(s, (0, h - sq_h - 2))
    return out


def death_frames(standing_supplier, total: int = 4) -> list[Image.Image]:
    """Generic death: tilt, fall, lying, fade."""
    base = standing_supplier(0)
    w, h = base.size
    frames = []
    # Frame 0: tilted hit reaction (white flash hint)
    f0 = standing_supplier(0).rotate(-15, resample=Image.BILINEAR, center=(w // 2, h - 8))
    # tint slightly toward white to suggest impact
    pin = f0.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pin[x, y]
            if a > 0:
                pin[x, y] = (min(255, r + 40), min(255, g + 40), min(255, b + 40), a)
    frames.append(f0)
    # Frame 1: tilted further
    frames.append(standing_supplier(0).rotate(-55, resample=Image.BILINEAR, center=(w // 2, h - 8)))
    # Frame 2: lying down
    frames.append(lay_flat(standing_supplier(0)))
    # Frame 3: fading
    frames.append(fade_to_dust(lay_flat(standing_supplier(0)), alpha=110))
    return frames[:total]


# ---------- E-01 Skeleton (48) ----------
SKEL_BONE = (230, 228, 215, 255)
SKEL_DARK = (160, 155, 140, 255)


def skel_draw(d, size, leg_swing=0, arm_swing=0, body_bob=0):
    cx = size // 2
    base_y = size - 8 + body_bob
    shadow(d, size)
    # legs
    lyo = -leg_swing
    ryo = leg_swing
    d.rectangle([cx - 5, base_y - 6 + lyo, cx - 2, base_y + lyo], fill=SKEL_BONE, outline=OUTLINE)
    d.rectangle([cx + 2, base_y - 6 + ryo, cx + 5, base_y + ryo], fill=SKEL_BONE, outline=OUTLINE)
    # ribcage / torso
    d.rounded_rectangle([cx - 7, base_y - 14, cx + 7, base_y - 5], radius=2, fill=SKEL_BONE, outline=OUTLINE)
    # rib lines
    for ry in (-12, -10, -8):
        d.line([(cx - 6, base_y + ry), (cx + 6, base_y + ry)], fill=SKEL_DARK)
    # arms
    d.rectangle([cx - 11, base_y - 13 + arm_swing, cx - 8, base_y - 5 + arm_swing], fill=SKEL_BONE, outline=OUTLINE)
    d.rectangle([cx + 8, base_y - 13 - arm_swing, cx + 11, base_y - 5 - arm_swing], fill=SKEL_BONE, outline=OUTLINE)
    # rusty sword in right hand
    d.line([(cx + 10, base_y - 6 - arm_swing), (cx + 14, base_y - 14 - arm_swing)], fill=(140, 140, 140, 255), width=2)
    # skull
    sy = base_y - 22
    d.ellipse([cx - 7, sy - 4, cx + 7, sy + 8], fill=SKEL_BONE, outline=OUTLINE)
    # eye sockets
    d.rectangle([cx - 4, sy + 1, cx - 2, sy + 4], fill=BLACK)
    d.rectangle([cx + 2, sy + 1, cx + 4, sy + 4], fill=BLACK)
    # nose
    d.rectangle([cx, sy + 4, cx + 1, sy + 6], fill=BLACK)
    # teeth
    for tx in (-3, -1, 1, 3):
        d.rectangle([cx + tx, sy + 7, cx + tx + 1, sy + 8], fill=BLACK)


def skel_walk(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    swing = [2, 0, -2, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    skel_draw(d, 48, leg_swing=swing, arm_swing=-swing, body_bob=bob)
    return img


# ---------- E-02 Goblin (48) ----------
GOB_SKIN = (84, 169, 79, 255)
GOB_DARK = (52, 110, 50, 255)
GOB_TUNIC = (132, 70, 30, 255)


def gob_draw(d, size, leg_swing=0, body_bob=0):
    cx = size // 2
    base_y = size - 8 + body_bob
    shadow(d, size)
    # legs
    d.rectangle([cx - 5, base_y - 5 - leg_swing, cx - 2, base_y - leg_swing], fill=GOB_SKIN, outline=OUTLINE)
    d.rectangle([cx + 2, base_y - 5 + leg_swing, cx + 5, base_y + leg_swing], fill=GOB_SKIN, outline=OUTLINE)
    # tunic
    d.rounded_rectangle([cx - 8, base_y - 13, cx + 8, base_y - 4], radius=2, fill=GOB_TUNIC, outline=OUTLINE)
    # belt
    d.rectangle([cx - 8, base_y - 5, cx + 8, base_y - 4], fill=(60, 30, 15, 255))
    # arms
    d.rectangle([cx - 11, base_y - 13, cx - 8, base_y - 6], fill=GOB_SKIN, outline=OUTLINE)
    d.rectangle([cx + 8, base_y - 13, cx + 11, base_y - 6], fill=GOB_SKIN, outline=OUTLINE)
    # crude club
    d.rectangle([cx + 9, base_y - 18, cx + 13, base_y - 13], fill=(110, 70, 30, 255), outline=OUTLINE)
    d.line([(cx + 11, base_y - 13), (cx + 11, base_y - 7)], fill=(80, 50, 20, 255), width=2)
    # head
    sy = base_y - 21
    d.ellipse([cx - 8, sy - 4, cx + 8, sy + 8], fill=GOB_SKIN, outline=OUTLINE)
    # ears (pointy)
    d.polygon([(cx - 8, sy - 1), (cx - 12, sy - 4), (cx - 8, sy + 4)], fill=GOB_SKIN, outline=OUTLINE)
    d.polygon([(cx + 8, sy - 1), (cx + 12, sy - 4), (cx + 8, sy + 4)], fill=GOB_SKIN, outline=OUTLINE)
    # eyes (yellow, mean)
    d.rectangle([cx - 4, sy + 1, cx - 2, sy + 3], fill=(255, 220, 40, 255))
    d.rectangle([cx + 2, sy + 1, cx + 4, sy + 3], fill=(255, 220, 40, 255))
    d.rectangle([cx - 3, sy + 2, cx - 3, sy + 2], fill=BLACK)
    d.rectangle([cx + 3, sy + 2, cx + 3, sy + 2], fill=BLACK)
    # snarl
    d.line([(cx - 2, sy + 6), (cx + 2, sy + 6)], fill=BLACK)
    d.rectangle([cx - 1, sy + 5, cx, sy + 6], fill=WHITE)


def gob_walk(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    swing = [2, 0, -2, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    gob_draw(d, 48, leg_swing=swing, body_bob=bob)
    return img


# ---------- E-03 Shadow Archer (48) ----------
ARC_ROBE = (60, 50, 70, 255)
ARC_ROBE_HI = (95, 80, 110, 255)
ARC_HOOD = (35, 28, 45, 255)
ARC_SKIN = (180, 170, 200, 255)


def arc_draw(d, size, leg_swing=0, body_bob=0, draw_bow=True, bow_pulled=False):
    cx = size // 2
    base_y = size - 8 + body_bob
    shadow(d, size)
    # legs
    d.rectangle([cx - 4, base_y - 5 - leg_swing, cx - 1, base_y - leg_swing], fill=ARC_HOOD, outline=OUTLINE)
    d.rectangle([cx + 1, base_y - 5 + leg_swing, cx + 4, base_y + leg_swing], fill=ARC_HOOD, outline=OUTLINE)
    # robe
    d.polygon([
        (cx - 9, base_y - 14),
        (cx + 9, base_y - 14),
        (cx + 7, base_y - 4),
        (cx - 7, base_y - 4),
    ], fill=ARC_ROBE, outline=OUTLINE)
    d.line([(cx, base_y - 13), (cx, base_y - 5)], fill=ARC_ROBE_HI)
    # head/hood
    sy = base_y - 22
    d.ellipse([cx - 7, sy - 3, cx + 7, sy + 9], fill=ARC_HOOD, outline=OUTLINE)
    # face inside hood
    d.ellipse([cx - 4, sy + 2, cx + 4, sy + 8], fill=ARC_SKIN)
    d.rectangle([cx - 3, sy + 3, cx - 1, sy + 5], fill=(255, 50, 50, 255))
    d.rectangle([cx + 1, sy + 3, cx + 3, sy + 5], fill=(255, 50, 50, 255))
    # arms + bow
    if draw_bow:
        # bow on left, drawn vertical
        bx = cx - 11
        d.arc([bx - 2, base_y - 19, bx + 6, base_y - 1], start=270, end=90, fill=OUTLINE, width=2)
        # string
        if bow_pulled:
            d.line([(bx + 3, base_y - 18), (cx + 4, base_y - 11), (bx + 3, base_y - 2)], fill=WHITE)
            # arrow nocked
            d.line([(cx + 4, base_y - 11), (cx - 1, base_y - 11)], fill=(220, 220, 200, 255), width=1)
            d.polygon([(cx - 2, base_y - 12), (cx - 2, base_y - 10), (cx - 5, base_y - 11)], fill=(220, 220, 200, 255))
        else:
            d.line([(bx + 3, base_y - 18), (bx + 3, base_y - 2)], fill=WHITE)
        # hand on bow
        d.rectangle([bx + 1, base_y - 12, bx + 4, base_y - 9], fill=ARC_SKIN, outline=OUTLINE)
    # right arm
    arm_x = cx + 4 if bow_pulled else cx + 7
    d.rectangle([arm_x, base_y - 13, arm_x + 3, base_y - 8], fill=ARC_ROBE, outline=OUTLINE)


def arc_walk(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    swing = [2, 0, -2, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    arc_draw(d, 48, leg_swing=swing, body_bob=bob, draw_bow=True, bow_pulled=False)
    return img


def arc_shoot(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    if frame == 0:
        # draw bow back
        arc_draw(d, 48, leg_swing=0, body_bob=0, draw_bow=True, bow_pulled=True)
    else:
        # release - flash + arrow leaving
        arc_draw(d, 48, leg_swing=0, body_bob=0, draw_bow=True, bow_pulled=False)
        # arrow streak
        d.line([(20, 32), (8, 32)], fill=(255, 220, 100, 255), width=1)
        d.polygon([(8, 31), (8, 33), (4, 32)], fill=(255, 220, 100, 255))
    return img


# ---------- E-04 Dark Knight (64) ----------
DK_PLATE = (50, 50, 60, 255)
DK_PLATE_HI = (90, 90, 110, 255)
DK_PLATE_DK = (25, 25, 35, 255)
DK_TRIM = (180, 30, 30, 255)
DK_EYES = (255, 80, 60, 255)


def dk_draw(d, size, leg_swing=0, body_bob=0, sword_angle=80, sword_len=22):
    cx = size // 2
    base_y = size - 10 + body_bob
    shadow(d, size, ry=6)
    # legs (greaves)
    d.rectangle([cx - 7, base_y - 8 - leg_swing, cx - 2, base_y - leg_swing], fill=DK_PLATE, outline=OUTLINE)
    d.rectangle([cx + 2, base_y - 8 + leg_swing, cx + 7, base_y + leg_swing], fill=DK_PLATE, outline=OUTLINE)
    d.rectangle([cx - 7, base_y - 2 - leg_swing, cx - 2, base_y - leg_swing], fill=DK_PLATE_DK)
    d.rectangle([cx + 2, base_y - 2 + leg_swing, cx + 7, base_y + leg_swing], fill=DK_PLATE_DK)
    # cuirass
    d.rounded_rectangle([cx - 13, base_y - 22, cx + 13, base_y - 7], radius=4, fill=DK_PLATE, outline=OUTLINE)
    # chest highlight + red trim
    d.rectangle([cx - 10, base_y - 20, cx + 10, base_y - 18], fill=DK_PLATE_HI)
    d.rectangle([cx - 10, base_y - 9, cx + 10, base_y - 8], fill=DK_TRIM)
    d.line([(cx, base_y - 21), (cx, base_y - 9)], fill=DK_TRIM)
    # pauldrons
    d.ellipse([cx - 16, base_y - 22, cx - 8, base_y - 14], fill=DK_PLATE_DK, outline=OUTLINE)
    d.ellipse([cx + 8, base_y - 22, cx + 16, base_y - 14], fill=DK_PLATE_DK, outline=OUTLINE)
    # arms
    d.rectangle([cx - 16, base_y - 14, cx - 12, base_y - 6], fill=DK_PLATE, outline=OUTLINE)
    d.rectangle([cx + 12, base_y - 14, cx + 16, base_y - 6], fill=DK_PLATE, outline=OUTLINE)
    # sword (right hand)
    a = math.radians(sword_angle)
    hx = cx + 14
    hy = base_y - 9
    ex = hx + math.cos(a) * sword_len
    ey = hy + math.sin(a) * sword_len
    pa = a + math.pi / 2
    d.line([(hx + math.cos(pa) * 5, hy + math.sin(pa) * 5),
            (hx - math.cos(pa) * 5, hy - math.sin(pa) * 5)], fill=(150, 30, 30, 255), width=2)
    d.line([(hx, hy), (ex, ey)], fill=(180, 180, 200, 255), width=3)
    d.line([(hx, hy), (ex, ey)], fill=(220, 220, 240, 255), width=1)
    # great helm
    sy = base_y - 32
    d.rounded_rectangle([cx - 9, sy, cx + 9, sy + 13], radius=3, fill=DK_PLATE_DK, outline=OUTLINE)
    d.rectangle([cx - 9, sy + 5, cx + 9, sy + 7], fill=BLACK)
    # red glowing eye slits
    d.rectangle([cx - 6, sy + 5, cx - 2, sy + 7], fill=DK_EYES)
    d.rectangle([cx + 2, sy + 5, cx + 6, sy + 7], fill=DK_EYES)
    # crest
    d.polygon([(cx - 2, sy - 4), (cx + 2, sy - 4), (cx + 2, sy + 1), (cx - 2, sy + 1)], fill=DK_TRIM, outline=OUTLINE)


def dk_walk(frame):
    img = new_img(64)
    d = ImageDraw.Draw(img)
    swing = [3, 0, -3, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    dk_draw(d, 64, leg_swing=swing, body_bob=bob)
    return img


def dk_attack(frame):
    img = new_img(64)
    d = ImageDraw.Draw(img)
    # Frame 0 wind-up (raise), 1 swing high, 2 swing low, 3 recover
    angles = [-100, -40, 50, 100]
    bobs = [-2, -2, 0, 0]
    dk_draw(d, 64, leg_swing=1, body_bob=bobs[frame % 4], sword_angle=angles[frame % 4], sword_len=24)
    if frame in (1, 2):
        cx = 32
        base_y = 64 - 10 + bobs[frame % 4]
        a = math.radians(angles[frame % 4])
        for i in range(8):
            t = i / 8
            ang = math.radians(angles[(frame % 4) - 1] + (angles[frame % 4] - angles[(frame % 4) - 1]) * t)
            r = 24
            sx = cx + 14 + math.cos(ang) * r
            sy = base_y - 9 + math.sin(ang) * r
            alpha = int(150 * t)
            d.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(255, 255, 255, alpha))
    return img


# ---------- E-05 Dark Mage (48) ----------
MG_ROBE = (105, 50, 140, 255)
MG_ROBE_HI = (155, 90, 200, 255)
MG_TRIM = (255, 215, 64, 255)
MG_HOOD = (60, 25, 90, 255)
MG_GLOW = (200, 100, 255, 255)


def mg_draw(d, size, leg_swing=0, body_bob=0, arms_up=False, glow=0):
    cx = size // 2
    base_y = size - 8 + body_bob
    shadow(d, size)
    # robe (triangular shape)
    d.polygon([
        (cx - 11, base_y - 16),
        (cx + 11, base_y - 16),
        (cx + 9, base_y),
        (cx - 9, base_y),
    ], fill=MG_ROBE, outline=OUTLINE)
    d.line([(cx, base_y - 16), (cx, base_y)], fill=MG_ROBE_HI)
    # hem trim
    d.line([(cx - 9, base_y - 1), (cx + 9, base_y - 1)], fill=MG_TRIM)
    # legs barely visible
    d.rectangle([cx - 4, base_y - 1 - leg_swing, cx - 2, base_y + 1 - leg_swing], fill=BLACK)
    d.rectangle([cx + 2, base_y - 1 + leg_swing, cx + 4, base_y + 1 + leg_swing], fill=BLACK)
    # arms
    if arms_up:
        # raised, holding orb
        d.rectangle([cx - 11, base_y - 22, cx - 8, base_y - 14], fill=MG_ROBE, outline=OUTLINE)
        d.rectangle([cx + 8, base_y - 22, cx + 11, base_y - 14], fill=MG_ROBE, outline=OUTLINE)
        # orb glow
        ox, oy = cx, base_y - 25
        for r, a in [(8, 70), (5, 140), (3, 220)]:
            d.ellipse([ox - r, oy - r, ox + r, oy + r], fill=(MG_GLOW[0], MG_GLOW[1], MG_GLOW[2], a))
        d.ellipse([ox - 2, oy - 2, ox + 2, oy + 2], fill=WHITE)
    else:
        d.rectangle([cx - 12, base_y - 14, cx - 9, base_y - 6], fill=MG_ROBE, outline=OUTLINE)
        d.rectangle([cx + 9, base_y - 14, cx + 12, base_y - 6], fill=MG_ROBE, outline=OUTLINE)
        # staff in right hand
        d.line([(cx + 11, base_y - 22), (cx + 11, base_y - 4)], fill=(100, 70, 40, 255), width=2)
        d.ellipse([cx + 8, base_y - 26, cx + 14, base_y - 20], fill=MG_GLOW, outline=OUTLINE)
        d.ellipse([cx + 10, base_y - 25, cx + 12, base_y - 23], fill=WHITE)
    # head/hood (pointed)
    sy = base_y - 23
    d.polygon([(cx - 8, sy + 8), (cx, sy - 8), (cx + 8, sy + 8)], fill=MG_HOOD, outline=OUTLINE)
    # face shadow
    d.ellipse([cx - 4, sy + 1, cx + 4, sy + 8], fill=BLACK)
    # glowing eyes
    d.rectangle([cx - 3, sy + 4, cx - 2, sy + 6], fill=MG_GLOW)
    d.rectangle([cx + 2, sy + 4, cx + 3, sy + 6], fill=MG_GLOW)


def mg_walk(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    swing = [1, 0, -1, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    mg_draw(d, 48, leg_swing=swing, body_bob=bob)
    return img


def mg_cast(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    mg_draw(d, 48, leg_swing=0, body_bob=-1, arms_up=True, glow=frame)
    # extra particles around orb
    cx = 24
    oy = 48 - 8 - 1 - 25
    for i in range(6):
        ang = (frame * 0.7 + i * math.pi / 3)
        r = 10 + frame * 2
        sx = cx + math.cos(ang) * r
        sy = oy + math.sin(ang) * r * 0.6
        alpha = max(60, 200 - frame * 40)
        d.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(MG_GLOW[0], MG_GLOW[1], MG_GLOW[2], alpha))
    return img


# ---------- E-06 Orc (64) ----------
ORC_SKIN = (110, 165, 70, 255)
ORC_DARK = (70, 110, 45, 255)
ORC_LEATHER = (90, 60, 30, 255)
ORC_TUSK = (245, 235, 200, 255)


def orc_draw(d, size, leg_swing=0, body_bob=0, axe_angle=70, axe_len=18):
    cx = size // 2
    base_y = size - 10 + body_bob
    shadow(d, size, ry=6)
    # legs
    d.rectangle([cx - 7, base_y - 8 - leg_swing, cx - 2, base_y - leg_swing], fill=ORC_LEATHER, outline=OUTLINE)
    d.rectangle([cx + 2, base_y - 8 + leg_swing, cx + 7, base_y + leg_swing], fill=ORC_LEATHER, outline=OUTLINE)
    # torso (shirtless, big)
    d.rounded_rectangle([cx - 14, base_y - 22, cx + 14, base_y - 7], radius=5, fill=ORC_SKIN, outline=OUTLINE)
    # muscle shading
    d.line([(cx - 5, base_y - 21), (cx - 5, base_y - 9)], fill=ORC_DARK)
    d.line([(cx + 5, base_y - 21), (cx + 5, base_y - 9)], fill=ORC_DARK)
    d.line([(cx - 13, base_y - 16), (cx + 13, base_y - 16)], fill=ORC_DARK)
    # belt
    d.rectangle([cx - 14, base_y - 9, cx + 14, base_y - 7], fill=ORC_LEATHER)
    # arms (huge)
    d.ellipse([cx - 19, base_y - 22, cx - 11, base_y - 8], fill=ORC_SKIN, outline=OUTLINE)
    d.ellipse([cx + 11, base_y - 22, cx + 19, base_y - 8], fill=ORC_SKIN, outline=OUTLINE)
    # axe in right hand
    a = math.radians(axe_angle)
    hx = cx + 16
    hy = base_y - 12
    ex = hx + math.cos(a) * axe_len
    ey = hy + math.sin(a) * axe_len
    d.line([(hx, hy), (ex, ey)], fill=(80, 50, 25, 255), width=3)
    # axe head
    head_x = ex
    head_y = ey
    pa = a + math.pi / 2
    p1 = (head_x + math.cos(pa) * 6, head_y + math.sin(pa) * 6)
    p2 = (head_x - math.cos(pa) * 6, head_y - math.sin(pa) * 6)
    p3 = (head_x + math.cos(a) * 4, head_y + math.sin(a) * 4)
    d.polygon([p1, p2, p3], fill=(180, 180, 195, 255), outline=OUTLINE)
    # head
    sy = base_y - 32
    d.ellipse([cx - 9, sy, cx + 9, sy + 14], fill=ORC_SKIN, outline=OUTLINE)
    # eyes
    d.rectangle([cx - 5, sy + 5, cx - 3, sy + 7], fill=(255, 230, 80, 255))
    d.rectangle([cx + 3, sy + 5, cx + 5, sy + 7], fill=(255, 230, 80, 255))
    d.rectangle([cx - 4, sy + 6, cx - 4, sy + 6], fill=BLACK)
    d.rectangle([cx + 4, sy + 6, cx + 4, sy + 6], fill=BLACK)
    # tusks
    d.polygon([(cx - 3, sy + 10), (cx - 2, sy + 13), (cx - 4, sy + 11)], fill=ORC_TUSK, outline=OUTLINE)
    d.polygon([(cx + 3, sy + 10), (cx + 2, sy + 13), (cx + 4, sy + 11)], fill=ORC_TUSK, outline=OUTLINE)
    # mouth
    d.line([(cx - 3, sy + 10), (cx + 3, sy + 10)], fill=BLACK)


def orc_walk(frame):
    img = new_img(64)
    d = ImageDraw.Draw(img)
    swing = [3, 0, -3, 0][frame % 4]
    bob = [0, -1, 0, -1][frame % 4]
    orc_draw(d, 64, leg_swing=swing, body_bob=bob)
    return img


def orc_attack(frame):
    img = new_img(64)
    d = ImageDraw.Draw(img)
    angles = [-90, 30, 100]
    bobs = [-2, 0, 0]
    orc_draw(d, 64, leg_swing=2, body_bob=bobs[frame % 3], axe_angle=angles[frame % 3], axe_len=22)
    if frame == 1:
        # swoosh
        cx = 32
        base_y = 64 - 10
        for i in range(10):
            t = i / 10
            ang = math.radians(-90 + 120 * t)
            sx = cx + 16 + math.cos(ang) * 26
            sy = base_y - 12 + math.sin(ang) * 26
            alpha = int(180 * t)
            d.ellipse([sx - 1, sy - 1, sx + 2, sy + 2], fill=(255, 255, 255, alpha))
    return img


# ---------- E-07 Wolf (48) - quadruped side view ----------
WOLF_FUR = (110, 120, 130, 255)
WOLF_FUR_DK = (70, 80, 92, 255)
WOLF_BELLY = (160, 170, 178, 255)


def wolf_draw(d, size, leg_phase=0, mouth_open=False):
    cx = size // 2
    base_y = size - 8
    shadow(d, size, ry=4)
    # body (horizontal oval)
    d.ellipse([cx - 15, base_y - 14, cx + 12, base_y - 4], fill=WOLF_FUR, outline=OUTLINE)
    # belly highlight
    d.ellipse([cx - 12, base_y - 9, cx + 8, base_y - 4], fill=WOLF_BELLY)
    # back legs
    bl = [-2, 0, 2, 0][leg_phase % 4]
    fl = [2, 0, -2, 0][leg_phase % 4]
    d.rectangle([cx + 4, base_y - 5, cx + 7, base_y + bl], fill=WOLF_FUR_DK, outline=OUTLINE)
    d.rectangle([cx + 9, base_y - 5, cx + 12, base_y - bl], fill=WOLF_FUR_DK, outline=OUTLINE)
    # front legs
    d.rectangle([cx - 14, base_y - 5, cx - 11, base_y + fl], fill=WOLF_FUR_DK, outline=OUTLINE)
    d.rectangle([cx - 9, base_y - 5, cx - 6, base_y - fl], fill=WOLF_FUR_DK, outline=OUTLINE)
    # tail
    d.polygon([(cx + 12, base_y - 12), (cx + 19, base_y - 16), (cx + 14, base_y - 8)], fill=WOLF_FUR, outline=OUTLINE)
    # head (front-left)
    hx = cx - 14
    hy = base_y - 14
    d.ellipse([hx - 8, hy - 6, hx + 4, hy + 6], fill=WOLF_FUR, outline=OUTLINE)
    # snout
    d.polygon([(hx - 11, hy + 1), (hx - 3, hy - 1), (hx - 3, hy + 4), (hx - 11, hy + 3)], fill=WOLF_FUR, outline=OUTLINE)
    # nose
    d.ellipse([hx - 12, hy + 1, hx - 9, hy + 3], fill=BLACK)
    # eye (yellow)
    d.rectangle([hx - 3, hy - 1, hx - 1, hy + 1], fill=(255, 220, 60, 255))
    d.rectangle([hx - 2, hy, hx - 2, hy], fill=BLACK)
    # ears
    d.polygon([(hx - 3, hy - 6), (hx, hy - 9), (hx + 1, hy - 4)], fill=WOLF_FUR_DK, outline=OUTLINE)
    d.polygon([(hx + 1, hy - 6), (hx + 4, hy - 8), (hx + 4, hy - 3)], fill=WOLF_FUR_DK, outline=OUTLINE)
    # mouth
    if mouth_open:
        d.polygon([(hx - 11, hy + 3), (hx - 5, hy + 2), (hx - 11, hy + 6)], fill=(140, 30, 30, 255), outline=OUTLINE)
        # fangs
        d.polygon([(hx - 10, hy + 3), (hx - 9, hy + 5), (hx - 8, hy + 3)], fill=WHITE)
        d.polygon([(hx - 7, hy + 3), (hx - 6, hy + 5), (hx - 5, hy + 3)], fill=WHITE)
    else:
        d.line([(hx - 10, hy + 4), (hx - 4, hy + 4)], fill=BLACK)


def wolf_run(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    wolf_draw(d, 48, leg_phase=frame % 4, mouth_open=False)
    return img


def wolf_bite(frame):
    img = new_img(48)
    d = ImageDraw.Draw(img)
    # frame 0 crouch, 1 lunge with mouth open, 2 retract
    if frame == 0:
        wolf_draw(d, 48, leg_phase=0, mouth_open=False)
    elif frame == 1:
        # shift body forward (left)
        sub = new_img(48)
        sd = ImageDraw.Draw(sub)
        wolf_draw(sd, 48, leg_phase=1, mouth_open=True)
        img.alpha_composite(sub, (-3, -1))
    else:
        wolf_draw(d, 48, leg_phase=2, mouth_open=True)
    return img


# ---------- Main ----------
def main():
    print(f"Generating enemies → {OUT}")

    # E-01 Skeleton
    make_sheet([skel_walk(i) for i in range(4)], OUT / "skeleton_walk.png")
    make_sheet(death_frames(skel_walk), OUT / "skeleton_death.png")

    # E-02 Goblin
    make_sheet([gob_walk(i) for i in range(4)], OUT / "goblin_walk.png")
    make_sheet(death_frames(gob_walk), OUT / "goblin_death.png")

    # E-03 Shadow Archer
    make_sheet([arc_walk(i) for i in range(4)], OUT / "archer_e_walk.png")
    make_sheet([arc_shoot(i) for i in range(2)], OUT / "archer_e_shoot.png")
    make_sheet(death_frames(arc_walk), OUT / "archer_e_death.png")

    # E-04 Dark Knight
    make_sheet([dk_walk(i) for i in range(4)], OUT / "knight_e_walk.png")
    make_sheet([dk_attack(i) for i in range(4)], OUT / "knight_e_attack.png")
    make_sheet(death_frames(dk_walk), OUT / "knight_e_death.png")

    # E-05 Dark Mage
    make_sheet([mg_walk(i) for i in range(4)], OUT / "mage_e_walk.png")
    make_sheet([mg_cast(i) for i in range(3)], OUT / "mage_e_cast.png")
    make_sheet(death_frames(mg_walk), OUT / "mage_e_death.png")

    # E-06 Orc
    make_sheet([orc_walk(i) for i in range(4)], OUT / "orc_walk.png")
    make_sheet([orc_attack(i) for i in range(3)], OUT / "orc_attack.png")
    make_sheet(death_frames(orc_walk), OUT / "orc_death.png")

    # E-07 Wolf
    make_sheet([wolf_run(i) for i in range(4)], OUT / "wolf_run.png")
    make_sheet([wolf_bite(i) for i in range(3)], OUT / "wolf_bite.png")
    make_sheet(death_frames(wolf_run), OUT / "wolf_death.png")

    print("Done.")


if __name__ == "__main__":
    main()
