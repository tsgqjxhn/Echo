"""Generate stylized SVG portraits (128x128) for the 16 hero templates.

Each portrait is a circular framed bust with a rarity-colored ring.
The art is intentionally simple iconography per hero — geometric, fantasy.
"""
from __future__ import annotations

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "images" / "heroes"
OUT.mkdir(parents=True, exist_ok=True)


# rarity → ring color, glow color
RARITY_COLOR = {
    "normal":    ("#9e9e9e", "#cfd8dc"),
    "rare":      ("#2196f3", "#90caf9"),
    "epic":      ("#9c27b0", "#ce93d8"),
    "legendary": ("#ff9800", "#ffd54f"),
}


def portrait(hero_id: str, rarity: str, body: str) -> str:
    ring, glow = RARITY_COLOR[rarity]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
        f'<defs>'
        f'  <radialGradient id="bg-{hero_id}" cx="0.5" cy="0.4">'
        f'    <stop offset="0" stop-color="{glow}" stop-opacity="0.4"/>'
        f'    <stop offset="1" stop-color="#1a1a2e"/>'
        f'  </radialGradient>'
        f'  <clipPath id="clip-{hero_id}"><circle cx="64" cy="64" r="58"/></clipPath>'
        f'</defs>'
        f'<circle cx="64" cy="64" r="62" fill="{ring}"/>'
        f'<circle cx="64" cy="64" r="58" fill="url(#bg-{hero_id})"/>'
        f'<g clip-path="url(#clip-{hero_id})">{body}</g>'
        f'<circle cx="64" cy="64" r="58" fill="none" stroke="{ring}" stroke-width="4"/>'
        + (
            f'<circle cx="64" cy="64" r="62" fill="none" stroke="{glow}" '
            f'stroke-width="1.5" opacity="0.7"/>'
            if rarity == "legendary" else ""
        ) +
        '</svg>'
    )


# ---- helpers for body parts ----
def head_oval(skin="#f4d6b0", hair="#3a2010", crown=None):
    parts = (
        f'<circle cx="64" cy="56" r="22" fill="{skin}" stroke="#3a2010" stroke-width="1.5"/>'
        f'<path d="M44 50 Q44 34 64 32 Q84 34 84 50" fill="{hair}"/>'
        f'<rect x="58" y="60" width="4" height="3" fill="#3a2010"/>'
        f'<rect x="66" y="60" width="4" height="3" fill="#3a2010"/>'
        f'<path d="M58 70 Q64 73 70 70" fill="none" stroke="#3a2010" stroke-width="1.5"/>'
    )
    if crown:
        parts += crown
    return parts


def torso(color: str, accent="#ffd740"):
    return (
        f'<path d="M28 130 Q28 90 64 88 Q100 90 100 130 Z" fill="{color}" stroke="#3a2010" stroke-width="1.5"/>'
        f'<rect x="60" y="88" width="8" height="36" fill="{accent}"/>'
    )


# ---- 16 hero portraits ----
def arthur():  # Legendary commander
    crown = (
        '<path d="M44 30 L52 20 L58 28 L64 18 L70 28 L76 20 L84 30 Z" '
        'fill="#ffd740" stroke="#a08a10" stroke-width="1.5"/>'
        '<circle cx="64" cy="22" r="2.5" fill="#b71c1c"/>'
        '<circle cx="50" cy="26" r="1.5" fill="#1976d2"/>'
        '<circle cx="78" cy="26" r="1.5" fill="#1976d2"/>'
    )
    body = head_oval(skin="#f4d6b0", hair="#a07050", crown=crown)
    body += torso("#1976d2")
    # cape
    body += '<path d="M30 90 Q30 130 28 130 L20 130 Q14 110 22 92 Z" fill="#b71c1c"/>'
    body += '<path d="M98 90 Q98 130 100 130 L108 130 Q114 110 106 92 Z" fill="#b71c1c"/>'
    return portrait("arthur", "legendary", body)


def caesar():  # Legendary commander, laurel wreath
    laurel = (
        '<path d="M40 38 Q44 24 56 26" fill="none" stroke="#4caf50" stroke-width="3"/>'
        '<path d="M88 38 Q84 24 72 26" fill="none" stroke="#4caf50" stroke-width="3"/>'
        '<circle cx="46" cy="30" r="2" fill="#4caf50"/>'
        '<circle cx="56" cy="28" r="2" fill="#4caf50"/>'
        '<circle cx="82" cy="30" r="2" fill="#4caf50"/>'
        '<circle cx="72" cy="28" r="2" fill="#4caf50"/>'
    )
    body = head_oval(skin="#f4d6b0", hair="#5a3010", crown=laurel)
    body += torso("#b71c1c", accent="#ffd740")
    return portrait("caesar", "legendary", body)


def genghis():  # Legendary ranger, fur hat
    hat = (
        '<path d="M40 34 Q40 18 64 16 Q88 18 88 34 Z" fill="#5a3010" stroke="#3a1a08"/>'
        '<rect x="40" y="32" width="48" height="6" fill="#7a4a20"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#d4a070" stroke="#3a2010" stroke-width="1.5"/>'
        + hat +
        '<rect x="58" y="62" width="4" height="3" fill="#1a1a2e"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#1a1a2e"/>'
        '<path d="M56 72 Q64 76 72 72" fill="none" stroke="#3a2010" stroke-width="1.5"/>'
        # mustache
        '<path d="M52 70 Q60 72 64 70 Q68 72 76 70" fill="none" stroke="#3a1a08" stroke-width="2"/>'
    )
    body += torso("#5a3010", accent="#a07050")
    return portrait("genghis", "legendary", body)


def charles():  # Legendary defender
    helm = (
        '<path d="M40 50 Q40 26 64 24 Q88 26 88 50" fill="#9aa0a8" stroke="#3a3a40"/>'
        '<rect x="40" y="46" width="48" height="6" fill="#cfd8dc"/>'
        '<rect x="60" y="20" width="8" height="10" fill="#b71c1c"/>'
    )
    body = (
        f'<circle cx="64" cy="56" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + helm +
        '<rect x="58" y="60" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="60" width="4" height="3" fill="#3a2010"/>'
        '<path d="M50 50 H78" stroke="#cfd8dc" stroke-width="2"/>'
        '<path d="M58 70 Q64 72 70 70" fill="none" stroke="#3a2010" stroke-width="1.5"/>'
    )
    body += torso("#3a3a40", accent="#cfd8dc")
    # shield
    body += ('<path d="M14 100 Q14 88 26 88 Q38 88 38 100 V112 Q26 124 26 124 Q14 112 14 100" '
             'fill="#1976d2" stroke="#0d47a1" stroke-width="2"/>'
             '<polygon points="22,100 30,100 26,108" fill="#ffd740"/>')
    return portrait("charles", "legendary", body)


def lincoln():  # Epic support
    hat = (
        '<rect x="42" y="22" width="44" height="14" fill="#1a1a2e" stroke="#000"/>'
        '<rect x="34" y="34" width="60" height="4" fill="#1a1a2e"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + hat +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        # beard
        '<path d="M44 70 Q64 90 84 70 Q80 80 64 84 Q48 80 44 70" fill="#3a2010"/>'
    )
    body += torso("#3a3a4a", accent="#ffd740")
    return portrait("lincoln", "epic", body)


def washington():  # Epic commander
    wig = (
        '<path d="M40 40 Q40 26 64 24 Q88 26 88 40" fill="#fff" stroke="#9aa0a8"/>'
        '<circle cx="44" cy="48" r="6" fill="#fff"/>'
        '<circle cx="84" cy="48" r="6" fill="#fff"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + wig +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
    )
    body += torso("#1a3a5a", accent="#ffd740")
    return portrait("washington", "epic", body)


def joan():  # Epic support
    helm = (
        '<path d="M44 50 Q44 28 64 26 Q84 28 84 50" fill="#dcdcdc" stroke="#5a5a60"/>'
        '<rect x="60" y="22" width="8" height="6" fill="#dcdcdc"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + helm +
        '<rect x="58" y="64" width="4" height="3" fill="#1976d2"/>'
        '<rect x="66" y="64" width="4" height="3" fill="#1976d2"/>'
        '<path d="M58 72 Q64 74 70 72" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#9aa0a8", accent="#b71c1c")
    # cross emblem
    body += ('<rect x="60" y="100" width="8" height="20" fill="#b71c1c"/>'
             '<rect x="54" y="106" width="20" height="8" fill="#b71c1c"/>')
    return portrait("joan", "epic", body)


def sultan():  # Epic ranger, turban
    turban = (
        '<path d="M40 44 Q40 22 64 20 Q88 22 88 44" fill="#fff" stroke="#cfd8dc"/>'
        '<path d="M44 30 Q56 22 70 26" fill="none" stroke="#cfd8dc" stroke-width="2"/>'
        '<circle cx="64" cy="32" r="3" fill="#7c4dff"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#c8956a" stroke="#3a2010" stroke-width="1.5"/>'
        + turban +
        '<rect x="58" y="62" width="4" height="3" fill="#1a1a2e"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#1a1a2e"/>'
        # beard
        '<path d="M48 72 Q64 84 80 72 Q72 80 64 80 Q56 80 48 72" fill="#3a1a08"/>'
    )
    body += torso("#5a2080", accent="#ffd740")
    return portrait("sultan", "epic", body)


def robin():  # Rare ranger, hood
    hood = (
        '<path d="M40 40 Q40 22 64 20 Q88 22 88 40 Q88 56 64 58 Q40 56 40 40" '
        'fill="#2e7d32" stroke="#1b5e20"/>'
        '<polygon points="84,28 94,32 86,38" fill="#2e7d32"/>'
    )
    body = (
        f'<circle cx="64" cy="60" r="20" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + hood +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        '<path d="M58 72 Q64 74 70 72" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#2e7d32", accent="#5a3010")
    return portrait("robin", "rare", body)


def spartan():  # Rare defender
    helm = (
        '<path d="M40 50 Q40 24 64 22 Q88 24 88 50" fill="#a07050" stroke="#3a2010"/>'
        '<rect x="38" y="40" width="52" height="14" fill="#7a4a20"/>'
        # crest
        '<path d="M50 22 Q64 6 78 22" fill="#b71c1c" stroke="#3a0a0a"/>'
        '<path d="M52 24 Q64 12 76 24" fill="#7a0a0a"/>'
        # eye slit
        '<rect x="48" y="58" width="32" height="4" fill="#1a1a2e"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#7a4a20" stroke="#3a2010" stroke-width="1.5"/>'
        + helm
    )
    body += torso("#b71c1c", accent="#ffd740")
    return portrait("spartan", "rare", body)


def ninja():  # Rare ranger
    mask = (
        '<rect x="40" y="56" width="48" height="14" fill="#1a1a2e" stroke="#000"/>'
        '<path d="M40 50 Q40 30 64 28 Q88 30 88 50" fill="#1a1a2e"/>'
        # eyes
        '<rect x="54" y="58" width="6" height="3" fill="#fff"/>'
        '<rect x="68" y="58" width="6" height="3" fill="#fff"/>'
        # headband
        '<rect x="38" y="44" width="52" height="6" fill="#b71c1c"/>'
        '<rect x="60" y="46" width="8" height="2" fill="#fff"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#1a1a2e"/>'
        + mask
    )
    body += torso("#1a1a2e", accent="#b71c1c")
    return portrait("ninja", "rare", body)


def priest():  # Rare support
    hood = (
        '<path d="M36 50 Q36 22 64 20 Q92 22 92 50" fill="#fff" stroke="#cfd8dc"/>'
        '<rect x="36" y="46" width="56" height="6" fill="#ffd740"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + hood +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        '<path d="M58 72 Q64 74 70 72" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#fff", accent="#ffd740")
    body += ('<rect x="60" y="100" width="8" height="22" fill="#ffd740"/>'
             '<rect x="52" y="106" width="24" height="8" fill="#ffd740"/>')
    return portrait("priest", "rare", body)


def soldier():  # Normal defender
    helm = (
        '<path d="M44 50 Q44 30 64 28 Q84 30 84 50" fill="#9aa0a8" stroke="#3a3a40"/>'
        '<rect x="44" y="46" width="40" height="6" fill="#cfd8dc"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + helm +
        '<rect x="58" y="60" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="60" width="4" height="3" fill="#3a2010"/>'
        '<path d="M58 70 Q64 72 70 70" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#5a6068", accent="#9aa0a8")
    return portrait("soldier", "normal", body)


def archer():  # Normal ranger
    cap = (
        '<path d="M40 40 Q40 24 64 22 Q88 24 88 40" fill="#5a8030"/>'
        '<polygon points="84,28 96,18 84,40" fill="#5a8030"/>'
        '<polygon points="50,30 56,22 56,30" fill="#cfd8dc"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + cap +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        '<path d="M58 72 Q64 74 70 72" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#5a8030", accent="#3a6028")
    return portrait("archer", "normal", body)


def scout():  # Normal ranger
    bandana = (
        '<rect x="38" y="42" width="52" height="6" fill="#1976d2"/>'
        '<rect x="50" y="44" width="6" height="3" fill="#fff"/>'
    )
    body = (
        f'<circle cx="64" cy="60" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + bandana +
        # spiky hair
        '<path d="M44 42 L48 32 L54 40 L60 28 L66 40 L72 32 L78 40 L84 38" '
        'fill="#5a3010"/>'
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        '<path d="M58 72 Q64 74 70 72" fill="none" stroke="#3a2010"/>'
    )
    body += torso("#7a4a20", accent="#cfd8dc")
    return portrait("scout", "normal", body)


def page():  # Normal support
    cap = (
        '<path d="M40 44 Q40 26 64 24 Q88 26 88 44" fill="#7a4a20"/>'
        '<rect x="40" y="40" width="48" height="6" fill="#a07050"/>'
    )
    body = (
        f'<circle cx="64" cy="58" r="22" fill="#f4d6b0" stroke="#3a2010" stroke-width="1.5"/>'
        + cap +
        '<rect x="58" y="62" width="4" height="3" fill="#3a2010"/>'
        '<rect x="66" y="62" width="4" height="3" fill="#3a2010"/>'
        # cheerful smile
        '<path d="M56 70 Q64 76 72 70" fill="none" stroke="#3a2010" stroke-width="1.5"/>'
    )
    body += torso("#a07050", accent="#fff")
    return portrait("page", "normal", body)


GENS = {
    "arthur": arthur,
    "caesar": caesar,
    "genghis": genghis,
    "charles": charles,
    "lincoln": lincoln,
    "washington": washington,
    "joan": joan,
    "sultan": sultan,
    "robin": robin,
    "spartan": spartan,
    "ninja": ninja,
    "priest": priest,
    "soldier": soldier,
    "archer": archer,
    "scout": scout,
    "page": page,
}


def main():
    print(f"Generating hero portraits → {OUT}")
    for hid, gen in GENS.items():
        path = OUT / f"{hid}.svg"
        path.write_text(gen(), encoding="utf-8")
        print(f"  wrote {path.name}")
    print("Done.")


if __name__ == "__main__":
    main()
