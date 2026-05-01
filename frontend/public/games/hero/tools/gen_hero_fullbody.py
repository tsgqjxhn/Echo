"""Generate 16 transparent full-body hero illustrations.

Output is temporary PNG at 256x512. The build step converts them to WebP
with cwebp and removes the PNG intermediates.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "heroes"
TMP = OUT / "_tmp_fullbody_png"

W, H = 256, 512
S = 4

RARITY = {
    "normal": (158, 158, 158, 110),
    "rare": (33, 150, 243, 130),
    "epic": (156, 39, 176, 135),
    "legendary": (255, 152, 0, 150),
}

HEROES = [
    dict(id="arthur", rarity="legendary", role="commander", skin="#f0c999", hair="#b77b4b", cloth="#215fbd", accent="#ffd740", head="crown", prop="sword", cape="#a51f1f"),
    dict(id="caesar", rarity="legendary", role="commander", skin="#e8bf8d", hair="#5a3010", cloth="#b7382e", accent="#ffd740", head="laurel", prop="standard", cape="#6f1717"),
    dict(id="genghis", rarity="legendary", role="ranger", skin="#c98756", hair="#3b2110", cloth="#6a4324", accent="#d4b06a", head="fur", prop="bow", cape="#4a2a16"),
    dict(id="charles", rarity="legendary", role="defender", skin="#eec997", hair="#d7a46f", cloth="#4a5260", accent="#d8dee8", head="heavy_helm", prop="shield", cape="#203c76"),
    dict(id="lincoln", rarity="epic", role="support", skin="#e7bd8b", hair="#2c1b13", cloth="#293141", accent="#ffffff", head="top_hat", prop="book", cape="#151922"),
    dict(id="washington", rarity="epic", role="commander", skin="#edc595", hair="#ffffff", cloth="#1f4d7d", accent="#ffd740", head="wig", prop="sword", cape="#7d1f1f"),
    dict(id="joan", rarity="epic", role="support", skin="#f0c999", hair="#d6b069", cloth="#aeb8c5", accent="#c52323", head="joan_helm", prop="banner", cape="#ffffff"),
    dict(id="sultan", rarity="epic", role="ranger", skin="#bd875f", hair="#26130a", cloth="#5c2b78", accent="#ffd740", head="turban", prop="blade", cape="#2b1740"),
    dict(id="robin", rarity="rare", role="ranger", skin="#edc28f", hair="#5a3618", cloth="#2e7d32", accent="#d6a85a", head="hood", prop="bow", cape="#1d4f22"),
    dict(id="spartan", rarity="rare", role="defender", skin="#c48555", hair="#331b0e", cloth="#b71c1c", accent="#ffd740", head="spartan", prop="shield", cape="#701010"),
    dict(id="ninja", rarity="rare", role="ranger", skin="#d3a170", hair="#111111", cloth="#161922", accent="#c62828", head="mask", prop="dagger", cape="#0b0d12"),
    dict(id="priest", rarity="rare", role="support", skin="#f1c99b", hair="#c99a58", cloth="#f4f0dc", accent="#ffd740", head="priest_hood", prop="staff", cape="#ded8ba"),
    dict(id="soldier", rarity="normal", role="defender", skin="#e9c090", hair="#6b4020", cloth="#5c6570", accent="#aeb8c5", head="soldier_helm", prop="shield", cape=None),
    dict(id="archer", rarity="normal", role="ranger", skin="#eac08e", hair="#70451f", cloth="#618b35", accent="#d6a85a", head="archer_cap", prop="bow", cape=None),
    dict(id="scout", rarity="normal", role="ranger", skin="#e9bf8d", hair="#5b3416", cloth="#7a4a24", accent="#4ea3ff", head="bandana", prop="dagger", cape=None),
    dict(id="page", rarity="normal", role="support", skin="#f0c999", hair="#8a542a", cloth="#a57445", accent="#ffffff", head="page_cap", prop="scroll", cape=None),
]


def c(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def box(x1, y1, x2, y2):
    return tuple(int(v * S) for v in (x1, y1, x2, y2))


def pts(items):
    return [(int(x * S), int(y * S)) for x, y in items]


def line(draw: ImageDraw.ImageDraw, items, fill, width=1):
    draw.line(pts(items), fill=fill, width=int(width * S), joint="curve")


def ellipse(draw, xy, fill, outline=None, width=1):
    draw.ellipse(box(*xy), fill=fill, outline=outline, width=int(width * S))


def polygon(draw, items, fill, outline=None):
    draw.polygon(pts(items), fill=fill, outline=outline)


def rect(draw, xy, fill, outline=None, width=1, radius=0):
    if radius:
        draw.rounded_rectangle(box(*xy), radius=int(radius * S), fill=fill, outline=outline, width=int(width * S))
    else:
        draw.rectangle(box(*xy), fill=fill, outline=outline, width=int(width * S))


def draw_glow(draw, rarity):
    glow = RARITY[rarity]
    for i, alpha in enumerate((18, 26, 34)):
        pad = 20 - i * 5
        ellipse(draw, (32 - pad, 40 - pad, 224 + pad, 462 + pad), (*glow[:3], alpha))
    ellipse(draw, (46, 450, 210, 482), (0, 0, 0, 60))


def draw_headgear(draw, cfg):
    head = cfg["head"]
    accent = c(cfg["accent"])
    hair = c(cfg["hair"])
    cloth = c(cfg["cloth"])

    if head == "crown":
        polygon(draw, [(86, 78), (100, 46), (115, 70), (128, 38), (141, 70), (156, 46), (170, 78)], c("#ffd740"), c("#8d6e00"))
        rect(draw, (88, 78, 168, 90), c("#ffd740"), c("#8d6e00"), 1, 4)
        ellipse(draw, (122, 43, 134, 55), c("#d31b2b"))
    elif head == "laurel":
        for side in (-1, 1):
            for i in range(6):
                x = 128 + side * (18 + i * 6)
                y = 72 - i * 4
                ellipse(draw, (x - 6, y - 3, x + 6, y + 3), c("#4caf50"))
        line(draw, [(92, 80), (110, 56), (128, 52), (146, 56), (164, 80)], c("#2e7d32"), 2)
    elif head == "fur":
        ellipse(draw, (82, 42, 174, 98), c("#5a3218"), c("#281306"), 2)
        rect(draw, (80, 80, 176, 98), c("#8a6840"), c("#3a2412"), 1, 6)
    elif head in ("heavy_helm", "soldier_helm", "joan_helm"):
        fill = c("#aeb8c5" if head != "heavy_helm" else "#7f8894")
        ellipse(draw, (84, 54, 172, 128), fill, c("#3b4148"), 2)
        rect(draw, (84, 92, 172, 104), c("#d8dee8"), c("#3b4148"), 1, 4)
        if head == "heavy_helm":
            rect(draw, (122, 38, 134, 58), c("#b71c1c"), None, 1, 3)
        if head == "joan_helm":
            rect(draw, (122, 40, 134, 56), c("#e6edf4"), c("#3b4148"), 1, 3)
    elif head == "top_hat":
        rect(draw, (92, 42, 164, 76), c("#141821"), c("#050608"), 1, 3)
        rect(draw, (76, 74, 180, 86), c("#141821"), c("#050608"), 1, 5)
    elif head == "wig":
        ellipse(draw, (82, 54, 174, 120), c("#f7f7f2"), c("#b9bec5"), 1)
        ellipse(draw, (78, 94, 100, 126), c("#f7f7f2"))
        ellipse(draw, (156, 94, 178, 126), c("#f7f7f2"))
    elif head == "turban":
        ellipse(draw, (78, 48, 178, 104), c("#ffffff"), c("#cfd8dc"), 2)
        line(draw, [(88, 80), (114, 58), (146, 70), (170, 82)], c("#d7dce2"), 3)
        ellipse(draw, (120, 67, 136, 83), c("#7c4dff"))
    elif head in ("hood", "priest_hood"):
        hood_color = cloth if head == "hood" else c("#f7f2df")
        polygon(draw, [(72, 130), (76, 74), (128, 42), (180, 74), (184, 130), (150, 154), (106, 154)], hood_color, c("#1b3a20" if head == "hood" else "#bdb79c"))
    elif head == "spartan":
        ellipse(draw, (80, 56, 176, 134), c("#a7743e"), c("#432410"), 2)
        polygon(draw, [(94, 56), (128, 18), (162, 56)], c("#b71c1c"), c("#4a0909"))
        rect(draw, (90, 102, 166, 114), c("#1a1a2e"), None, 1, 3)
    elif head == "mask":
        ellipse(draw, (84, 58, 172, 136), c("#171a22"), c("#000000"), 2)
        rect(draw, (90, 92, 166, 118), c("#171a22"))
        rect(draw, (100, 96, 118, 103), c("#eef6ff"), None, 1, 2)
        rect(draw, (138, 96, 156, 103), c("#eef6ff"), None, 1, 2)
        rect(draw, (82, 80, 174, 92), c("#b71c1c"), None, 1, 4)
    elif head == "archer_cap":
        polygon(draw, [(78, 80), (92, 54), (144, 48), (178, 78), (130, 88)], c("#5f8d35"), c("#314d1d"))
        polygon(draw, [(160, 62), (192, 44), (172, 82)], c("#5f8d35"), c("#314d1d"))
        polygon(draw, [(102, 60), (118, 32), (120, 64)], c("#d8dee8"))
    elif head == "bandana":
        rect(draw, (80, 80, 176, 92), accent, None, 1, 4)
        polygon(draw, [(95, 80), (102, 54), (116, 78), (128, 50), (140, 78), (154, 60), (170, 82)], hair)
    elif head == "page_cap":
        polygon(draw, [(82, 82), (98, 54), (156, 54), (174, 82), (128, 96)], c("#875126"), c("#3a2110"))
        rect(draw, (86, 80, 170, 92), c("#b27b45"), None, 1, 5)


def draw_prop(draw, cfg):
    prop = cfg["prop"]
    accent = c(cfg["accent"])
    cloth = c(cfg["cloth"])
    if prop == "sword":
        line(draw, [(182, 192), (206, 104)], c("#dfe8ef"), 5)
        polygon(draw, [(204, 92), (214, 112), (198, 112)], c("#f4fbff"), c("#81909c"))
        rect(draw, (176, 190, 196, 204), c("#8a5c23"), None, 1, 3)
    elif prop == "standard":
        line(draw, [(184, 110), (184, 386)], c("#7a4a20"), 5)
        polygon(draw, [(184, 116), (224, 132), (184, 160)], c("#b71c1c"), c("#4a0909"))
        polygon(draw, [(194, 128), (210, 137), (194, 146)], accent)
    elif prop == "bow":
        line(draw, [(52, 130), (34, 246), (54, 362)], c("#7a4a20"), 5)
        line(draw, [(52, 130), (54, 362)], c("#e6d8b8"), 1)
        line(draw, [(56, 246), (116, 222)], c("#dfe8ef"), 3)
        polygon(draw, [(118, 222), (104, 214), (108, 230)], c("#dfe8ef"))
    elif prop == "shield":
        polygon(draw, [(44, 210), (86, 190), (128, 210), (120, 310), (86, 350), (52, 310)], cloth, c("#161922"))
        polygon(draw, [(70, 218), (102, 218), (86, 290)], accent)
    elif prop == "book":
        rect(draw, (44, 254, 104, 306), c("#6f1d1b"), c("#2b0b0a"), 2, 5)
        line(draw, [(74, 258), (74, 304)], c("#ffd740"), 2)
        rect(draw, (50, 264, 98, 272), c("#f4e0b0", 150), None, 1, 2)
    elif prop == "banner":
        line(draw, [(190, 112), (190, 386)], c("#6a4a24"), 5)
        polygon(draw, [(190, 122), (224, 142), (190, 168)], c("#ffffff"), c("#9aa0a8"))
        rect(draw, (202, 137, 210, 156), c("#b71c1c"))
        rect(draw, (196, 143, 216, 151), c("#b71c1c"))
    elif prop == "blade":
        line(draw, [(184, 196), (222, 158)], c("#dfe8ef"), 5)
        polygon(draw, [(224, 154), (214, 176), (204, 164)], c("#f4fbff"), c("#81909c"))
    elif prop == "dagger":
        line(draw, [(184, 230), (214, 190)], c("#dfe8ef"), 5)
        polygon(draw, [(216, 184), (214, 204), (202, 194)], c("#e9f1f8"), c("#81909c"))
    elif prop == "staff":
        line(draw, [(190, 112), (176, 394)], c("#7a4a20"), 6)
        ellipse(draw, (176, 88, 204, 116), accent, c("#fff4a3"), 2)
        line(draw, [(190, 102), (190, 70)], accent, 2)
    elif prop == "scroll":
        rect(draw, (50, 244, 106, 286), c("#ead7a2"), c("#7a4a20"), 2, 6)
        ellipse(draw, (44, 238, 58, 292), c("#d2b675"), c("#7a4a20"), 1)
        ellipse(draw, (98, 238, 112, 292), c("#d2b675"), c("#7a4a20"), 1)


def draw_body(draw, cfg):
    skin = c(cfg["skin"])
    cloth = c(cfg["cloth"])
    accent = c(cfg["accent"])

    if cfg["cape"]:
        polygon(draw, [(72, 166), (184, 166), (216, 430), (40, 430)], c(cfg["cape"], 220))

    line(draw, [(86, 198), (52, 270), (72, 330)], cloth, 20)
    line(draw, [(170, 198), (204, 270), (184, 330)], cloth, 20)
    ellipse(draw, (60, 318, 84, 344), skin)
    ellipse(draw, (172, 318, 196, 344), skin)

    polygon(draw, [(84, 178), (172, 178), (190, 326), (154, 370), (102, 370), (66, 326)], cloth, c("#11151c"))
    rect(draw, (120, 184, 136, 352), accent, None, 1, 4)
    polygon(draw, [(92, 210), (164, 210), (150, 248), (106, 248)], c("#ffffff", 35))
    rect(draw, (86, 332, 170, 352), c("#3a2515"), None, 1, 4)

    line(draw, [(104, 360), (92, 454)], c("#263238"), 16)
    line(draw, [(152, 360), (164, 454)], c("#263238"), 16)
    rect(draw, (72, 444, 110, 466), c("#151515"), None, 1, 7)
    rect(draw, (146, 444, 184, 466), c("#151515"), None, 1, 7)

    rect(draw, (108, 148, 148, 186), skin, None, 1, 8)
    ellipse(draw, (88, 74, 168, 154), skin, c("#3a2010"), 2)
    if cfg["head"] not in ("mask", "spartan"):
        polygon(draw, [(92, 92), (104, 68), (126, 62), (150, 70), (166, 96), (150, 86), (132, 82), (110, 86)], c(cfg["hair"]))
        ellipse(draw, (108, 106, 118, 116), c("#1a1a2e"))
        ellipse(draw, (138, 106, 148, 116), c("#1a1a2e"))
        line(draw, [(116, 132), (128, 138), (140, 132)], c("#3a2010"), 2)

    draw_headgear(draw, cfg)
    draw_prop(draw, cfg)

    if cfg["role"] == "support":
        ellipse(draw, (96, 180, 160, 244), (*accent[:3], 26), accent, 2)


def make_hero(cfg):
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_glow(draw, cfg["rarity"])
    draw_body(draw, cfg)
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    return img


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    for cfg in HEROES:
        img = make_hero(cfg)
        out = TMP / f"{cfg['id']}.png"
        img.save(out, "PNG", optimize=True)
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
