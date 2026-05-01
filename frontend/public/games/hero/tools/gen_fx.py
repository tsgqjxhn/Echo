"""Generate projectile and FX sprites used by the Roguelike combat.

All outputs go to: assets/sprites/fx/
- arrow.png, magic_bolt.png, spear.png, slash.png       (player projectiles / melee)
- enemy_bolt.png                                        (red enemy projectile)
- boss_fireball.png, boss_aoe.png, boss_ice.png,
  boss_stomp.png, boss_breath.png, boss_charge.png      (boss skill shots)
- hit_white.png, hit_yellow.png                         (hit-burst particles)
- death_<color>.png  for skeleton / goblin / archer_e / knight_e / mage_e / orc / wolf
- xp_orb.png, resource_orb.png                          (drop orbs)
- arrow_rain.png                                        (ranger AoE arrow strip)
- heal_aura.png, shield_aura.png, command_aura.png      (large radial auras)
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites" / "fx"
OUT.mkdir(parents=True, exist_ok=True)
T = (0, 0, 0, 0)


def save(img: Image.Image, name: str):
    img.save(OUT / name)
    print(f"  wrote {name}  ({img.width}x{img.height})")


def glow_dot(d, x, y, r, color, halo_alpha=120):
    halo = (color[0], color[1], color[2], halo_alpha)
    d.ellipse([x - r * 1.6, y - r * 1.6, x + r * 1.6, y + r * 1.6], fill=halo)
    d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    d.ellipse([x - r * 0.4, y - r * 0.4, x + r * 0.4, y + r * 0.4], fill=(255, 255, 255, 255))


# ---------------- arrows / spears (horizontal pointing right) ----------------
def make_arrow(length=16, height=4, shaft=(220, 200, 130, 255), head=(240, 240, 240, 255), fletch=(230, 80, 80, 255)):
    img = Image.new("RGBA", (length, height), T)
    d = ImageDraw.Draw(img)
    # shaft
    d.line([(2, height // 2), (length - 4, height // 2)], fill=shaft, width=max(1, height // 2))
    # head (triangle)
    d.polygon([(length - 5, 0), (length - 1, height // 2), (length - 5, height - 1)], fill=head)
    # fletch
    d.polygon([(0, 0), (3, height // 2), (0, height - 1)], fill=fletch)
    return img


def make_magic_bolt(size=16, color=(180, 100, 255, 255)):
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    cx = cy = size // 2
    glow_dot(d, cx, cy, size // 3, color, halo_alpha=140)
    # sparkles
    for ang in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        sx = cx + math.cos(ang) * (size // 2 - 1)
        sy = cy + math.sin(ang) * (size // 2 - 1)
        d.point((sx, sy), fill=(255, 255, 255, 220))
    return img.filter(ImageFilter.SMOOTH)


def make_slash(size=32, color=(255, 255, 255, 255)):
    """Horizontal arc trail."""
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    # Crescent: outer arc minus inner arc
    cx, cy = size // 2, size // 2 + 4
    for r, alpha in [(size // 2 - 2, 220), (size // 2 - 4, 180), (size // 2 - 6, 100)]:
        d.arc([cx - r, cy - r, cx + r, cy + r], start=200, end=340,
              fill=(color[0], color[1], color[2], alpha), width=2)
    # tip flares
    d.polygon([(4, cy + 4), (10, cy - 2), (12, cy + 4)], fill=color)
    d.polygon([(size - 4, cy + 4), (size - 10, cy - 2), (size - 12, cy + 4)], fill=color)
    return img


# ---------------- generic radial puff (fireballs etc.) ----------------
def make_puff(size, inner, outer, sparks=False):
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    cx = cy = size // 2
    # halo
    d.ellipse([0, 0, size, size], fill=(outer[0], outer[1], outer[2], 90))
    d.ellipse([cx - size // 3, cy - size // 3, cx + size // 3, cy + size // 3], fill=outer)
    # core
    d.ellipse([cx - size // 5, cy - size // 5, cx + size // 5, cy + size // 5], fill=inner)
    # bright center
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, 255))
    if sparks:
        for i in range(6):
            a = i * math.pi / 3
            r = size // 2 - 2
            d.point((int(cx + math.cos(a) * r), int(cy + math.sin(a) * r)), fill=(255, 255, 220, 220))
    return img


def make_ice_block(size=48):
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    cx = size // 2
    # crystal hexagon-ish
    pts = [(cx, 4), (size - 6, size // 4), (size - 4, size * 3 // 4),
           (cx, size - 4), (6, size * 3 // 4), (4, size // 4)]
    d.polygon(pts, fill=(180, 230, 250, 230), outline=(60, 130, 170, 255))
    # facet highlights
    d.line([(cx, 6), (cx, size - 6)], fill=(230, 250, 255, 255))
    d.line([(8, size // 3), (cx, size // 2)], fill=(230, 250, 255, 200))
    d.line([(size - 8, size // 3), (cx, size // 2)], fill=(230, 250, 255, 200))
    d.polygon([(cx, 4), (cx + 6, size // 4), (cx, size // 2), (cx - 6, size // 4)],
              fill=(220, 245, 255, 200))
    return img


# ---------------- particles (square/diamond bits) ----------------
def make_particle_strip(color, count=4, size=8):
    """Small particles for hit/death bursts. Strip of `count` frames."""
    img = Image.new("RGBA", (size * count, size), T)
    d = ImageDraw.Draw(img)
    for i in range(count):
        cx = i * size + size // 2
        cy = size // 2
        # diamond shape, shrinking & fading
        scale = 1 - i / count * 0.8
        s = int(size // 2 * scale)
        if s <= 0:
            continue
        alpha = int(255 - i * 50)
        c = (color[0], color[1], color[2], max(0, alpha))
        d.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], fill=c)
        d.point((cx, cy), fill=(255, 255, 255, alpha))
    return img


# ---------------- drops (orbs) ----------------
def make_orb(size=12, color=(0, 230, 255, 255)):
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    cx = cy = size // 2
    # halo
    d.ellipse([0, 0, size - 1, size - 1], fill=(color[0], color[1], color[2], 110))
    d.ellipse([2, 2, size - 3, size - 3], fill=color)
    # specular
    d.ellipse([cx - 3, cy - 4, cx, cy - 1], fill=(255, 255, 255, 220))
    return img


# ---------------- auras (translucent rings) ----------------
def make_aura(size, color, ring_alpha=160):
    img = Image.new("RGBA", (size, size), T)
    d = ImageDraw.Draw(img)
    cx = cy = size // 2
    for r, a in [(size // 2 - 2, ring_alpha),
                 (size // 2 - 6, ring_alpha // 2),
                 (size // 2 - 12, ring_alpha // 4)]:
        if r <= 0:
            continue
        d.ellipse([cx - r, cy - r, cx + r, cy + r],
                  outline=(color[0], color[1], color[2], a), width=2)
    # inner soft fill
    fill_alpha = max(0, ring_alpha // 4)
    d.ellipse([cx - size // 4, cy - size // 4, cx + size // 4, cy + size // 4],
              fill=(color[0], color[1], color[2], fill_alpha))
    return img


# ---------------- arrow rain (skill) ----------------
def make_arrow_rain():
    """Pre-rendered diagonal arrow that can be tiled in canvas as a skill effect."""
    img = Image.new("RGBA", (16, 16), T)
    d = ImageDraw.Draw(img)
    # slash from upper-left to lower-right
    d.line([(2, 2), (12, 12)], fill=(220, 200, 120, 255), width=2)
    d.polygon([(11, 11), (15, 13), (13, 15)], fill=(255, 240, 180, 255))
    d.polygon([(2, 2), (5, 1), (1, 5)], fill=(230, 80, 80, 255))
    return img


def main():
    print(f"Generating FX → {OUT}")
    # FX-01 Arrow
    save(make_arrow(16, 4), "arrow.png")
    # FX-02 Magic bolt (purple) for staff
    save(make_magic_bolt(16, (180, 100, 255, 255)), "magic_bolt.png")
    # FX-03 Spear (longer, gold/yellow)
    save(make_arrow(24, 6, shaft=(255, 220, 60, 255), head=(240, 240, 240, 255), fletch=(255, 235, 100, 255)),
         "spear.png")
    # FX-04 Sword slash arc
    save(make_slash(32, (255, 255, 255, 255)), "slash.png")
    # FX-05 Enemy projectile (red bolt)
    save(make_magic_bolt(12, (255, 60, 60, 255)), "enemy_bolt.png")
    # FX-06 Boss fireball
    save(make_puff(24, (255, 240, 120, 255), (255, 110, 30, 255), sparks=True), "boss_fireball.png")
    # FX-07 Boss AOE (orange)
    save(make_puff(24, (255, 220, 80, 255), (255, 145, 0, 255), sparks=True), "boss_aoe.png")
    # FX-08 Ice wall block
    save(make_ice_block(48), "boss_ice.png")
    # FX-09 Stomp shockwave (blue) — uses ring sprite
    save(make_aura(32, (3, 169, 244, 255), ring_alpha=220), "boss_stomp.png")
    # FX-10 Dragon breath (purple)
    save(make_puff(16, (220, 180, 255, 255), (130, 60, 180, 255)), "boss_breath.png")
    # FX-11 Skull King charge
    save(make_puff(32, (255, 230, 180, 255), (255, 23, 68, 255), sparks=True), "boss_charge.png")
    # FX-12 Hit particles (white + yellow)
    save(make_particle_strip((255, 255, 255, 255), count=4, size=8), "hit_white.png")
    save(make_particle_strip((255, 230, 80, 255), count=4, size=8), "hit_yellow.png")
    # FX-13 Death particles per enemy color
    death_colors = {
        "skeleton": (224, 224, 224, 255),
        "goblin": (76, 175, 80, 255),
        "archer_e": (121, 85, 72, 255),
        "knight_e": (66, 66, 66, 255),
        "mage_e": (156, 39, 176, 255),
        "orc": (139, 195, 74, 255),
        "wolf": (96, 125, 139, 255),
    }
    for k, c in death_colors.items():
        save(make_particle_strip(c, count=4, size=8), f"death_{k}.png")
    # FX-14 XP orb (cyan)
    save(make_orb(12, (0, 229, 255, 255)), "xp_orb.png")
    # FX-15 Resource orb (gold)
    save(make_orb(12, (255, 215, 64, 255)), "resource_orb.png")
    # FX-16 Arrow rain piece (16x16 angled)
    save(make_arrow_rain(), "arrow_rain.png")
    # FX-17 Heal aura (green)
    save(make_aura(64, (76, 175, 80, 255), ring_alpha=200), "heal_aura.png")
    # FX-18 Shield aura (blue)
    save(make_aura(64, (79, 195, 247, 255), ring_alpha=200), "shield_aura.png")
    # FX-19 Command aura (gold)
    save(make_aura(128, (255, 215, 64, 255), ring_alpha=180), "command_aura.png")
    print("Done.")


if __name__ == "__main__":
    main()
