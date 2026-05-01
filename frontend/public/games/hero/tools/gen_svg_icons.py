"""Generate SVG icons for buildings (multi-level), weapons, upgrades, resources,
civilizations, shop items, navigation, achievements and technologies.

All SVGs target a 64x64 viewBox by default; the consuming code can scale freely.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "assets" / "images"

DIRS = {
    "buildings": ROOT / "buildings",
    "weapons": ROOT / "weapons",
    "upgrades": ROOT / "upgrades",
    "resources": ROOT / "resources",
    "civilizations": ROOT / "civilizations",
    "shop": ROOT / "shop",
    "nav": ROOT.parent / "ui" / "nav",
    "tech": ROOT / "tech",
    "ach": ROOT / "achievements",
    "rarity": ROOT / "rarity",
}
for p in DIRS.values():
    p.mkdir(parents=True, exist_ok=True)


def svg_doc(body: str, vb=64) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb} {vb}" '
        f'width="{vb}" height="{vb}">{body}</svg>'
    )


def write(folder_key: str, name: str, content: str):
    path = DIRS[folder_key] / name
    path.write_text(content, encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT.parent)}")


# ===================================================================
# BUILDINGS — castle / barracks / academy / farm / lumber / quarry
# / goldmine / warehouse / tavern. Each has 4 level tiers (1/5/10/20).
# ===================================================================

# A small helper of recurring SVG fragments.
GROUND_SHADOW = '<ellipse cx="32" cy="56" rx="22" ry="3" fill="rgba(0,0,0,0.45)"/>'


def castle_svg(tier: int) -> str:
    # tier 1..4 — taller silhouette + more towers
    bg = '<rect width="64" height="64" rx="10" fill="#3a2a18"/>' \
         '<rect x="2" y="2" width="60" height="60" rx="8" fill="#5a3d20"/>'
    ground = GROUND_SHADOW
    # main body (always)
    body = (
        '<rect x="14" y="34" width="36" height="20" fill="#a0866a"/>'
        '<rect x="14" y="34" width="36" height="3" fill="#6a523a"/>'
        '<rect x="28" y="44" width="8" height="10" fill="#3a2a18"/>'
        '<rect x="29" y="46" width="2" height="5" fill="#ffd740"/>'
        '<rect x="33" y="46" width="2" height="5" fill="#ffd740"/>'
    )
    # crenellations
    cren = ''.join([
        f'<rect x="{14 + i * 6}" y="30" width="4" height="4" fill="#a0866a"/>'
        for i in range(6)
    ])
    # main tower rises with tier
    tower_h = [18, 24, 30, 36][tier - 1]
    tower_y = 34 - tower_h + 8
    main_tower = (
        f'<rect x="26" y="{tower_y}" width="12" height="{tower_h - 8}" fill="#a0866a"/>'
        f'<rect x="26" y="{tower_y}" width="12" height="3" fill="#6a523a"/>'
        f'<polygon points="22,{tower_y - 1} 32,{max(2, tower_y - 12)} 42,{tower_y - 1}" fill="#b71c1c"/>'
        f'<rect x="31" y="{max(0, tower_y - 16)}" width="1" height="6" fill="#ffd740"/>'
        f'<polygon points="32,{max(0, tower_y - 16)} 38,{max(0, tower_y - 14)} 32,{max(0, tower_y - 12)}" fill="#ffd740"/>'
        f'<rect x="29" y="{tower_y + 6}" width="2" height="4" fill="#3a2a18"/>'
        f'<rect x="33" y="{tower_y + 6}" width="2" height="4" fill="#3a2a18"/>'
    )
    # side towers (added at higher tiers)
    side = ''
    if tier >= 2:
        for sx in (8, 48):
            side += (
                f'<rect x="{sx}" y="28" width="8" height="26" fill="#a0866a"/>'
                f'<rect x="{sx}" y="28" width="8" height="3" fill="#6a523a"/>'
                f'<polygon points="{sx - 2},29 {sx + 4},22 {sx + 10},29" fill="#b71c1c"/>'
                f'<rect x="{sx + 3}" y="36" width="2" height="3" fill="#3a2a18"/>'
            )
    # decorative banners at tiers 3+
    if tier >= 3:
        side += '<rect x="6" y="10" width="2" height="14" fill="#ffd740"/>'\
                '<polygon points="8,12 14,16 8,20" fill="#b71c1c"/>'\
                '<rect x="56" y="10" width="2" height="14" fill="#ffd740"/>'\
                '<polygon points="56,12 50,16 56,20" fill="#b71c1c"/>'
    if tier >= 4:
        # gold trim sparkles
        side += ''.join([
            f'<circle cx="{x}" cy="{y}" r="0.9" fill="#ffd740"/>'
            for (x, y) in ((10, 6), (54, 6), (32, 4), (20, 26), (44, 26))
        ])
    return svg_doc(bg + ground + cren + body + side + main_tower)


def barracks_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#2a2a3e"/>'
    ground = GROUND_SHADOW
    body = (
        '<rect x="10" y="32" width="44" height="22" fill="#7a5a3a"/>'
        '<rect x="10" y="32" width="44" height="4" fill="#4a3520"/>'
        '<polygon points="6,32 32,16 58,32" fill="#9a3a3a"/>'
        '<polygon points="6,32 58,32 32,18" fill="#7a2828" opacity="0.6"/>'
        '<rect x="28" y="40" width="8" height="14" fill="#3a2a18"/>'
        '<rect x="14" y="40" width="6" height="6" fill="#222"/>'
        '<rect x="44" y="40" width="6" height="6" fill="#222"/>'
    )
    # crossed swords above door
    swords = (
        '<line x1="22" y1="20" x2="42" y2="32" stroke="#cfd8dc" stroke-width="2"/>'
        '<line x1="42" y1="20" x2="22" y2="32" stroke="#cfd8dc" stroke-width="2"/>'
        '<rect x="20" y="18" width="6" height="3" fill="#ffd740"/>'
        '<rect x="38" y="18" width="6" height="3" fill="#ffd740"/>'
    )
    extras = ''
    if tier >= 2:
        extras += '<rect x="4" y="26" width="6" height="28" fill="#7a5a3a"/>'\
                  '<rect x="54" y="26" width="6" height="28" fill="#7a5a3a"/>'\
                  '<polygon points="2,26 7,18 12,26" fill="#9a3a3a"/>'\
                  '<polygon points="52,26 57,18 62,26" fill="#9a3a3a"/>'
    if tier >= 3:
        extras += '<rect x="0" y="52" width="64" height="4" fill="#3a2a18"/>'
    if tier >= 4:
        extras += '<rect x="30" y="6" width="4" height="14" fill="#ffd740"/>'\
                  '<polygon points="34,8 48,12 34,16" fill="#b71c1c"/>'
    return svg_doc(bg + ground + body + swords + extras)


def academy_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#1a2a3a"/>'
    body = (
        '<rect x="10" y="30" width="44" height="24" fill="#dcdcdc"/>'
        '<rect x="10" y="30" width="44" height="4" fill="#a0a0a0"/>'
        '<polygon points="8,30 56,30 32,14" fill="#4a6a8a"/>'
        + ''.join(f'<rect x="{12 + i * 8}" y="36" width="4" height="14" fill="#1a2a3a"/>' for i in range(6))
    )
    pillars = ''.join(
        f'<rect x="{12 + i * 8}" y="20" width="3" height="10" fill="#dcdcdc"/>'
        for i in range(6)
    )
    book = '<rect x="26" y="42" width="12" height="8" fill="#7a3a3a"/>' \
           '<rect x="32" y="42" width="1" height="8" fill="#3a1010"/>' \
           '<rect x="28" y="44" width="3" height="1" fill="#ffd740"/>'
    extras = ''
    if tier >= 2:
        extras += '<rect x="2" y="36" width="8" height="18" fill="#dcdcdc"/>'\
                  '<rect x="54" y="36" width="8" height="18" fill="#dcdcdc"/>'
    if tier >= 3:
        extras += '<polygon points="32,2 36,12 32,10 28,12" fill="#ffd740"/>'\
                  '<circle cx="32" cy="20" r="3" fill="#ffd740" opacity="0.7"/>'
    if tier >= 4:
        extras += ''.join([
            f'<text x="{18 + i * 10}" y="14" fill="#ffd740" font-size="6" '
            f'font-family="serif">{ch}</text>'
            for i, ch in enumerate(['✦', '✦', '✦'])
        ])
    return svg_doc(bg + GROUND_SHADOW + body + pillars + book + extras)


def farm_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#3a2a14"/>' \
         '<rect x="2" y="34" width="60" height="22" fill="#6a4a1a"/>'
    # plowed rows
    rows = ''.join(
        f'<rect x="2" y="{38 + i * 4}" width="60" height="2" fill="#4a3010"/>'
        for i in range(4)
    )
    # crops scale with tier
    crop_count = (3, 6, 10, 14)[tier - 1]
    crops = ''
    for i in range(crop_count):
        x = 6 + (i * 7) % 56
        y = 36 + ((i // 8) * 6)
        crops += (
            f'<rect x="{x}" y="{y}" width="2" height="6" fill="#cfa645"/>'
            f'<polygon points="{x - 1},{y} {x + 3},{y} {x + 1},{y - 4}" fill="#ffd740"/>'
        )
    # barn
    barn = (
        '<rect x="6" y="18" width="20" height="16" fill="#9a3a2a"/>'
        '<polygon points="4,18 28,18 16,8" fill="#7a2828"/>'
        '<rect x="14" y="24" width="4" height="10" fill="#3a2a18"/>'
        '<rect x="9" y="22" width="4" height="4" fill="#ffd740"/>'
        '<rect x="19" y="22" width="4" height="4" fill="#ffd740"/>'
    )
    # silo at higher tiers
    silo = ''
    if tier >= 2:
        silo += '<rect x="42" y="14" width="10" height="20" fill="#9e9e9e"/>'\
                '<ellipse cx="47" cy="14" rx="5" ry="3" fill="#bdbdbd"/>'
    if tier >= 3:
        silo += '<rect x="54" y="20" width="6" height="14" fill="#bdbdbd"/>'\
                '<ellipse cx="57" cy="20" rx="3" ry="2" fill="#cfd8dc"/>'
    if tier >= 4:
        silo += '<circle cx="44" cy="6" r="3" fill="#ffd740"/>'\
                '<circle cx="44" cy="6" r="1.5" fill="#fff"/>'
    return svg_doc(bg + rows + crops + barn + silo + GROUND_SHADOW)


def lumber_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#1a2a14"/>'
    ground = '<rect x="0" y="50" width="64" height="14" fill="#3a4020"/>'
    # mill cabin
    cabin = (
        '<rect x="14" y="32" width="26" height="20" fill="#7a4a20"/>'
        '<polygon points="12,32 42,32 27,18" fill="#5a3010"/>'
        '<rect x="22" y="38" width="6" height="14" fill="#3a2010"/>'
        + ''.join(f'<rect x="14" y="{36 + i * 4}" width="26" height="1" fill="#5a3010"/>'
                  for i in range(4))
    )
    # log pile (bigger with tier)
    logs = ''
    n = (2, 4, 6, 8)[tier - 1]
    for i in range(n):
        cx = 50 + (i % 2) * 6 - (i % 2)
        cy = 50 - (i // 2) * 4
        logs += f'<ellipse cx="{cx}" cy="{cy}" rx="8" ry="3" fill="#7a4a20" stroke="#3a2010" stroke-width="0.5"/>'
        logs += f'<ellipse cx="{cx}" cy="{cy}" rx="2.5" ry="1" fill="#a06c40"/>'
    # axe sticking out
    axe = '<line x1="6" y1="46" x2="2" y2="32" stroke="#5a3010" stroke-width="2"/>' \
          '<polygon points="0,32 6,28 8,34" fill="#cfd8dc"/>'
    # tree (more at higher tiers)
    trees = ''
    if tier >= 2:
        trees += '<rect x="6" y="20" width="2" height="20" fill="#4a3010"/>'\
                 '<polygon points="0,28 14,28 7,12" fill="#3a6028"/>'
    if tier >= 3:
        trees += '<rect x="58" y="14" width="2" height="20" fill="#4a3010"/>'\
                 '<polygon points="52,22 64,22 59,4" fill="#3a6028"/>'
    if tier >= 4:
        trees += '<polygon points="48,16 56,16 52,4" fill="#5a8030"/>'
    return svg_doc(bg + ground + trees + cabin + logs + axe + GROUND_SHADOW)


def quarry_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#2a2a30"/>'
    ground = '<rect x="0" y="50" width="64" height="14" fill="#3a3a40"/>'
    # rock pile (bigger with tier)
    rocks = ''
    n = (3, 5, 8, 12)[tier - 1]
    for i in range(n):
        cx = 8 + (i * 11) % 50
        cy = 38 + (i % 3) * 4
        sz = 4 + (i % 3)
        rocks += (
            f'<polygon points="{cx},{cy} {cx + sz},{cy + 1} {cx + sz - 1},{cy + sz} '
            f'{cx},{cy + sz + 1} {cx - sz + 1},{cy + sz} {cx - sz},{cy + 1}" '
            f'fill="#9aa0a8" stroke="#5a6068" stroke-width="0.5"/>'
        )
    # main boulder
    boulder = (
        '<polygon points="20,40 40,38 50,46 44,54 20,54 12,46" '
        'fill="#bdbdbd" stroke="#5a6068" stroke-width="1"/>'
        '<polygon points="22,42 36,40 32,46" fill="#dcdcdc"/>'
    )
    # pickaxe
    pick = (
        '<line x1="10" y1="20" x2="20" y2="34" stroke="#7a4a20" stroke-width="2"/>'
        '<polygon points="6,16 14,12 18,20 10,24" fill="#cfd8dc" stroke="#5a6068"/>'
    )
    extras = ''
    if tier >= 2:
        extras += '<rect x="44" y="18" width="4" height="20" fill="#7a4a20"/>' \
                  '<polygon points="40,18 52,18 46,8" fill="#9a4a3a"/>'
    if tier >= 3:
        extras += '<circle cx="56" cy="34" r="4" fill="#7a4a20"/>' \
                  '<circle cx="56" cy="34" r="1.5" fill="#3a2010"/>'
    if tier >= 4:
        extras += ''.join([
            f'<circle cx="{x}" cy="{y}" r="0.8" fill="#ffd740"/>'
            for (x, y) in ((30, 36), (24, 50), (42, 50), (10, 50))
        ])
    return svg_doc(bg + ground + boulder + rocks + pick + extras + GROUND_SHADOW)


def goldmine_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#2a1f12"/>'
    ground = '<rect x="0" y="50" width="64" height="14" fill="#4a3a20"/>'
    # mountain with mine entrance
    mountain = '<polygon points="2,52 22,18 38,30 50,14 62,52" fill="#5a4a30" stroke="#3a2a18" stroke-width="1"/>'
    entrance = '<polygon points="20,52 28,42 36,52" fill="#1a1208"/>' \
               '<rect x="22" y="50" width="12" height="2" fill="#3a2a18"/>'
    # mine cart rails
    rails = '<line x1="0" y1="58" x2="64" y2="58" stroke="#7a5a3a" stroke-width="1"/>' \
            '<line x1="0" y1="60" x2="64" y2="60" stroke="#7a5a3a" stroke-width="1"/>'
    # gold piles
    piles = ''
    n = (3, 6, 9, 14)[tier - 1]
    for i in range(n):
        x = 4 + (i * 7) % 56
        y = 56 + (i % 2)
        piles += f'<circle cx="{x}" cy="{y}" r="2" fill="#ffd740" stroke="#a07a10"/>'
    cart = ''
    if tier >= 2:
        cart += '<rect x="40" y="50" width="14" height="6" fill="#7a4a20" stroke="#3a2010"/>' \
                '<circle cx="44" cy="58" r="2" fill="#3a2a18"/>' \
                '<circle cx="50" cy="58" r="2" fill="#3a2a18"/>'
    extras = ''
    if tier >= 3:
        extras += '<text x="20" y="36" fill="#ffd740" font-size="9" font-weight="bold" font-family="serif">$</text>'
    if tier >= 4:
        extras += ''.join([
            f'<circle cx="{x}" cy="{y}" r="0.8" fill="#ffe082"/>'
            for (x, y) in ((28, 30), (36, 26), (24, 24), (44, 32))
        ])
    return svg_doc(bg + ground + mountain + entrance + rails + cart + piles + extras + GROUND_SHADOW)


def warehouse_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#2a2820"/>'
    body = '<rect x="6" y="24" width="52" height="30" fill="#7a5a3a"/>' \
           '<polygon points="4,24 60,24 32,12" fill="#5a3a20"/>' \
           '<rect x="26" y="36" width="12" height="18" fill="#3a2010"/>' \
           '<rect x="26" y="36" width="12" height="2" fill="#7a4a20"/>' \
           + ''.join(f'<rect x="6" y="{28 + i * 4}" width="52" height="1" fill="#5a3a20"/>'
                     for i in range(6))
    # crates piled outside
    crates = ''
    n = (1, 2, 3, 4)[tier - 1]
    for i in range(n):
        cx = 46 + (i % 2) * 8
        cy = 46 - (i // 2) * 8
        crates += (
            f'<rect x="{cx}" y="{cy}" width="8" height="8" fill="#a06c40" stroke="#5a3010"/>'
            f'<line x1="{cx}" y1="{cy + 4}" x2="{cx + 8}" y2="{cy + 4}" stroke="#5a3010"/>'
            f'<line x1="{cx + 4}" y1="{cy}" x2="{cx + 4}" y2="{cy + 8}" stroke="#5a3010"/>'
        )
    return svg_doc(bg + GROUND_SHADOW + body + crates)


def tavern_svg(tier: int) -> str:
    bg = '<rect width="64" height="64" rx="10" fill="#2a1a12"/>'
    body = '<rect x="8" y="28" width="48" height="26" fill="#9a6c40"/>' \
           '<polygon points="6,28 58,28 32,14" fill="#7a3010"/>' \
           '<rect x="28" y="38" width="8" height="16" fill="#3a2010"/>' \
           '<rect x="14" y="34" width="8" height="6" fill="#ffeb3b" opacity="0.7"/>' \
           '<rect x="42" y="34" width="8" height="6" fill="#ffeb3b" opacity="0.7"/>'
    # sign
    sign = '<rect x="22" y="20" width="20" height="8" fill="#5a3010" stroke="#7a4a20"/>' \
           '<text x="32" y="26" fill="#ffd740" font-size="7" text-anchor="middle" font-weight="bold">⚱</text>'
    # mug
    mug = '<rect x="46" y="44" width="6" height="8" fill="#dcdcdc"/>' \
          '<rect x="52" y="46" width="2" height="4" fill="#dcdcdc"/>' \
          '<rect x="46" y="42" width="6" height="3" fill="#ffeb3b"/>'
    extras = ''
    if tier >= 2:
        extras += '<text x="14" y="44" fill="#fff" font-size="6">★</text>'
    if tier >= 3:
        extras += '<circle cx="32" cy="6" r="3" fill="#ffd740"/>' \
                  '<rect x="31" y="3" width="2" height="6" fill="#ffd740"/>'
    return svg_doc(bg + GROUND_SHADOW + body + sign + mug + extras)


BUILDING_GENS = {
    "castle": castle_svg,
    "barracks": barracks_svg,
    "academy": academy_svg,
    "farm": farm_svg,
    "lumbermill": lumber_svg,
    "quarry": quarry_svg,
    "goldmine": goldmine_svg,
    "warehouse": warehouse_svg,
    "tavern": tavern_svg,
}


# ===================================================================
# WEAPONS — sword / bow / staff / crossbow / dagger / spear
# ===================================================================
def sword_svg():
    body = (
        '<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#f5f5f5"/><stop offset="1" stop-color="#9aa0a8"/>'
        '</linearGradient></defs>'
        '<polygon points="32,4 38,42 32,50 26,42" fill="url(#b)" stroke="#3a3a40" stroke-width="1"/>'
        '<rect x="22" y="42" width="20" height="4" fill="#ffd740" stroke="#5a3a10"/>'
        '<rect x="30" y="46" width="4" height="12" fill="#7a4a20" stroke="#3a2010"/>'
        '<circle cx="32" cy="60" r="3" fill="#ffd740" stroke="#5a3a10"/>'
        '<circle cx="32" cy="60" r="1" fill="#fff"/>'
        '<line x1="32" y1="6" x2="32" y2="42" stroke="#fff" stroke-width="0.7"/>'
    )
    return svg_doc(body)


def bow_svg():
    body = (
        '<path d="M14 8 Q4 32 14 56" stroke="#5a8030" stroke-width="3" fill="none"/>'
        '<path d="M14 8 Q12 32 14 56" stroke="#3a6028" stroke-width="1.5" fill="none"/>'
        '<line x1="14" y1="8" x2="14" y2="56" stroke="#fff" stroke-width="0.5"/>'
        '<line x1="20" y1="32" x2="58" y2="32" stroke="#a07a40" stroke-width="2"/>'
        '<polygon points="58,28 62,32 58,36" fill="#cfd8dc"/>'
        '<polygon points="20,30 16,32 20,34" fill="#b71c1c"/>'
    )
    return svg_doc(body)


def staff_svg():
    body = (
        '<defs><radialGradient id="g" cx="0.5" cy="0.5">'
        '<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#7c4dff"/>'
        '</radialGradient></defs>'
        '<line x1="36" y1="14" x2="20" y2="56" stroke="#5a3a18" stroke-width="3"/>'
        '<rect x="34" y="14" width="3" height="42" transform="rotate(20,32,32)" fill="#7a5a3a"/>'
        '<circle cx="40" cy="14" r="9" fill="url(#g)" stroke="#5a3a90"/>'
        '<circle cx="40" cy="14" r="4" fill="#fff" opacity="0.7"/>'
        '<circle cx="38" cy="12" r="1.5" fill="#fff"/>'
        # sparkles
        '<circle cx="50" cy="8" r="1" fill="#fff"/>'
        '<circle cx="30" cy="10" r="0.8" fill="#fff"/>'
        '<circle cx="48" cy="20" r="0.8" fill="#fff"/>'
    )
    return svg_doc(body)


def crossbow_svg():
    body = (
        '<rect x="8" y="30" width="40" height="6" fill="#5a3a18"/>'
        '<rect x="8" y="36" width="14" height="6" fill="#3a2010"/>'
        '<path d="M4 22 Q32 18 60 22 L58 28 Q32 24 6 28 Z" fill="#7a4a20" stroke="#3a2010"/>'
        '<line x1="6" y1="24" x2="58" y2="24" stroke="#fff" stroke-width="0.6"/>'
        '<polygon points="48,28 56,32 48,36" fill="#ff5722"/>'
        '<rect x="12" y="40" width="6" height="10" fill="#3a2010"/>'
    )
    return svg_doc(body)


def dagger_svg():
    body = (
        '<polygon points="32,8 36,38 32,46 28,38" fill="#90a4ae" stroke="#3a3a40"/>'
        '<rect x="24" y="38" width="16" height="3" fill="#5a6068"/>'
        '<rect x="30" y="40" width="4" height="14" fill="#3a2010"/>'
        '<rect x="28" y="54" width="8" height="3" fill="#5a6068"/>'
        '<line x1="32" y1="10" x2="32" y2="38" stroke="#fff" stroke-width="0.5"/>'
    )
    return svg_doc(body)


def spear_svg():
    body = (
        '<line x1="6" y1="58" x2="50" y2="14" stroke="#7a4a20" stroke-width="3"/>'
        '<polygon points="46,14 60,4 56,18 50,16" fill="#ffeb3b" stroke="#a08a10"/>'
        '<polygon points="48,12 56,8 52,16" fill="#fff59d"/>'
        '<rect x="10" y="52" width="6" height="6" fill="#5a3010" transform="rotate(-45,12,55)"/>'
    )
    return svg_doc(body)


WEAPON_GENS = {
    "sword": sword_svg,
    "bow": bow_svg,
    "staff": staff_svg,
    "crossbow": crossbow_svg,
    "dagger": dagger_svg,
    "spear": spear_svg,
}


# ===================================================================
# UPGRADES — atk_up / spd_up / hp_up / hp_regen / range_up / cooldown
# / crit / magnet / shield / xp_bonus
# ===================================================================
def atk_up_svg():
    return svg_doc(
        '<polygon points="32,8 36,40 32,48 28,40" fill="#cfd8dc" stroke="#3a3a40"/>'
        '<rect x="22" y="40" width="20" height="4" fill="#ffd740"/>'
        '<rect x="30" y="44" width="4" height="10" fill="#7a4a20"/>'
        '<polygon points="44,12 56,12 50,4 46,8 50,8" fill="#4caf50"/>'
        '<rect x="48" y="12" width="2" height="14" fill="#4caf50"/>'
    )


def spd_up_svg():
    return svg_doc(
        '<polygon points="14,46 22,30 30,38 38,22 44,32 50,18 56,46" fill="#ff9800"/>'
        '<polygon points="14,46 56,46 56,54 14,54" fill="#5a3010"/>'
        '<rect x="6" y="42" width="10" height="2" fill="#90caf9"/>'
        '<rect x="2" y="46" width="10" height="2" fill="#90caf9"/>'
        '<rect x="6" y="50" width="8" height="2" fill="#90caf9"/>'
    )


def hp_up_svg():
    return svg_doc(
        '<path d="M32 54 L10 32 Q10 16 22 16 Q28 16 32 22 Q36 16 42 16 Q54 16 54 32 Z" '
        'fill="#e53935" stroke="#3a0a0a" stroke-width="1.5"/>'
        '<path d="M32 50 L14 32 Q14 20 22 20 Q28 20 32 28" fill="#ff7878" opacity="0.5"/>'
        '<polygon points="44,8 60,8 60,12 50,12 50,18 46,18 46,12 44,12" fill="#fff"/>'
        '<polygon points="46,4 50,4 50,16 46,16" fill="#4caf50"/>'
        '<polygon points="40,8 56,8 56,12 40,12" fill="#4caf50"/>'
    )


def hp_regen_svg():
    return svg_doc(
        '<path d="M32 50 L12 32 Q12 18 22 18 Q28 18 32 24 Q36 18 42 18 Q52 18 52 32 Z" '
        'fill="#4caf50" stroke="#1b5e20" stroke-width="1.5"/>'
        '<rect x="28" y="26" width="8" height="20" fill="#fff"/>'
        '<rect x="22" y="32" width="20" height="8" fill="#fff"/>'
    )


def range_up_svg():
    return svg_doc(
        '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2"/>'
        '<circle cx="32" cy="32" r="14" fill="none" stroke="#ff5722" stroke-width="2"/>'
        '<circle cx="32" cy="32" r="6" fill="#ff5722"/>'
        '<polygon points="32,8 30,12 34,12" fill="#fff"/>'
        '<polygon points="32,56 30,52 34,52" fill="#fff"/>'
        '<polygon points="8,32 12,30 12,34" fill="#fff"/>'
        '<polygon points="56,32 52,30 52,34" fill="#fff"/>'
    )


def cooldown_svg():
    return svg_doc(
        '<polygon points="36,4 16,32 28,32 22,60 50,28 38,28" fill="#ffeb3b" stroke="#5a4a10"/>'
        '<polygon points="36,8 22,30 30,30 26,52 44,30 36,30" fill="#fff59d"/>'
    )


def crit_svg():
    return svg_doc(
        '<polygon points="32,4 38,24 58,20 42,34 50,54 32,42 14,54 22,34 6,20 26,24" '
        'fill="#ff5252" stroke="#7a0a0a" stroke-width="1.5"/>'
        '<polygon points="32,18 36,28 46,30 38,34 40,46 32,38 24,46 26,34 18,30 28,28" '
        'fill="#ffeb3b"/>'
    )


def magnet_svg():
    return svg_doc(
        '<rect x="14" y="20" width="36" height="20" rx="4" fill="#7a3a3a" stroke="#3a0a0a"/>'
        '<rect x="14" y="20" width="10" height="20" fill="#ff5252"/>'
        '<rect x="40" y="20" width="10" height="20" fill="#ff5252"/>'
        '<rect x="14" y="36" width="36" height="4" fill="#dcdcdc"/>'
        '<rect x="14" y="40" width="10" height="14" fill="#7a3a3a"/>'
        '<rect x="40" y="40" width="10" height="14" fill="#7a3a3a"/>'
        '<text x="14" y="32" fill="#fff" font-size="9" font-weight="bold">N</text>'
        '<text x="44" y="32" fill="#fff" font-size="9" font-weight="bold">S</text>'
    )


def shield_svg():
    return svg_doc(
        '<path d="M32 6 L54 14 L54 30 Q54 50 32 58 Q10 50 10 30 L10 14 Z" '
        'fill="#1976d2" stroke="#0d47a1" stroke-width="2"/>'
        '<path d="M32 12 L48 18 L48 30 Q48 46 32 52 Q16 46 16 30 L16 18 Z" '
        'fill="#42a5f5" opacity="0.7"/>'
        '<polygon points="32,18 36,28 46,28 38,34 42,44 32,38 22,44 26,34 18,28 28,28" '
        'fill="#fff"/>'
    )


def xp_bonus_svg():
    return svg_doc(
        '<path d="M10 16 Q10 12 14 12 L50 12 Q54 12 54 16 L54 50 L14 50 Q10 50 10 46 Z" '
        'fill="#1976d2" stroke="#0d47a1" stroke-width="1.5"/>'
        '<rect x="14" y="16" width="36" height="2" fill="#fff"/>'
        '<rect x="14" y="22" width="32" height="1.5" fill="#fff"/>'
        '<rect x="14" y="26" width="34" height="1.5" fill="#fff"/>'
        '<rect x="14" y="30" width="28" height="1.5" fill="#fff"/>'
        '<polygon points="48,40 51,48 60,48 53,53 56,62 48,56 40,62 43,53 36,48 45,48" '
        'fill="#ffd740" stroke="#5a3a10"/>'
    )


UPGRADE_GENS = {
    "atk_up": atk_up_svg,
    "spd_up": spd_up_svg,
    "hp_up": hp_up_svg,
    "hp_regen": hp_regen_svg,
    "range_up": range_up_svg,
    "cooldown": cooldown_svg,
    "crit": crit_svg,
    "magnet": magnet_svg,
    "shield": shield_svg,
    "xp_bonus": xp_bonus_svg,
}


# ===================================================================
# RESOURCES — wood / food / stone / gold / gems / energy
# ===================================================================
def wood_svg():
    return svg_doc(
        '<ellipse cx="32" cy="32" rx="26" ry="14" fill="#7a4a20" stroke="#3a2010" stroke-width="1.5"/>'
        '<ellipse cx="32" cy="32" rx="8" ry="6" fill="#a07050"/>'
        '<circle cx="32" cy="32" r="3" fill="#5a3010"/>'
        '<line x1="6" y1="32" x2="58" y2="32" stroke="#3a2010" stroke-width="0.7" opacity="0.5"/>'
        '<line x1="6" y1="26" x2="58" y2="26" stroke="#5a3010" stroke-width="0.5" opacity="0.4"/>'
        '<line x1="6" y1="38" x2="58" y2="38" stroke="#5a3010" stroke-width="0.5" opacity="0.4"/>'
    )


def food_svg():
    return svg_doc(
        '<polygon points="32,4 36,8 34,12 38,14 36,18 40,22 38,28 34,30 36,36 32,38 '
        '28,36 30,30 26,28 24,22 28,18 26,14 30,12 28,8" fill="#ffd740" stroke="#a08a10"/>'
        '<line x1="32" y1="4" x2="32" y2="58" stroke="#7a5a10" stroke-width="2"/>'
        '<polygon points="32,40 24,52 32,48" fill="#ffd740"/>'
        '<polygon points="32,40 40,52 32,48" fill="#ffd740"/>'
    )


def stone_svg():
    return svg_doc(
        '<polygon points="14,40 20,16 38,12 52,22 56,40 46,56 24,56 12,46" '
        'fill="#9aa0a8" stroke="#3a3a40" stroke-width="1.5"/>'
        '<polygon points="20,30 32,18 40,28 36,38 26,38" fill="#cfd8dc"/>'
        '<polygon points="40,42 50,38 50,50" fill="#7a8088"/>'
        '<line x1="22" y1="46" x2="34" y2="46" stroke="#5a6068"/>'
    )


def gold_svg():
    return svg_doc(
        '<defs><radialGradient id="gld" cx="0.4" cy="0.4">'
        '<stop offset="0" stop-color="#fff5b0"/><stop offset="1" stop-color="#a07a10"/>'
        '</radialGradient></defs>'
        '<circle cx="32" cy="32" r="24" fill="url(#gld)" stroke="#5a3a10" stroke-width="2"/>'
        '<circle cx="32" cy="32" r="18" fill="none" stroke="#5a3a10" stroke-width="1"/>'
        '<text x="32" y="40" fill="#5a3a10" font-size="22" font-weight="bold" '
        'font-family="serif" text-anchor="middle">$</text>'
    )


def gems_svg():
    return svg_doc(
        '<polygon points="32,6 50,22 32,58 14,22" fill="#26c6da" stroke="#006064" stroke-width="1.5"/>'
        '<polygon points="32,6 50,22 38,22 32,12" fill="#80deea"/>'
        '<polygon points="14,22 32,12 32,22" fill="#4dd0e1"/>'
        '<polygon points="32,22 38,22 32,40" fill="#fff" opacity="0.5"/>'
        '<polygon points="14,22 26,22 32,58" fill="#0097a7"/>'
    )


def energy_svg():
    return svg_doc(
        '<polygon points="36,4 16,32 28,32 24,60 50,28 38,28 44,4" '
        'fill="#ffeb3b" stroke="#a08a10" stroke-width="1.5"/>'
        '<polygon points="36,8 22,30 32,30 28,46 44,30 36,30" fill="#fff59d"/>'
    )


RESOURCE_GENS = {
    "wood": wood_svg,
    "food": food_svg,
    "stone": stone_svg,
    "gold": gold_svg,
    "gems": gems_svg,
    "energy": energy_svg,
}


# ===================================================================
# CIVILIZATIONS — china / europe / america / russia / korea / arabia / japan
# ===================================================================
def china_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#7a1010"/>'
        '<polygon points="6,46 58,46 50,30 14,30" fill="#b71c1c" stroke="#3a0a0a" stroke-width="1.5"/>'
        '<polygon points="14,30 50,30 32,12" fill="#ffd740" stroke="#7a5a10"/>'
        '<polygon points="14,30 50,30 32,18" fill="#a08a10"/>'
        '<rect x="22" y="38" width="6" height="8" fill="#7a1010"/>'
        '<rect x="36" y="38" width="6" height="8" fill="#7a1010"/>'
        '<rect x="29" y="36" width="6" height="10" fill="#5a0a0a"/>'
        '<rect x="6" y="46" width="52" height="2" fill="#3a0a0a"/>',
    )


def europe_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#1a3a5a"/>'
        '<rect x="10" y="32" width="44" height="22" fill="#9aa0a8"/>'
        + ''.join(f'<rect x="{10 + i * 6}" y="28" width="4" height="4" fill="#9aa0a8"/>'
                  for i in range(8))
        + '<rect x="22" y="20" width="8" height="14" fill="#9aa0a8"/>'
        + '<rect x="34" y="14" width="10" height="20" fill="#9aa0a8"/>'
        + '<polygon points="34,14 44,14 39,4" fill="#b71c1c"/>'
        + '<rect x="38" y="20" width="2" height="6" fill="#1a1a2e"/>'
        + '<rect x="26" y="40" width="6" height="14" fill="#3a3a40"/>'
    )


def america_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#0a3a5a"/>'
        # statue of liberty silhouette
        '<rect x="28" y="44" width="8" height="14" fill="#1a8a6a"/>'
        '<polygon points="22,44 42,44 32,38" fill="#1a8a6a"/>'
        '<rect x="29" y="22" width="6" height="18" fill="#1a8a6a"/>'
        # crown
        '<polygon points="22,22 42,22 40,12 36,16 34,8 32,14 30,8 28,16 24,12" '
        'fill="#1a8a6a" stroke="#0a4a3a"/>'
        # torch
        '<rect x="42" y="14" width="2" height="14" fill="#1a8a6a"/>'
        '<polygon points="42,14 48,4 44,14" fill="#ffeb3b"/>'
        # base
        '<rect x="14" y="56" width="36" height="4" fill="#7a4a20"/>'
    )


def russia_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#1a1a3a"/>'
        # onion domes
        '<path d="M14 36 Q14 22 20 22 Q26 22 26 36 Q22 38 20 38 Q18 38 14 36" '
        'fill="#b71c1c" stroke="#3a0a0a" stroke-width="1.5"/>'
        '<rect x="14" y="36" width="12" height="14" fill="#dcdcdc" stroke="#5a5a60"/>'
        '<path d="M28 32 Q28 14 32 14 Q36 14 36 32 Q34 36 32 36 Q30 36 28 32" '
        'fill="#ffd740" stroke="#5a3a10" stroke-width="1.5"/>'
        '<rect x="28" y="32" width="8" height="20" fill="#dcdcdc" stroke="#5a5a60"/>'
        '<path d="M38 36 Q38 22 44 22 Q50 22 50 36 Q46 38 44 38 Q42 38 38 36" '
        'fill="#1976d2" stroke="#0d47a1" stroke-width="1.5"/>'
        '<rect x="38" y="36" width="12" height="14" fill="#dcdcdc" stroke="#5a5a60"/>'
        # crosses
        '<rect x="19" y="14" width="2" height="10" fill="#ffd740"/>'
        '<rect x="33" y="6" width="2" height="10" fill="#ffd740"/>'
        '<rect x="43" y="14" width="2" height="10" fill="#ffd740"/>'
        '<rect x="0" y="50" width="64" height="6" fill="#3a3a4a"/>'
    )


def korea_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#fff"/>'
        # taegeuk
        '<circle cx="32" cy="32" r="22" fill="none" stroke="#000" stroke-width="2"/>'
        '<path d="M32 10 A22 22 0 0 1 32 54 A11 11 0 0 1 32 32 A11 11 0 0 0 32 10" fill="#0044cc"/>'
        '<path d="M32 54 A22 22 0 0 1 32 10 A11 11 0 0 1 32 32 A11 11 0 0 0 32 54" fill="#cc0000"/>'
        # trigrams
        '<rect x="3" y="14" width="6" height="1.5" fill="#000"/>'
        '<rect x="3" y="17" width="6" height="1.5" fill="#000"/>'
        '<rect x="3" y="20" width="6" height="1.5" fill="#000"/>'
        '<rect x="55" y="14" width="6" height="1.5" fill="#000"/>'
        '<rect x="55" y="17" width="2" height="1.5" fill="#000"/>'
        '<rect x="59" y="17" width="2" height="1.5" fill="#000"/>'
        '<rect x="55" y="20" width="6" height="1.5" fill="#000"/>'
    )


def arabia_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#0d6a3a"/>'
        # mosque
        '<rect x="20" y="32" width="24" height="22" fill="#fff5e0"/>'
        '<path d="M14 34 Q14 22 32 18 Q50 22 50 34 Z" fill="#fff5e0"/>'
        '<circle cx="32" cy="22" r="6" fill="#fff5e0"/>'
        '<rect x="31" y="10" width="2" height="6" fill="#ffd740"/>'
        '<polygon points="32,10 38,12 32,14" fill="#ffd740"/>'
        # minarets
        '<rect x="8" y="28" width="4" height="26" fill="#fff5e0"/>'
        '<polygon points="6,28 14,28 10,18" fill="#ffd740"/>'
        '<rect x="52" y="28" width="4" height="26" fill="#fff5e0"/>'
        '<polygon points="50,28 58,28 54,18" fill="#ffd740"/>'
        # arch door
        '<path d="M28 54 L28 44 Q32 38 36 44 L36 54 Z" fill="#3a2010"/>'
    )


def japan_svg():
    return svg_doc(
        '<rect width="64" height="64" rx="10" fill="#7a1010"/>'
        # torii gate
        '<rect x="6" y="14" width="52" height="6" fill="#cc1010" stroke="#3a0a0a"/>'
        '<polygon points="2,14 62,14 56,8 8,8" fill="#cc1010" stroke="#3a0a0a"/>'
        '<rect x="14" y="20" width="6" height="36" fill="#cc1010" stroke="#3a0a0a"/>'
        '<rect x="44" y="20" width="6" height="36" fill="#cc1010" stroke="#3a0a0a"/>'
        '<rect x="6" y="22" width="52" height="3" fill="#cc1010" stroke="#3a0a0a"/>'
        '<rect x="0" y="56" width="64" height="6" fill="#3a3010"/>'
    )


CIV_GENS = {
    "china": china_svg,
    "europe": europe_svg,
    "america": america_svg,
    "russia": russia_svg,
    "korea": korea_svg,
    "arabia": arabia_svg,
    "japan": japan_svg,
}


# ===================================================================
# SHOP ITEMS — packs / speedup / energy_refill / exp_book / scroll
# ===================================================================
def make_pack_svg(label_color: str, accent: str):
    """Cardboard pack with colored label."""
    return svg_doc(
        '<rect x="6" y="14" width="52" height="40" fill="#a06c40" stroke="#5a3010" stroke-width="2"/>'
        '<rect x="6" y="14" width="52" height="6" fill="#7a4a20"/>'
        '<line x1="32" y1="14" x2="32" y2="54" stroke="#5a3010" stroke-width="1"/>'
        f'<rect x="14" y="26" width="36" height="20" fill="{label_color}" stroke="#3a2010"/>'
        f'<text x="32" y="40" fill="#fff" font-size="14" font-weight="bold" '
        f'text-anchor="middle">{accent}</text>'
    )


def speedup_svg():
    return svg_doc(
        '<circle cx="32" cy="32" r="22" fill="#1a2a4a" stroke="#0a1a2a" stroke-width="2"/>'
        '<circle cx="32" cy="32" r="18" fill="#fff"/>'
        '<polygon points="32,32 32,16 46,32" fill="#1a2a4a"/>'
        '<polygon points="32,32 22,42 32,42" fill="#1a2a4a"/>'
        '<polygon points="44,18 60,12 56,28" fill="#ffeb3b" stroke="#5a4a10"/>'
    )


def energy_refill_svg():
    return svg_doc(
        '<rect x="20" y="14" width="24" height="40" rx="4" fill="#1a2a4a" stroke="#0a1a2a" stroke-width="2"/>'
        '<rect x="26" y="10" width="12" height="6" fill="#1a2a4a"/>'
        '<rect x="22" y="42" width="20" height="10" fill="#ffeb3b"/>'
        '<rect x="22" y="36" width="20" height="6" fill="#ff9800"/>'
        '<rect x="22" y="30" width="20" height="6" fill="#4caf50"/>'
        '<polygon points="36,18 28,32 36,32 30,46 42,28 34,28" fill="#fff"/>'
    )


def exp_book_svg(color: str):
    return svg_doc(
        f'<rect x="10" y="10" width="44" height="50" rx="2" fill="{color}" stroke="#3a0a0a" stroke-width="1.5"/>'
        f'<rect x="10" y="10" width="6" height="50" fill="#7a0a0a"/>'
        '<rect x="20" y="18" width="28" height="2" fill="#ffd740"/>'
        '<rect x="20" y="24" width="22" height="1" fill="#fff" opacity="0.5"/>'
        '<rect x="20" y="28" width="26" height="1" fill="#fff" opacity="0.5"/>'
        '<rect x="20" y="32" width="20" height="1" fill="#fff" opacity="0.5"/>'
        '<polygon points="46,40 50,48 58,48 51,53 54,62 46,57 38,62 41,53 34,48 42,48" '
        'fill="#ffd740" stroke="#5a3a10"/>'
    )


def summon_scroll_svg():
    return svg_doc(
        '<rect x="6" y="20" width="52" height="24" fill="#fff5d0" stroke="#7a5a10" stroke-width="1.5"/>'
        '<rect x="2" y="16" width="8" height="32" rx="3" fill="#a07a40" stroke="#5a3a10"/>'
        '<rect x="54" y="16" width="8" height="32" rx="3" fill="#a07a40" stroke="#5a3a10"/>'
        '<rect x="14" y="26" width="32" height="1.5" fill="#3a2010"/>'
        '<rect x="14" y="30" width="28" height="1.5" fill="#3a2010"/>'
        '<rect x="14" y="34" width="32" height="1.5" fill="#3a2010"/>'
        '<rect x="14" y="38" width="22" height="1.5" fill="#3a2010"/>'
        '<polygon points="40,40 48,42 50,50 42,48" fill="#b71c1c"/>'
    )


SHOP_GENS = {
    "wood_pack": lambda: make_pack_svg("#5a3a10", "🪵".replace("🪵", "Ｗ")),
    "food_pack": lambda: make_pack_svg("#5a4a10", "Ｆ"),
    "stone_pack": lambda: make_pack_svg("#3a3a40", "Ｓ"),
    "speed_1m": speedup_svg,
    "speed_10m": speedup_svg,
    "energy_refill": energy_refill_svg,
    "exp_book_s": lambda: exp_book_svg("#b71c1c"),
    "exp_book_l": lambda: exp_book_svg("#1b5e20"),
    "summon_scroll": summon_scroll_svg,
}


# ===================================================================
# Navigation icons — city / hero / battle / research / shop / menu
# Provided in two states: gray (idle) and gold (active).
# ===================================================================
def nav_icon(name: str, color: str) -> str:
    if name == "city":
        path = (
            f'<path d="M8 54 V30 L20 22 V30 L32 18 L44 30 V22 L56 30 V54 Z" '
            f'fill="{color}"/>'
            f'<rect x="28" y="40" width="8" height="14" fill="#1a1a2e"/>'
            f'<rect x="14" y="36" width="6" height="6" fill="#1a1a2e"/>'
            f'<rect x="44" y="36" width="6" height="6" fill="#1a1a2e"/>'
        )
    elif name == "hero":
        path = (
            f'<circle cx="32" cy="20" r="10" fill="{color}"/>'
            f'<path d="M14 56 Q14 36 32 36 Q50 36 50 56 Z" fill="{color}"/>'
        )
    elif name == "battle":
        path = (
            f'<line x1="14" y1="14" x2="50" y2="50" stroke="{color}" stroke-width="6" stroke-linecap="round"/>'
            f'<line x1="50" y1="14" x2="14" y2="50" stroke="{color}" stroke-width="6" stroke-linecap="round"/>'
            f'<rect x="40" y="6" width="14" height="6" fill="{color}" transform="rotate(45,47,9)"/>'
            f'<rect x="10" y="6" width="14" height="6" fill="{color}" transform="rotate(-45,17,9)"/>'
        )
    elif name == "shop":
        path = (
            f'<path d="M14 22 H50 L46 50 H18 Z" fill="{color}"/>'
            f'<path d="M22 22 V14 Q22 10 26 10 H38 Q42 10 42 14 V22" '
            f'fill="none" stroke="{color}" stroke-width="3"/>'
        )
    elif name == "research":
        path = (
            f'<circle cx="30" cy="30" r="15" fill="none" stroke="{color}" stroke-width="6"/>'
            f'<path d="M41 41 L54 54" stroke="{color}" stroke-width="6" stroke-linecap="round"/>'
            f'<path d="M22 31 L28 37 L40 22" fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="48" cy="16" r="4" fill="{color}"/>'
            f'<path d="M48 20 V27" stroke="{color}" stroke-width="3" stroke-linecap="round"/>'
        )
    elif name == "menu":
        path = (
            f'<rect x="12" y="14" width="40" height="6" rx="2" fill="{color}"/>'
            f'<rect x="12" y="28" width="40" height="6" rx="2" fill="{color}"/>'
            f'<rect x="12" y="42" width="40" height="6" rx="2" fill="{color}"/>'
        )
    else:
        path = ""
    return svg_doc(path)


NAV_NAMES = ["city", "hero", "battle", "research", "shop", "menu"]
NAV_GRAY = "#9aa0a8"
NAV_GOLD = "#ffd740"


# ===================================================================
# TECH icons — m1..m4 (military), e1..e4 (economy), s1..s4 (survival)
# ===================================================================
def tech_svg(branch: str, idx: int) -> str:
    color_map = {
        "m": ("#b71c1c", "#7a0a0a"),
        "e": ("#1b5e20", "#0a3a10"),
        "s": ("#7c4dff", "#3a1a7a"),
    }
    fill, stroke = color_map[branch]
    glyphs = {
        "m1": '<polygon points="32,8 36,40 32,46 28,40" fill="#fff"/>',
        "m2": '<path d="M32 10 L48 18 V32 Q48 46 32 54 Q16 46 16 32 V18 Z" fill="#fff"/>',
        "m3": '<polygon points="14,40 28,30 22,30 36,16 54,16 40,28 46,28 32,46" fill="#fff"/>',
        "m4": '<rect x="20" y="20" width="24" height="24" fill="#fff"/>'
              '<line x1="14" y1="32" x2="50" y2="32" stroke="#b71c1c" stroke-width="3"/>'
              '<line x1="32" y1="14" x2="32" y2="50" stroke="#b71c1c" stroke-width="3"/>',
        "e1": '<polygon points="32,12 36,40 28,40" fill="#fff"/>'
              '<polygon points="22,18 32,14 42,18 38,28 26,28" fill="#fff"/>',
        "e2": '<polygon points="20,16 44,16 32,4" fill="#fff"/>'
              '<polygon points="14,28 50,28 38,16 26,16" fill="#fff"/>'
              '<rect x="28" y="40" width="8" height="14" fill="#fff"/>',
        "e3": '<polygon points="14,40 22,20 38,16 50,28 50,44 30,52" fill="#fff"/>',
        "e4": '<circle cx="32" cy="32" r="14" fill="#fff"/>'
              '<text x="32" y="40" fill="#1b5e20" font-size="18" '
              'font-weight="bold" text-anchor="middle">$</text>',
        "s1": '<path d="M32 14 Q42 14 42 24 L42 38 Q42 50 32 54 Q22 50 22 38 L22 24 Q22 14 32 14" '
              'fill="#fff"/>'
              '<rect x="30" y="22" width="4" height="20" fill="#7c4dff"/>'
              '<rect x="22" y="30" width="20" height="4" fill="#7c4dff"/>',
        "s2": '<rect x="14" y="20" width="36" height="30" rx="2" fill="#fff"/>'
              '<rect x="22" y="14" width="20" height="6" fill="#fff"/>'
              '<polygon points="28,30 32,38 36,30" fill="#7c4dff"/>',
        "s3": '<polygon points="32,4 38,28 32,46 26,28" fill="#fff"/>'
              '<polygon points="32,46 28,58 36,58" fill="#fff"/>',
        "s4": '<circle cx="32" cy="32" r="20" fill="#fff" stroke="#7c4dff" stroke-width="2"/>'
              '<line x1="32" y1="12" x2="32" y2="52" stroke="#7c4dff" stroke-width="2"/>'
              '<line x1="12" y1="32" x2="52" y2="32" stroke="#7c4dff" stroke-width="2"/>'
              '<line x1="18" y1="18" x2="46" y2="46" stroke="#7c4dff" stroke-width="1"/>'
              '<line x1="46" y1="18" x2="18" y2="46" stroke="#7c4dff" stroke-width="1"/>'
              '<polygon points="32,8 30,12 34,12" fill="#7c4dff"/>',
    }
    key = f"{branch}{idx}"
    glyph = glyphs.get(key, "")
    return svg_doc(
        f'<rect width="64" height="64" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        + glyph
    )


# ===================================================================
# ACHIEVEMENT icons (mapped by id)
# ===================================================================
ACH_GLYPHS = {
    "first_build":     '<rect x="14" y="22" width="36" height="32" fill="#a07050"/>'
                       '<polygon points="12,22 52,22 32,8" fill="#5a3a10"/>'
                       '<rect x="28" y="36" width="8" height="18" fill="#3a2010"/>',
    "first_battle":    '<line x1="12" y1="14" x2="46" y2="48" stroke="#cfd8dc" stroke-width="6" stroke-linecap="round"/>'
                       '<line x1="46" y1="14" x2="12" y2="48" stroke="#cfd8dc" stroke-width="6" stroke-linecap="round"/>',
    "boss_slayer_10":  '<polygon points="32,4 56,16 56,40 32,60 8,40 8,16" fill="#7a1010"/>'
                       '<text x="32" y="40" fill="#ffd740" font-size="20" '
                       'text-anchor="middle" font-weight="bold">10</text>',
    "boss_slayer_100": '<polygon points="32,4 60,18 60,42 32,60 4,42 4,18" fill="#3a0a0a" stroke="#ffd740" stroke-width="2"/>'
                       '<text x="32" y="38" fill="#ffd740" font-size="14" '
                       'text-anchor="middle" font-weight="bold">100</text>',
    "castle_10":       '<rect x="6" y="30" width="52" height="28" fill="#a07050"/>'
                       '<rect x="20" y="14" width="24" height="22" fill="#a07050"/>'
                       '<polygon points="18,14 46,14 32,4" fill="#b71c1c"/>'
                       '<text x="32" y="48" fill="#ffd740" font-size="14" '
                       'text-anchor="middle" font-weight="bold">10</text>',
    "hero_legendary":  '<polygon points="32,4 38,24 58,20 42,34 50,54 32,42 14,54 22,34 6,20 26,24" '
                       'fill="#ff9800" stroke="#5a3a00" stroke-width="2"/>',
    "heroes_10":       '<circle cx="20" cy="22" r="8" fill="#9aa0a8"/>'
                       '<circle cx="32" cy="20" r="8" fill="#1976d2"/>'
                       '<circle cx="44" cy="22" r="8" fill="#7c4dff"/>'
                       '<rect x="8" y="36" width="48" height="20" rx="6" fill="#3a3a40"/>',
    "stage_10":        '<polygon points="20,8 44,8 56,32 32,56 8,32" fill="#1976d2" stroke="#0d47a1" stroke-width="2"/>'
                       '<text x="32" y="40" fill="#fff" font-size="18" '
                       'text-anchor="middle" font-weight="bold">10</text>',
    "stage_20":        '<polygon points="20,4 44,4 60,32 32,60 4,32" fill="#7c4dff" stroke="#3a1a7a" stroke-width="2"/>'
                       '<text x="32" y="40" fill="#fff" font-size="16" '
                       'text-anchor="middle" font-weight="bold">20</text>',
}


# ===================================================================
# DAILY task icons (mapped by id)
# ===================================================================
DAILY_GLYPHS = {
    "dt1": '<line x1="14" y1="14" x2="46" y2="46" stroke="#cfd8dc" stroke-width="6"/>'
           '<line x1="46" y1="14" x2="14" y2="46" stroke="#cfd8dc" stroke-width="6"/>',
    "dt2": '<rect x="6" y="40" width="52" height="14" fill="#7a4a20"/>'
           '<polygon points="20,40 28,28 36,36 44,24 50,40" fill="#ffd740"/>'
           '<rect x="28" y="20" width="8" height="20" fill="#7a5a3a"/>',
    "dt3": '<polygon points="8,52 32,32 56,52" fill="#7a4a20"/>'
           '<rect x="20" y="40" width="24" height="14" fill="#a07050"/>'
           '<rect x="28" y="44" width="8" height="10" fill="#3a2010"/>',
    "dt4": '<circle cx="32" cy="22" r="10" fill="#9aa0a8"/>'
           '<rect x="20" y="34" width="24" height="22" rx="6" fill="#1976d2"/>'
           '<polygon points="32,4 34,12 30,12" fill="#ffd740"/>',
}


# ===================================================================
# Rarity glow effect (4 frames simulated with gradient circles)
# ===================================================================
def rarity_svg(color: str):
    return svg_doc(
        f'<defs><radialGradient id="rg"><stop offset="0" stop-color="{color}" stop-opacity="0.9"/>'
        f'<stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient></defs>'
        '<circle cx="32" cy="32" r="30" fill="url(#rg)"/>'
        f'<circle cx="32" cy="32" r="20" fill="none" stroke="{color}" stroke-width="1.5" opacity="0.7"/>',
        vb=64,
    )


def main():
    print("Generating SVG icons")

    # Buildings ×4 tiers each
    for key, gen in BUILDING_GENS.items():
        for tier in (1, 2, 3, 4):
            write("buildings", f"{key}_t{tier}.svg", gen(tier))

    # Weapons
    for k, gen in WEAPON_GENS.items():
        write("weapons", f"{k}.svg", gen())

    # Upgrades
    for k, gen in UPGRADE_GENS.items():
        write("upgrades", f"{k}.svg", gen())

    # Resources
    for k, gen in RESOURCE_GENS.items():
        write("resources", f"{k}.svg", gen())

    # Civilizations
    for k, gen in CIV_GENS.items():
        write("civilizations", f"{k}.svg", gen())

    # Shop items
    for k, gen in SHOP_GENS.items():
        write("shop", f"{k}.svg", gen())

    # Nav (gray + gold)
    for n in NAV_NAMES:
        write("nav", f"{n}_idle.svg", nav_icon(n, NAV_GRAY))
        write("nav", f"{n}_active.svg", nav_icon(n, NAV_GOLD))

    # Tech
    for branch in ("m", "e", "s"):
        for i in range(1, 5):
            write("tech", f"{branch}{i}.svg", tech_svg(branch, i))

    # Achievements
    for ach_id, glyph in ACH_GLYPHS.items():
        write("ach", f"{ach_id}.svg",
              svg_doc('<rect width="64" height="64" rx="10" fill="#2a2a3e" stroke="#ffd740" stroke-width="2"/>'
                      + glyph))

    # Daily tasks
    for task_id, glyph in DAILY_GLYPHS.items():
        write("ach", f"{task_id}.svg",
              svg_doc('<rect width="64" height="64" rx="10" fill="#2a3a4a" stroke="#4fc3f7" stroke-width="2"/>'
                      + glyph))

    # Rarity glows
    for k, c in [("normal", "#9e9e9e"),
                 ("rare", "#2196f3"),
                 ("epic", "#9c27b0"),
                 ("legendary", "#ff9800")]:
        write("rarity", f"{k}.svg", rarity_svg(c))

    print("Done.")


if __name__ == "__main__":
    main()
